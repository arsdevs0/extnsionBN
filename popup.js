const STORAGE = {
  figureReference:'bb_figure_reference',storyFigureCharacterId:'bb_story_figure_character_id',
  poseReferences:"bb_pose_references",
  upscale:"bb_upscale_enabled",
  subjects:"bb_subject_references", outfit:"bb_outfit_reference", location:"bb_location_reference",
  prompt:"bb_short_prompt", physical:"bb_physical_details", engine:"bb_prompt_engine", model:"bb_image_model", aspect:"bb_aspect_ratio", count:"bb_image_count",
  mode:"bb_creation_mode", sfSubjects:"bb_sf_subjects", sfOutfits:"bb_sf_outfits", sfKnowledge:"bb_sf_knowledge", sfQuality:"bb_sf_quality",
  sfSystem:"bb_sf_system_prompt", sfTarget:"bb_sf_target_prompt", sfFigure:"bb_sf_figure_details",
  sfPresets:"bb_sf_prompt_presets",
  generationMode:"bb_generation_mode",
  storyGenerationMode:"bb_story_generation_mode",
  tgEnabled:"bb_tg_enabled", tgBotToken:"bb_tg_bot_token", tgChatId:"bb_tg_chat_id", tgSendAsDoc:"bb_tg_send_as_doc",
  storyBrief:"bb_story_brief", storyCharacters:"bb_story_characters", storyOutput:"bb_last_story_output",
  storyBgStyle: "bb_story_bg_style", storyStyleReference:"bb_story_style_reference", storyStyleReferences:"bb_story_style_references", storyInputMode:"bb_story_input_mode", storyTextOverlays:"bb_story_text_overlays", storyLetteringDefaultMigrated:"bb_story_lettering_default_migrated", tuneHeight: "bb_tune_height", tuneWeight: "bb_tune_weight", tuneBust: "bb_tune_bust", tuneWaist: "bb_tune_waist", tuneHips: "bb_tune_hips", tuneNavel: "bb_tune_navel"
};
const LEGACY_STORAGE = {
  subjects:"ig_subject_references", outfit:"ig_outfit_reference", location:"ig_location_reference",
  prompt:"ig_short_prompt", physical:"ig_physical_details", engine:"ig_prompt_engine", model:"ig_image_model", aspect:"ig_aspect_ratio", count:"ig_image_count",
  mode:"ig_creation_mode", sfSubjects:"ig_sf_subjects", sfOutfits:"ig_sf_outfits", sfKnowledge:"ig_sf_knowledge", sfQuality:"ig_sf_quality",
  sfSystem:"ig_sf_system_prompt", sfTarget:"ig_sf_target_prompt",
  storyBrief:"ig_story_brief", storyCharacters:"ig_story_characters", storyOutput:"ig_last_story_output"
};
const state = { poseReferences:PoseReference.saved(), subjects:[], outfit:null, location:null, engine:"gemini", mode:"classic", sfSubjects:[], sfOutfits:[], sfKnowledge:[], sfQuality:[], sfPresets:[], storyCharacters:[], storyStyleReferences:[], storyInputMode:"brief" };
let flowConnected = false;
state.figureReference=null;
state.storyFigureCharacterId='';
let generationRunning = false;
let generationStopping = false;
let generationModePreference = "parallel";
let storyGenerationModePreference = "sequential";
let aspectWasChosen = false;
const byId = (id) => document.getElementById(id);
const generateButton = byId("generate");
const qidGenerateButton = byId("qidGenerate");
const stopButton = byId("stop");
const shortPrompt = byId("shortPrompt");
const sfSystemPrompt = byId("sfSystemPrompt");
const sfTargetPrompt = byId("sfTargetPrompt");

let keepAlivePort = null;
function connectKeepAlive() {
  try {
    keepAlivePort = chrome.runtime.connect({ name:"bb-sidepanel-keepalive" });
    keepAlivePort.onDisconnect.addListener(() => {
      keepAlivePort = null;
      setTimeout(connectKeepAlive,1000);
    });
  } catch {
    keepAlivePort = null;
  }
}
connectKeepAlive();
setInterval(() => {
  try { keepAlivePort?.postMessage({ type:"ping",time:Date.now() }); }
  catch { connectKeepAlive(); }
},20000);

function renderStoryOutput(story) {
  const card = byId("storyChapterOutput");
  if (!story?.chapter) { card.hidden = true; return; }
  byId("storyChapterTitle").textContent = story.title || "Untitled chapter";
  byId("storyChapterText").textContent = story.chapter;
  const panels = Array.isArray(story.panels) ? story.panels : [];
  byId("storyShotCount").textContent = `${panels.length} ordered shots`;
  const shots = byId("storyShots"); shots.replaceChildren();
  panels.forEach((panel,index) => {
    const row = document.createElement("article"); row.className = "story-shot-row";
    const number = document.createElement("b"); number.textContent = String(index+1).padStart(2,"0");
    const body = document.createElement("div");
    const heading = document.createElement("strong"); heading.textContent = `${panel.shot || "Shot"} · ${panel.beat || "Story beat"}`;
    const note = document.createElement("small"); note.textContent = `${panel.location || "Location"} · ${(panel.characters || panel.cast?.map(item=>item.name) || []).join(", ")}`;
    body.append(heading,note);
    if (panel.narration) {
      const narration=document.createElement("div"); narration.className="story-lettering-preview story-lettering-narration";
      const copy=document.createElement("p"); copy.textContent=panel.narration;
      narration.append(copy); body.appendChild(narration);
    }
    for (const line of (Array.isArray(panel.dialogue)?panel.dialogue:[])) if (line?.text) {
      const dialogue=document.createElement("div"); dialogue.className="story-lettering-preview story-lettering-dialogue";
      const copy=document.createElement("p"); copy.textContent=line.text; dialogue.appendChild(copy); body.appendChild(dialogue);
    }
    row.append(number,body); shots.append(row);
  });
  card.hidden = false;
}

byId("copyStoryChapter").addEventListener("click",async () => {
  const text = byId("storyChapterText").textContent;
  if (!text) return;
  await navigator.clipboard.writeText(`${byId("storyChapterTitle").textContent}\n\n${text}`);
  const button = byId("copyStoryChapter");
  const oldLabel = button.textContent;
  button.textContent = "Copied";
  setTimeout(() => { button.textContent = oldLabel; },1200);
});

function wantedCount() {
  if (state.mode === "story") return 24;
  const selected = Math.max(1,Math.min(20,Number.parseInt(byId("imageCount").value,10) || 5));
  return state.mode === "subject-flow" ? Math.max(5,selected) : selected;
}
function selectedGenerationMode() { return state.mode === "story" ? storyGenerationModePreference : generationModePreference; }
function renderGenerationMode() {
  const story=state.mode==="story";
  byId("generationMode").disabled=false;
  byId("generationMode").value=selectedGenerationMode();
  const sequential=selectedGenerationMode()==="sequential";
  byId("generationModeBadge").textContent=sequential?"↪ Sequential":"⚡ Parallel · 2";
  byId("generationModeBadge").classList.toggle("sequential-badge",sequential);
}
function queuePlaceholderCount() { return state.mode === "story" || state.mode === "qid" ? 1 : wantedCount(); }
function syncControls() { generateButton.disabled = generationRunning || !flowConnected; if(qidGenerateButton)qidGenerateButton.disabled = generationRunning || !flowConnected; stopButton.disabled = !generationRunning || generationStopping; }

function friendlyFlowError(error) {
  const text = String(error || "");
  if (/finish choosing|login|sign.?in|session|auth|token/i.test(text)) return {
    title:"Sign in to BigBOMB",
    message:"Use the Google account that has access to Flow.",
    hint:"Press Sign in with Google. BigBOMB handles the project automatically."
  };
  return { title:"Account unavailable",message:text || "BigBOMB could not reach Google sign-in.",hint:"Press Sign in with Google and try again." };
}

function paintFlowResult(result) {
  const card = byId("flowCard");
  flowConnected = Boolean(result?.ok && result.connected);
  card.className = `flow-card ${flowConnected ? "connected" : "error"}`;
  if (flowConnected) {
    byId("flowTitle").textContent = "Google account connected";
    byId("flowStatus").textContent = result.account || "BigBOMB is ready";
    byId("flowHint").textContent = "No Flow project tab needed · projects are created automatically";
    byId("connectFlowAccount").textContent = "Switch account";
  } else {
    const friendly = friendlyFlowError(result?.error);
    byId("flowTitle").textContent = friendly.title;
    byId("flowStatus").textContent = friendly.message;
    byId("flowHint").textContent = friendly.hint;
    byId("connectFlowAccount").textContent = "Sign up / Log in with Google";
  }
  syncControls();
}

async function refreshFlowStatus() {
  const card = byId("flowCard");
  card.className = "flow-card checking";
  byId("flowTitle").textContent = "Checking Google account";
  byId("flowStatus").textContent = "Restoring your BigBOMB session…";
  byId("flowHint").textContent = "No Flow project tab is required";
  try {
    const result = await chrome.runtime.sendMessage({ type:"CHECK_FLOW" });
    paintFlowResult(result);
  } catch (error) {
    paintFlowResult({ ok:false,error:error.message });
  }
}

byId("connectFlowAccount").addEventListener("click",async () => {
  const button = byId("connectFlowAccount");
  button.disabled = true;
  byId("flowCard").className = "flow-card checking";
  byId("flowTitle").textContent = "Sign in with Google";
  byId("flowStatus").textContent = "Opening Google's account chooser…";
  byId("flowHint").textContent = "Choose the Google account associated with Flow";
  try {
    const result = await chrome.runtime.sendMessage({ type:"CONNECT_FLOW_ACCOUNT" });
    if (!result?.ok) throw new Error(result?.error || "Could not start Google sign-in.");
    if (result.connected) {
      paintFlowResult(result);
      return;
    }
    byId("flowStatus").textContent = "Complete Google sign-in in the opened tab";
    byId("flowHint").textContent = "BigBOMB will connect automatically—no Flow project setup needed";
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve,1500));
      const status = await chrome.runtime.sendMessage({ type:"CHECK_FLOW" }).catch(() => null);
      if (status?.connected) { paintFlowResult(status); break; }
    }
  } catch (error) {
    paintFlowResult({ ok:false,error:error.message });
  } finally {
    button.disabled = false;
  }
});

byId("pairPhone").addEventListener("click",async () => {
  const button=byId("pairPhone");
  button.disabled=true;
  byId("remoteHint").textContent="Creating a private QR link on your local Wi‑Fi…";
  try {
    const result=await chrome.runtime.sendMessage({type:"PAIR_PHONE_REMOTE"});
    if(!result?.ok) throw new Error(result?.error||"Could not create the phone link.");
    byId("phoneQr").src=result.qr;
    byId("phoneAddress").textContent=`Scan with your phone on the same Wi‑Fi: ${result.controlUrl}`;
    byId("remotePairResult").hidden=false;
    byId("remoteHint").textContent="Paired link ready. Keep the PC bridge and Chrome running while controlling Guc guy from your phone.";
  } catch(error) {
    byId("remoteHint").textContent=error.message;
  } finally { button.disabled=false; }
});

