const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./background.js'), 'utf8');
let active = 0, maxActive = 0, executions = 0;
const page = vm.createContext({
  URL, setTimeout, clearTimeout,
  location: { origin: 'https://flow.google.com', pathname: '/u/0/project/test' },
  document: { scripts:[], querySelectorAll:()=>[{src:'https://example.org/recaptcha/enterprise.js?render=wrong-key'}] },
  window: {
    ___grecaptcha_cfg: { clients: { 0: { nested: { sitekey: 'registered-key' } } } },
    grecaptcha: { enterprise: {
      ready: callback => callback(),
      execute: async (key, options) => {
        assert.equal(key, 'configured-key');
        assert.equal(options.action, 'IMAGE_GENERATION');
        active++; maxActive = Math.max(active, maxActive);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--; executions++;
        if (executions === 1) throw new Error('test failure');
        return 'fresh-token-' + executions;
      }
    } }
  }
});
const context = vm.createContext({
  FlowRequestGuard:require('./flow-request-guard.js').create({spacingMs:0}),
  waitForGenerationOperation:p=>p, FLOW_DYNAMIC_SITE_KEYS:new Map(), FLOW_RECAPTCHA_SITE_KEY: 'configured-key', getFlowSecurityHelperTab: async () => 99, executeFlowProjectSecurity: vm.runInContext(fs.readFileSync('flow-security-helper.js','utf8') + '; executeFlowProjectSecurity', page),
  chrome: { scripting: { executeScript: async ({target,func, args}) => {assert.ok([1,2,3].includes(target.tabId));return [{ result: await vm.runInContext(`(${func.toString()})`, page)(...args) }];} } }
});
vm.runInContext(source.slice(source.indexOf('const FLOW_SECURITY_QUEUES'), source.indexOf('function decodeDataUrl')), context);
(async () => {
  const results = await Promise.allSettled(Array.from({length: 3}, (_,i) => context.mintFlowRecaptchaToken(i+1)));
  assert.equal(results[0].status,'rejected');
  assert.equal(results[1].value, 'fresh-token-2');
  assert.equal(results[2].value, 'fresh-token-3');
  assert.equal(maxActive, 1);
  assert.equal(vm.runInContext('FLOW_SECURITY_QUEUES.size', context), 0);
  console.log('Flow security: helper origin, configured key, serialized minting, rejection recovery and queue cleanup passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
