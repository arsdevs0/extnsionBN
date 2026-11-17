// Preflight stores public compatibility metadata only, never account tokens or prompts.
const FLOW_DYNAMIC_SITE_KEYS = new Map();
async function inspectFlowCompatibility(fallbackKey) {
  if (location.origin !== 'https://flow.google.com') return {error:'Open the signed-in Flow project.'};
  const deadline = Date.now() + 10000;
  while (!window.WIZ_global_data?.SNlM0e && Date.now() < deadline) await new Promise(resolve=>setTimeout(resolve,250));
  const session = window.WIZ_global_data || {};
  if (!session.SNlM0e || !session.cfb2h || session.FdrFJe == null) return {error:'Flow session is not ready. Finish signing in or reload the project.'};
  const keys = new Set();
  for (const script of document.scripts) {
    try {
      const url = new URL(script.src,location.href);
      if (url.protocol !== 'https:' || !['www.google.com','www.recaptcha.net'].includes(url.hostname) || url.pathname !== '/recaptcha/enterprise.js') continue;
      const key = url.searchParams.get('render');
      if (key && /^6L[A-Za-z0-9_-]{20,100}$/.test(key)) keys.add(key);
    } catch {}
  }
  // Multiple loader keys are ambiguous. Preserve the tested default in that case.
  return {build:String(session.cfb2h),siteKey:keys.size===1?[...keys][0]:fallbackKey,keySource:keys.size===1?'page':'bundled'};
}
async function checkFlowCompatibility(tabId) {
  const results = await chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:inspectFlowCompatibility,args:[FLOW_RECAPTCHA_SITE_KEY]});
  const current = results?.[0]?.result;
  if (!current || current.error) throw new Error(current?.error || 'Flow compatibility check returned no response.');
  FLOW_DYNAMIC_SITE_KEYS.set(tabId,current.siteKey);
  const saved = await chrome.storage.local.get('bb_flow_compatibility').catch(()=>({}));
  const previous = saved.bb_flow_compatibility;
  if (previous?.build && previous.build !== current.build) log('Flow website build changed. Session preflight passed; response compatibility will be checked before any retry.');
  if (current.siteKey !== FLOW_RECAPTCHA_SITE_KEY) log('Flow preflight detected an updated public security key in its official loader.');
  await chrome.storage.local.set({bb_flow_compatibility:{...current,checkedAt:Date.now()}}).catch(()=>{});
  return current;
}
