const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('background.js','utf8');
const runSource=source.slice(source.indexOf('async function runGeneration('),source.indexOf('// ---------------- Google Flow API Boilerplate'));
const constants=source.slice(source.indexOf('const FLOW_RECAPTCHA_SITE_KEY'),source.indexOf('if (chrome.sidePanel'));
const engine=require('./story-engine.js');
function plan() {return engine.validate({version:4,title:'Test chapter',chapter:'Story',panels:Array.from({length:8},(_,i)=>({id:i+1,beat:`beat-${i}`,action:`action-${i}`,emotion:'curious',location:'Station',time:'day',carry:'letter',shot:'medium',visual:`visual-${i}`,sceneId:'station',sceneDescription:'Station',cast:[{name:'Sunny',pose:'Standing',gaze:'letter',bounds:{x:.2,y:.2,w:.4,h:.6}}],npcs:[],narration:`Narration ${i}`,dialogue:[]}))},[{name:'Sunny'}],60,true,8);}
function harness({failDownload=2,permanent=null,stopAt=null}={}) {
  const calls=[],downloads=[],saved=[],snapshots=[],blobs=new Map();let active=0,peak=0,failed=false,callsAfterStop=0;
  const chapter={plan:plan(),panels:Array.from({length:8},(_,i)=>({index:i+1,status:'queued'}))};
  const context=vm.createContext({console,URL,Map,Set,Blob,Date,JSON,Math,Promise,crypto:require('node:crypto').webcrypto,structuredClone,
    FlowRetry:require('./flow-retry.js'),STATE:{running:false,stopRequested:false},StoryEngine:engine,FlowRequestGuard:require('./flow-request-guard.js').create(),
    chrome:{runtime:{sendMessage:async()=>{},getURL:p=>p},storage:{local:{set:async()=>{}}}},
    fetch:async()=>({ok:true,blob:async()=>new Blob(['style'])}),
    log:()=>{},setStatus:()=>{},setProgress:()=>{},safeCloseTab:()=>{},withAutoRetry:async(label,fn)=>fn(),
    getDirectFlowContext:async()=>({tabId:1,projectId:'test'}),uploadReferenceUntilSuccess:async(flow,data,name)=>name,
    flowReferenceFileName:r=>r.name,broadcastQueue:q=>snapshots.push(structuredClone(q)),
    sleep:async()=>{},interruptibleWait:async()=>{},blobToDataUrl:async b=>`data:image/png;base64,${await b.text()}`,readExportBlob:async key=>blobs.get(key),
    StoryRenderer:{render:async(blob)=>({blob,width:100,height:160,trimmed:0}),thumbnail:async blob=>blob},
    StoryJobs:{savePlan:async()=>{},checkpoint:async(c,i,p)=>Object.assign(c.panels[i],p),savePanel:async(c,i,b,p)=>{const key=`blob-${i}`;blobs.set(key,b);Object.assign(c.panels[i],p,{status:'done',blobKey:key});saved.push(i);}},
    generateFlowImage:async(flow,prompt,images)=>{
      if(context.STATE.stopRequested)callsAfterStop++;
      const i=Number(prompt.match(/BEAT: beat-(\d+)/)[1]);calls.push(i);active++;peak=Math.max(peak,active);
      assert.ok(images.length>=2&&images.length<=9);assert.equal(images[0].name,'sunny-face');assert.equal(images[1].name,'sunny-outfit');
      if(prompt.includes('cinematic Webtoon illustrated frame')){assert.match(prompt,/FINAL STORY IN-IMAGE LETTERING/);assert.match(prompt,/RENDER THESE EXACT WORDS DIRECTLY/);assert.doesNotMatch(prompt,/FINAL STORY FRAME TEXT BAN/);}
      await new Promise(r=>setTimeout(r,(8-i)*2));active--;
      if(i===permanent){const e=Error('rejected');e.code='FLOW_GENERATION_REJECTED';throw e;}
      if(i===stopAt)context.STATE.stopRequested=true;
      return {mediaId:`media-${i}`,fifeUrl:'https://example.invalid/image'};
    },
    fetchMaximumQualityFlowImage:async(flow,id)=>{const i=Number(id.split('-')[1]);downloads.push(i);if(i===failDownload&&!failed){failed=true;throw Error('Temporary network failure');}return {blob:new Blob([String(i)],{type:'image/png'})};}
  });
  context.PoseReference=require('./pose-reference.js');
  vm.runInContext(constants+runSource,context);
  const params={workflowMode:'story',shortPrompt:'Chapter',storyCharacters:[{name:'Sunny',subjects:[{dataUrl:'data:image/png;base64,a',name:'sunny-face'}],outfits:[{dataUrl:'data:image/png;base64,b',name:'sunny-outfit'}]}],storyTextOverlays:true,storyBgStyle:'webtoon',generationMode:'parallel',_storyChapter:chapter,upscaleEnabled:false};
  return {context,chapter,params,calls,downloads,saved,snapshots,peak:()=>peak,callsAfterStop:()=>callsAfterStop};
}
test('parallel stays within 5, retains media on download retry, and pairs references',async()=>{
  const h=harness();await h.context.runGeneration(h.params);
  assert.equal(h.peak(),5);assert.equal(h.calls.length,8);assert.equal(h.downloads.filter(i=>i===2).length,2);
  assert.deepEqual(h.chapter.panels.map(p=>p.status),Array(8).fill('done'));
  assert.notDeepEqual(h.saved,[0,1,2,3,4,5,6,7]);
  assert.deepEqual(h.chapter.panels.map(p=>p.generation.mediaId),Array.from({length:8},(_,i)=>`media-${i}`));
  h.calls.length=0;await h.context.runGeneration(h.params);assert.equal(h.calls.length,0,'resume must not regenerate saved panels');
});
test('one rejected panel does not terminate parallel siblings; failure is checkpointed',async()=>{
  const h=harness({permanent:3});await h.context.runGeneration(h.params);
  assert.equal(h.chapter.panels[3].status,'failed');assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,7);assert.equal(h.calls.length,8);
});
test('unconfirmed paid requests need explicit resubmit; siblings can finish',async()=>{
  const h=harness();h.chapter.panels[2].status='outcome_unknown';await h.context.runGeneration(h.params);
  assert.ok(!h.calls.includes(2));assert.equal(h.chapter.panels[2].status,'outcome_unknown');assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,7);
});
test('stop stops taking new work from the shared parallel queue',async()=>{
  const h=harness({stopAt:2});await h.context.runGeneration(h.params);assert.equal(h.callsAfterStop(),0);assert.equal(h.context.STATE.running,false);
});
test('a Stop received between chapters is not cleared by runGeneration',async()=>{
  const h=harness();h.context.STATE.stopRequested=true;await h.context.runGeneration(h.params);
  assert.equal(h.calls.length,0);assert.equal(h.context.STATE.stopRequested,true);assert.equal(h.context.STATE.running,false);
});

