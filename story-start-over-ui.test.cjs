const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('Start over submits the currently edited chapter, references and queue, and rejects empty input or an old worker',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:420,height:950}}),errors=[],alerts=[],confirmations=[];let accept=true;
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',async d=>{if(d.type()==='confirm'){confirmations.push(d.message());await (accept?d.accept():d.dismiss());}else{alerts.push(d.message());await d.dismiss();}});
  await page.route('https://fixture.test/**',async route=>{
   const file=path.resolve(__dirname,'.'+new URL(route.request().url()).pathname);
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   await route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{
   const image={id:'new-image',name:'new-image.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII='};
   window.saved={bb_creation_mode:'story',bb_story_brief:'Original input',bb_story_characters:[{id:'mira',name:'Mira',subjects:[image],outfits:[image]}],bb_figure_reference:image,bb_story_figure_character_id:'mira',bb_pose_references:{story:image}};
   window.messages=[];window.listeners=[];window.freshSupported=true;
   window.view={id:'old-session',status:'paused',busy:false,chapters:[{id:'old',title:'OLD SAVED CHAPTER',done:2,total:10,status:'paused'}]};
   window.chrome={runtime:{getManifest:()=>({version:'4.6.31'}),getURL:p=>location.origin+'/'+p,connect:()=>({onDisconnect:{addListener(){}},postMessage(){}}),onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
    messages.push(m);if(m.type==='CHECK_FLOW')return {ok:true,connected:true,account:'Fixture'};
    if(m.type==='GET_STATE')return {running:false,queue:[],logs:[],supportsFigureReference:true,supportsFreshStoryStart:freshSupported};
    if(m.type==='bb_story_state')return {ok:true,session:view};
    if(m.type==='bb_story_start_over')return {ok:true,session:{id:'new-session',busy:true,status:'running',chapters:[{title:'Fresh chapter',done:0,total:0,status:'running'}]}};
    return {ok:true};
   }},storage:{local:{get:async keys=>keys==null?structuredClone(saved):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,saved[k]])),set:async patch=>Object.assign(saved,structuredClone(patch)),remove:async key=>delete saved[key]}}};
  });
  await page.goto('https://fixture.test/popup.html');await page.locator('#startOverStory').waitFor({state:'visible'});
  await page.locator('#storyBrief').fill('');await page.locator('#startOverStory').click();assert.match(alerts.pop(),/Paste the new chapter/);
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='bb_story_start_over').length),0);
  await page.locator('#storyBrief').fill('NEW CHAPTER: Mira discovers a map at the station.');
  await page.locator('#storyBgStyle').selectOption('photorealistic');await page.locator('#storyTextOverlays').uncheck();
  await page.locator('#addQueuedChapter').click();await page.locator('#storyQueueDrafts textarea').fill('NEW NEXT CHAPTER: Mira follows the map.');
  await page.evaluate(()=>window.freshSupported=false);await page.locator('#startOverStory').click();assert.match(alerts.pop(),/Reload Guc guy/);
  await page.evaluate(()=>window.freshSupported=true);accept=false;await page.locator('#startOverStory').click();
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='bb_story_start_over').length),0);
  assert.equal(await page.locator('#storyQueueDrafts textarea').count(),1,'cancel keeps new queued text');
  accept=true;await page.locator('#startOverStory').click();
  await page.waitForFunction(()=>messages.some(m=>m.type==='bb_story_start_over'));
  const {params}=await page.evaluate(()=>messages.find(m=>m.type==='bb_story_start_over'));
  assert.equal(params.shortPrompt,'NEW CHAPTER: Mira discovers a map at the station.');
  assert.deepEqual(params.storyChapters.map(c=>c.source),['NEW NEXT CHAPTER: Mira follows the map.']);
  assert.equal(params.storyCharacters[0].name,'Mira');assert.equal(params.storyBgStyle,'photorealistic');assert.equal(params.storyTextOverlays,false);
  assert.equal(params.poseReference.name,'new-image.png');assert.equal(params.figureReference.name,'new-image.png');assert.equal(params.storyFigureCharacterId,'mira');
  assert.ok(confirmations.at(-1).includes(params.shortPrompt));assert.doesNotMatch(JSON.stringify(params),/OLD SAVED CHAPTER|old-session/);
  await page.waitForFunction(()=>storyQueueDraft.length===0);assert.equal(await page.locator('#startOverStory').isDisabled(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
 }finally{await browser.close();}
});
