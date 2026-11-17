const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {buildUploadRequest, parseUploadResponse, buildProjectCreateRequest, parseProjectCreateResponse} = require('./flow-rpc.js');
const request = JSON.parse(buildUploadRequest({projectId:'project',imageBytes:'aGVsbG8=',mimeType:'image/jpeg',fileName:'test.jpg',challengeToken:'fresh-test-token',requestId:'request',clientId:'client'}));
assert.equal(request[0][0][0], 'maseQ');
const body = JSON.parse(request[0][0][1]);
assert.equal(body[0][5], 'project');
assert.deepEqual(body[0][10], ['fresh-test-token',1]);
assert.equal(body[8], 'test.jpg');
// Compare the entire request with the supplied working extension's codec.
const adapter = fs.readFileSync(require.resolve('./assets/adapter-LgTzSSDb.js'), 'utf8');
const reference = vm.createContext({});
for (const [name, next] of [['_','F'], ['z','fe'], ['vr','Ar']]) {
  vm.runInContext(adapter.slice(adapter.indexOf(`function ${name}(`), adapter.indexOf(`function ${next}(`)), reference);
}
vm.runInContext("let ids = ['request', 'client']; function F() { return ids.shift(); }", reference);
assert.deepEqual(body, JSON.parse(JSON.stringify(reference.vr('project', 'fresh-test-token', 'aGVsbG8=', 'image/jpeg', 'test.jpg'))));
const payload = [['media','project','asset'],['asset',null,null,['test.jpg',null,null,null,'media'],'project']];
const chunk = JSON.stringify([['wrb.fr','maseQ',JSON.stringify(payload),null,null,null,'generic'],['di',8890]]);
const response = ")]}'\n\n" + chunk.length + '\n' + chunk + '\n25\n[["e",4,null,null,643]]';
assert.deepEqual(parseUploadResponse(response,'project'), {mediaId:'media',assetId:'asset',projectId:'project',fileName:'test.jpg'});
const renamed=structuredClone(payload);renamed[1][3][0]='server-location.jpg';
assert.equal(parseUploadResponse(JSON.stringify([['wrb.fr','maseQ',JSON.stringify(renamed)]]),'project').fileName,'server-location.jpg');
const emptyMedia=[['','project','asset'],['asset',null,null,['location.jpg',null,null,null,''],'project']];
assert.throws(()=>parseUploadResponse(JSON.stringify([['wrb.fr','maseQ',JSON.stringify(emptyMedia)]]),'project'),/mapping/);
assert.throws(()=>parseUploadResponse(response,'another-project'),/another project/);
assert.throws(()=>parseUploadResponse('[["wrb.fr","WuwhI","[]"]]','project'),/rpc-row=missing; received=WuwhI/);
assert.throws(()=>parseUploadResponse('[["wrb.fr","maseQ",null]]','project'),/NO_PAYLOAD.*payload=null/);
for (const failed of [
  '[["wrb.fr","maseQ",null,null,null,[3]]]',
  '[["wrb.fr","maseQ",null],["er","maseQ",null,null,null,400,null,null,null,3]]'
]) {
  assert.throws(() => parseUploadResponse(failed, 'project'), error =>
    error.code === 'FLOW_UPLOAD_INVALID_ARGUMENT' && /INVALID_ARGUMENT.*payload=null/.test(error.message));
}
const createRequest = JSON.parse(buildProjectCreateRequest('jHPbke','Test project'));
assert.deepEqual(JSON.parse(createRequest[0][0][1]), ['projects/*',[null,['Test project']],[null,22]]);
const createdData = ['project_12345678'];
const createChunk = JSON.stringify([['wrb.fr','jHPbke',JSON.stringify(createdData),null,null,null,'generic'],['di',8890]]);
const createResponse = ")]}'\n\n" + createChunk.length + '\n' + createChunk;
assert.deepEqual(parseProjectCreateResponse(createResponse,'jHPbke'), {projectId:'project_12345678'});
assert.throws(()=>parseProjectCreateResponse(createResponse,'otherRpc'),/NO_PAYLOAD.*rpc-row=missing/);
console.log('Flow RPC codec: upload and current project_create request/response tests passed.');
