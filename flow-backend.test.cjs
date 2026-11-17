const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {setTimeout:delay}=require('node:timers/promises');
const rpc=require('./flow-rpc.js');
const guard=require('./flow-request-guard.js');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const pageSource=fs.readFileSync(require.resolve('./content_flow_backend.js'),'utf8');
const runnerSource=fs.readFileSync(require.resolve('./flow-backend.js'),'utf8');
const diagnosticsSource=fs.readFileSync(require.resolve('./flow-diagnostics.js'),'utf8');
const assets=[{mediaId:'subject-front',fileName:'face-front.jpg'},{mediaId:'subject-side',fileName:'face-side.jpg'},{mediaId:'outfit',fileName:'outfit.jpg'},{mediaId:'location',fileName:'garden-wall.jpg'}];
const privatePrompt='private prompt: a quiet garden wall';
const privateToken='private-challenge-token';
let browser;
before(async()=>{browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});});
after(async()=>{await browser?.close();});
function response(id){const media=[id];media[6]=[[...Array(13).fill(null),'https://flow-content.google/image/'+id+'?signed=private-output-url']];return JSON.stringify([['wrb.fr','ogiZ0b',JSON.stringify([[media]])]]);}
async function until(check,timeout=6000){const end=Date.now()+timeout;while(!check()){if(Date.now()>end)throw Error('Condition timed out');await delay(10);}}

async function harness({hold=false,httpStatus=200,body,networkFail=false,session=true,project='test-project',tokenHook,beginHook,invocationFailure=false}={}){
  const page=await browser.newPage(),requests=[],pending=[],logs=[],saved={},errors=[],calls=[];
  const STATE={stopRequested:false};
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    if(route.request().url().includes('batchexecute')){
      const request=route.request(),form=new URLSearchParams(request.postData());
      const envelope=JSON.parse(form.get('f.req')),data=JSON.parse(envelope[0][0][1]);
      const prompt=data[1][0][8][0][0][0];
      requests.push({url:request.url(),method:request.method(),headers:request.headers(),form,envelope,data,prompt});
      if(hold)await new Promise(resolve=>pending.push(resolve));
      if(networkFail){await route.abort('failed').catch(()=>{});return;}
      await route.fulfill({status:httpStatus,contentType:'text/plain',body:body??response('result-'+prompt)}).catch(()=>{});
    }else await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body>No Flow composer or asset picker exists in this fixture.</body></html>'});
  });
  await page.addInitScript(({session})=>{
    if(session)window.WIZ_global_data={SNlM0e:'private-session-token',cfb2h:'fixture-build',FdrFJe:'private-session-id'};
    // Any attempt to use a frontend picker/composer fails this test immediately.
    const forbidden=()=>{throw Error('Frontend action attempted');};
    document.querySelector=forbidden;document.querySelectorAll=forbidden;
    HTMLElement.prototype.click=forbidden;HTMLElement.prototype.focus=forbidden;
  },{session});
  await page.goto('https://flow.google.com/u/2/project/'+project);
  let minted=0;
  const context=vm.createContext({URL,Date,Map,Promise,crypto:require('node:crypto').webcrypto,STATE,BigBombFlowRpc:rpc,FlowRetry:require('./flow-retry.js'),
    log:text=>logs.push(text),sleep:()=>delay(5),
    FlowRequestGuard:guard.create({stopped:()=>STATE.stopRequested,spacingMs:0}),
    mintFlowRecaptchaToken:async()=>{minted++;if(tokenHook)await tokenHook(STATE);return privateToken;},
    chrome:{storage:{local:{get:async key=>({[key]:structuredClone(saved[key])}),set:async patch=>Object.assign(saved,structuredClone(patch))}},
      scripting:{executeScript:async({files,func,args})=>{
        if(files){assert.deepEqual([...files],['content_flow_backend.js']);await page.addScriptTag({content:pageSource});return [];}
        // Playwright accepts undefined, but chrome.scripting.executeScript does not.
        // Preserve the Chrome boundary instead of silently widening its contract.
        if(args.some(value=>value===undefined))throw new TypeError("Error at property 'args': Value is unserializable.");
        if(invocationFailure&&args[0]==='version')throw new TypeError("Error at property 'args': Value is unserializable.");
        calls.push(args[0]);if(args[0]==='begin'&&beginHook)await beginHook(page);
        const result=await page.evaluate(({source,args})=>(0,eval)('('+source+')')(...args),{source:func.toString(),args});
        return [{result}];
      }}}
  });
  vm.runInContext(diagnosticsSource+'\n'+runnerSource+'\nglobalThis.runner=FlowBackend;globalThis.diagnostics=FlowDiagnostics;',context);
  const flow={tabId:1,projectId:'test-project',referenceFiles:Object.fromEntries(assets.map(a=>[a.mediaId,a.fileName])),referenceAssets:Object.fromEntries(assets.map(a=>[a.mediaId,{assetId:'asset-'+a.mediaId}]))};
  const generate=(prompt=privatePrompt,ids=assets.slice(0,3).map(a=>a.mediaId),image=1)=>context.runner.generate(flow,prompt,ids.map(name=>({name})),'BELUGA','9:16',{imageIndex:image,attempt:1});
  return {page,context,STATE,flow,requests,pending,logs,saved,errors,calls,generate,minted:()=>minted,
    close:async()=>{pending.splice(0).forEach(resolve=>resolve());await page.close();}};
}

