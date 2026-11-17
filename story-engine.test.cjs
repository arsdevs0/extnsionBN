const assert=require('node:assert/strict');
const {test}=require('node:test');
const engine=require('./story-engine.js'),library=require('./story-library.js'),renderer=require('./story-renderer.js');
const cast=[{name:'Sunny',aliases:'Sunless, Lost from Light'},{name:'Nephis',aliases:'Changing Star'}];
const fixture=()=>({version:4,title:'A meeting',chapter:'A complete chapter.',designBible:{Sunny:'Pale complexion, black hair'},panels:Array.from({length:6},(_,i)=>({
  id:i+1,beat:`Beat ${i+1}`,location:'Station',time:'night',carry:'Letter in left hand',shot:'medium',action:'Examines the letter',emotion:'Concern',visual:'An empty station under practical lamps',
  cast:[{name:'Sunless',pose:'Standing',gaze:'letter',bounds:{x:.2,y:.2,w:.35,h:.7}}],npcs:[],narration:'The same words echoed again.',dialogue:[{speaker:'Lost from Light',text:'No.'}]
}))});
test('aliases normalize to one identity; repeated source text survives',()=>{
  const p=engine.validate(fixture(),cast,20,true,6);
  assert.equal(p.panels[0].cast[0].name,'Sunny');assert.deepEqual(p.panels[0].characters,['Sunny']);
  assert.equal(p.panels[5].dialogue[0].text,'No.');assert.equal(p.panels[5].narration,'The same words echoed again.');
  assert.equal(p.designBible.Sunny,'Pale complexion, black hair');
});
test('registered cast cannot lose references by being listed as NPCs',()=>{
  const f=fixture();f.panels[0].npcs=[{name:'Changing Star',action:'Waits',gaze:'Sunny',bounds:{x:.6,y:.2,w:.3,h:.7}}];
  assert.deepEqual(engine.validate(f,cast,20,true,6).panels[0].characters,['Sunny','Nephis']);
});
test('reject alias collisions',()=>{
  assert.throws(()=>library.checkAliases([...cast,{name:'Other',aliases:'Sunless'}]),/two characters/);
});

test('Veteran Officer role resolves to the visible NPC name without replanning',()=>{
  const f=fixture(),p=f.panels[0];
  p.npcs=[{name:'Officer',role:'Veteran Officer',description:'Grey-haired officer',action:'Waits',gaze:'Sunny',bounds:{x:.6,y:.2,w:.3,h:.7}}];
  p.dialogue=[{speaker:' Veteran—OFFICER ',text:'You should have come earlier.'}];
  const panel=engine.validate(f,cast,20,true,6).panels[0];
  assert.deepEqual(panel.dialogue,[{speaker:'Officer',text:'You should have come earlier.'}]);
  assert.deepEqual(panel.characters,['Sunny']);assert.equal(panel.npcs.length,1);
});

test('off-screen dialogue is retained without inventing cast or uploading their identity',()=>{
  const f=fixture();f.panels[0].dialogue=[{speaker:'Changing Star',text:'Wait for me.'},{speaker:'Veteran Officer',text:'Be careful.'}];
  const p=engine.validate(f,cast,20,true,6).panels[0];
  assert.deepEqual(p.dialogue,[{speaker:'Nephis',text:'Wait for me.',offscreen:true},{speaker:'Veteran Officer',text:'Be careful.',offscreen:true}]);
  assert.deepEqual(p.characters,['Sunny']);assert.equal(p.npcs.length,0);
  assert.match(engine.imagePrompt(p,'','','photorealistic',undefined,true),/off-screen voice from Nephis; use no directional tail and do not add that person/);
  assert.match(engine.scenePrompt(p,'webtoon',true),/off-screen voice from Nephis, with no tail/);
  assert.doesNotMatch(engine.imagePrompt(p,'','','webtoon'),/Wait for me/);
});

