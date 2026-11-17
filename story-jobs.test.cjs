const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('story-jobs.js','utf8');
function setup({stored,failChapter,telegramFail=false}={}) {
  const db=new Map(stored?[['story-session-v1',structuredClone(stored)]]:[]),runs=[],pdfs=[],messages=[],savedDownloads=[];
  const ctx=vm.createContext({console,structuredClone,Blob,crypto:require('node:crypto').webcrypto,setInterval,clearInterval,
    STATE:{running:false,stopRequested:false},StoryLibrary:require('./story-library.js'),
    readExportBlob:async k=>structuredClone(db.get(k)),storeExportBlob:async(k,b)=>db.set(k,structuredClone(b)),
    chrome:{runtime:{sendMessage:async m=>messages.push(m),getPlatformInfo:async()=>({})},storage:{local:{set:async()=>{},get:async()=>({bb_tg_bot_token:'test',bb_tg_chat_id:'test'})}}},
    log:()=>{},setStatus:()=>{},setProgress:()=>{},broadcastQueue:()=>{},closeFlowSecurityHelperTab:async()=>{},downloadLargeBlob:async(b,n,s)=>savedDownloads.push({b,n,s}),
    StoryRenderer:{pdf:async chapters=>{pdfs.push(chapters.map(c=>c.title));return new Blob(['pdf'],{type:'application/pdf'});}},
    sendImageToTelegramWithRetry:async()=>{if(telegramFail)throw Error('Network failed');},
    runGeneration:async params=>{
      const c=params._storyChapter;runs.push(c.source);await new Promise(r=>setTimeout(r,2));
      if(c.source===failChapter)throw Error('Temporary planning failure');
      const p={title:c.source,panels:[{},{}],designBible:{Sunny:c.source==='one'?'black hair':'wrong blonde hair'}};
      await ctx.jobs.savePlan(c,p);
      for(let i=1;i>=0;i--)await ctx.jobs.savePanel(c,i,new Blob([`${c.source}-${i}`]));
    }
  });
  ctx.requestGenerationStop=()=>{ctx.STATE.stopRequested=true;};
  vm.runInContext(source+'\nglobalThis.jobs=StoryJobs;',ctx);
  const wait=async()=>{for(let i=0;i<200&&ctx.jobs.busy;i++)await new Promise(r=>setTimeout(r,3));assert.equal(ctx.jobs.busy,false);};
  return {ctx,db,runs,pdfs,messages,savedDownloads,wait};
}
test('4 ordered chapters produce one saved PDF; Telegram failure preserves Save',async()=>{
  const h=setup({telegramFail:true});await h.ctx.jobs.start({shortPrompt:'one',storyChapters:[{source:'two'},{source:'three'},{source:'four'}],storyCharacters:[],telegramEnabled:true});await h.wait();
  assert.deepEqual(h.runs,['one','two','three','four']);assert.deepEqual(Array.from(h.pdfs[0]),['one','two','three','four']);
  const session=h.db.get('story-session-v1');assert.equal(session.status,'done');assert.equal(session.pdf.telegram,'failed');assert.equal(session.designBible.Sunny,'black hair');assert.equal(h.savedDownloads.length,0);
  await h.ctx.jobs.handle({type:'bb_story_pdf_save'});assert.equal(h.savedDownloads[0].s,true);
});
test('reject more than 3 extras; racing duplicate starts do not create two collections',async()=>{
  const h=setup();await assert.rejects(()=>h.ctx.jobs.start({shortPrompt:'one',storyChapters:Array(4).fill({source:'extra'})}),/3 queued/);
  const result=await Promise.allSettled([h.ctx.jobs.start({shortPrompt:'one'}),h.ctx.jobs.start({shortPrompt:'two'})]);await h.wait();
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.runs.length,1);
});
test('failed chapter leaves following chapters runnable, then resume skips successes',async()=>{
  const h=setup({failChapter:'two'});await h.ctx.jobs.start({shortPrompt:'one',storyChapters:[{source:'two'},{source:'three'}]});await h.wait();
  assert.deepEqual(h.runs,['one','two','three']);assert.equal(h.pdfs.length,0);
  const restored=setup({stored:h.db.get('story-session-v1')});await restored.ctx.jobs.handle({type:'bb_story_resume'});await restored.wait();assert.deepEqual(restored.runs,['two']);assert.equal(restored.pdfs.length,1);
});

