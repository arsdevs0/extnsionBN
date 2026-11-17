const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const FigureReference=require('./figure-reference.js');
function fixture(file,name='harness'){const text=fs.readFileSync(file,'utf8');return Function('require',text.slice(0,text.indexOf('\ntest('))+'\nreturn '+name+';')(require);}
const classicHarness=fixture('classic-direction.test.cjs'),storyHarness=fixture('story-pipeline.test.cjs'),directHarness=fixture('direct-image.test.cjs');
const image=name=>({id:name,name,dataUrl:'data:image/png;base64,AA=='});

for(const mode of ['classic','subject-flow'])for(const engine of ['gemini','direct'])for(const pose of [false,true])
test(`${mode}/${engine}/pose=${pose}: attach and bind the figure on every image and retry`,async()=>{
  const h=classicHarness(engine,{workflowMode:mode,figureReference:image('body'),physicalDetails:'Conflicting narrow waist',tuneHips:'41 inches',systemInstruction:'Use the selected room.',...(pose?{poseReference:image('pose')}:{}),
    subjects:[image('face-1'),image('face-2'),image('face-3')],outfits:[image('outfit-1'),image('outfit-2'),image('outfit-3')],knowledge:Array.from({length:6},(_,i)=>image('room-'+i)),quality:[image('finish')]});
  h.context.FigureReference=FigureReference;await h.run();assert.equal(h.images.length,3);
  await h.context.STATE.retryHandler(0);assert.equal(h.images.length,4);
  assert.equal(h.uploads.filter(item=>item.name==='body').length,1);
  for(const {prompt,refs} of h.images){
    const number=refs.findIndex(ref=>ref.name==='body')+1;assert.ok(number>0);assert.ok(refs.length<=9);
    assert.ok(prompt.includes(`REFERENCE IMAGE ${number} (@figure)`));
    assert.match(prompt,/overrides conflicting written measurements/);
    assert.doesNotMatch(prompt,/Conflicting narrow waist|41 inches|56-inch|THICK HOURGLASS BASE/);
    if(pose)assert.equal(refs[0].name,'pose');
  }
});

test('figure and identity can share one attachment without losing role numbering',async()=>{
  const h=classicHarness('direct',{figureReference:image('identity')});h.context.FigureReference=FigureReference;
  await h.run();for(const {prompt,refs} of h.images){assert.equal(refs.filter(ref=>ref.name==='identity').length,1);assert.match(prompt,/REFERENCE IMAGE 1 \(@figure\)/);}
});

test('invalid or failed figure upload cannot silently generate without the chosen body reference',async()=>{
  const invalid=classicHarness('direct',{figureReference:{dataUrl:'https://example.invalid/image'}});invalid.context.FigureReference=FigureReference;
  await assert.rejects(invalid.run(),/valid figure reference/);assert.equal(invalid.images.length,0);
  const h=classicHarness('direct',{figureReference:image('body')});h.context.FigureReference=FigureReference;
  const upload=h.context.uploadReferenceUntilSuccess;h.context.uploadReferenceUntilSuccess=(flow,data,name,...rest)=>name==='body'?null:upload(flow,data,name,...rest);
  await assert.rejects(h.run(),/Figure reference upload failed/);assert.equal(h.images.length,0);
});

for(const directMode of ['text-to-image','image-to-image'])test(`Direct Image ${directMode} preserves its source and attaches the global figure`,async()=>{
  const h=directHarness({directMode,figureReference:image('body'),...(directMode==='image-to-image'?{directSource:image('source')}: {})});
  h.context.FigureReference=FigureReference;
  h.context.uploadReferenceUntilSuccess=async(flow,data,name)=>name;
  await h.context.runGeneration(h.params);assert.equal(h.images.length,2);
  for(const {prompt,refs} of h.images){const number=refs.findIndex(ref=>ref.name==='body')+1;assert.ok(number);assert.ok(prompt.includes(`REFERENCE IMAGE ${number} (@figure)`));if(directMode==='image-to-image')assert.equal(refs[0].name,'source');}
});

