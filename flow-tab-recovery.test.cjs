const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const rpc=require('./flow-rpc.js'),retry=require('./flow-retry.js');
const source=fs.readFileSync(require.resolve('./background.js'),'utf8');
const missing=id=>Error(`No tab with id: ${id}`);
function setup({phase='files',createFails=false,loading=false,redirect=false,compatibilityFails=false}={}) {
  const calls=[],created=[],removed=[],events=[],reports=[],tabs=new Map(),STATE={stopRequested:false};
  const flow={tabId:561828317,authTabId:561828317,accountIndex:'2',projectId:'kept-project',referenceFiles:{ref:'face.jpg'},referenceAssets:{ref:{assetId:'asset'}},referenceUploadCache:{projectId:'kept-project',entries:new Map()}};
  const media=['confirmed'];media[6]=[[...Array(13).fill(null),'https://flow-content.google/confirmed']];
  const response=JSON.stringify([['wrb.fr','ogiZ0b',JSON.stringify([[media]])]]);
  let clock=0,onWait=()=>{},onCreate=()=>{},beforeOldFailure=null;
  const context=vm.createContext({URL,Date:{now:()=>clock},Promise,Map,WeakMap,Error,AbortController,AbortSignal,
    crypto:require('node:crypto').webcrypto,STATE,BigBombFlowRpc:rpc,FlowRetry:retry,
    log:()=>{},sleep:async()=>{},interruptibleWait:async()=>{clock+=250;await onWait();},waitForGenerationOperation:p=>p,
    FLOW_DYNAMIC_SITE_KEYS:new Map(),FLOW_MODEL_API_IDS:{NARWHAL:'BELUGA'},MODEL_DISPLAY_NAMES:{},
    FlowRequestGuard:require('./flow-request-guard.js').create({stopped:()=>STATE.stopRequested}),
    FlowDiagnostics:{record:(id,step,detail)=>{events.push({step,...detail});return detail;},save:async value=>reports.push(value)},
    mintFlowRecaptchaToken:async()=> 'test-token',
    checkFlowCompatibility:async()=>{if(compatibilityFails)throw Error('Flow session is not ready.');return {siteKey:'same-account-key'};},
    chrome:{tabs:{
      create:async options=>{created.push(options);await onCreate();if(createFails)throw Error('UNAVAILABLE');const tab={...options,id:100+created.length,status:loading?'loading':'complete'};tabs.set(tab.id,tab);return tab;},
      update:async(id,options)=>Object.assign(tabs.get(id),options),
      get:async id=>{const tab=tabs.get(id);if(!tab)throw missing(id);return redirect?{...tab,url:'https://accounts.google.com/'}:tab;},
      remove:async id=>{removed.push(id);tabs.delete(id);}
    },scripting:{executeScript:async({target,files,args})=>{
      const method=files?'files':args[0];calls.push({tabId:target.tabId,method});
      if(target.tabId===561828317 && method===phase){if(beforeOldFailure)await beforeOldFailure();throw missing(target.tabId);}
      if(files)return [];
      if(method==='version')return [{result:'4.5.9'}];
      if(method==='begin')return [{result:{ok:true}}];
      if(method==='status')return [{result:{stage:'response_received',submitted:true,httpStatus:200,text:response}}];
      return [{result:null}];
    }}}
  });
  // FlowBackend needs a constructible Date as well as the recovery clock.
  context.Date=class extends Date {static now(){return clock;}};
  vm.runInContext(fs.readFileSync('flow-tab-recovery.js','utf8')+'\n'+fs.readFileSync('flow-backend.js','utf8')+'\n'+
    source.slice(source.indexOf('async function generateFlowImage('),source.indexOf('async function requestFlowUpscale('))+'\nglobalThis.recovery=FlowTabRecovery;',context);
  const generate=()=>context.generateFlowImage(flow,'test',[{name:'ref'}],'NARWHAL','IMAGE_ASPECT_RATIO_PORTRAIT',{imageIndex:5,attempt:116});
  return {context,flow,STATE,calls,created,removed,events,reports,tabs,generate,
    onWait:f=>onWait=f,onCreate:f=>onCreate=f,beforeOldFailure:f=>beforeOldFailure=f};
}