test('generation payload matches reviewed 10.9.1 adapter across models, aspects and reference counts',()=>{
  // Pure builders reviewed from download (1).zip, adapter-CEOGdgvO.js.
  // No extension code, token helper or network implementation is executed here.
  function sparse(e){if(!e)return[];const t=Object.keys(e).map(Number);if(!t.length)return[];const n=new Array(Math.max(...t)+1).fill(null);for(const a of t)n[a]=e[a];return n;}
  function referenceBuilder(project,token,model,aspect,parts,options){
    const client=sparse({1:22,5:project,10:sparse({0:token,1:1})});
    const request={3:options.seed,4:aspect,5:model,7:client,8:[[...parts]],12:'REQUEST',13:'CLIENT'};
    if(options.imageInputIds.length)request[2]=options.imageInputIds.map(id=>sparse({0:id,4:1}));
    return [null,[sparse(request)],1,client,sparse({0:'BATCH'})];
  }
  for(const model of ['BELUGA','GEM_PIX_2','HARBOR_SEAL'])for(const aspectCode of [1,2,3,4,5])for(const count of [0,3,9]){
    const referenceIds=Array.from({length:count},(_,i)=>'reference-'+i);
    const options={projectId:'project',prompt:'Line one\n"Line two" हिन्दी',model,aspectCode,referenceIds,challengeToken:'token',seed:123456,requestId:'REQUEST',clientId:'CLIENT',batchId:'BATCH'};
    const expected=referenceBuilder(options.projectId,options.challengeToken,model,aspectCode,[[options.prompt]],{seed:options.seed,imageInputIds:referenceIds});
    assert.deepEqual(JSON.parse(rpc.buildGenerationRequest(options)),[[['ogiZ0b',JSON.stringify(expected),null,'generic']]]);
  }
});

test('version lookup crosses the Chrome JSON argument boundary before generation',async()=>{
  const h=await harness();
  try{
    assert.ok((await h.generate()).mediaId);
    assert.equal(h.calls[0],'version');assert.ok(h.calls.includes('begin'));
    assert.equal(h.requests.length,1);
  }finally{await h.close();}
});

test('a deterministic Chrome serialization error is unsent and non-retryable',async()=>{
  const h=await harness({invocationFailure:true});
  try{
    await assert.rejects(h.generate(),error=>error.code==='FLOW_SCRIPT_ARGUMENT_INVALID'&&error.notSubmitted&&error.noRetry);
    assert.equal(h.requests.length,0);assert.equal(h.minted(),0);
    assert.equal(h.saved.bb_flow_diagnostics[0].submitted,false);
  }finally{await h.close();}
});

