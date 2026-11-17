const {test,before,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {setTimeout:delay}=require('node:timers/promises');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const rpc=require('./flow-rpc.js'),retry=require('./flow-retry.js');
const pageCode=fs.readFileSync('content_flow_upload.js','utf8'),workerCode=fs.readFileSync('flow-page-upload.js','utf8');
let browser;
before(async()=>{browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});});
after(async()=>{await browser?.close();});
async function setup({transport='fetch',absent=false,hold=false,reject=false,rejectDirect=false,disconnect=false,otherRequest=false,readyDelay=0,menu=false,missingProject=false}={}) {
  const browserContext=await browser.newContext(),page=await browserContext.newPage(),requests=[],releases=[],events=[],created=[],targets=[],checks=[],STATE={stopRequested:false};
  const pages=new Map([[1,page]]);
  await browserContext.route('https://flow.google.com/**',async route=>{
    const r=route.request();
    if(r.url().includes('/data/batchexecute')) {
      const rows=JSON.parse(new URLSearchParams(r.postData()).get('f.req'));
      const data=JSON.parse(rows[0][0][1]);requests.push(data);
      if(hold)await new Promise(resolve=>releases.push(resolve));
      if(disconnect)return route.abort('failed');
      const payload=[['media-'+data[8],'native-upload-project','asset-'+data[8]],['asset-'+data[8],null,null,[data[8],null,null,null,'media-'+data[8]],'native-upload-project']];
      return route.fulfill({status:200,body:reject||rejectDirect&&data[0][10][0]==='fixture-direct-security'?'[["wrb.fr","maseQ",null,null,null,[3]]]':JSON.stringify([['wrb.fr','maseQ',JSON.stringify(payload)]])}).catch(()=>{});
    }
    const controls=missingProject?'<main><h1>Project not found.</h1></main>':absent?'No upload button':menu
      ? `<button aria-label="Add media menu" aria-haspopup="menu" aria-expanded="false" ${readyDelay?'hidden disabled':''}><mat-icon>add</mat-icon></button><div role="menu" hidden><button role="menuitem"><mat-icon>upload</mat-icon><span>Upload</span></button></div>`
      : `<flow-media-upload><button class="upload-button" ${readyDelay?'hidden disabled':''}>Upload</button></flow-media-upload>`;
    return route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><html><body>${controls}</body></html>`});
  });
  await page.goto('https://flow.google.com/u/2/project/native-upload-project');
  async function initialize(targetPage) {
  await targetPage.addScriptTag({content:fs.readFileSync('flow-rpc.js','utf8')});
  await targetPage.evaluate(({transport,otherRequest,readyDelay,menu})=>{
    if(readyDelay)setTimeout(()=>{const button=document.querySelector(menu?'[aria-label="Add media menu"]':'.upload-button');if(button){button.hidden=false;button.disabled=false;}},readyDelay);
    window.menuOpens=0;
    document.querySelector('[aria-label="Add media menu"]')?.addEventListener('click',event=>{
      window.menuOpens++;event.currentTarget.setAttribute('aria-expanded','true');document.querySelector('[role="menu"]').hidden=false;
    });
    window.WIZ_global_data={SNlM0e:'fixture-at',cfb2h:'fixture-build',FdrFJe:'fixture-session'};
    // Flow's current eT file picker (public wO1vlb module, 2026-11-08).
    function picker({accept,multiple=true}) {return new Promise(resolve=>{
      const input=document.createElement('input');input.type='file';input.accept=accept;input.multiple=multiple;input.style.display='none';
      input.addEventListener('change',()=>{const files=input.files?Array.from(input.files):[];input.remove();resolve(files.length?files:undefined);});
      input.addEventListener('cancel',()=>{input.remove();resolve(undefined);});document.body.appendChild(input);input.click();
    });}
    window.initialHooks={fetch:window.fetch,open:XMLHttpRequest.prototype.open,send:XMLHttpRequest.prototype.send,click:HTMLInputElement.prototype.click};
    window.delivered=[];
    document.querySelector('.upload-button,[role="menuitem"]')?.addEventListener('click',async()=>{
      const files=await picker({accept:'image/*'});if(!files)return;
      for(const file of files) {
        const bytes=new Uint8Array(await file.arrayBuffer());window.delivered.push({name:file.name,type:file.type,bytes:Array.from(bytes)});
        const payload=[[null,22,null,null,null,'native-upload-project',null,null,null,null,['fixture-website-security',1]],btoa(String.fromCharCode(...bytes)),file.type,1,null,null,null,null,file.name,null,'website-request','website-client',null,[1]];
        function send(data) {
          const body=new URLSearchParams({'f.req':JSON.stringify([[['maseQ',JSON.stringify(data),null,'generic']]])}).toString();
          const url='/u/2/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=maseQ';
          if(transport==='xhr')return new Promise(resolve=>{const x=new XMLHttpRequest();x.open('POST',url);x.setRequestHeader('Content-Type','application/x-www-form-urlencoded');x.addEventListener('loadend',resolve);x.send(body);});
          return fetch(url,{method:'POST',body}).catch(()=>{});
        }
        if(otherRequest){const unrelated=structuredClone(payload);unrelated[8]='unrelated.jpg';await send(unrelated);}
        await send(payload);
      }
    });
  },{transport,otherRequest,readyDelay,menu});
  }
  await initialize(page);
  const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=3;c.height=5;const g=c.getContext('2d');g.fillStyle='teal';g.fillRect(0,0,3,5);return c.toDataURL('image/png');});
  const context=vm.createContext({STATE,Date,URL,log:()=>{},makeFlowId:()=>require('node:crypto').randomUUID(),
    FlowRequestGuard:require('./flow-request-guard.js').create({stopped:()=>STATE.stopRequested}),
    BigBombFlowRpc:{...rpc,prepareUploadImage:(...args)=>page.evaluate(args=>BigBombFlowRpc.prepareUploadImage(...args),args)},
    FlowDiagnostics:{record:(id,step,detail)=>{events.push({step,...detail});return detail;},save:async()=>{}},
    FLOW_DYNAMIC_SITE_KEYS:new Map(),waitForGenerationOperation:p=>p,
    checkFlowCompatibility:async id=>{checks.push(id);return {siteKey:'fixture-key'};},
    interruptibleWait:()=>delay(5),sleep:()=>delay(5),
    chrome:{tabs:{
      create:async options=>{
        const tabId=100+created.length;created.push({...options,id:tabId});
        const fresh=await browserContext.newPage();pages.set(tabId,fresh);
        await fresh.goto(options.url);await initialize(fresh);return {id:tabId};
      },
      get:async id=>{const target=pages.get(id);if(!target)throw Error('No tab with id: '+id);return {id,url:target.url(),status:'complete'};},
      update:async(id,options)=>{Object.assign(created.find(t=>t.id===id),options);},
      remove:async id=>{await pages.get(id)?.close();pages.delete(id);}
    },scripting:{executeScript:async({target,files,func,args})=>{
      targets.push({tabId:target.tabId,method:files?'inject':args[0]});
      const targetPage=pages.get(target.tabId);assert.ok(targetPage);
      if(files){assert.deepEqual([...files],['content_flow_upload.js']);await targetPage.addScriptTag({content:pageCode});return [];}
      return [{result:await targetPage.evaluate(({source,args})=>(0,eval)('('+source+')')(...args),{source:func.toString(),args})}];
    }}}
  });
  vm.runInContext(workerCode+'\nglobalThis.nativeUpload=FlowPageUpload;',context);
  const flow={tabId:1,authTabId:1,accountIndex:'2',projectId:'native-upload-project',referenceFiles:{existing:'existing.jpg'},referenceAssets:{existing:{assetId:'existing-asset'}}};
  return {context,flow,page,pages,data,requests,releases,events,STATE,created,targets,checks,
    run:(name='download.png')=>context.nativeUpload.upload(flow,data,name),
    hooks:async()=>{for(const targetPage of pages.values())if(!await targetPage.evaluate(()=>Object.entries(initialHooks).every(([key,value])=>value===(key==='fetch'?window.fetch:key==='click'?HTMLInputElement.prototype.click:XMLHttpRequest.prototype[key]))))return false;return true;},
    close:async()=>{releases.splice(0).forEach(r=>r());await browserContext.close();}};
}
async function until(fn){for(let i=0;i<500;i++){if(fn())return;await delay(10);}throw Error('Fixture timed out');}
for(const transport of ['fetch','xhr'])test(`Flow file picker ${transport} response confirms the original file and restores all hooks`,async()=>{
  const h=await setup({transport});
  try {
    const media=await h.run();assert.ok(media.startsWith('media-download__'));
    assert.equal(h.requests.length,1);assert.equal(h.requests[0][1],h.data.split(',')[1]);
    assert.equal(h.requests[0][0][10][0],'fixture-website-security');assert.deepEqual(h.requests[0][13],[1]);
    assert.equal(h.flow.referenceFiles.existing,'existing.jpg');assert.ok(h.flow.referenceFiles[media]);assert.equal(h.flow.referenceRevision,1);
    assert.deepEqual(h.created,[{url:'https://flow.google.com/u/2/project/native-upload-project',active:false,id:100,autoDiscardable:false}]);
    assert.deepEqual(h.checks,[100]);assert.equal(h.flow.tabId,1);assert.equal(h.flow.authTabId,1);
    assert.ok(h.targets.every(t=>t.tabId===100));assert.equal(h.page.isClosed(),false);
    assert.equal(await h.hooks(),true);assert.ok(h.events.some(e=>e.step==='native_upload_confirmed'));
    assert.ok(!JSON.stringify(h.events).includes(h.data.split(',')[1]));
  }finally{await h.close();}
});
test('parallel references serialize the picker and keep their own media IDs',async()=>{
  const h=await setup();
  try {const ids=await Promise.all(['subject.png','outfit.png','location.png'].map(h.run));assert.equal(new Set(ids).size,3);assert.equal(h.requests.length,3);assert.equal(h.created.length,1);assert.equal(h.flow.referenceRevision,3);assert.equal(await h.hooks(),true);}finally{await h.close();}
});
test('two raw INVALID_ARGUMENT responses recover when the fresh project uploader hydrates after document/session readiness',async()=>{
  const h=await setup({rejectDirect:true,readyDelay:1200,menu:true});
  try {
    const source=fs.readFileSync('background.js','utf8');
    h.context.waitForGenerationOperation=p=>p;
    h.context.mintFlowRecaptchaToken=async()=> 'fixture-direct-security';
    vm.runInContext(fs.readFileSync('flow-tab-recovery.js','utf8')+'\n'+source.slice(source.indexOf('async function uploadDataUrlToFlow('),source.indexOf('async function uploadReferenceUntilSuccess(')),h.context);
    const upload=()=>h.context.uploadDataUrlToFlow(h.flow,h.data,'download.png');
    const [first,second]=await Promise.all([upload(),upload()]);
    assert.equal(first,second);assert.equal(await upload(),first);assert.equal(h.requests.length,3);
    assert.deepEqual(h.requests.map(p=>p[0][10][0]),['fixture-direct-security','fixture-direct-security','fixture-website-security']);
    assert.equal(h.requests[2][1],h.data.split(',')[1]);
    assert.equal(h.flow.referenceRevision,1);assert.equal(h.flow.referenceAssets[first].projectId,h.flow.projectId);
    assert.equal(h.flow.referenceUploadCache.entries.size,1);
    assert.ok(h.events.some(event=>event.stage==='waiting_for_upload_control'));
    assert.equal(h.flow.useNativeReferenceUpload,true);
    const outfit=await h.context.uploadDataUrlToFlow(h.flow,h.data+'\n','outfit.png');
    assert.ok(outfit.startsWith('media-outfit__'));assert.equal(h.requests.length,4);
    assert.equal(h.requests[3][0][10][0],'fixture-website-security');
    assert.equal(h.created.length,1);
    assert.ok(h.targets.filter(t=>t.method==='begin').every(t=>t.tabId===100));
    assert.equal(h.flow.tabId,1);assert.equal(h.page.isClosed(),false);
    assert.equal(await h.hooks(),true);
  }finally{await h.close();}
});
test('unrelated upload responses cannot satisfy the reference mapping',async()=>{
  const h=await setup({otherRequest:true});
  try {const id=await h.run();assert.notEqual(id,'media-unrelated.jpg');assert.equal(h.requests.length,2);assert.equal(h.flow.referenceFiles['media-unrelated.jpg'],undefined);}finally{await h.close();}
});
test('missing upload control fails before handing off any file, without generating or reporting success',async()=>{
  const h=await setup({absent:true});
  try {await assert.rejects(h.run(),e=>e.code==='FLOW_UPLOAD_UI_UNAVAILABLE'&&e.notSubmitted&&retry.decision(e).retry===false);assert.equal(h.requests.length,0);assert.equal(await h.hooks(),true);}finally{await h.close();}
});

test('current Add media menu reveals Upload and hands the reference to Flow only once',async()=>{
  const h=await setup({menu:true});
  try {
    const id=await h.run();assert.ok(id.startsWith('media-download__'));
    assert.equal(h.requests.length,1);
    assert.equal(await h.pages.get(h.created[0].id).evaluate(()=>window.menuOpens),1);
    assert.equal(h.flow.referenceFiles[id],h.requests[0][8]);assert.equal(await h.hooks(),true);
  }finally{await h.close();}
});

test('Project not found is reported before any file is handed off or sent',async()=>{
  const h=await setup({missingProject:true});
  try {
    await assert.rejects(h.run(),e=>e.code==='FLOW_PROJECT_UNAVAILABLE'&&e.notSubmitted&&e.noRetry);
    assert.equal(h.requests.length,0);assert.equal(await h.hooks(),true);
    const failure=h.events.find(event=>event.step==='native_upload_failed');
    assert.equal(failure.page.state,'project_not_found');assert.match(failure.reason,/selected account/);
  }finally{await h.close();}
});

test('Stop while the upload control hydrates sends no file and restores page hooks',async()=>{
  const h=await setup({readyDelay:3000});
  try {
    const pending=h.run();
    await until(()=>h.events.some(event=>event.stage==='waiting_for_upload_control'));
    h.STATE.stopRequested=true;
    await assert.rejects(pending,e=>e.notSubmitted&&e.noRetry);
    assert.equal(h.requests.length,0);assert.equal(h.page.isClosed(),false);assert.equal(await h.hooks(),true);
  }finally{await h.close();}
});
test('wrong account/project and a failed fresh-tab session check stop before file handoff',async()=>{
  for(const reason of ['redirect','session','account']) {
    const h=await setup();
    try {
      if(reason==='account')delete h.flow.accountIndex;
      if(reason==='redirect')h.context.chrome.tabs.get=async id=>({id,status:'complete',url:'https://flow.google.com/u/0/project/another-project'});
      if(reason==='session')h.context.checkFlowCompatibility=async()=>{throw Error('Finish signing in to Flow.');};
      await assert.rejects(h.run(),e=>e.code==='FLOW_UPLOAD_UI_UNAVAILABLE'&&e.notSubmitted&&e.noRetry);
      assert.equal(h.requests.length,0);assert.equal(h.targets.length,0);
      assert.equal(h.pages.size,1);assert.equal(h.page.isClosed(),false);assert.equal(h.flow.tabId,1);
      assert.deepEqual(Object.keys(h.flow.referenceFiles),['existing']);
      assert.equal(h.created.length,reason==='account'?0:1);
    }finally{await h.close();}
  }
});
test('Stop while the fresh upload tab loads closes only that new tab and sends no file',async()=>{
  const h=await setup();
  try {
    const get=h.context.chrome.tabs.get;
    h.context.chrome.tabs.get=async id=>({...await get(id),status:'loading'});
    h.context.interruptibleWait=async()=>{h.STATE.stopRequested=true;};
    await assert.rejects(h.run(),e=>e.notSubmitted&&e.noRetry);
    assert.equal(h.created.length,1);assert.equal(h.pages.size,1);
    assert.equal(h.page.isClosed(),false);assert.equal(h.requests.length,0);assert.equal(h.targets.length,0);
  }finally{await h.close();}
});
test('Flow rejection does not create a reference mapping or repeat the native upload',async()=>{
  const h=await setup({reject:true});
  try {await assert.rejects(h.run(),e=>e.code==='FLOW_UPLOAD_INVALID_ARGUMENT'&&e.noRetry);assert.equal(h.requests.length,1);assert.deepEqual(Object.keys(h.flow.referenceFiles),['existing']);assert.equal(await h.hooks(),true);}finally{await h.close();}
});
test('disconnection after handoff preserves upload uncertainty and never repeats the picker',async()=>{
  const h=await setup({disconnect:true});
  try {await assert.rejects(h.run(),e=>e.code==='FLOW_UPLOAD_OUTCOME_UNKNOWN'&&retry.decision(e).retry===false);assert.equal(h.requests.length,1);assert.equal(h.flow.referenceRevision,undefined);assert.equal(await h.hooks(),true);}finally{await h.close();}
});
test('Stop before handoff sends nothing; Stop after dispatch does not claim not-submitted',async()=>{
  let h=await setup();
  try {h.STATE.stopRequested=true;await assert.rejects(h.run(),e=>e.notSubmitted&&e.noRetry);assert.equal(h.requests.length,0);}finally{await h.close();}
  h=await setup({hold:true});
  try {const pending=h.run();await until(()=>h.requests.length===1);h.STATE.stopRequested=true;await assert.rejects(pending,e=>e.code==='FLOW_UPLOAD_OUTCOME_UNKNOWN'&&!e.notSubmitted);assert.equal(h.requests.length,1);assert.equal(await h.hooks(),true);}finally{await h.close();}
});