for(const code of ['FLOW_UPLOAD_INVALID_ARGUMENT','FLOW_UPLOAD_INVALID_IMAGE','FLOW_UPLOAD_OUTCOME_UNKNOWN','FLOW_UPLOAD_UI_UNAVAILABLE','FLOW_PROJECT_UNAVAILABLE','FLOW_REFERENCE_MAPPING_MISSING','FLOW_TAB_RECOVERY_FAILED'])test(code+' pauses the collection before reusing the same broken reference in later chapters',async()=>{
  const h=setup(),original=h.ctx.runGeneration;let attempts=0;
  h.ctx.runGeneration=async()=>{attempts++;throw Object.assign(Error('Reference upload failed.'),{code});};
  await h.ctx.jobs.start({shortPrompt:'one',storyChapters:[{source:'two'},{source:'three'}]});await h.wait();
  assert.equal(attempts,1);
  const paused=h.db.get('story-session-v1');
  assert.equal(paused.status,'paused');assert.equal(paused.error,'Reference upload failed.');
  assert.deepEqual(paused.chapters.map(chapter=>chapter.status),['paused','queued','queued']);
  h.ctx.runGeneration=original;
  await h.ctx.jobs.handle({type:'bb_story_resume'});await h.wait();
  assert.deepEqual(h.runs,['one','two','three']);assert.equal(h.ctx.jobs.view().status,'done');
});

test('the reason that stopped Flow remains visible after draining and reloading the story',async()=>{
  const h=setup(),reason='Google Flow rejected image 1 (PUBLIC_ERROR_UNUSUAL_ACTIVITY). Progress saved.';
  h.ctx.runGeneration=async()=>{h.ctx.STATE.stopRequested=true;h.ctx.STATE.stopReason=reason;};
  await h.ctx.jobs.start({shortPrompt:'one'});await h.wait();
  assert.equal(h.ctx.jobs.view().status,'paused');assert.equal(h.ctx.jobs.view().error,reason);assert.equal(h.ctx.jobs.view().chapters[0].error,reason);
  const restored=setup({stored:h.db.get('story-session-v1')});await restored.ctx.jobs.init();assert.equal(restored.ctx.jobs.view().error,reason);
});

test('old unsent failures recover, while submitted unknown requests and real failures stay intact',async()=>{
  const stopped='Generation stopped before Flow submission.';
  const stored={id:'old',status:'paused',settings:{},designBible:{},chapters:[{id:'one',title:'one',source:'one',status:'paused',plan:null,panels:[
    {status:'failed',error:'PUBLIC_ERROR_UNUSUAL_ACTIVITY'},
    {status:'failed',error:stopped,generation:null},
    {status:'outcome_unknown',error:stopped},
    {status:'failed',error:stopped,generation:{mediaId:'accepted'}}
  ]}]};
  const h=setup({stored});await h.ctx.jobs.init();const recovered=h.db.get('story-session-v1');
  assert.deepEqual(recovered.chapters[0].panels.map(p=>p.status),['failed','queued','outcome_unknown','failed']);
  assert.equal(recovered.chapters[0].panels[1].error,undefined);assert.match(h.ctx.jobs.view().error,/PUBLIC_ERROR_UNUSUAL_ACTIVITY/);
});

