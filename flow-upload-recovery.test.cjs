const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rpc=require('./flow-rpc.js');
const source=fs.readFileSync(require.resolve('./background.js'),'utf8');
const uploadSource=source.slice(source.indexOf('async function uploadDataUrlToFlow('),source.indexOf('async function uploadReferenceUntilSuccess('));
const invalid='[["wrb.fr","maseQ",null,null,null,[3]]]';
const accepted=JSON.stringify([['wrb.fr','maseQ',JSON.stringify([
  ['media','project','asset'],['asset',null,null,['server.png',null,null,null,'media'],'project']
])]]);
function setup(responses=[invalid,accepted],{stopAfterFirst=false,status=200,disconnect=false}={}) {
  const requests=[],preparations=[],events=[],reports=[],tokens=[],nativeCalls=[];
  const state={stopRequested:false};let id=0;
  const page=vm.createContext({URL,URLSearchParams,Date,AbortController,setTimeout,clearTimeout,
    location:{origin:'https://flow.google.com',pathname:'/u/2/project/project'},
    window:{WIZ_global_data:{SNlM0e:'fixture-at',cfb2h:'fixture-build',FdrFJe:'fixture-session'}},
    fetch:async(url,options)=>{
      assert.match(url,/^\/u\/2\/_\/AiSandboxAngularFrontend\/data\/batchexecute/);
      const envelope=JSON.parse(new URLSearchParams(options.body).get('f.req'));
      requests.push(JSON.parse(envelope[0][0][1]));
      if(stopAfterFirst)state.stopRequested=true;
      if(disconnect)throw Error('Network disconnected after dispatch.');
      const text=responses.shift()??invalid;
      return {ok:status===200,status,text:async()=>text};
    }});
  const ctx=vm.createContext({STATE:state,log:()=>{},waitForGenerationOperation:p=>p,
    FlowPageUpload:{upload:async(...args)=>{nativeCalls.push(args);throw Object.assign(Error('Fixture has no native Upload control.'),{code:'FLOW_UPLOAD_UI_UNAVAILABLE',noRetry:true});}},
    FlowRequestGuard:require('./flow-request-guard.js').create({stopped:()=>state.stopRequested}),
    FlowDiagnostics:{record:(id,step,detail)=>{const event={id,step,detail};events.push(event);return event;},save:async report=>reports.push(report)},
    makeFlowId:()=>`fixture-${++id}`,mintFlowRecaptchaToken:async()=>{const token=`fixture-token-${tokens.length}`;tokens.push(token);return token;},
    BigBombFlowRpc:{...rpc,prepareUploadImage:async(data,name,{preserveOriginal})=>{
      preparations.push(preserveOriginal);
      return preserveOriginal?{mimeType:'image/png',imageBytes:'b3JpZ2luYWw=',fileName:'photo.png'}:{mimeType:'image/jpeg',imageBytes:'bm9ybWFsaXplZA==',fileName:'photo.jpg'};
    }},
    chrome:{scripting:{executeScript:async({func,args})=>[{result:await vm.runInContext(`(${func.toString()})`,page)(...args)}]}}
  });
  vm.runInContext(fs.readFileSync(require.resolve('./flow-tab-recovery.js'),'utf8')+'\n'+uploadSource,ctx);
  const flow={tabId:1,projectId:'project'},data='data:image/png;base64,c291cmNl';
  return {ctx,flow,data,requests,preparations,events,reports,tokens,nativeCalls,run:()=>ctx.uploadDataUrlToFlow(flow,data,'photo.png')};
}

test('rejected converted image recovers once with original bytes, fresh IDs/token and one confirmed mapping for concurrent callers',async()=>{
  const h=setup();
  assert.deepEqual(await Promise.all([h.run(),h.ctx.uploadDataUrlToFlow(h.flow,h.data,'another-role.png')]),['media','media']);
  assert.deepEqual(h.preparations,[false,true]);assert.equal(h.requests.length,2);
  assert.equal(h.requests[0][1],'bm9ybWFsaXplZA==');assert.equal(h.requests[0][2],'image/jpeg');
  assert.equal(h.requests[1][1],'b3JpZ2luYWw=');assert.equal(h.requests[1][2],'image/png');
  assert.match(h.requests[1][8],/\.png$/);
  for(const index of [10,11])assert.notEqual(h.requests[0][index],h.requests[1][index]);
  assert.notEqual(h.requests[0][0][10][0],h.requests[1][0][10][0]);
  assert.equal(h.flow.referenceFiles.media,'server.png');assert.equal(h.flow.referenceAssets.media.assetId,'asset');
  assert.equal(h.flow.referenceRevision,1);assert.equal(h.flow.nativeUploadCount,0);
  assert.equal(h.events.filter(event=>event.step==='backend_upload_confirmed').length,1);
  assert.equal(h.events.at(-1).detail.preparation,'original-bytes');
  assert.equal(await h.run(),'media');assert.equal(h.requests.length,2);
  assert.ok(!JSON.stringify(h.reports).includes('c291cmNl'));
});

