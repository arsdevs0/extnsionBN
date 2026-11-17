/* Retry only failures that are known not to have produced a generation. */
const FlowRetry = (() => {
  function decision(error, attempt = 1, {download = false} = {}) {
    const message = `${error?.code || ''} ${error?.message || ''}`;
    if (/FLOW_GENERATION_OUTCOME_UNKNOWN|FLOW_UPLOAD_OUTCOME_UNKNOWN|FLOW_UPLOAD_UI_UNAVAILABLE|FLOW_STOPPED|FLOW_TAB_RECOVERY_FAILED|No tab with id\b|Invalid tab ID\b|tab (?:was|has been) closed/i.test(message)) return {retry:false};
    const delayMs=Math.min(45000,3000*2**Math.min(Math.max(0,attempt-1),4));
    // Flow's unusual-activity refusal is an account/security gate, not a
    // transient capacity limit. Repeated submissions can worsen the block.
    if (/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(message)) return {retry:false,delayMs,rateLimited:true};
    if (/DAILY_QUOTA|UNSAFE_GENERATION|POLICY_VIOLATION|PERMISSION_DENIED|UNAUTHENTICATED|FLOW_AUTH_REQUIRED|sign.in|verification|INVALID_ARGUMENT|NOT_FOUND|HTTP (400|401|403|404)\b/i.test(message)) return {retry:false};
    const transient = /HTTP 429\b|RESOURCE_EXHAUSTED|\bUNAVAILABLE\b|\bINTERNAL\b|DEADLINE_EXCEEDED/i.test(message);
    if (error?.noRetry && !transient) return {retry:false};
    if (!download && error?.code === 'FLOW_GENERATION_REJECTED' && !transient) return {retry:false};
    return {retry:true, delayMs, rateLimited:/429|RESOURCE_EXHAUSTED/.test(message)};
  }
  return {decision};
})();
if (typeof module !== 'undefined') module.exports = FlowRetry;
