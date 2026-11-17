const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rpc = require('./flow-rpc.js');
const media = ['media'];
media[6] = [[...Array(13).fill(null), 'https://example.com/image?q="test"&path=\\x']];
const frame = JSON.stringify([['wrb.fr', 'ogiZ0b', JSON.stringify([[media]]), null, null, null]]);
const response = ")]}'\n" + frame.length + '\n' + frame;
assert.equal(rpc.parseGenerationResponse(response).mediaId, 'media');
assert.equal(rpc.parseGenerationResponse(response).fifeUrl, media[6][0][13]);
assert.throws(() => rpc.parseGenerationResponse('[["wrb.fr","ogiZ0b",null,null,null,[7]]]'), /PERMISSION_DENIED/);
assert.throws(() => rpc.parseGenerationResponse('[["er","ogiZ0b",null,null,null,429,null,null,null,8]]'), /RESOURCE_EXHAUSTED/);
assert.throws(() => rpc.parseGenerationResponse('[["wrb.fr","ogiZ0b",null,null,null,[7,null,[["type.googleapis.com/google.rpc.ErrorInfo",["PUBLIC_ERROR_UNUSUAL_ACTIVITY"]]]]]]'), /PUBLIC_ERROR_UNUSUAL_ACTIVITY/);
assert.throws(() => rpc.parseGenerationResponse('[["er","ogiZ0b",null,null,null,500,null,null,null,5]]'), /NOT_FOUND/);
assert.throws(() => rpc.parseGenerationResponse('[["wrb.fr","ogiZ0b","[]"]]'), /no usable image/);
const source = fs.readFileSync(require.resolve('./background.js'), 'utf8');
const func = source.slice(source.indexOf('async function generateFlowImage('), source.indexOf('async function requestFlowUpscale('));
let captured;
const context=vm.createContext({
  FLOW_MODEL_API_IDS:{NARWHAL:'BELUGA'},MODEL_DISPLAY_NAMES:{NARWHAL:'Nano Banana 2.1'},
  log:()=>{},FlowBackend:{generate:async(...args)=>{captured=args;return {mediaId:'backend',transport:'backend-rpc'};}}
});
vm.runInContext(fs.readFileSync(require.resolve('./flow-tab-recovery.js'),'utf8')+'\n'+func,context);
(async()=>{
  const flow={tabId:7,projectId:'project'},refs=[{name:'subject'},{name:'outfit'}];
  const diagnosticContext={imageIndex:2,attempt:1};
  const result=await context.generateFlowImage(flow,'test',refs,'NARWHAL','IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',diagnosticContext);
  assert.equal(result.transport,'backend-rpc');assert.deepEqual(captured,[flow,'test',refs,'BELUGA','3:4',diagnosticContext]);
  let upscales=0,requested=[];
  const quality=vm.createContext({
    log:()=>{},URL,waitForGenerationOperation:p=>p,requestFlowUpscale:async()=>{upscales++;throw Error('must not call custom upscale');},
    fetchNativeFlowImage:async(flow,url)=>{requested.push(url);return {ok:true,blob:async()=>({size:2000})};},
    createImageBitmap:async()=>({width:1024,height:1365,close:()=>{}})
  });
  const qualitySource=source.slice(source.indexOf('async function fetchMaximumQualityFlowImage('),source.indexOf('// ---------------- Gemini Planning Tab'));
  vm.runInContext(qualitySource,quality);
  const original='https://flow-content.google/image/native?Expires=test';
  for(const transport of ['native-ui','backend-rpc']) {
    requested=[];
    const image=await quality.fetchMaximumQualityFlowImage(flow,'native',original,{preferUpscale:true,transport});
    assert.equal(upscales,0);assert.deepEqual(requested,[original]);assert.equal(image.quality,'native');
  }
  console.log('Flow generation: backend routing, model/aspect normalization, response decoding and original-resolution download passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
