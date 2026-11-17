let storyQueueDraft=[],customCharacterPresets=[],savedCastPresets=[],storySessionView=null;
const STORY_TOOLS_KEYS={presets:'bb_character_presets',drafts:'bb_story_queue_drafts',casts:'bb_cast_presets'};
const storyNode=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
async function saveCharacterPreset(character) {
  if(!character.name.trim()||!character.subjects.length||!character.outfits.length)throw Error('Add a name, identity reference and outfit reference before saving a character preset.');
  const preset=structuredClone(character);preset.presetId=character.presetId||crypto.randomUUID();character.presetId=preset.presetId;
  const at=customCharacterPresets.findIndex(p=>p.presetId===preset.presetId);
  if(at<0)customCharacterPresets.push(preset);else customCharacterPresets[at]=preset;
  await chrome.storage.local.set({[STORY_TOOLS_KEYS.presets]:customCharacterPresets});await saveStoryCharacters();
  byId('storyLibrarySeries').value='custom';renderCharacterLibrary();byId('storyLibraryNotice').textContent=`${character.name} saved. Add this same design to any later chapter with one click.`;
}
async function materializeCharacter(preset) {
  let character;
  if(preset.asset) {
    const response=await fetch(chrome.runtime.getURL(preset.asset));if(!response.ok)throw Error('Character reference could not load.');
    const blob=await response.blob();
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    const record={id:crypto.randomUUID(),name:preset.asset.split('/').pop(),dataUrl};
    character={...newStoryCharacter(),...preset,subjects:[record],outfits:[{...record,id:crypto.randomUUID()}]};
    delete character.asset;
  } else character=structuredClone(preset);
  character.id=crypto.randomUUID();
  return character;
}
async function addLibraryCharacter(preset) {
  const character=await materializeCharacter(preset);
  const existing=state.storyCharacters.findIndex(c=>(character.entityId&&c.entityId===character.entityId)||c.name.trim().toLowerCase()===character.name.trim().toLowerCase());
  if(existing>=0)state.storyCharacters[existing]=character;
  else {
    const empty=state.storyCharacters.findIndex(c=>!c.name.trim()&&!c.subjects.length&&!c.outfits.length);
    if(empty>=0)state.storyCharacters[empty]=character;else state.storyCharacters.push(character);
  }
  await saveStoryCharacters();renderStoryCharacters();renderCharacterLibrary();
  byId('storyLibraryNotice').textContent=`${character.name}${character.variant?` · ${character.variant}`:''} ${existing>=0?'updated':'added'}. Identity and outfit references are paired.`;
}
function refreshCastOptions() {
  const select=byId('storyLibrarySeries'),selected=select.value;
  select.querySelectorAll('[data-saved-cast]').forEach(n=>n.remove());
  for(const preset of savedCastPresets){const option=storyNode('option','',preset.label);option.value=`cast:${preset.id}`;option.dataset.savedCast='true';select.append(option);}
  select.value=selected;
}
async function saveCurrentCast() {
  const characters=state.storyCharacters.filter(c=>c.name.trim()||c.subjects.length||c.outfits.length);
  if(!characters.length)return null;
  const label=`Saved cast · ${characters.map(c=>c.name||'Unnamed').slice(0,2).join(' + ')} · ${new Date().toLocaleString()}`;
  const snapshot={id:crypto.randomUUID(),label,characters:structuredClone(characters)};
  savedCastPresets.push(snapshot);
  for(const character of characters) {
    if(!character.name.trim())continue;
    customCharacterPresets.push({...structuredClone(character),presetId:crypto.randomUUID(),savedLabel:label});
  }
  await chrome.storage.local.set({[STORY_TOOLS_KEYS.casts]:savedCastPresets,[STORY_TOOLS_KEYS.presets]:customCharacterPresets});refreshCastOptions();return snapshot;
}
async function selectStoryCollection() {
  const select=byId('storyLibrarySeries'),value=select.value;
  if(value!=='shadow'&&!value.startsWith('cast:')){renderCharacterLibrary();return;}
  select.disabled=true;
  try {
    let incoming;
    if(value==='shadow') {
      const unique=new Map();for(const preset of StoryLibrary.presets)if(!unique.has(preset.entityId))unique.set(preset.entityId,preset);
      incoming=await Promise.all([...unique.values()].map(materializeCharacter));
    } else {
      const saved=savedCastPresets.find(p=>`cast:${p.id}`===value);if(!saved)throw Error('Saved cast is unavailable.');
      incoming=structuredClone(saved.characters).map(c=>({...c,id:crypto.randomUUID()}));
    }
    const previous=await saveCurrentCast();
    state.storyCharacters=incoming;await saveStoryCharacters();renderStoryCharacters();renderCharacterLibrary();
    byId('storyLibraryNotice').textContent=`${incoming.length} characters loaded automatically.${previous?` Previous characters saved as “${previous.label}”.`:''} Choose alternate forms below when your chapter needs them.`;
  } catch(e){alert(e.message);}finally{select.disabled=false;}
}
function renderCharacterLibrary() {
  const host=byId('storyLibraryList');host.replaceChildren();
  const custom=byId('storyLibrarySeries').value!=='shadow',query=byId('storyLibrarySearch').value.trim().toLowerCase();
  const presets=(custom?customCharacterPresets:StoryLibrary.presets).filter(p=>`${p.name} ${p.aliases||''} ${p.variant||''}`.toLowerCase().includes(query));
  for(const preset of presets) {
    const row=storyNode('article','story-library-item'),img=storyNode('img');img.src=preset.asset?chrome.runtime.getURL(preset.asset):preset.subjects[0]?.dataUrl;img.alt=preset.name;img.loading='lazy';
    const info=storyNode('div');info.append(storyNode('strong','',preset.name),storyNode('small','',preset.variant||preset.savedLabel||preset.aliases||'Custom character'));
    const active=state.storyCharacters.some(c=>preset.entityId?c.entityId===preset.entityId&&c.variant===preset.variant:c.presetId===preset.presetId);
    const add=storyNode('button','',active?'✓ Added':'+ Add');add.type='button';add.disabled=active;add.setAttribute('aria-label',`Add ${preset.name} ${preset.variant||''}`);
    add.addEventListener('click',async()=>{add.disabled=true;try {await addLibraryCharacter(preset);}catch(e){alert(e.message);add.disabled=false;}});
    row.append(img,info,add);
    if(custom){const del=storyNode('button','story-preset-delete','×');del.title=`Delete preset ${preset.name}`;del.type='button';del.addEventListener('click',async()=>{customCharacterPresets=customCharacterPresets.filter(p=>p.presetId!==preset.presetId);await chrome.storage.local.set({[STORY_TOOLS_KEYS.presets]:customCharacterPresets});renderCharacterLibrary();});row.append(del);}
    host.append(row);
  }
  if(!presets.length)host.append(storyNode('p','story-tools-note',custom?'Save a character card as a preset to reuse it here.':'No matching characters.'));
}
function renderChapterDrafts() {
  const host=byId('storyQueueDrafts');host.replaceChildren();
  storyQueueDraft.forEach((draft,index)=>{
    const card=storyNode('details','story-queued-draft');card.open=!draft.source;
    const summary=storyNode('summary','',draft.title||`Queued chapter ${index+2}`);
    const title=storyNode('input');title.placeholder=`Chapter ${index+2} title (optional)`;title.value=draft.title;title.maxLength=160;title.setAttribute('aria-label',`Queued chapter ${index+2} title`);
    const source=storyNode('textarea');source.value=draft.source;source.rows=6;source.maxLength=30000;source.placeholder='Paste the complete next chapter…';source.setAttribute('aria-label',`Queued chapter ${index+2} text`);
    const save=()=>chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:storyQueueDraft});
    title.addEventListener('input',()=>{draft.title=title.value;summary.textContent=title.value||`Queued chapter ${index+2}`;save();});source.addEventListener('input',()=>{draft.source=source.value;save();});
    const actions=storyNode('div','story-delivery-actions');
    const up=storyNode('button','','↑ Move up');up.type='button';up.disabled=index===0;up.addEventListener('click',()=>{[storyQueueDraft[index-1],storyQueueDraft[index]]=[storyQueueDraft[index],storyQueueDraft[index-1]];save();renderChapterDrafts();});
    const remove=storyNode('button','','Remove');remove.type='button';remove.addEventListener('click',()=>{storyQueueDraft.splice(index,1);save();renderChapterDrafts();});actions.append(up,remove);
    card.append(summary,title,source,actions);host.append(card);
  });
  const available=storySessionView?.busy?Math.max(0,4-storySessionView.chapters.length):3;
  byId('addQueuedChapter').disabled=storyQueueDraft.length>=available;
  byId('appendQueuedChapters').hidden=!storySessionView?.busy||!storyQueueDraft.length;
}
function renderStorySession(session) {
  storySessionView=session;byId('storyDelivery').hidden=!session;
  if(!session)return;
  if(state.mode==='story'||session.busy)generationRunning=Boolean(session.busy);syncControls();
  byId('storyDeliveryTitle').textContent=session.pdf?'Your webtoon is ready':`Story collection · ${session.chapters.length} chapter${session.chapters.length===1?'':'s'}`;
  const host=byId('storyChapterProgress');host.replaceChildren();
  session.chapters.forEach((c,i)=>{const row=storyNode('div','story-chapter-status');row.append(storyNode('strong','',`${i+1}. ${c.title}`),storyNode('small','',`${c.status.replaceAll('_',' ')} · ${c.done}/${c.total||'—'} panels`));if(c.error)row.append(storyNode('span','',c.error));host.append(row);});
  byId('storyDeliveryStatus').textContent=session.pdf?`${(session.pdf.size/1024/1024).toFixed(1)} MB · Telegram: ${session.pdf.telegram.replaceAll('_',' ')}${session.pdf.error?` · ${session.pdf.error}`:''}`:session.error||'Completed panels are saved. Temporary failures retry automatically.';
  byId('saveStoryPdf').hidden=!session.pdf;byId('sendStoryPdf').hidden=!session.pdf;byId('sendStoryPdf').disabled=session.busy;
  byId('resumeStory').disabled=session.busy||session.status==='done';
  byId('stopStory').disabled=!session.busy||session.status==='stopping';
  byId('stopStory').textContent=session.status==='stopping'?'Stopping…':'Stop';
  byId('startOverStory').disabled=session.busy;
  byId('startOverStory').title=session.busy?'Stop the current run first':'Start fresh from the chapter text and settings currently entered above';
  byId('storyRunHint').textContent=session.status==='stopping'?'Saving progress. An image request already sent to Google may finish before the run stops.':session.busy?'Stop saves progress. Resume and Start over become available after it stops.':'Resume continues the saved story. Start over uses the chapter text, queued chapters, characters and settings currently entered above.';
  byId('retryUnknownStory').hidden=session.busy||!session.hasUnknown;
  byId('discardStory').disabled=session.busy;renderChapterDrafts();
}
function currentStoryRunRequest() {
  const source=byId('storyBrief').value.trim();
  if(!source)throw Error('Paste the new chapter or write a story brief above first.');
  if(source.length>30000)throw Error('The chapter must be no longer than 30,000 characters.');
  if(!state.storyCharacters.length)throw Error('Add at least one story character.');
  const names=state.storyCharacters.map(c=>c.name.trim());
  if(names.some(name=>!name))throw Error('Give every character a name.');
  if(new Set(names.map(name=>name.toLocaleLowerCase())).size!==names.length)throw Error('Every character needs a different name.');
  StoryLibrary.checkAliases(state.storyCharacters);
  if(storyQueueDraft.length>3)throw Error('Story mode supports up to 3 queued chapters.');
  if(storyQueueDraft.some(c=>!c.source.trim()||c.source.trim().length>30000))throw Error('Each queued chapter needs 1–30,000 characters. Remove any empty chapter.');
  for(const c of state.storyCharacters){
    if(!c.subjects.length)throw Error(`Add at least one identity photo for ${c.name.trim()}.`);
    if(!c.outfits.length)throw Error(`Add at least one outfit photo for ${c.name.trim()}.`);
  }
  if(state.figureReference&&!state.storyCharacters.some(c=>c.id===state.storyFigureCharacterId))throw Error('Choose which Story character uses the figure reference.');
  return structuredClone({workflowMode:'story',shortPrompt:source,storyCharacters:state.storyCharacters,storyChapters:storyQueueDraft,
    storyInputMode:state.storyInputMode,storyBgStyle:byId('storyBgStyle').value,storyStyleReferences:state.storyStyleReferences,
    storyTextOverlays:byId('storyTextOverlays').checked,poseReference:state.poseReferences.story,
    figureReference:state.figureReference,storyFigureCharacterId:state.storyFigureCharacterId,
    generationEngine:'gemini',imageModel:byId('imageModel').value,aspectRatio:byId('aspectRatio').value,
    imageCount:wantedCount(),generationMode:selectedGenerationMode(),upscaleEnabled:byId('upscaleEnabled').value==='on',
    physicalDetails:byId('physicalDetails').value.trim(),...Object.fromEntries(['tuneHeight','tuneWeight','tuneBust','tuneWaist','tuneHips','tuneNavel'].map(id=>[id,byId(id).value])),
    telegramEnabled:byId('tgEnabled').checked,tgBotToken:byId('tgBotToken').value.trim(),tgChatId:byId('tgChatId').value.trim(),tgSendAsDoc:byId('tgSendAsDoc').checked});
}
async function storyAction(type,extra={}) {
  if(type==='bb_story_resume'){
    const worker=await chrome.runtime.sendMessage({type:'GET_STATE'});
    if(state.figureReference&&!worker?.supportsFigureReference)throw Error('Reload Guc guy in chrome://extensions and reopen the panel to use the figure image. Your selection is saved.');
    extra={...extra,figureReference:state.figureReference,storyFigureCharacterId:state.storyFigureCharacterId,storyCharacterHeights:state.storyCharacters.map(c=>({id:c.id,height:c.height||''}))};
  }
  const result=await chrome.runtime.sendMessage({type,...extra});if(!result?.ok)throw Error(result?.error||'Story action failed.');
  if('session'in result)renderStorySession(result.session);return result;
}
async function initStoryTools() {
  const saved=await chrome.storage.local.get(Object.values(STORY_TOOLS_KEYS));
  customCharacterPresets=Array.isArray(saved[STORY_TOOLS_KEYS.presets])?saved[STORY_TOOLS_KEYS.presets]:[];
  savedCastPresets=Array.isArray(saved[STORY_TOOLS_KEYS.casts])?saved[STORY_TOOLS_KEYS.casts]:[];refreshCastOptions();
  if(state.storyCharacters.length&&state.storyCharacters.every(c=>c.entityId?.startsWith('shadow-slave-')))byId('storyLibrarySeries').value='shadow';
  if(state.storyCharacters.length&&state.storyCharacters.every(c=>c.entityId?.startsWith('shadow-slave-')))byId('storyLibrarySeries').value='shadow';
  storyQueueDraft=Array.isArray(saved[STORY_TOOLS_KEYS.drafts])?saved[STORY_TOOLS_KEYS.drafts].slice(0,3):[];
  byId('storyLibrarySeries').addEventListener('change',selectStoryCollection);byId('storyLibrarySearch').addEventListener('input',renderCharacterLibrary);
  byId('newLibraryCharacter').addEventListener('click',()=>{byId('addStoryCharacter').click();byId('storyCharacters').lastElementChild?.scrollIntoView({behavior:'smooth',block:'start'});});
  byId('addQueuedChapter').addEventListener('click',()=>{if(storyQueueDraft.length<3){storyQueueDraft.push({title:'',source:''});renderChapterDrafts();chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:storyQueueDraft});}});
  const action=(id,type,extra)=>byId(id).addEventListener('click',async()=>{const button=byId(id);button.disabled=true;try {await storyAction(type,extra||{});}catch(e){alert(e.message);}finally{button.disabled=false;if(storySessionView)renderStorySession(storySessionView);}});
  action('resumeStory','bb_story_resume');action('stopStory','bb_story_stop');action('saveStoryPdf','bb_story_pdf_save');action('sendStoryPdf','bb_story_pdf_send');
  byId('startOverStory').addEventListener('click',async()=>{
    if(!storySessionView||storySessionView.busy)return;
    const button=byId('startOverStory');button.disabled=true;
    try {
      const params=currentStoryRunRequest();
      const worker=await chrome.runtime.sendMessage({type:'GET_STATE'});
      if(!worker?.supportsFreshStoryStart)throw Error('Reload Guc guy in chrome://extensions and reopen the panel to start fresh from the current chapter.');
      if(!confirm(`Start fresh with the ${1+params.storyChapters.length} chapter(s) currently entered above?\n\nCurrent chapter: ${params.shortPrompt.slice(0,180)}\n\nThis creates a new plan and new images using the current characters/settings. It uses new generation credits.`))return;
      await storyAction('bb_story_start_over',{params});
      storyQueueDraft=[];await chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:[]});renderChapterDrafts();
      renderQueue([],1);byId('progressFill').style.width='0%';byId('queueSummary').textContent='Planning the current chapter from scratch…';
    }catch(e){alert(e.message);}finally{button.disabled=false;if(storySessionView)renderStorySession(storySessionView);}
  });
  byId('retryUnknownStory').addEventListener('click',()=>{if(confirm('Google may already have charged for an unconfirmed request. Submit those panels again?'))storyAction('bb_story_resume',{confirmUnknown:true}).catch(e=>alert(e.message));});
  byId('discardStory').addEventListener('click',()=>{if(confirm('Clear this saved queue? Save its PDF first if you need it.'))storyAction('bb_story_discard').catch(e=>alert(e.message));});
  byId('appendQueuedChapters').addEventListener('click',async()=>{try {await storyAction('bb_story_append',{chapters:storyQueueDraft});storyQueueDraft=[];await chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:[]});renderChapterDrafts();}catch(e){alert(e.message);}});
  renderCharacterLibrary();renderChapterDrafts();
  const result=await chrome.runtime.sendMessage({type:'bb_story_state'});if(result?.ok)renderStorySession(result.session);
}