test('two definite rejections try the native picker once; no native control means no false success or endless retry',async()=>{
  const h=setup([invalid,invalid]);
  await assert.rejects(h.run(),error=>error.code==='FLOW_UPLOAD_UI_UNAVAILABLE');
  assert.equal(h.requests.length,2);assert.equal(h.flow.referenceUploadCache.entries.size,0);
  assert.equal(h.nativeCalls.length,1);
  assert.equal(h.flow.referenceFiles,undefined);assert.equal(h.flow.nativeUploadCount,0);
  assert.equal(h.events.filter(event=>event.step==='backend_upload_confirmed').length,0);
});

test('native fallback success is cached for concurrent roles after exactly two rejected raw uploads',async()=>{
  const h=setup([invalid,invalid]);let native=0;
  h.ctx.FlowPageUpload.upload=async(flow,data,name)=>{native++;assert.equal(flow,h.flow);assert.equal(data,h.data);assert.equal(name,'photo.png');return 'native-confirmed';};
  assert.deepEqual(await Promise.all([h.run(),h.run()]),['native-confirmed','native-confirmed']);
  assert.equal(await h.run(),'native-confirmed');assert.equal(native,1);assert.equal(h.requests.length,2);
});

test('Stop, auth and explicit policy responses never trigger original-byte recovery',async()=>{
  for(const h of [setup([invalid],{stopAfterFirst:true}),setup(['denied'],{status:403}),setup(['[["wrb.fr","maseQ",null,null,null,[3,null,"PUBLIC_ERROR_POLICY_VIOLATION"]]]'])]) {
    await assert.rejects(h.run());assert.equal(h.requests.length,1);assert.deepEqual(h.preparations,[false]);
  }
});

test('a disconnected or empty upload acknowledgement stops automatic retries without claiming an asset',async()=>{
  for(const h of [setup([],{disconnect:true}),setup([''])]) {
    await assert.rejects(h.run(),error=>error.code==='FLOW_UPLOAD_OUTCOME_UNKNOWN'&&require('./flow-retry.js').decision(error).retry===false);
    assert.equal(h.requests.length,1);assert.equal(h.flow.referenceFiles,undefined);
    assert.equal(h.flow.referenceUploadCache.entries.size,0);
  }
});

test('a matching project URL still waits for the currently loading editor without reloading it',async()=>{
  let reads=0,updates=0;
  const ctx=vm.createContext({URL,Date,STATE:{stopRequested:false},sleep:async()=>{},chrome:{tabs:{
    get:async()=>({url:'https://flow.google.com/u/2/project/project',status:++reads<3?'loading':'complete'}),
    update:async()=>{updates++;}
  }}});
  vm.runInContext(source.slice(source.indexOf('async function ensureFlowProjectPage('),source.indexOf('async function openFreshFlowProjectTab(')),ctx);
  await ctx.ensureFlowProjectPage(1,'project');assert.equal(reads,3);assert.equal(updates,0);
});

test('real browser decoding preserves original JPEG, PNG and WebP bytes, dimensions and format on recovery',async()=>{
  const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage();
    await page.addScriptTag({content:fs.readFileSync(require.resolve('./flow-rpc.js'),'utf8')});
    const results=await page.evaluate(async()=>{
      const results=[];
      for(const type of ['image/jpeg','image/png','image/webp']) {
        const canvas=new OffscreenCanvas(91,137),ctx=canvas.getContext('2d');
        ctx.fillStyle='#53a7b0';ctx.fillRect(10,20,55,80);
        const blob=await canvas.convertToBlob({type});
        const bytes=new Uint8Array(await blob.arrayBuffer()),base64=btoa(String.fromCharCode(...bytes));
        // Intentionally label PNG bytes as JPEG; detected bytes must win.
        const url=`data:${type==='image/png'?'image/jpeg':type};base64,${base64}`;
        const original=await BigBombFlowRpc.prepareUploadImage(url,'source.jpg',{preserveOriginal:true});
        const decoded=await createImageBitmap(new Blob([Uint8Array.from(atob(original.imageBytes),c=>c.charCodeAt(0))],{type:original.mimeType}));
        const normalized=await BigBombFlowRpc.prepareUploadImage(url,'source.jpg');
        results.push({type,mimeType:original.mimeType,identical:original.imageBytes===base64,width:decoded.width,height:decoded.height,normalized:normalized.mimeType});
        decoded.close();
      }
      try {await BigBombFlowRpc.prepareUploadImage('data:image/png;base64,YQ==','broken.png',{preserveOriginal:true});throw Error('Corrupt image was accepted');}
      catch(error){if(error.code!=='FLOW_UPLOAD_INVALID_IMAGE')throw error;}
      return results;
    });
    for(const result of results) {
      assert.equal(result.mimeType,result.type);assert.equal(result.identical,true);
      assert.equal(result.width,91);assert.equal(result.height,137);assert.equal(result.normalized,'image/jpeg');
    }
  }finally{await browser.close();}
});
