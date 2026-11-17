const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('popup.js','utf8');
const html=fs.readFileSync('popup.html','utf8');
for (const kind of ['sfSubjects','sfOutfits','sfKnowledge','sfQuality']) {
  assert.ok(source.includes(`${kind}:state.${kind}.map(item=>({...item}))`));
  assert.ok(source.includes(`[STORAGE.${kind}]:state.${kind}`));
}
assert.match(source,/system:sfSystemPrompt\.value,target:sfTargetPrompt\.value,figure:byId\("sfFigureDetails"\)\.value/);
assert.match(source,/fullSettings:\{mode:state\.mode,shortPrompt:shortPrompt\.value,physicalDetails:byId\("physicalDetails"\)\.value/);
assert.match(source,/if\(full\)\{\s*setMode\(full\.mode\|\|"classic",false\)/);
assert.match(source,/format:"flipo-subject-flow-preset",version:1,preset/);
assert.match(html,/Upload preset/);
assert.match(source,/exportSfPreset/);
assert.match(html,/id="sfPresetFile" type="file" accept="application\/json,\.json"/);
assert.match(html,/all four reference groups/);
console.log('Full preset coverage: every workflow, prompts, settings, character and reference images, JSON upload/export controls passed.');
