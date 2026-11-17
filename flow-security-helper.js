// Token creation stays in the signed-in project that will submit the request.
async function executeFlowProjectSecurity(siteKey, action) {
  let timer;
  try {
    if(location.origin!=='https://flow.google.com'||!location.pathname.includes('/project/'))throw Error('Open the signed-in Flow project.');
    if(!['IMAGE_GENERATION','UPLOAD_IMAGE','VIDEO_GENERATION'].includes(action))throw Error('Invalid Flow security action.');
    const deadline=Date.now()+10000;
    while(!window.grecaptcha?.enterprise?.execute&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,200));
    const enterprise=window.grecaptcha?.enterprise;
    if(!enterprise?.execute)throw Error('Flow security library did not initialize in this project. Open Flow and finish its normal page setup.');
    const keys=new Set();
    for(const script of document.scripts) {
      try {const url=new URL(script.src);const key=url.searchParams.get('render');if(['www.google.com','www.recaptcha.net'].includes(url.hostname)&&url.pathname==='/recaptcha/enterprise.js'&&key&&key!=='explicit')keys.add(key);}catch{}
    }
    if(keys.size>1)throw Error('Flow has multiple security configurations. Reload this project before generating.');
    if(keys.size===1)siteKey=[...keys][0];
    const token=await Promise.race([(async()=>{await new Promise(resolve=>enterprise.ready(resolve));return enterprise.execute(siteKey,{action});})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Flow helper security timed out.')),15000);})]);
    return token?{token}:{error:'Flow returned no security token.'};
  }catch(error){return {error:error.message};}finally{clearTimeout(timer);}
}

// Legacy cleanup remains for helper tabs from older extension versions.
let flowSecurityHelperTab = null;
let flowSecurityHelperOpening = null;
async function getFlowSecurityHelperTab() {
  if (flowSecurityHelperOpening) return flowSecurityHelperOpening;
  flowSecurityHelperOpening = (async () => {
    if (flowSecurityHelperTab !== null) {
      try {
        const tab = await chrome.tabs.get(flowSecurityHelperTab);
        if (new URL(tab.url || tab.pendingUrl).origin === 'https://flow.google.com' && new URL(tab.url || tab.pendingUrl).pathname === '/about') return tab.id;
      } catch {}
      flowSecurityHelperTab = null;
    }
    const tab = await chrome.tabs.create({url:'https://flow.google.com/about', active:false});
    if (typeof log === 'function') log('Flow security helper: using Auto Flow-compatible /about token context.');
    flowSecurityHelperTab = tab.id;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const current = await chrome.tabs.get(tab.id);
      if (current.status === 'complete') {
        if (new URL(current.url).origin !== 'https://flow.google.com' || new URL(current.url).pathname !== '/about') throw new Error('Flow helper redirected. Finish signing in to Flow.');
        await chrome.tabs.update(tab.id, {autoDiscardable:false});
        return tab.id;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    throw new Error('Flow security helper page did not finish loading.');
  })().catch(async error => { await closeFlowSecurityHelperTab(); throw error; });
  try { return await flowSecurityHelperOpening; }
  finally { flowSecurityHelperOpening = null; }
}
async function closeFlowSecurityHelperTab() {
  const id = flowSecurityHelperTab;
  flowSecurityHelperTab = null;
  if (id === null) return;
  try {
    const tab = await chrome.tabs.get(id);
    const url = new URL(tab.url || tab.pendingUrl);
    if (url.origin === 'https://flow.google.com' && url.pathname === '/about') await chrome.tabs.remove(id);
  } catch {}
}
async function executeFlowHelperSecurity(siteKey, action) {
  let timer;
  try {
    if (location.origin !== 'https://flow.google.com') throw new Error('Unexpected Flow page origin: ' + location.origin);
    if (!siteKey || !['IMAGE_GENERATION','UPLOAD_IMAGE'].includes(action)) throw new Error('Invalid Flow security configuration.');
    // Match the key on Google's loader, ignoring unrelated scripts and explicit widgets.
    for (const script of document.querySelectorAll('script[src*="recaptcha"]')) {
      try {
        const url=new URL(script.src),key=url.searchParams.get('render');
        if(url.protocol==='https:'&&url.hostname==='www.google.com'&&url.pathname==='/recaptcha/enterprise.js'&&key&&key!=='explicit'){siteKey=key;break;}
      } catch {}
    }
    if (!window.grecaptcha?.enterprise?.execute && !document.querySelector('script[data-flipo-recaptcha]')) {
      const allowedScript = value => {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !['www.google.com','www.gstatic.com'].includes(url.hostname) || !url.pathname.startsWith('/recaptcha/')) throw new Error('Unexpected reCAPTCHA script URL.');
        return value;
      };
      // Limit Trusted Script URLs to Google's official reCAPTCHA loader and children.
      // Do not add permissive HTML/script policies or change the page's CSP.
      let policy;
      if (window.trustedTypes) {
        try {
          policy = window.trustedTypes.defaultPolicy;
          // The loader's child scripts need the same restricted default policy.
          if (!policy) policy = window.trustedTypes.createPolicy('default', {createScriptURL:allowedScript});
        } catch (_) {
          try { policy = window.trustedTypes.defaultPolicy; } catch (_) {}
        }
      }
      const script = document.createElement('script');
      const nonce = document.querySelector('script[nonce]')?.nonce;
      if (nonce) script.nonce = nonce;
      const source = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
      let scriptSrc = source;
      if (policy && typeof policy.createScriptURL === 'function') {
        scriptSrc = policy.createScriptURL(allowedScript(source));
      }
      script.src = scriptSrc;
      script.async = true;
      script.setAttribute('data-flipo-recaptcha','true');
      (document.head || document.documentElement).appendChild(script);
    }
    const deadline = Date.now() + 10000;
    while (!window.grecaptcha?.enterprise?.execute && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 250));
    const enterprise = window.grecaptcha?.enterprise;
    if (!enterprise?.execute) throw new Error('Flow helper security library did not initialize.');
    const token = await Promise.race([
      (async () => {
        await new Promise(resolve => enterprise.ready(resolve));
        return enterprise.execute(siteKey, {action});
      })(),
      new Promise((_,reject) => {timer = setTimeout(() => reject(new Error('Flow helper security timed out.')),15000);})
    ]);
    return token ? {token} : {error:'Flow helper returned no security token.'};
  } catch (error) { return {error:error.message}; }
  finally { clearTimeout(timer); }
}
