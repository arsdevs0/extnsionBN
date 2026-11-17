const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let created = 0, closed = 0;
let tab;
const context = vm.createContext({URL, Date, setTimeout, clearTimeout, chrome:{tabs:{
  create:async options=>{assert.equal(options.active,false);created++;tab={id:42,url:options.url,status:'complete'};return tab;},
  get:async()=>tab,
  update:async(id,options)=>{assert.equal(id,42);assert.equal(options.autoDiscardable,false);},
  remove:async id=>{assert.equal(id,42);closed++;}
}}});
vm.runInContext(fs.readFileSync(require.resolve('./flow-security-helper.js'),'utf8'),context);
(async()=>{
  assert.deepEqual(await Promise.all([context.getFlowSecurityHelperTab(),context.getFlowSecurityHelperTab()]),[42,42]);
  assert.equal(created,1,'concurrent token requests must share one helper');
  await context.closeFlowSecurityHelperTab(); assert.equal(closed,1);
  await context.getFlowSecurityHelperTab(); assert.equal(created,2);
  tab.url='https://flow.google.com/u/0/project/user-project';
  await context.closeFlowSecurityHelperTab(); assert.equal(closed,1,'do not close a helper repurposed by the user');
  console.log('Flow helper lifecycle: shared creation, idle reuse, cleanup and user-navigation preservation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
