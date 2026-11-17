/* Serialize the native file picker while backend generations remain independent. */
const FlowPageUpload=(()=>{
  const queues=new WeakMap(),uploadTabs=new WeakMap();
  async function getUploadTab(flow) {
    await FlowRequestGuard.ready();
    if(!/^\d+$/.test(String(flow.accountIndex??''))||!flow.projectId)throw Error('The original Flow account/project is unavailable. Resume the run to reconnect.');
    const path=`/u/${flow.accountIndex}/project/${encodeURIComponent(flow.projectId)}`;
    const matches=tab=>{try{const url=new URL(tab.url);return url.origin==='https://flow.google.com'&&url.pathname.replace(/\/$/,'')===path;}catch{return false;}};
    const existing=uploadTabs.get(flow);
    if(existing) {
      const tab=await chrome.tabs.get(existing).catch(error=>{
        if(/No tab with id\b|Invalid tab ID\b|tab (?:was|has been) closed/i.test(error.message))return null;
        throw error;
      });
      if(tab?.status==='complete'&&matches(tab))return existing;
      if(tab)throw Error('The dedicated Flow upload tab changed or is still loading. Restore that project before retrying.');
      uploadTabs.delete(flow);
    }
    let fresh;
    try {
      fresh=await chrome.tabs.create({url:`https://flow.google.com${path}`,active:false});
      if(!Number.isInteger(fresh?.id))throw Error('Chrome did not create the fresh Flow upload tab.');
      await FlowRequestGuard.ready();
      await chrome.tabs.update(fresh.id,{autoDiscardable:false});
      const deadline=Date.now()+45000;
      while(true) {
        await FlowRequestGuard.ready();
        const tab=await chrome.tabs.get(fresh.id);
        if(tab.status==='complete') {
          if(!matches(tab))throw Error('The fresh upload tab did not open the original signed-in Flow project.');
          break;
        }
        if(Date.now()>=deadline)throw Error('The fresh Flow upload tab did not finish loading.');
        await interruptibleWait(250);
      }
      await waitForGenerationOperation(checkFlowCompatibility(fresh.id));
      await FlowRequestGuard.ready();
      uploadTabs.set(flow,fresh.id);
      log(`Third upload attempt: fresh Flow tab ${fresh.id} ready in the same account/project. Later native reference uploads will reuse it.`);
      return fresh.id;
    } catch(error) {
      if(Number.isInteger(fresh?.id)) {
        FLOW_DYNAMIC_SITE_KEYS.delete(fresh.id);
        await chrome.tabs.remove(fresh.id).catch(()=>{});
      }
      throw error;
    }
  }
  async function call(tabId,method,value) {
    const result=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:(method,value)=>window.GucFlowUpload?.[method]?.(value),args:[method,value]});
    return result?.[0]?.result;
  }
  async function perform(flow,dataUrl,fileName) {
    const id=makeFlowId(),events=[];let tabId,invoked=false,last;
    const emit=(step,detail={})=>events.push(FlowDiagnostics.record(id,step,{rpc:'maseQ',projectId:flow.projectId,fileName,transport:'flow-file-picker',...detail}));
    try {
      await FlowRequestGuard.ready();
      const image=await BigBombFlowRpc.prepareUploadImage(dataUrl,fileName,{preserveOriginal:true});
      image.fileName=image.fileName.replace(/(\.[^.]+)$/,`__${id}$1`);
      // Keep the original tab and any in-flight generations intact. Only the
      // native upload moves to this separate tab of the same project/account.
      tabId=await getUploadTab(flow);
      await chrome.scripting.executeScript({target:{tabId},world:'MAIN',files:['content_flow_upload.js']});
      await FlowRequestGuard.ready();
      emit('native_upload_preparing',{tabId,dedicatedUploadTab:true});
      invoked=true;
      const result=await call(tabId,'begin',{id,projectId:flow.projectId,fileName:image.fileName,dataUrl:`data:${image.mimeType};base64,${image.imageBytes}`});
      if(!result?.ok)throw Object.assign(Error(result?.error||'Flow did not acknowledge the upload handoff.'),{code:result?.ok===false?'FLOW_UPLOAD_UI_UNAVAILABLE':'FLOW_UPLOAD_OUTCOME_UNKNOWN'});
      const deadline=Date.now()+125000;let stage;
      while(Date.now()<deadline) {
        last=await call(tabId,'status',id);
        if(!last)throw Error('The Flow upload observer disappeared.');
        if(last.stage!==stage){stage=last.stage;emit('native_upload_progress',{stage,submitted:last.submitted,handedOff:last.handedOff,page:last.page});}
        if(last.stage==='failed')throw Object.assign(Error(last.error),{code:last.code});
        if(last.stage==='response_received') {
          if(last.httpStatus!==200)throw Object.assign(Error(`Flow file upload HTTP ${last.httpStatus}.`),{code:last.httpStatus===401||last.httpStatus===403?'FLOW_AUTH_REQUIRED':'FLOW_UPLOAD_FAILED'});
          const uploaded=BigBombFlowRpc.parseUploadResponse(last.text||'',flow.projectId),mediaId=uploaded.mediaId;
          const storedName=uploaded.fileName||image.fileName;
          (flow.referenceFiles||=Object.create(null))[mediaId]=storedName;
          (flow.referenceAssets||=Object.create(null))[mediaId]={...uploaded,fileName:storedName,requestedFileName:image.fileName};
          flow.referenceRevision=(flow.referenceRevision||0)+1;
          emit('native_upload_confirmed',{mediaId,assetId:uploaded.assetId});
          await FlowDiagnostics.save({traceId:id,kind:'upload',projectId:flow.projectId,code:'FLOW_UPLOAD_CONFIRMED',submitted:true,events});
          return mediaId;
        }
        if(STATE.stopRequested){await call(tabId,'cancel',id);last=await call(tabId,'status',id);throw Object.assign(Error(last?.error||'Stopped waiting for Flow upload.'),{code:last?.code||'FLOW_UPLOAD_OUTCOME_UNKNOWN'});}
        await sleep(250);
      }
      throw Error('Flow upload was not confirmed before timeout.');
    } catch(error) {
      if(!error.code)error.code=invoked?'FLOW_UPLOAD_OUTCOME_UNKNOWN':'FLOW_UPLOAD_UI_UNAVAILABLE';
      error.noRetry=true;
      if(!invoked||last?.handedOff===false)error.notSubmitted=true;
      emit('native_upload_failed',{code:error.code,submitted:last?.submitted??(invoked?null:false),reason:error.message,page:last?.page});
      await FlowDiagnostics.save({traceId:id,kind:'upload',projectId:flow.projectId,code:error.code,events});
      throw error;
    } finally {
      if(invoked) {
        await call(tabId,'cancel',id).catch(()=>{});
        await call(tabId,'forget',id).catch(()=>{});
      }
    }
  }
  async function upload(flow,dataUrl,fileName) {
    const previous=queues.get(flow)||Promise.resolve();
    const pending=previous.catch(()=>{}).then(()=>perform(flow,dataUrl,fileName));
    queues.set(flow,pending);
    try{return await pending;}finally{if(queues.get(flow)===pending)queues.delete(flow);}
  }
  return {upload};
})();