function readFileAsDataUrl(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

async function imageRecord(file) {
  if (!file?.type.startsWith("image/")) return null;
  if (file.size > 8*1024*1024) throw new Error(`${file.name} is larger than 8 MB.`);
  return { id:crypto.randomUUID(), name:file.name || "reference.jpg", dataUrl:await readFileAsDataUrl(file) };
}

async function storyStyleImageRecord(file) {
  if(!file?.type.startsWith("image/"))return null;
  if(file.size>8*1024*1024)throw new Error(`${file.name} is larger than 8 MB.`);
  const bitmap=await createImageBitmap(file);
  try{
    const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale));
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const context=canvas.getContext("2d");if(!context)throw new Error("Could not prepare the style reference image.");
    context.fillStyle="#fff";context.fillRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
    const base=(file.name||"style-reference").replace(/\.[^.]+$/,""),dataUrl=canvas.toDataURL("image/jpeg",.86);
    return{id:crypto.randomUUID(),name:`${base}.jpg`,dataUrl};
  }finally{bitmap.close?.();}
}

async function addSubjectFiles(files) {
  const incoming = [...(files || [])].slice(0,Math.max(0,8-state.subjects.length));
  try {
    for (const file of incoming) {
      const record = await imageRecord(file);
      if (record) state.subjects.push(record);
    }
    await chrome.storage.local.set({ [STORAGE.subjects]:state.subjects });
    renderSubjects();
  } catch (error) { alert(error.message); }
}

function renderSubjects() {
  const gallery = byId("subjectGallery");
  gallery.replaceChildren();
  for (const subject of state.subjects) {
    const card = document.createElement("div");
    card.className = "subject-thumb";
    const image = document.createElement("img");
    image.src = subject.dataUrl;
    image.alt = subject.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = "Remove subject image";
    remove.textContent = "×";
    remove.addEventListener("click",async () => {
      state.subjects = state.subjects.filter((item) => item.id !== subject.id);
      await chrome.storage.local.set({ [STORAGE.subjects]:state.subjects });
      renderSubjects();
    });
    card.append(image,remove);
    gallery.appendChild(card);
  }
  byId("subjectCount").textContent = String(state.subjects.length);
}

function newStoryCharacter() {
  return { id:crypto.randomUUID(),name:"",aliases:"",canonNotes:"",height:"",physique:"",outfitNotes:"",subjects:[],outfits:[] };
}

async function saveStoryCharacters() {
  await chrome.storage.local.set({ [STORAGE.storyCharacters]:state.storyCharacters });
  renderFigureReference();
}

function updateStoryStyleControls() {
  byId("storyStyleReferenceSection").hidden = byId("storyBgStyle").value !== "webtoon";
}

function setStorySourceMode(mode,persist=true,enableLetteringForNovel=false) {
  state.storyInputMode=mode==="novel"?"novel":"brief";
  const novel=state.storyInputMode==="novel",briefButton=byId("storySourceBrief"),novelButton=byId("storySourceNovel"),input=byId("storyBrief");
  briefButton.classList.toggle("active",!novel);briefButton.setAttribute("aria-selected",String(!novel));
  novelButton.classList.toggle("active",novel);novelButton.setAttribute("aria-selected",String(novel));
  byId("storySourceLabel").textContent=novel?"Paste novel chapter":"Story / scene feed";
  byId("storySourceMeta").textContent=novel?"Up to 30,000 characters":"Use @ to tag characters";
  byId("storySourceHint").textContent=novel
    ?"Gemini adapts the pasted chapter into ordered panels without skipping events. Choose matching characters from the library above. Fixed narration cards and speech bubbles are added without covering the artwork. Write a panel count in your request (for example, ‘make exactly 24 panels’) to use that exact count."
    :"Gemini expands your brief into an ordered cinematic chapter and storyboard. Mention a panel count (for example, ‘make exactly 24 panels’) to use that exact total; otherwise panel count follows the story’s length and beats.";
  input.placeholder=novel
    ?"Paste the full novel chapter here. Keep character names consistent with the cast you add below…"
    :"e.g. @Ayesha reaches the old station at dusk. @Ravi is waiting with a letter that changes everything…";
  input.classList.toggle("novel-source",novel);
  if(novel&&enableLetteringForNovel&&!byId("storyTextOverlays").checked){byId("storyTextOverlays").checked=true;chrome.storage.local.set({[STORAGE.storyTextOverlays]:true});}
  if(persist)chrome.storage.local.set({[STORAGE.storyInputMode]:state.storyInputMode});
}

function renderStoryStyleReference() {
  const gallery=byId("storyStyleReferenceGallery");
  gallery.replaceChildren();
  for(const item of state.storyStyleReferences){
    if(!item?.dataUrl)continue;
    const tile=document.createElement("div");tile.className="story-style-reference-tile";
    const image=document.createElement("img");image.src=item.dataUrl;image.alt="Webtoon style reference";
    const name=document.createElement("span");name.textContent=item.name;
    const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.title=`Remove ${item.name||"style reference"}`;
    remove.addEventListener("click",async()=>{state.storyStyleReferences=state.storyStyleReferences.filter(reference=>reference.id!==item.id);await chrome.storage.local.set({[STORAGE.storyStyleReferences]:state.storyStyleReferences});renderStoryStyleReference();});
    tile.append(image,name,remove);gallery.append(tile);
  }
}

function storyField(labelText,value,placeholder,onInput) {
  const label = document.createElement("label");
  label.className = "character-field";
  const caption = document.createElement("span");
  caption.textContent = labelText;
  const input = document.createElement(["Physique / physical features","Physique / figure · optional","Canonical outfit notes","Novel / design notes"].includes(labelText) ? "textarea" : "input");
  input.value = value || "";
  input.placeholder = placeholder;
  input.maxLength = labelText === "Character name" ? 50 : labelText === "Canonical outfit notes" ? 500 : 700;
  if (input.tagName === "TEXTAREA") input.rows = 3;
  input.addEventListener("input",onInput);
  label.append(caption,input);
  return label;
}

function storyImageGallery(character,kind) {
  const gallery = document.createElement("div");
  gallery.className = "story-image-gallery";
  for (const item of character[kind]) {
    const tile = document.createElement("div");
    tile.className = "story-image-tile";
    const itemIndex = character[kind].indexOf(item);
    tile.title = kind === "subjects" ? (itemIndex === 0 ? "Primary face anchor · used first for likeness" : `Identity angle ${itemIndex + 1}`) : `Outfit reference ${itemIndex + 1}`;
    const image = document.createElement("img");
    image.src = item.dataUrl;
    image.alt = item.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = `Remove ${kind === "subjects" ? "identity" : "outfit"} image`;
    remove.addEventListener("click",async () => {
      character[kind] = character[kind].filter((candidate) => candidate.id !== item.id);
      await saveStoryCharacters();
      renderStoryCharacters();
    });
    tile.append(image,remove);
    gallery.appendChild(tile);
  }
  return gallery;
}

function storyUpload(character,kind) {
  const label = document.createElement("label");
  label.className = "story-upload";
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  const title = document.createElement("b");
  title.textContent = kind === "subjects" ? "+ Identity photos" : "+ Outfit photos";
  const hint = document.createElement("small");
  hint.textContent = kind === "subjects" ? "First photo anchors the face · add clear angles" : "Same outfit · extra angles";
  const addFiles = async (files) => {
    const perCharacterLimit = kind === "subjects" ? 3 : 2;
    const incoming = [...(files || [])].slice(0,Math.max(0,perCharacterLimit-character[kind].length));
    try {
      for (const file of incoming) {
        const record = await imageRecord(file);
        if (record) character[kind].push(record);
      }
      await saveStoryCharacters();
      renderStoryCharacters();
    } catch (error) { alert(error.message); }
  };
  input.addEventListener("change",() => addFiles(input.files));
  for (const eventName of ["dragenter","dragover"]) label.addEventListener(eventName,(event) => { event.preventDefault(); label.classList.add("dragover"); });
  for (const eventName of ["dragleave","drop"]) label.addEventListener(eventName,(event) => { event.preventDefault(); label.classList.remove("dragover"); });
  label.addEventListener("drop",(event) => addFiles(event.dataTransfer?.files));
  label.append(input,title,hint);
  return label;
}