test('reported failure recovers in the same account/project before one generation dispatch',async()=>{
  const h=setup(),refs=h.flow.referenceFiles,assets=h.flow.referenceAssets,cache=h.flow.referenceUploadCache;
  assert.equal((await h.generate()).mediaId,'confirmed');
  assert.deepEqual(h.created.map(options=>({...options})),[{url:'https://flow.google.com/u/2/project/kept-project',active:false}]);
  assert.equal(h.flow.tabId,101);assert.equal(h.flow.authTabId,101);assert.equal(h.STATE.editorTabId,101);
  assert.equal(h.tabs.get(101).autoDiscardable,false);
  assert.equal(h.flow.referenceFiles,refs);assert.equal(h.flow.referenceAssets,assets);assert.equal(h.flow.referenceUploadCache,cache);
  assert.equal(h.calls.filter(c=>c.method==='begin').length,1);
  assert.ok(h.events.some(e=>e.code==='FLOW_REQUEST_NOT_SUBMITTED'&&e.submitted===false&&e.attempt===116));
});

test('five workers with the same dead tab share one replacement and retain their own submissions',async()=>{
  const h=setup();
  const results=await Promise.all(Array.from({length:5},()=>h.generate()));
  assert.equal(results.length,5);assert.equal(h.created.length,1);
  assert.equal(h.calls.filter(c=>c.method==='begin').length,5);
  assert.ok(h.calls.filter(c=>c.method==='begin').every(c=>c.tabId===101));
});

test('late failure from an old worker reuses an already recovered tab',async()=>{
  const h=setup();let release,count=0;
  const gate=new Promise(resolve=>release=resolve);
  h.beforeOldFailure(async()=>{if(++count===1)await gate;});
  const late=h.generate();await h.generate();release();await late;
  assert.equal(h.created.length,1);assert.equal(h.calls.filter(c=>c.method==='begin').length,2);
});

test('loss at dispatch or while awaiting its result remains unknown and never opens a replacement',async()=>{
  for(const phase of ['begin','status']) {
    const h=setup({phase});
    await assert.rejects(h.generate(),e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&e.noRetry&&retry.decision(e).retry===false);
    assert.equal(h.created.length,0);assert.equal(h.calls.filter(c=>c.method==='begin').length,1);
  }
});

test('failed, redirected and timed-out replacements pause without retrying forever',async()=>{
  for(const options of [{createFails:true},{redirect:true},{loading:true},{compatibilityFails:true}]) {
    const h=setup(options);
    await assert.rejects(h.generate(),e=>e.code==='FLOW_TAB_RECOVERY_FAILED'&&e.notSubmitted&&retry.decision(e,116).retry===false);
    await assert.rejects(h.generate(),e=>e.code==='FLOW_TAB_RECOVERY_FAILED');
    assert.equal(h.created.length,1);assert.equal(h.flow.tabId,561828317);
    assert.equal(h.calls.filter(c=>c.method==='begin').length,0);
    assert.equal(h.removed.length,options.createFails?0:1);
  }
});

test('Stop during creation or loading cleans up without dispatching or publishing the tab',async()=>{
  for(const duringCreate of [false,true]) {
    const h=setup({loading:true});
    (duringCreate?h.onCreate:h.onWait)(()=>{h.STATE.stopRequested=true;});
    await assert.rejects(h.generate(),e=>e.notSubmitted&&e.noRetry);
    assert.equal(h.created.length,1);assert.deepEqual(h.removed,[101]);assert.equal(h.flow.tabId,561828317);
    assert.equal(h.calls.filter(c=>c.method==='begin').length,0);
  }
});

test('repeated tab closure has a per-run ceiling and does not grow new tabs indefinitely',async()=>{
  const h=setup();
  const operation=async id=>{if(id===h.flow.tabId)throw Object.assign(missing(id),{notSubmitted:true});};
  await assert.rejects(h.context.recovery.run(h.flow,operation),e=>e.code==='FLOW_TAB_RECOVERY_FAILED');
  await assert.rejects(h.context.recovery.run(h.flow,operation),e=>e.code==='FLOW_TAB_RECOVERY_FAILED');
  assert.equal(h.created.length,1);
  const healthy=setup();
  for(let i=0;i<2;i++) {
    const old=healthy.flow.tabId;
    await healthy.context.recovery.run(healthy.flow,async id=>{if(id===old)throw Object.assign(missing(id),{notSubmitted:true});return 'ok';});
  }
  await assert.rejects(healthy.context.recovery.run(healthy.flow,async id=>{throw Object.assign(missing(id),{notSubmitted:true});}),e=>e.code==='FLOW_TAB_RECOVERY_FAILED');
  assert.equal(healthy.created.length,2);
});

