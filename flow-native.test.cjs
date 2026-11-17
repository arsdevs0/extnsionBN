const {test,before,after}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const rpc=require('./flow-rpc.js'),guard=require('./flow-request-guard.js');
const fixture=fs.readFileSync(path.join(__dirname,'tmp/flow-native-fixture.html'),'utf8');
const native=fs.readFileSync(path.join(__dirname,'flow-native.js'),'utf8');
const pageScript=fs.readFileSync(path.join(__dirname,'content_flow_native.js'),'utf8');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
before(async()=>{browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});});
after(async()=>{await browser?.close();});
const assets=[{mediaId:'sunny-face',fileName:'full_single_P069_side__431b7375-fb42-4934-99fd-189975c997e0.jpg'},{mediaId:'sunny-outfit',fileName:'full_single_P069_side__ab318926-fb42-4934-99fd-189975c997e0.jpg'}];
function response(id) {
  const media=[id];media[6]=[[...Array(13).fill(null),'https://flow-content.google/image/'+id+'?Expires=fixture']];
  return JSON.stringify([['wrb.fr','ogiZ0b',JSON.stringify([[media]])]]);
}
async function harness({mode='fetch',hold=false,responseBody,attachMode='preview',searchMode='',titleMode='',fastClock=false,referenceAssets=assets}={}) {
  const page=await browser.newPage(),requests=[],pending=[],errors=[],configs=[];
  let reloads=0,submitCalls=0,beginCalls=0,cancelCalls=0;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
    const req=route.request();
    if(req.url().includes('batchexecute')) {
      const data=JSON.parse(JSON.parse(new URLSearchParams(req.postData()).get('f.req'))[0][0][1]);
      const prompt=data[1][0][8][0][0][0];
      requests.push({prompt,data});
      if(hold)await new Promise(resolve=>pending.push(resolve));
      await route.fulfill({status:200,contentType:'text/plain',body:responseBody||response('result-'+prompt)}).catch(()=>{});
    } else if(req.resourceType()==='document')await route.fulfill({status:200,contentType:'text/html',body:fixture});
    else await route.fulfill({status:200,body:''});
  });
  await page.addInitScript(({assets,mode,attachMode,searchMode,titleMode,fastClock})=>{
    if(fastClock){const now=Date.now.bind(Date),start=now();Date.now=()=>start+(now()-start)*20;}
    window.addEventListener('DOMContentLoaded',()=>{Object.assign(fixture,{assets,mode,attachMode,searchMode,titleMode});});
  },{assets:referenceAssets,mode,attachMode,searchMode,titleMode,fastClock});
  await page.goto('https://flow.google.com/u/0/project/test-project');
  const STATE={stopRequested:false};
  const context=vm.createContext({
    URL,Date,Map,Promise,crypto:require('node:crypto').webcrypto,STATE,BigBombFlowRpc:rpc,
    FlowRequestGuard:guard.create({stopped:()=>STATE.stopRequested,spacingMs:0}),
    sleep:ms=>delay(Math.min(ms,10)),
    chrome:{tabs:{
      get:async()=>({url:page.url(),status:'complete'}),
      reload:async()=>{reloads++;await page.reload();}
    },scripting:{executeScript:async({files,func,args})=>{
      if(files){await page.addScriptTag({content:pageScript});return [];}
      if(args.some(value=>value===undefined))throw new TypeError("Error at property 'args': Value is unserializable.");
      if(args[0]==='submit')submitCalls++;
      if(args[0]==='begin'){beginCalls++;configs.push(args[1]);}
      if(args[0]==='cancel')cancelCalls++;
      const result=await page.evaluate(({source,args})=>(0,eval)('('+source+')')(...args),{source:func.toString(),args});
      return [{result}];
    }}}
  });
  vm.runInContext(native+'\nglobalThis.runner=FlowNative;',context);
  const flow={tabId:1,projectId:'test-project',referenceRevision:1,referenceFiles:Object.fromEntries(referenceAssets.map(a=>[a.mediaId,a.fileName]))};
  const generate=prompt=>context.runner.generate(flow,prompt,referenceAssets.map(a=>({name:a.mediaId})),'BELUGA','3:4');
  return {page,context,STATE,flow,generate,requests,pending,errors,
    debug:async()=>({configs,counts:{reloads,beginCalls,submitCalls},jobs:await page.evaluate(ids=>ids.map(id=>window.GucFlowNative?.status(id)),configs.map(c=>c.id)),html:await page.locator('body').innerText()}),
    counts:()=>({reloads,submitCalls,beginCalls,cancelCalls}),close:async()=>{pending.splice(0).forEach(r=>r());await page.close();}};
}
async function until(check,timeout=6000) {
  const end=Date.now()+timeout;
  while(!check()){if(Date.now()>end)throw Error('Test condition timed out');await delay(20);}
}
test('three native jobs overlap, finish out of order, and keep exact settings and references',async()=>{
  const h=await harness({hold:true});
  try {
    const tasks=['one','two','three'].map(h.generate);
    await until(()=>h.pending.length===3).catch(async e=>{console.error(await h.debug());throw e;});
    assert.equal(h.counts().reloads,1);
    const submitted=await h.page.evaluate(()=>fixture.submitted);
    assert.deepEqual(submitted.map(r=>r.prompt),['one','two','three']);
    for(const job of submitted) {
      assert.equal(job.model,'BELUGA');assert.equal(job.aspect,'3:4');assert.equal(job.count,1);assert.equal(job.agent,'false');
      assert.deepEqual(job.references.map(r=>r[0]),['sunny-face','sunny-outfit']);
    }
    h.pending[2]();assert.equal((await tasks[2]).mediaId,'result-three');
    h.pending[0]();assert.equal((await tasks[0]).mediaId,'result-one');
    h.pending[1]();assert.equal((await tasks[1]).mediaId,'result-two');
    assert.equal(h.counts().submitCalls,3);assert.deepEqual(h.errors,[]);
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),6,'each reference needs its own explicit Add to prompt');
  } finally {await h.close();}
});
for(const mode of ['xhr','request'])test('native response capture supports '+mode,async()=>{
  const h=await harness({mode});
  try {assert.equal((await h.generate(mode)).mediaId,'result-'+mode);assert.equal(h.requests.length,1);}
  finally {await h.close();}
});
test('Stop before click cancels preparation and makes zero generation requests',async()=>{
  const h=await harness();
  try {
    // Suppress asset search results to hold preparation before the final click.
    h.flow.referenceFiles['sunny-face']='missing.jpg';
    const task=h.generate('stop');
    const checked=assert.rejects(task,e=>e.notSubmitted&&e.code==='FLOW_REQUEST_NOT_SUBMITTED');
    await until(()=>h.counts().beginCalls===1);h.STATE.stopRequested=true;
    await checked;assert.equal(h.requests.length,0);assert.equal(h.counts().submitCalls,0);
  } finally {await h.close();}
});
test('missing reference mapping fails before a native click',async()=>{
  const h=await harness();
  try {delete h.flow.referenceFiles['sunny-face'];await assert.rejects(h.generate('missing'),e=>e.notSubmitted);assert.equal(h.counts().beginCalls,0);}
  finally {await h.close();}
});
test('an unconfirmed click is never replayed automatically',async()=>{
  const h=await harness({mode:'no-request'});
  try {
    // Make the native request-observation timeout short in this isolated fixture.
    await h.page.addInitScript(()=>{const original=window.setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,Math.min(ms,5),...args);});
    const task=h.generate('unknown');
    const checked=assert.rejects(task,e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&!e.notSubmitted);
    await until(()=>h.counts().submitCalls===1);
    await h.page.waitForFunction(()=>fixture.submitted.length===1);
    // Simulate navigation destroying the observer after the click.
    await h.page.reload();
    await checked;
    await assert.rejects(h.generate('next'),e=>e.notSubmitted);
    assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});