function renderStoryCharacters() {
  renderFigureReference();
  const host = byId("storyCharacters");
  host.replaceChildren();
  state.storyCharacters.forEach((character,index) => {
    const card = document.createElement("details");
    card.className = "story-character-card";
    card.open=!character.name.trim();
    const head = document.createElement("summary");
    head.className = "story-character-head";
    const title = document.createElement("strong");
    title.textContent = `${String(index + 1).padStart(2,"0")} · ${character.name || 'New character'}${character.variant?` · ${character.variant}`:''}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.disabled = state.storyCharacters.length === 1;
    remove.addEventListener("click",async () => {
      state.storyCharacters = state.storyCharacters.filter((candidate) => candidate.id !== character.id);
      await saveStoryCharacters();
      renderStoryCharacters();
    });
    const savePreset=document.createElement('button');savePreset.type='button';savePreset.textContent='Save preset';
    savePreset.addEventListener('click',()=>saveCharacterPreset(character).catch(e=>alert(e.message)));
    head.append(title,savePreset,remove);
    const fields = document.createElement("div");
    fields.className = "character-fields";
    fields.append(
      storyField("Character name",character.name,"e.g. Ayesha",async (event) => { character.name = event.target.value; await saveStoryCharacters(); }),
      storyField("Aliases",character.aliases,"Sunless, Lord of Shadows",async event=>{character.aliases=event.target.value;await saveStoryCharacters();}),
      storyField("Novel / design notes",character.canonNotes,"Canon appearance, selected arc/form, traits to keep fixed…",async event=>{character.canonNotes=event.target.value;await saveStoryCharacters();}),
      storyField("Height · applies with figure image too",character.height,"e.g. 180 cm / 5 ft 11 in · optional",async (event) => { character.height = event.target.value; await saveStoryCharacters(); }),
      storyField("Physique / figure · optional",character.physique,"Optional notes. Leave blank to follow the identity photos exactly…",async (event) => { character.physique = event.target.value; await saveStoryCharacters(); }),
      storyField("Canonical outfit notes",character.outfitNotes,"Describe the exact recurring outfit; image references remain the visual authority…",async (event) => { character.outfitNotes = event.target.value; await saveStoryCharacters(); })
    );
    const uploads = document.createElement("div");
    uploads.className = "story-upload-grid";
    for (const kind of ["subjects","outfits"]) {
      const group = document.createElement("div");
      group.append(storyUpload(character,kind),storyImageGallery(character,kind));
      uploads.appendChild(group);
    }
    card.append(head,fields,uploads);
    host.appendChild(card);
  });
  byId("addStoryCharacter").disabled = false;
  updateStoryMentions();
}

function updateStoryMentions() {
  const input = byId("storyBrief"), menu = byId("storyMentionMenu");
  const before = input.value.slice(0,input.selectionStart || 0);
  const match = before.match(/(?:^|\s)@([\p{L}\p{N}_ -]*)$/u);
  if (!match || !state.storyCharacters.some(character => character.name.trim())) { menu.hidden = true; return; }
  const query = match[1].toLocaleLowerCase();
  const names = state.storyCharacters.map(character => character.name.trim()).filter(name => name && name.toLocaleLowerCase().includes(query));
  if (!names.length) { menu.hidden = true; return; }
  menu.replaceChildren();
  for (const name of names) {
    const option = document.createElement("button"); option.type = "button"; option.setAttribute("role","option"); option.textContent = `@${name}`;
    option.addEventListener("mousedown",event => event.preventDefault());
    option.addEventListener("click",() => {
      const start = input.selectionStart - match[0].length;
      input.setRangeText(`@${name} `,start,input.selectionStart,"end");
      input.dispatchEvent(new Event("input",{bubbles:true})); input.focus(); menu.hidden = true;
    });
    menu.append(option);
  }
  menu.hidden = false;
}

const SF_GROUPS = {
  sfSubjects:{ input:"sfSubjectFiles", zone:"sfSubjectDropZone", gallery:"sfSubjectGallery", count:"sfSubjectCount", label:"subject" },
  sfOutfits:{ input:"sfOutfitFiles", zone:"sfOutfitDropZone", gallery:"sfOutfitGallery", count:"sfOutfitCount", label:"outfit" },
  sfKnowledge:{ input:"sfKnowledgeFiles", zone:"sfKnowledgeDropZone", gallery:"sfKnowledgeGallery", count:"sfKnowledgeCount", label:"knowledge" },
  sfQuality:{ input:"sfQualityFiles", zone:"sfQualityDropZone", gallery:"sfQualityGallery", count:"sfQualityCount", label:"quality" }
};

async function addSubjectFlowFiles(kind,files) {
  const incoming = [...(files || [])].slice(0,Math.max(0,8-state[kind].length));
  try {
    for (const file of incoming) {
      const record = await imageRecord(file);
      if (record) state[kind].push(record);
    }
    await chrome.storage.local.set({ [STORAGE[kind]]:state[kind] });
    renderSubjectFlowGroup(kind);
  } catch (error) { alert(error.message); }
}

function renderSubjectFlowGroup(kind) {
  const config = SF_GROUPS[kind];
  const gallery = byId(config.gallery);
  gallery.replaceChildren();
  for (const item of state[kind]) {
    const card = document.createElement("div");
    card.className = "file-card";
    const image = document.createElement("img");
    image.src = item.dataUrl;
    image.alt = item.name;
    const name = document.createElement("span");
    name.title = item.name;
    name.textContent = item.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.title = `Remove ${config.label} image`;
    remove.textContent = "×";
    remove.addEventListener("click",async () => {
      state[kind] = state[kind].filter((candidate) => candidate.id !== item.id);
      await chrome.storage.local.set({ [STORAGE[kind]]:state[kind] });
      renderSubjectFlowGroup(kind);
    });
    card.append(image,name,remove);
    gallery.appendChild(card);
  }
  byId(config.count).textContent = String(state[kind].length);
}

function paintSingle(kind) {
  const value = state[kind];
  const preview = byId(`${kind}Preview`);
  const zone = byId(`${kind}DropZone`);
  const remove = byId(`remove${kind[0].toUpperCase()}${kind.slice(1)}`);
  if (value?.dataUrl) {
    preview.src = value.dataUrl; preview.hidden = false; remove.hidden = false; zone.classList.add("has-image");
  } else {
    preview.removeAttribute("src"); preview.hidden = true; remove.hidden = true; zone.classList.remove("has-image");
  }
}

async function setSingle(kind,file) {
  try {
    const record = await imageRecord(file);
    if (!record) return;
    state[kind] = record;
    await chrome.storage.local.set({ [STORAGE[kind]]:record });
    paintSingle(kind);
  } catch (error) { alert(error.message); }
}

function setupDropZone(id,onFiles) {
  const zone = byId(id);
  for (const name of ["dragenter","dragover"]) zone.addEventListener(name,(event) => { event.preventDefault(); zone.classList.add("dragover"); });
  for (const name of ["dragleave","drop"]) zone.addEventListener(name,(event) => { event.preventDefault(); zone.classList.remove("dragover"); });
  zone.addEventListener("drop",(event) => onFiles(event.dataTransfer?.files));
}


const POSE_CONTROLS = {classic:'classic', 'subject-flow':'sf', story:'story', qid:'qid'};
function renderFigureReference(){
  const ref=state.figureReference,card=byId('figureReferenceSection'),preview=byId('figureReferencePreview');
  if(ref)preview.src=ref.dataUrl;else preview.removeAttribute('src');
  preview.hidden=!ref;byId('figureReferenceRemove').hidden=!ref;
  byId('figureReferenceDropZone').classList.toggle('has-image',Boolean(ref));
  byId('figureReferenceName').textContent=ref?.name||'';
  byId('figureReferenceStatus').textContent=ref?'Active':'Optional';
  byId('bodyTuningTitle').textContent=ref?'Body Tuning (Figure Image Takes Priority)':'Body Tuning (Highest Written Priority)';
  byId('storyFigureTargetRow').hidden=state.mode!=='story';
  const select=byId('storyFigureTarget');select.replaceChildren();
  if(!state.storyFigureCharacterId&&state.storyCharacters.length)state.storyFigureCharacterId=state.storyCharacters[0].id;
  const empty=document.createElement('option');empty.value='';empty.textContent='Choose character';select.append(empty);
  for(const character of state.storyCharacters){const option=document.createElement('option');option.value=character.id;option.textContent=character.name||'Unnamed character';select.append(option);}
  select.value=state.storyFigureCharacterId;
  const after=state.mode==='classic'?byId('classicReferences').querySelector('.reference-row')
    :state.mode==='subject-flow'?byId('sfKnowledgeDropZone').closest('article')
    :state.mode==='qid'?byId('qidStudio').querySelector('.qid-refs')
    :state.mode==='direct-image'?byId('directImageUpload'):null;
  if(after)after.after(card);else byId('storyFigureReferenceSlot').append(card);
  card.querySelector('strong').textContent=state.mode==='story'?'Story Figure Image':'Figure Reference';
  card.querySelector('.reference-heading small').textContent=state.mode==='story'?'Choose a body image and its character':'Shared across modes · highest body priority';
  card.querySelector('.figure-reference-hint').textContent=state.mode==='story'?'Applies body shape to the selected character only. Each character keeps their entered height. Shared image across modes; remove it to use written physique.':'Matches the body in this image before written figure/tuning. Remove it to use written details.';
}
async function saveFigureReference(file){
  if(!file)return;
  try{
    const ref=FigureReference.record(await imageRecord(file));
    if(!ref)throw Error('Choose a supported figure image under 8 MB.');
    await chrome.storage.local.set({[STORAGE.figureReference]:ref});state.figureReference=ref;renderFigureReference();
  }catch(error){alert(error.message);}
}
byId('figureReferenceFile').addEventListener('change',async event=>{await saveFigureReference(event.target.files?.[0]);event.target.value='';});
setupDropZone('figureReferenceDropZone',files=>saveFigureReference(files?.[0]));
byId('figureReferenceRemove').addEventListener('click',async()=>{await chrome.storage.local.remove(STORAGE.figureReference);state.figureReference=null;renderFigureReference();});
byId('storyFigureTarget').addEventListener('change',async event=>{state.storyFigureCharacterId=event.target.value;await chrome.storage.local.set({[STORAGE.storyFigureCharacterId]:event.target.value});});
function renderPoseReferences() {
  for (const [mode,id] of Object.entries(POSE_CONTROLS)) {
    const ref=state.poseReferences[mode], preview=byId(id+'PosePreview');
    if(ref)preview.src=ref.dataUrl;else preview.removeAttribute('src');
    preview.hidden=!ref;
    byId(id+'PoseDropZone').classList.toggle('has-image',Boolean(ref));
    byId(id+'PoseRemove').hidden=!ref;
    byId(id+'PoseStatus').textContent=ref?'Added':'Optional';
    byId(id+'PoseSection').classList.toggle('has-reference',Boolean(ref));
    byId(id+'PoseName').textContent=ref?.name||'';
  }
}
async function savePoseReference(mode,file) {
  try {
    if(!file)return;
    const value=PoseReference.record(await imageRecord(file));
    if(!value)throw Error('Choose a PNG, JPEG, WebP, GIF or AVIF image under 8 MB.');
    state.poseReferences[mode]=value;
    await chrome.storage.local.set({[STORAGE.poseReferences]:state.poseReferences});
    renderPoseReferences();
  } catch(error){alert(error.message);}
}
for(const [mode,id] of Object.entries(POSE_CONTROLS)) {
  byId(id+'PoseFile').addEventListener('change',async event=>{await savePoseReference(mode,event.target.files?.[0]);event.target.value='';});
  setupDropZone(id+'PoseDropZone',files=>savePoseReference(mode,files?.[0]));
  byId(id+'PoseRemove').addEventListener('click',async()=>{
    state.poseReferences[mode]=null;
    await chrome.storage.local.set({[STORAGE.poseReferences]:state.poseReferences});
    renderPoseReferences();
  });
}

byId("subjectFiles").addEventListener("change",async (event) => { await addSubjectFiles(event.target.files); event.target.value = ""; });
setupDropZone("subjectDropZone",addSubjectFiles);
for (const [kind,config] of Object.entries(SF_GROUPS)) {
  byId(config.input).addEventListener("change",async (event) => {
    await addSubjectFlowFiles(kind,event.target.files);
    event.target.value = "";
  });
  setupDropZone(config.zone,(files) => addSubjectFlowFiles(kind,files));
}
for (const kind of ["outfit","location"]) {
  const input = byId(`${kind}File`);
  input.addEventListener("change",async (event) => { await setSingle(kind,event.target.files?.[0]); event.target.value = ""; });
  setupDropZone(`${kind}DropZone`,(files) => setSingle(kind,files?.[0]));
  byId(`remove${kind[0].toUpperCase()}${kind.slice(1)}`).addEventListener("click",async () => {
    state[kind] = null; await chrome.storage.local.remove(STORAGE[kind]); paintSingle(kind);
  });
}

function setEngine(engine,persist=true) {
  state.engine = engine === "direct" ? "direct" : "gemini";
  byId("engineGemini").classList.toggle("active",state.engine === "gemini");
  byId("engineDirect").classList.toggle("active",state.engine === "direct");
  byId("sfEngineGemini").classList.toggle("active",state.engine === "gemini");
  byId("sfEngineDirect").classList.toggle("active",state.engine === "direct");
  if (persist) chrome.storage.local.set({ [STORAGE.engine]:state.engine });
}
byId("engineGemini").addEventListener("click",() => setEngine("gemini"));
byId("engineDirect").addEventListener("click",() => setEngine("direct"));
byId("sfEngineGemini").addEventListener("click",() => setEngine("gemini"));
byId("sfEngineDirect").addEventListener("click",() => setEngine("direct"));

function setMode(mode,persist=true) {
  state.mode = ["classic","subject-flow","story","qid","direct-image"].includes(mode) ? mode : "classic";
  renderFigureReference();
  byId("modeClassic").classList.toggle("active",state.mode === "classic");
  byId("modeSubjectFlow").classList.toggle("active",state.mode === "subject-flow");
  byId("modeStory").classList.toggle("active",state.mode === "story");
  byId("modeQid").classList.toggle("active",state.mode === "qid");
  byId("modeDirectImage").classList.toggle("active",state.mode === "direct-image");
  byId("directImageStudio").hidden = state.mode !== "direct-image";
  for (const id of ["classicReferences","classicPrompts"]) byId(id).hidden = state.mode !== "classic";
  for (const id of ["subjectFlowReferences","subjectFlowPrompts"]) byId(id).hidden = state.mode !== "subject-flow";
  byId("storyStudio").hidden = state.mode !== "story";
  byId("qidStudio").hidden = state.mode !== "qid";
  byId("bodyTuningSection").hidden = state.mode === "story" || state.mode === "qid" || state.mode === "direct-image";
  byId("generationSettings").hidden = state.mode === "qid";
  byId("qualityBadge").textContent = state.mode === "direct-image" ? "◉ Your selected style" : state.mode === "story" ? "◉ Live-action cinematic" : state.mode === "qid" ? "◉ Video prompt studio" : "◉ High-detail phone look";
  byId("imageCountSetting").hidden = state.mode === "story" || state.mode === "qid";
  byId("imageCount").min = state.mode === "subject-flow" ? "5" : "1";
  if (state.mode === "story" && !aspectWasChosen) byId("aspectRatio").value = "IMAGE_ASPECT_RATIO_LANDSCAPE";
  renderGenerationMode();
  if (state.mode === "subject-flow" && Number.parseInt(byId("imageCount").value,10) < 5) byId("imageCount").value = "5";
  generateButton.hidden = state.mode === "qid";
  if (!generationRunning) renderQueue([],queuePlaceholderCount());
  if (persist) chrome.storage.local.set({ [STORAGE.mode]:state.mode });
}
byId("modeClassic").addEventListener("click",() => setMode("classic"));
byId("modeSubjectFlow").addEventListener("click",() => setMode("subject-flow"));
byId("modeStory").addEventListener("click",() => setMode("story"));
byId("modeQid").addEventListener("click",() => setMode("qid"));
byId("modeDirectImage").addEventListener("click",() => setMode("direct-image"));
const directImageUI = DirectImageUI.create({byId,imageRecord,setupDropZone});
for (const id of ["qidPrompt","qidModel","qidAspect","qidFace","qidMotion","qidDesiStyle"]) {
  byId(id).addEventListener("input",() => {
    const value = id === "qidDesiStyle" ? byId(id).checked : byId(id).value;
    chrome.storage.local.set({ [`bb_${id}`]:value });
  });
}
for (const [id,title] of [["qidSubject","subject"],["qidOutfit","outfit"],["qidStartFrame","starting frame"]]) {
  const input=byId(id),drop=byId(`${id}Drop`),clear=byId(`${id}Clear`),preview=drop.querySelector("img"),copy=drop.querySelector(".qid-drop-copy");
  let previewUrl="";
  const paint=file=>{
    if(previewUrl)URL.revokeObjectURL(previewUrl);
    previewUrl=file?URL.createObjectURL(file):"";
    if(previewUrl)preview.src=previewUrl;else preview.removeAttribute("src");
    preview.hidden=!file;copy.hidden=!!file;clear.hidden=!file;
    drop.classList.toggle("has-image",!!file);
    drop.setAttribute("aria-label",file?`${title} image selected: ${file.name}. Click to replace.`:`Drop or choose ${title} image`);
  };
  input.addEventListener("change",()=>paint(input.files?.[0]||null));
  drop.addEventListener("click",()=>input.click());
  drop.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();input.click();}});
  for(const name of ["dragenter","dragover"])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.add("dragover");});
  for(const name of ["dragleave","drop"])drop.addEventListener(name,event=>{event.preventDefault();drop.classList.remove("dragover");});
  drop.addEventListener("drop",event=>{
    const file=event.dataTransfer?.files?.[0];
    if(!file)return;
    if(file.type&&!file.type.startsWith("image/")){alert("Choose an image file for this reference.");return;}
    const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;paint(file);
  });
  clear.addEventListener("click",()=>{input.value="";paint(null);});
  paint(null);
}
byId("qidBuildPrompt").addEventListener("click",async () => {
  try { const {prompt}=buildQidSubmissionPrompt();await navigator.clipboard.writeText(prompt).catch(()=>{});byId("qidStatus").textContent="Prompt ready. Generate video uploads the selected images and submits this in Flow."; }
  catch(error) { alert(error.message); }
});
function buildQidSubmissionPrompt() {
  const scene=byId("qidPrompt").value.trim();
  if(!scene)throw Error("Describe the video scene or action first.");
  const subject=byId("qidSubject").files?.[0],outfit=byId("qidOutfit").files?.[0],start=byId("qidStartFrame").files?.[0],clip=null;
  const pose=state.poseReferences.qid,figure=state.figureReference;
  if([subject,outfit,start,pose,figure].filter(Boolean).length>3)throw Error("Qid allows 3 reference images, including figure and pose. Remove an extra reference before generating.");
  if(figure&&!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(figure.dataUrl))throw Error('For Qid, use a PNG, JPEG, WebP or GIF figure image.');
  if(pose&&!/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(pose.dataUrl))throw Error("For Qid, use a PNG, JPEG, WebP or GIF pose image.");
  const motion={mirror:"A relaxed mirror outfit showcase with a natural weight shift, one small sleeve or hair adjustment, and a gentle half-turn.",turn:"A slow, controlled three-quarter turn to side profile and back, with small pauses and a steady camera.",hair:"A gentle pose sequence with a small hair adjustment, relaxed shoulder shift, and subtle turn toward the camera.",window:"A quiet window or balcony moment: look toward the view, shift weight naturally, then turn slightly toward camera.",seated:"A seated pose with a subtle posture adjustment, relaxed hand movement, and a small look toward camera.",entrance:"A calm doorway entrance followed by a small turn toward camera and relaxed final pose.",custom:"Follow only the action described in the scene."}[byId("qidMotion").value];
  const explicit=[byId("tuneHeight")?.value.trim()&&`Height: ${byId("tuneHeight").value.trim()}.`,byId("tuneWeight")?.value.trim()&&`Overall build: ${byId("tuneWeight").value.trim()}.`,byId("tuneBust")?.value.trim()&&`Bust/chest: ${byId("tuneBust").value.trim()}.`,byId("tuneWaist")?.value.trim()&&`Waist: ${byId("tuneWaist").value.trim()}.`,byId("tuneHips")?.value.trim()&&`Hips/thighs: ${byId("tuneHips").value.trim()}.`,byId("tuneNavel")?.value.trim()&&`Belly/navel: ${byId("tuneNavel").value.trim()}.`].filter(Boolean).join(" ");
  if(pose) {
    const refs=[{role:'POSE / CAMERA TEMPLATE: exact opening posture and fixed camera geometry'},
      ...(subject?[{role:figure?'SUBJECT IDENTITY: exact face only; @figure controls body shape':'SUBJECT IDENTITY: exact face and build only'}]:[]),
      ...(outfit?[{role:'OUTFIT: exact clothes only'}]:[]),
      ...(start?[{role:'SCENE CONTINUITY: compatible background details only; pose/camera still come from image 1'}]:[]),
      ...(figure?[{role:'FIGURE: exact body shape only, highest body priority'}]:[])];
    const prompt=PoseReference.build({target:scene,video:true,figure:figure?FigureReference.instruction(refs.length):explicit||'Approximately 56-inch bust/chest and 56-inch hips; keep waist and abdomen natural and reference-consistent.',
      referenceMap:refs.map((ref,i)=>`REFERENCE IMAGE ${i+1}: ${ref.role}.`).join('\n'),
      system:[subject?'':"Use a fictional face; do not inherit the pose model's identity.",outfit?'':byId('qidDesiStyle').checked?'Use desi-inspired everyday clothing fitted naturally to the subject.':'Use simple scene-appropriate clothing.'].filter(Boolean).join(' '),
      finish:'Natural phone video with real skin and fabric texture, true colors and no beauty filter.'});
    byId('qidOutputPrompt').value=prompt;
    return {prompt,subject,outfit,start,clip,pose,figure};
  }
  const prompt=[
    "Create one coherent, realistic short video. Keep the selected subject recognizable and consistent; motion references may guide movement only, never identity.",
    `SCENE: ${scene}`,
    `ACTION: ${pose?"Start from the pose reference; follow only motion explicitly requested in SCENE.":motion}`,
    pose?"FRAME: Match the pose reference camera angle, framing and subject scale.":`FRAME: ${byId("qidAspect").value.includes("PORTRAIT")?"Vertical 9:16 portrait":"Horizontal 16:9 landscape"}. Keep the person close or medium-close, prominent, and clearly visible; ignore distant framing.`,
    pose?"FACE: Preserve reference head orientation and visibility; use the selected subject identity only.":`FACE: ${byId("qidFace").value==="visible"?(subject?"Keep the selected subject's face visible and consistent with the subject reference.":"Use a fictional, non-identifiable face."):"Keep the face naturally obscured or outside frame."}`,
    figure?FigureReference.instruction([subject,outfit,start].filter(Boolean).length+1):`FIGURE: Approximately 56-inch bust/chest and about 56-inch hips. This is a specific bust-and-hip silhouette, not a fat or generally obese body. Keep waist and abdomen natural and reference-consistent; do not enlarge the whole torso to create these proportions. ${explicit} Preserve the same silhouette during motion; do not slim the subject or borrow proportions from the outfit model.`,
    `OUTFIT: ${outfit?"Use the selected outfit reference for the actual clothing design, colors, material and details. Fit and drape the outfit to the specified subject's proportions; the outfit model does not define body shape.":byId("qidDesiStyle").checked?"Use tasteful desi-inspired everyday styling fitted naturally to the specified silhouette.":"Choose simple scene-appropriate clothing fitted naturally to the specified silhouette."}`,
    pose?"START FRAME: The pose reference controls opening geometry. A separate starting frame supplies only compatible scene continuity.":start?"START FRAME: Match the selected frame's opening composition and clothing continuity, then continue with believable motion.":"Start in a relaxed, believable pose appropriate to the scene.",
    clip?"MOTION CLIP: Use only as movement and camera-rhythm guidance. Do not copy its identity, face, body or outfit.":"Use only the selected image references; no motion clip is attached.",
    pose?PoseReference.instruction({imageNumber:[subject,outfit,start].filter(Boolean).length+1,video:true}):"POSE: Make a small continuous action sequence with natural, varied body language; avoid a frozen pose or repeated pose loop. Keep hands, joints, fabric and contact with props plausible.",
    pose?"BACKGROUND: Keep the requested environment within the reference crop and camera geometry.":"BACKGROUND: Show a believable, layered real environment with a few clear details such as furnishings, plants, architecture or street texture. Keep it interesting without shrinking the subject into a distant shot.",
    "CAPTURE: Natural phone-video perspective, realistic skin and fabric texture, lively true-to-scene color, natural contrast and saturation. No beauty filter, artificial color grade, plastic skin, extra people, text or logos.",
    byId("qidDesiStyle").checked?"Grounded desi fashion and lifestyle presentation; non-explicit.":"Realistic fashion and lifestyle presentation; non-explicit."
  ].join("\n\n");
  byId("qidOutputPrompt").value=prompt;
  return {prompt,subject,outfit,start,clip,pose,figure};
}
qidGenerateButton.addEventListener("click",async () => {
  if(generationRunning)return;
  try {
    const built=buildQidSubmissionPrompt();
    const references=built.pose?[{...built.pose,role:"pose / camera"}]:[];
    for(const [role,file] of [["subject",built.subject],["outfit",built.outfit],["start frame",built.start]]) if(file) references.push({...await imageRecord(file),role});
    if(built.figure)references.push({...built.figure,role:'figure / body shape'});
    generationRunning=true;generationStopping=false;syncControls();
    byId("progressFill").style.width="5%";byId("queueSummary").textContent="Preparing Qid video in Flow…";
    renderQueue([{index:1,type:"video",status:"preparing"}]);
    byId("qidStatus").textContent=`Preparing video · ${references.length} reference image${references.length===1?"":"s"}${built.figure?' · Figure image priority':''}.`;
    const result=await chrome.runtime.sendMessage({type:"bb_qid_generate",prompt:built.prompt,model:byId("qidModel").value,aspect:byId("qidAspect").value,references});
    if(!result?.ok)throw Error(result?.error||"Could not start Qid video generation.");
  } catch(error) { generationRunning=false;syncControls();byId("qidStatus").textContent=error.message;alert(error.message); }
});
byId("addStoryCharacter").addEventListener("click",async () => {
  state.storyCharacters.push(newStoryCharacter());
  await saveStoryCharacters();
  renderStoryCharacters();
});

function safeImageUrl(url) { return typeof url === "string" && (url.startsWith("https://") || url.startsWith("data:image/")); }
function safeVideoUrl(url) { try { const parsed=new URL(url);return parsed.protocol==="https:"&&/(^|\.)flow-content\.google$|(^|\.)googleusercontent\.com$|(^|\.)google\.com$|(^|\.)googleapis\.com$/.test(parsed.hostname); } catch { return false; } }
function logClass(text, level) {
  if (["success", "error", "info"].includes(level)) return `log-${level}`;
  // Older entries have no level. Read the event name, not filenames/metadata.
  const step = text.match(/^\[Flow [^\]]+\]\s+([a-z_]+):/i)?.[1];
  if (step) {
    if (/_failed$/.test(step)) return "log-error";
    if (/_confirmed$/.test(step)) return "log-success";
    return "log-info";
  }
  if (/^Backend reference ready\b/i.test(text)) return "log-success";
  if (/\b(?:error|failed|failure|violation|exhausted|rejected|incomplete|unavailable)\b|\bnot (?:confirmed|uploaded|generated)\b/i.test(text)) return "log-error";
  if (/\b(?:complete|completed|done|connected|uploaded|generated)\b|^Backend confirmed\b|^Storyboard ready:/i.test(text)) return "log-success";
  return "log-info";
}
function appendLog(entry) {
  const terminal = byId("terminal");
  terminal.querySelector(".log-empty")?.remove();
  const line = document.createElement("span");
  line.className = "log-line";
  const time = document.createElement("span");
  time.className = "log-time";
  const parsedTime = entry?.time ? new Date(entry.time) : new Date();
  time.textContent = `[${parsedTime.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}] `;
  const message = document.createElement("span");
  message.className = logClass(String(entry?.text || ""), entry?.level);
  message.textContent = String(entry?.text || "");
  line.append(time,message);
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}
function renderLogs(logs=[]) {
  const terminal = byId("terminal");
  terminal.replaceChildren();
  if (!logs.length) {
    const empty = document.createElement("span");
    empty.className = "log-empty";
    empty.textContent = "Waiting for generation activity…";
    terminal.appendChild(empty);
    return;
  }
  logs.forEach(appendLog);
}
async function showPreview(item) {
  const url = safeImageUrl(item.previewUrl) ? item.previewUrl : item.thumbnailUrl;
  if (!safeImageUrl(url)) return;
  byId("previewImage").src = url; byId("previewCaption").textContent = `Generation ${item.index}`; byId("imagePreview").hidden = false;
  if(item.storyChapterId) {
    const result=await chrome.runtime.sendMessage({type:'bb_story_panel_preview',chapterId:item.storyChapterId,index:item.index}).catch(()=>null);
    if(result?.ok&&safeImageUrl(result.dataUrl)&&!byId('imagePreview').hidden)byId('previewImage').src=result.dataUrl;
  }
}

function renderQueue(queue=[],placeholderCount=queuePlaceholderCount()) {
  const host = byId("queueList");
  const expandedPrompts = new Set([...host.querySelectorAll(".queue-prompt-details[open]")].map(node => node.dataset.index));
  host.classList.toggle("story-queue",state.mode === "story");
  host.replaceChildren();
  const visible = queue.length ? queue : Array.from({ length:placeholderCount },(_,index) => ({ index:index+1,status:"waiting" }));
  for (const item of visible) {
    const card = document.createElement("article");
    const storyResult = state.mode === "story";
    const videoResult=item.type==="video";
    card.className = `queue-card ${item.status}${storyResult ? " story-result" : ""}${videoResult ? " video-result" : ""}`;
    const resultAspect = (byId("aspectRatio").value || "IMAGE_ASPECT_RATIO_LANDSCAPE").includes("LANDSCAPE")
      ? (byId("aspectRatio").value.includes("FOUR_THREE") ? "4 / 3" : "16 / 9")
      : byId("aspectRatio").value.includes("SQUARE") ? "1 / 1"
      : byId("aspectRatio").value.includes("THREE_FOUR") ? "3 / 4" : "9 / 16";
    card.style.aspectRatio = storyResult || videoResult ? "auto" : resultAspect;
    const url = safeImageUrl(item.thumbnailUrl) ? item.thumbnailUrl : item.previewUrl;
    if(videoResult&&safeVideoUrl(item.videoUrl)) {
      const video=document.createElement("video");video.src=item.videoUrl;video.controls=true;video.preload="metadata";video.playsInline=true;video.setAttribute("aria-label","Generated Qid video");card.appendChild(video);
      const download=document.createElement("button");download.className="queue-download";download.type="button";download.title="Download video";download.textContent="↓";
      download.addEventListener("click",event=>{event.stopPropagation();chrome.downloads.download({url:item.videoUrl,filename:`GucGuy/qid-video-${item.index}.mp4`,saveAs:true}).catch(error=>alert(`Video download failed: ${error.message}`));});card.appendChild(download);
    } else if (safeImageUrl(url)) {
      const image = document.createElement("img"); image.src = url; image.alt = `Generated image ${item.index}`;
      if (storyResult) image.style.aspectRatio = "auto";
      image.addEventListener("click",() => showPreview(item)); card.appendChild(image);
      if (item.status === "done") {
        const download = document.createElement("button"); download.className = "queue-download"; download.type = "button"; download.title = "Download image"; download.textContent = "↓";
        download.addEventListener("click",async(event) => { event.stopPropagation(); if(item.storyChapterId){try {await storyAction('bb_story_panel_save',{chapterId:item.storyChapterId,index:item.index});}catch(e){alert(e.message);}}else chrome.downloads.download({ url,filename:`BigBOMB/image-${item.index}.png`,saveAs:false }); }); card.appendChild(download);
      }
    }
    if(videoResult&&typeof item.projectUrl==="string"&&item.projectUrl.startsWith("https://flow.google.com/")) {
      const open=document.createElement("button");open.className="qid-open-project";open.type="button";open.textContent="Open Flow project";open.addEventListener("click",()=>chrome.tabs.create({url:item.projectUrl}));card.appendChild(open);
    }
    if (!storyResult && !videoResult && state.mode!=="qid" && ["done","failed","quota_exhausted","stopped","paused","outcome_unknown"].includes(item.status)) {
      const retry = document.createElement("button"); retry.className = "queue-retry"; retry.type = "button"; retry.title = /PUBLIC_ERROR_UNSAFE_GENERATION|POLICY_VIOLATION/i.test(item.error||"") ? "Retry this panel with a non-graphic restaging" : "Regenerate only this image"; retry.setAttribute("aria-label",`Retry image ${item.index}`); retry.textContent = "↻";
      retry.addEventListener("click",async (event) => {
        event.stopPropagation();
        if (generationRunning) return;
        if(item.status==="outcome_unknown" && !confirm("Flow may already have generated this image. Check the project first. Generate another image anyway?"))return;
        generationRunning = true;
        syncControls();
        byId("queueSummary").textContent = `Retrying image ${item.index}…`;
        item.status = "manual_retry";
        renderQueue(visible,placeholderCount);
        const result = await chrome.runtime.sendMessage({ type:"bb_retry_image",index:item.index }).catch((error) => ({ ok:false,error:error.message }));
        if (!result?.ok) {
          generationRunning = false;
          syncControls();
          item.status = safeImageUrl(url) ? "done" : "failed";
          renderQueue(visible,placeholderCount);
          alert(result?.error || "Could not retry this image.");
        }
      });
      card.appendChild(retry);
    }
    if (storyResult && (item.displayPrompt || item.prompt)) {
      const scenePrompt = item.displayPrompt || item.prompt;
      const promptDetails = document.createElement("details"); promptDetails.className = "queue-prompt-details";
      promptDetails.dataset.index = String(item.index); promptDetails.open = expandedPrompts.has(String(item.index));
      const summary = document.createElement("summary"); summary.textContent = "This scene · image-to-video prompt";
      const promptText = document.createElement("textarea"); promptText.className = "queue-prompt-text"; promptText.readOnly = true; promptText.value = scenePrompt; promptText.rows = 3; promptText.setAttribute("aria-label",`Scene prompt for image ${item.index}`);
      const copy = document.createElement("button"); copy.className = "queue-prompt-copy"; copy.type = "button"; copy.textContent = "Copy scene prompt";
      copy.addEventListener("click",async () => {
        try { await navigator.clipboard.writeText(scenePrompt); copy.textContent = "Copied"; setTimeout(() => { copy.textContent = "Copy scene prompt"; },1200); }
        catch { promptText.focus(); promptText.select(); copy.textContent = "Select and copy"; }
      });
      promptDetails.append(summary,promptText,copy); card.append(promptDetails);
    }
    const number = document.createElement("span"); number.className = "queue-number"; number.textContent = String(item.index).padStart(2,"0");
    const status = document.createElement("span"); status.className = "queue-status"; status.textContent = item.retryAt && ["retrying","waiting_quota"].includes(item.status) ? `Retry ${Number(item.attempt||1)+1} · ${Math.max(0,Math.ceil((item.retryAt-Date.now())/1000))}s` : item.status.replaceAll("_"," ");
    if (item.error) { status.title = String(item.error); card.title = String(item.error); }
    card.append(number,status); host.appendChild(card);
  }
  const total = queue.length || placeholderCount;
  byId("queueCounts").textContent = `${queue.filter((item) => item.status === "done").length} / ${total}`;
}

shortPrompt.addEventListener("input",() => chrome.storage.local.set({ [STORAGE.prompt]:shortPrompt.value }));
byId("physicalDetails").addEventListener("input",() => chrome.storage.local.set({ [STORAGE.physical]:byId("physicalDetails").value }));
sfSystemPrompt.addEventListener("input",() => chrome.storage.local.set({ [STORAGE.sfSystem]:sfSystemPrompt.value }));
sfTargetPrompt.addEventListener("input",() => chrome.storage.local.set({ [STORAGE.sfTarget]:sfTargetPrompt.value }));
byId("sfFigureDetails").addEventListener("input",() => chrome.storage.local.set({ [STORAGE.sfFigure]:byId("sfFigureDetails").value }));
function renderSfPresets(selectedId="") {
  const select = byId("sfPresetSelect");
  select.replaceChildren();
  if (!state.sfPresets.length) {
    const empty = document.createElement("option"); empty.value=""; empty.textContent="No saved presets"; select.append(empty);
  } else {
    const placeholder = document.createElement("option"); placeholder.value=""; placeholder.textContent="Choose a preset"; select.append(placeholder);
    for (const preset of state.sfPresets) {
      const refs = preset.references || {};
      const refCount = ["sfSubjects","sfOutfits","sfKnowledge","sfQuality"].reduce((sum,key)=>sum+(Array.isArray(refs[key])?refs[key].length:0),0);
      const option = document.createElement("option"); option.value=preset.id; option.textContent=`${preset.name} · ${refCount} refs`; select.append(option);
    }
  }
  select.value = selectedId;
  const hasSelection = state.sfPresets.some(preset => preset.id === select.value);
  byId("loadSfPreset").disabled = !hasSelection;
  byId("deleteSfPreset").disabled = !hasSelection;
  byId("exportSfPreset").disabled = !hasSelection;
}
byId("sfPresetSelect").addEventListener("change",() => renderSfPresets(byId("sfPresetSelect").value));
byId("saveSfPreset").addEventListener("click",async () => {
  const name = byId("sfPresetName").value.trim();
  if (!name) { byId("sfPresetName").focus(); return; }
  const preset = {
    id:crypto.randomUUID(),name,
    system:sfSystemPrompt.value,target:sfTargetPrompt.value,figure:byId("sfFigureDetails").value,
    engine:state.engine,model:byId("imageModel").value,aspect:byId("aspectRatio").value,
    upscale:byId("upscaleEnabled").value,count:byId("imageCount").value,generationMode:selectedGenerationMode(),
    references:{
      sfSubjects:state.sfSubjects.map(item=>({...item})),sfOutfits:state.sfOutfits.map(item=>({...item})),
      sfKnowledge:state.sfKnowledge.map(item=>({...item})),sfQuality:state.sfQuality.map(item=>({...item}))
    },
    fullSettings:{figureReference:FigureReference.record(state.figureReference),storyFigureCharacterId:state.storyFigureCharacterId,poseReferences:PoseReference.saved(state.poseReferences),mode:state.mode,shortPrompt:shortPrompt.value,physicalDetails:byId("physicalDetails").value,storyBrief:byId("storyBrief").value,storyInputMode:state.storyInputMode,storyBgStyle:byId("storyBgStyle").value,storyStyleReferences:state.storyStyleReferences.map(item=>({...item})),storyTextOverlays:byId("storyTextOverlays").checked,storyCharacters:state.storyCharacters.map(character=>({...character,subjects:character.subjects.map(item=>({...item})),outfits:character.outfits.map(item=>({...item}))})),classicSubjects:state.subjects.map(item=>({...item})),classicOutfit:state.outfit?{...state.outfit}:null,classicLocation:state.location?{...state.location}:null}
  };
  const existing = state.sfPresets.findIndex(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (existing >= 0) preset.id = state.sfPresets[existing].id;
  if (existing >= 0) state.sfPresets[existing] = preset;
  else state.sfPresets.push(preset);
  await chrome.storage.local.set({[STORAGE.sfPresets]:state.sfPresets});
  byId("sfPresetName").value = "";
  renderSfPresets(preset.id);
});
byId("loadSfPreset").addEventListener("click",async () => {
  const preset = state.sfPresets.find(item => item.id === byId("sfPresetSelect").value);
  if (!preset) return;
  sfSystemPrompt.value = preset.system || ""; sfTargetPrompt.value = preset.target || "";
  byId("sfFigureDetails").value = preset.figure || "";
  const hasReferenceSnapshot = preset.references && typeof preset.references === "object";
  const references = hasReferenceSnapshot ? preset.references : {};
  const full=preset.fullSettings&&typeof preset.fullSettings==="object"?preset.fullSettings:null;
  if(full){
    if('figureReference'in full){state.figureReference=FigureReference.record(full.figureReference);state.storyFigureCharacterId=String(full.storyFigureCharacterId||'');}renderFigureReference();
    state.poseReferences=PoseReference.saved(full.poseReferences);renderPoseReferences();
    setMode(full.mode||"classic",false);
    shortPrompt.value=full.shortPrompt||"";byId("physicalDetails").value=full.physicalDetails||"";byId("storyBrief").value=full.storyBrief||"";byId("storyTextOverlays").checked=full.storyTextOverlays===true;
    setStorySourceMode(full.storyInputMode||"brief",false);
    byId("storyBgStyle").value=["crime-noir","photorealistic","grounded-thriller","warm-drama","webtoon"].includes(full.storyBgStyle)?full.storyBgStyle:"crime-noir";state.storyStyleReferences=(Array.isArray(full.storyStyleReferences)?full.storyStyleReferences:full.storyStyleReference?[full.storyStyleReference]:[]).slice(0,4).filter(item=>typeof item?.dataUrl==="string").map(item=>({...item}));renderStoryStyleReference();updateStoryStyleControls();
    state.subjects=Array.isArray(full.classicSubjects)?full.classicSubjects.filter(item=>item&&typeof item.dataUrl==="string"&&item.dataUrl.startsWith("data:image/")).slice(0,8).map(item=>({...item})):[];
    state.outfit=full.classicOutfit&&typeof full.classicOutfit.dataUrl==="string"?{...full.classicOutfit}:null;
    state.location=full.classicLocation&&typeof full.classicLocation.dataUrl==="string"?{...full.classicLocation}:null;
    state.storyCharacters=Array.isArray(full.storyCharacters)?full.storyCharacters.map(character=>({...character,outfitNotes:String(character.outfitNotes||""),subjects:Array.isArray(character.subjects)?character.subjects.slice(0,3).map(item=>({...item})):[],outfits:Array.isArray(character.outfits)?character.outfits.slice(0,2).map(item=>({...item})):[]})):[];
    renderSubjects();paintSingle("outfit");paintSingle("location");renderStoryCharacters();
  }
  if (hasReferenceSnapshot) {
    for (const kind of Object.keys(SF_GROUPS)) {
      state[kind] = Array.isArray(references[kind])
        ? references[kind].filter(item => item && typeof item.dataUrl === "string" && item.dataUrl.startsWith("data:image/")).slice(0,8).map(item=>({...item}))
        : [];
      renderSubjectFlowGroup(kind);
    }
  }
  if (preset.engine) setEngine(preset.engine);
  if (preset.model) byId("imageModel").value=preset.model;
  if (preset.aspect) byId("aspectRatio").value=preset.aspect;
  if (preset.upscale) byId("upscaleEnabled").value=preset.upscale;
  if (preset.count) byId("imageCount").value=preset.count;
  if (preset.generationMode) generationModePreference=preset.generationMode==="sequential"?"sequential":"parallel";
  renderGenerationMode();
  await chrome.storage.local.set({
    [STORAGE.sfSystem]:sfSystemPrompt.value,[STORAGE.sfTarget]:sfTargetPrompt.value,[STORAGE.sfFigure]:byId("sfFigureDetails").value,
    [STORAGE.model]:byId("imageModel").value,[STORAGE.aspect]:byId("aspectRatio").value,
    [STORAGE.upscale]:byId("upscaleEnabled").value,[STORAGE.count]:byId("imageCount").value,
    [state.mode === "story" ? STORAGE.storyGenerationMode : STORAGE.generationMode]:selectedGenerationMode(),
    ...(full?{[STORAGE.figureReference]:state.figureReference,[STORAGE.storyFigureCharacterId]:state.storyFigureCharacterId,[STORAGE.poseReferences]:state.poseReferences,[STORAGE.mode]:state.mode,[STORAGE.prompt]:shortPrompt.value,[STORAGE.physical]:byId("physicalDetails").value,[STORAGE.storyBrief]:byId("storyBrief").value,[STORAGE.storyInputMode]:state.storyInputMode,[STORAGE.storyBgStyle]:byId("storyBgStyle").value,[STORAGE.storyStyleReferences]:state.storyStyleReferences,[STORAGE.storyTextOverlays]:byId("storyTextOverlays").checked,[STORAGE.storyCharacters]:state.storyCharacters,[STORAGE.subjects]:state.subjects,[STORAGE.outfit]:state.outfit,[STORAGE.location]:state.location}:{}),
    ...(hasReferenceSnapshot?{
      [STORAGE.sfSubjects]:state.sfSubjects,[STORAGE.sfOutfits]:state.sfOutfits,
      [STORAGE.sfKnowledge]:state.sfKnowledge,[STORAGE.sfQuality]:state.sfQuality
    }:{})
  });
  if (!generationRunning) renderQueue([],wantedCount());
});
byId("deleteSfPreset").addEventListener("click",async () => {
  const id=byId("sfPresetSelect").value;
  state.sfPresets=state.sfPresets.filter(item=>item.id!==id);
  await chrome.storage.local.set({[STORAGE.sfPresets]:state.sfPresets});
  renderSfPresets();
});
byId("exportSfPreset").addEventListener("click",() => {
  const preset=state.sfPresets.find(item=>item.id===byId("sfPresetSelect").value);
  if (!preset) return;
  const safeName=preset.name.replace(/[^a-z0-9_-]+/gi,"-").replace(/^-|-$/g,"") || "subject-flow-preset";
  const blob=new Blob([JSON.stringify({format:"guc-guy-subject-flow-preset",version:1,preset},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a"); link.href=url; link.download=`${safeName}.guc-guy-preset.json`;
  document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000);
});
byId("uploadSfPreset").addEventListener("click",() => byId("sfPresetFile").click());
byId("sfPresetFile").addEventListener("change",async event => {
  const file=event.target.files?.[0]; event.target.value="";
  if (!file) return;
  try {
    if (file.size > 100*1024*1024) throw new Error("Preset JSON must be smaller than 100 MB.");
    const parsed=JSON.parse(await file.text());
    const imported=["guc-guy-subject-flow-preset","flipo-subject-flow-preset"].includes(parsed?.format) ? parsed.preset : parsed;
    if (!imported || typeof imported !== "object" || typeof imported.name !== "string" || !imported.name.trim()) throw new Error("This file does not contain a valid Guc guy preset.");
    const allowedModels=new Set(["GEM_PIX_2","NARWHAL","HARBOR_SEAL"]);
    const allowedAspects=new Set(["IMAGE_ASPECT_RATIO_PORTRAIT","IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR","IMAGE_ASPECT_RATIO_SQUARE","IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE","IMAGE_ASPECT_RATIO_LANDSCAPE"]);
    const normalized={
      id:crypto.randomUUID(),name:imported.name.trim().slice(0,48),
      system:String(imported.system||"").slice(0,5000),target:String(imported.target||"").slice(0,2500),figure:String(imported.figure||"").slice(0,1200),
      engine:imported.engine==="direct"?"direct":"gemini",
      model:allowedModels.has(imported.model)?imported.model:"GEM_PIX_2",
      aspect:allowedAspects.has(imported.aspect)?imported.aspect:"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",
      upscale:imported.upscale==="off"?"off":"on",
      count:String(Math.max(5,Math.min(20,Number.parseInt(imported.count,10)||5))),references:{}
    };
    const incomingRefs=imported.references&&typeof imported.references==="object"?imported.references:{};
    for (const kind of Object.keys(SF_GROUPS)) {
      const list=Array.isArray(incomingRefs[kind])?incomingRefs[kind]:[];
      normalized.references[kind]=list.filter(item=>item&&typeof item.dataUrl==="string"&&item.dataUrl.startsWith("data:image/")&&item.dataUrl.length<12*1024*1024)
        .slice(0,8).map(item=>({id:typeof item.id==="string"?item.id:crypto.randomUUID(),name:String(item.name||"reference image").slice(0,180),dataUrl:item.dataUrl}));
    }
    if(imported.fullSettings&&typeof imported.fullSettings==="object"){
      const full=imported.fullSettings,record=item=>item&&typeof item.dataUrl==="string"&&item.dataUrl.startsWith("data:image/")&&item.dataUrl.length<12*1024*1024?{id:typeof item.id==="string"?item.id:crypto.randomUUID(),name:String(item.name||"reference image").slice(0,180),dataUrl:item.dataUrl}:null;
      normalized.fullSettings={...('figureReference'in full?{figureReference:FigureReference.record(full.figureReference),storyFigureCharacterId:String(full.storyFigureCharacterId||'').slice(0,180)}:{}),poseReferences:PoseReference.saved(full.poseReferences),mode:["classic","subject-flow","story"].includes(full.mode)?full.mode:"classic",shortPrompt:String(full.shortPrompt||"").slice(0,300),physicalDetails:String(full.physicalDetails||"").slice(0,1200),storyBrief:String(full.storyBrief||"").slice(0,30000),storyInputMode:full.storyInputMode==="novel"?"novel":"brief",storyBgStyle:["crime-noir","photorealistic","grounded-thriller","warm-drama","webtoon"].includes(full.storyBgStyle)?full.storyBgStyle:"crime-noir",storyStyleReferences:(Array.isArray(full.storyStyleReferences)?full.storyStyleReferences:full.storyStyleReference?[full.storyStyleReference]:[]).slice(0,4).map(record).filter(Boolean),storyTextOverlays:full.storyTextOverlays===true,classicSubjects:(Array.isArray(full.classicSubjects)?full.classicSubjects:[]).slice(0,8).map(record).filter(Boolean),classicOutfit:record(full.classicOutfit),classicLocation:record(full.classicLocation),storyCharacters:(Array.isArray(full.storyCharacters)?full.storyCharacters:[]).map((character,index)=>({id:typeof character.id==="string"?character.id:crypto.randomUUID(),name:String(character.name||`Character ${index+1}`).slice(0,50),aliases:String(character.aliases||"").slice(0,500),canonNotes:String(character.canonNotes||"").slice(0,2000),entityId:String(character.entityId||""),variant:String(character.variant||""),height:String(character.height||"").slice(0,120),physique:String(character.physique||"").slice(0,700),outfitNotes:String(character.outfitNotes||"").slice(0,500),subjects:(Array.isArray(character.subjects)?character.subjects:[]).slice(0,3).map(record).filter(Boolean),outfits:(Array.isArray(character.outfits)?character.outfits:[]).slice(0,2).map(record).filter(Boolean)}))};
    }
    const existing=state.sfPresets.findIndex(item=>item.name.toLocaleLowerCase()===normalized.name.toLocaleLowerCase());
    if (existing>=0) normalized.id=state.sfPresets[existing].id;
    if (existing>=0) state.sfPresets[existing]=normalized; else state.sfPresets.push(normalized);
    await chrome.storage.local.set({[STORAGE.sfPresets]:state.sfPresets});
    renderSfPresets(normalized.id);
    alert(`Preset uploaded: ${normalized.name}. Select it and press Load to apply all prompts, settings and references.`);
  } catch(error) { alert(`Could not upload preset: ${error.message}`); }
});
byId("storyBrief").addEventListener("input",() => { chrome.storage.local.set({ [STORAGE.storyBrief]:byId("storyBrief").value }); updateStoryMentions(); });
byId("storyBrief").addEventListener("click",updateStoryMentions);
byId("storyBrief").addEventListener("keyup",event => { if (event.key === "Escape") byId("storyMentionMenu").hidden = true; else updateStoryMentions(); });
byId("storySourceBrief").addEventListener("click",()=>setStorySourceMode("brief"));
byId("storySourceNovel").addEventListener("click",()=>setStorySourceMode("novel",true,true));
byId("storyBgStyle").addEventListener("change",() => { chrome.storage.local.set({ [STORAGE.storyBgStyle]:byId("storyBgStyle").value }); updateStoryStyleControls(); });
byId("storyStyleReferenceInput").addEventListener("change",async event=>{
  const files=[...(event.target.files||[])];if(!files.length)return;
  try{
    const incoming=files.slice(0,Math.max(0,4-state.storyStyleReferences.length));
    for(const file of incoming){const reference=await storyStyleImageRecord(file);if(reference)state.storyStyleReferences.push(reference);}
    if(files.length>incoming.length)alert("Webtoon style references are limited to 4 images.");
    await chrome.storage.local.set({[STORAGE.storyStyleReferences]:state.storyStyleReferences});renderStoryStyleReference();
  }
  catch(error){alert(error.message);}
  finally{event.target.value="";}
});
byId("storyTextOverlays").addEventListener("change",() => chrome.storage.local.set({ [STORAGE.storyTextOverlays]:byId("storyTextOverlays").checked }));
if (byId("tgEnabled")) {
  const tgFields = byId("tgConfigFields");
  byId("tgEnabled").addEventListener("change", () => {
    const checked = byId("tgEnabled").checked;
    if (tgFields) tgFields.style.display = checked ? "flex" : "none";
    chrome.storage.local.set({ [STORAGE.tgEnabled]: checked });
  });
}
if (byId("tgBotToken")) {
  byId("tgBotToken").addEventListener("input", () => {
    chrome.storage.local.set({ [STORAGE.tgBotToken]: byId("tgBotToken").value });
  });
}
if (byId("tgChatId")) {
  byId("tgChatId").addEventListener("input", () => {
    chrome.storage.local.set({ [STORAGE.tgChatId]: byId("tgChatId").value });
  });
}
if (byId("tgSendAsDoc")) {
  byId("tgSendAsDoc").addEventListener("change", () => {
    chrome.storage.local.set({ [STORAGE.tgSendAsDoc]: byId("tgSendAsDoc").checked });
  });
}
if (byId("tgAutoDetectBtn")) {
  byId("tgAutoDetectBtn").addEventListener("click", async (e) => {
    e.preventDefault();
    const token = byId("tgBotToken") ? byId("tgBotToken").value.trim() : "";
    const statusEl = byId("tgStatusText");
    if (!token) return alert("Please enter your Telegram Bot Token from @BotFather first.");
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.style.color = "#38bdf8";
      statusEl.textContent = "Checking recent chats with bot...";
    }
    try {
      const res = await chrome.runtime.sendMessage({ type: "bb_autodetect_telegram", token });
      if (!res?.ok) throw new Error(res?.error || "Could not detect chat.");
      if (byId("tgChatId")) {
        byId("tgChatId").value = res.chatId;
        chrome.storage.local.set({ [STORAGE.tgChatId]: res.chatId });
      }
      if (statusEl) {
        statusEl.style.color = "#4ade80";
        statusEl.textContent = `✅ Detected chat: ${res.label} (ID: ${res.chatId})! Saved.`;
      }
    } catch (err) {
      if (statusEl) {
        statusEl.style.color = "#f87171";
        statusEl.textContent = `❌ ${err.message} (Make sure you clicked /start on the bot first!)`;
      }
    }
  });
}
if (byId("tgTestBtn")) {
  byId("tgTestBtn").addEventListener("click", async () => {
    const token = byId("tgBotToken") ? byId("tgBotToken").value.trim() : "";
    const chatId = byId("tgChatId") ? byId("tgChatId").value.trim() : "";
    const statusEl = byId("tgStatusText");
    if (!token) return alert("Please enter your Telegram Bot Token from @BotFather first.");
    if (statusEl) {
      statusEl.style.display = "block";
      statusEl.style.color = "#38bdf8";
      statusEl.textContent = "Testing connection to Telegram...";
    }
    try {
      const res = await chrome.runtime.sendMessage({ type: "bb_test_telegram", token, chatId });
      if (!res?.ok) throw new Error(res?.error || "Connection failed.");
      if (res.resolvedChatId && byId("tgChatId")) {
        byId("tgChatId").value = res.resolvedChatId;
        chrome.storage.local.set({ [STORAGE.tgChatId]: res.resolvedChatId });
      }
      if (statusEl) {
        statusEl.style.color = "#4ade80";
        statusEl.textContent = `✅ Connected to @${res.username}! ${res.messageSent ? `Sent test message to ${res.resolvedChatId || chatId}.` : "Enter chat link/ID and test again to verify messaging."}`;
      }
    } catch (err) {
      if (statusEl) {
        statusEl.style.color = "#f87171";
        statusEl.textContent = `❌ ${err.message}`;
      }
    }
  });
}

['tuneHeight', 'tuneWeight', 'tuneBust', 'tuneWaist', 'tuneHips', 'tuneNavel'].forEach(id => {
  byId(id).addEventListener("input", () => chrome.storage.local.set({ [STORAGE[id]]: byId(id).value }));
});





shortPrompt.addEventListener("keydown",(event) => { if (event.key === "Enter" && !generateButton.disabled) generateButton.click(); });
for (const [id,key] of [["upscaleEnabled",STORAGE.upscale],["imageModel",STORAGE.model],["aspectRatio",STORAGE.aspect],["imageCount",STORAGE.count],["generationMode",STORAGE.generationMode]]) {
  byId(id).addEventListener("change",() => {
    if (id === "aspectRatio") aspectWasChosen = true;
    if (id === "imageCount") byId(id).value = wantedCount();
    if (id === "generationMode") {
      if (state.mode === "story") {
        storyGenerationModePreference=byId(id).value==="sequential"?"sequential":"parallel";
        chrome.storage.local.set({ [STORAGE.storyGenerationMode]:storyGenerationModePreference });
      } else {
        generationModePreference=byId(id).value==="sequential"?"sequential":"parallel";
        chrome.storage.local.set({ [STORAGE.generationMode]:generationModePreference });
      }
      renderGenerationMode();
      return;
    }
    chrome.storage.local.set({ [key]:byId(id).value });
    if (!generationRunning && id === "imageCount") renderQueue([],wantedCount());
  });
}

generateButton.addEventListener("click",async () => {
  if (generationRunning || generationStopping) return;
  if(state.figureReference){
    generationRunning=true;syncControls();
    try{
      const worker=await chrome.runtime.sendMessage({type:'GET_STATE'});
      if(!worker?.supportsFigureReference)throw Error('Reload Guc guy in chrome://extensions and reopen the panel to use the figure image. Your selection is saved.');
    }catch(error){alert(error.message);return;}
    finally{generationRunning=false;syncControls();}
  }
  if (state.mode === "direct-image") {
    try {
      const request = directImageUI.request();
      generationRunning = true; syncControls();
      const worker = await chrome.runtime.sendMessage({type:'GET_STATE'});
      if (!worker?.supportedWorkflows?.includes('direct-image')) {
        throw Error('Direct Image needs the updated background worker. Open chrome://extensions, reload Guc guy, then reopen this panel. Your saved prompt and image will remain.');
      }
      const count = wantedCount();
      Object.assign(request, {figureReference:state.figureReference,imageCount:count, generationMode:selectedGenerationMode(),
        imageModel:byId("imageModel").value, aspectRatio:byId("aspectRatio").value,
        upscaleEnabled:byId("upscaleEnabled").value === "on",
        telegramEnabled:byId("tgEnabled").checked, tgBotToken:byId("tgBotToken").value.trim(),
        tgChatId:byId("tgChatId").value.trim(), tgSendAsDoc:byId("tgSendAsDoc").checked});
      generationRunning = true; syncControls();
      byId("progressFill").style.width = "0%";
      byId("queueSummary").textContent = "Preparing your image prompt…"; renderQueue([],count);
      const response = await chrome.runtime.sendMessage(request);
      if (!response?.ok) throw Error(response?.error || "Could not start generation.");
    } catch (error) {
      generationRunning = false; syncControls();
      byId("directImageStatus").textContent = error.message;
    }
    return;
  }
  const isSubjectFlow = state.mode === "subject-flow";
  const isStory = state.mode === "story";
  let storyRequest=null;
  const prompt = isSubjectFlow ? sfTargetPrompt.value.trim() : isStory ? byId("storyBrief").value.trim() : shortPrompt.value.trim();
  if (isSubjectFlow) {
    if (!state.sfSubjects.length) return alert("Add at least one Subject Identity image.");
    if (!state.sfOutfits.length) return alert("Add at least one Outfit image.");
    if (!sfSystemPrompt.value.trim()) return alert("Enter the Subject Flow System Instruction.");
    if (!prompt) return alert("Enter the Target Image Prompt.");
  } else if (isStory) {
    try {storyRequest=currentStoryRunRequest();}catch(error){return alert(error.message);}
  } else {
    if (!state.subjects.length) return alert("Add at least one subject reference image.");
    if (!state.outfit) return alert("Add an outfit reference image.");
    if (!prompt) return alert("Enter a scene prompt, for example: Walking down the street.");
  }
  const count = wantedCount();
  generationRunning = true; syncControls();
  byId("progressFill").style.width = "0%"; byId("queueSummary").textContent = isStory ? "Gemini is deciding the story length…" : state.engine === "gemini" ? "Planning with Gemini…" : "Preparing direct prompts…"; renderQueue([],isStory ? 1 : count);
  const response = await chrome.runtime.sendMessage({
    type:"bb_generate", workflowMode:state.mode, shortPrompt:prompt,
    poseReference:state.poseReferences[state.mode],
    figureReference:state.figureReference,storyFigureCharacterId:state.storyFigureCharacterId,
    systemInstruction:isSubjectFlow ? sfSystemPrompt.value.trim() : "",
    physicalDetails:isSubjectFlow ? byId("sfFigureDetails").value.trim() : byId("physicalDetails").value.trim(),
    subjects:isSubjectFlow ? state.sfSubjects : state.subjects,
    outfits:isSubjectFlow ? state.sfOutfits : (state.outfit ? [state.outfit] : []),
    knowledge:isSubjectFlow ? state.sfKnowledge : isStory ? [] : (state.location ? [state.location] : []),
    quality:isSubjectFlow ? state.sfQuality : [], outfit:isSubjectFlow ? null : state.outfit, location:isSubjectFlow ? null : state.location,
    storyCharacters:isStory ? state.storyCharacters : [],
    storyChapters:isStory ? storyQueueDraft : [],
    storyBgStyle:isStory ? byId("storyBgStyle").value : "real",
    storyStyleReferences:isStory ? state.storyStyleReferences : [],
    storyInputMode:isStory ? state.storyInputMode : "brief",
    storyTextOverlays:isStory && byId("storyTextOverlays").checked,
        tuneHeight: byId("tuneHeight").value,
        tuneWeight: byId("tuneWeight").value,
        tuneBust: byId("tuneBust").value,
        tuneWaist: byId("tuneWaist").value,
        tuneHips: byId("tuneHips").value,
        tuneNavel: byId("tuneNavel").value,

    generationEngine:isStory ? "gemini" : state.engine, imageModel:byId("imageModel").value, aspectRatio:byId("aspectRatio").value,
    upscaleEnabled:byId("upscaleEnabled").value === "on",
    telegramEnabled:byId("tgEnabled") ? byId("tgEnabled").checked : false,
    tgBotToken:byId("tgBotToken") ? byId("tgBotToken").value.trim() : "",
    tgChatId:byId("tgChatId") ? byId("tgChatId").value.trim() : "",
    tgSendAsDoc:byId("tgSendAsDoc") ? byId("tgSendAsDoc").checked : false,
    imageCount:count, generationMode:selectedGenerationMode()
  }).catch(error=>({ok:false,error:error.message}));
  if (!response?.ok) { generationRunning = false; syncControls(); alert(response?.error || "Could not start generation."); }
  if(response?.session){storyQueueDraft=[];await chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:[]});renderStorySession(response.session);}
});

stopButton.addEventListener("click",async () => {
  generationStopping=true;syncControls();byId("queueSummary").textContent="Stopping…";
  try {const response=await chrome.runtime.sendMessage({type:"bb_stop"});if(!response?.ok)throw Error(response?.error||"Stop was not acknowledged.");}
  catch(error){generationStopping=false;syncControls();byId("queueSummary").textContent=`Stop failed: ${error.message}. Try Stop again.`;}
});
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "bb_status") byId("queueSummary").textContent = message.text;
  if (message.type === "bb_progress") byId("progressFill").style.width = `${message.percent}%`;
  if (message.type === "bb_queue") renderQueue(message.queue);
  if (message.type === "bb_log") appendLog(message);
  if (message.type === "bb_story_plan") renderStoryOutput(message.story);
  if (message.type === "bb_stopping") { generationStopping=true;syncControls(); }
  if (message.type === "bb_done") { generationStopping=false; generationRunning = false; syncControls(); }
  if (message.type === "bb_story_session")renderStorySession(message.session);
});
byId("clearLogs").addEventListener("click",async () => { await chrome.runtime.sendMessage({ type:"CLEAR_LOGS" }); renderLogs(); });
byId("copyDiagnostics").addEventListener("click",async () => {
  const button=byId("copyDiagnostics");button.disabled=true;
  try {
    const [saved,current]=await Promise.all([chrome.storage.local.get('bb_flow_diagnostics'),chrome.runtime.sendMessage({type:'GET_STATE'})]);
    const reports=Array.isArray(saved.bb_flow_diagnostics)?saved.bb_flow_diagnostics:[];
    const activity=(current?.logs||[]).filter(entry=>/^\[Flow |^Run inputs received:|^Backend reference ready|^Opened Flow project/.test(entry.text||''));
    await navigator.clipboard.writeText(JSON.stringify({version:chrome.runtime.getManifest().version,exportedAt:new Date().toISOString(),activity,reports},null,2));
    button.textContent='Copied';
  }catch(error){button.textContent='Copy failed';appendLog({text:`Could not copy diagnostics: ${error.message}`});}
  finally{button.disabled=false;setTimeout(()=>{button.textContent='Copy diagnostics';},2500);}
});
byId("closePreview").addEventListener("click",() => { byId("imagePreview").hidden = true; });
byId("imagePreview").addEventListener("click",(event) => { if (event.target === byId("imagePreview")) byId("imagePreview").hidden = true; });

async function init() {
  const keys = [...Object.values(STORAGE),...Object.values(LEGACY_STORAGE),"if_face_reference","if_outfit_reference","if_location_reference"];
  const stored = await chrome.storage.local.get(keys);
  const saved = (name) => stored[STORAGE[name]] ?? stored[LEGACY_STORAGE[name]];
  state.subjects = Array.isArray(saved("subjects")) ? saved("subjects") : (stored.if_face_reference ? [{ ...stored.if_face_reference,id:crypto.randomUUID() }] : []);
  state.outfit = saved("outfit") || stored.if_outfit_reference || null;
  state.location = saved("location") || stored.if_location_reference || null;
  state.figureReference=FigureReference.record(saved('figureReference'));
  state.storyFigureCharacterId=String(saved('storyFigureCharacterId')||'');
  state.poseReferences=PoseReference.saved(saved("poseReferences"));renderPoseReferences();
  for (const kind of Object.keys(SF_GROUPS)) state[kind] = Array.isArray(saved(kind)) ? saved(kind) : [];
  shortPrompt.value = saved("prompt") || "";
  sfSystemPrompt.value = saved("sfSystem") || "";
  sfTargetPrompt.value = saved("sfTarget") || "";
  state.sfPresets = Array.isArray(stored[STORAGE.sfPresets]) ? stored[STORAGE.sfPresets].filter(item => item && typeof item.id === "string" && typeof item.name === "string") : [];
  renderSfPresets();
  byId("sfFigureDetails").value = saved("sfFigure") || "";
  byId("storyBrief").value = saved("storyBrief") || "";
  byId("qidPrompt").value = saved("bb_qidPrompt") || "";
  byId("qidModel").value = saved("bb_qidModel") || "veo-31-fast";
  byId("qidAspect").value = saved("bb_qidAspect") || "VIDEO_ASPECT_RATIO_PORTRAIT";
  byId("qidFace").value = saved("bb_qidFace") || "hidden";
  byId("qidMotion").value = saved("bb_qidMotion") || "mirror";
  byId("qidDesiStyle").checked = saved("bb_qidDesiStyle") !== false;
  setStorySourceMode(saved("storyInputMode")||"brief",false);
  byId("storyBgStyle").value = ["crime-noir","photorealistic","grounded-thriller","warm-drama","webtoon"].includes(saved("storyBgStyle")) ? saved("storyBgStyle") : "crime-noir";
  const savedStyles=saved("storyStyleReferences");
  state.storyStyleReferences=(Array.isArray(savedStyles)?savedStyles:saved("storyStyleReference")?[saved("storyStyleReference")]:[]).slice(0,4).filter(item=>typeof item?.dataUrl==="string");
  renderStoryStyleReference();updateStoryStyleControls();
  // Make the requested reference lettering the default, even for existing
  // installs whose previous default left Story panels text-free. The toggle
  // remains available for clean keyframes after this one-time migration.
  const letteringDefaultMigrated=saved("storyLetteringDefaultMigrated")===true;
  byId("storyTextOverlays").checked = letteringDefaultMigrated ? saved("storyTextOverlays")===true : true;
  if(!letteringDefaultMigrated)chrome.storage.local.set({[STORAGE.storyTextOverlays]:true,[STORAGE.storyLetteringDefaultMigrated]:true});
  ['tuneHeight', 'tuneWeight', 'tuneBust', 'tuneWaist', 'tuneHips', 'tuneNavel'].forEach(id => {
    byId(id).value = saved(id) || "";
  });

  state.storyCharacters = Array.isArray(saved("storyCharacters")) && saved("storyCharacters").length
    ? saved("storyCharacters").map((character) => ({
        ...character,id:character.id || crypto.randomUUID(),name:String(character.name || ""),height:String(character.height || ""),physique:String(character.physique || ""),outfitNotes:String(character.outfitNotes || ""),
        subjects:Array.isArray(character.subjects) ? character.subjects.slice(0,3) : [],
        outfits:Array.isArray(character.outfits) ? character.outfits.slice(0,2) : []
      }))
    : [newStoryCharacter()];
  renderStoryOutput(saved("storyOutput"));
  byId("physicalDetails").value = saved("physical") || "";
  byId("imageModel").value = saved("model") || "GEM_PIX_2";
  byId("aspectRatio").value = saved("aspect") || (saved("mode") === "story" ? "IMAGE_ASPECT_RATIO_LANDSCAPE" : "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR");
  aspectWasChosen = Boolean(saved("aspect"));
  byId("upscaleEnabled").value = saved("upscale") || "on";
  if (byId("tgEnabled")) {
    const isTg = saved("tgEnabled") === true;
    byId("tgEnabled").checked = isTg;
    if (byId("tgConfigFields")) byId("tgConfigFields").style.display = isTg ? "flex" : "none";
  }
  if (byId("tgBotToken")) byId("tgBotToken").value = saved("tgBotToken") || "";
  if (byId("tgChatId")) byId("tgChatId").value = saved("tgChatId") || "";
  if (byId("tgSendAsDoc")) byId("tgSendAsDoc").checked = saved("tgSendAsDoc") === true;
  byId("imageCount").value = saved("count") || "5";
  generationModePreference=saved("generationMode")==="sequential"?"sequential":"parallel";
  storyGenerationModePreference=saved("storyGenerationMode")==="parallel"?"parallel":"sequential";
  renderGenerationMode();
  setEngine(saved("engine") || "gemini",false);
  await directImageUI.restore();
  setMode(saved("mode") || "classic",false);
  const migrated = {};
  for (const name of Object.keys(STORAGE)) if (saved(name) !== undefined) migrated[STORAGE[name]] = saved(name);
  if (Object.keys(migrated).length) await chrome.storage.local.set(migrated);
  renderSubjects(); paintSingle("outfit"); paintSingle("location");
  for (const kind of Object.keys(SF_GROUPS)) renderSubjectFlowGroup(kind);
  renderStoryCharacters();
  const runtimeState = await chrome.runtime.sendMessage({ type:"GET_STATE" }).catch(() => null);
  generationRunning = Boolean(runtimeState?.running);
  generationStopping = Boolean(runtimeState?.stopping);
  if (runtimeState?.status) byId("queueSummary").textContent = runtimeState.status;
  if (Number.isFinite(runtimeState?.progress)) byId("progressFill").style.width = `${runtimeState.progress}%`;
  renderLogs(runtimeState?.logs || []);
  renderQueue(runtimeState?.queue || [],queuePlaceholderCount()); syncControls();
  await initStoryTools();
  await refreshFlowStatus(); setInterval(refreshFlowStatus,15000);
}
init();
