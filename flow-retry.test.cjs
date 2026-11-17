const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const retry=require('./flow-retry.js');
test('transient failures keep a capped delay and unusual activity never retries',()=>{
 for(const attempt of [1,3,10,100,10000])for(const message of ['HTTP 429','INTERNAL','UNAVAILABLE']) {
  const result=retry.decision(Object.assign(Error(message),{code:'FLOW_GENERATION_REJECTED',noRetry:true}),attempt);
  assert.equal(result.retry,true);assert.ok(result.delayMs>=3000&&result.delayMs<=45000);
 }
 const refusal=retry.decision(Object.assign(Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY code=7 (PERMISSION_DENIED)'),{code:'FLOW_GENERATION_REJECTED'}),1);
 assert.equal(refusal.retry,false);assert.equal(refusal.rateLimited,true);
});
test('unknown paid results, Stop, auth, policy and quota do not resubmit',()=>{
 for(const code of ['FLOW_GENERATION_OUTCOME_UNKNOWN','FLOW_STOPPED','FLOW_AUTH_REQUIRED','DAILY_QUOTA_REACHED','PUBLIC_ERROR_UNSAFE_GENERATION','POLICY_VIOLATION'])assert.equal(retry.decision(Object.assign(Error(code),{code}),100).retry,false);
});
test('missing tabs and failed recovery never enter the generic retry loop',()=>{
 for(const message of ['No tab with id: 561828317','Invalid tab ID: 8','The tab was closed.','The tab has been closed.','FLOW_TAB_RECOVERY_FAILED UNAVAILABLE','FLOW_UPLOAD_OUTCOME_UNKNOWN INTERNAL']) {
  for(const download of [false,true])assert.equal(retry.decision(Error(message),116,{download}).retry,false);
 }
});
test('Stop cancels a pending operation promptly and calls its cancellation hook once',async()=>{
 const source=fs.readFileSync('background.js','utf8'),context=vm.createContext({STATE:{stopRequested:false},setInterval,clearInterval,Promise,Error});
 vm.runInContext(source.slice(source.indexOf('async function waitForGenerationOperation('),source.indexOf('function safeCloseTab(')),context);
 let cancelled=0;const start=Date.now(),pending=context.waitForGenerationOperation(new Promise(()=>{}),()=>cancelled++);
 setTimeout(()=>{context.STATE.stopRequested=true;},20);
 await assert.rejects(pending,e=>e.code==='FLOW_STOPPED');assert.equal(cancelled,1);assert.ok(Date.now()-start<1000);
});
test('two runs create projects in different fresh tabs and keep the account index',async()=>{
 const source=fs.readFileSync('background.js','utf8'),tabs=new Map([[1,{id:1,url:'https://flow.google.com/u/2/project/old',status:'complete'}]]),created=[],projects=[],checks=[];
 const context=vm.createContext({URL,Date,FlowRequestGuard:{ready:async()=>{}},FLOW_DYNAMIC_SITE_KEYS:new Map(),waitForGenerationOperation:p=>p,getDirectFlowAccountStatus:async()=>({authTabId:1}),interruptibleWait:async()=>{},
  chrome:{tabs:{get:async id=>tabs.get(id),create:async options=>{const tab={...options,id:tabs.size+1,status:'complete'};tabs.set(tab.id,tab);created.push(tab);return tab;},update:async()=>{},remove:async id=>tabs.delete(id)}},
  createDirectFlowProject:async id=>{projects.push(id);return 'project-'+id;},ensureFlowProjectPage:async(id,project)=>{tabs.get(id).url='https://flow.google.com/u/2/project/'+project;},checkFlowCompatibility:async id=>{checks.push(id);return {siteKey:'public-key'};}});
 vm.runInContext(source.slice(source.indexOf('async function getDirectFlowContext('),source.indexOf('async function ensureFlowProjectPage(')),context);
 const first=await context.getDirectFlowContext(),second=await context.getDirectFlowContext();
 assert.equal(first.accountIndex,'2');assert.equal(second.accountIndex,'2');
 assert.notEqual(first.tabId,second.tabId);assert.notEqual(first.projectId,second.projectId);assert.deepEqual(projects,[2,3]);assert.deepEqual(checks,[2,2,3,3]);assert.ok(created.every(t=>t.active===false));assert.equal(tabs.get(1).url,'https://flow.google.com/u/2/project/old');
});