test('five backend jobs overlap and match out-of-order results without any frontend UI',async()=>{
  const h=await harness({hold:true});
  try{
    const tasks=['one','two','three','four','five'].map((prompt,i)=>h.generate(prompt,i===2?['subject-front','location']:undefined,i+1));
    await until(()=>h.pending.length===5);
    assert.equal(h.calls.filter(c=>c==='begin').length,5);
    assert.ok(h.logs.every(line=>!line.includes('generation_confirmed')));
    for(const request of h.requests){
      const query=new URL(request.url).searchParams;
      assert.equal(request.method,'POST');assert.equal(query.get('rpcids'),'ogiZ0b');assert.equal(query.get('source-path'),'/u/2/');
      assert.equal(query.get('hl'),'en');assert.equal(request.headers['x-same-domain'],'1');
      assert.equal(request.form.get('at'),'private-session-token');
      assert.equal(request.data[1].length,1);assert.equal(request.data[1][0][4],2);assert.equal(request.data[1][0][5],'BELUGA');
      assert.equal(request.data[3][5],'test-project');assert.equal(request.data[3][10][0],privateToken);
      assert.deepEqual(request.data[1][0][2].map(x=>x[0]),request.prompt==='three'?['subject-front','location']:['subject-front','subject-side','outfit']);
    }
    h.pending[2]();assert.equal((await tasks[2]).mediaId,'result-three');
    h.pending[4]();assert.equal((await tasks[4]).mediaId,'result-five');
    h.pending[0]();assert.equal((await tasks[0]).mediaId,'result-one');
    h.pending[1]();assert.equal((await tasks[1]).mediaId,'result-two');
    h.pending[3]();assert.equal((await tasks[3]).mediaId,'result-four');
    assert.equal(new Set(h.requests.map(r=>r.data[4][0])).size,5);
    assert.equal(h.saved.bb_flow_diagnostics.length,5);
    for(const report of h.saved.bb_flow_diagnostics){
      const stages=report.events.map(e=>e.step);
      assert.equal(report.code,'FLOW_GENERATION_CONFIRMED');assert.equal(report.submitted,true);
      assert.ok(stages.indexOf('backend_request_sent')<stages.indexOf('generation_confirmed'));
      assert.ok(stages.indexOf('backend_response_received')<stages.indexOf('generation_confirmed'));
      assert.equal(await h.page.evaluate(id=>window.GucFlowBackend.status(id),report.traceId),null);
    }
    assert.deepEqual(h.errors,[]);
  }finally{await h.close();}
});

for(const when of ['before token','during token'])test('Stop '+when+' sends zero generation requests',async()=>{
  const h=await harness({tokenHook:when==='during token'?async state=>{state.stopRequested=true;}:undefined});
  try{
    if(when==='before token')h.STATE.stopRequested=true;
    await assert.rejects(h.generate(),error=>error.notSubmitted===true&&error.noRetry===true);
    assert.equal(h.requests.length,0);assert.ok(!h.calls.includes('begin'));
    assert.ok(!h.logs.some(line=>line.includes('backend_request_sent')));
    assert.equal(h.saved.bb_flow_diagnostics[0].submitted,false);
  }finally{await h.close();}
});

test('Stop cancels a hung submitted request promptly and retains outcome uncertainty',async()=>{
  const h=await harness({hold:true});
  try{const task=h.generate();await until(()=>h.pending.length===1);h.STATE.stopRequested=true;const start=Date.now();await assert.rejects(task,e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&e.noRetry);assert.ok(Date.now()-start<1500);assert.ok(h.calls.includes('cancel'));assert.equal(h.requests.length,1);}
  finally{await h.close();}
});

test('missing upload mapping fails before token mint and does not pretend attachment succeeded',async()=>{
  const h=await harness();
  try{await assert.rejects(h.generate(privatePrompt,['missing']),e=>e.code==='FLOW_REFERENCE_MAPPING_MISSING'&&e.notSubmitted&&e.noRetry);assert.equal(h.minted(),0);assert.equal(h.requests.length,0);assert.equal(h.saved.bb_flow_diagnostics[0].expected[0].mediaId,'missing');}
  finally{await h.close();}
});

for(const options of [{session:false},{project:'different-project'}])test('invalid page context blocks backend submission: '+JSON.stringify(options),async()=>{
  const h=await harness(options);
  try{await assert.rejects(h.generate(),e=>e.code==='FLOW_REQUEST_NOT_SUBMITTED'&&e.notSubmitted);assert.equal(h.requests.length,0);assert.equal(h.saved.bb_flow_diagnostics[0].submitted,false);assert.ok(!h.logs.some(line=>line.includes('backend_request_sent')));}
  finally{await h.close();}
});