test('raw Gemini drafts survive failure and reload, then clear when a plan is accepted',async()=>{
  const h=setup(),draft={version:4,title:'Saved draft',chapter:'Source',panels:[]};
  h.ctx.runGeneration=async params=>{await h.ctx.jobs.saveDraft(params._storyChapter,draft);throw Error('Invalid plan');};
  await h.ctx.jobs.start({shortPrompt:'one'});await h.wait();
  const stored=h.db.get('story-session-v1');assert.deepEqual(stored.chapters[0].draftPlan,draft);
  const restored=setup({stored}),original=restored.ctx.runGeneration;
  restored.ctx.runGeneration=async params=>{assert.deepEqual(structuredClone(params._storyChapter.draftPlan),draft);await original(params);};
  await restored.ctx.jobs.handle({type:'bb_story_resume'});await restored.wait();
  assert.equal(restored.db.get('story-session-v1').chapters[0].draftPlan,undefined);
});
test('restart keeps paid request uncertainty and requires explicit approval to resubmit',async()=>{
  const stored={id:'test',status:'running',settings:{},designBible:{},chapters:[{id:'ch1',source:'one',title:'one',status:'running',plan:null,panels:[{status:'outcome_unknown'}]}]};
  const h=setup({stored});await h.ctx.jobs.init();assert.equal(h.ctx.jobs.view().status,'paused');
  await assert.rejects(()=>h.ctx.jobs.handle({type:'bb_story_resume'}),/unconfirmed|interrupted/);
  await h.ctx.jobs.handle({type:'bb_story_resume',confirmUnknown:true});await h.wait();assert.equal(h.runs.length,1);
});
test('Stop drains current work, keeps saved panels and does not start the next chapter',async()=>{
  const h=setup();let release,entered;
  const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r),original=h.ctx.runGeneration;
  h.ctx.runGeneration=async params=>{await original(params);entered();await gate;};
  await h.ctx.jobs.start({shortPrompt:'one',storyChapters:[{source:'two'}]});await ready;
  const id=h.ctx.jobs.view().id;
  const stopped=await h.ctx.jobs.handle({type:'bb_story_stop'});
  assert.equal(stopped.session.status,'stopping');assert.equal(stopped.session.busy,true);
  await assert.rejects(()=>h.ctx.jobs.handle({type:'bb_story_start_over'}),/Stop the running/);
  release();await h.wait();
  assert.equal(h.ctx.jobs.view().status,'paused');assert.deepEqual(h.runs,['one']);assert.equal(h.ctx.jobs.view().chapters[0].done,2);
  h.ctx.runGeneration=original;
  await h.ctx.jobs.handle({type:'bb_story_resume'});await h.wait();assert.equal(h.ctx.jobs.view().id,id);assert.equal(h.ctx.jobs.view().status,'done');
});
test('Start over uses the new chapter, queue and settings without carrying over the saved plan or designs',async()=>{
  const h=setup();const settings={shortPrompt:'one',storyChapters:[{source:'two'}],storyCharacters:[{name:'Sunny',aliases:'Sunless'}],storyBgStyle:'photorealistic',generationMode:'parallel'};
  await h.ctx.jobs.start(settings);await h.wait();
  const previous=h.db.get('story-session-v1');
  const params={workflowMode:'story',shortPrompt:'new chapter',storyChapters:[{title:'Next',source:'new queued chapter'}],storyCharacters:[{name:'Mira'}],storyBgStyle:'webtoon',generationMode:'sequential',figureReference:{name:'new figure'},storyDesignBible:{Sunny:'stale'},_storyChapter:previous.chapters[0],tgBotToken:'secret',tgChatId:'chat'};
  await h.ctx.jobs.handle({type:'bb_story_start_over',params});
  const fresh=h.db.get('story-session-v1');assert.notEqual(fresh.id,previous.id);assert.equal(fresh.pdf,null);
  assert.deepEqual(fresh.chapters.map(c=>c.source),['new chapter','new queued chapter']);assert.ok(fresh.chapters.every(c=>!c.plan&&!c.panels.length));
  assert.deepEqual(fresh.settings.storyCharacters,[{name:'Mira'}]);assert.equal(fresh.settings.storyBgStyle,'webtoon');assert.equal(fresh.settings.figureReference.name,'new figure');
  for(const field of ['_storyChapter','storyDesignBible','tgBotToken','tgChatId'])assert.equal(fresh.settings[field],undefined);
  assert.deepEqual(fresh.designBible,{});
  assert.deepEqual(h.db.get(`story-history:${previous.id}`),previous);
  await h.wait();assert.deepEqual(h.runs,['one','two','new chapter','new queued chapter']);assert.equal(h.ctx.jobs.view().status,'done');
});
test('Start over preserves the current collection if saving its backup fails',async()=>{
  const h=setup();await h.ctx.jobs.start({shortPrompt:'one'});await h.wait();const id=h.ctx.jobs.view().id;
  const write=h.ctx.storeExportBlob;h.ctx.storeExportBlob=async(k,b)=>{if(k.startsWith('story-history:'))throw Error('Storage full');return write(k,b);};
  await assert.rejects(()=>h.ctx.jobs.handle({type:'bb_story_start_over',params:{workflowMode:'story',shortPrompt:'new chapter'}}),/Storage full/);
  assert.equal(h.ctx.jobs.view().id,id);assert.equal(h.ctx.jobs.busy,false);assert.equal(h.runs.length,1);
});

