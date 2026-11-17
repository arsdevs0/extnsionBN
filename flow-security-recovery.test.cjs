const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./background.js'),'utf8');
const code = source.slice(source.indexOf('async function executeFlowSecurityToken('),source.indexOf('function decodeDataUrl('));
function setup(errors) {
  const count = {calls:0,closed:0};
  const context = vm.createContext({
    log:()=>{},waitForGenerationOperation:p=>p,interruptibleWait:async()=>{},FLOW_DYNAMIC_SITE_KEYS:new Map(),
    STATE:{stopRequested:false}, FLOW_RECAPTCHA_SITE_KEY:'test-key',executeFlowProjectSecurity:()=>{},
    getFlowSecurityHelperTab:async()=>1,
    closeFlowSecurityHelperTab:async()=>{count.closed++;},
    chrome:{scripting:{executeScript:async()=>{
      const error = errors[count.calls++];
      return [{result:error?{error}:{token:'fresh'}}];
    }}}
  });
  context.FlowRequestGuard=require('./flow-request-guard.js').create({stopped:()=>context.STATE.stopRequested});
  vm.runInContext(code,context);
  return {context,count};
}
(async()=>{
  let test=setup(['Flow helper security timed out.']);
  assert.equal(await test.context.executeFlowSecurityToken(1,'IMAGE_GENERATION'),'fresh');
  assert.deepEqual(test.count,{calls:2,closed:0});
  test=setup(['Flow helper security timed out.','Flow helper security timed out.','Flow helper security timed out.']);
  await assert.rejects(test.context.executeFlowSecurityToken(1,'IMAGE_GENERATION'),/timed out/);
  assert.deepEqual(test.count,{calls:2,closed:0});
  test=setup(['PUBLIC_ERROR_UNUSUAL_ACTIVITY']);
  await assert.rejects(test.context.executeFlowSecurityToken(1,'IMAGE_GENERATION'),/UNUSUAL_ACTIVITY/);
  assert.deepEqual(test.count,{calls:1,closed:0});
  test=setup([]);test.context.STATE.stopRequested=true;
  await assert.rejects(test.context.executeFlowSecurityToken(1,'IMAGE_GENERATION'),/stopped/i);
  assert.deepEqual(test.count,{calls:0,closed:0});
  console.log('Flow recovery: one pre-submit repair, bounded failures, no retry of security rejection, stop respected.');
})().catch(error=>{console.error(error);process.exitCode=1;});
