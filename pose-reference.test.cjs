const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const PoseReference=require('./pose-reference.js');
const vm=require('node:vm');
const image=name=>({id:name,name,dataUrl:'data:image/png;base64,AA=='});
// Reuse the existing isolated generation fixtures without running their suites.
function fixture(file){const source=fs.readFileSync(file,'utf8');return Function('require',source.slice(0,source.indexOf('\ntest('))+'\nreturn harness;')(require);}
const classicHarness=fixture('classic-direction.test.cjs'),storyHarness=fixture('story-pipeline.test.cjs');
function harness(engine,overrides={}){const h=classicHarness(engine,overrides);h.context.PoseReference=PoseReference;return h;}

test('optional images validate and are isolated by workflow',()=>{
 const refs=PoseReference.saved({classic:image('classic'),qid:image('video'),story:{dataUrl:'https://example.invalid/image'},extra:image('ignored')});
 assert.equal(refs.classic.name,'classic');assert.equal(refs.qid.name,'video');assert.equal(refs.story,null);assert.equal(refs['subject-flow'],null);assert.equal(refs.extra,undefined);
 assert.equal(PoseReference.record({dataUrl:'data:text/html;base64,AA=='}),null);
 assert.equal(PoseReference.record({dataUrl:'data:image/png;base64,'+'a'.repeat(12*1024*1024)}),null);
});
for(const workflowMode of ['classic','subject-flow'])for(const engine of ['direct','gemini'])test(`${workflowMode} ${engine}: pose-first reconstruction bypasses planner and survives batch/retry`,async()=>{
 const h=harness(engine,{workflowMode,poseReference:image('pose'),systemInstruction:'Use this room.',imageCount:3,
  subjects:[image('face-1'),image('face-2'),image('face-3')],outfits:[image('outfit-1'),image('outfit-2'),image('outfit-3')],
  knowledge:Array.from({length:6},(_,i)=>image('room-'+i)),quality:[image('finish')]});
 const requests=[];h.context.askGeminiWithRetry=async request=>{requests.push(request);return JSON.stringify({prompts:Array(3).fill('A conflicting new turn, camera above, tighter portrait.')});};
 await h.run();assert.equal(h.images.length,3);
 await h.context.STATE.retryHandler(0);assert.equal(h.images.length,4);
 assert.equal(h.uploads.filter(x=>x.name==='pose').length,1);
 for(const {prompt,refs} of h.images){
  assert.ok(refs.length<=9);assert.equal(refs[0].name,'pose');assert.ok(refs.some(r=>r.name==='face-1'));assert.ok(refs.some(r=>r.name==='outfit-1'));
  const number=refs.findIndex(r=>r.name==='pose')+1;assert.ok(number);
  assert.equal(number,1);assert.match(prompt,/^RECONSTRUCT REFERENCE IMAGE 1/);
  assert.match(prompt,/REFERENCE IMAGE 1: POSE \/ CAMERA TEMPLATE/);
  assert.match(prompt,/projected joint positions/);
  assert.doesNotMatch(prompt,/POSE DIVERSITY LOCK|CAMERA [A-E] —|BATCH VARIETY:|GEMINI SCENE EXPANSION|FINAL CLASSIC PHOTO DIRECTION|new turn, camera above/);
  assert.ok(prompt.length<4500,'pose request must stay focused without conflicting workflow defaults');
 }
 assert.equal(requests.length,0,'photo pose runs must not ask Gemini to invent a scene/pose');
});
test('a shared source retains both identity and pose roles with correct deduplicated numbering',async()=>{
 const h=harness('direct',{imageCount:1,subjects:[image('shared')],poseReference:image('shared')});await h.run();
 assert.deepEqual(h.images[0].refs.map(r=>r.name),['shared','outfit']);
 assert.match(h.images[0].prompt,/REFERENCE IMAGE 1: POSE \/ CAMERA TEMPLATE/);
 assert.match(h.images[0].prompt,/SUBJECT IDENTITY/);
});
test('empty optional input preserves normal Classic pose/camera variety',async()=>{
 const h=harness('direct',{poseReference:null});await h.run();assert.equal(h.images.length,3);
 assert.ok(h.images.every(i=>i.refs.length===2&&!i.prompt.includes('EXACT POSE / CAMERA REFERENCE LOCK')));
 assert.equal(new Set(h.snapshots.at(-1).map(i=>i.classicShot.pose)).size,3);
});
test('a failed pose upload prevents all generation',async()=>{
 const h=harness('direct',{poseReference:image('pose')});const upload=h.context.uploadReferenceUntilSuccess;
 h.context.uploadReferenceUntilSuccess=(flow,data,name,...rest)=>name==='pose'?null:upload(flow,data,name,...rest);
 await assert.rejects(h.run(),/pose\/camera reference did not upload/);assert.equal(h.images.length,0);
});
test('phone remote saves, reloads, presets and forwards each mode pose without changing other modes',async()=>{
 const source=fs.readFileSync('background.js','utf8'),stored={};
 const ctx=vm.createContext({PoseReference,FigureReference:require('./figure-reference.js'),crypto:require('node:crypto').webcrypto,structuredClone,
  FLOW_IMAGE_MODEL:'GEM_PIX_2',ALLOWED_MODELS:new Set(['GEM_PIX_2']),ALLOWED_ASPECT_RATIOS:new Set(['IMAGE_ASPECT_RATIO_SQUARE']),
  chrome:{storage:{local:{get:async()=>structuredClone(stored),set:async patch=>Object.assign(stored,structuredClone(patch))}}}});
 vm.runInContext(source.slice(source.indexOf('function remoteReferenceSummary('),source.indexOf('async function pairPhoneRemote(')),ctx);
 vm.runInContext(source.slice(source.indexOf('async function savedRemoteRunParams('),source.indexOf('async function handlePhoneRemoteCommand(')),ctx);
 for(const mode of ['classic','subject-flow','story']){
  const config=await ctx.changeRemoteReference({group:'pose-'+mode,record:image(mode)});
  assert.equal(config.poseReferences[mode].name,mode);stored.bb_creation_mode=mode;
  assert.equal((await ctx.savedRemoteRunParams()).poseReference.name,mode);
  assert.equal((await ctx.getRemoteReference('pose-'+mode,mode)).name,mode);
 }
 stored.bb_figure_reference=image('body');stored.bb_story_figure_character_id='sunny';
 assert.equal((await ctx.savedRemoteRunParams()).figureReference.name,'body');
 await ctx.saveRemotePreset('Poses');const preset=stored.bb_sf_prompt_presets[0];assert.equal(preset.fullSettings.poseReferences.story.name,'story');
 assert.equal(preset.fullSettings.figureReference.name,'body');assert.equal(preset.fullSettings.storyFigureCharacterId,'sunny');
 stored.bb_figure_reference=null;
 await ctx.removeRemoteReference({group:'pose-story'});assert.equal(stored.bb_pose_references.story,null);assert.equal(stored.bb_pose_references.classic.name,'classic');
 await ctx.loadRemotePreset(preset.id);assert.equal(stored.bb_pose_references.story.name,'story');assert.equal(stored.bb_figure_reference.name,'body');
});
test('Story reserves pose before optional style/scene anchors, skips cast-free frames, and retains it on resume',async()=>{
 const h=storyHarness({failDownload:null});h.context.PoseReference=PoseReference;h.params.poseReference=image('pose');
 h.params.storyCharacters[0].subjects=[image('sunny-face'),image('sunny-side'),image('sunny-back')];
 h.params.storyCharacters.push({name:'Mira',subjects:[image('mira-face'),image('mira-side'),image('mira-back')],outfits:[image('mira-outfit')]});
 const panels=h.chapter.plan.panels;
 for(const panel of panels){panel.characters=['Sunny','Mira'];panel.cast.push({name:'Mira',pose:'Sitting',gaze:'Sunny',bounds:{x:.6,y:.2,w:.3,h:.6}});}
 panels[0].characters=[];panels[0].cast=[];
 const requests=[];h.context.generateFlowImage=async(flow,prompt,refs)=>{requests.push({prompt,refs:structuredClone(refs)});return {mediaId:'media-'+requests.length,fifeUrl:'https://example.invalid/image'};};
 await h.context.runGeneration(h.params);assert.equal(requests.length,8);
 const establishing=requests.find(r=>r.prompt.includes('BEAT: beat-0'));
 assert.ok(establishing);assert.ok(!establishing.refs.some(r=>r.name==='pose'));assert.doesNotMatch(establishing.prompt,/EXACT POSE \/ CAMERA REFERENCE LOCK/);
 for(const request of requests.filter(r=>r!==establishing)){
  assert.equal(request.refs.length,9);assert.equal(request.refs[0].name,'pose');assert.match(request.prompt,/REFERENCE IMAGE 1 supplies/);
  assert.doesNotMatch(request.prompt,/Obey the planned shot size exactly|CAST AND COMPOSITION GUIDES|let the face fill the frame|fresh micro-expression|Keep the bottom 6%/);
  assert.equal(request.refs.filter(r=>/face|side|back/.test(r.name)).length,6);
 }
 await h.context.runGeneration(h.params);assert.equal(requests.length,8);
});
test('Story validation with a pose lock never replaces angles or inserts face closeups',()=>{
 const engine=require('./story-engine.js');
 const panels=Array.from({length:8},(_,i)=>({id:i+1,beat:'beat-'+i,action:'Waiting',emotion:'calm',location:'room',time:'day',carry:'book',shot:'wide',angle:'low angle from floor',visual:'room',sceneId:'room',sceneDescription:'same room',cast:[{name:'Sunny',pose:'sitting',gaze:'window',bounds:{x:.2,y:.2,w:.4,h:.6}}],npcs:[]}));
 const plan=engine.validate({version:4,title:'Test',chapter:'Chapter',panels},[{name:'Sunny'}],8,false,8,null,true);
 assert.ok(plan.panels.every(panel=>panel.shot==='wide'&&panel.angle==='low angle from floor'&&!panel.cameraAdjusted&&!panel.closeupAdjusted));
});