for(const options of [{body:'[]'},{body:'[["wrb.fr","ogiZ0b","[]"]]'},{body:'[["wrb.fr","ogiZ0b","broken"]]'},{networkFail:true},{httpStatus:500}])test('unconfirmed result is not retried: '+JSON.stringify(options),async()=>{
  const h=await harness(options);
  try{await assert.rejects(h.generate(),e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&e.noRetry);assert.equal(h.requests.length,1);assert.equal(h.saved.bb_flow_diagnostics[0].submitted,true);assert.ok(!h.logs.some(line=>line.includes('generation_confirmed')));}
  finally{await h.close();}
});

test('tab loss at dispatch reports unknown submission instead of a false not-sent claim',async()=>{
  const h=await harness({beginHook:async page=>page.close()});
  try{await assert.rejects(h.generate(),e=>e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&e.noRetry&&!e.notSubmitted);assert.equal(h.saved.bb_flow_diagnostics[0].submitted,null);assert.ok(!h.logs.some(line=>line.includes('backend_request_sent')));}
  finally{await h.close();}
});

for(const httpStatus of [400,401,403,404,429])test('explicit HTTP '+httpStatus+' rejection is recorded without replay',async()=>{
  const h=await harness({httpStatus,body:'<html>Server declined this request</html>'});
  try{await assert.rejects(h.generate(),e=>e.code==='FLOW_GENERATION_REJECTED'&&(httpStatus===429?!e.noRetry:e.noRetry));assert.equal(h.requests.length,1);assert.ok(h.logs.some(line=>line.includes('"httpStatus":'+httpStatus)));}
  finally{await h.close();}
});

test('explicit unusual-activity rejection is marked non-retryable',async()=>{
 const h=await harness({body:'[["wrb.fr","ogiZ0b",null,null,null,[7,null,[["type.googleapis.com/google.rpc.ErrorInfo",["PUBLIC_ERROR_UNUSUAL_ACTIVITY"]]]]]]'});
 try {await assert.rejects(h.generate(),e=>e.noRetry&&/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(e.message));await h.context.FlowRequestGuard.ready();assert.equal(h.requests.length,1);}finally{await h.close();}
});

test('diagnostics keep useful IDs and omit prompts, credentials and signed URLs',async()=>{
  const h=await harness({body:'[]'});
  try{
    await assert.rejects(h.generate());
    const report=h.saved.bb_flow_diagnostics[0];
    assert.equal(report.expected[0].fileName,'face-front.jpg');assert.equal(report.expected[0].assetId,'asset-subject-front');
    const serialized=JSON.stringify({reports:h.saved,logs:h.logs});
    for(const secret of [privatePrompt,privateToken,'private-session-token','private-session-id','private-output-url'])assert.ok(!serialized.includes(secret),secret);
    const event=h.context.diagnostics.record('redaction','test',{prompt:privatePrompt,challengeToken:privateToken,fifeUrl:'https://example.com/secret',reason:'token=do-not-keep https://example.com/signed?secret=123'});
    assert.deepEqual(Object.keys(event.detail),['reason']);assert.ok(!JSON.stringify(event).includes('do-not-keep'));
    await Promise.all(Array.from({length:25},(_,i)=>h.context.diagnostics.save({traceId:'retained-'+i,events:[]})));
    assert.equal(h.saved.bb_flow_diagnostics.length,20);assert.equal(h.saved.bb_flow_diagnostics[0].traceId,'retained-5');assert.equal(h.saved.bb_flow_diagnostics.at(-1).traceId,'retained-24');
  }finally{await h.close();}
});

test('active extension routes generation through the backend and does not load the native composer',()=>{
  const manifest=require('./manifest.json'),background=fs.readFileSync(require.resolve('./background.js'),'utf8');
  assert.ok(!manifest.content_scripts.some(entry=>entry.js.includes('content_flow_native.js')));
  assert.ok(!background.includes('FlowNative.generate'));assert.ok(!background.includes('"flow-native.js"'));
  assert.ok(background.includes('FlowBackend.generate'));
  assert.ok(!/querySelector|\.click\(|\.focus\(|KeyboardEvent|DataTransfer|input\[type/.test(pageSource));
});