test('unusual activity retries the rejected panel while five workers retain their own results',async()=>{
 const h=harness({failDownload:null}),generate=h.context.generateFlowImage;let refusals=0;
 h.context.generateFlowImage=async(flow,prompt,...args)=>{if(prompt.includes('BEAT: beat-0')&&refusals++<4)throw Object.assign(Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY'),{code:'FLOW_GENERATION_REJECTED'});return generate(flow,prompt,...args);};
 await h.context.runGeneration(h.params);assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,8);assert.equal(h.context.STATE.stopRequested,false);
});

test('manual Stop during admission preserves a queue entry rather than a failed or uncertain request',async()=>{
  const h=harness(),logs=[];h.context.log=s=>logs.push(s);
  h.context.generateFlowImage=async()=>{
    h.context.STATE.stopRequested=true;
    throw Object.assign(Error('Generation stopped before Flow submission.'),{code:'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:true});
  };
  await h.context.runGeneration(h.params);
  assert.ok(h.chapter.panels.every(p=>p.status==='queued'&&!p.error));assert.ok(!logs.some(s=>s.startsWith('Failed image')));
});

test('failed tab recovery pauses unsent Story panels without marking them uncertain',async()=>{
  const h=harness();let calls=0;
  h.context.generateFlowImage=async()=>{
    calls++;
    throw Object.assign(Error('Flow project tab recovery paused.'),{code:'FLOW_TAB_RECOVERY_FAILED',notSubmitted:true,noRetry:true});
  };
  await h.context.runGeneration(h.params);
  assert.ok(calls<=5);assert.equal(h.context.STATE.stopRequested,true);
  assert.match(h.context.STATE.stopReason,/recovery paused/);
  assert.ok(h.chapter.panels.every(p=>p.status==='queued'&&!p.generation));
});

test('download tab recovery failure retains confirmed Story media for Resume without regeneration',async()=>{
  const h=harness({failDownload:null});h.params.generationMode='sequential';
  const download=h.context.fetchMaximumQualityFlowImage;
  h.context.fetchMaximumQualityFlowImage=async()=>{throw Object.assign(Error('Flow project tab recovery paused.'),{code:'FLOW_TAB_RECOVERY_FAILED',noRetry:true});};
  await h.context.runGeneration(h.params);
  assert.equal(h.chapter.panels[0].generation.mediaId,'media-0');assert.equal(h.calls.length,1);
  h.context.fetchMaximumQualityFlowImage=download;h.context.STATE.stopRequested=false;
  await h.context.runGeneration(h.params);
  assert.equal(h.calls.filter(i=>i===0).length,1);assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,8);
});

test('a submitted request with an unknown outcome is never reset to queued by Stop',async()=>{
  const h=harness();h.context.generateFlowImage=async()=>{
    h.context.STATE.stopRequested=true;throw Object.assign(Error('Connection ended after submission.'),{code:'FLOW_GENERATION_OUTCOME_UNKNOWN'});
  };
  await h.context.runGeneration(h.params);assert.equal(h.chapter.panels[0].status,'outcome_unknown');
});

test('Resume revalidates a saved Gemini draft without another planner request',async()=>{
  const h=harness(),draft=h.chapter.plan;draft.panels[0].dialogue=[{speaker:'Veteran Officer',text:'Be careful.'}];
  h.chapter.plan=null;h.chapter.draftPlan=draft;
  h.context.parseGeminiPlanJson=text=>({source:text,value:JSON.parse(text)});
  let requests=0,savedDrafts=0;
  h.context.askGeminiWithRetry=async()=>{requests++;throw Error('Should reuse the saved draft');};
  h.context.StoryJobs.saveDraft=async(c,p)=>{savedDrafts++;c.draftPlan=structuredClone(p);};
  h.context.StoryJobs.savePlan=async(c,p)=>{c.plan=p;delete c.draftPlan;};
  await h.context.runGeneration(h.params);
  assert.equal(requests,0);assert.equal(savedDrafts,1);assert.equal(h.calls.length,8);
  assert.equal(h.chapter.plan.panels[0].dialogue[0].offscreen,true);assert.equal(h.chapter.draftPlan,undefined);
});
test('photorealism keeps its original in-image rendering and receives no Webtoon styling',async()=>{
  const h=harness();h.params.storyBgStyle='photorealistic';h.context.StoryRenderer.render=async(blob,...options)=>{assert.equal(options.length,0,'inspect dimensions without overlay options');return {blob,width:768,height:1376};};
  const generate=h.context.generateFlowImage;h.context.generateFlowImage=async(flow,prompt,images,...args)=>{
    assert.equal(images.length,2);assert.match(prompt,/neutral natural photorealistic/);assert.match(prompt,/RENDER THESE EXACT WORDS DIRECTLY/);assert.doesNotMatch(prompt,/EXPORT GUTTER/);return generate(flow,prompt,images,...args);
  };
  await h.context.runGeneration(h.params);assert.equal(h.chapter.panels.filter(p=>p.status==='done').length,8);
});
