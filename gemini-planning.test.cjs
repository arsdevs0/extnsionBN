const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const content=fs.readFileSync('content_gemini.js','utf8'),background=fs.readFileSync('background.js','utf8');
const completionSource=content.slice(content.indexOf('  function looksLikeCompleteJson'),content.indexOf('  async function askText'));
function responseHarness(textAt,generatingAt=()=>false) {
  let now=0;
  const ctx=vm.createContext({Date:{now:()=>now},getLastAssistantText:()=>textAt(now),lastResponseIsImageGeneration:()=>false,isGeminiGenerating:()=>generatingAt(now),sleep:async ms=>{now+=ms;}});
  vm.runInContext(completionSource,ctx);return {ctx,now:()=>now};
}
test('a complete plan finishes promptly, including when a stale spinner remains visible',async()=>{
  for(const generating of [false,true]) {
    const h=responseHarness(()=>'```json\n{"panels":[{"text":"escaped \\\"quote\\\""}]}\n```',()=>generating);
    await h.ctx.waitForResponseDone(480000);assert.equal(h.now(),generating?3000:1000);
  }
});
test('streaming JSON waits for the closing data and arrays containing objects are recognized',async()=>{
  const h=responseHarness(ms=>ms<5000?'[{"panel":':'[{"panel":1}]',()=>true);
  await h.ctx.waitForResponseDone(480000);assert.equal(h.now(),8000);
  assert.equal(h.ctx.looksLikeCompleteJson('{"text":"unfinished'),false);
});
test('empty or incomplete stalled responses retry after 3 minutes instead of hanging',async()=>{
  for(const text of ['', '{"panels":']) {
    const h=responseHarness(()=>text,()=>true);
    await assert.rejects(()=>h.ctx.waitForResponseDone(480000),/GEMINI_RESPONSE_STALLED/);
    assert.ok(h.now()>=180000&&h.now()<=181000);
  }
});
test('progress resets the stall timer and a long but active stream can finish',async()=>{
  const h=responseHarness(ms=>ms<100000?'':ms<200000?'{"panel":':ms<300000?'{"panel":1':'{"panel":1}',()=>true);
  await h.ctx.waitForResponseDone(480000);assert.equal(h.now(),303000);
});
test('a visible spinner after a hidden one still counts, while hidden indicators do not',()=>{
  const hidden={getClientRects:()=>[]},invisible={getClientRects:()=>[{}],visibility:'hidden'},visible={getClientRects:()=>[{}]};let nodes=[hidden,invisible];
  const ctx=vm.createContext({document:{querySelectorAll:()=>nodes},getComputedStyle:n=>({visibility:n.visibility||'visible'})});
  vm.runInContext(content.slice(content.indexOf('  function isGeminiGenerating'),content.indexOf('  function looksLikeCompleteJson')),ctx);
  assert.equal(ctx.isGeminiGenerating(),false);nodes.push(visible);assert.equal(ctx.isGeminiGenerating(),true);
});
test('already-loaded Gemini tabs resolve immediately and loading tabs wait for their own event',async()=>{
  for(const status of ['complete','loading']) {
    let listener,settled=false;const timers=new Set();
    const ctx=vm.createContext({setTimeout:fn=>{timers.add(fn);return fn;},clearTimeout:fn=>timers.delete(fn),chrome:{tabs:{get:async()=>({status}),onUpdated:{addListener:fn=>listener=fn,removeListener:()=>{listener=null;}}}}});
    vm.runInContext(background.slice(background.indexOf('function waitForTabComplete('),background.indexOf('function sendToContent(')),ctx);
    const waiting=ctx.waitForTabComplete(7).then(()=>{settled=true;});await Promise.resolve();await Promise.resolve();
    if(status==='loading') {assert.equal(settled,false);listener(8,{status:'complete'});assert.ok(listener);listener(7,{status:'complete'});}
    await waiting;assert.equal(settled,true);assert.equal(listener,null);assert.equal(timers.size,0);
  }
});
test('Gemini retry count belongs to the caller; every attempt closes its own tab',async()=>{
  let attempts,opened=0;const closed=[],timers=new Set();
  const ctx=vm.createContext({STATE:{stopRequested:false},GEMINI_MESSAGE_ENVELOPE_MS:600000,withAutoRetry:async(label,fn,max)=>{attempts=max;return fn();},
    openFreshGeminiTab:async()=>++opened,safeCloseTab:id=>closed.push(id),sendToContent:async()=>'{"ok":true}',waitForGenerationOperation:p=>p,
    setInterval:fn=>{timers.add(fn);return fn;},clearInterval:fn=>timers.delete(fn)});
  vm.runInContext(background.slice(background.indexOf('async function askGeminiWithRetry('),background.indexOf('// ---------------- Downloading ZIP')),ctx);
  await ctx.askGeminiWithRetry({retryAttempts:1});assert.equal(attempts,1);assert.deepEqual(closed,[1]);
  await ctx.askGeminiWithRetry({});assert.equal(attempts,2);
  ctx.sendToContent=async()=>{throw Error('Timeout');};await assert.rejects(()=>ctx.askGeminiWithRetry({retryAttempts:1}),/Timeout/);
  assert.deepEqual(closed,[1,2,3]);assert.equal(timers.size,0);
});
