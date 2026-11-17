/* Use Flow's file picker/validation/upload pipeline; observe only our own file. */
(()=>{
  if(window.GucFlowUpload)return;
  const jobs=new Map();let active=null;
  const visible=el=>el?.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  const label=el=>(el.getAttribute('aria-label')||el.textContent||'').replace(/\s+/g,' ').trim();
  const isAddMedia=el=>/^(?:add media(?: menu)?|add image|add images|add to prompt)$/i.test(label(el));
  const usable=el=>visible(el)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true';
  function pageState() {
    const missing=/\/404\/?$/.test(location.pathname)&&new URLSearchParams(location.search).get('reason')==='project'
      ||[...document.querySelectorAll('h1,[role="heading"]')].some(el=>visible(el)&&/^project not found\.?$/i.test(el.textContent.trim()));
    return {path:location.pathname,state:missing?'project_not_found':'project',
      addMediaControlFound:[...document.querySelectorAll('button,[role="button"]')].some(el=>usable(el)&&isAddMedia(el)),
      uploadControlFound:Boolean(uploadButton())};
  }
  function uploadButton() {
    const buttons=[...document.querySelectorAll('button,[role="button"],[role="menuitem"]')].filter(usable);
    const uploads=buttons.filter(el=>el.matches('.upload-button')||/^(?:upload|upload files|upload images?|upload media)$/i.test(label(el))||[...el.querySelectorAll('mat-icon')].some(icon=>icon.textContent.trim()==='upload'));
    const projectUploads=uploads.filter(el=>el.closest('flow-media-upload')||el.matches('.upload-button'));
    return projectUploads.length===1?projectUploads[0]:uploads.length===1?uploads[0]:null;
  }
  async function waitForUploadControl(job) {
    // Document load/WIZ session readiness precede Angular's project controls.
    // Never fail a fresh tab on a single DOM read or arm the file hook while waiting.
    const deadline=Date.now()+20000,opened=new WeakSet();
    job.stage='waiting_for_upload_control';
    while(Date.now()<deadline) {
      if(job.stage==='failed')return null;
      job.page=pageState();
      if(job.page.state==='project_not_found')throw Object.assign(Error('Flow says Project not found in the selected account. The reference was not sent. Check the Flow account, then Resume the saved story.'),{code:'FLOW_PROJECT_UNAVAILABLE'});
      if(!sameProject(job))throw Error('The Flow project changed before reference upload.');
      const button=uploadButton();
      if(button)return button;
      const add=[...document.querySelectorAll('button,[role="button"]')].find(el=>usable(el)&&!opened.has(el)&&isAddMedia(el));
      if(add){opened.add(add);if(add.getAttribute('aria-expanded')!=='true')add.click();}
      await new Promise(resolve=>setTimeout(resolve,150));
    }
    throw Error('Flow Upload control did not become ready in this project. Open the project, finish any loading/sign-in dialog, then Resume the saved story.');
  }
  function sameProject(job) {
    return location.origin==='https://flow.google.com'&&location.pathname.match(/\/project\/([^/]+)/)?.[1]===job.projectId;
  }
  function fail(job,message,code) {
    if(job.stage==='response_received'||job.stage==='failed')return;
    job.stage='failed';job.error=message;
    job.code=code||(job.handedOff?'FLOW_UPLOAD_OUTCOME_UNKNOWN':'FLOW_UPLOAD_UI_UNAVAILABLE');
    job.cleanup?.();
  }
  function matches(job,url,body) {
    try {
      const target=new URL(typeof url==='string'?url:url.url,location.href);
      if(target.origin!==location.origin||!target.pathname.endsWith('/data/batchexecute'))return false;
      const value=body instanceof URLSearchParams?body.get('f.req'):typeof body==='string'?new URLSearchParams(body).get('f.req'):null;
      return JSON.parse(value||'[]').some(batch=>Array.isArray(batch)&&batch.some(row=>{
        if(row?.[0]!=='maseQ')return false;
        const payload=JSON.parse(row[1]);
        return payload?.[0]?.[5]===job.projectId&&payload[8]===job.fileName;
      }));
    }catch{return false;}
  }
  function observe(job) {
    const originalFetch=window.fetch,originalOpen=XMLHttpRequest.prototype.open,originalSend=XMLHttpRequest.prototype.send;
    const urls=new WeakMap();
    function sent(){job.submitted=true;job.stage='request_sent';job.sentAt=new Date().toISOString();}
    function received(status,text){
      if(job.stage==='failed')return;
      job.httpStatus=status;job.text=text;job.receivedAt=new Date().toISOString();job.stage='response_received';job.cleanup?.();
    }
    const fetchWrapper=function(input,init){
      const ours=matches(job,input,init?.body);
      if(ours)sent();
      let result;
      try{result=originalFetch.apply(this,arguments);}catch(error){if(ours)fail(job,'Flow upload ended without a response.');throw error;}
      if(ours)result.then(async response=>{try{received(response.status,await response.clone().text());}catch{fail(job,'Flow upload response could not be read.');}},()=>fail(job,'Flow upload ended without a response.'));
      return result;
    };
    const openWrapper=function(method,url){urls.set(this,url);return originalOpen.apply(this,arguments);};
    const sendWrapper=function(body){
      if(matches(job,urls.get(this),body)) {
        sent();this.addEventListener('loadend',()=>{
          try{if(!this.status)fail(job,'Flow upload ended without a response.');else received(this.status,this.responseText);}catch{fail(job,'Flow upload response could not be read.');}
        },{once:true});
      }
      return originalSend.apply(this,arguments);
    };
    window.fetch=fetchWrapper;XMLHttpRequest.prototype.open=openWrapper;XMLHttpRequest.prototype.send=sendWrapper;
    return ()=>{
      if(window.fetch===fetchWrapper)window.fetch=originalFetch;
      if(XMLHttpRequest.prototype.open===openWrapper)XMLHttpRequest.prototype.open=originalOpen;
      if(XMLHttpRequest.prototype.send===sendWrapper)XMLHttpRequest.prototype.send=originalSend;
    };
  }
  async function start(job) {
    const originalClick=HTMLInputElement.prototype.click;
    let pickerClick,restoreObserver=()=>{},timer;
    job.cleanup=()=>{
      clearTimeout(timer);
      if(HTMLInputElement.prototype.click===pickerClick)HTMLInputElement.prototype.click=originalClick;
      restoreObserver();if(active===job)active=null;
      delete job.dataUrl;
      setTimeout(()=>jobs.delete(job.id),60000);
    };
    try {
      if(!sameProject(job))throw Error('The original Flow project must be open for file upload.');
      const match=job.dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/i);
      if(!match)throw Error('Native upload needs validated JPEG, PNG or WebP bytes.');
      const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
      let file=new File([bytes],job.fileName,{type:match[1]});delete job.dataUrl;
      restoreObserver=observe(job);
      pickerClick=function(){
        if(this.type!=='file'||job.handedOff)return originalClick.apply(this,arguments);
        // Only the file input synchronously created by the selected Upload action.
        if(job.stage!=='opening_picker'||!sameProject(job))throw Error('Flow file picker context changed.');
        job.handedOff=true;job.stage='file_handed_to_flow';
        const transfer=new DataTransfer();transfer.items.add(file);file=null;
        this.files=transfer.files;
        HTMLInputElement.prototype.click=originalClick;
        this.dispatchEvent(new Event('change',{bubbles:true}));
      };
      timer=setTimeout(()=>fail(job,job.handedOff?'Flow has the reference but no upload response was confirmed. Check this project for an upload dialog or result before retrying.':'Flow did not open its upload control.'),120000);
      const button=await waitForUploadControl(job);
      if(job.stage==='failed'||!button)return;
      job.stage='opening_picker';HTMLInputElement.prototype.click=pickerClick;
      button.click();
      // Current Flow creates and clicks its file input synchronously. Never
      // leave a file-picker hook armed for an unrelated later user action.
      if(!job.handedOff)throw Error('Flow did not open the expected file picker. Open its Upload control and retry.');
    }catch(error){fail(job,error.message,error.code);}
    finally{if(HTMLInputElement.prototype.click===pickerClick)HTMLInputElement.prototype.click=originalClick;}
  }
  window.GucFlowUpload={
    begin(config){
      if(active)return {ok:false,error:'Another reference is using the Flow upload control.'};
      const job={...config,stage:'preparing',handedOff:false,submitted:false};active=job;jobs.set(job.id,job);start(job);return {ok:true};
    },
    status(id){const j=jobs.get(id);return j?{stage:j.stage,handedOff:j.handedOff,submitted:j.submitted,sentAt:j.sentAt,receivedAt:j.receivedAt,httpStatus:j.httpStatus,text:j.text,error:j.error,code:j.code,page:j.page}:null;},
    cancel(id){const j=jobs.get(id);if(j)fail(j,j.handedOff?'Stopped waiting after giving the reference to Flow. Check the project before retrying.':'Stopped before handing the reference to Flow.',j.handedOff?'FLOW_UPLOAD_OUTCOME_UNKNOWN':'FLOW_STOPPED');},
    forget(id){const j=jobs.get(id);if(j&&['response_received','failed'].includes(j.stage))jobs.delete(id);}
  };
})();