test('reference refresh waits for native responses and active uploads before reloading',async()=>{
  const h=await harness({hold:true});
  try {
    const first=h.generate('first');await until(()=>h.pending.length===1);
    h.flow.nativeUploadCount=1;h.flow.referenceRevision++;
    const second=h.generate('second');await delay(80);assert.equal(h.counts().reloads,1);
    h.pending[0]();await first;await delay(80);assert.equal(h.counts().reloads,1);
    h.flow.nativeUploadCount=0;await until(()=>h.pending.length===2);
    assert.equal(h.counts().reloads,2);h.pending[1]();await second;
  } finally {await h.close();}
});
test('native security rejection blocks later jobs without retrying its request',async()=>{
  const h=await harness({responseBody:'[["wrb.fr","ogiZ0b",null,null,null,[7,null,[["type.googleapis.com/google.rpc.ErrorInfo",["PUBLIC_ERROR_UNUSUAL_ACTIVITY"]]]]]]'});
  try {
    await assert.rejects(h.generate('rejected'),e=>e.code==='FLOW_GENERATION_REJECTED'&&e.noRetry);
    await assert.rejects(h.generate('later'),e=>e.code==='FLOW_UNUSUAL_ACTIVITY_PAUSED'&&e.notSubmitted);
    assert.equal(h.requests.length,1);assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});
test('a changed response schema stays unknown instead of becoming a retryable rejection',async()=>{
  const h=await harness({responseBody:'[["wrb.fr","ogiZ0b","[]"]]'});
  try {await assert.rejects(h.generate('schema'),e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN');assert.equal(h.requests.length,1);}
  finally {await h.close();}
});
test('a native settings mismatch is detected without a duplicate submission',async()=>{
  const h=await harness();
  try {
    h.flow.nativeAssetRevision=1;
    await h.page.evaluate(()=>{fixture.wrongModel='GEM_PIX_2';});
    await assert.rejects(h.generate('mismatch'),e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN');
    assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});
test('an unrelated native request cannot supply another panel result',async()=>{
  const h=await harness();
  try {
    h.flow.nativeAssetRevision=1;await h.page.evaluate(()=>{fixture.foreignFirst=true;});
    assert.equal((await h.generate('own')).mediaId,'result-own');
    assert.deepEqual(h.requests.map(r=>r.prompt),['foreign request','own']);
  } finally {await h.close();}
});
test('Stop at final admission cancels a ready composer without clicking Generate',async()=>{
  const h=await harness();
  try {
    h.context.FlowRequestGuard.admit=async()=>{h.STATE.stopRequested=true;await h.context.FlowRequestGuard.ready();};
    await assert.rejects(h.generate('ready-stop'),e=>e.notSubmitted);
    assert.equal(h.counts().beginCalls,1);assert.equal(h.counts().submitCalls,0);assert.equal(h.requests.length,0);
  } finally {await h.close();}
});
for(const attachMode of ['direct','direct-placeholder'])test(attachMode+' reference attachment is not added twice',async()=>{
  const h=await harness({attachMode});
  try {
    assert.equal((await h.generate(attachMode)).mediaId,'result-'+attachMode);
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),0);
    assert.equal(h.requests[0].data[1][0][2].length,2);
  } finally {await h.close();}
});
test('a wrong attached media ID fails before Generate',async()=>{
  const h=await harness();
  try {
    h.flow.nativeAssetRevision=1;await h.page.evaluate(()=>{fixture.wrongReference='different-character';});
    await assert.rejects(h.generate('wrong-ref'),e=>e.notSubmitted&&/different reference/.test(e.message));
    assert.equal(h.requests.length,0);assert.equal(h.counts().submitCalls,0);
  } finally {await h.close();}
});
test('Stop while Add to prompt is disabled cancels without an attachment or generation',async()=>{
  const h=await harness();
  try {
    h.flow.nativeAssetRevision=1;await h.page.evaluate(()=>{fixture.disableAdd=true;});
    const checked=assert.rejects(h.generate('stop-picker'),e=>e.notSubmitted);
    await h.page.waitForFunction(()=>fixture.selectedAsset);
    h.STATE.stopRequested=true;await checked;
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),0);assert.equal(h.requests.length,0);
  } finally {await h.close();}
});

test('short-name fallback finds exact UUID uploads among same-base results with truncated titles',async()=>{
  const h=await harness({searchMode:'short-only',titleMode:'title-attribute',fastClock:true});
  try {
    assert.equal((await h.generate('short-search')).mediaId,'result-short-search');
    assert.deepEqual(h.requests[0].data[1][0][2].map(r=>r[0]),['sunny-face','sunny-outfit']);
    const seen=await h.page.evaluate(()=>({searches:fixture.searches,addClicks:fixture.addClicks}));
    assert.ok(seen.searches.includes('full_single_P069_side'));assert.equal(seen.addClicks,2);
    assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});

for(const titleMode of ['no-extension','media-id'])test('reference matching supports '+titleMode+' without weakening final media checks',async()=>{
  const h=await harness({titleMode});
  try {
    assert.equal((await h.generate(titleMode)).mediaId,'result-'+titleMode);
    assert.deepEqual(h.requests[0].data[1][0][2].map(r=>r[0]),['sunny-face','sunny-outfit']);
    assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});

test('a stale empty picker reopens safely before one Generate action',async()=>{
  const h=await harness({searchMode:'reopen',fastClock:true});
  try {
    assert.equal((await h.generate('reopen')).mediaId,'result-reopen');
    assert.equal(await h.page.evaluate(()=>fixture.pickerOpens),3);
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),2);
    assert.equal(h.counts().reloads,1);assert.equal(h.counts().submitCalls,1);
  } finally {await h.close();}
});

test('a truly missing asset stops after bounded picker recovery without submitting',async()=>{
  const h=await harness({fastClock:true});
  try {
    h.flow.referenceFiles['sunny-face']='missing__431b7375-fb42-4934-99fd-189975c997e0.jpg';
    // A matching UUID token alone is not authority to select a differently named asset.
    await assert.rejects(h.generate('missing-search'),e=>e.notSubmitted&&/full-name\/short-name search/.test(e.message));
    assert.equal(await h.page.evaluate(()=>fixture.pickerOpens),2);
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),0);
    assert.equal(h.requests.length,0);assert.equal(h.counts().submitCalls,0);
  } finally {await h.close();}
});

