// Real Chrome extension API boundary; Google responses and tokens are fixtures.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

test('actual Chrome APIs generate in parallel and recover one closed project tab for five workers',async()=>{
  const scratch=path.resolve(__dirname,'tmp');fs.mkdirSync(scratch,{recursive:true});
  const fixture=fs.mkdtempSync(path.join(scratch,'flow-api-smoke-'));
  const extension=path.join(fixture,'extension');fs.mkdirSync(extension);
  for(const name of ['flow-backend.js','content_flow_backend.js','flow-rpc.js','flow-diagnostics.js','flow-request-guard.js','flow-retry.js','flow-compat.js','flow-tab-recovery.js'])fs.copyFileSync(path.join(__dirname,name),path.join(extension,name));
  const version=require('./manifest.json').version;
  fs.writeFileSync(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Flow API local verification',version,permissions:['scripting','tabs','storage'],host_permissions:['https://flow.google.com/*']}));
  fs.writeFileSync(path.join(extension,'runner.html'),'<!doctype html><html><body><script src="setup.js"></script><script src="flow-rpc.js"></script><script src="flow-request-guard.js"></script><script src="flow-retry.js"></script><script src="flow-diagnostics.js"></script><script src="flow-backend.js"></script><script src="flow-compat.js"></script><script src="flow-tab-recovery.js"></script></body></html>');
  fs.writeFileSync(path.join(extension,'setup.js'),`
    const STATE={stopRequested:false};
    const FLOW_RECAPTCHA_SITE_KEY='fixture-site-key';
    const events=[];
    function log(line){events.push(line);}
    function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
    const interruptibleWait=sleep;
    const waitForGenerationOperation=p=>p;
    async function mintFlowRecaptchaToken(){await FlowRequestGuard.admit('IMAGE_GENERATION');return 'fixture-token';}
  `);
  let context;
  try{
    context=await chromium.launchPersistentContext(path.join(fixture,'profile'),{
      executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,
      ignoreDefaultArgs:['--disable-extensions'],
      args:['--enable-unsafe-extension-debugging']
    });
    // Load into an isolated test profile through Chrome's extension debugging API.
    const session=await context.browser().newBrowserCDPSession();
    const {id:extensionId}=await session.send('Extensions.loadUnpacked',{path:extension});
    await session.detach();
    const requests=[],pending=[];
    await context.route('https://**/*',async route=>{
      const request=route.request();
      if(request.url().includes('/data/batchexecute')){
        const envelope=JSON.parse(new URLSearchParams(request.postData()).get('f.req'));
        const payload=JSON.parse(envelope[0][0][1]);
        const prompt=payload[1][0][8][0][0][0];requests.push({prompt,payload});
        await new Promise(resolve=>{pending.push(resolve);if(pending.length===5)for(const index of [4,2,0,3,1])pending[index]();});
        const media=['confirmed-'+prompt];media[6]=[[...Array(13).fill(null),'https://flow-content.google/image/fixture?signature=omitted']];
        await route.fulfill({status:200,contentType:'text/plain',body:JSON.stringify([['wrb.fr','ogiZ0b',JSON.stringify([[media]])]])});
      }else await route.fulfill({status:200,contentType:'text/html',body:`<!doctype html><html><body>Local backend fixture; no composer.<script>window.WIZ_global_data={SNlM0e:'fixture-at',cfb2h:'fixture-build',FdrFJe:'fixture-session'};</script></body></html>`});
    });
    const page=await context.newPage();await page.goto('https://flow.google.com/u/0/project/local-api-fixture');
    const runner=await context.newPage();
    await runner.goto(`chrome-extension://${extensionId}/runner.html`);
    await runner.waitForFunction(()=>typeof FlowBackend!=='undefined');
    const result=await runner.evaluate(async()=>{
      const [tab]=await chrome.tabs.query({url:'https://flow.google.com/u/0/project/local-api-fixture'});
      let oldError='';
      try{await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:()=>true,args:['version',undefined]});}catch(error){oldError=error.message;}
      if(!oldError.includes('Value is unserializable'))throw Error('Chrome did not reproduce the reported argument failure: '+oldError);
      const flow={tabId:tab.id,projectId:'local-api-fixture',referenceFiles:{subject:'subject.jpg',outfit:'outfit.jpg'}};
      const output=await Promise.all(['one','two','three','four','five'].map((prompt,i)=>FlowBackend.generate(flow,prompt,[{name:'subject'},{name:'outfit'}],'BELUGA','9:16',{imageIndex:i+1,attempt:1})));
      const reports=(await chrome.storage.local.get('bb_flow_diagnostics')).bb_flow_diagnostics;
      return {oldError,output,reports,events,version:chrome.runtime.getManifest().version};
    });
    assert.equal(result.version,version);
    assert.deepEqual(result.output.map(image=>image.mediaId),['confirmed-one','confirmed-two','confirmed-three','confirmed-four','confirmed-five']);
    assert.equal(requests.length,5);assert.equal(result.reports.length,5);
    assert.ok(result.reports.every(report=>report.code==='FLOW_GENERATION_CONFIRMED'&&report.submitted));
    assert.equal(result.events.filter(line=>line.includes('generation_confirmed')).length,5);
    assert.equal(result.events.filter(line=>line.includes('backend_failed')).length,0);
    for(const request of requests)assert.deepEqual(request.payload[1][0][2].map(ref=>ref[0]),['subject','outfit']);
    pending.length=0;
    // Attach Playwright's fixture routing before the extension-created tab's
    // first navigation. Chrome otherwise can navigate before CDP sees the tab.
    const replacementPage=context.waitForEvent('page');
    await runner.exposeFunction('prepareReplacementFixture',async url=>{
      const replacement=await replacementPage;
      await replacement.goto(url);
    });
    const recovered=await runner.evaluate(async()=>{
      const createTab=chrome.tabs.create.bind(chrome.tabs);
      chrome.tabs.create=async options=>{
        const tab=await createTab({...options,url:'about:blank'});
        await window.prepareReplacementFixture(options.url);
        return chrome.tabs.get(tab.id);
      };
      const [old]=await chrome.tabs.query({url:'https://flow.google.com/u/0/project/local-api-fixture'});
      await chrome.tabs.remove(old.id);
      const flow={tabId:old.id,authTabId:old.id,accountIndex:'0',projectId:'local-api-fixture',referenceFiles:{subject:'subject.jpg',outfit:'outfit.jpg'}};
      const output=await Promise.all(['six','seven','eight','nine','ten'].map((prompt,i)=>FlowTabRecovery.run(flow,()=>FlowBackend.generate(flow,prompt,[{name:'subject'},{name:'outfit'}],'BELUGA','9:16',{imageIndex:i+1,attempt:116}))));
      const tabs=await chrome.tabs.query({url:'https://flow.google.com/u/0/project/local-api-fixture'});
      return {output,oldId:old.id,newId:flow.tabId,authId:flow.authTabId,editorId:STATE.editorTabId,tabs,events};
    });
    assert.deepEqual(recovered.output.map(image=>image.mediaId),['confirmed-six','confirmed-seven','confirmed-eight','confirmed-nine','confirmed-ten']);
    assert.equal(requests.length,10);assert.equal(recovered.tabs.length,1);
    assert.notEqual(recovered.oldId,recovered.newId);assert.equal(recovered.authId,recovered.newId);assert.equal(recovered.editorId,recovered.newId);
    assert.equal(recovered.tabs[0].autoDiscardable,false);
    assert.equal(recovered.events.filter(line=>line==='Flow project tab recovered. Confirmed reference IDs and images retained.').length,1);
    assert.ok(recovered.events.some(line=>line.includes('No tab with id:')));
    console.log('Real Chrome tab removal: five workers shared one replacement in the same account/project; exactly five new requests were submitted. Google responses were intercepted fixtures.');
    console.log('Real Chrome MV3: five actual extension requests overlapped before any response returned, preserving all five results. Google responses were intercepted fixtures.');
  }finally{
    await context?.close();
    // Only remove this test-created directory, after resolving and checking it.
    const resolved=fs.realpathSync(fixture),allowed=fs.realpathSync(scratch)+path.sep;
    assert.ok(resolved.startsWith(allowed)&&path.basename(resolved).startsWith('flow-api-smoke-'));
    fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:200});
  }
});
