const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
let png;
const file=name=>({name,mimeType:'image/png',buffer:png});
test('all four pose sections upload, persist, round-trip presets, submit and remove without overflow',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:420,height:950}}),errors=[],alerts=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',async dialog=>{alerts.push(dialog.message());await dialog.dismiss();});
  await page.route('https://fixture.test/**',async route=>{
   const file=path.resolve(__dirname,'.'+new URL(route.request().url()).pathname);
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf'};
   await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{
   const image={id:'identity',name:'identity.png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII='};
   const initial={bb_creation_mode:'classic',bb_subject_references:[image],bb_outfit_reference:image,bb_short_prompt:'Sitting by the window',bb_sf_subjects:[image],bb_sf_outfits:[image],bb_sf_system_prompt:'Use the room.',bb_sf_target_prompt:'Sitting by the window',bb_story_brief:'Sunny sits by a window.',bb_story_characters:[{id:'sunny',name:'Sunny',subjects:[image],outfits:[image]}]};
   window.saved=JSON.parse(sessionStorage.getItem('settings')||'null')||initial;window.messages=[];window.listeners=[];
   window.chrome={runtime:{getManifest:()=>({version:'4.6.25'}),getURL:p=>location.origin+'/'+p,connect:()=>({onDisconnect:{addListener(){}},postMessage(){}}),onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
    messages.push(m);if(m.type==='CHECK_FLOW')return {ok:true,connected:true,account:'Fixture'};
    if(m.type==='GET_STATE')return {running:false,queue:[],logs:[]};return {ok:true};
   }},storage:{local:{get:async keys=>keys==null?structuredClone(saved):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,saved[k]])),set:async patch=>{Object.assign(saved,structuredClone(patch));sessionStorage.setItem('settings',JSON.stringify(saved));},remove:async key=>{delete saved[key];sessionStorage.setItem('settings',JSON.stringify(saved));}}}};
  });
  await page.goto('https://fixture.test/popup.html');await page.waitForFunction(()=>!document.querySelector('#generate').disabled);
  png=await page.locator('.brand-logo').screenshot();
  const modes=[['classic','Classic','classic'],['subject-flow','SubjectFlow','sf'],['story','Story','story'],['qid','Qid','qid']];
  for(const [mode,button,id] of modes){
   await page.locator('#mode'+button).click();assert.equal(await page.locator(`[data-pose-mode="${mode}"]`).isVisible(),true);
   assert.equal(await page.locator('#generate').isVisible(),mode!=='qid','Qid must hide image generation controls');
   assert.equal(await page.locator('.pose-reference-card:visible').count(),1);
   assert.ok((await page.locator('#'+id+'PoseSection').boundingBox()).height<=40,'empty optional section stays compact');
   await page.locator('#'+id+'PoseSection').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'tmp',`pose-${id}-collapsed-420.png`)});
   await page.locator('#'+id+'PoseSection > summary').click();
   await page.locator('#'+id+'PoseFile').setInputFiles(file(mode+'.png'));
   await page.waitForFunction(({mode})=>saved.bb_pose_references?.[mode]?.name===mode+'.png',{mode});
   assert.equal(await page.locator('#'+id+'PosePreview').isVisible(),true);
   assert.ok((await page.locator('#'+id+'PoseSection').boundingBox()).height<185,'uploaded image does not expand the workflow layout');
   await page.locator('#'+id+'PoseDropZone').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'tmp',`pose-${id}-420.png`)});
   if(mode!=='qid'){
    if(mode==='classic'||mode==='subject-flow'){
     if(mode==='classic')await page.locator('.physical-details > summary').click();
     await page.locator(mode==='classic'?'#physicalDetails':'#sfFigureDetails').fill(mode==='classic'?'Thick build, full arms and thighs; soft abdomen.':'Full build, broad waist, hips 52 inches.');
     await page.locator('#tuneWeight').fill('90 kg');await page.locator('#tuneBust').fill('48 inches');
    }
    await page.locator('#generate').click();
    const submitted=await page.evaluate(()=>messages.filter(m=>m.type==='bb_generate').at(-1));
    assert.equal(submitted.workflowMode,mode);assert.equal(submitted.poseReference.name,mode+'.png');
    if(mode==='classic'||mode==='subject-flow'){
     assert.equal(submitted.physicalDetails,mode==='classic'?'Thick build, full arms and thighs; soft abdomen.':'Full build, broad waist, hips 52 inches.');
     assert.equal(submitted.tuneWeight,'90 kg');assert.equal(submitted.tuneBust,'48 inches');
    }
    await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
   }
  }
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#qidGenerate').disabled);
  assert.equal(await page.locator('#physicalDetails').inputValue(),'Thick build, full arms and thighs; soft abdomen.');
  assert.equal(await page.locator('#sfFigureDetails').inputValue(),'Full build, broad waist, hips 52 inches.');
  assert.equal(await page.locator('#tuneWeight').inputValue(),'90 kg');assert.equal(await page.locator('#tuneBust').inputValue(),'48 inches');
  for(const [mode,button,id] of modes){await page.locator('#mode'+button).click();assert.equal(await page.locator('#'+id+'PoseStatus').innerText(),'Added');await page.locator('#'+id+'PoseSection > summary').click();assert.equal(await page.locator('#'+id+'PoseName').innerText(),mode+'.png');}
  await page.locator('#qidPrompt').fill('Hold this pose and breathe gently.');
  await page.locator('#qidSubject').setInputFiles(file('subject.png'));await page.locator('#qidOutfit').setInputFiles(file('outfit.png'));
  await page.locator('#qidBuildPrompt').click();const prompt=await page.locator('#qidOutputPrompt').inputValue();
  assert.match(prompt,/^RECONSTRUCT REFERENCE IMAGE 1/);assert.match(prompt,/Keep the camera angle and framing locked/);assert.doesNotMatch(prompt,/gentle half-turn|ignore distant framing|naturally obscured/);
  await page.locator('#qidGenerate').click();await page.waitForFunction(()=>messages.some(m=>m.type==='bb_qid_generate'));const video=await page.evaluate(()=>messages.find(m=>m.type==='bb_qid_generate'));
  assert.equal(video.references.length,3);assert.equal(video.references[0].role,'pose / camera');assert.equal(video.references[0].name,'qid.png');
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  await page.locator('#qidStartFrame').setInputFiles(file('start.png'));await page.locator('#qidGenerate').click();
  assert.match(alerts.pop(),/Qid allows 3 reference images/);assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='bb_qid_generate').length),1);
  await page.locator('#modeSubjectFlow').click();await page.locator('#sfPresetName').fill('Pose setup');await page.locator('#saveSfPreset').click();
  await page.waitForFunction(()=>saved.bb_sf_prompt_presets?.length===1);
  const preset=await page.evaluate(()=>saved.bb_sf_prompt_presets[0]);assert.equal(Object.values(preset.fullSettings.poseReferences).filter(Boolean).length,4);
  await page.locator('#sfPoseRemove').click();await page.waitForFunction(()=>saved.bb_pose_references['subject-flow']===null);
  await page.locator('#loadSfPreset').click();assert.equal(await page.locator('#sfPosePreview').isVisible(),true);
  // Import/export format carries the per-mode records too.
  await page.locator('#sfPresetFile').setInputFiles({name:'pose-preset.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'flipo-subject-flow-preset',version:1,preset:{...preset,id:'imported',name:'Imported pose'}}))});
  await page.waitForFunction(()=>saved.bb_sf_prompt_presets.length===2);assert.match(alerts.pop(),/Preset uploaded/);
  const imported=await page.evaluate(()=>saved.bb_sf_prompt_presets.find(p=>p.name==='Imported pose'));assert.equal(imported.fullSettings.poseReferences.qid.name,'qid.png');
  for(const [mode,button,id] of modes){
   await page.locator('#mode'+button).click();await page.setViewportSize({width:340,height:950});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),mode+' should fit narrow sidebar');
   await page.locator('#'+id+'PoseDropZone').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,'tmp',`pose-${id}-340.png`)});
   await page.locator('#'+id+'PoseRemove').click();assert.equal(await page.locator('#'+id+'PosePreview').isVisible(),false);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
 } finally {await browser.close();}
});
