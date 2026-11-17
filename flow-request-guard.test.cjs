const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./flow-request-guard.js');
test('five workers overlap generation while request admission remains spaced',async()=>{
 let now=0;const starts=[],guard=create({now:()=>now,wait:async ms=>{now+=ms;}});
 await Promise.all(Array.from({length:5},async()=>{await guard.admit('IMAGE_GENERATION');starts.push(now);}));
 assert.deepEqual(starts,[0,2000,4000,6000,8000]);
});
test('unusual activity blocks queued generation admission',async()=>{
 let now=0,stop=false;const guard=create({now:()=>now,wait:async ms=>{now+=ms;},stopped:()=>stop,onUnusualActivity:()=>{stop=true;}}),error=Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY');
 await guard.admit('IMAGE_GENERATION');await guard.rejected(error);
 assert.equal(error.noRetry,true);await assert.rejects(()=>guard.admit('IMAGE_GENERATION'),e=>e.code==='FLOW_REQUEST_NOT_SUBMITTED');
 assert.equal(now,0);
});
test('explicit new run has no old refusal timer',async()=>{
 const guard=create({now:()=>1000,spacingMs:0,wait:async()=>{throw Error('Unexpected refusal timer');}});
 await guard.rejected(Error('PUBLIC_ERROR_UNUSUAL_ACTIVITY'));guard.resume();
 await guard.ready();await guard.admit('UPLOAD_IMAGE');await guard.admit('IMAGE_GENERATION');
});
test('resume cannot clear an explicit Stop request',async()=>{
 let stop=true;const guard=create({stopped:()=>stop});
 await assert.rejects(()=>guard.admit('IMAGE_GENERATION'),e=>e.code==='FLOW_REQUEST_NOT_SUBMITTED');
 guard.resume();await assert.rejects(()=>guard.ready(),e=>e.code==='FLOW_REQUEST_NOT_SUBMITTED');
});
