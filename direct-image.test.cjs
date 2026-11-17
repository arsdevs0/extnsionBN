const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const direct=require('./direct-image.js');
const source=fs.readFileSync('background.js','utf8');
const constants=source.slice(source.indexOf('const FLOW_RECAPTCHA_SITE_KEY'),source.indexOf('if (chrome.sidePanel'));
const runSource=source.slice(source.indexOf('async function runGeneration('),source.indexOf('// ---------------- Google Flow API Boilerplate'));
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=';
function harness(overrides={}) {
  const images=[],uploads=[],snapshots=[],statuses=[],logs=[];let connections=0,listener,pending;
  const context=vm.createContext({URL,Date,Map,Set,Blob,Promise,JSON,Math,crypto:require('node:crypto').webcrypto,structuredClone,
    DirectImage:direct,PoseReference:require('./pose-reference.js'),
    ClassicDirection:{planner(){throw Error('Classic planner must not run');},figure(){throw Error('Classic figure must not run');}},
    SubjectFlowDirection:{prepare(){throw Error('Subject Flow must not run');}},
    FlowRetry:require('./flow-retry.js'),FlowRequestGuard:require('./flow-request-guard.js').create(),STATE:{running:false,stopRequested:false},
    chrome:{runtime:{sendMessage:async()=>{}},storage:{local:{get:async()=>({}),set:async()=>{throw Error('Direct mode must not write another workflow state');}}}},
    log:text=>logs.push(text),setStatus:text=>statuses.push(text),setProgress:()=>{},safeCloseTab:()=>{},sleep:async()=>{},interruptibleWait:async()=>{},
    withAutoRetry:async(label,fn)=>fn(),getDirectFlowContext:async()=>{connections++;return {tabId:1,projectId:'fixture'};},
    flowReferenceFileName:r=>r.name,uploadReferenceUntilSuccess:async(flow,data,name)=>{uploads.push({data,name});return 'source-media';},
    askGeminiWithRetry:async()=>{throw Error('Gemini must not run');},broadcastQueue:q=>snapshots.push(structuredClone(q)),
    generateFlowImage:async(flow,prompt,refs,model,aspect)=>{images.push({prompt,refs:structuredClone(refs),model,aspect});return {mediaId:'image-'+images.length,fifeUrl:'https://fixture.invalid/image'};},
    fetchMaximumQualityFlowImage:async()=>({blob:new Blob(['photo'])}),blobToDataUrl:async()=>png
  });
  vm.runInContext(constants+runSource,context);
  context.chrome.runtime.onMessage={addListener:fn=>{listener=fn;}};
  context.StoryJobs={busy:false};
  context.closeFlowSecurityHelperTab=()=>{};
  context.runWithKeepalive=params=>(pending=context.runGeneration(params));
  vm.runInContext(source.slice(source.indexOf('chrome.runtime.onMessage.addListener((msg'),source.indexOf('async function connectFlowAccount(')),context);
  const params={workflowMode:'direct-image',generationEngine:'gemini',generationMode:'parallel',imageCount:2,shortPrompt:'A blue ceramic teapot on a table',directMode:'text-to-image',directStyle:'original',
    subjects:[{name:'unrelated-identity',dataUrl:png}],outfits:[{name:'unrelated-outfit',dataUrl:png}],knowledge:[{name:'unrelated-room',dataUrl:png}],quality:[{name:'unrelated-style',dataUrl:png}],
    poseReference:{name:'unrelated-pose',dataUrl:png},tuneBust:'legacy body setting',physicalDetails:'legacy physique',systemInstruction:'legacy system instruction',upscaleEnabled:false,...overrides};
  return {images,uploads,snapshots,statuses,logs,context,params,connections:()=>connections,run:()=>context.runGeneration(params),
    dispatch:async message=>{let response;listener(message,{},value=>{response=value;});if(pending)await pending.catch(()=>{});return response;}};
}

test('runtime routing advertises Direct Image and keeps reference-free requests out of Classic',async()=>{
  const h=harness({subjects:[],outfits:[]});
  const state=await h.dispatch({type:'GET_STATE'});
  assert.ok(state.supportedWorkflows.includes('direct-image'));
  assert.equal(state.runtimeVersion,require('./manifest.json').version);
  await h.dispatch({...h.params,type:'bb_direct_image_generate',workflowMode:'classic'});
  assert.equal(h.images.length,2);assert.equal(h.uploads.length,0);
  assert.ok(h.logs.every(line=>!line.includes('At least one subject')));
});

test('legacy Direct Image messages retain their mode and image-to-image source',async()=>{
  const h=harness({directMode:'image-to-image',directSource:{name:'source.png',dataUrl:png},subjects:[],outfits:[]});
  await h.dispatch({...h.params,type:'bb_generate'});
  assert.equal(h.images.length,2);assert.equal(h.uploads.length,1);
  assert.deepEqual(h.images[0].refs.map(ref=>ref.name),['source-media']);
});