test('Start over refuses a missing or empty current chapter and keeps the old collection intact',async()=>{
  const h=setup();await h.ctx.jobs.start({shortPrompt:'one'});await h.wait();
  const before=h.db.get('story-session-v1');
  for(const params of [undefined,{workflowMode:'story',shortPrompt:'  '},{workflowMode:'story',shortPrompt:'new',storyChapters:[{source:''}]}]){
    await assert.rejects(h.ctx.jobs.handle({type:'bb_story_start_over',params}),/current chapter|characters/);
    assert.deepEqual(h.db.get('story-session-v1'),before);assert.equal(h.ctx.jobs.busy,false);
  }
  assert.deepEqual(h.runs,['one']);
});

test('a fresh chapter does not inherit old queued chapters and concurrent Start over only starts once',async()=>{
  const h=setup();await h.ctx.jobs.start({shortPrompt:'one',storyChapters:[{source:'two'}]});await h.wait();
  const request={type:'bb_story_start_over',params:{workflowMode:'story',shortPrompt:'new only',storyChapters:[]}};
  const result=await Promise.allSettled([h.ctx.jobs.handle(request),h.ctx.jobs.handle(request)]);await h.wait();
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.deepEqual(h.runs,['one','two','new only']);assert.equal(h.ctx.jobs.view().chapters.length,1);
});
test('Stop during export preserves the PDF without starting a Telegram send',async()=>{
  const h=setup();let release,entered,sends=0;
  const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r);
  h.ctx.StoryRenderer.pdf=async()=>{entered();await gate;return new Blob(['pdf'],{type:'application/pdf'});};
  h.ctx.sendImageToTelegramWithRetry=async()=>{sends++;};
  await h.ctx.jobs.start({shortPrompt:'one',telegramEnabled:true});await ready;
  await h.ctx.jobs.handle({type:'bb_story_stop'});release();await h.wait();
  assert.equal(h.ctx.jobs.view().status,'paused');assert.ok(h.ctx.jobs.view().pdf);assert.equal(sends,0);
  await h.ctx.jobs.handle({type:'bb_story_resume'});await h.wait();assert.equal(sends,1);
});
test('Reload while stopping exposes Resume without silently restarting work',async()=>{
  const h=setup({stored:{id:'stopping',status:'stopping',chapters:[{id:'one',title:'one',source:'one',status:'running',panels:[]}],settings:{},designBible:{}}});
  await h.ctx.jobs.init();assert.equal(h.ctx.jobs.view().status,'paused');assert.equal(h.ctx.jobs.view().chapters[0].status,'paused');assert.equal(h.runs.length,0);
});
