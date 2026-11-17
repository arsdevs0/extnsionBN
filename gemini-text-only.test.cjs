const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('content_gemini.js','utf8');
const helpers=source.slice(source.indexOf('  function textOnlyPlannerPrompt'),source.indexOf('  function isGeminiGenerating'));
const completion=source.slice(source.indexOf('  function looksLikeCompleteJson'),source.indexOf('  async function askText'));
const ask=source.slice(source.indexOf('  async function askText'),source.indexOf('  chrome.runtime.onMessage'));
function harness(overrides={}) {
 const context=vm.createContext({Date,Error,String,setOverlay:()=>{},sleep:async()=>{},deepQueryAll:()=>[],getComputedStyle:()=>({visibility:'visible'}),getMessageBlocks:()=>[],getLastAssistantText:()=>'',...overrides});
 vm.runInContext(helpers+completion+ask,context);return context;
}
test('image-making instructions and references are explicitly contained in a text-only planning brief',()=>{
 const ctx=harness(),prompt=ctx.textOnlyPlannerPrompt('Generate 5 photos and edit the attached outfit. Return {"prompts":[]}');
 assert.ok(prompt.startsWith('TEXT-ONLY PLANNING TASK'));
 assert.match(prompt,/separate Google Flow component/);assert.match(prompt,/visual analysis only/);
 assert.ok(prompt.indexOf('BEGIN PLANNING BRIEF')<prompt.indexOf('Generate 5 photos'));
 assert.match(prompt,/Keep visual instructions inside JSON strings/);
});
test('an active image toggle is deselected; an inactive suggestion is never clicked',async()=>{
 let active=true,clicks=0;
 const toggle={innerText:'Create images',getClientRects:()=>[{}],getAttribute:name=>name==='aria-pressed'&&active?'true':null,querySelectorAll:()=>[],matches:()=>true,click:()=>{clicks++;active=false;}};
 const ctx=harness({deepQueryAll:()=>active?[toggle]:[]});
 await ctx.ensureTextPlanningMode();assert.equal(clicks,1);await ctx.ensureTextPlanningMode();assert.equal(clicks,1);
});
test('a selected image mode that cannot be cleared blocks submission',async()=>{
 const tool={innerText:'Image generation',getClientRects:()=>[{}],getAttribute:()=>null,querySelectorAll:()=>[],matches:()=>false};
 const ctx=harness({deepQueryAll:()=>[tool]});
 await assert.rejects(ctx.ensureTextPlanningMode(),/GEMINI_IMAGE_MODE_ACTIVE/);
});
test('generated cards and large response images are detected, but JSON and small icons are not',()=>{
 let text='',card=null,images=[];
 const last={querySelector:()=>card,querySelectorAll:()=>images};
 const ctx=harness({getMessageBlocks:()=>[last],getLastAssistantText:()=>text});
 assert.equal(ctx.lastResponseIsImageGeneration(),false);
 card={};assert.equal(ctx.lastResponseIsImageGeneration(),true);
 card=null;images=[{getClientRects:()=>[{}],naturalWidth:1024,naturalHeight:1024}];assert.equal(ctx.lastResponseIsImageGeneration(),true);
 images=[{getClientRects:()=>[{}],naturalWidth:24,naturalHeight:24}];assert.equal(ctx.lastResponseIsImageGeneration(),false);
 text='Creating your image';assert.equal(ctx.lastResponseIsImageGeneration(),true);
 text='{"prompts":["Creating an image is handled by Flow"]}';assert.equal(ctx.lastResponseIsImageGeneration(),false);
});
test('image-only response fails promptly instead of waiting three minutes for text',async()=>{
 const ctx=harness({getMessageBlocks:()=>[{querySelector:()=>({})}],isGeminiGenerating:()=>true});
 await assert.rejects(ctx.waitForResponseDone(480000),/GEMINI_IMAGE_RESPONSE/);
});
for(const repeats of [false,true])test(repeats?'a second image response exits for planner recovery':'image response is stopped and corrected once, then JSON is returned',async()=>{
 let sends=0,attachments=0,stops=0,checks=0;const typed=[];
 const ctx=harness({setComposerText:async text=>typed.push(text),attachReferenceImages:async()=>attachments++,clickSend:async()=>sends++,getMessageBlocks:()=>Array(sends).fill({}),getLastAssistantText:()=>'{"prompts":["brief"]}',waitFor:async fn=>assert.ok(fn()),isGeminiGenerating:()=>false,findFirst:()=>({click:()=>stops++})});
 ctx.ensureTextPlanningMode=async()=>checks++;
 ctx.waitForResponseDone=async()=>{if(sends===1||repeats)throw Error('GEMINI_IMAGE_RESPONSE');};
 ctx.lastResponseIsImageGeneration=()=>false;
 if(repeats)await assert.rejects(ctx.askText('Generate images',1000,[{path:'ref.jpg'}]),/GEMINI_IMAGE_RESPONSE/);
 else assert.equal(await ctx.askText('Generate images',1000,[{path:'ref.jpg'}]),'{"prompts":["brief"]}');
 assert.equal(sends,2);assert.equal(attachments,1);assert.equal(stops,1);assert.ok(checks>=3);
 assert.ok(typed.every(p=>p.startsWith('TEXT-ONLY PLANNING TASK')));assert.match(typed[1],/CORRECTION/);
});
