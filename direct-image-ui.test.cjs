const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('Direct Image tab: both modes, styles, upload, persistence, errors, and old sections remain usable',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:420,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fixture.test/**',async route=>{
   const file=path.resolve(__dirname,'.'+new URL(route.request().url()).pathname);
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
   await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{
   window.messages=[];window.listeners=[];
   const read=()=>JSON.parse(localStorage.getItem('fixture-storage')||'{"bb_creation_mode":"classic","bb_short_prompt":"existing classic prompt","bb_prompt_engine":"gemini","bb_physical_details":"existing body notes"}');
   window.chrome={runtime:{getManifest:()=>({version:'4.6.27'}),getURL:p=>location.origin+'/'+p,
    connect:()=>({onDisconnect:{addListener(){}},postMessage(){}}),onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
     messages.push(m);
     if(m.type==='CHECK_FLOW')return {ok:true,connected:true,account:'Local test account'};
     if(m.type==='GET_STATE')return {running:false,queue:[],logs:[],supportedWorkflows:window.oldWorker?undefined:['direct-image']};
     if(m.type==='bb_direct_image_generate'&&window.failNext){window.failNext=false;return {ok:false,error:'Fixture connection failed'};}
     return {ok:true};
    }},storage:{local:{get:async keys=>{const values=read();if(typeof keys==='string')return {[keys]:values[keys]};return values;},
     set:async patch=>localStorage.setItem('fixture-storage',JSON.stringify({...read(),...patch})),
     remove:async key=>{const values=read();delete values[key];localStorage.setItem('fixture-storage',JSON.stringify(values));}}}};
  });
  await page.goto('https://fixture.test/popup.html');await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
  assert.equal(await page.locator('#classicReferences').isVisible(),true);
  await page.locator('#modeDirectImage').click();
  assert.equal(await page.locator('#directImageStudio').isVisible(),true);
  for(const id of ['classicReferences','classicPrompts','subjectFlowReferences','storyStudio','qidStudio','bodyTuningSection'])assert.equal(await page.locator('#'+id).isVisible(),false,id);
  assert.equal(await page.locator('#directImageStyle option').count(),9);
  assert.equal(await page.locator('#directImageUpload').isVisible(),false);
  await page.locator('#generate').click();assert.match(await page.locator('#directImageStatus').innerText(),/prompt first/);
  const prompt='A red car with a hand-painted blue roof';
  await page.locator('#directImagePrompt').fill(prompt);await page.locator('#directImageStyle').selectOption('instagram');
  await page.locator('#generate').click();
  let request=await page.evaluate(()=>messages.filter(m=>m.type==='bb_direct_image_generate').at(-1));
  assert.equal(request.workflowMode,'direct-image');assert.equal(request.shortPrompt,prompt);assert.equal(request.directStyle,'instagram');assert.equal(request.directSource,null);
  for(const key of ['subjects','outfits','physicalDetails','poseReference','systemInstruction'])assert.equal(request[key],undefined);
  assert.equal(await page.locator('#generate').isDisabled(),true);
  await page.locator('#stop').click();assert.equal(await page.locator('#stop').isDisabled(),true);
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  await page.locator('#directImageMode').selectOption('image-to-image');await page.locator('#generate').click();
  assert.match(await page.locator('#directImageStatus').innerText(),/source image/);
  await page.locator('#directImageFile').setInputFiles({name:'source.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=','base64')});
  await page.waitForFunction(()=>document.querySelector('#directImageFileName').textContent==='source.png');
  await page.locator('#directImageStyle').selectOption('candid');await page.locator('#generate').click();
  request=await page.evaluate(()=>messages.filter(m=>m.type==='bb_direct_image_generate').at(-1));
  assert.equal(request.directMode,'image-to-image');assert.equal(request.directSource.name,'source.png');assert.equal(request.directStyle,'candid');
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
  assert.equal(await page.locator('#directImageStudio').isVisible(),true);assert.equal(await page.locator('#directImagePrompt').inputValue(),prompt);
  assert.equal(await page.locator('#directImageStyle').inputValue(),'candid');assert.equal(await page.locator('#directImageMode').inputValue(),'image-to-image');
  assert.equal(await page.locator('#directImageFileName').innerText(),'source.png');
  await page.locator('#modeClassic').click();assert.equal(await page.locator('#shortPrompt').inputValue(),'existing classic prompt');
  assert.equal(await page.locator('#physicalDetails').inputValue(),'existing body notes');assert.equal(await page.locator('#engineGemini').getAttribute('class'),'engine-option active');
  for(const [button,panel] of [['modeSubjectFlow','subjectFlowReferences'],['modeStory','storyStudio'],['modeQid','qidStudio']]){
   await page.locator('#'+button).click();assert.equal(await page.locator('#'+panel).isVisible(),true);assert.equal(await page.locator('#directImageStudio').isVisible(),false);
  }
  await page.locator('#modeDirectImage').click();await page.locator('#directImageMode').selectOption('text-to-image');
  const submittedBefore=await page.evaluate(()=>messages.filter(m=>m.type==='bb_direct_image_generate').length);
  await page.evaluate(()=>window.oldWorker=true);await page.locator('#generate').click();
  assert.match(await page.locator('#directImageStatus').innerText(),/updated background worker.*reload Guc guy/i);
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='bb_direct_image_generate').length),submittedBefore);
  assert.equal(await page.locator('#generate').isEnabled(),true);
  assert.equal(await page.locator('#directImagePrompt').inputValue(),prompt);
  await page.evaluate(()=>window.oldWorker=false);
  await page.evaluate(()=>window.failNext=true);await page.locator('#generate').click();assert.match(await page.locator('#directImageStatus').innerText(),/Fixture connection failed/);
  assert.equal(await page.locator('#generate').isEnabled(),true);
  await page.locator('#generate').click();request=await page.evaluate(()=>messages.filter(m=>m.type==='bb_direct_image_generate').at(-1));assert.equal(request.directSource,null);
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  fs.mkdirSync(path.join(__dirname,'tmp/direct-image-qa'),{recursive:true});
  for(const width of [420,340]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(__dirname,`tmp/direct-image-qa/text-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:420,height:1000});await page.locator('#directImageMode').selectOption('image-to-image');
  await page.locator('#directImageFile').setInputFiles(path.join(__dirname,'assets/webtoon-style-atmosphere.jpg'));
  await page.waitForFunction(()=>document.querySelector('#directImageFileName').textContent==='webtoon-style-atmosphere.jpg');
  await page.locator('#directImageStyle').selectOption('webtoon');await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(__dirname,'tmp/direct-image-qa/image-420.png'),fullPage:true});
  await page.locator('#directImageRemove').click();assert.equal(await page.locator('#directImagePreview').isVisible(),false);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#generate').disabled);assert.equal(await page.locator('#directImagePreview').isVisible(),false);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
});
