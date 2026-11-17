/* Replace a vanished project tab only for work known not to have been sent. */
const FlowTabRecovery = (() => {
  const states = new WeakMap();
  const isMissingTab = error => /No tab with id\b|Invalid tab ID\b|tab (?:was|has been) closed/i.test(error?.message || '');
  const stopped = () => typeof STATE !== 'undefined' && STATE.stopRequested;
  function failure(reason) {
    return Object.assign(Error(`Flow project tab recovery paused: ${reason} Progress retained. Check the Flow account and restart or resume the run.`),
      {code:'FLOW_TAB_RECOVERY_FAILED',noRetry:true,notSubmitted:true});
  }
  function stateFor(flow) {
    if (!states.has(flow)) states.set(flow,{pending:null,count:0,error:null});
    return states.get(flow);
  }
  async function recover(flow, failedTabId) {
    const state=stateFor(flow);
    if (state.pending) return state.pending;
    // Another worker may already have replaced this exact stale tab.
    if ((flow.tabId ?? flow.authTabId) !== failedTabId) return;
    if (state.error) throw state.error;
    if (state.count >= 2) throw (state.error=failure('The replacement tab keeps disappearing.'));
    const pending=(async()=>{
      let replacement;
      try {
        await FlowRequestGuard.ready();
        if (!/^\d+$/.test(String(flow.accountIndex ?? '')) || !flow.projectId) {
          throw Error('The original account/project context is missing.');
        }
        state.count++;
        const path=`/u/${flow.accountIndex}/project/${encodeURIComponent(flow.projectId)}`;
        log('Flow project tab disappeared before submission or during download. Reopening the same account and project.');
        replacement=await chrome.tabs.create({url:`https://flow.google.com${path}`,active:false});
        if (!Number.isInteger(replacement?.id)) throw Error('Chrome did not open a replacement tab.');
        await FlowRequestGuard.ready();
        await chrome.tabs.update(replacement.id,{autoDiscardable:false});
        const deadline=Date.now()+45000;
        while (true) {
          await FlowRequestGuard.ready();
          const tab=await chrome.tabs.get(replacement.id);
          if (tab.status==='complete') {
            const url=new URL(tab.url);
            if (url.origin!=='https://flow.google.com' || url.pathname.replace(/\/$/,'')!==path) {
              throw Error('The replacement did not open the original signed-in Flow project.');
            }
            break;
          }
          if (Date.now()>=deadline) throw Error('The replacement project did not finish loading.');
          await interruptibleWait(250);
        }
        const compatibility=await waitForGenerationOperation(checkFlowCompatibility(replacement.id));
        await FlowRequestGuard.ready();
        // Publish together only once ready. Existing jobs keep their captured ID.
        flow.tabId=replacement.id;
        flow.authTabId=replacement.id;
        flow.recaptchaSiteKey=compatibility.siteKey;
        STATE.editorTabId=replacement.id;
        FLOW_DYNAMIC_SITE_KEYS.delete(failedTabId);
        log('Flow project tab recovered. Confirmed reference IDs and images retained.');
      } catch (error) {
        if (Number.isInteger(replacement?.id)) {
          FLOW_DYNAMIC_SITE_KEYS.delete(replacement.id);
          await chrome.tabs.remove(replacement.id).catch(()=>{});
        }
        if (stopped()) throw error;
        state.error=failure(error.message);
        throw state.error;
      }
    })();
    state.pending=pending;
    try {await pending;} finally {if(state.pending===pending)state.pending=null;}
  }
  async function run(flow, operation, {readOnly=false}={}) {
    for (let attempt=0;attempt<2;attempt++) {
      const state=stateFor(flow);
      if (state.pending) await state.pending;
      const tabId=flow.tabId ?? flow.authTabId;
      try {return await operation(tabId);}
      catch (error) {
        // A lost acknowledgement after dispatch must never become a new job.
        if (stopped() || /OUTCOME_UNKNOWN/.test(error.code || '') ||
            (!readOnly && error.notSubmitted!==true) || !isMissingTab(error)) throw error;
        if (attempt) throw (state.error=failure('The replacement tab disappeared before the operation could complete.'));
        await recover(flow,tabId);
        await FlowRequestGuard.ready();
      }
    }
  }
  return {run,isMissingTab};
})();
