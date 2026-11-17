/* Local, bounded reports. Callers supply only IDs, filenames, stages and settings. */
const FlowDiagnostics=(()=>{
  let tail=Promise.resolve();
  const version='4.6.0';
  function sanitize(value,depth=0) {
    if(depth>10)return '[depth limit]';
    if(typeof value==='string')return value
      .replace(/https?:\/\/[^\s"<>]+/gi,'[URL omitted]')
      .replace(/\b(?:Bearer\s+\S+|ya29\.[\w.~-]+)/gi,'[credential omitted]')
      .replace(/\b(?:token|cookie|authorization|challengeToken)\s*[:=]\s*[^\s,;]+/gi,'[credential omitted]')
      .replace(/[A-Za-z0-9_./+=~-]{160,}/g,'[opaque value omitted]').slice(0,1600);
    if(Array.isArray(value))return value.slice(0,100).map(item=>sanitize(item,depth+1));
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value)
      .filter(([key])=>!/(?:token|cookie|authorization|prompt$|body$|response$|url$)/i.test(key))
      .map(([key,item])=>[key,sanitize(item,depth+1)]));
    return value;
  }
  function record(id,step,detail={}) {
    const event={time:new Date().toISOString(),step,detail:sanitize(detail)};
    const level=/_failed$/.test(step)?'error':/_confirmed$/.test(step)?'success':'info';
    if(typeof log==='function')log(`[Flow ${id.slice(0,8)}] ${step}: ${JSON.stringify(event.detail)}`,level);
    return event;
  }
  async function save(report) {
    const pending=tail.catch(()=>{}).then(async()=>{
      const stored=await chrome.storage.local.get('bb_flow_diagnostics');
      const previous=Array.isArray(stored.bb_flow_diagnostics)?stored.bb_flow_diagnostics:[];
      await chrome.storage.local.set({bb_flow_diagnostics:[...previous.slice(-19).map(item=>sanitize(item)),{version,...sanitize(report)}]});
    });
    tail=pending;
    try{await pending;}catch{record(report.traceId,'diagnostic_save_failed');}
  }
  return {record,save,version};
})();