test('ambiguous NPC roles remain unattached and explicit off-screen voices stay off-screen',()=>{
  const f=fixture(),p=f.panels[0];
  p.npcs=[{name:'Officer A',role:'Officer'},{name:'Officer B',role:'Officer'}];
  p.dialogue=[{speaker:'Officer',text:'Halt.'},{speaker:'Sunless',text:'Over here.',offscreen:true}];
  f.panels[1].dialogue=[{speaker:'lost-from-light',text:'Listen.'}];
  const panels=engine.validate(f,cast,20,true,6).panels;
  assert.deepEqual(panels[0].dialogue,[{speaker:'Officer',text:'Halt.',offscreen:true},{speaker:'Sunny',text:'Over here.',offscreen:true}]);
  assert.deepEqual(panels[1].dialogue,[{speaker:'Sunny',text:'Listen.'}]);
});
test('verbose new plans require correction; clean image prompts exclude dialogue',()=>{
  const f=fixture();f.panels[0].narration='An unforgettable thought. '.repeat(14).trim();f.panels[0].dialogue[0].text='Keep the whole line. '.repeat(12).trim();
  assert.throws(()=>engine.validate(f,cast,20,true,6),/too much lettering/);
  const p=f.panels[0];p.vehicles=[];
  const prompt=engine.imagePrompt(p,'REFERENCES','PHYSIQUE','webtoon');assert.doesNotMatch(prompt,/An unforgettable thought/);assert.match(prompt,/NO IN-IMAGE TEXT/);
});
test('panel count, chapter adaptation and canonical hair survive planning',()=>{
  assert.equal(engine.requestedPanelCount('make exactly 24 panels'),24);assert.equal(engine.minimumPanelCount('word '.repeat(900)),12);
  const prompt=engine.prompt('chapter',cast,60,'webtoon',true,'novel');assert.match(prompt,/Treat the pasted chapter as canon/);assert.match(prompt,/including curls/);assert.match(prompt,/image model renders the exact text together with the art/);
  assert.throws(()=>engine.validate(fixture(),cast,20,true,6,8),/exactly 8/);
});
test('bundled references exist; alternate forms share one entity ID',()=>{
  for(const p of library.presets)assert.ok(require('fs').existsSync(p.asset),p.asset);
  assert.equal(library.presets.length,19);assert.equal(library.presets[0].entityId,library.presets[1].entityId);
});
test('footer crop preserves edge artwork, dark text and protected content',()=>{
  const w=100,h=200,data=new Uint8ClampedArray(w*h*4).fill(255);
  assert.equal(renderer.safeFooterCrop(data,w,h),187);
  data[((h-1)*w+98)*4]=0;assert.equal(renderer.safeFooterCrop(data,w,h),h);
  data.fill(255);assert.equal(renderer.safeFooterCrop(data,w,h,[{x:.5,y:.9,w:.1,h:.09}]),h);
});
test('wrapping never truncates long words, Unicode or paragraphs',()=>{
  const ctx={measureText:s=>({width:[...s].length*10})},input='abcdefghijklmnopqrst यह कहानी पूरी है।\nSecond paragraph';
  const lines=renderer.wrap(ctx,input,100);assert.equal(lines.join('').replace(/\s/g,''),input.replace(/\s/g,''));assert.ok(lines.length>3);
});
test('lettering prompt matches the supplied inside-image caption and bubble design',()=>{
  const p=engine.validate(fixture(),cast,20,true,6).panels[0];
  const prompt=engine.imagePrompt(p,'','','webtoon',undefined,true);
  assert.match(prompt,/black rectangular card/);assert.match(prompt,/white bold italic serif/);
  assert.match(prompt,/oval\/rounded balloons/);assert.match(prompt,/tail/);assert.match(prompt,/4% edge inset/);
  assert.match(prompt,/Artwork continues to all four edges/);assert.match(prompt,/No white outer border/);
  assert.doesNotMatch(prompt,/NO IN-IMAGE TEXT|No text or graphic overlays|extension adds|outside the artwork/);
  assert.ok(prompt.includes(p.narration));assert.ok(prompt.includes(p.dialogue[0].text));
});

test('text density covers narration, dialogue count, combined budget and silent panels',()=>{
  for(const patch of [{narration:'a'.repeat(101)},{dialogue:[{speaker:'Sunny',text:'a'.repeat(91)}]},{dialogue:Array(3).fill({speaker:'Sunny',text:'Yes.'})},{narration:'a'.repeat(100),dialogue:[{speaker:'Sunny',text:'b'.repeat(90)}]},{narration:'a '.repeat(33)}]) {
    const f=fixture();Object.assign(f.panels[0],patch);assert.throws(()=>engine.validate(f,cast,20,true,6),/too much lettering/);
  }
  const f=fixture();f.panels[0].narration='';f.panels[0].dialogue=[];
  const silent=engine.validate(f,cast,20,true,6).panels[0];assert.equal(silent.narration,'');assert.equal(silent.dialogue.length,0);const prompt=engine.imagePrompt(silent,'','','webtoon',undefined,true);assert.match(prompt,/No narration card/);assert.match(prompt,/No speech balloons/);
});

test('height locks retain every supplied height and convert explicit units for relative scale',()=>{
  assert.equal(engine.heightCm('180 cm'),180);assert.equal(engine.heightCm('1.65 m'),165);
  assert.ok(Math.abs(engine.heightCm('5 ft 6 in')-167.64)<.001);assert.equal(engine.heightCm('180'),null);
  assert.equal(engine.heightCm('tall'),null);assert.equal(engine.heightCm(''),null);
  const rules=engine.heightRules([{name:'A',height:'180 cm'},{name:'B',height:'1.65 m'},{name:'C',height:'tall'},{name:'D',height:''}]);
  assert.match(rules,/A: standing height 180 cm/);assert.match(rules,/B: standing height 1.65 m/);assert.match(rules,/C: standing height tall/);
  assert.match(rules,/15.0 cm difference \(A taller\)/);assert.match(rules,/ratio 1.091/);assert.doesNotMatch(rules,/D:/);
  assert.match(rules,/not a forced pixel-height ratio/);
});

test('close coverage ignores stale wide bounds while group, wide and pose shots retain their intent',()=>{
  const f=fixture();f.panels[0].shot='wide';f.panels[1].cast.push({name:'Nephis',pose:'Waits',gaze:'Sunny',bounds:{x:.7,y:.2,w:.1,h:.3}});f.panels[1].shot='two-shot';
  const p=engine.validate(f,cast,20,true,6).panels;
  assert.equal(p[0].shot,'wide');assert.equal(p[1].shot,'two-shot');assert.equal(p[1].cast.length,2);assert.ok(p.filter(p=>p.shot==='close').length>=2);
  const prompt=engine.imagePrompt(p.find(p=>p.shot==='close'),'','','webtoon');assert.doesNotMatch(prompt,/"bounds"/);assert.match(prompt,/35–55%/);assert.match(prompt,/natural conversational separation/);
  const locked=engine.validate(f,cast,20,true,6,null,true);assert.ok(!locked.panels.some(p=>p.closeupAdjusted));
  const pose=engine.imagePrompt(p[1],'','','webtoon',undefined,false,true);assert.match(pose,/Match REFERENCE IMAGE 1 camera position/);assert.doesNotMatch(pose,/35–55%/);
});
