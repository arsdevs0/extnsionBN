const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const direction=require('./classic-direction.js');
const source=fs.readFileSync('background.js','utf8');
const constants=source.slice(source.indexOf('const FLOW_RECAPTCHA_SITE_KEY'),source.indexOf('if (chrome.sidePanel'));
const runSource=source.slice(source.indexOf('async function runGeneration('),source.indexOf('// ---------------- Google Flow API Boilerplate'));
function harness(engine='direct',overrides={},plannerReplies=[]) {
  const images=[],planner=[],snapshots=[],uploads=[],saved={};
  const context=vm.createContext({
    URL,Date,Map,Set,Blob,Promise,JSON,Math,crypto:require('node:crypto').webcrypto,structuredClone,
    FlowRetry:require('./flow-retry.js'),STATE:{running:false,stopRequested:false},ClassicDirection:direction,
    SubjectFlowDirection:require('./subject-flow-direction.js'),
    FlowRequestGuard:require('./flow-request-guard.js').create(),
    chrome:{runtime:{sendMessage:async()=>{}},storage:{local:{get:async key=>({[key]:structuredClone(saved[key])}),set:async patch=>Object.assign(saved,structuredClone(patch))}}},
    log:()=>{},setStatus:()=>{},setProgress:()=>{},safeCloseTab:()=>{},sleep:async()=>{},interruptibleWait:async()=>{},
    withAutoRetry:async(label,fn)=>fn(),getDirectFlowContext:async()=>({tabId:1,projectId:'fixture'}),
    flowReferenceFileName:record=>record.name,uploadReferenceUntilSuccess:async(flow,data,name,label)=>{uploads.push({data,name,label});return name;},
    askGeminiWithRetry:async request=>{planner.push(request.prompt);return plannerReplies.shift() || JSON.stringify({prompts:Array.from({length:params.imageCount},(_,i)=>'Relaxed portrait, small camera shift '+i)});},
    parseGeminiPlanJson:text=>({source:text,value:JSON.parse(text)}),
    broadcastQueue:queue=>snapshots.push(structuredClone(queue)),
    generateFlowImage:async(flow,prompt,refs)=>{images.push({prompt,refs:structuredClone(refs)});return {mediaId:'image-'+images.length,fifeUrl:'https://example.invalid/image'};},
    fetchMaximumQualityFlowImage:async()=>({blob:new Blob(['photo'])}),blobToDataUrl:async()=> 'data:image/png;base64,AA'
  });
  context.PoseReference=require('./pose-reference.js');
  vm.runInContext(constants+runSource,context);
  const params={workflowMode:'classic',generationEngine:engine,generationMode:'parallel',imageCount:3,shortPrompt:'Relaxed portrait',
    subjects:[{name:'identity',dataUrl:'data:image/png;base64,AA'}],outfits:[{name:'outfit',dataUrl:'data:image/png;base64,AA'}],
    upscaleEnabled:false,...overrides};
  return {images,planner,snapshots,uploads,params,context,run:()=>context.runGeneration(params)};
}
test('continuous retries survive twelve refusals, then save the successful image',async()=>{
 const h=harness('direct',{imageCount:1,generationMode:'sequential'}),generate=h.context.generateFlowImage,delays=[];let calls=0;
 h.context.interruptibleWait=async ms=>delays.push(ms);
 h.context.generateFlowImage=async(...args)=>{if(++calls<=12)throw Object.assign(Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY'),{code:'FLOW_GENERATION_REJECTED'});return generate(...args);};
 await h.run();assert.equal(calls,13);assert.equal(h.images.length,1);assert.equal(h.context.STATE.stopRequested,false);
 assert.deepEqual(delays,[3000,6000,12000,24000,...Array(8).fill(45000)]);
 assert.equal(h.snapshots.at(-1)[0].status,'done');
 await h.run();assert.equal(h.images.length,2);
});
test('Stop during an endless retry ends the run and a new run starts normally',async()=>{
 const h=harness('direct',{imageCount:1,generationMode:'sequential'}),generate=h.context.generateFlowImage;let calls=0;
 h.context.generateFlowImage=async()=>{calls++;throw Object.assign(Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY'),{code:'FLOW_GENERATION_REJECTED'});};
 h.context.interruptibleWait=async()=>{h.context.STATE.stopRequested=true;throw Error('Generation stopped.');};
 await h.run();assert.equal(calls,1);assert.equal(h.context.STATE.running,false);assert.equal(h.snapshots.at(-1)[0].status,'stopped');
 h.context.generateFlowImage=generate;await h.run();assert.equal(h.images.length,1);assert.equal(h.context.STATE.running,false);
});

test('five-shot batches rotate poses and places across saved history even with identical randomness',()=>{
  let previous={};const batches=[];
  for(let i=0;i<4;i++) {
    const shots=direction.shots(5,{target:'Confident Instagram portrait',random:()=>.4,previous});
    assert.equal(new Set(shots.map(s=>s.poseId)).size,5);
    assert.equal(new Set(shots.map(s=>s.poseFamily)).size,5,'Each five-shot batch needs different broad silhouettes, not five standing-pose labels');
    assert.equal(new Set(shots.map(s=>s.cropId)).size,5);
    assert.equal(new Set(shots.map(s=>s.id)).size,5);
    if(i)assert.ok(shots.every(s=>!batches[i-1].some(last=>last.poseId===s.poseId||last.id===s.id)));
    previous=direction.remember(previous,shots);batches.push(shots);
  }
  assert.equal(new Set(batches.flat().map(s=>s.poseId)).size,20);
  for(let i=0;i<20;i++)previous=direction.remember(previous,batches[0]);
  assert.equal(previous.poseIds.length,40);
});

for(const engine of ['direct','gemini'])test(engine+' runs five Classic generations concurrently and saves fresh shot history for the next run and manual retry',async()=>{
  const h=harness(engine,{imageCount:7});let active=0,peak=0;
  const generate=h.context.generateFlowImage;
  h.context.generateFlowImage=async(...args)=>{active++;peak=Math.max(active,peak);await new Promise(r=>setTimeout(r,10));active--;return generate(...args);};
  await h.run();assert.equal(peak,5);assert.equal(h.images.length,7);
  const first=h.snapshots.at(-1).map(s=>s.classicShot);
  assert.equal(new Set(first.map(s=>s.pose)).size,7);
  await h.run();const second=h.snapshots.at(-1).map(s=>s.classicShot);
  assert.ok(second.every(s=>!first.some(old=>old.pose===s.pose)));
  assert.equal(h.images.length,14);
  await h.context.STATE.retryHandler(0);
  const manual=h.snapshots.at(-1)[0].classicShot;
  assert.ok(second.every(s=>s.pose!==manual.pose));
  assert.equal(h.images.length,15);
  for(const {prompt,refs} of h.images){assert.match(prompt,/loose creative cue freely/);assert.match(prompt,/not an exact pose recipe/);assert.match(prompt,/Indian and Pakistani/);assert.match(prompt,/ATTRACTIVE REAL LOCATION/);assert.match(prompt,/UNFILTERED FINISH/);assert.deepEqual(refs.map(r=>r.name),['identity','outfit']);}
});

test('all twenty background moods are distinct, with regional styling and creative freedom',()=>{
  const shots=direction.shots(20,{target:'Confident Instagram portrait',random:()=>.4});
  assert.equal(new Set(shots.map(s=>s.id)).size,20);
  assert.equal(new Set(shots.map(s=>s.poseId)).size,20);
  for(const expected of ['cafe-patio','rooftop','courtyard','waterfront'])assert.ok(shots.some(s=>s.id===expected));
  for(const shot of shots){assert.match(shot.location,/Indian\/Pakistani/);assert.match(shot.location,/not an exact location prescription/);assert.doesNotMatch(shot.location+' '+shot.lighting,/penthouse|golden|sunset|bokeh/i);}
});
test('a named lift, wall or garden keeps its setting instead of rotating venues',()=>{
  for(const target of ['Standing by a plain wall','Mirror selfie in a lift','Walking along a garden wall']) {
    const shots=direction.shots(5,{target});
    assert.ok(shots.every(s=>s.id==='requested'));assert.ok(shots.every(s=>!s.location.includes('Otherwise use')));
  }
  const lift=direction.shots(1,{target:'Lift mirror selfie at night'})[0];
  assert.match(lift.lighting,/fixtures at night/);assert.match(lift.framing,/selfie/);
  assert.match(direction.shots(1,{target:'Full body by the garden wall'})[0].framing,/head-to-toe/);
  assert.doesNotMatch(direction.shots(1,{target:'Standing by a wall'})[0].framing,/head-to-toe/);
});
test('ambiguous named venues use their actual light sources instead of forced outdoor daylight',()=>{
  for(const target of ['Portrait at a restaurant','Photo beside a plain wall','Standing in a hotel','Sitting at a cafe']) {
    const shot=direction.shots(1,{target})[0];
    assert.equal(shot.id,'requested');
    assert.doesNotMatch(shot.lighting,/daytime open shade/);
  }
  assert.match(direction.shots(1,{target:'Photo at a restaurant at night'})[0].lighting,/requested night or evening/);
  assert.match(direction.shots(1,{target:'Garden photo'})[0].lighting,/daytime open shade/);
});

test('home and Hindi indoor targets retain their setting and use room lighting instead of random outdoor moods',()=>{
  for(const target of ['Portrait at home','Portrait in a house','Photo in my apartment','Portrait in a flat','Photo in the kitchen','Ghar ke andar photo','Kamre mein portrait','घर के अंदर फोटो']) {
    const shots=direction.shots(5,{target});
    assert.ok(shots.every(shot=>shot.id==='requested'),target);
    for(const shot of shots) {
      assert.doesNotMatch(shot.location,/Optional mood inspiration/);
      assert.match(shot.lighting,/neutral-white/);
      assert.doesNotMatch(shot.lighting,/daytime open shade/);
    }
  }
  const referenced=direction.shots(1,{target:'Ghar ke andar photo',hasEnvironment:true})[0];
  assert.equal(referenced.id,'reference');
  assert.match(referenced.lighting,/actual light sources/);
  assert.doesNotMatch(referenced.lighting,/neutral-white ceiling/);
  const night=direction.shots(1,{target:'Ghar ke andar raat mein photo'})[0];
  assert.match(night.lighting,/requested night or evening/);
  assert.doesNotMatch(night.lighting,/clear daytime light/);
});

test('night routing retains color guidance for home, outdoor and reference scenes, including Hindi and no-flash requests',()=>{
  for(const target of ['Home portrait at night','Interior photo at night-time without a flash','Street photo after dark, flash off','Ghar ke andar raat mein, flash nahi','घर के अंदर रात में बिना फ्लैश फोटो']) {
    for(const hasEnvironment of [false,true]) {
      const shot=direction.shots(1,{target,hasEnvironment})[0];
      assert.equal(shot.id,hasEnvironment?'reference':'requested');
      assert.match(shot.lighting,/Keep the requested night or evening setting/);
      assert.match(shot.lighting,/CAMERA COLOR:.*neutral camera white balance/);
      assert.doesNotMatch(shot.lighting,/clear daytime light|daytime open shade/);
      if(target!=='Home portrait at night') {
        assert.match(shot.lighting,/NO FLASH: Expose using the available fixtures only/);
        assert.doesNotMatch(shot.lighting,/flash may expose|flash can expose/);
      }
      if(hasEnvironment) {
        assert.match(shot.lighting,/Retain the referenced place and its actual fixtures/);
        assert.doesNotMatch(shot.lighting,/For invented indoor fixtures/);
      } else if(target.startsWith('Street'))assert.doesNotMatch(shot.lighting,/household light/);
      else assert.match(shot.lighting,/neutral-white household light/);
    }
  }
  const indoor=direction.shots(5,{target:'Interior portrait in daytime'});
  assert.ok(indoor.every(shot=>shot.id==='requested'&&shot.lighting.includes('neutral-white')));
  assert.match(direction.shots(1,{target:'Garden portrait in daytime'})[0].lighting,/daytime open shade/);
});

for(const engine of ['direct','gemini'])test(engine+' keeps standard phone capture after scene suggestions in indoor, night and outdoor requests',async()=>{
  const scene='Seated in a room with cinematic amber lighting, creamy bokeh and glossy retouched skin.';
  for(const target of ['Nearby home outfit photo','Interior portrait at night, no flash','Garden outfit portrait in daylight']) {
    const h=harness(engine,{shortPrompt:target,imageCount:2},[JSON.stringify({prompts:[scene,scene]})]);
    await h.run();
    assert.equal(h.images.length,2);
    assert.ok(h.snapshots.at(-1).every(item=>item.status==='done'));
    for(const {prompt,refs} of h.images) {
      assert.deepEqual(refs.map(ref=>ref.name),['identity','outfit']);
      assert.ok(prompt.includes(target));
      assert.match(prompt,/STANDARD PHONE CAPTURE.*FINAL PHOTOGRAPHIC FINISH/);
      assert.match(prompt,/Keep nearby furniture, walls and room details readable together with the person/);
      assert.match(prompt,/standard iPhone Photo mode with Portrait mode off/);
      assert.match(prompt,/No added post-processing look/);
      assert.match(prompt,/CAMERA COLOR:.*neutral camera white balance/);
      if(engine==='gemini') {
        assert.ok(prompt.indexOf('STANDARD PHONE CAPTURE')>prompt.indexOf(scene));
        assert.match(prompt,/Do not inherit planner-only lens, depth-of-field, color grading or retouching directions/);
      }
    }
    if(engine==='gemini') {
      assert.match(h.planner[0],/STANDARD PHONE CAPTURE/);
      assert.match(h.planner[0],/Keep scene strings focused on action, expression, framing and the real setting/);
    }
  }
});

for(const engine of ['direct','gemini'])test(engine+' applies contemporary indoor direction to every final request while retaining reference and explicit style authority',async()=>{
  const h=harness(engine,{shortPrompt:'Ghar ke andar nearby outfit portrait',imageCount:5});
  await h.run();
  for(const {prompt} of h.images) {
    assert.match(prompt,/CONTEMPORARY INTERIOR DEFAULT/);
    assert.match(prompt,/present-day, attractive, lived-in urban interior/);
    assert.match(prompt,/neutral white balance/);
    assert.match(prompt,/explicitly requested architectural style overrides this default/);
    assert.match(prompt,/never remodel the referenced room/);
    assert.doesNotMatch(prompt,/warm natural materials|subtle heritage character|heritage is subtle/);
  }
  if(engine==='gemini')assert.match(h.planner[0],/CONTEMPORARY INTERIOR DEFAULT/);
  assert.ok(h.snapshots.at(-1).every(item=>item.classicShot.setting==='requested'));
});

for(const engine of ['direct','gemini'])for(const generationMode of ['sequential','parallel'])test(engine+' '+generationMode+' sends exact tuning, thick physique, face and outfit locks on every image',async()=>{
  const physical='Thick hourglass, soft abdomen, chest 46 inches, hips 49 inches.';
  const h=harness(engine,{generationMode,shortPrompt:'Mirror selfie in a lift',physicalDetails:physical,tuneHeight:'165 cm',tuneWeight:'88 kg',tuneBust:'47 inches',tuneWaist:'37 inches',tuneHips:'51 inches',tuneNavel:'soft rounded abdomen'});
  await h.run();
  assert.equal(h.images.length,3);assert.ok(h.snapshots.at(-1).every(p=>p.status==='done'));
  for(const image of h.images) {
    assert.deepEqual(image.refs.map(r=>r.name),['identity','outfit']);
    assert.ok(image.prompt.includes(physical));
    for(const value of ['165 cm','88 kg','47 inches','37 inches','51 inches','soft rounded abdomen'])assert.ok(image.prompt.includes(value));
    assert.doesNotMatch(image.prompt,/THICK HOURGLASS BASE|56-inch/);
    assert.match(image.prompt,/requested thick\/full build retains mass across torso, upper arms, hips and thighs/);
    assert.match(image.prompt,/Body Tuning wins over Figure Details/);
    assert.match(image.prompt,/Loose clothing stays loose/);
    assert.match(image.prompt,/Identity, outfit, pose and style bodies cannot slim it down/);
    assert.match(image.prompt,/Never shrink the body to fit the outfit model/);
    assert.match(image.prompt,/non-stretch fabric drapes naturally/);
    assert.match(image.prompt,/Thick\/full settings must remain visibly thick\/full even when every outfit reference shows a slim model/);
    assert.match(image.prompt,/No golden hour, sunset glow/);
    assert.match(image.prompt,/exact location|location named/);
    assert.doesNotMatch(image.prompt,/56-inch|80-85kg|ACTION & POSE REALISM \(HOT|GOLDEN HOUR & SUNSET:|luxury resort|iPhone portrait mode sharpness|Do not give the subject curly/);
  }
  assert.equal(h.planner.length,engine==='gemini'?1:0);
  if(h.planner.length){assert.ok(h.planner[0].includes(physical));assert.match(h.planner[0],/37 inches/);assert.doesNotMatch(h.planner[0],/Minal Khan|5-star|golden hour photography/i);}
});
test('blank figure fields keep the thick base without fabricated body measurements',async()=>{
  const h=harness();await h.run();
  for(const {prompt} of h.images){assert.match(prompt,/THICK HOURGLASS BASE/);assert.doesNotMatch(prompt,/\d+\s*(?:kg|inch|cm)/i);}
});

test('ordinary Classic crops stay near, while explicit full-body and distant requests still win',()=>{
  const shots=direction.shots(5,{target:'Confident Instagram portrait'});
  for(const shot of shots) {
    assert.doesNotMatch(shot.framing,/wider|environmental portrait|distant|far away/i);
    const prompt=direction.build({target:'Confident Instagram portrait',figureRule:direction.figure(),shot});
    assert.match(prompt,/SUBJECT-PROMINENT FRAMING/);
    assert.match(prompt,/REAL SKIN AT NORMAL PORTRAIT DISTANCE/);
    assert.match(prompt,/face, neck, chest, arms and hands consistent in complexion/);
    assert.match(prompt,/painted-on pores/);
  }
  assert.match(direction.shots(1,{target:'Full body outfit photo'})[0].framing,/head-to-toe/);
  assert.match(direction.shots(1,{target:'Distant wide shot'})[0].framing,/requested wider framing/);
});
for(const engine of ['direct','gemini'])test(engine+' location reference remains attached and controls geometry in planner and final prompts',async()=>{
  const h=harness(engine,{knowledge:[{name:'real-wall',dataUrl:'data:image/png;base64,AA'}]});
  await h.run();
  if(engine==='gemini')assert.match(h.planner[0],/attached location as the same real place/);
  for(const {prompt,refs} of h.images) {
    assert.deepEqual(refs.map(r=>r.name),['identity','outfit','real-wall']);
    assert.match(prompt,/attached location as the same real place/);
    assert.match(prompt,/floor contact, object scale, vanishing lines/);
    assert.doesNotMatch(prompt,/Otherwise use this minimal setting/);
  }
});

test('Gemini corrects a malformed plan before generation and final rules follow conflicting suggestions',async()=>{
  const scene='Slim model in a luxury penthouse at golden hour.';
  const h=harness('gemini',{shortPrompt:'Thick hourglass portrait in a lift',physicalDetails:'Thick full figure, full thighs and soft abdomen.',tuneHips:'51 inches'},[
    JSON.stringify({prompts:['Incomplete batch']}),
    JSON.stringify({prompts:[scene,scene,scene]})
  ]);
  await h.run();
  assert.equal(h.planner.length,2);assert.match(h.planner[1],/Expected exactly 3 non-empty prompt strings/);
  assert.equal(h.images.length,3);
  for(const {prompt} of h.images) {
    assert.ok(prompt.indexOf('FINAL CLASSIC PHOTO DIRECTION')>prompt.indexOf(scene));
    assert.match(prompt,/discard any conflicting body, location, pose or lighting suggestion/);
    assert.match(prompt,/THICK HOURGLASS BASE/);assert.match(prompt,/No golden hour/);
    assert.ok(prompt.indexOf('EXACT BODY TUNING')>prompt.indexOf(scene));
    assert.match(prompt,/Thick full figure, full thighs and soft abdomen/);
    assert.match(prompt,/51 inches/);
    assert.match(prompt,/Fit the clothes to the specified body; never fit the body to the clothes/);
  }
  assert.match(h.planner[0],/Do not put body-size labels, new measurements or reference-model proportions in scene strings/);
});
test('Classic rules cannot be called by Subject Flow',async()=>{
  const h=harness('direct',{workflowMode:'subject-flow',systemInstruction:'An ordinary photo at home',shortPrompt:'Sitting holding a cup'});
  h.context.ClassicDirection=new Proxy({}, {get(){throw Error('Classic direction leaked into Subject Flow');}});
  await h.run();assert.equal(h.images.length,3);
  for(const {prompt} of h.images)assert.doesNotMatch(prompt,/FINAL CLASSIC PHOTO DIRECTION|MINIMAL REAL LOCATION/);
});

for(const engine of ['direct','gemini'])test(engine+' uploads the selected location when the generic knowledge list is empty',async()=>{
  const location={name:'garden-wall.jpg',dataUrl:'data:image/png;base64,TE9DQVRJT04='};
  const h=harness(engine,{knowledge:[],location});await h.run();
  assert.deepEqual(h.uploads.map(r=>r.name),['identity','outfit','garden-wall.jpg']);
  assert.equal(h.uploads[2].data,location.dataUrl);assert.match(h.uploads[2].label,/^Location:/);
  for(const image of h.images)assert.deepEqual(image.refs.map(r=>r.name),['identity','outfit','garden-wall.jpg']);
});

test('a selected location without a confirmed upload stops before any image is generated',async()=>{
  const h=harness('direct',{location:{name:'missing-location',dataUrl:'data:image/png;base64,AA'}});
  h.context.uploadReferenceUntilSuccess=async(flow,data,name)=>name==='missing-location'?null:name;
  await assert.rejects(h.run(),/Reference upload incomplete.*1 location/);
  assert.equal(h.images.length,0);
});

test('a shared identity/location upload attaches once while preserving both numbered roles',async()=>{
  const h=harness('direct',{location:{name:'same-photo',dataUrl:'data:image/png;base64,AA'}});
  h.context.uploadReferenceUntilSuccess=async(flow,data,name)=>name==='same-photo'?'identity':name;
  await h.run();
  for(const {prompt,refs} of h.images) {
    assert.deepEqual(refs.map(r=>r.name),['identity','outfit']);
    assert.match(prompt,/REFERENCE IMAGE 1: PRIMARY FACE/);
    assert.match(prompt,/REFERENCE IMAGE 1: KNOWLEDGE \/ ENVIRONMENT ONLY/);
    assert.doesNotMatch(prompt,/REFERENCE IMAGE 3:/);
  }
});
