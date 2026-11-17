/* Durable story jobs. Generation checkpoints are written before/after paid requests. */
const StoryJobs = (() => {
  let session=null,busy=false,loaded=false,initializing=null,write=Promise.resolve();
  const key='story-session-v1';
  function view() {
    if(!session)return null;
    return {id:session.id,status:session.status,busy,error:session.error||'',pdf:session.pdf||null,hasUnknown:session.chapters.some(c=>c.panels.some(p=>p.status==='outcome_unknown')),
      chapters:session.chapters.map(c=>({id:c.id,title:c.title,status:c.status,error:c.error||'',done:(c.panels||[]).filter(p=>p.status==='done').length,total:c.plan?.panels.length||0}))};
  }
  async function persist() {
    const snapshot=structuredClone(session);
    write=write.catch(()=>{}).then(()=>storeExportBlob(key,snapshot));await write;
    chrome.runtime.sendMessage({type:'bb_story_session',session:view()}).catch(()=>{});
  }
  async function init() {
    if(loaded)return;
    if(initializing)return initializing;
    initializing=(async()=>{
    session=await readExportBlob(key);loaded=true;
    let changed=false;
    for(const chapter of session?.chapters||[])for(const panel of chapter.panels||[]) {
      if(panel.status==='failed'&&!panel.generation&&panel.error==='Generation stopped before Flow submission.') {
        panel.status='queued';delete panel.error;changed=true;
      }
    }
    if(session&&session.status!=='done'&&!session.error&&session.chapters.some(c=>c.panels.some(p=>p.status==='failed'&&/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(p.error||'')))) {
      session.error='Google Flow rejected image generation (PUBLIC_ERROR_UNUSUAL_ACTIVITY). Progress saved. You can retry or resume now.';
      changed=true;
    }
    if(session&&['running','stopping','exporting'].includes(session.status)){
      session.status='paused';session.error=session.error||'Browser or extension restarted. Resume continues saved panels.';
      for(const chapter of session.chapters)if(chapter.status==='running')chapter.status='paused';
      changed=true;
    }
    if(changed)await persist();
    })();
    try {await initializing;}finally{initializing=null;}
  }
  function sources(params) {
    const extra=Array.isArray(params.storyChapters)?params.storyChapters:[];
    if(extra.length>3)throw Error('Story mode supports the current chapter plus 3 queued chapters.');
    const values=[{source:params.shortPrompt,title:params.storyTitle},...extra];
    return values.map((entry,index)=>{
      const source=String(entry.source||'').trim();
      if(!source||source.length>30000)throw Error(`Chapter ${index+1} needs 1–30,000 characters.`);
      return {id:crypto.randomUUID(),title:String(entry.title||`Chapter ${index+1}`).slice(0,160),source,status:'queued',panels:[],plan:null};
    });
  }
  async function start(params) {
    await init();if(busy||STATE.running)throw Error('A generation is already running.');
    const chapters=sources(params);
    StoryLibrary.checkAliases(params.storyCharacters||[]);
    if(session&&session.status!=='done')throw Error('Resume the saved story or discard it before starting another.');
    const settings=structuredClone(params);delete settings.tgBotToken;delete settings.tgChatId;delete settings.storyChapters;
    session={id:crypto.randomUUID(),status:'running',chapters,settings,designBible:params.storyDesignBible||{},pdf:null};
    // Keep credentials in the existing settings storage, not in the exported job.
    STATE.stopRequested=false;busy=true;
    try {await chrome.storage.local.set({bb_tg_bot_token:String(params.tgBotToken||''),bb_tg_chat_id:String(params.tgChatId||'')});await persist();}
    catch(e){busy=false;throw e;}
    run().catch(fatal);return view();
  }
  async function fatal(error) {
    busy=false;STATE.running=false;session.status='paused';session.error=error.message;
    await persist();setStatus(`Story paused: ${error.message}`);chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
  }
  async function credentials() {
    const saved=await chrome.storage.local.get(['bb_tg_bot_token','bb_tg_chat_id']);
    return {tgBotToken:saved.bb_tg_bot_token||'',tgChatId:saved.bb_tg_chat_id||''};
  }
  async function run() {
    if(!STATE.stopRequested)session.status='running';delete session.error;
    if(!STATE.stopRequested)STATE.stopReason='';
    const keepalive=setInterval(()=>{chrome.runtime.getPlatformInfo().catch(()=>{});},20000);
    try {
      for(const chapter of session.chapters) {
        if(STATE.stopRequested)break;
        if(chapter.status==='done')continue;
        chapter.status='running';delete chapter.error;await persist();
        try {
          if(STATE.stopRequested){chapter.status='paused';if(STATE.stopReason)chapter.error=session.error=STATE.stopReason;break;}
          await runGeneration({...session.settings,...await credentials(),shortPrompt:chapter.source,storyDesignBible:session.designBible,_storyChapter:chapter});
          if(STATE.stopRequested){chapter.status='paused';if(STATE.stopReason)chapter.error=session.error=STATE.stopReason;break;}
          const failed=chapter.panels.filter(p=>p.status!=='done');
          chapter.status=failed.length?'needs_attention':'done';
          if(failed.length)chapter.error=`${failed.length} panel(s) need retry. Saved panels are retained.`;
        } catch(e) {
          chapter.status=STATE.stopRequested?'paused':'needs_attention';chapter.error=e.message;log(`Chapter ${chapter.title}: ${e.message}`);
          const referenceBlocked=['FLOW_UPLOAD_INVALID_ARGUMENT','FLOW_UPLOAD_INVALID_IMAGE','FLOW_UPLOAD_OUTCOME_UNKNOWN','FLOW_UPLOAD_UI_UNAVAILABLE','FLOW_PROJECT_UNAVAILABLE','FLOW_REFERENCE_MAPPING_MISSING','FLOW_TAB_RECOVERY_FAILED'].includes(e.code);
          if(referenceBlocked||/sign.in|auth|quota|unusual.activity|verification/i.test(e.message)){STATE.stopRequested=true;STATE.stopReason=session.error=e.message;chapter.status='paused';}
        } finally {STATE.running=false;await persist();await closeFlowSecurityHelperTab().catch(()=>{});}
      }
      if(!STATE.stopRequested&&session.chapters.every(c=>c.status==='done')) {
        setStatus('Building the complete webtoon PDF…');session.status='exporting';await persist();
        await buildPdf();session.status=STATE.stopRequested?'paused':'done';
      } else {session.status=STATE.stopRequested?'paused':'needs_attention';}
      setStatus(session.status==='done'?'All chapters ready. Save PDF below.':session.error||'Story progress saved. Resume to retry unfinished panels.');
    } finally {
      clearInterval(keepalive);busy=false;STATE.running=false;await persist();chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
    }
  }
  async function savePlan(chapter,plan) {
    chapter.plan=plan;delete chapter.draftPlan;chapter.title=plan.title||chapter.title;
    chapter.panels=plan.panels.map((_,i)=>chapter.panels[i]||{index:i+1,status:'queued'});
    // Existing designs win. Later chapters may add designs but cannot silently redesign them.
    for(const [name,design] of Object.entries(plan.designBible||{}))if(!session.designBible[name])session.designBible[name]=design;
    await persist();
  }
  async function saveDraft(chapter,plan) {chapter.draftPlan=structuredClone(plan);await persist();}
  async function checkpoint(chapter,index,patch) {chapter.panels[index]={...chapter.panels[index],...patch};await persist();}
  async function savePanel(chapter,index,blob,patch={}) {
    const blobKey=`story-panel:${session.id}:${chapter.id}:${index}`;await storeExportBlob(blobKey,blob);
    await checkpoint(chapter,index,{...patch,blobKey,status:'done'});
  }
  async function buildPdf() {
    let blob=await StoryRenderer.pdf(session.chapters,readExportBlob);
    if(blob.size>49*1024*1024)blob=await StoryRenderer.pdf(session.chapters,readExportBlob,{maxWidth:1000,quality:.76});
    const pdfKey=`story-pdf:${session.id}`;await storeExportBlob(pdfKey,blob);
    session.pdf={key:pdfKey,filename:`Story-Studio-${session.id.slice(0,8)}.pdf`,size:blob.size,telegram:'not_sent'};
    await persist();
    if(session.settings.telegramEnabled&&!STATE.stopRequested)await deliverPdf(blob);
  }
  async function deliverPdf(blob) {
    try {
      const {tgBotToken,tgChatId}=await credentials();
      if(!tgBotToken||!tgChatId)throw Error('Add Telegram bot token and chat ID in settings, then tap Send PDF.');
      if(blob.size>49*1024*1024)throw Error('PDF exceeds Telegram’s 50 MB bot limit. Use Save PDF for the complete file.');
      await sendImageToTelegramWithRetry(tgBotToken,tgChatId,blob,session.pdf.filename,`${session.chapters.length} chapters · complete webtoon`,true);
      session.pdf.telegram='sent';delete session.pdf.error;
    } catch(e) {session.pdf.telegram='failed';session.pdf.error=e.message;log(`PDF saved; Telegram delivery: ${e.message}`);}
    await persist();
  }
  async function handle(message) {
    await init();
    if(message.type==='bb_story_state')return {ok:true,session:view()};
    if(message.type==='bb_story_discard') {
      if(busy||STATE.running)throw Error('Stop the current generation before discarding its saved story.');
      session=null;await persist();return {ok:true,session:null};
    }
    if(!session)throw Error('No saved story is available.');
    if(message.type==='bb_story_stop') {
      if(!busy)return {ok:true,session:view()};
      requestGenerationStop();session.status='stopping';
      setStatus('Stopping… saving current progress.');await persist();
      return {ok:true,session:view()};
    }
    if(message.type==='bb_story_start_over') {
      if(busy||STATE.running)throw Error('Stop the running generation first, then choose Start over.');
      const params=message.params;
      if(!params||params.workflowMode!=='story')throw Error('Start over needs the current chapter and settings. Reload the extension panel and enter the new chapter.');
      const chapters=sources(params);
      StoryLibrary.checkAliases(params.storyCharacters||[]);
      const settings=structuredClone(params);
      for(const field of ['tgBotToken','tgChatId','storyChapters','_storyChapter','storyDesignBible'])delete settings[field];
      const previous=structuredClone(session);
      busy=true;
      try {
        // Preserve the previous collection and its files before replacing the active job.
        await storeExportBlob(`story-history:${previous.id}`,previous);
        await chrome.storage.local.set({bb_tg_bot_token:String(params.tgBotToken||''),bb_tg_chat_id:String(params.tgChatId||'')});
        session={id:crypto.randomUUID(),status:'running',settings,designBible:{},pdf:null,chapters};
        STATE.stopRequested=false;STATE.retryHandler=null;await persist();
      } catch(error) {session=previous;busy=false;throw error;}
      broadcastQueue([]);setProgress(0);setStatus('Starting fresh from the current chapter…');
      run().catch(fatal);return {ok:true,session:view()};
    }
    if(['bb_story_panel_save','bb_story_panel_preview'].includes(message.type)) {
      const chapter=session.chapters.find(c=>c.id===message.chapterId),panel=chapter?.panels[Number(message.index)-1];
      if(panel?.status!=='done'||!panel.blobKey)throw Error('This saved panel is unavailable.');
      const blob=await readExportBlob(panel.blobKey);
      if(message.type==='bb_story_panel_preview')return {ok:true,dataUrl:await blobToDataUrl(blob)};
      await downloadLargeBlob(blob,`Story-Studio/chapter-${session.chapters.indexOf(chapter)+1}-panel-${message.index}.${blob.type==='image/jpeg'?'jpg':'png'}`,true);return {ok:true};
    }
    if(message.type==='bb_story_append') {
      if(session.status==='done'||session.status==='exporting')throw Error('This collection is complete. Start a new story collection.');
      const incoming=Array.isArray(message.chapters)?message.chapters:[];
      if(!incoming.length||session.chapters.length+incoming.length>4)throw Error('A collection holds the current chapter plus 3 extra chapters.');
      const added=incoming.map((entry,index)=>sources({shortPrompt:entry.source,storyTitle:entry.title||`Chapter ${session.chapters.length+index+1}`})[0]);
      session.chapters.push(...added);await persist();return {ok:true,session:view()};
    }
    if(message.type==='bb_story_resume') {
      if(busy||STATE.running)throw Error('Generation is already running.');
      if(session.status==='done')return {ok:true,session:view()};
      const unknown=session.chapters.flatMap(c=>c.panels).filter(p=>p.status==='outcome_unknown');
      if(unknown.length&&!message.confirmUnknown)throw Error('A request was interrupted before Google confirmed the result. Check Flow, then use “Retry unconfirmed panels” if you want to submit those panels again.');
      const heightUpdates=new Map();
      if(message.storyCharacterHeights!==undefined) {
        if(!Array.isArray(message.storyCharacterHeights))throw Error('Invalid Story character heights.');
        for(const update of message.storyCharacterHeights) {
          if(!update||typeof update.id!=='string'||typeof update.height!=='string'||update.height.length>120)throw Error('Invalid Story character height.');
          if(heightUpdates.has(update.id))throw Error('Duplicate Story character height.');
          heightUpdates.set(update.id,update.height.trim());
        }
      }
      if(Object.prototype.hasOwnProperty.call(message,'figureReference')) {
        const figure=message.figureReference?FigureReference.record(message.figureReference):null;
        if(message.figureReference&&!figure)throw Error('Choose a valid figure reference image under 8 MB.');
        const target=String(message.storyFigureCharacterId||'');
        if(figure&&!session.settings.storyCharacters?.some(character=>character.id===target))throw Error('Choose a figure character from this saved Story cast before resuming.');
        // Apply the current shared image to unfinished work; keep the saved plan and panels.
        session.settings.figureReference=figure;
        session.settings.storyFigureCharacterId=target;
      }
      // Match saved identities by ID. Editing a height affects unfinished work,
      // never substitutes a new cast or discards completed images/the saved plan.
      for(const character of session.settings.storyCharacters||[])if(heightUpdates.has(character.id))character.height=heightUpdates.get(character.id);
      if(message.confirmUnknown)for(const p of unknown){p.status='queued';delete p.generation;}
      STATE.stopRequested=false;session.status='running';delete session.error;busy=true;
      try {await persist();}catch(error){busy=false;session.status='paused';throw error;}
      run().catch(fatal);return {ok:true,session:view()};
    }
    if(message.type==='bb_story_pdf_save') {
      if(!session.pdf)throw Error('Complete all queued chapters first.');
      const blob=await readExportBlob(session.pdf.key);await downloadLargeBlob(blob,session.pdf.filename,true);return {ok:true};
    }
    if(message.type==='bb_story_pdf_send') {
      if(!session.pdf)throw Error('Complete all queued chapters first.');
      if(busy)throw Error('Wait for the story to finish.');
      await deliverPdf(await readExportBlob(session.pdf.key));return {ok:true,session:view()};
    }
    throw Error('Unknown story action.');
  }
  return {start,init,view,handle,savePlan,saveDraft,checkpoint,savePanel,get busy(){return busy;}};
})();
