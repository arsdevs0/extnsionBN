/* One owner per composer; native requests may finish concurrently. */
const FlowNative = (() => {
  const tabs = new Map();
  const helperVersion='4.5.8';
  let persistenceTail=Promise.resolve();
  function trace(id,event,detail={}) {if(typeof log==='function')log(`[Flow ${id.slice(0,8)}] ${event}: ${JSON.stringify(detail)}`);}
  function saveFailure(report) {
    if(!chrome.storage?.local)return Promise.resolve();
    const pending=persistenceTail.catch(()=>{}).then(async()=>{
      const stored=await chrome.storage.local.get('bb_flow_diagnostics');
      const previous=Array.isArray(stored.bb_flow_diagnostics)?stored.bb_flow_diagnostics:[];
      await chrome.storage.local.set({bb_flow_diagnostics:[...previous.slice(-19),report]});
    });
    persistenceTail=pending;
    return pending.catch(()=>trace(report.traceId,'diagnostic_save_failed'));
  }
  const unsent = message => Object.assign(Error(message), {code:'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:true});
  async function call(tabId, method, value) {
    // Chrome rejects undefined values in scripting.executeScript args.
    const args=value===undefined?[method]:[method,value];
    const results = await chrome.scripting.executeScript({target:{tabId},world:'MAIN',
      func:(method,value)=>window.GucFlowNative?.[method]?.(value),args});
    return results?.[0]?.result;
  }
  async function refreshAssets(flow, state, tabId) {
    if ((flow.referenceRevision || 0) === (flow.nativeAssetRevision || 0)) return;
    let releaseUploads;
    flow.nativeAssetRefresh = new Promise(resolve => { releaseUploads=resolve; });
    try {
      // Never reload a page with pending generations or uploads. New uploads
      // wait here so their completed asset cannot miss hydration.
      const deadline=Date.now()+240000;
      while(state.pending.size || flow.nativeUploadCount) {
        await FlowRequestGuard.ready();
        if(Date.now()>deadline)throw unsent('Flow is still finishing its assets. Resume after it finishes.');
        await sleep(300);
      }
      await FlowRequestGuard.ready();
      const tab=await chrome.tabs.get(tabId),url=new URL(tab.url||tab.pendingUrl);
      if(url.origin!=='https://flow.google.com'||url.pathname.match(/\/project\/([^/]+)/)?.[1]!==flow.projectId)throw unsent('Flow project changed before loading references.');
      await chrome.tabs.reload(tabId);
      const loadedBy=Date.now()+45000;
      while(Date.now()<loadedBy) {
        await FlowRequestGuard.ready();
        const current=await chrome.tabs.get(tabId);
        if(current.url!==url.href)throw unsent('Flow project changed while loading references.');
        if(current.status==='complete') {flow.nativeAssetRevision=flow.referenceRevision;return;}
        await sleep(300);
      }
      throw unsent('Flow references did not finish loading. Resume to try again.');
    } finally {
      delete flow.nativeAssetRefresh;
      releaseUploads();
    }
  }
  async function generate(flow, prompt, images, model, aspect, context={}) {
    prompt=String(prompt||'').trim();
    const tabId=flow.tabId||flow.authTabId,id=crypto.randomUUID();
    if(!tabs.has(tabId))tabs.set(tabId,{tail:Promise.resolve(),pending:new Set(),uncertain:false,users:0});
    const state=tabs.get(tabId),previous=state.tail;
    let release,settle;
    const gate=new Promise(resolve=>{release=resolve;}),finished=new Promise(resolve=>{settle=resolve;});
    state.tail=gate;state.users++;
    let clicked=false,submitted=false,started=false,released=false,lastEvent=0,lastStatus=null;
    const events=[];
    const receive=status=>{
      if(!status)return;
      lastStatus=status;
      for(const event of status.events||[]) {
        if(event.seq<=lastEvent)continue;
        lastEvent=event.seq;events.push(event);
        if(events.length>200)events.shift();
        trace(id,event.step,{image:context.imageIndex||null,attempt:context.attempt||null,...event.detail});
      }
    };
    const unlock=()=>{if(!released){released=true;release();}};
    try {
      await previous;
      await FlowRequestGuard.ready();
      if(flow.nativeReferenceFailure)throw Object.assign(unsent(`Reference preparation paused after trace ${flow.nativeReferenceFailure.traceId.slice(0,8)}. No new Generate action was taken.`),{code:'FLOW_REFERENCE_BATCH_PAUSED',noRetry:true});
      if(state.uncertain)throw unsent('A previous Flow click is unconfirmed. Inspect its project before Resume.');
      const references=(images||[]).map(image=>{
        const fileName=flow.referenceFiles?.[image.name];
        if(!fileName)throw unsent('This panel reference has no native Flow asset mapping. Resume to reload its references.');
        return {mediaId:image.name,fileName,assetId:flow.referenceAssets?.[image.name]?.assetId||null};
      });
      const config={id,projectId:flow.projectId,prompt,model,
        modelLabel:({BELUGA:'Nano Banana 2.1',GEM_PIX_2:'Nano Banana Pro',HARBOR_SEAL:'Nano Banana 2 Lite'})[model],
        aspect,aspectCode:({'1:1':1,'9:16':2,'16:9':3,'3:4':4,'4:3':5})[aspect],references};
      if(!config.modelLabel||!config.aspectCode)throw unsent('Unsupported native Flow model or aspect ratio.');
      trace(id,'composer_queued',{image:context.imageIndex||null,attempt:context.attempt||null,projectId:flow.projectId,model,aspect,expected:references});
      await refreshAssets(flow,state,tabId);
      await chrome.scripting.executeScript({target:{tabId},world:'MAIN',files:['content_flow_native.js']});
      const observedVersion=await call(tabId,'version');
      trace(id,'helper_version',{expected:helperVersion,observed:observedVersion||'unversioned'});
      if(observedVersion!==helperVersion)throw Object.assign(unsent('The Flow tab has an older helper. Reload the idle Flow project before Retry.'),{code:'FLOW_HELPER_OUTDATED',noRetry:true});
      await FlowRequestGuard.ready();
      started=true;
      state.pending.add(finished);
      const launched=await call(tabId,'begin',config);
      if(!launched?.ok)throw unsent(launched?.error||'Native Flow composer is unavailable.');
      const deadline=Date.now()+240000;
      while(Date.now()<deadline) {
        const status=await call(tabId,'status',{id,afterEvent:lastEvent});
        if(!status)throw Error('Native Flow page restarted before its response was confirmed.');
        receive(status);
        clicked=clicked||status.clicked;submitted=submitted||status.submitted;
        if(submitted)unlock();
        if(status.stage==='failed')throw Object.assign(Error(status.error),{code:status.code,notSubmitted:status.notSubmitted,noRetry:status.noRetry,diagnostics:status.diagnostics});
        if(status.stage==='done') {
          if(status.httpStatus<200||status.httpStatus>=300)throw Error('Native Flow HTTP '+status.httpStatus+': '+BigBombFlowRpc.summarizeHttpFailure(status.text||''));
          let result;
          try {result=BigBombFlowRpc.parseGenerationResponse(status.text);}
          catch(error) {
            // A missing or changed response schema does not prove rejection.
            if(/no usable image|malformed JSON|rpc-row=missing|NO_PAYLOAD/i.test(error.message))error.code='FLOW_GENERATION_OUTCOME_UNKNOWN';
            throw error;
          }
          trace(id,'generation_confirmed',{image:context.imageIndex||null,mediaId:result.mediaId});
          return {...result,transport:'native-ui'};
        }
        if(status.stage==='ready') {
          await FlowRequestGuard.admit('IMAGE_GENERATION');
          const sent=await call(tabId,'submit',id);
          if(!sent?.ok)throw Error(sent?.error||'Flow did not acknowledge the Generate action.');
        }
        // Another worker may stop the run while this composer is preparing.
        if(!clicked) {
          try {await FlowRequestGuard.ready();}catch {await call(tabId,'cancel',id);}
          if(STATE.stopRequested)await call(tabId,'cancel',id);
        }
        await sleep(300);
      }
      throw Error('Native Flow did not confirm its result within 4 minutes. Inspect Flow before retrying.');
    } catch(error) {
      await FlowRequestGuard.rejected(error);
      if(!error.code)error.code=started?'FLOW_GENERATION_OUTCOME_UNKNOWN':'FLOW_REQUEST_NOT_SUBMITTED';
      if(!started)error.notSubmitted=true;
      if(error.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'&&!submitted)state.uncertain=true;
      if(error.code==='FLOW_REFERENCE_MISMATCH')flow.nativeReferenceFailure={traceId:id};
      error.traceId=id;
      if(error.code!=='FLOW_REFERENCE_BATCH_PAUSED') {
        const diagnostics=error.diagnostics||lastStatus?.diagnostics||null;
        trace(id,'failure_evidence',{image:context.imageIndex||null,attempt:context.attempt||null,code:error.code,clicked,submitted,diagnostics});
        await saveFailure({traceId:id,version:helperVersion,time:new Date().toISOString(),projectId:flow.projectId,image:context.imageIndex||null,attempt:context.attempt||null,code:error.code,clicked,submitted,diagnostics,events});
      }
      throw error;
    } finally {
      if(started&&!clicked) {
        await call(tabId,'cancel',id).catch(()=>{});
        // Cancellation must drain before another panel owns the editor.
        for(let i=0;i<25;i++) {
          const status=await call(tabId,'status',id).catch(()=>null);
          if(!status||status.stage==='failed'||status.submitted)break;
          await sleep(100);
        }
      }
      if(started)await call(tabId,'forget',id).catch(()=>{});
      state.pending.delete(finished);settle();unlock();state.users--;
      if(!state.users&&!state.uncertain)tabs.delete(tabId);
    }
  }
  return {generate};
})();