test('missing account context never guesses account zero or creates a different project',async()=>{
  const h=setup();delete h.flow.accountIndex;
  await assert.rejects(h.generate(),e=>e.code==='FLOW_TAB_RECOVERY_FAILED');assert.equal(h.created.length,0);
});

test('reference upload recovers only pre-dispatch tab loss and retains confirmed mapping',async()=>{
  for(const atDispatch of [false,true]) {
    const h=setup();let submissions=0;
    h.context.makeFlowId=()=>require('node:crypto').randomUUID();
    h.context.BigBombFlowRpc={...rpc,prepareUploadImage:async()=>({mimeType:'image/jpeg',imageBytes:'AAAA',fileName:'face.jpg'})};
    h.context.mintFlowRecaptchaToken=async id=>{if(!atDispatch&&id===561828317)throw missing(id);return 'token';};
    h.context.chrome.scripting.executeScript=async({target})=>{
      submissions++;
      if(atDispatch)throw missing(target.tabId);
      assert.equal(target.tabId,101);
      return [{result:{submitted:true,status:200,text:JSON.stringify([['wrb.fr','maseQ',JSON.stringify([
        ['uploaded','kept-project','asset-new'],['asset-new',null,null,['canonical.jpg',null,null,null,'uploaded'],'kept-project']
      ])]])}}];
    };
    vm.runInContext(source.slice(source.indexOf('async function uploadDataUrlToFlow('),source.indexOf('async function uploadReferenceUntilSuccess(')),h.context);
    const upload=()=>h.context.uploadDataUrlToFlow(h.flow,'data:image/jpeg;base64,AAAA','face.jpg');
    if(atDispatch) {
      await assert.rejects(upload(),e=>e.code==='FLOW_UPLOAD_OUTCOME_UNKNOWN'&&retry.decision(e).retry===false);
      assert.equal(h.created.length,0);assert.equal(h.flow.referenceFiles.uploaded,undefined);
    } else {
      assert.deepEqual(await Promise.all([upload(),upload()]),['uploaded','uploaded']);
      assert.equal(h.flow.referenceFiles.uploaded,'canonical.jpg');assert.equal(h.flow.referenceFiles.ref,'face.jpg');
      assert.equal(h.created.length,1);
    }
    assert.equal(submissions,1);
  }
});

test('confirmed-image download can recover the tab without any generation submission',async()=>{
  const h=setup();
  h.context.fetch=async url=>url.startsWith('data:')?{ok:true,blob:async()=>({size:2000})}:{ok:false,status:403};
  h.context.chrome.scripting.executeScript=async({target})=>{h.calls.push({tabId:target.tabId,method:'download'});if(target.tabId===561828317)throw missing(target.tabId);return [{result:{dataUrl:'data:image/png;base64,fixture'}}];};
  h.context.createImageBitmap=async()=>({width:1024,height:1365,close:()=>{}});
  vm.runInContext(source.slice(source.indexOf('async function fetchNativeFlowImage('),source.indexOf('// ---------------- Gemini Planning Tab')),h.context);
  const result=await h.context.fetchMaximumQualityFlowImage(h.flow,'confirmed','https://flow-content.google/confirmed',{transport:'backend-rpc'});
  assert.equal(result.width,1024);assert.equal(h.created.length,1);assert.ok(h.calls.every(c=>c.method==='download'));
});

test('download recovery errors keep their terminal classification through both download layers',async()=>{
  const h=setup({createFails:true});
  h.context.fetch=async()=>({ok:false,status:403});
  h.context.chrome.scripting.executeScript=async()=>{throw missing(561828317);};
  vm.runInContext(source.slice(source.indexOf('async function fetchNativeFlowImage('),source.indexOf('// ---------------- Gemini Planning Tab')),h.context);
  await assert.rejects(h.context.fetchMaximumQualityFlowImage(h.flow,'confirmed','https://flow-content.google/confirmed',{transport:'backend-rpc'}),e=>e.code==='FLOW_TAB_RECOVERY_FAILED'&&retry.decision(e,116,{download:true}).retry===false);
  assert.equal(h.created.length,1);
});
