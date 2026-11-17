/* Shared request spacing; each worker owns its stoppable retry loop. */
const FlowRequestGuard = (() => {
  function create({now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms)),stopped=()=>false,onUnusualActivity=()=>{},spacingMs=2000}={}) {
    let nextStart=0,queue=Promise.resolve();
    function check() {
      if(stopped())throw Object.assign(Error('Generation stopped before Flow submission.'),{code:'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:true,noRetry:true});
    }
    async function ready() {check();}
    // Called only when starting/resuming a run or explicitly retrying an image.
    function resume() {nextStart=0;}
    function admit(action) {
      const task=queue.catch(()=>{}).then(async()=>{
        await ready();
        if(action==='IMAGE_GENERATION'||action==='VIDEO_GENERATION') {
          while(now()<nextStart){check();await wait(Math.min(500,nextStart-now()));}
          check();nextStart=now()+spacingMs;
        }
      });
      queue=task;return task;
    }
    async function rejected(error) {
      if(!/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(`${error?.reason||''} ${error?.message||''}`))return;
      // This is an account/security refusal, not transient capacity pressure.
      // Stop admission synchronously so queued workers cannot submit more work.
      error.noRetry=true;
      onUnusualActivity(error);
    }
    return {ready,admit,rejected,resume};
  }
  const guard=create({
    stopped:()=>typeof STATE!=='undefined'&&STATE.stopRequested,
    onUnusualActivity:()=>{
      if(typeof STATE!=='undefined'&&STATE) {
        STATE.stopRequested=true;
        STATE.stopReason='Flow paused generation after an unusual-activity refusal. Progress is retained; check the Flow account before resuming.';
      }
    },
    spacingMs:8000
  });
  return {...guard,create};
})();
if(typeof module!=='undefined')module.exports=FlowRequestGuard;