test('an unknown workflow fails explicitly instead of entering Classic validation',async()=>{
  const h=harness({workflowMode:'invalid',subjects:[],outfits:[]});
  await assert.rejects(h.run(),/Unknown image workflow/);assert.equal(h.connections(),0);
});

test('Classic still requires its identity reference',async()=>{
  const h=harness({workflowMode:'classic',subjects:[],outfits:[]});
  h.context.ClassicDirection.figure=()=>'';
  await assert.rejects(h.run(),/At least one subject reference/);assert.equal(h.connections(),0);
});
test('pure Text to Image preserves the complete prompt and ignores every stale reference and body setting',async()=>{
  const prompt='A blue ceramic teapot. '+ 'Detailed scene. '.repeat(220);
  const h=harness({shortPrompt:prompt,imageModel:'NARWHAL',aspectRatio:'IMAGE_ASPECT_RATIO_SQUARE',directSource:{name:'unused.png',dataUrl:png}});
  await h.run();assert.equal(h.images.length,2);assert.equal(h.uploads.length,0);
  for(const result of h.images){assert.equal(result.prompt,prompt.trim());assert.deepEqual(result.refs,[]);assert.equal(result.model,'NARWHAL');assert.equal(result.aspect,'IMAGE_ASPECT_RATIO_SQUARE');}
  assert.ok(h.snapshots.at(-1).every(item=>item.status==='done'));assert.equal(h.context.STATE.running,false);
});
for(const style of direct.styles)test('selected '+style.label+' works in both image modes without changing content authority',async()=>{
  for(const mode of ['text-to-image','image-to-image']){
    const h=harness({directMode:mode,directStyle:style.id,directSource:{name:'my-source.png',dataUrl:png}});
    await h.run();assert.equal(h.images.length,2);assert.ok(h.snapshots.at(-1).every(item=>item.status==='done'));
    for(const image of h.images){
      assert.ok(image.prompt.includes(h.params.shortPrompt));
      assert.doesNotMatch(image.prompt,/legacy|56-inch|hourglass|HAIR RULE|CANONICAL OUTFIT/);
      if(style.direction)assert.ok(image.prompt.includes(style.direction));
      assert.deepEqual(image.refs.map(ref=>ref.name),mode==='image-to-image'?['source-media']:[]);
      if(mode==='image-to-image')assert.match(image.prompt,/Edit REFERENCE IMAGE 1/);
    }
    assert.equal(h.uploads.length,mode==='image-to-image'?1:0);
    if(mode==='image-to-image')assert.deepEqual(h.uploads[0],{data:png,name:'my-source.png'});
  }
});
test('invalid requests fail before opening Flow or generating',async()=>{
  for(const values of [{shortPrompt:' '},{shortPrompt:'a'.repeat(6001)},{directStyle:'missing'},{directMode:'wrong'},
    {directMode:'image-to-image'},{directMode:'image-to-image',directSource:{dataUrl:'https://example.invalid/image.png'}},
    {directMode:'image-to-image',directSource:{dataUrl:'data:image/png;base64,%%%'}},
    {directMode:'image-to-image',directSource:{dataUrl:'data:image/png;base64,'+'A'.repeat(12*1024*1024)}}]){
    const h=harness(values);await assert.rejects(h.run());assert.equal(h.connections(),0);assert.equal(h.images.length,0);
  }
});
test('failed source upload prevents any image generation',async()=>{
  const h=harness({directMode:'image-to-image',directSource:{name:'source.png',dataUrl:png}});
  h.context.uploadReferenceUntilSuccess=async()=>null;
  await assert.rejects(h.run(),/Source image upload failed/);assert.equal(h.images.length,0);
});
test('manual retry keeps source and exact original prompt; download recovery does not regenerate',async()=>{
  const h=harness({imageCount:1,directMode:'image-to-image',directStyle:'candid',directSource:{name:'source.png',dataUrl:png}});
  const download=h.context.fetchMaximumQualityFlowImage;let calls=0;
  h.context.fetchMaximumQualityFlowImage=async(...args)=>{if(++calls===1)throw Error('Temporary download failure');return download(...args);};
  await h.run();assert.equal(h.images.length,1);assert.equal(h.snapshots.at(-1)[0].status,'done');
  await h.context.STATE.retryHandler(0);assert.equal(h.images.length,2);
  assert.deepEqual(h.images[0],h.images[1]);assert.equal(h.uploads.length,1);
});
test('Stop ends the batch and a later Direct Image run starts normally',async()=>{
  const h=harness({imageCount:4,generationMode:'sequential'}),generate=h.context.generateFlowImage;
  h.context.generateFlowImage=async(...args)=>{const result=await generate(...args);h.context.STATE.stopRequested=true;return result;};
  await h.run();assert.equal(h.images.length,1);assert.equal(h.context.STATE.running,false);
  h.context.generateFlowImage=generate;await h.run();assert.equal(h.images.length,5);assert.ok(h.snapshots.at(-1).every(item=>item.status==='done'));
});