test('Story figure applies to its selected character, reserves space beside pose, and survives resume',async()=>{
  const h=storyHarness({failDownload:null});h.context.FigureReference=FigureReference;
  h.params.figureReference=image('body');h.params.poseReference=image('pose');h.params.storyFigureCharacterId='mira';
  h.params.storyCharacters[0].id='sunny';h.params.storyCharacters[0].subjects=[image('sunny-face'),image('sunny-side'),image('sunny-back')];
  h.params.storyCharacters[0].height='180 cm';
  h.params.storyCharacters.push({id:'mira',name:'Mira',height:'165 cm',physique:'Narrow waist',subjects:[image('mira-face'),image('mira-side'),image('mira-back')],outfits:[image('mira-outfit')]});
  for(const panel of h.chapter.plan.panels){panel.characters=['Sunny','Mira'];panel.cast.push({name:'Mira',pose:'Standing',gaze:'Sunny',bounds:{x:.6,y:.2,w:.3,h:.6}});}
  h.chapter.plan.panels[0].characters=[];h.chapter.plan.panels[0].cast=[];
  h.chapter.plan.panels[1].characters=['Sunny'];h.chapter.plan.panels[1].cast=h.chapter.plan.panels[1].cast.slice(0,1);
  const requests=[];h.context.generateFlowImage=async(flow,prompt,refs)=>{requests.push({prompt,refs:structuredClone(refs)});return {mediaId:'media-'+requests.length,fifeUrl:'https://fixture.invalid'};};
  await h.context.runGeneration(h.params);assert.equal(requests.length,8);
  for(const {prompt,refs} of requests){
    assert.ok(refs.length<=9);
    if(/BEAT: beat-[01]/.test(prompt)){assert.ok(!refs.some(ref=>ref.name==='body'));assert.doesNotMatch(prompt,/@figure/);}
    else{assert.equal(refs[0].name,'pose');const number=refs.findIndex(ref=>ref.name==='body')+1;assert.ok(number);assert.ok(prompt.includes(`REFERENCE IMAGE ${number} (@figure)`));assert.match(prompt,/of "Mira" only/);assert.doesNotMatch(prompt,/Narrow waist/);assert.match(prompt,/Mira: standing height 165 cm/);assert.match(prompt,/Sunny: standing height 180 cm/);assert.match(prompt,/15.0 cm difference \(Sunny taller\)/);assert.match(prompt,/STANDING HEIGHT EXCEPTION/);for(const name of ['sunny-face','sunny-outfit','mira-face','mira-outfit'])assert.ok(refs.some(ref=>ref.name===name));}
  }
  assert.equal(h.params.storyCharacters[1].physique,'Narrow waist','saved written notes remain intact');
  await h.context.runGeneration(h.params);assert.equal(requests.length,8,'completed panels remain saved');
});

test('saved Story resumes after reference upload failure with the current figure and keeps completed panels',async()=>{
  const h=storyHarness({failDownload:null});h.context.FigureReference=FigureReference;h.params.storyCharacters[0].id='sunny';
  const settings={...h.params};delete settings._storyChapter;
  const chapter={...h.chapter,id:'chapter',source:'Chapter',title:'Chapter',status:'paused'};
  chapter.panels[0]={index:1,status:'done',blobKey:'saved-first'};
  const originalPlan=structuredClone(chapter.plan);
  const jobs=fixture('story-jobs.test.cjs','setup')({stored:{id:'saved',status:'paused',settings,designBible:{},chapters:[chapter]}});
  jobs.ctx.FigureReference=FigureReference;h.context.StoryJobs=jobs.ctx.jobs;jobs.ctx.STATE=h.context.STATE;
  jobs.db.set('saved-first',new Blob(['saved-panel'],{type:'image/png'}));
  h.context.readExportBlob=async key=>jobs.db.get(key);
  jobs.ctx.runGeneration=params=>h.context.runGeneration(params);
  const upload=h.context.uploadReferenceUntilSuccess;
  h.context.uploadReferenceUntilSuccess=async()=>{throw Object.assign(Error('Flow Upload control was not found.'),{code:'FLOW_UPLOAD_UI_UNAVAILABLE'});};
  await jobs.ctx.jobs.handle({type:'bb_story_resume'});await jobs.wait();
  assert.equal(jobs.ctx.jobs.view().status,'paused');assert.deepEqual(h.calls,[]);
  assert.deepEqual(jobs.db.get('story-session-v1').chapters[0].plan,originalPlan);
  h.context.uploadReferenceUntilSuccess=upload;
  await jobs.ctx.jobs.handle({type:'bb_story_resume',figureReference:image('body'),storyFigureCharacterId:'sunny'});await jobs.wait();
  const completed=jobs.db.get('story-session-v1');
  assert.equal(completed.status,'done',JSON.stringify(completed.chapters.map(c=>({error:c.error,panels:c.panels})))) ;assert.equal(completed.settings.figureReference.name,'body');
  assert.equal(completed.chapters[0].panels[0].blobKey,'saved-first');assert.deepEqual(h.calls.sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
  assert.deepEqual(completed.chapters[0].plan,originalPlan);assert.equal(jobs.pdfs.length,1);
});

test('Resume validates the figure target before changing the saved Story settings',async()=>{
  const jobs=fixture('story-jobs.test.cjs','setup')({stored:{id:'saved',status:'paused',settings:{storyCharacters:[{id:'sunny',name:'Sunny'}]},designBible:{},chapters:[{id:'one',source:'one',panels:[]}]}});
  jobs.ctx.FigureReference=FigureReference;
  await assert.rejects(jobs.ctx.jobs.handle({type:'bb_story_resume',figureReference:image('body'),storyFigureCharacterId:'missing'}),/saved Story cast/);
  await assert.rejects(jobs.ctx.jobs.handle({type:'bb_story_resume',figureReference:{dataUrl:'invalid'},storyFigureCharacterId:'sunny'}),/valid figure/);
  assert.equal(jobs.ctx.jobs.view().status,'paused');assert.deepEqual(jobs.runs,[]);
  assert.equal(jobs.db.get('story-session-v1').settings.figureReference,undefined);
});
