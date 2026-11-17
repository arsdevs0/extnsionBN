const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const rpc = require('./flow-rpc.js');
const source = fs.readFileSync(require.resolve('./background.js'), 'utf8');
function extract(name, next) {
  return source.slice(source.indexOf(`async function ${name}(`), source.indexOf(`async function ${next}(`));
}

(async () => {
  let createdTabOptions = null;
  let freshTab = null;
  const freshTabContext = vm.createContext({
    URL, Date, sleep: async () => {},
    chrome: { tabs: {
      get: async id => id === 77 ? freshTab : ({url:'https://flow.google.com/u/2/',pendingUrl:'',status:'complete'}),
      create: async options => { createdTabOptions=options; freshTab={id:77,url:options.url,status:'complete'}; return {id:77}; },
      update: async () => {}
    } }
  });
  vm.runInContext(extract('openFreshFlowProjectTab','runGeneration'),freshTabContext);
  assert.equal(await freshTabContext.openFreshFlowProjectTab(1,'new-project'),77);
  assert.equal(createdTabOptions.url,'https://flow.google.com/u/2/project/new-project');
  assert.equal(createdTabOptions.active,false);

  let tab = { url: 'https://flow.google.com/u/2/', status: 'complete' };
  const updates = [];
  const context = vm.createContext({ URL, Date, sleep: async () => {}, chrome: { tabs: {
    get: async () => tab,
    update: async (id, value) => { updates.push(value.url); tab = { ...tab, ...value }; }
  } } });
  vm.runInContext(extract('ensureFlowProjectPage', 'runGeneration'), context);
  await context.ensureFlowProjectPage(1, 'project');
  assert.deepEqual(updates, ['https://flow.google.com/u/2/project/project']);
  await context.ensureFlowProjectPage(1, 'project');
  assert.equal(updates.length, 1, 'already-open editor must not reload');
  tab.url = 'https://accounts.google.com/';
  await assert.rejects(context.ensureFlowProjectPage(1, 'project'), /signed-in Flow/);

  let posted = false,postCount=0,responseStatus=200;
  let prepared = false;
  let responseText = JSON.stringify([['wrb.fr', 'maseQ', JSON.stringify([
    ['media','project','asset'], ['asset',null,null,['test.jpg',null,null,null,'media'],'project']
  ])]]);
  const page = vm.createContext({
    URL, URLSearchParams, AbortController, Date, setTimeout, clearTimeout,
    window: { WIZ_global_data: { SNlM0e: 'test', cfb2h: 'build', FdrFJe: 'session' } },
    document: { scripts: [{ src: 'https://www.google.com/recaptcha/enterprise.js?render=discovered-key' }], documentElement: { lang: 'en' } },
    location: { origin:'https://flow.google.com',href: 'https://flow.google.com/u/2/project/project', pathname: '/u/2/project/project' },
    fetch: async (url, options) => {
      posted = true;
      postCount++;
      assert.match(url, /^\/u\/2\/_\/AiSandboxAngularFrontend\/data\/batchexecute\?/);
      const payload = JSON.parse(JSON.parse(new URLSearchParams(options.body).get('f.req'))[0][0][1]);
      assert.equal(payload[0][10][0], 'test-challenge');
      assert.equal(payload[0][5], 'project');
      assert.equal(payload[1], '/9j/normalized');
      assert.equal(payload[2], 'image/jpeg');
      assert.equal(payload[8], 'test__test-id.jpg');
      return { ok: responseStatus===200, status:responseStatus, text: async () => responseText };
    }
  });
  const uploadLogs=[],uploadReports=[];
  const uploadContext = vm.createContext({
    waitForGenerationOperation:p=>p,
    FlowDiagnostics:{record:(id,step,detail)=>{const event={step,detail};uploadLogs.push(event);return event;},save:async report=>uploadReports.push(report)},
    FlowRequestGuard:require('./flow-request-guard.js').create(),
    makeFlowId: () => 'test-id', mintFlowRecaptchaToken: async (id, action) => {
      assert.ok(prepared, 'prepare image before minting a short-lived token');
      assert.equal(action, 'UPLOAD_IMAGE'); return 'test-challenge';
    },
    BigBombFlowRpc: { ...rpc, prepareUploadImage: async (data, name) => {
      assert.equal(data, 'data'); assert.equal(name, 'test.png'); prepared = true;
      return { mimeType: 'image/jpeg', imageBytes: '/9j/normalized', fileName: 'test.jpg' };
    } },
    chrome: { scripting: { executeScript: async ({ func, args }) => {
      const execute = vm.runInContext(`(${func.toString()})`, page);
      return [{ result: await execute(...args) }];
    } } }
  });
  vm.runInContext(fs.readFileSync(require.resolve('./flow-tab-recovery.js'),'utf8')+'\n'+extract('uploadDataUrlToFlow', 'uploadReferenceUntilSuccess'), uploadContext);
  const uploadFlow={tabId:1,projectId:'project'};
  assert.equal(await uploadContext.uploadDataUrlToFlow(uploadFlow, 'data', 'test.png'), 'media');
  assert.equal(uploadFlow.referenceFiles.media,'test.jpg','use the canonical backend asset name, not the requested UUID name');
  assert.equal(uploadFlow.referenceAssets.media.assetId,'asset');
  assert.equal(uploadFlow.referenceAssets.media.requestedFileName,'test__test-id.jpg');
  assert.equal(uploadFlow.referenceRevision,1);assert.equal(uploadFlow.nativeUploadCount,0);
  assert.equal(uploadLogs.find(event=>event.step==='backend_upload_result').detail.httpStatus,200);
  assert.equal(uploadLogs.find(event=>event.step==='backend_upload_confirmed').detail.mediaId,'media');
  assert.ok(posted);
  assert.equal(await uploadContext.uploadDataUrlToFlow(uploadFlow,'data','same-location.png'),'media');
  assert.equal(postCount,1,'the same source selected for another role reuses its confirmed backend upload');
  const concurrentFlow={tabId:1,projectId:'project'};
  await Promise.all([uploadContext.uploadDataUrlToFlow(concurrentFlow,'data','test.png'),uploadContext.uploadDataUrlToFlow(concurrentFlow,'data','same-location.png')]);
  assert.equal(postCount,2,'concurrent uploads of identical data share one request');
  responseText = '[["wrb.fr","maseQ",null,null,null,[3]]]';
  const failedFlow={tabId:1,projectId:'project'};
  await assert.rejects(uploadContext.uploadDataUrlToFlow(failedFlow, 'data', 'test.png'),
    error => error.code === 'FLOW_UPLOAD_INVALID_ARGUMENT');
  assert.equal(uploadReports.at(-1).submitted,true);assert.equal(uploadReports.at(-1).code,'FLOW_UPLOAD_INVALID_ARGUMENT');
  const requestsAfterFailure=postCount;
  responseText=JSON.stringify([['wrb.fr','maseQ',JSON.stringify([
    ['media','project','asset'],['asset',null,null,['test.jpg',null,null,null,'media'],'project']
  ])]]);
  assert.equal(await uploadContext.uploadDataUrlToFlow(failedFlow,'data','test.png'),'media');
  assert.equal(postCount,requestsAfterFailure+1,'a failed upload never stays cached as a successful reference');
  responseStatus=403;responseText='<html>private-token-must-not-be-logged</html>';
  await assert.rejects(uploadContext.uploadDataUrlToFlow({tabId:1,projectId:'project'},'data','test.png'),error=>error.code==='FLOW_AUTH_REQUIRED'&&!error.message.includes('private-token'));
  assert.equal(uploadReports.at(-1).submitted,true);
  assert.ok(!JSON.stringify(uploadReports).includes('private-token'));
  responseStatus=200;
  const beforeWrongProject=postCount;
  page.location.pathname='/u/2/project/different';
  await assert.rejects(uploadContext.uploadDataUrlToFlow({tabId:1,projectId:'project'},'data','test.png'),/project changed/);
  assert.equal(postCount,beforeWrongProject);assert.equal(uploadReports.at(-1).submitted,false);
  page.location.pathname='/u/2/project/project';
  posted = false;
  uploadContext.BigBombFlowRpc.prepareUploadImage = async () => { throw Object.assign(new Error('bad image'), {code:'FLOW_UPLOAD_INVALID_IMAGE'}); };
  await assert.rejects(uploadContext.uploadDataUrlToFlow({tabId:1,projectId:'project'}, 'data', 'test.png'), /bad image/);
  assert.equal(posted, false, 'invalid images must never be submitted');

  let attempts = 0;
  const delays = [];
  const retryContext = vm.createContext({
    FlowRetry:require("./flow-retry.js"),STATE:{stopRequested:false}, setStatus:()=>{}, log:()=>{},
    interruptibleWait: async ms => delays.push(ms),sleep: async ms => delays.push(ms), uploadDataUrlToFlow: async () => {
      attempts++; throw Object.assign(new Error('rejected'), {code:'FLOW_UPLOAD_INVALID_ARGUMENT'});
    }});
  vm.runInContext(source.slice(source.indexOf('async function uploadReferenceUntilSuccess('), source.indexOf('function makeFlowId(')), retryContext);
  await assert.rejects(retryContext.uploadReferenceUntilSuccess({}, 'data', 'test.png', 'Subject'), /rejected/);
  assert.equal(attempts, 1, 'permanent invalid payload must not repeat five times');
  assert.deepEqual(delays, []);
  attempts = 0;
  retryContext.uploadDataUrlToFlow = async () => {
    if (++attempts < 3) throw Object.assign(new Error('unavailable'), {code:'FLOW_RPC_REJECTED'});
    return 'media';
  };
  assert.equal(await retryContext.uploadReferenceUntilSuccess({}, 'data', 'test.png', 'Subject'), 'media');
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [2500, 5000]);
  assert.match(source, /importScripts\([^;]*"flow-rpc.js"/);


  console.log('Flow upload regression tests passed: fresh background project tab, legacy navigation, account preservation, upload-specific security action and parser import.');
})().catch(error => { console.error(error); process.exitCode = 1; });
