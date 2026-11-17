const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const classic=require('./classic-direction.js'),subjectFlow=require('./subject-flow-direction.js');
const fixture=fs.readFileSync('classic-direction.test.cjs','utf8');
const harness=Function('require',fixture.slice(0,fixture.indexOf('\ntest('))+'\nreturn harness;')(require);
const pose={name:'pose',dataUrl:'data:image/png;base64,AA=='};
const physical='Thick full build, broad upper arms, full thighs, soft abdomen; chest 46 inches, hips 49 inches.';

for(const workflowMode of ['classic','subject-flow'])
for(const engine of ['direct','gemini'])
for(const generationMode of ['sequential','parallel'])
for(const poseEnabled of [false,true])
test(`${workflowMode}/${engine}/${generationMode}/pose=${poseEnabled}: exact figure reaches every generation and retry`,async()=>{
  const h=harness(engine,{workflowMode,generationMode,physicalDetails:physical,
    tuneBust:'48 inches',tuneHips:'52 inches',tuneWeight:'90 kg',
    systemInstruction:'Use the room shown in the environment reference.',
    shortPrompt:'Standing near a window in a loose cotton outfit.',
    ...(poseEnabled?{poseReference:pose}:{})});
  const submitted=[],generate=h.context.generateFlowImage;let failed=false;
  h.context.generateFlowImage=async(...args)=>{
    submitted.push(args[1]);
    if(!failed){failed=true;throw Object.assign(Error('Not sent; local preparation retry'),{code:'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:true});}
    return generate(...args);
  };
  await h.run();
  assert.equal(h.images.length,3);
  assert.ok(h.snapshots.at(-1).every(item=>item.status==='done'));
  const original=submitted[0];
  await h.context.STATE.retryHandler(0);
  assert.equal(h.images.length,4);
  assert.ok(submitted.filter(prompt=>prompt===original).length>=2,'failed preparation retains the same figure on retry');
  for(const {prompt,refs} of h.images){
    assert.equal(prompt.split(physical).length-1,1,'one exact original figure, not rewritten or duplicated');
    for(const trait of ['Bust/Chest: 48 inches','Hips/Thighs: 52 inches','Weight: 90 kg'])assert.ok(prompt.includes(trait),trait);
    assert.match(prompt,/Body Tuning wins over Figure Details for the same trait/);
    assert.match(prompt,/requested thick\/full build retains mass across torso, upper arms, hips and thighs/);
    assert.match(prompt,/Loose clothing stays loose/);
    assert.doesNotMatch(prompt,/56-inch|narrow waist|cling tightly|generally fat or obese|exact silhouette/);
    assert.ok(refs.some(ref=>ref.name==='identity'));
    assert.ok(refs.some(ref=>ref.name==='outfit'));
    if(poseEnabled){
      assert.equal(refs[0].name,'pose');
      assert.match(prompt,/Rebuild the outer contour/);
      assert.match(prompt,/outer body contour is not a size constraint/);
      assert.doesNotMatch(prompt,/this exact face and natural body;/);
    } else {
      const targetOffset=prompt.indexOf('USER TARGET');
      assert.ok(prompt.indexOf(physical)<targetOffset,'body authority precedes scene instructions');
    }
  }
  assert.equal(h.planner.length,engine==='gemini'&&!poseEnabled?1:0);
  for(const prompt of h.planner){
    assert.ok(prompt.includes(physical));assert.ok(prompt.includes('48 inches'));assert.ok(prompt.includes('52 inches'));
  }
});

test('Subject Flow keeps embedded body notes without inventing a contradictory fallback',async()=>{
  const h=harness('direct',{workflowMode:'subject-flow',physicalDetails:'',systemInstruction:'Thick overall build, wide waist and full upper arms.',shortPrompt:'Sitting beside the window.'});
  await h.run();
  for(const {prompt} of h.images){
    assert.ok(prompt.includes(h.params.systemInstruction));
    assert.doesNotMatch(prompt,/narrow waist|cling tightly|56-inch|No additional figure details specified/);
    assert.match(prompt,/target\/base body wording wins over defaults and reference bodies/);
  }
});

test('explicit lean build and partial measurements do not receive an unrelated thick default',()=>{
  for(const builder of [classic,subjectFlow])for(const physical of ['Lean athletic build, small waist.','Height 165 cm, hips 52 inches.']){
    const contract=builder.figure({physical});
    assert.ok(contract.includes(physical));
    assert.doesNotMatch(contract,/THICK HOURGLASS BASE|DEFAULT BUILD|56-inch/);
  }
  assert.match(classic.figure(),/THICK HOURGLASS BASE/);
  assert.doesNotMatch(classic.figure(),/\d+\s*(inch|kg|cm)/);
  assert.doesNotMatch(subjectFlow.figure(),/DEFAULT BUILD/);
});

test('service-worker script order loads the shared figure builder without CommonJS',()=>{
  const source=fs.readFileSync('background.js','utf8');
  const scripts=[...source.match(/importScripts\(([^;]+)\)/)[1].matchAll(/"([^"]+)"/g)].map(match=>match[1]);
  const context=vm.createContext({});
  for(const file of scripts.filter(file=>['figure-direction.js','classic-direction.js','subject-flow-direction.js'].includes(file)))
    vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
  assert.equal(vm.runInContext("ClassicDirection.figure({physical:'Full thighs'})",context),classic.figure({physical:'Full thighs'}));
  assert.equal(vm.runInContext("SubjectFlowDirection.figure({physical:'Full thighs'})",context),subjectFlow.figure({physical:'Full thighs'}));
  const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));
  assert.ok(source.includes(`runtimeVersion: '${manifest.version}'`));
  assert.ok(fs.readFileSync('popup.html','utf8').includes(`v${manifest.version}</span>`));
});
