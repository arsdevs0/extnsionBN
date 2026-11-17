const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/91830/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
test('popup shows five workers, keeps success colors, recovers a failed Stop, and restores stopping state',async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:420,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://fixture.test/**',async route=>{
   const file=path.resolve(__dirname,'.'+new URL(route.request().url()).pathname);
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
   await route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{
   window.listeners=[];window.stopCalls=0;
   window.chrome={runtime:{getManifest:()=>({version:'4.6.0'}),getURL:p=>location.origin+'/'+p,connect:()=>({onDisconnect:{addListener(){}},postMessage(){}}),onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async m=>{
    if(m.type==='CHECK_FLOW')return {ok:true,connected:true,account:'Fixture'};
    if(m.type==='GET_STATE')return {running:true,stopping:location.search.includes('stopping'),queue:[],logs:[{time:Date.now(),level:'success',text:'Backend reference ready — Subject: example.jpg'},{time:Date.now(),level:'error',text:'Fixture request failed'}]};
    if(m.type==='bb_stop'){stopCalls++;if(stopCalls===1)throw Error('Temporary connection failure');return {ok:true};}
    return {ok:true};
   }},storage:{local:{get:async()=>({bb_creation_mode:'classic',bb_generation_mode:'parallel'}),set:async()=>{},remove:async()=>{}}}};
  });
  await page.goto('https://fixture.test/popup.html');
  await page.waitForFunction(()=>document.querySelector('#stop')?.disabled===false);
  assert.match(await page.locator('#generationModeBadge').innerText(),/5/);
  assert.match(await page.locator('#generationMode option[value="parallel"]').innerText(),/5 at once/);
  assert.equal(await page.locator('#terminal .log-success').count(),1);
  await page.locator('#stop').click();await page.waitForFunction(()=>document.querySelector('#queueSummary').textContent.includes('Stop failed'));
  assert.equal(await page.locator('#stop').isEnabled(),true);
  await page.locator('#stop').click();assert.equal(await page.locator('#stop').isDisabled(),true);
  assert.equal(await page.locator('#generate').isDisabled(),true);
  await page.evaluate(()=>listeners.forEach(fn=>fn({type:'bb_done'})));
  assert.equal(await page.locator('#generate').isEnabled(),true);
  for(const width of [420,340]) {
   await page.setViewportSize({width,height:950});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#generationMode').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(__dirname,`tmp/popup-${width}.png`)});
  }
  await page.goto('https://fixture.test/popup.html?stopping');
  await page.waitForFunction(()=>document.querySelector('#generationModeBadge').textContent.includes('5'));
  assert.equal(await page.locator('#stop').isDisabled(),true);assert.equal(await page.locator('#generate').isDisabled(),true);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
