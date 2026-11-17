const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
function fixture(file,name='harness'){const s=fs.readFileSync(file,'utf8');return Function('require',s.slice(0,s.indexOf('\ntest('))+'\nreturn '+name+';')(require);}
const harness=fixture('story-pipeline.test.cjs'),setup=fixture('story-jobs.test.cjs','setup');

for(const style of ['webtoon','photorealistic','crime-noir','warm-drama','grounded-thriller'])for(const lettering of [true,false])
test(`${style}: lettering=${lettering} uses in-image text and preserves original output bytes`,async()=>{
  const h=harness({failDownload:null}),requests=[],rendered=[],originals=[];
  h.params.storyBgStyle=style;h.params.storyTextOverlays=lettering;
  h.context.generateFlowImage=async(flow,prompt)=>{requests.push(prompt);return {mediaId:'media-'+(requests.length-1)};};
  h.context.fetchMaximumQualityFlowImage=async()=>{const blob=new Blob(['original-image-'+originals.length],{type:'image/jpeg'});originals.push(blob);return {blob};};
  h.context.StoryRenderer.render=async(blob,...args)=>{rendered.push({blob,args});return {blob,width:900,height:1400};};
  const save=h.context.StoryJobs.savePanel;h.context.StoryJobs.savePanel=async(c,i,blob,details)=>{assert.ok(originals.includes(blob),'saved output was repainted');await save(c,i,blob,details);};
  await h.context.runGeneration(h.params);
  assert.equal(requests.length,8);assert.equal(rendered.length,8);
  for(const prompt of requests){
    assert.match(prompt,lettering?/FINAL STORY IN-IMAGE LETTERING/:/FINAL STORY FRAME TEXT BAN/);
    assert.doesNotMatch(prompt,/EXPORT GUTTER|"bounds"|extension adds|separate scroll gutters/);
    if(lettering){assert.match(prompt,/RENDER THESE EXACT WORDS DIRECTLY INSIDE THIS IMAGE/);assert.doesNotMatch(prompt,/NO IN-IMAGE TEXT|Include absolutely no writing or text|FINAL STORY FRAME TEXT BAN/);}
  }
  for(const {args} of rendered)assert.equal(args.length,0,'no overlay or crop options');
  assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,8);
  await h.context.runGeneration(h.params);assert.equal(requests.length,8);assert.equal(rendered.length,8);
});

test('silent Story panels do not acquire empty or invented captions',async()=>{
  const h=harness({failDownload:null}),prompts=[];
  h.chapter.plan.panels[0].narration='';h.chapter.plan.panels[0].dialogue=[];
  h.context.generateFlowImage=async(flow,prompt)=>{prompts.push(prompt);return {mediaId:'media-'+(prompts.length-1)};};
  await h.context.runGeneration(h.params);
  assert.match(prompts[0],/FINAL STORY FRAME TEXT BAN/);assert.doesNotMatch(prompts[0],/FINAL STORY IN-IMAGE LETTERING/);
  assert.match(prompts[1],/FINAL STORY IN-IMAGE LETTERING/);
});

test('planner gets a text-density correction before image generation',async()=>{
  const h=harness({failDownload:null}),draft=structuredClone(h.chapter.plan),prompts=[];
  h.chapter.plan=null;h.chapter.draftPlan=structuredClone(draft);h.chapter.draftPlan.panels[0].narration='too much text '.repeat(25);
  h.context.parseGeminiPlanJson=s=>({source:s,value:JSON.parse(s)});
  h.context.StoryJobs.saveDraft=async()=>{};
  h.context.askGeminiWithRetry=async request=>{prompts.push(request.prompt);assert.equal(h.calls.length,0);return JSON.stringify(draft);};
  await h.context.runGeneration(h.params);
  assert.equal(prompts.length,1);assert.match(prompts[0],/too much lettering/);assert.match(prompts[0],/Narration is OPTIONAL/);
  assert.equal(h.calls.length,8);
});

test('Resume applies heights by saved ID without changing cast, plan or completed output',async()=>{
  const plan={title:'Saved',panels:[{shot:'medium'},{shot:'close'}]},done={index:1,status:'done',blobKey:'first'};
  const h=setup({stored:{id:'saved',status:'paused',settings:{storyCharacters:[{id:'a',name:'A',height:'170 cm'},{id:'b',name:'B',height:'160 cm'}]},designBible:{A:'Canonical'},chapters:[{id:'one',source:'Chapter',status:'paused',plan,panels:[done,{index:2,status:'queued'}]}]}});
  let received;
  h.ctx.runGeneration=async params=>{received=structuredClone(params);h.ctx.STATE.stopRequested=true;};
  await h.ctx.jobs.handle({type:'bb_story_resume',storyCharacterHeights:[{id:'b',height:'165 cm'},{id:'a',height:'180 cm'},{id:'new',height:'190 cm'}]});await h.wait();
  assert.deepEqual(received.storyCharacters,[{id:'a',name:'A',height:'180 cm'},{id:'b',name:'B',height:'165 cm'}]);
  assert.deepEqual(received._storyChapter.plan,plan);assert.deepEqual(received._storyChapter.panels[0],done);
  assert.deepEqual(received.storyDesignBible,{A:'Canonical'});
});

test('invalid Resume height edits cannot mutate the saved session',async()=>{
  const h=setup({stored:{id:'s',status:'paused',settings:{storyCharacters:[{id:'a',height:'170 cm'}]},chapters:[{id:'c',panels:[]}]}});
  await assert.rejects(h.ctx.jobs.handle({type:'bb_story_resume',storyCharacterHeights:[{id:'a',height:180}]}),/Invalid Story character height/);
  assert.equal(h.db.get('story-session-v1').settings.storyCharacters[0].height,'170 cm');assert.deepEqual(h.runs,[]);
});
