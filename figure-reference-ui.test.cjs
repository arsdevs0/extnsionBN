const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('one shared figure card persists across all modes, presets, Story resume and Qid numbering',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:420,height:950}}),errors=[],alerts=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss();});
  await page.route('https://fixture.test/**',async route=>{
   const target=path.resolve(__dirname,'.'+new URL(route.request().url()).pathname);
   if(!target.startsWith(__dirname+path.sep)||!fs.existsSync(target))return route.fulfill({status:404,body:''});
   await route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(target)]||'application/octet-stream',body:fs.readFileSync(target)});
  });
  await page.addInitScript(()=>{
   const image={id:'identity',name:'identity.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII='};
   const initial={bb_creation_mode:'classic',bb_subject_references:[image],bb_outfit_reference:image,bb_short_prompt:'Sitting by the window',bb_sf_subjects:[image],bb_sf_outfits:[image],bb_sf_system_prompt:'Use the room.',bb_sf_target_prompt:'Sitting by the window',bb_story_brief:'Sunny sits by a window.',bb_story_characters:[{id:'sunny',name:'Sunny',subjects:[image],outfits:[image]},{id:'mira',name:'Mira',subjects:[image],outfits:[image]}]};
   window.saved=JSON.parse(sessionStorage.getItem('settings')||'null')||initial;window.messages=[];window.listeners=[];window.figureSupported=true;
   window.chrome={runtime:{getManifest:()=>({version:'4.6.29'}),getURL:p=>location.origin+'/'+p,connect:()=>({onDisconnect:{addListener(){}},postMessage(){}}),onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
    messages.push(m);if(m.type==='CHECK_FLOW')return {ok:true,connected:true,account:'Fixture'};
    if(m.type==='GET_STATE')return {running:false,queue:[],logs:[],supportsFigureReference:figureSupported,supportedWorkflows:['direct-image']};return {ok:true};
   }},storage:{local:{get:async keys=>keys==null?structuredClone(saved):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,saved[k]])),set:async patch=>{Object.assign(saved,structuredClone(patch));sessionStorage.setItem('settings',JSON.stringify(saved));},remove:async key=>{delete saved[key];sessionStorage.setItem('settings',JSON.stringify(saved));}}}};
  });
  await page.goto('https://fixture.test/popup.html');await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
  const png=await page.locator('.brand-logo').screenshot(),file=name=>({name,mimeType:'image/png',buffer:png});
  assert.equal(await page.locator('#classicReferences .reference-row + #figureReferenceSection').count(),1);
  await page.locator('#figureReferenceFile').setInputFiles(file('figure.png'));await page.waitForFunction(()=>saved.bb_figure_reference?.name==='figure.png');
  const modes=[['classic','Classic'],['subject-flow','SubjectFlow'],['story','Story'],['direct-image','DirectImage'],['qid','Qid']];
  for(const [mode,button] of modes){
   await page.locator('#mode'+button).click();assert.equal(await page.locator('#figureReferenceSection:visible').count(),1,mode);
   assert.equal(await page.locator('#figureReferencePreview').isVisible(),true);
   if(mode==='subject-flow')assert.equal(await page.locator('#sfKnowledgeDropZone').evaluate(el=>el.closest('article').nextElementSibling.id),'figureReferenceSection');
   if(mode==='story'){
    assert.equal(await page.locator('#storyFigureReferenceSlot > #figureReferenceSection').count(),1);
    assert.equal(await page.locator('#storyFigureReferenceSlot').evaluate(el=>el.nextElementSibling.id),'storyCharacters');
    await page.locator('#figureReferenceFile').setInputFiles(file('story-figure.png'));await page.waitForFunction(()=>saved.bb_figure_reference?.name==='story-figure.png');
    await page.locator('#figureReferenceFile').setInputFiles(file('figure.png'));await page.waitForFunction(()=>saved.bb_figure_reference?.name==='figure.png');
    await page.locator('#storyFigureTarget').selectOption('mira');await page.waitForFunction(()=>saved.bb_story_figure_character_id==='mira');
    await page.locator('#storyCharacters details').nth(1).locator('summary > strong').click();
    await page.locator('#storyCharacters input[placeholder="e.g. 180 cm / 5 ft 11 in · optional"]').nth(1).fill('165 cm');
   }
   if(mode==='direct-image')await page.locator('#directImagePrompt').fill('A person sitting by the window');
   if(mode!=='qid'){
    await page.locator('#generate').click();await page.waitForFunction(()=>messages.some(m=>['bb_generate','bb_direct_image_generate'].includes(m.type)));
    const sent=await page.evaluate(()=>messages.filter(m=>['bb_generate','bb_direct_image_generate'].includes(m.type)).at(-1));
    assert.equal(sent.figureReference.name,'figure.png');assert.equal(sent.workflowMode,mode);
    if(mode==='story')assert.equal(sent.storyFigureCharacterId,'mira');
    await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
   }
   await page.setViewportSize({width:340,height:950});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),mode+' overflow');
   await page.locator('#figureReferenceSection').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'tmp',`figure-${mode}-340.png`)});
   await page.setViewportSize({width:420,height:950});
  }
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#qidGenerate').disabled);
  assert.equal(await page.locator('#figureReferenceName').innerText(),'figure.png');
  await page.locator('#modeStory').click();assert.equal(await page.locator('#storyFigureTarget').inputValue(),'mira');
  await page.evaluate(()=>storyAction('bb_story_resume'));
  const resume=await page.evaluate(()=>messages.find(m=>m.type==='bb_story_resume'));assert.equal(resume.figureReference.name,'figure.png');assert.equal(resume.storyFigureCharacterId,'mira');
  assert.equal(resume.storyCharacterHeights.find(c=>c.id==='mira').height,'165 cm');
  await page.locator('#modeQid').click();await page.locator('#qidSubject').setInputFiles(file('face.png'));await page.locator('#qidOutfit').setInputFiles(file('outfit.png'));await page.locator('#qidPrompt').fill('Breathe gently.');
  await page.locator('#qidGenerate').click();await page.waitForFunction(()=>messages.some(m=>m.type==='bb_qid_generate'));
  let video=await page.evaluate(()=>messages.filter(m=>m.type==='bb_qid_generate').at(-1));assert.equal(video.references.length,3);assert.equal(video.references[2].name,'figure.png');assert.match(video.prompt,/REFERENCE IMAGE 3 \(@figure\)/);
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  await page.locator('#qidPoseSection > summary').click();await page.locator('#qidPoseFile').setInputFiles(file('pose.png'));await page.locator('#qidGenerate').click();assert.match(alerts.pop(),/Qid allows 3 reference images/);
  await page.locator('#qidOutfit').setInputFiles([]);await page.locator('#qidGenerate').click();
  await page.waitForFunction(()=>messages.filter(m=>m.type==='bb_qid_generate').length===2);
  video=await page.evaluate(()=>messages.filter(m=>m.type==='bb_qid_generate').at(-1));assert.equal(video.references[0].name,'pose.png');assert.equal(video.references[2].name,'figure.png');assert.match(video.prompt,/REFERENCE IMAGE 3 \(@figure\)/);assert.doesNotMatch(video.prompt,/56-inch|exact opening silhouette/);
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  await page.locator('#qidPoseRemove').click();
  await page.locator('#modeSubjectFlow').click();await page.locator('#sfPresetName').fill('Figure setup');await page.locator('#saveSfPreset').click();await page.waitForFunction(()=>saved.bb_sf_prompt_presets?.length===1);
  const preset=await page.evaluate(()=>saved.bb_sf_prompt_presets[0]);assert.equal(preset.fullSettings.figureReference.name,'figure.png');assert.equal(preset.fullSettings.storyFigureCharacterId,'mira');
  await page.locator('#figureReferenceRemove').click();await page.waitForFunction(()=>!saved.bb_figure_reference);await page.locator('#loadSfPreset').click();await page.waitForFunction(()=>saved.bb_figure_reference?.name==='figure.png');
  await page.locator('#sfPresetFile').setInputFiles({name:'figure.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'guc-guy-subject-flow-preset',preset:{...preset,name:'Imported'}}))});
  await page.waitForFunction(()=>saved.bb_sf_prompt_presets.length===2);assert.match(alerts.pop(),/Preset uploaded/);
  const imported=await page.evaluate(()=>saved.bb_sf_prompt_presets.find(p=>p.name==='Imported'));assert.equal(imported.fullSettings.figureReference.name,'figure.png');
  await page.evaluate(()=>window.figureSupported=false);const before=await page.evaluate(()=>messages.filter(m=>m.type==='bb_generate').length);
  await page.locator('#generate').click();assert.match(alerts.pop(),/Reload Guc guy/);assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='bb_generate').length),before);
  await page.locator('#figureReferenceRemove').click();await page.waitForFunction(()=>!saved.bb_figure_reference);await page.reload();await page.waitForFunction(()=>!document.querySelector('#generate').disabled);assert.equal(await page.locator('#figureReferencePreview').isVisible(),false);
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
 }finally{await browser.close();}
});
