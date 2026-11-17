/* Backend image requests use confirmed upload IDs directly, never UI chips. */
const FlowBackend=(()=>{
  // Wire protocol is unchanged; keep existing page jobs compatible during reload.
  const version='4.5.9';
  async function call(tabId,method,value) {
    // Chrome rejects an undefined entry in args before executing the function.
    // Methods such as version take no value, so omit that argument entirely.
    const args=value===undefined?[method]:[method,value];
    const r=await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:(method,value)=>window.GucFlowBackend?.[method]?.(value),args});
    return r?.[0]?.result;
  }
  async function generate(flow,prompt,images,model,aspect,context={}) {
    const id=crypto.randomUUID(),tabId=flow.tabId||flow.authTabId,events=[];
    const emit=(step,detail={})=>events.push(FlowDiagnostics.record(id,step,{image:context.imageIndex||null,attempt:context.attempt||null,...detail}));
    const referenceIds=(images||[]).map(image=>image.name);
    const expected=referenceIds.map(mediaId=>({mediaId,fileName:flow.referenceFiles?.[mediaId]||null,assetId:flow.referenceAssets?.[mediaId]?.assetId||null}));
    let started=false,submitted=false,last=null,stage='',sentLogged=false;
    const save=(code,extra={})=>FlowDiagnostics.save({traceId:id,time:new Date().toISOString(),projectId:flow.projectId,image:context.imageIndex||null,attempt:context.attempt||null,code,submitted,expected,events,...extra});
    try {
      await FlowRequestGuard.ready();
      if(!Number.isInteger(tabId))throw Object.assign(Error('No Flow background tab is available for this project.'),{code:'FLOW_REQUEST_NOT_SUBMITTED',noRetry:true});
      if(referenceIds.some(mediaId=>!mediaId||!flow.referenceFiles?.[mediaId]))throw Object.assign(Error('A reference has no confirmed backend upload mapping.'),{code:'FLOW_REFERENCE_MAPPING_MISSING',noRetry:true});
      emit('backend_preparing',{version,projectId:flow.projectId,model,aspect,promptCharacters:String(prompt).length,expected});
      await chrome.scripting.executeScript({target:{tabId},world:'MAIN',files:['content_flow_backend.js']});
      const helper=await call(tabId,'version');
      if(helper!==version)throw Object.assign(Error('Backend transport version mismatch; reload the idle Flow project.'),{code:'FLOW_HELPER_OUTDATED',noRetry:true});
      // Minting the challenge can take several seconds. Pace at dispatch, not
      // token-mint start, otherwise the token duration shortens the real gap.
      const token=await mintFlowRecaptchaToken(tabId,'IMAGE_GENERATION',{deferAdmission:true});
      await FlowRequestGuard.ready();
      const aspectCode=({'1:1':1,'9:16':2,'16:9':3,'3:4':4,'4:3':5})[aspect];
      const body=BigBombFlowRpc.buildGenerationRequest({projectId:flow.projectId,prompt:String(prompt).trim(),model,aspectCode,referenceIds,challengeToken:token,seed:Math.floor(100000+Math.random()*(2**31-100000)),requestId:crypto.randomUUID().toUpperCase(),clientId:crypto.randomUUID().toUpperCase(),batchId:id.toUpperCase()});
      emit('backend_payload_ready',{rpc:'ogiZ0b',referenceIds,aspectCode,oneImage:true,outerContext:true});
      await FlowRequestGuard.admit('IMAGE_GENERATION');
      await FlowRequestGuard.ready();
      // Once begin is invoked its outcome may be unknown if the tab disappears.
      started=true;submitted=null;
      const result=await call(tabId,'begin',{id,projectId:flow.projectId,body});
      if(!result?.ok)throw Error(result?.error||'Backend did not acknowledge the request start.');
      const deadline=Date.now()+250000;
      while(Date.now()<deadline) {
        last=await call(tabId,'status',id);
        if(!last)throw Error('Backend observer disappeared before confirming the response.');
        submitted=last.submitted===true;
        if(submitted&&!sentLogged){sentLogged=true;emit('backend_request_sent',{rpc:'ogiZ0b',sentAt:last.sentAt,authIndex:last.authIndex,session:last.session,referenceIds});}
        if(last.stage!==stage){stage=last.stage;if(stage==='preparing')emit('backend_session_check',{session:last.session});}
        if(last.stage==='failed')throw Object.assign(Error(last.error),{code:last.code,notSubmitted:!last.submitted,noRetry:!!last.submitted});
        if(last.stage==='response_received') {
          emit('backend_response_received',{httpStatus:last.httpStatus,receivedAt:last.receivedAt,responseCharacters:last.text?.length||0});
          if(last.httpStatus<200||last.httpStatus>=300)throw Object.assign(Error(`Flow backend HTTP ${last.httpStatus}: ${BigBombFlowRpc.summarizeHttpFailure(last.text||'')}`),{code:[400,401,403,404,429].includes(last.httpStatus)?'FLOW_GENERATION_REJECTED':'FLOW_GENERATION_OUTCOME_UNKNOWN',noRetry:last.httpStatus!==429});
          let output;
          try{output=BigBombFlowRpc.parseGenerationResponse(last.text||'');}catch(error){
            if(/no usable image|malformed JSON|rpc-row=missing|NO_PAYLOAD/i.test(error.message))error.code='FLOW_GENERATION_OUTCOME_UNKNOWN';
            error.noRetry=!FlowRetry.decision(error).retry;throw error;
          }
          emit('generation_confirmed',{mediaId:output.mediaId,transport:'backend-rpc'});
          await save('FLOW_GENERATION_CONFIRMED',{mediaId:output.mediaId});
          return {...output,transport:'backend-rpc'};
        }
        if(STATE.stopRequested) {
          await call(tabId,'cancel',id).catch(()=>{});
          throw Object.assign(Error(submitted?'Stopped waiting. This request already reached Flow; check the project before resubmitting.':'Generation stopped before Flow submission.'),{code:submitted?'FLOW_GENERATION_OUTCOME_UNKNOWN':'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:!submitted,noRetry:true});
        }
        await sleep(300);
      }
      throw Error('Backend response was not confirmed before timeout.');
    }catch(error){
      if(!started&&/Value is unserializable/i.test(error.message)) {
        error.code='FLOW_SCRIPT_ARGUMENT_INVALID';error.noRetry=true;
      }
      if(!error.code)error.code=started?'FLOW_GENERATION_OUTCOME_UNKNOWN':'FLOW_REQUEST_NOT_SUBMITTED';
      if(!started)error.notSubmitted=true;
      if(error.code==='FLOW_GENERATION_OUTCOME_UNKNOWN')error.noRetry=true;
      await FlowRequestGuard.rejected(error);
      error.traceId=id;
      emit('backend_failed',{code:error.code,submitted,stage:last?.stage||(started?'dispatch_unconfirmed':'before_submission'),reason:String(error.message).slice(0,1600)});
      await save(error.code);
      throw error;
    }finally{if(started)await call(tabId,'forget',id).catch(()=>{});}
  }
  return {generate};
})();
