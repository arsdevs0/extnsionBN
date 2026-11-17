/* Backend transport only: no composer, picker, focus, keyboard or pointer actions. */
(()=>{
  if(window.GucFlowBackend?.version() === '4.5.9')return;
  const jobs=new Map(),version='4.5.9';
  async function send(job) {
    let timer;
    try {
      const pageProject=location.pathname.match(/\/project\/([^/]+)/)?.[1];
      if(location.origin!=='https://flow.google.com'||pageProject!==job.projectId)throw Error('Flow project changed before backend submission.');
      const wiz=window.WIZ_global_data||{};
      const at=typeof wiz.SNlM0e==='string'?wiz.SNlM0e:'';
      const bl=typeof wiz.cfb2h==='string'?wiz.cfb2h:'';
      const sid=wiz.FdrFJe!=null?String(wiz.FdrFJe):'';
      job.session={hasAt:!!at,hasBuild:!!bl,hasSession:!!sid};
      if(!at||!bl||!sid)throw Error('Flow backend session metadata is incomplete.');
      if(job.cancelled)throw Error('Generation stopped before Flow submission.');
      const authIndex=location.pathname.match(/\/u\/(\d+)/)?.[1]||'0';
      const query=new URLSearchParams({rpcids:'ogiZ0b','source-path':`/u/${authIndex}/`,bl,'f.sid':sid,hl:'en',_reqid:String(Math.floor(100000+Math.random()*900000)),rt:'c'});
      const form=new URLSearchParams({'f.req':job.body,at});
      const controller=new AbortController();job.controller=controller;timer=setTimeout(()=>controller.abort(),240000);
      job.stage='request_sent';job.submitted=true;job.sentAt=new Date().toISOString();job.authIndex=authIndex;
      const pending=fetch(`/u/${authIndex}/_/AiSandboxAngularFrontend/data/batchexecute?${query}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','X-Same-Domain':'1'},body:form.toString(),signal:controller.signal});
      delete job.body;
      const response=await pending;
      job.httpStatus=response.status;
      job.text=await response.text();job.receivedAt=new Date().toISOString();job.stage='response_received';
    }catch(error){
      delete job.body;job.stage='failed';
      job.error=job.submitted?'Backend request ended without a confirmed response.':String(error.message||error);
      job.code=job.submitted?'FLOW_GENERATION_OUTCOME_UNKNOWN':'FLOW_REQUEST_NOT_SUBMITTED';
    }finally{
      clearTimeout(timer);delete job.controller;
      // If the worker disappears, don't keep completed responses in page memory.
      setTimeout(()=>jobs.delete(job.id),60000);
    }
  }
  window.GucFlowBackend={
    version:()=>version,
    begin(config){if(jobs.has(config.id))return {error:'Duplicate backend trace ID.'};const job={...config,stage:'preparing',submitted:false};jobs.set(job.id,job);send(job);return {ok:true};},
    status(id){const j=jobs.get(id);return j?{version,stage:j.stage,submitted:j.submitted,session:j.session,authIndex:j.authIndex,sentAt:j.sentAt,receivedAt:j.receivedAt,httpStatus:j.httpStatus,text:j.text,error:j.error,code:j.code}:null;},
    cancel(id){const j=jobs.get(id);if(j){j.cancelled=true;j.controller?.abort();}},
    forget(id){const j=jobs.get(id);if(j&&['failed','response_received'].includes(j.stage))jobs.delete(id);}
  };
})();
