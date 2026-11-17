/* Drive Flow's own composer. Observe its response; never rewrite its request/security data. */
(() => {
  if(window.GucFlowNative)return;
  const helperVersion='4.5.8';
  const jobs=new Map();let armed=null,lastPrompt='';
  const visible=el=>el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  const text=el=>{if(!el)return '';const copy=el.cloneNode(true);copy.querySelectorAll('[aria-hidden="true"]').forEach(node=>node.remove());return copy.textContent.trim();};
  const name=el=>el?(el.getAttribute('aria-label')||text(el)).trim():'';
  const find=(selector,label)=>[...document.querySelectorAll(selector)].find(el=>visible(el)&&name(el)===label);
  const button=label=>find('button',label);
  const editor=()=>document.querySelector('.ProseMirror[contenteditable="true"]');
  const chips=()=>[...document.querySelectorAll('flow-image-ingredient-chip')].filter(visible).map(chip=>{
    const el=chip.querySelector('img');
    try{return el?new URL(el.src).pathname.match(/\/image\/([^/]+)/)?.[1]||el.getAttribute('data-media-id'):null;}catch{return null;}
  });
  const clip=value=>String(value||'').slice(0,180);
  function imageEvidence(img) {
    if(!img)return {hasImage:false};
    const fromUrl=value=>{try{const url=new URL(value);return {origin:url.origin,pathKind:url.pathname.startsWith('/image/')?'image':url.pathname.startsWith('/asb/')?'opaque-thumbnail':'other',mediaId:clip(url.pathname.match(/\/image\/([^/]+)/)?.[1])};}catch{return {pathKind:'unavailable',mediaId:''};}};
    return {hasImage:true,src:fromUrl(img.src),currentSrc:fromUrl(img.currentSrc),dataMediaId:clip(img.getAttribute('data-media-id')),alt:clip(img.alt),complete:img.complete,width:img.naturalWidth};
  }
  function chipEvidence() {
    return [...document.querySelectorAll('flow-image-ingredient-chip')].slice(0,18).map((chip,index)=>({index:index+1,visible:!!visible(chip),busy:chip.querySelector('button')?.getAttribute('aria-busy'),dataMediaId:clip(chip.getAttribute('data-media-id')),image:imageEvidence(chip.querySelector('img'))}));
  }
  function optionEvidence(el) {
    return {title:clip(el.querySelector('.asset-title')?.textContent||el.getAttribute('title')||name(el)),selected:el.getAttribute('aria-selected'),mediaIds:mediaIds(el).map(clip).slice(0,9),image:imageEvidence(el.querySelector('img'))};
  }
  function emit(job,step,detail={}) {
    job.step=step;
    job.events.push({seq:++job.eventSeq,time:new Date().toISOString(),step,detail});
    if(job.events.length>200)job.events.shift();
  }
  function snapshot(job) {
    return {helperVersion,projectId:job.projectId,pageProjectId:location.pathname.match(/\/project\/([^/]+)/)?.[1]||null,step:job.step,waitingFor:job.waitingFor||null,clicked:job.clicked,submitted:job.submitted,
      expected:job.references.map(r=>({mediaId:r.mediaId,fileName:r.fileName,assetId:r.assetId||null})),actualIds:chips(),chips:chipEvidence(),
      search:clip(assetSearch()?.value),options:[...(assetList()?.querySelectorAll('[role="option"]')||[])].filter(visible).slice(0,12).map(optionEvidence),
      previews:[...document.querySelectorAll('img')].filter(img=>visible(img)&&img.alt.startsWith('Preview of ')).slice(0,2).map(imageEvidence),promptLength:editor()?.innerText.trim().length||0};
  }
  function referenceMismatch(job,message,expected,actual) {
    const sameMembers=JSON.stringify([...expected].sort())===JSON.stringify([...actual].sort());
    const details={kind:sameMembers?'order_changed':'different_or_missing_media',expected,actual,referenceIndex:job.referenceIndex};
    emit(job,'reference_mismatch',details);
    return Object.assign(Error(`${message} Expected IDs=${JSON.stringify(expected)}; actual IDs=${JSON.stringify(actual)}; kind=${details.kind}. Nothing was submitted.`),{code:'FLOW_REFERENCE_MISMATCH',noRetry:true});
  }
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  function check(job) {
    if(job.cancelled)throw Error('Generation stopped before Flow submission.');
    if(location.origin!=='https://flow.google.com'||location.pathname.match(/\/project\/([\w-]+)/)?.[1]!==job.projectId)throw Error('Flow project changed before submission.');
  }
  async function wait(job,fn,label,timeout=15000) {
    job.waitingFor=label;
    const end=Date.now()+timeout;
    while(Date.now()<end){check(job);const value=fn();if(value){job.waitingFor=null;return value;}await pause(150);}
    emit(job,'wait_timeout',{label,timeoutMs:timeout});
    throw Error(`Flow UI: ${label} did not become ready. ${job.clicked?'The Generate action was not repeated.':'Nothing was submitted to Generate.'}`);
  }
  async function click(job,label){const el=await wait(job,()=>button(label),label);check(job);el.click();}
  function fillInput(el,value) {
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    setter.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
  async function radio(job,label) {
    const el=await wait(job,()=>find('[role="radio"]',label),label);
    if(el.getAttribute('aria-checked')!=='true')el.click();
    await wait(job,()=>find('[role="radio"]',label)?.getAttribute('aria-checked')==='true',`${label} selection`);
  }
  const assetList=()=>[...document.querySelectorAll('[role="listbox"][aria-label="Asset list"]')].find(visible);
  const assetSearch=()=>[...document.querySelectorAll('input')].find(el=>visible(el)&&(el.getAttribute('aria-label')==='Search assets'||el.placeholder==='Search assets'));
  const normalizedFile=value=>String(value||'').normalize('NFC').replace(/[\u200b-\u200d\ufeff]/g,'').trim().replace(/\.(?:jpe?g|png|webp)$/i,'');
  function mediaIds(el) {
    const ids=[el.getAttribute('data-media-id'),...[...el.querySelectorAll('[data-media-id]')].map(node=>node.getAttribute('data-media-id'))];
    for(const img of [...(el.matches('img')?[el]:[]),...el.querySelectorAll('img')]) {
      try {ids.push(new URL(img.currentSrc||img.src).pathname.match(/\/image\/([^/]+)/)?.[1]);}catch{}
    }
    return ids.filter(Boolean);
  }
  function referenceOption(reference) {
    const options=[...(assetList()?.querySelectorAll('[role="option"]')||[])].filter(visible);
    // Prefer the exact uploaded media ID when the picker exposes it. Otherwise
    // use the complete unique upload name, including its UUID, never the first
    // result of a broad search or a merely similar character name.
    const byId=options.filter(el=>mediaIds(el).includes(reference.mediaId));
    if(byId.length===1)return {element:byId[0],matchedBy:'media_id'};
    const byName=options.filter(el=>{
      const ids=mediaIds(el);if(ids.length&&!ids.includes(reference.mediaId))return false;
      const labels=[el.getAttribute('aria-label'),el.getAttribute('title'),text(el),
        ...[...el.querySelectorAll('.asset-title,[title],[aria-label],img[alt]')].flatMap(node=>[text(node),node.getAttribute('title'),node.getAttribute('aria-label'),node.getAttribute('alt')])];
      return labels.some(label=>normalizedFile(label)===normalizedFile(reference.fileName));
    });
    return byName.length===1?{element:byName[0],matchedBy:'filename'}:null;
  }
  async function locateReference(job,reference) {
    const stem=reference.fileName.replace(/\.[^.]+$/,'');
    const unique=stem.match(/__([a-f0-9]{8})-[a-f0-9-]{27}$/i);
    const shortName=unique?stem.slice(0,unique.index):stem;
    const searches=[...new Set([reference.fileName,shortName,unique?.[1]].filter(Boolean))];
    // Full punctuation-heavy filenames are not reliably indexed by Flow.
    // Retry the picker/search only; no generation or upload is repeated here.
    for(let round=0;round<2;round++) {
      await click(job,'Add ingredients to the prompt box');
      await wait(job,assetSearch,'reference search');
      for(const query of searches) {
        check(job);const search=assetSearch();
        if(!search)break;
        fillInput(search,query);
        emit(job,'reference_search',{referenceIndex:job.referenceIndex,round:round+1,query,expectedMediaId:reference.mediaId});
        const deadline=Date.now()+(query===shortName?6000:2500);
        while(Date.now()<deadline) {
          check(job);
          const option=referenceOption(reference);if(option){emit(job,'reference_found',{referenceIndex:job.referenceIndex,expectedMediaId:reference.mediaId,matchedBy:option.matchedBy,option:optionEvidence(option.element)});return option.element;}
          await pause(150);
        }
        emit(job,'reference_search_empty',{query,options:[...(assetList()?.querySelectorAll('[role="option"]')||[])].filter(visible).slice(0,8).map(optionEvidence)});
      }
      if(assetList()||assetSearch()) {
        await click(job,'Add ingredients to the prompt box');
        await wait(job,()=>!assetList()&&!assetSearch(),'closed reference search');
      }
    }
    const error=Error(`Flow UI: could not identify the exact uploaded reference ${reference.fileName} after full-name/short-name search and reopening the picker. Nothing was submitted to Generate.`);
    error.code='FLOW_REFERENCE_NOT_FOUND';throw error;
  }
  async function attachReference(job,reference) {
    const before=chips();
    emit(job,'reference_begin',{referenceIndex:job.referenceIndex,fileName:reference.fileName,expectedMediaId:reference.mediaId,previousIds:before});
    const option=await locateReference(job,reference);
    check(job);emit(job,'reference_select_clicked',{referenceIndex:job.referenceIndex});option.click();
    // Some Flow pickers attach on option selection; others only select a
    // preview and require Add to prompt. A placeholder chip already counts as
    // attached, even before its thumbnail/media URL is ready.
    const action=await wait(job,()=>{
      if(chips().length>before.length)return 'attached';
      const add=button('Add to prompt');
      const preview=[...document.querySelectorAll('img')].find(el=>visible(el)&&(normalizedFile(el.alt.replace(/^Preview of /,''))===normalizedFile(reference.fileName)||mediaIds(el).includes(reference.mediaId)));
      return preview&&add&&!add.disabled&&add.getAttribute('aria-disabled')!=='true'?add:null;
    },'reference selection');
    if(action!=='attached') {
      check(job);
      if(chips().length===before.length){emit(job,'reference_add_clicked',{referenceIndex:job.referenceIndex});action.click();}
    }
    await wait(job,()=>{
      const actual=chips();
      if(actual.length>before.length+1)throw referenceMismatch(job,'Flow attached more than one reference.',[...before,reference.mediaId],actual);
      if(actual.length===before.length+1&&actual.every(Boolean)) {
        if(JSON.stringify(actual)!==JSON.stringify([...before,reference.mediaId]))throw referenceMismatch(job,'Flow attached a different reference than the selected panel image.',[...before,reference.mediaId],actual);
        return true;
      }
      return false;
    },'attached reference');
    emit(job,'reference_verified',{referenceIndex:job.referenceIndex,actualIds:chips(),chips:chipEvidence()});
    // A picker which attaches directly may take another render to disappear.
    await wait(job,()=>!visible(document.querySelector('[role="listbox"][aria-label="Asset list"]')),'closed reference picker');
  }
  async function prepare(job) {
    check(job);
    emit(job,'preparing',{helperVersion,projectId:job.projectId,expected:job.references,model:job.model,aspect:job.aspect,promptLength:job.prompt.length});
    const input=await wait(job,editor,'prompt editor',45000);
    if(input.innerText.trim()&&input.innerText.trim()!==lastPrompt)throw Error('The Flow prompt was edited outside this run. Keep this project tab idle, then Resume.');
    // A cancelled preparation may leave its picker or settings panel open.
    if(visible(document.querySelector('[role="listbox"][aria-label="Asset list"]')))await click(job,'Add ingredients to the prompt box');
    if(button('Clear prompt'))await click(job,'Clear prompt');
    await wait(job,()=>!chips().length&&!editor().innerText.trim(),'empty prompt');
    const agent=button('Agent');if(agent?.getAttribute('aria-pressed')==='true')agent.click();
    if(!find('[role="radio"]','Image'))await click(job,'Settings trigger');
    await radio(job,'Image');
    await click(job,'Select model family');
    const choice=await wait(job,()=>[...document.querySelectorAll('[role="menuitem"]')].find(el=>visible(el)&&name(el).replace(/^🍌\s*/u,'')===job.modelLabel),'image model');
    choice.click();
    await wait(job,()=>text(button('Select model family')||button('Settings trigger')).includes(job.modelLabel),'selected model');
    // A model change may reset its aspect/output defaults.
    if(!find('[role="radio"]','x1'))await click(job,'Settings trigger');
    await radio(job,job.aspect);await radio(job,'x1');
    // The settings panel closes with the same trigger; the model menu closes on selection.
    if(find('[role="radio"]','x1'))await click(job,'Settings trigger');
    for(const [index,reference] of job.references.entries()){job.referenceIndex=index+1;await attachReference(job,reference);}
    const actual=chips(),expected=job.references.map(r=>r.mediaId);
    if(JSON.stringify(actual)!==JSON.stringify(expected))throw referenceMismatch(job,'Flow attached references do not match this panel.',expected,actual);
    check(job);lastPrompt=job.prompt;
    const target=editor();target.focus();
    const range=document.createRange();range.selectNodeContents(target);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
    if(!document.execCommand('insertText',false,job.prompt))throw Error('Flow prompt could not be entered. Nothing was submitted.');
    await wait(job,()=>editor().innerText.trim()===job.prompt.trim(),'complete prompt text');
    if(JSON.stringify(chips())!==JSON.stringify(expected))throw referenceMismatch(job,'Flow references changed while entering the prompt.',expected,chips());
    await wait(job,()=>{const el=button('Start generation');return el&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'?el:null;},'Generate button');
    check(job);job.stage='ready';emit(job,'composer_ready',{actualIds:chips(),promptLength:editor().innerText.trim().length});
  }
  async function submit(job) {
    check(job);
    if(editor()?.innerText.trim()!==job.prompt.trim()||JSON.stringify(chips())!==JSON.stringify(job.references.map(r=>r.mediaId)))throw Error('Flow prompt or references changed before submission.');
    const generate=button('Start generation');
    if(!generate||generate.disabled||generate.getAttribute('aria-disabled')==='true')throw Error('Flow Generate button is not ready.');
    job.stage='armed';armed=job;lastPrompt=job.prompt;job.clicked=true;emit(job,'generate_clicked',{actualIds:chips(),model:job.model,aspect:job.aspect});generate.click();
    // Click may not produce a recognizable request. That outcome must stay uncertain.
    await wait(job,()=>job.submitted||job.stage==='failed','native request',20000);
  }
  const contains=(value,expected)=>value===expected||(Array.isArray(value)&&value.some(child=>contains(child,expected)));
  function matching(body,url,expectedJob=armed) {
    if(!expectedJob||armed!==expectedJob||!String(url).includes('batchexecute'))return null;
    try {
      const batch=JSON.parse(new URLSearchParams(String(body||'')).get('f.req'));
      for(const row of batch.flat()) {
        if(row?.[0]!=='ogiZ0b')continue;
        const data=JSON.parse(row[1]),request=data?.[1]?.[0];
        if(!contains(request?.[8],armed.prompt))continue;
        const job=armed;armed=null;job.submitted=true;job.stage='submitted';
        const refs=(request?.[2]||[]).map(r=>r[0]);
        emit(job,'native_request_observed',{rpc:'ogiZ0b',referenceIds:refs,model:request[5],aspectCode:request[4],requestCount:data[1].length});
        if(data[1].length!==1||request[5]!==job.model||request[4]!==job.aspectCode||(request[7]?.[5]&&request[7][5]!==job.projectId)||JSON.stringify(refs)!==JSON.stringify(job.references.map(r=>r.mediaId))) {
          job.stage='failed';job.code='FLOW_GENERATION_OUTCOME_UNKNOWN';job.error='Flow submitted settings different from this panel. Inspect Flow before retrying.';
          job.diagnostics=snapshot(job);
        }
        return job;
      }
    } catch { /* An unrelated request is never attributed to this panel. */ }
    return null;
  }
  function complete(job,status,text,error) {
    if(!job||job.stage==='failed')return;
    emit(job,'native_response_received',{httpStatus:status,responseCharacters:String(text||'').length,connectionError:!!error});
    if(error){job.stage='failed';job.error=String(error);job.code='FLOW_GENERATION_OUTCOME_UNKNOWN';return;}
    job.stage='done';job.httpStatus=status;job.text=text;
  }
  const originalFetch=window.fetch;
  window.fetch=function(input,init) {
    const url=typeof input==='string'?input:input?.url||String(input);
    const expectedJob=armed;
    // Clone Request bodies for observation only; never consume or delay the real request.
    let bodyRead=null;
    if(expectedJob&&String(url).includes('batchexecute')&&init?.body===undefined&&input instanceof Request) {
      try {bodyRead=input.clone().text();}catch{}
    }
    const job=matching(init?.body,url,expectedJob);
    const promise=originalFetch.apply(this,arguments);
    const observe=matched=>{if(matched)promise.then(response=>response.clone().text().then(text=>complete(matched,response.status,text)).catch(e=>complete(matched,0,'',e.message)),e=>complete(matched,0,'',e.message));};
    if(job)observe(job);
    else if(bodyRead)bodyRead.then(body=>observe(matching(body,url,expectedJob))).catch(()=>{});
    return promise;
  };
  const urls=new WeakMap(),open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url){urls.set(this,String(url));return open.apply(this,arguments);};
  XMLHttpRequest.prototype.send=function(body) {
    const job=matching(body,urls.get(this));
    if(job)this.addEventListener('loadend',()=>{try{complete(job,this.status,this.responseText,this.status?null:'Native Flow connection ended without a response.');}catch(e){complete(job,0,'',e.message);}},{once:true});
    return send.apply(this,arguments);
  };
  function fail(job,error) {
    if(job.submitted)return;
    job.stage='failed';job.error=error.message;
    job.code=job.clicked?'FLOW_GENERATION_OUTCOME_UNKNOWN':error.code||'FLOW_REQUEST_NOT_SUBMITTED';
    job.noRetry=!!error.noRetry;job.diagnostics=snapshot(job);
    emit(job,'failed',{code:job.code,step:job.diagnostics.step,waitingFor:job.waitingFor,clicked:job.clicked,submitted:job.submitted});
    if(armed===job)armed=null;
  }
  window.GucFlowNative={
    version:()=>helperVersion,
    begin(config) {
      if([...jobs.values()].some(j=>['preparing','ready','armed'].includes(j.stage)||(j.clicked&&!j.submitted)))return {error:'Flow composer has an unfinished submission. Inspect Flow, then Resume.',notSubmitted:true};
      const job={...config,stage:'preparing',clicked:false,submitted:false,events:[],eventSeq:0};jobs.set(job.id,job);
      prepare(job).catch(error=>fail(job,error));
      return {ok:true};
    },
    submit(id){const job=jobs.get(id);if(job?.stage!=='ready')return {error:'Flow composer is not ready.'};submit(job).catch(error=>fail(job,error));return {ok:true};},
    status(value){const id=typeof value==='string'?value:value.id,after=typeof value==='string'?0:value.afterEvent||0;const j=jobs.get(id);return j?{helperVersion,stage:j.stage,step:j.step,submitted:j.submitted,clicked:j.clicked,error:j.error,code:j.code,noRetry:j.noRetry,notSubmitted:!j.clicked,text:j.text,httpStatus:j.httpStatus,diagnostics:j.diagnostics,events:j.events.filter(event=>event.seq>after)}:null;},
    cancel(id){const j=jobs.get(id);if(j&&!j.clicked){j.cancelled=true;if(j.stage==='ready')fail(j,Error('Generation stopped before Flow submission.'));}},
    forget(id){const j=jobs.get(id);if(j?.clicked&&!j.submitted)return; if(['preparing','ready','armed'].includes(j?.stage))return;jobs.delete(id);}
  };
})();
