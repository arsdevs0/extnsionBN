const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let policy, appended = 0;
const window = {trustedTypes:{createPolicy:(name, rules)=>{assert.equal(name,'default');policy=rules;return rules;}}};
const context = vm.createContext({window,URL,Date,setTimeout,clearTimeout,
  location:{origin:'https://flow.google.com',pathname:'/about'},
  document:{
    querySelectorAll:()=>[],
    querySelector:selector=>selector==='script[nonce]'?{nonce:'page-nonce'}:null,
    createElement:tag=>{assert.equal(tag,'script');return {setAttribute:()=>{}};},
    head:{appendChild:script=>{
      appended++;
      assert.equal(script.nonce,'page-nonce');
      assert.equal(script.src,'https://www.google.com/recaptcha/enterprise.js?render=public-key');
      window.grecaptcha={enterprise:{ready:callback=>callback(),execute:async(key,{action})=>{
        assert.equal(key,'public-key');assert.equal(action,'UPLOAD_IMAGE');return 'fresh-token';
      }}};
    }}
  }
});
vm.runInContext(fs.readFileSync(require.resolve('./flow-security-helper.js'),'utf8'),context);
(async()=>{
  assert.equal((await context.executeFlowHelperSecurity('public-key','UPLOAD_IMAGE')).token,'fresh-token');
  assert.equal(appended,1);
  assert.throws(()=>policy.createScriptURL('https://example.com/recaptcha/evil.js'),/Unexpected/);
  assert.throws(()=>policy.createScriptURL('https://www.google.com/other.js'),/Unexpected/);
  assert.equal(policy.createHTML,undefined); assert.equal(policy.createScript,undefined);
  assert.match((await context.executeFlowHelperSecurity('public-key','INVALID')).error,/Invalid/);
  assert.equal(appended,1);
  console.log('Flow helper loader: official URL, page nonce, action, restricted policy and invalid-action rejection passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