test('Stop interrupts short-name fallback without a later selection or Generate action',async()=>{
  const h=await harness({fastClock:true});
  try {
    h.flow.referenceFiles['sunny-face']='missing__431b7375-fb42-4934-99fd-189975c997e0.jpg';
    const checked=assert.rejects(h.generate('stop-search'),e=>e.notSubmitted);
    await h.page.waitForFunction(()=>fixture.searches.includes('missing'));
    h.STATE.stopRequested=true;await checked;
    assert.equal(await h.page.evaluate(()=>fixture.addClicks),0);assert.equal(h.requests.length,0);
  } finally {await h.close();}
});

test('backend uploads supply subject, outfit and location IDs and canonical names to the native composer',async()=>{
  const referenceAssets=[...assets,{mediaId:'garden-location',fileName:'canonical-garden-wall.jpg'}];
  const h=await harness({referenceAssets,fastClock:true});
  const posted=[];
  try {
    const background=fs.readFileSync(path.join(__dirname,'background.js'),'utf8');
    const uploadSource=background.slice(background.indexOf('async function uploadDataUrlToFlow('),background.indexOf('async function uploadReferenceUntilSuccess('));
    const upload=vm.createContext({
      FlowRequestGuard:h.context.FlowRequestGuard,makeFlowId:()=>require('node:crypto').randomUUID(),
      mintFlowRecaptchaToken:async()=> 'fixture-upload-token',
      BigBombFlowRpc:{...rpc,prepareUploadImage:async(data,fileName)=>({imageBytes:data,mimeType:'image/jpeg',fileName})},
      chrome:{scripting:{executeScript:async({args})=>{
        const request=JSON.parse(JSON.parse(args[0])[0][0][1]);
        const asset=referenceAssets[posted.length];posted.push(request);
        const payload=[[asset.mediaId,'test-project','asset-'+asset.mediaId],['asset-'+asset.mediaId,null,null,[asset.fileName,null,null,null,asset.mediaId],'test-project']];
        return [{result:{text:JSON.stringify([['wrb.fr','maseQ',JSON.stringify(payload)]])}}];
      }}}
    });
    vm.runInContext(uploadSource,upload);
    h.flow.referenceFiles={};h.flow.referenceRevision=0;
    for(const [index,asset] of referenceAssets.entries()) {
      assert.equal(await upload.uploadDataUrlToFlow(h.flow,'fixture-bytes-'+index,'requested-'+index+'.jpg'),asset.mediaId);
    }
    assert.equal(posted.length,3);assert.equal(posted[2][1],'fixture-bytes-2');
    assert.equal(h.flow.referenceFiles['garden-location'],'canonical-garden-wall.jpg');
    assert.equal((await h.generate('with-location')).mediaId,'result-with-location');
    assert.deepEqual(h.requests[0].data[1][0][2].map(r=>r[0]),referenceAssets.map(r=>r.mediaId));
    assert.equal(h.counts().submitCalls,1);assert.equal(await h.page.evaluate(()=>fixture.addClicks),3);
  } finally {await h.close();}
});
