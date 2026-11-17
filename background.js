/* ==========================================
 * Guc guy — AI Subject Image Generator
 * Orchestrator: Gemini (Planner) -> Flow API (Generator)
 * ========================================== */

importScripts("lib/jszip.min.js", "lib/pdf-lib.min.js", "story-library.js", "story-renderer.js", "story-engine.js", "story-jobs.js", "pose-reference.js", "figure-reference.js", "figure-direction.js", "subject-flow-direction.js", "classic-direction.js", "direct-image.js", "flow-rpc.js", "flow-security-helper.js", "flow-request-guard.js", "flow-retry.js", "flow-diagnostics.js", "flow-backend.js", "flow-compat.js", "flow-tab-recovery.js", "flow-page-upload.js");

const FLOW_RECAPTCHA_SITE_KEY = "6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV";
const FLOW_IMAGE_MODEL = "GEM_PIX_2";
const FLOW_MODEL_API_IDS = { "NARWHAL": "BELUGA", "BELUGA": "BELUGA" };
const MODEL_DISPLAY_NAMES = { "NARWHAL": "Nano Banana 2.1", "BELUGA": "Nano Banana 2.1", "GEM_PIX_2": "Nano Banana Pro", "HARBOR_SEAL": "Nano Banana 2 Lite" };
const FLOW_AUTH_HOME_URL = "https://flow.google.com/";
const GUCGUY_LOGIN_KEY = "bb_google_login";
const GUCGUY_LOGIN_PENDING_KEY = "bb_google_login_pending";
const GEMINI_PLANNING_TIMEOUT_MS = 8 * 60 * 1000;
const GEMINI_MESSAGE_ENVELOPE_MS = 10 * 60 * 1000;
const SUBJECT_FLOW_CAMERA_RULE = `SUBJECT FLOW DAILY SNAPSHOT — VARIED HOME PHOTOGRAPHY: Make an ordinary handheld phone photo taken by a friend or family member who happens to be nearby. NO PROFESSIONALISM. NO INFLUENCER POLISH. The subject is completely immersed in their activity, with zero posing, zero choreographing, zero outfit presentation, and zero camera-ready smiles. CAMERA DISTANCE MUST VARY between 1-4 metres — sometimes right next to them, sometimes from across the room or from a doorway. FRAMING MUST VARY: use knees-up, full-body, three-quarter from behind, waist-up from the side, shot from above looking down, shot from floor level. Do NOT always make a tight bust/face portrait or always sit them on a bed edge facing camera. The surrounding room (walls, floor, furniture, bedding) MUST be clearly visible around the subject — the subject should fill only 40-70% of the frame height, not 90%. Show the ENVIRONMENT they are in. The framing must be unapologetically AWKWARD, ASYMMETRIC, and SPONTANEOUS. Do not center the subject. Capture mid-action posture, unusual camera tilts, and limbs cut off by frame edge. No studio polish, no artificial bokeh, no HDR. BANNED DEFAULTS: Do not repeatedly show the subject sitting on bed edge facing camera. Do not repeatedly use the same camera distance or angle.`;
const SUBJECT_FLOW_RAWNESS_RULE = `EXTREME RAW SNAPSHOT FEEL: This MUST look like a completely unedited, unposed, unpolished real-life mobile phone photo. Uneven room lighting, mixed color temperatures, real messy skin texture, real wrinkled fabric, and real untidy room details. KNOWLEDGE ROOM EXPANSION IS MANDATORY: When given Knowledge room references, you MUST REPROJECT the real space from a COMPLETELY DIFFERENT camera angle than the reference photo. Do NOT replicate the reference photo's exact viewpoint. If the reference shows the bed from the foot-end, show it from the headboard side or from a doorway. If the reference shows a room corner, show the opposite wall. EXPAND the visible space: show more floor, more wall, more ceiling, more furniture than the reference crop reveals. The room's materials, colors, patterns, and furniture style are FIXED FACTS — but the camera position is YOUR creative choice and MUST differ from the reference. Keep body posture awkward, spontaneous, slumped, relaxed, or genuinely engaged in a messy mid-action task. Absolutely no model-like gestures, no hand-in-hair, no back-arches. Use harsh or ordinary household light (e.g., tube light, flash). Avoid cinematic grading, aesthetic filters, or forced blur. It must feel like an amateur 2023 smartphone snap.`;
const ALLOWED_MODELS = new Set(["GEM_PIX_2", "NARWHAL", "BELUGA", "HARBOR_SEAL"]);
const ALLOWED_ASPECT_RATIOS = new Set(["IMAGE_ASPECT_RATIO_PORTRAIT", "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR", "IMAGE_ASPECT_RATIO_SQUARE", "IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE", "IMAGE_ASPECT_RATIO_LANDSCAPE"]);

if (chrome.sidePanel?.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "bb-sidepanel-keepalive") return;
  port.onMessage.addListener(() => {});
});

const STATE = {
  running: false,
  stopRequested: false,
  stopReason: "",
  status: "Ready",
  progress: 0,
  queue: [],
  logs: [],
  retryHandler: null,
};
const REMOTE_TOKEN_KEY = "bb_phone_remote_pairing_token";
const REMOTE_BRIDGE_URL = "ws://127.0.0.1:32189/bridge";
let remoteSocket = null;
let remoteRetryTimer = null;
let remoteKeepaliveTimer = null;

// Flow no longer exposes its OAuth token through the old NextAuth JSON route.
// Observe the bearer token that the signed-in Flow page already uses for its
// own Google API requests. It stays in service-worker memory only.
const FLOW_ACCESS_TOKENS = new Map();
const FLOW_REJECTED_TOKENS = new Set();
let FLOW_ACCESS_TOKEN = null;
const FLOW_AUTH_DIAGNOSTICS = {
  observerReady: false,
  bridgeReadyAt: 0,
  lastApiRequestAt: 0,
  lastBearerAt: 0,
  lastTokenAt: 0,
};
const FLOW_TOKEN_READY = chrome.storage.session.get("bb_flow_access_token").then((stored) => {
  const saved = stored.bb_flow_access_token;
  if (saved?.token?.startsWith("ya29.") && Number.isInteger(saved.tabId)
    && Date.now() - saved.capturedAt < 55 * 60 * 1000) {
    FLOW_ACCESS_TOKEN = saved;
    FLOW_ACCESS_TOKENS.set(saved.tabId, saved);
  }
}).catch(() => {});

function captureFlowAccessToken(token, tabId = -1) {
  if (FLOW_REJECTED_TOKENS.has(token)) return false;
  if (typeof token !== "string" || !token.startsWith("ya29.")) return false;
  const captured = { token, capturedAt:Date.now(), tabId };
  FLOW_AUTH_DIAGNOSTICS.lastTokenAt = captured.capturedAt;
  FLOW_ACCESS_TOKEN = captured;
  if (Number.isInteger(tabId) && tabId >= 0) FLOW_ACCESS_TOKENS.set(tabId, captured);
  chrome.storage.session.set({ bb_flow_access_token:captured }).catch(() => {});
  return true;
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === "loading" || typeof changeInfo.url === "string")
    && isGoogleFlowUrl(changeInfo.url || tab?.url || "")) {
    const current = FLOW_ACCESS_TOKENS.get(tabId);
    FLOW_ACCESS_TOKENS.delete(tabId);
    if (FLOW_ACCESS_TOKEN?.tabId === tabId || FLOW_ACCESS_TOKEN?.token === current?.token) {
      FLOW_ACCESS_TOKEN = null;
      chrome.storage.session.remove("bb_flow_access_token").catch(() => {});
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const current = FLOW_ACCESS_TOKENS.get(tabId);
  FLOW_ACCESS_TOKENS.delete(tabId);
  if (FLOW_ACCESS_TOKEN?.tabId === tabId || FLOW_ACCESS_TOKEN?.token === current?.token) {
    FLOW_ACCESS_TOKEN = null;
    chrome.storage.session.remove("bb_flow_access_token").catch(() => {});
  }
  chrome.storage.session.get("bb_flow_auth_tab_id").then((stored) => {
    if (stored.bb_flow_auth_tab_id === tabId) chrome.storage.session.remove("bb_flow_auth_tab_id").catch(() => {});
  }).catch(() => {});
});

if (chrome.webRequest?.onBeforeSendHeaders) {
  try {
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      FLOW_AUTH_DIAGNOSTICS.lastApiRequestAt = Date.now();
      const authorization = (details.requestHeaders || []).find((header) => header.name?.toLowerCase() === "authorization")?.value;
      const match = String(authorization || "").match(/^Bearer\s+(.+)$/i);
      if (match?.[1]) FLOW_AUTH_DIAGNOSTICS.lastBearerAt = Date.now();
      captureFlowAccessToken(match?.[1], details.tabId);
    }, { urls: ["https://aisandbox-pa.googleapis.com/*", "https://labs.google/*"] }, ["requestHeaders", "extraHeaders"]);
    FLOW_AUTH_DIAGNOSTICS.observerReady = true;
  } catch (error) {
    console.warn("[Guc guy] Flow request observer unavailable", error);
  }
}

function log(s, level) {
  const entry = { time: new Date().toISOString(), text: String(s) };
  if (["success", "error", "info"].includes(level)) entry.level = level;
  STATE.logs.push(entry);
  if (STATE.logs.length > 200) STATE.logs.splice(0, STATE.logs.length - 200);
  console.log("[Guc guy]", s);
  chrome.runtime.sendMessage({ type: "bb_log", ...entry }).catch(() => {});
  publishRemoteState();
}

function repairUnescapedJsonStringContent(source) {
  let result = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (!inString) {
      result += character;
      if (character === '"') inString = true;
      continue;
    }
    if (escaped) {
      result += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      result += character;
      escaped = true;
      continue;
    }
    if (character === "\n") { result += "\\n"; continue; }
    if (character === "\r") continue;
    if (character === "\t") { result += "\\t"; continue; }
    if (character !== '"') {
      result += character;
      continue;
    }

    let next = index + 1;
    while (next < source.length && /\s/.test(source[next])) next++;
    let structural = next >= source.length || source[next] === ":" || source[next] === "}" || source[next] === "]";
    if (source[next] === ",") {
      let afterComma = next + 1;
      while (afterComma < source.length && /\s/.test(source[afterComma])) afterComma++;
      structural = source[afterComma] === '"' || source[afterComma] === "}" || source[afterComma] === "]" || source[afterComma] === "{";
    }
    if (structural) {
      result += character;
      inString = false;
    } else {
      result += '\\"';
    }
  }
  return result;
}

function parseGeminiPlanJson(text) {
  const cleaned = String(text || "").replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").replace(/^\uFEFF/, "").trim();
  const candidates = [cleaned];
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > 0 && lastBrace > firstBrace) candidates.push(cleaned.slice(firstBrace,lastBrace + 1));
  let lastError = new Error("Gemini returned empty JSON.");
  for (const candidate of [...new Set(candidates)]) {
    try { return { value:JSON.parse(candidate),repaired:false,source:candidate }; }
    catch (error) { lastError = error; }
    const repairedNotation = candidate
      .replace(/\b(\d{1,2})\s*'\s*(\d{1,2})\s*"(?=\s*[,.;:)\]}])/g,"$1 feet $2 inches")
      .replace(/\b(\d{1,2})\s*"\s*(\d{1,2})\b/g,"$1 feet $2 inches");
    const repairedStructure = repairedNotation
      // Gemini occasionally prefixes a single JSON property with a Markdown
      // quote/list marker even after being told to return raw JSON.
      .replace(/^\s*>\s*(?=")/gm,"")
      .replace(/^\s*[-*]\s+(?=")/gm,"")
      .replace(/,\s*([}\]])/g,"$1");
    const repairCandidates = [
      repairedNotation,
      repairedStructure,
      repairUnescapedJsonStringContent(repairedNotation),
      repairUnescapedJsonStringContent(repairedStructure)
    ];
    for (const repaired of [...new Set(repairCandidates)]) {
      if (repaired === candidate) continue;
      try { return { value:JSON.parse(repaired),repaired:true,source:repaired }; }
      catch (error) { lastError = error; }
    }
  }
  throw lastError;
}

function broadcastQueue(queue) {
  STATE.queue = queue;
  chrome.runtime.sendMessage({ type: "bb_queue", queue }).catch(() => {});
  publishRemoteState();
}

function setStatus(s) {
  STATE.status = s;
  chrome.runtime.sendMessage({ type: "bb_status", text: s }).catch(() => {});
  publishRemoteState();
}

function setProgress(percent) {
  STATE.progress = percent;
  chrome.runtime.sendMessage({ type: "bb_progress", percent }).catch(() => {});
  publishRemoteState();
}

function publishRemoteState() {
  if (remoteSocket?.readyState !== WebSocket.OPEN) return;
  try {
    remoteSocket.send(JSON.stringify({ type:"state", state:{
      running:STATE.running,status:STATE.status,progress:STATE.progress,
      queue:STATE.queue.map(({index,status,error,previewUrl,thumbnailUrl})=>({index,status,error,hasPreview:Boolean(previewUrl||thumbnailUrl)})),
      logs:STATE.logs.filter((entry)=>!/^Prompt \d+:/i.test(entry.text||"")).slice(-20)
    }}));
  } catch {}
}

function sendRemoteClientMessage(type,clientId,payload={}) {
  if(remoteSocket?.readyState!==WebSocket.OPEN||typeof clientId!=="string")return;
  try{remoteSocket.send(JSON.stringify({type,clientId,...payload}));}catch{}
}

function remoteReferenceSummary(records) {
  return (Array.isArray(records)?records:[]).slice(0,8).map((record)=>({
    id:String(record.id||""),
    name:String(record.name||"Reference image").slice(0,180),
    dataUrl:String(record.dataUrl||"")
  }));
}

async function getSavedRemoteConfig() {
  const s=await chrome.storage.local.get(null);
  const characters=(Array.isArray(s.bb_story_characters)?s.bb_story_characters:[]).map((character)=>({
    id:String(character.id||crypto.randomUUID()),name:String(character.name||""),height:String(character.height||""),physique:String(character.physique||""),
    subjects:remoteReferenceSummary(character.subjects),outfits:remoteReferenceSummary(character.outfits)
  }));
  return {
    mode:["classic","subject-flow","story"].includes(s.bb_creation_mode)?s.bb_creation_mode:"classic",
    shortPrompt:String(s.bb_short_prompt||""),physicalDetails:String(s.bb_physical_details||""),systemInstruction:String(s.bb_sf_system_prompt||""),targetPrompt:String(s.bb_sf_target_prompt||""),figureDetails:String(s.bb_sf_figure_details||""),storyBrief:String(s.bb_story_brief||""),
    engine:s.bb_prompt_engine==="direct"?"direct":"gemini",model:ALLOWED_MODELS.has(s.bb_image_model)?s.bb_image_model:FLOW_IMAGE_MODEL,
    aspect:ALLOWED_ASPECT_RATIOS.has(s.bb_aspect_ratio)?s.bb_aspect_ratio:"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",
    upscale:s.bb_upscale_enabled!=="off"&&s.bb_upscale_enabled!==false,count:Math.max(1,Math.min(20,Number.parseInt(s.bb_image_count,10)||5)),
    generationMode:s.bb_generation_mode==="sequential"?"sequential":"parallel",storyCharacters:characters,
    poseReferences:PoseReference.saved(s.bb_pose_references),
    references:{
      subjects:remoteReferenceSummary(s.bb_subject_references),outfit:s.bb_outfit_reference?{id:String(s.bb_outfit_reference.id||""),name:String(s.bb_outfit_reference.name||"Outfit"),dataUrl:String(s.bb_outfit_reference.dataUrl||"")}:null,
      location:s.bb_location_reference?{id:String(s.bb_location_reference.id||""),name:String(s.bb_location_reference.name||"Location"),dataUrl:String(s.bb_location_reference.dataUrl||"")}:null,
      sfSubjects:remoteReferenceSummary(s.bb_sf_subjects),sfOutfits:remoteReferenceSummary(s.bb_sf_outfits),sfKnowledge:remoteReferenceSummary(s.bb_sf_knowledge),sfQuality:remoteReferenceSummary(s.bb_sf_quality)
    },
      presets:(Array.isArray(s.bb_sf_prompt_presets)?s.bb_sf_prompt_presets:[]).slice(0,100).map((preset)=>{const full=preset.fullSettings||{};const sfCount=Object.values(preset.references||{}).reduce((sum,items)=>sum+(Array.isArray(items)?items.length:0),0);const fullCount=(Array.isArray(full.classicSubjects)?full.classicSubjects.length:0)+(full.classicOutfit?1:0)+(full.classicLocation?1:0)+(Array.isArray(full.storyCharacters)?full.storyCharacters.reduce((sum,character)=>sum+(Array.isArray(character.subjects)?character.subjects.length:0)+(Array.isArray(character.outfits)?character.outfits.length:0),0):0);return{id:String(preset.id||""),name:String(preset.name||"Preset"),referenceCount:sfCount+fullCount}})
  };
}

function safeRemoteImageRecord(record) {
  if(!record||typeof record.dataUrl!=="string"||!/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(record.dataUrl)||record.dataUrl.length>11*1024*1024)throw new Error("Image must be a supported image smaller than 8 MB.");
  return {id:typeof record.id==="string"?record.id:crypto.randomUUID(),name:String(record.name||"Reference image").slice(0,180),dataUrl:record.dataUrl};
}

async function updateRemoteConfig(config) {
  if(!config||typeof config!=="object")throw new Error("Missing Guc guy settings.");
  const text=(value,max)=>String(value||"").slice(0,max);
  const mode=["classic","subject-flow","story"].includes(config.mode)?config.mode:"classic";
  const fields={
    bb_creation_mode:mode,bb_short_prompt:text(config.shortPrompt,300),bb_physical_details:text(config.physicalDetails,1200),
    bb_sf_system_prompt:text(config.systemInstruction,5000),bb_sf_target_prompt:text(config.targetPrompt,2500),bb_sf_figure_details:text(config.figureDetails,1200),bb_story_brief:text(config.storyBrief,30000),
    bb_prompt_engine:config.engine==="direct"?"direct":"gemini",bb_image_model:ALLOWED_MODELS.has(config.model)?config.model:FLOW_IMAGE_MODEL,
    bb_aspect_ratio:ALLOWED_ASPECT_RATIOS.has(config.aspect)?config.aspect:"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",
    bb_upscale_enabled:config.upscale===false?"off":"on",bb_image_count:String(Math.max(mode==="subject-flow"?5:1,Math.min(20,Number.parseInt(config.count,10)||5))),
    bb_generation_mode:config.generationMode==="sequential"?"sequential":"parallel"
  };
  const previous=await chrome.storage.local.get("bb_story_characters");
  const oldCharacters=Array.isArray(previous.bb_story_characters)?previous.bb_story_characters:[];
  const oldById=new Map(oldCharacters.map((character)=>[String(character.id),character]));
  fields.bb_story_characters=(Array.isArray(config.storyCharacters)?config.storyCharacters:[]).map((character,index)=>{
    const old=oldById.get(String(character.id||""))||{};
    return {id:String(character.id||crypto.randomUUID()),name:text(character.name,50).trim()||`Character ${index+1}`,height:text(character.height,120),physique:text(character.physique,700),outfitNotes:text(character.outfitNotes,500),subjects:Array.isArray(old.subjects)?old.subjects.slice(0,3):[],outfits:Array.isArray(old.outfits)?old.outfits.slice(0,2):[]};
  });
  await chrome.storage.local.set(fields);
  return getSavedRemoteConfig();
}

function remotePoseMode(group) {
  const mode=String(group||'').replace(/^pose-/, '');
  return String(group||'').startsWith('pose-')&&PoseReference.modes.includes(mode)?mode:null;
}
async function changeRemotePose(mode,record) {
  const stored=await chrome.storage.local.get('bb_pose_references');
  const refs=PoseReference.saved(stored.bb_pose_references);
  refs[mode]=record;
  await chrome.storage.local.set({bb_pose_references:refs});
  return getSavedRemoteConfig();
}
async function changeRemoteReference(message) {
  const poseMode=remotePoseMode(message.group);
  if(poseMode)return changeRemotePose(poseMode,safeRemoteImageRecord(message.record));
  const group=String(message.group||"");
  const multiGroups={subjects:"bb_subject_references",sfSubjects:"bb_sf_subjects",sfOutfits:"bb_sf_outfits",sfKnowledge:"bb_sf_knowledge",sfQuality:"bb_sf_quality"};
  const singleGroups={outfit:"bb_outfit_reference",location:"bb_location_reference"};
  const ref=safeRemoteImageRecord(message.record);
  if(multiGroups[group]){
    const stored=await chrome.storage.local.get(multiGroups[group]);
    const records=Array.isArray(stored[multiGroups[group]])?stored[multiGroups[group]]:[];
    if(records.length>=8)throw new Error("This group already has 8 reference images.");
    await chrome.storage.local.set({[multiGroups[group]]:[...records,ref]});
  }else if(singleGroups[group])await chrome.storage.local.set({[singleGroups[group]]:ref});
  else if((group==="storySubjects"||group==="storyOutfits")&&typeof message.characterId==="string"){
    const stored=await chrome.storage.local.get("bb_story_characters");
    const characters=(Array.isArray(stored.bb_story_characters)?stored.bb_story_characters:[]).map((character)=>{
      if(String(character.id)!==message.characterId)return character;
      const key=group==="storySubjects"?"subjects":"outfits",max=group==="storySubjects"?3:2;
      const records=Array.isArray(character[key])?character[key]:[];
      if(records.length>=max)throw new Error(`This character already has ${max} ${key} references.`);
      return {...character,[key]:[...records,ref]};
    });
    if(!characters.some((character)=>String(character.id)===message.characterId))throw new Error("Story character not found.");
    await chrome.storage.local.set({bb_story_characters:characters});
  }else throw new Error("Unknown reference group.");
  return getSavedRemoteConfig();
}

async function removeRemoteReference(message) {
  const poseMode=remotePoseMode(message.group);
  if(poseMode)return changeRemotePose(poseMode,null);
  const group=String(message.group||""),id=String(message.id||"");
  const multiGroups={subjects:"bb_subject_references",sfSubjects:"bb_sf_subjects",sfOutfits:"bb_sf_outfits",sfKnowledge:"bb_sf_knowledge",sfQuality:"bb_sf_quality"};
  const singleGroups={outfit:"bb_outfit_reference",location:"bb_location_reference"};
  if(multiGroups[group]){
    const stored=await chrome.storage.local.get(multiGroups[group]);
    await chrome.storage.local.set({[multiGroups[group]]:(Array.isArray(stored[multiGroups[group]])?stored[multiGroups[group]]:[]).filter((record)=>String(record.id)!==id)});
  }else if(singleGroups[group])await chrome.storage.local.remove(singleGroups[group]);
  else if((group==="storySubjects"||group==="storyOutfits")&&typeof message.characterId==="string"){
    const stored=await chrome.storage.local.get("bb_story_characters");
    const characters=(Array.isArray(stored.bb_story_characters)?stored.bb_story_characters:[]).map((character)=>{
      if(String(character.id)!==message.characterId)return character;
      const key=group==="storySubjects"?"subjects":"outfits";
      return {...character,[key]:(Array.isArray(character[key])?character[key]:[]).filter((record)=>String(record.id)!==id)};
    });
    await chrome.storage.local.set({bb_story_characters:characters});
  }else throw new Error("Unknown reference group.");
  return getSavedRemoteConfig();
}

async function getRemoteReference(group,id,characterId) {
  const poseMode=remotePoseMode(group);
  if(poseMode){const saved=await chrome.storage.local.get('bb_pose_references');return PoseReference.saved(saved.bb_pose_references)[poseMode];}
  const s=await chrome.storage.local.get(null);
  const multi={subjects:s.bb_subject_references,sfSubjects:s.bb_sf_subjects,sfOutfits:s.bb_sf_outfits,sfKnowledge:s.bb_sf_knowledge,sfQuality:s.bb_sf_quality};
  if(group==="outfit"||group==="location")return s[group==="outfit"?"bb_outfit_reference":"bb_location_reference"]||null;
  if(group==="storySubjects"||group==="storyOutfits"){
    const character=(Array.isArray(s.bb_story_characters)?s.bb_story_characters:[]).find((item)=>String(item.id)===String(characterId));
    const key=group==="storySubjects"?"subjects":"outfits";
    return (Array.isArray(character?.[key])?character[key]:[]).find((record)=>String(record.id)===id)||null;
  }
  if(!multi[group])throw new Error("Unknown reference group.");
  return (Array.isArray(multi[group])?multi[group]:[]).find((record)=>String(record.id)===id)||null;
}

async function saveRemotePreset(name) {
  const s=await chrome.storage.local.get(null),presetName=String(name||"").trim().slice(0,48);
  if(!presetName)throw new Error("Enter a name for the preset.");
  const preset={id:crypto.randomUUID(),name:presetName,system:String(s.bb_sf_system_prompt||""),target:String(s.bb_sf_target_prompt||""),figure:String(s.bb_sf_figure_details||""),engine:s.bb_prompt_engine==="direct"?"direct":"gemini",model:s.bb_image_model||FLOW_IMAGE_MODEL,aspect:s.bb_aspect_ratio||"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",upscale:s.bb_upscale_enabled==="off"?"off":"on",count:String(s.bb_image_count||5),generationMode:s.bb_generation_mode==="sequential"?"sequential":"parallel",references:{sfSubjects:s.bb_sf_subjects||[],sfOutfits:s.bb_sf_outfits||[],sfKnowledge:s.bb_sf_knowledge||[],sfQuality:s.bb_sf_quality||[]},fullSettings:{figureReference:FigureReference.record(s.bb_figure_reference),storyFigureCharacterId:String(s.bb_story_figure_character_id||''),poseReferences:PoseReference.saved(s.bb_pose_references),mode:s.bb_creation_mode||"classic",shortPrompt:String(s.bb_short_prompt||""),physicalDetails:String(s.bb_physical_details||""),storyBrief:String(s.bb_story_brief||""),storyInputMode:s.bb_story_input_mode==="novel"?"novel":"brief",storyBgStyle:s.bb_story_bg_style||"crime-noir",storyStyleReferences:Array.isArray(s.bb_story_style_references)?s.bb_story_style_references:(s.bb_story_style_reference?[s.bb_story_style_reference]:[]),storyTextOverlays:s.bb_story_text_overlays===true,storyCharacters:Array.isArray(s.bb_story_characters)?s.bb_story_characters:[],classicSubjects:Array.isArray(s.bb_subject_references)?s.bb_subject_references:[],classicOutfit:s.bb_outfit_reference||null,classicLocation:s.bb_location_reference||null}};
  const presets=Array.isArray(s.bb_sf_prompt_presets)?s.bb_sf_prompt_presets:[];
  const existing=presets.findIndex((item)=>String(item.name).toLocaleLowerCase()===presetName.toLocaleLowerCase());
  if(existing>=0)preset.id=presets[existing].id;
  if(existing>=0)presets[existing]=preset;else presets.push(preset);
  await chrome.storage.local.set({bb_sf_prompt_presets:presets});
  return getSavedRemoteConfig();
}

async function loadRemotePreset(id) {
  const s=await chrome.storage.local.get("bb_sf_prompt_presets"),preset=(Array.isArray(s.bb_sf_prompt_presets)?s.bb_sf_prompt_presets:[]).find((item)=>item.id===id);
  if(!preset)throw new Error("Preset not found.");
  const refs=preset.references||{};
  const full=preset.fullSettings&&typeof preset.fullSettings==="object"?preset.fullSettings:{};
  const values={bb_creation_mode:["classic","subject-flow","story"].includes(full.mode)?full.mode:"subject-flow",bb_sf_system_prompt:String(preset.system||""),bb_sf_target_prompt:String(preset.target||""),bb_sf_figure_details:String(preset.figure||""),bb_prompt_engine:preset.engine==="direct"?"direct":"gemini",bb_image_model:ALLOWED_MODELS.has(preset.model)?preset.model:FLOW_IMAGE_MODEL,bb_aspect_ratio:ALLOWED_ASPECT_RATIOS.has(preset.aspect)?preset.aspect:"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",bb_upscale_enabled:preset.upscale==="off"?"off":"on",bb_image_count:String(preset.count||5),bb_generation_mode:preset.generationMode==="sequential"?"sequential":"parallel",bb_sf_subjects:Array.isArray(refs.sfSubjects)?refs.sfSubjects.slice(0,8):[],bb_sf_outfits:Array.isArray(refs.sfOutfits)?refs.sfOutfits.slice(0,8):[],bb_sf_knowledge:Array.isArray(refs.sfKnowledge)?refs.sfKnowledge.slice(0,8):[],bb_sf_quality:Array.isArray(refs.sfQuality)?refs.sfQuality.slice(0,8):[]};
  if(preset.fullSettings){if('figureReference'in full){values.bb_figure_reference=FigureReference.record(full.figureReference);values.bb_story_figure_character_id=String(full.storyFigureCharacterId||'');}values.bb_pose_references=PoseReference.saved(full.poseReferences);values.bb_short_prompt=String(full.shortPrompt||"");values.bb_physical_details=String(full.physicalDetails||"");values.bb_story_brief=String(full.storyBrief||"");values.bb_story_input_mode=full.storyInputMode==="novel"?"novel":"brief";values.bb_story_bg_style=["crime-noir","photorealistic","grounded-thriller","warm-drama","webtoon"].includes(full.storyBgStyle)?full.storyBgStyle:"crime-noir";values.bb_story_style_references=(Array.isArray(full.storyStyleReferences)?full.storyStyleReferences:full.storyStyleReference?[full.storyStyleReference]:[]).slice(0,4).map(safeRemoteImageRecord).filter(Boolean);values.bb_story_style_reference=values.bb_story_style_references[0]||null;values.bb_story_text_overlays=full.storyTextOverlays===true;values.bb_story_characters=Array.isArray(full.storyCharacters)?full.storyCharacters:[];values.bb_subject_references=Array.isArray(full.classicSubjects)?full.classicSubjects.slice(0,8):[];values.bb_outfit_reference=full.classicOutfit||null;values.bb_location_reference=full.classicLocation||null;}
  await chrome.storage.local.set(values);
  return getSavedRemoteConfig();
}

async function pairPhoneRemote() {
  const token = crypto.randomUUID().replaceAll("-","") + crypto.randomUUID().replaceAll("-","");
  const response = await fetch("http://127.0.0.1:32189/api/pair", {
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `Phone bridge returned HTTP ${response.status}.`);
  await chrome.storage.local.set({[REMOTE_TOKEN_KEY]:token});
  connectRemoteBridge(token);
  return {ok:true,qr:data.qr,controlUrl:data.controlUrl,address:data.address};
}

function connectRemoteBridge(token) {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  clearTimeout(remoteRetryTimer);
  try { remoteSocket?.close(); } catch {}
  try {
    const socket = new WebSocket(`${REMOTE_BRIDGE_URL}?token=${token}`);
    remoteSocket = socket;
    socket.onopen = () => {
      clearInterval(remoteKeepaliveTimer);
      remoteKeepaliveTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send("ping");
      },20000);
      publishRemoteState();
    };
    socket.onmessage = (event) => {
      let message;
      try { message=JSON.parse(event.data); } catch { return; }
      if (message.type === "command") handlePhoneRemoteCommand(message).catch((error) => {
        sendRemoteClientMessage("result",message.clientId,{requestId:message.requestId,ok:false,command:message.command,error:String(error?.message||error).slice(0,300)});
      });
    };
    socket.onclose = () => {
      if (remoteSocket === socket) remoteSocket=null;
      clearInterval(remoteKeepaliveTimer);
      remoteKeepaliveTimer=null;
      remoteRetryTimer=setTimeout(() => connectRemoteBridge(token),5000);
      publishRemoteState();
    };
    socket.onerror = () => socket.close();
  } catch {
    remoteRetryTimer=setTimeout(() => connectRemoteBridge(token),5000);
  }
}

async function savedRemoteRunParams() {
  const stored=await chrome.storage.local.get(null);
  const mode=["classic","subject-flow","story"].includes(stored.bb_creation_mode)?stored.bb_creation_mode:"classic";
  const subjectFlow=mode==="subject-flow";
  const story=mode==="story";
  const engine=stored.bb_prompt_engine==="direct"?"direct":"gemini";
  return {
    workflowMode:mode,
    shortPrompt:subjectFlow?String(stored.bb_sf_target_prompt||""):story?String(stored.bb_story_brief||""):String(stored.bb_short_prompt||""),
    systemInstruction:subjectFlow?String(stored.bb_sf_system_prompt||""):"",
    physicalDetails:subjectFlow?String(stored.bb_sf_figure_details||""):String(stored.bb_physical_details||""),
    subjects:subjectFlow?(Array.isArray(stored.bb_sf_subjects)?stored.bb_sf_subjects:[]):(Array.isArray(stored.bb_subject_references)?stored.bb_subject_references:[]),
    outfits:subjectFlow?(Array.isArray(stored.bb_sf_outfits)?stored.bb_sf_outfits:[]):stored.bb_outfit_reference?[stored.bb_outfit_reference]:[],
    knowledge:subjectFlow?(Array.isArray(stored.bb_sf_knowledge)?stored.bb_sf_knowledge:[]):story?[]:stored.bb_location_reference?[stored.bb_location_reference]:[],
    quality:subjectFlow&&Array.isArray(stored.bb_sf_quality)?stored.bb_sf_quality:[],
    poseReference:PoseReference.saved(stored.bb_pose_references)[mode],
    figureReference:stored.bb_figure_reference||null,
    storyFigureCharacterId:String(stored.bb_story_figure_character_id||''),
    storyCharacters:story&&Array.isArray(stored.bb_story_characters)?stored.bb_story_characters:[],
    storyChapters:story&&Array.isArray(stored.bb_story_queue_drafts)?stored.bb_story_queue_drafts:[],
    storyBgStyle:stored.bb_story_bg_style||'crime-noir',storyTextOverlays:stored.bb_story_text_overlays===true,
    storyInputMode:stored.bb_story_input_mode||'brief',storyStyleReferences:stored.bb_story_style_references||[],
    telegramEnabled:stored.bb_tg_enabled===true,tgBotToken:stored.bb_tg_bot_token||'',tgChatId:stored.bb_tg_chat_id||'',
    generationEngine:story?"gemini":engine,
    imageModel:String(stored.bb_image_model||FLOW_IMAGE_MODEL),
    aspectRatio:String(stored.bb_aspect_ratio||"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR"),
    upscaleEnabled:stored.bb_upscale_enabled!=="off"&&stored.bb_upscale_enabled!==false,
    imageCount:Number.parseInt(stored.bb_image_count,10)||5,
    generationMode:stored.bb_generation_mode==="sequential"?"sequential":"parallel"
  };
}

async function handlePhoneRemoteCommand(message) {
  const command=String(message.command||"");
  const clientId=message.clientId,requestId=message.requestId;
  const reply=(type,payload={})=>sendRemoteClientMessage(type,clientId,{requestId,...payload});
  if (command==="state") { publishRemoteState(); return reply("result",{ok:true,command}); }
  if (command==="config") return reply("config",{config:await getSavedRemoteConfig()});
  if (command==="save-config") return reply("config",{config:await updateRemoteConfig(message.config)});
  if (command==="set-reference") return reply("config",{config:await changeRemoteReference(message)});
  if (command==="remove-reference") return reply("config",{config:await removeRemoteReference(message)});
  if (command==="get-reference") return reply("reference",{group:message.group,id:message.id,characterId:message.characterId,record:await getRemoteReference(message.group,message.id,message.characterId)});
  if (command==="get-preview") {
    const index=Number.parseInt(message.index,10)-1,entry=STATE.queue[index];
    if(!entry)throw new Error("Image is no longer in the current queue.");
    const dataUrl=entry.previewUrl||entry.thumbnailUrl;
    if(!dataUrl)throw new Error("This image has no preview yet.");
    return reply("preview",{index:index+1,dataUrl});
  }
  if (command==="save-preset") return reply("preset",{config:await saveRemotePreset(message.name)});
  if (command==="load-preset") return reply("preset",{config:await loadRemotePreset(String(message.id||""))});
  if (command==="delete-preset") {
    const stored=await chrome.storage.local.get("bb_sf_prompt_presets");
    await chrome.storage.local.set({bb_sf_prompt_presets:(Array.isArray(stored.bb_sf_prompt_presets)?stored.bb_sf_prompt_presets:[]).filter((item)=>String(item.id)!==String(message.id))});
    return reply("preset",{config:await getSavedRemoteConfig()});
  }
  if (command==="export-preset") {
    const stored=await chrome.storage.local.get("bb_sf_prompt_presets"),preset=(Array.isArray(stored.bb_sf_prompt_presets)?stored.bb_sf_prompt_presets:[]).find((item)=>String(item.id)===String(message.id));
    if(!preset)throw new Error("Preset not found.");
    return reply("preset",{preset});
  }
  if (command==="import-preset") {
    const incoming=message.preset;
    if(!incoming||typeof incoming!=="object"||typeof incoming.name!=="string"||!incoming.name.trim())throw new Error("Invalid preset file.");
    const normalized={id:crypto.randomUUID(),name:incoming.name.trim().slice(0,48),system:String(incoming.system||"").slice(0,5000),target:String(incoming.target||"").slice(0,2500),figure:String(incoming.figure||"").slice(0,1200),engine:incoming.engine==="direct"?"direct":"gemini",model:ALLOWED_MODELS.has(incoming.model)?incoming.model:FLOW_IMAGE_MODEL,aspect:ALLOWED_ASPECT_RATIOS.has(incoming.aspect)?incoming.aspect:"IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR",upscale:incoming.upscale==="off"?"off":"on",count:String(Math.max(5,Math.min(20,Number.parseInt(incoming.count,10)||5))),generationMode:incoming.generationMode==="sequential"?"sequential":"parallel",references:{}};
    for(const group of ["sfSubjects","sfOutfits","sfKnowledge","sfQuality"]){const records=Array.isArray(incoming.references?.[group])?incoming.references[group]:[];normalized.references[group]=records.slice(0,8).map(safeRemoteImageRecord);}
    if(incoming.fullSettings&&typeof incoming.fullSettings==="object"){
      const full=incoming.fullSettings,validList=(list,max)=>Array.isArray(list)?list.slice(0,max).map(safeRemoteImageRecord):[];
      normalized.fullSettings={...('figureReference'in full?{figureReference:FigureReference.record(full.figureReference),storyFigureCharacterId:String(full.storyFigureCharacterId||'').slice(0,180)}:{}),poseReferences:PoseReference.saved(full.poseReferences),mode:["classic","subject-flow","story"].includes(full.mode)?full.mode:"classic",shortPrompt:String(full.shortPrompt||"").slice(0,300),physicalDetails:String(full.physicalDetails||"").slice(0,1200),storyBrief:String(full.storyBrief||"").slice(0,30000),storyInputMode:full.storyInputMode==="novel"?"novel":"brief",storyBgStyle:["crime-noir","photorealistic","grounded-thriller","warm-drama","webtoon"].includes(full.storyBgStyle)?full.storyBgStyle:"crime-noir",storyStyleReferences:(Array.isArray(full.storyStyleReferences)?full.storyStyleReferences:full.storyStyleReference?[full.storyStyleReference]:[]).slice(0,4).map(safeRemoteImageRecord).filter(Boolean),storyTextOverlays:full.storyTextOverlays===true,classicSubjects:validList(full.classicSubjects,8),classicOutfit:full.classicOutfit?safeRemoteImageRecord(full.classicOutfit):null,classicLocation:full.classicLocation?safeRemoteImageRecord(full.classicLocation):null,storyCharacters:(Array.isArray(full.storyCharacters)?full.storyCharacters:[]).map((character,index)=>({id:String(character.id||crypto.randomUUID()),name:String(character.name||`Character ${index+1}`).slice(0,50),height:String(character.height||"").slice(0,120),physique:String(character.physique||"").slice(0,700),outfitNotes:String(character.outfitNotes||"").slice(0,500),subjects:validList(character.subjects,3),outfits:validList(character.outfits,2)}))};
    }
    const stored=await chrome.storage.local.get("bb_sf_prompt_presets"),presets=Array.isArray(stored.bb_sf_prompt_presets)?stored.bb_sf_prompt_presets:[],existing=presets.findIndex((item)=>item.name.toLocaleLowerCase()===normalized.name.toLocaleLowerCase());
    if(existing>=0)normalized.id=presets[existing].id;
    if(existing>=0)presets[existing]=normalized;else presets.push(normalized);
    await chrome.storage.local.set({bb_sf_prompt_presets:presets});
    return reply("preset",{config:await getSavedRemoteConfig()});
  }
  if (command==="stop") {
    if(StoryJobs.busy){await StoryJobs.handle({type:'bb_story_stop'});return reply('result',{ok:true,command});}
    requestGenerationStop();
    log("Stop requested from paired phone.");
    return reply("result",{ok:true,command});
  }
  if (command==="start") {
    if (STATE.running || StoryJobs.busy) throw new Error("A generation is already running.");
    const params=await savedRemoteRunParams();
    if(params.workflowMode==='story'){await StoryJobs.start(params);return reply('result',{ok:true,command});}
    runWithKeepalive(params).catch((error)=>{
      log("ERROR: "+(error?.message||error));
      STATE.running=false;
      setStatus(STATE.stopRequested ? "Stopped. Progress saved." : "Failed.");
      chrome.runtime.sendMessage({type:"bb_done"}).catch(()=>{});
    }).finally(()=>closeFlowSecurityHelperTab());
    return reply("result",{ok:true,command});
  }
  if (command==="retry") {
    const index=Number.parseInt(message.index,10)-1;
    if (STATE.running || StoryJobs.busy) throw new Error("Wait for the current generation to finish.");
    if (!Number.isInteger(index)||typeof STATE.retryHandler!=="function") throw new Error("No retryable Guc guy run is loaded yet.");
    STATE.retryHandler(index).catch((error)=>{
      log("Manual retry failed: "+(error?.message||error));
      STATE.running=false;
      setStatus("Retry failed.");
      chrome.runtime.sendMessage({type:"bb_done"}).catch(()=>{});
    }).finally(()=>closeFlowSecurityHelperTab());
    return reply("result",{ok:true,command,index:index+1});
  }
  throw new Error("Unknown phone command.");
}

chrome.runtime.onStartup.addListener(async () => {
  const stored=await chrome.storage.local.get(REMOTE_TOKEN_KEY);
  if (stored[REMOTE_TOKEN_KEY]) connectRemoteBridge(stored[REMOTE_TOKEN_KEY]);
});

chrome.storage.local.get(REMOTE_TOKEN_KEY).then((stored) => {
  if (stored[REMOTE_TOKEN_KEY]) connectRemoteBridge(stored[REMOTE_TOKEN_KEY]);
}).catch(() => {});

chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
  if (msg.type === "CAPTURE_FLOW_TOKEN") {
    const senderUrl = String(_s?.url || _s?.tab?.url || "");
    if (!isGoogleFlowUrl(senderUrl) || !captureFlowAccessToken(msg.token, _s?.tab?.id)) {
      sendResponse({ ok:false });
    } else {
      sendResponse({ ok:true });
    }
  } else if (msg.type === "FLOW_BRIDGE_READY") {
    const senderUrl = String(_s?.url || _s?.tab?.url || "");
    if (isGoogleFlowUrl(senderUrl)) FLOW_AUTH_DIAGNOSTICS.bridgeReadyAt = Date.now();
    sendResponse({ ok:isGoogleFlowUrl(senderUrl) });
  } else if (msg.type === "bb_qid_generate") {
    if (STATE.running || StoryJobs.busy) {
      sendResponse({ok:false,error:"A generation is already running."});
      return true;
    }
    sendResponse({ok:true});
    runQidVideo(msg).catch(error=>{
      log(`Qid video failed before it could start: ${error?.message||error}`,'error');
      STATE.running=false;setStatus('Qid video failed.');chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
    });
  } else if (msg.type === "bb_generate" || msg.type === "bb_direct_image_generate") {
    if (STATE.running || StoryJobs.busy) {
      sendResponse({ ok: false, error: "A generation is already running." });
      return true;
    }
    if (msg.type === 'bb_direct_image_generate') msg = {...msg,workflowMode:'direct-image'};
    if(msg.workflowMode === 'story') {
      StoryJobs.start(msg).then(session=>sendResponse({ok:true,session})).catch(error=>sendResponse({ok:false,error:error.message}));
      return true;
    }
    runWithKeepalive(msg).catch((e) => {
      log("ERROR: " + (e?.message || e));
      STATE.running = false;
      setStatus(STATE.stopRequested ? "Stopped. Progress saved." : "Failed.");
      chrome.runtime.sendMessage({ type: "bb_done" }).catch(() => {});
    }).finally(() => closeFlowSecurityHelperTab());
    sendResponse({ ok: true });
  } else if (/^bb_story_(state|resume|stop|start_over|append|discard|pdf_save|pdf_send|panel_save|panel_preview)$/.test(msg.type)) {
    StoryJobs.handle(msg).then(sendResponse).catch(error=>sendResponse({ok:false,error:error.message}));
  } else if (msg.type === "bb_retry_image") {
    const index = Number.parseInt(msg.index,10) - 1;
    if (STATE.running || StoryJobs.busy) {
      sendResponse({ ok:false,error:"Wait for the current generation to finish." });
    } else if (!Number.isInteger(index) || typeof STATE.retryHandler !== "function") {
      sendResponse({ ok:false,error:"This generation session is no longer available. Generate the story once, then retry a panel." });
    } else {
      STATE.retryHandler(index).catch((error) => {
        log("Manual retry failed: " + (error?.message || error));
        STATE.running = false;
        setStatus("Retry failed.");
        chrome.runtime.sendMessage({ type:"bb_done" }).catch(() => {});
      }).finally(() => closeFlowSecurityHelperTab());
      sendResponse({ ok:true });
    }
  } else if (msg.type === "GET_STATE") {
    sendResponse({
      ok: true,
      runtimeVersion: '4.6.33',
      supportsFigureReference: true,
      supportsFreshStoryStart: true,
      supportedWorkflows: ['classic','subject-flow','story','direct-image'],
      running: STATE.running || StoryJobs.busy,
      status: STATE.status,
      stopping: STATE.stopRequested && (STATE.running || StoryJobs.busy),
      progress: STATE.progress,
      queue: STATE.queue,
      logs: STATE.logs,
    });
  } else if (msg.type === "PAIR_PHONE_REMOTE") {
    pairPhoneRemote().then(sendResponse).catch((error) => sendResponse({ok:false,error:`Start the Guc guy phone bridge on this PC first. ${error.message}`}));
  } else if (msg.type === "CLEAR_LOGS") {
    STATE.logs = [];
    sendResponse({ ok: true });
  } else if (msg.type === "bb_autodetect_telegram") {
    autoDetectTelegramChat(msg.token)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
  } else if (msg.type === "bb_test_telegram") {
    testTelegramBot(msg.token, msg.chatId)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
  } else if (msg.type === "bb_stop") {
    if(StoryJobs.busy){StoryJobs.handle({type:'bb_story_stop'}).then(sendResponse).catch(error=>sendResponse({ok:false,error:error.message}));return true;}
    requestGenerationStop();
    log("Stop requested.");
    sendResponse({ ok: true });
  } else if (msg.type === "CHECK_FLOW") {
    getDirectFlowAccountStatus().then((account) => {
      sendResponse({ ok:true, connected:true, account:account.account || "Google account" });
    }).catch((error) => {
      sendResponse({ ok:false, connected:false, error:error.message });
    });
  } else if (msg.type === "CONNECT_FLOW_ACCOUNT") {
    connectFlowAccount().then((result) => sendResponse({ ok:true, ...result })).catch((error) => {
      sendResponse({ ok:false, error:error.message });
    });
  }
  return true;
});

async function connectFlowAccount() {
  await FLOW_TOKEN_READY;
  FLOW_ACCESS_TOKENS.clear();
  FLOW_REJECTED_TOKENS.clear();
  FLOW_ACCESS_TOKEN = null;
  FLOW_AUTH_DIAGNOSTICS.lastTokenAt = 0;
  await chrome.storage.session.remove("bb_flow_access_token").catch(() => {});
  await chrome.storage.local.set({ [GUCGUY_LOGIN_PENDING_KEY]:true });
  await chrome.storage.local.remove(GUCGUY_LOGIN_KEY);

  const activeTabs = await chrome.tabs.query({ active:true, currentWindow:true });
  const returnTabId = activeTabs.find((item) => Number.isInteger(item.id))?.id;
  if (Number.isInteger(returnTabId)) {
    await chrome.storage.session.set({ bb_flow_return_tab_id:returnTabId }).catch(() => {});
  }

  const authTab = await findLabsFlowAuthTab();
  const tab = authTab?.id
    ? await chrome.tabs.update(authTab.id, { url:FLOW_AUTH_HOME_URL, active:false })
    : await chrome.tabs.create({ url:FLOW_AUTH_HOME_URL, active:false });
  if (tab?.id) await chrome.storage.session.set({ bb_flow_auth_tab_id:tab.id });
  if (!tab?.id) throw new Error("Could not start Google sign-in.");

  await waitForTabComplete(tab.id);
  const latest = await chrome.tabs.get(tab.id);
  const latestUrl = String(latest.url || latest.pendingUrl || "");
  if (/^https:\/\/accounts\.google\.com\//i.test(latestUrl)) {
    await chrome.tabs.update(tab.id, { active:true });
    if (latest.windowId) await chrome.windows.update(latest.windowId, { focused:true }).catch(() => {});
    return { loginRequired:true };
  }

  try {
    const session = await getLabsFlowSession(-1, { openIfMissing:false, focusOnError:false });
    const account = session.account || await getChromeProfileEmail() || "Google account";
    await chrome.storage.local.set({
      [GUCGUY_LOGIN_KEY]: { confirmed:true, account, connectedAt:Date.now() },
      [GUCGUY_LOGIN_PENDING_KEY]: false
    });
    captureFlowAccessToken(session.token, session.authTabId);
    await restoreTabAfterGoogleLogin(session.authTabId);
    return { connected:true, account };
  } catch {
    await chrome.tabs.update(tab.id, { active:true }).catch(() => {});
    return { loginRequired:true };
  }
}

function getChromeProfileEmail() {
  return new Promise((resolve) => {
    try {
      chrome.identity.getProfileUserInfo({ accountStatus:"ANY" }, (profile) => {
        resolve(String(profile?.email || "").trim().toLowerCase());
      });
    } catch {
      resolve("");
    }
  });
}

async function restoreTabAfterGoogleLogin(authTabId) {
  const stored = await chrome.storage.session.get("bb_flow_return_tab_id").catch(() => ({}));
  await chrome.storage.session.remove("bb_flow_return_tab_id").catch(() => {});
  const returnTabId = stored.bb_flow_return_tab_id;
  if (!Number.isInteger(returnTabId) || returnTabId === authTabId) return;
  try {
    const tab = await chrome.tabs.update(returnTabId, { active:true });
    if (tab?.windowId) await chrome.windows.update(tab.windowId, { focused:true }).catch(() => {});
  } catch {}
}

async function getDirectFlowAccountStatus() {
  const stored = await chrome.storage.local.get([GUCGUY_LOGIN_KEY, GUCGUY_LOGIN_PENDING_KEY]);
  const login = stored[GUCGUY_LOGIN_KEY];
  const pending = stored[GUCGUY_LOGIN_PENDING_KEY] === true;
  if (!login?.confirmed && !pending) throw new Error("Google sign-in is required.");

  const session = await getLabsFlowSession(-1, { openIfMissing:true, focusOnError:false });
  const account = session.account || login?.account || "Google account";
  if (pending || !login?.confirmed || (session.account && login.account !== session.account)) {
    await chrome.storage.local.set({
      [GUCGUY_LOGIN_KEY]: { confirmed:true, account, connectedAt:Date.now() },
      [GUCGUY_LOGIN_PENDING_KEY]: false
    });
    await restoreTabAfterGoogleLogin(session.authTabId);
  }
  captureFlowAccessToken(session.token, session.authTabId);
  return { ...session, account };
}

async function createDirectFlowProject(authTabId) {
  const title = `Guc guy ${new Date().toLocaleString("en-US", { month:"short", day:"2-digit", hour:"2-digit", minute:"2-digit" })}`;
  const rpcId = "jHPbke";
  const requestBody = BigBombFlowRpc.buildProjectCreateRequest(rpcId, title);
  const result = await chrome.scripting.executeScript({
    target: { tabId:authTabId },
    world: "MAIN",
    func: async (projectRequestBody) => {
      try {
        /* ── Step 1: scrape WIZ session tokens from page globals ── */
        const w = typeof WIZ_global_data !== "undefined" ? WIZ_global_data : (window.WIZ_global_data || null);
        const at  = w && w.SNlM0e ? String(w.SNlM0e) : "";
        const bl  = w && w.cfb2h  ? String(w.cfb2h)  : "";
        const sid = w && w.FdrFJe != null ? String(w.FdrFJe) : "";
        if (!at) return { error:"WIZ session token (at/SNlM0e) not found — open a flow.google.com page first" };

        /* ── Step 2: detect authuser index from URL ── */
        const authMatch = location.pathname.match(/\/u\/(\d+)/);
        const authIndex = authMatch ? authMatch[1] : "0";

        /* ── Step 3: send Flow's current project_create payload ── */
        const qp = new URLSearchParams({
          rpcids: "jHPbke",
          "source-path": `/u/${authIndex}/`,
          bl: bl,
          "f.sid": sid,
          hl: "en",
          _reqid: String(Math.floor(1e5 + Math.random() * 9e5)),
          rt: "c"
        });

        const batchUrl = `https://flow.google.com/u/${authIndex}/_/AiSandboxAngularFrontend/data/batchexecute?${qp.toString()}`;

        const body = new URLSearchParams({ "f.req": projectRequestBody, at }).toString();

        /* ── Step 4: POST to batchexecute ── */
        const response = await fetch(batchUrl, {
          method: "POST",
          credentials: "include",
          signal: AbortSignal.timeout(180000),
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "X-Same-Domain": "1"
          },
          body
        });
        const text = await response.text();
        return {status:response.status, text};
      } catch (error) {
        return { error:error.message };
      }
    },
    args:[requestBody]
  });
  const created = result?.[0]?.result;
  if (created?.error) throw new Error(`Automatic Flow project creation failed: ${created.error}`);
  if (created?.status && (created.status < 200 || created.status >= 300)) {
    throw new Error(`Automatic Flow project creation failed: HTTP ${created.status}: ${String(created.text || "").slice(0,300)}`);
  }
  if (typeof created?.text !== "string") throw new Error("Automatic Flow project creation returned no response text");
  try {
    return BigBombFlowRpc.parseProjectCreateResponse(created.text, rpcId).projectId;
  } catch (error) {
    throw new Error(`Automatic Flow project creation response was not recognized: ${error.message}`);
  }
}

async function discoverFlowProjectId(tabId, url) {
  if (typeof url === "string") {
    const match = url.match(/project\/([a-zA-Z0-9_-]+)/);
    if (match) return { projectId: match[1] };
  }
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const match = location.href.match(/project\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
      const link = document.querySelector('a[href*="/project/"]');
      return link ? link.href.match(/project\/([a-zA-Z0-9_-]+)/)?.[1] || null : null;
    }
  }).catch(() => null);
  const projectId = result?.[0]?.result;
  return projectId ? { projectId } : null;
}

async function getDirectFlowContext() {
  const session = await waitForGenerationOperation(getDirectFlowAccountStatus());
  await FlowRequestGuard.ready();
  const accountTab = await chrome.tabs.get(session.authTabId);
  const accountUrl = new URL(accountTab.url || accountTab.pendingUrl);
  if(accountUrl.origin !== 'https://flow.google.com')throw Error('Open the signed-in Flow account.');
  const accountIndex=accountUrl.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] || '0';
  const fresh = await chrome.tabs.create({url:`https://flow.google.com/u/${accountIndex}/`,active:false});
  try {
    await chrome.tabs.update(fresh.id,{autoDiscardable:false});
    const deadline=Date.now()+45000;
    while(true) {
      await FlowRequestGuard.ready();
      const tab=await chrome.tabs.get(fresh.id);
      if(tab.status==='complete') {
        if(new URL(tab.url).origin!=='https://flow.google.com')throw Error('Finish signing in to Flow.');
        break;
      }
      if(Date.now()>=deadline)throw Error('Fresh Flow tab did not finish loading.');
      await interruptibleWait(250);
    }
    await waitForGenerationOperation(checkFlowCompatibility(fresh.id));
    const projectId=await waitForGenerationOperation(createDirectFlowProject(fresh.id),()=>chrome.tabs.remove(fresh.id));
    await FlowRequestGuard.ready();
    await ensureFlowProjectPage(fresh.id,projectId);
    await FlowRequestGuard.ready();
    const compatibility=await waitForGenerationOperation(checkFlowCompatibility(fresh.id));
    return {tabId:fresh.id,authTabId:fresh.id,accountIndex,projectId,recaptchaSiteKey:compatibility.siteKey};
  } catch(error) {
    FLOW_DYNAMIC_SITE_KEYS.delete(fresh.id);
    await chrome.tabs.remove(fresh.id).catch(()=>{});
    throw error;
  }
}

async function runQidVideo(params) {
  const refs=Array.isArray(params.references)?params.references:[];
  const allowedModels=new Set(['omni-1-2','omni-flash','veo-31-fast','veo-31-quality','flow-auto']);
  const allowedAspects=new Set(['VIDEO_ASPECT_RATIO_PORTRAIT','VIDEO_ASPECT_RATIO_LANDSCAPE']);
  if(typeof params.prompt!=='string'||!params.prompt.trim()||params.prompt.length>24000)throw Error('Enter a video prompt under 24,000 characters.');
  if(!allowedModels.has(params.model)||!allowedAspects.has(params.aspect))throw Error('Unsupported Qid model or frame setting.');
  if(refs.length>3)throw Error('Qid supports up to three image references.');
  for(const ref of refs)if(typeof ref?.dataUrl!=='string'||!/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(ref.dataUrl)||typeof ref.name!=='string')throw Error('A Qid image reference is invalid. Select JPEG, PNG, WebP or GIF images.');
  STATE.running=true;STATE.stopRequested=false;STATE.stopReason='';STATE.progress=1;
  const startedAt=Date.now();
  const traceId=crypto.randomUUID();
  const diagnosticEvents=[];
  let latestStatus=null,helperEventCount=0;
  const nativeRefs=[];
  const emitQid=(step,detail={})=>{
    const event=FlowDiagnostics.record(traceId,step,{projectId:flow?.projectId||null,model:params.model,aspect:params.aspect,...detail});
    diagnosticEvents.push(event);
    return event;
  };
  const saveQidDiagnostics=code=>FlowDiagnostics.save({traceId,time:new Date().toISOString(),kind:'qid_video',projectId:flow?.projectId||null,code,model:params.model,aspect:params.aspect,promptCharacters:params.prompt.length,expected:nativeRefs.map(ref=>({mediaId:ref.mediaId,fileName:ref.fileName,role:ref.role})),clicked,submitted,stage:latestStatus?.stage||null,waitingFor:latestStatus?.waitingFor||null,helperVersion:latestStatus?.version||null,selectedModel:latestStatus?.selectedModel||null,availableModels:latestStatus?.availableModels||[],httpStatus:latestStatus?.httpStatus||null,events:diagnosticEvents});
  const item={index:1,type:'video',status:'preparing',error:null};
  broadcastQueue([item]);setProgress(1);setStatus('Preparing Qid video…');
  FlowRequestGuard.resume();
  let flow=null,clicked=false,submitted=false,helperStarted=false;
  const jobId=makeFlowId();
  const call=async(method,value)=>{
    const args=value===undefined?[method]:[method,value];
    const result=await chrome.scripting.executeScript({target:{tabId:flow.tabId},world:'MAIN',func:(method,value)=>window.GucFlowVideoNative?.[method]?.(value),args});
    return result?.[0]?.result;
  };
  try {
    flow=await getDirectFlowContext();
    item.projectUrl=`https://flow.google.com/u/${flow.accountIndex||'0'}/project/${encodeURIComponent(flow.projectId)}`;
    emitQid('qid_started',{referenceCount:refs.length,promptCharacters:params.prompt.length});
    await saveQidDiagnostics('FLOW_VIDEO_IN_PROGRESS');
    setStatus('Uploading selected Qid reference images…');
    for(let i=0;i<refs.length;i++){
      await FlowRequestGuard.ready();
      const ref=refs[i],safeName=flowReferenceFileName(ref,`qid-reference-${i+1}`);
      const mediaId=await uploadReferenceUntilSuccess(flow,ref.dataUrl,safeName,`Qid ${ref.role||'reference'} image`);
      if(!mediaId)throw Object.assign(Error('Qid reference upload stopped before confirmation.'),{code:'FLOW_UPLOAD_FAILED'});
      nativeRefs.push({mediaId,fileName:flow.referenceFiles?.[mediaId]||safeName,role:String(ref.role||'reference')});
      emitQid('qid_reference_uploaded',{referenceIndex:i+1,mediaId,fileName:flow.referenceFiles?.[mediaId]||safeName,role:String(ref.role||'reference')});
      await saveQidDiagnostics('FLOW_VIDEO_IN_PROGRESS');
    }
    if(refs.length){
      await chrome.tabs.reload(flow.tabId);
      const until=Date.now()+45000;
      while(Date.now()<until){await FlowRequestGuard.ready();const tab=await chrome.tabs.get(flow.tabId);if(tab.status==='complete')break;await sleep(250);}
      await ensureFlowProjectPage(flow.tabId,flow.projectId);
    }
    await chrome.scripting.executeScript({target:{tabId:flow.tabId},world:'MAIN',files:['content_flow_video.js']});
    const version=await call('version');
    if(version!=='1.0.5')throw Error('Qid Flow video helper did not load.');
    const begun=await call('begin',{id:jobId,projectId:flow.projectId,prompt:params.prompt,model:params.model,aspect:params.aspect,references:nativeRefs});
    if(!begun?.ok)throw Error(begun?.error||'Could not prepare Flow video composer.');
    helperStarted=true;
    emitQid('qid_composer_preparing',{helperVersion:version,referenceCount:nativeRefs.length});
    await saveQidDiagnostics('FLOW_VIDEO_IN_PROGRESS');
    setStatus('Preparing Flow video composer and checking exact reference attachments…');
    const deadline=Date.now()+8*60*1000;let status=null;
    while(Date.now()<deadline){
      await FlowRequestGuard.ready();
      status=await call('status',jobId);
      if(!status)throw Error('Flow video composer page restarted before confirmation.');
      latestStatus=status;
      const helperEvents=Array.isArray(status.events)?status.events:[];
      if(helperEvents.length>helperEventCount){diagnosticEvents.push(...helperEvents.slice(helperEventCount));helperEventCount=helperEvents.length;await saveQidDiagnostics(status.stage==='failed'?(status.code||'FLOW_VIDEO_FAILED'):'FLOW_VIDEO_IN_PROGRESS');}
      clicked=clicked||status.clicked;submitted=submitted||status.submitted;
      if(status.stage==='failed')throw Object.assign(Error(status.error||'Flow video preparation failed.'),{code:status.code,notSubmitted:!status.clicked,noRetry:status.code==='FLOW_VIDEO_MODEL_UNAVAILABLE'||status.code==='FLOW_REFERENCE_MISMATCH'});
      if(status.stage==='ready'){
        await FlowRequestGuard.admit('VIDEO_GENERATION');
        let sent;
        try {sent=await call('submit',jobId);}
        catch(error) {clicked=true;throw Object.assign(error,{code:'FLOW_VIDEO_OUTCOME_UNKNOWN'});}
        const afterSubmit=await call('status',jobId).catch(()=>null);
        if(afterSubmit){
          latestStatus=afterSubmit;
          const submitEvents=Array.isArray(afterSubmit.events)?afterSubmit.events:[];
          if(submitEvents.length>helperEventCount){diagnosticEvents.push(...submitEvents.slice(helperEventCount));helperEventCount=submitEvents.length;}
        }
        clicked=clicked||Boolean(afterSubmit?.clicked);
        submitted=submitted||Boolean(afterSubmit?.submitted);
        emitQid('qid_generate_clicked',{clicked,submitted,selectedModel:afterSubmit?.selectedModel||status.selectedModel||null});
        await saveQidDiagnostics('FLOW_VIDEO_IN_PROGRESS');
        if(!sent?.ok)throw Object.assign(Error(sent?.error||'Flow did not acknowledge the video Generate action.'),{code:clicked?'FLOW_VIDEO_OUTCOME_UNKNOWN':'FLOW_VIDEO_NOT_SUBMITTED',notSubmitted:!clicked});
      }
      if(status.stage==='done'){
        const url=String(status.videoUrl||'');
        if(!/^https:\/\//.test(url)||!/(^|\.)flow-content\.google$|(^|\.)googleusercontent\.com$|(^|\.)googleapis\.com$|(^|\.)google\.com$/.test(new URL(url).hostname))throw Error('Flow generated a video, but its URL was not a recognized Google media URL. Open the Flow project to view it.');
        item.videoUrl=url;item.duration=status.duration;item.status='done';item.model=status.availableModels?.includes(status.selectedModel)?status.selectedModel:undefined;
        emitQid('qid_generation_confirmed',{selectedModel:status.selectedModel||null,duration:status.duration||null,submitted:status.submitted});
        broadcastQueue([item]);setProgress(100);setStatus('Qid video generated.');log(`Qid video confirmed in Flow project ${flow.projectId}.`,'success');return;
      }
      setProgress(status.stage==='processing'?70:Math.min(60,5+Math.round((Date.now()-startedAt)/8000)));
      setStatus(status.stage==='processing'?'Flow accepted the video request and is rendering…':`Flow Qid setup: ${status.waitingFor||status.stage}…`);
      await sleep(350);
    }
    throw Object.assign(Error('Qid video did not finish within 8 minutes. Inspect the Flow project before retrying.'),{code:clicked?'FLOW_VIDEO_OUTCOME_UNKNOWN':'FLOW_VIDEO_NOT_SUBMITTED'});
  }catch(error){
    await FlowRequestGuard.rejected(error);
    item.status=clicked&&!/rejected|permission|quota|unavailable/i.test(error.message)?'outcome_unknown':'failed';
    item.error=error.message;item.submitted=submitted;item.projectUrl=item.projectUrl|| (flow?.projectId?`https://flow.google.com/u/${flow.accountIndex||'0'}/project/${encodeURIComponent(flow.projectId)}`:undefined);
    item.errorCode=error.code||'FLOW_VIDEO_FAILED';
    emitQid('qid_failed',{code:error.code||'FLOW_VIDEO_FAILED',message:error.message,stage:latestStatus?.stage||null,waitingFor:latestStatus?.waitingFor||null,clicked,submitted,helperVersion:latestStatus?.version||null});
    broadcastQueue([item]);setStatus(item.status==='outcome_unknown'?'Video outcome unknown — inspect Flow before retrying.':'Qid video failed.');log(`Qid video ${item.status}: ${error.message}`,'error');
  }finally{
    await saveQidDiagnostics(item.status==='done'?'FLOW_VIDEO_CONFIRMED':item.errorCode||'FLOW_VIDEO_INCOMPLETE');
    if(helperStarted&&!clicked)await call('cancel',jobId).catch(()=>{});
    if(helperStarted&&(item.status==='done'||item.status==='failed'))await call('forget',jobId).catch(()=>{});
    STATE.running=false;setProgress(item.status==='done'?100:0);chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
  }
}


async function ensureFlowProjectPage(tabId, projectId) {
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url || tab.pendingUrl);
  if (url.origin !== "https://flow.google.com") {
    throw new Error("Open the signed-in Flow tab before uploading references.");
  }
  const currentProject = url.pathname.match(/\/project\/([^/]+)/)?.[1];
  if (currentProject === projectId && tab.status === "complete") return;
  const accountIndex = url.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] || "0";
  if(currentProject !== projectId)await chrome.tabs.update(tabId, {
    url: `${url.origin}/u/${accountIndex}/project/${encodeURIComponent(projectId)}`
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if(typeof STATE!=="undefined"&&STATE.stopRequested)throw Object.assign(Error("Generation stopped."),{code:"FLOW_STOPPED",noRetry:true});
    const updated = await chrome.tabs.get(tabId);
    if (updated.status === "complete" &&
        new URL(updated.url).pathname.match(/\/project\/([^/]+)/)?.[1] === projectId) return;
    await sleep(250);
  }
  throw new Error("Flow project did not finish opening. Open the project in Flow and retry.");
}

async function openFreshFlowProjectTab(authTabId, projectId) {
  const authTab = await chrome.tabs.get(authTabId);
  const authUrl = new URL(authTab.url || authTab.pendingUrl);
  if (authUrl.origin !== "https://flow.google.com") {
    throw new Error("Open the signed-in Flow tab before creating a project.");
  }
  const accountIndex = authUrl.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] || "0";
  const editorUrl = `${authUrl.origin}/u/${accountIndex}/project/${encodeURIComponent(projectId)}`;
  const editorTab = await chrome.tabs.create({url:editorUrl,active:false});
  if (!editorTab?.id) throw new Error("Could not open the new Flow project tab.");
  await chrome.tabs.update(editorTab.id,{autoDiscardable:false}).catch(() => {});
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const current = await chrome.tabs.get(editorTab.id);
    if (current.status === "complete" && current.url === editorUrl) return editorTab.id;
    await sleep(250);
  }
  throw new Error("The new Flow project tab did not finish loading. The tab was left open for inspection.");
}

async function runGeneration(params) {
  if(params._storyChapter&&STATE.stopRequested)return;
  if (STATE.running) { log("Already running."); return; }
  if(!params._storyChapter)STATE.stopRequested = false;
  STATE.running = true;
  FlowRequestGuard.resume();
  await FlowRequestGuard.ready();
  STATE.editorTabId = null;
  STATE.stopReason = "";
  STATE.retryHandler = null;

  const workflowMode = params.type === 'bb_direct_image_generate' ? 'direct-image' : (params.workflowMode || 'classic');
  if (!["classic","subject-flow","story","direct-image"].includes(workflowMode)) throw Error('Unknown image workflow. Reload Guc guy and reopen the panel.');
  const directImage = workflowMode === "direct-image" ? DirectImage.validate(params) : null;
  if (directImage) params = DirectImage.normalize(params,directImage);
  const figureReference=params.figureReference?FigureReference.record(params.figureReference):null;
  if(params.figureReference&&!figureReference)throw Error('Choose a valid figure reference image under 8 MB.');
  const storyJob = workflowMode === 'story' ? params._storyChapter : null;
  const rawShortPrompt = String(params.shortPrompt || "").trim().slice(0, workflowMode === "story" ? 30000 : directImage ? 6000 : 800);
  const rawSystemInstruction = String(params.systemInstruction || "").trim().slice(0, 5000);
  const shortPrompt = workflowMode === "subject-flow" ? SubjectFlowDirection.prepare(rawShortPrompt) : rawShortPrompt;
  const systemInstruction = workflowMode === "subject-flow" ? SubjectFlowDirection.prepare(rawSystemInstruction) : rawSystemInstruction;
  
  let customBodyTuning = "";
  if (params.tuneHeight) customBodyTuning += "Height: " + params.tuneHeight + ". ";
  if (params.tuneWeight) customBodyTuning += "Weight: " + params.tuneWeight + ". ";
  if (params.tuneBust) customBodyTuning += "Bust/Chest: " + params.tuneBust + ". ";
  if (params.tuneWaist) customBodyTuning += "Waist: " + params.tuneWaist + ". ";
  if (params.tuneHips) customBodyTuning += "Hips/Thighs: " + params.tuneHips + ". ";
  if (params.tuneNavel) customBodyTuning += "Belly/Navel: " + params.tuneNavel + ". ";
  if (customBodyTuning) customBodyTuning = "ABSOLUTE HIGHEST PRIORITY BODY TUNING OVERRIDE (Must strictly follow these measurements/traits): " + customBodyTuning.trim() + "\n\n";

  if(figureReference)customBodyTuning='';
  const physicalDetails = figureReference?'':String(params.physicalDetails || "").trim().slice(0, 1200);

  const storyCharacters = workflowMode === "story" && Array.isArray(params.storyCharacters)
    ? params.storyCharacters.map((character,index) => ({
        id:String(character.id || `character-${index + 1}`),
        name:String(character.name || "").trim().slice(0,50),
        aliases:String(character.aliases || "").slice(0,500),
        canonNotes:String(character.canonNotes || "").slice(0,2000),
        height:String(character.height || "").trim().slice(0,120),
        physique:String(character.physique || "").trim().slice(0,700),
        outfitNotes:String(character.outfitNotes || "").trim().slice(0,500),
        subjects:(Array.isArray(character.subjects) ? character.subjects : []).slice(0,3),
        outfits:(Array.isArray(character.outfits) ? character.outfits : []).slice(0,2)
      }))
    : [];
  const storyFigureCharacter=workflowMode==='story'&&figureReference
    ? (params.storyFigureCharacterId?storyCharacters.find(character=>character.id===params.storyFigureCharacterId):storyCharacters[0]):null;
  if(workflowMode==='story'&&figureReference&&!storyFigureCharacter)throw Error('Select a Story character for the figure reference.');
  // This mapped cast is local to the run; saved written notes are retained.
  if(storyFigureCharacter)storyFigureCharacter.physique=''; // Figure controls build; retain entered stature.
  const subjects = workflowMode === "story"
    ? storyCharacters.flatMap((character) => character.subjects.map((image) => ({ ...image,characterId:character.id,characterName:character.name })))
    : Array.isArray(params.subjects) ? params.subjects.slice(0,8) : (params.face ? [params.face] : []);
  const outfits = workflowMode === "story"
    ? storyCharacters.flatMap((character) => character.outfits.map((image) => ({ ...image,characterId:character.id,characterName:character.name })))
    : Array.isArray(params.outfits) ? params.outfits.slice(0,8) : (params.outfit ? [params.outfit] : []);
  const knowledge = workflowMode === "story" ? [] : Array.isArray(params.knowledge) ? params.knowledge.slice(0,8) : (params.location ? [params.location] : []);
  // Classic callers may send an empty generic list beside the selected location.
  if (workflowMode === "classic" && !knowledge.length && params.location) knowledge.push(params.location);
  const quality = workflowMode === "story" ? [] : Array.isArray(params.quality) ? params.quality.slice(0,8) : [];
  const poseReference=PoseReference.record(params.poseReference);
  if(params.poseReference&&!poseReference)throw Error('The pose reference is invalid. Choose a supported image under 8 MB.');
  const hasPoseReference=Boolean(poseReference);
  const posePlannerLock=hasPoseReference?PoseReference.instruction({planner:true,story:workflowMode==='story'}):'';
  const requestedStoryPanelCount = workflowMode === "story" ? StoryEngine.requestedPanelCount(shortPrompt,60) : null;
  let imageCount = workflowMode === "story"
    ? (requestedStoryPanelCount || 60)
    : Math.max(1,Math.min(20,Number.parseInt(params.imageCount,10) || 5));
  const minimumStoryPanels = workflowMode === "story" ? (requestedStoryPanelCount || StoryEngine.minimumPanelCount(shortPrompt,imageCount)) : 0;
  const aspectRatio = workflowMode === "story" ? (ALLOWED_ASPECT_RATIOS.has(params.aspectRatio) ? params.aspectRatio : "IMAGE_ASPECT_RATIO_LANDSCAPE") : ALLOWED_ASPECT_RATIOS.has(params.aspectRatio) ? params.aspectRatio : "IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR";
  // Story mode defaults to sequential for continuity, but supports a bounded
  // parallel pass once scene anchor plates are available.
  const generationMode = params.generationMode === "sequential" ? "sequential" : "parallel";
  const storyBgStyle = workflowMode === "story" ? (params.storyBgStyle || "crime-noir") : "real";
  const storyTextOverlays = workflowMode === "story" && params.storyTextOverlays === true;
  const inImageStoryLettering = storyTextOverlays;
  const storyInputMode = workflowMode === "story" && params.storyInputMode === "novel" ? "novel" : "brief";
  const legacyStoryStyleReference = params.storyStyleReference && typeof params.storyStyleReference.dataUrl === "string" ? params.storyStyleReference : null;
  const storyStyleReferences = workflowMode === "story" && params.storyBgStyle === "webtoon"
    ? (Array.isArray(params.storyStyleReferences) ? params.storyStyleReferences : legacyStoryStyleReference ? [legacyStoryStyleReference] : []).filter(item => typeof item?.dataUrl === "string" && item.dataUrl.startsWith("data:image/")).slice(0,4)
    : [];
  if(workflowMode==='story'&&storyBgStyle==='webtoon'&&!storyStyleReferences.length) {
    for(const name of ['webtoon-style-atmosphere.jpg','webtoon-style-acting.jpg','webtoon-style-interior.jpg','webtoon-style-action.jpg']) {
      const response=await fetch(chrome.runtime.getURL(`assets/${name}`));
      if(!response.ok)throw Error(`Bundled Webtoon style sample could not load: ${name}`);
      storyStyleReferences.push({name,dataUrl:await blobToDataUrl(await response.blob())});
    }
  }
  const telegramEnabled = params.telegramEnabled === true;
  const tgBotToken = String(params.tgBotToken || "").trim();
  const tgChatId = String(params.tgChatId || "").trim();
  const tgSendAsDoc = params.tgSendAsDoc === true;
  let resolvedTgChatId = tgChatId;
  const generationEngine = workflowMode === "story" ? "gemini" : params.generationEngine === "direct" ? "direct" : "gemini";
  let flowModel = ALLOWED_MODELS.has(params.imageModel) ? params.imageModel : FLOW_IMAGE_MODEL;
  const classicFigureRule = workflowMode === "classic" ? (figureReference?FigureReference.planner():ClassicDirection.figure({physical:physicalDetails,tuning:customBodyTuning})) : "";
  const subjectFlowFigureRule = workflowMode === "subject-flow" ? (figureReference?FigureReference.planner():SubjectFlowDirection.figure({physical:physicalDetails,tuning:customBodyTuning})) : "";
  let classicHistory = {};
  const classicShots = [];

  if (!shortPrompt) throw new Error("A short prompt is required.");
  if (workflowMode === "story" && !storyCharacters.length) throw new Error("At least one named story character is required.");
  if (workflowMode === "story" && storyCharacters.some((character) => !character.name || !character.subjects.length || !character.outfits.length)) throw new Error("Every story character needs a name, identity image, and outfit image.");
  if (workflowMode === "story" && new Set(storyCharacters.map((character) => character.name.toLocaleLowerCase())).size !== storyCharacters.length) throw new Error("Every story character needs a unique name.");
  if (!directImage && !subjects.length) throw new Error("At least one subject reference is required.");
  if (!directImage && !outfits.length) throw new Error("At least one outfit reference is required.");
  if (workflowMode === "subject-flow" && !systemInstruction) throw new Error("A Subject Flow system instruction is required.");

  if (workflowMode === "classic") {
    const saved = await chrome.storage.local.get('bb_classic_shot_history');
    classicHistory = saved.bb_classic_shot_history || {};
    classicShots.push(...ClassicDirection.shots(imageCount,{target:shortPrompt,hasEnvironment:knowledge.length>0,hasPoseReference,previous:classicHistory}));
    classicHistory = ClassicDirection.remember(classicHistory,classicShots);
    await chrome.storage.local.set({bb_classic_shot_history:classicHistory});
  }

  setStatus("Connecting to Google Flow...");
  // Keep the signed-in tab for auth, but create a clean project editor in its
  // own inactive tab so every run starts fresh and does not steal focus.
  const flow = await withAutoRetry('Connecting to Flow',()=>getDirectFlowContext());
  STATE.editorTabId = flow.tabId;
  log(`Opened Flow project ${flow.projectId} in background tab ${flow.tabId}. Extension ${chrome.runtime.getManifest?.().version || 'version unavailable'}.`);
  log(`Run inputs received: ${subjects.length} subject, ${outfits.length} outfit, ${knowledge.length} location/environment, ${quality.length} quality references; workflow=${workflowMode}; engine=${generationEngine}.`);
  const projectIdText = flow.projectId ? `Created project ${flow.projectId.slice(0, 8)} automatically...` : `Proceeding without a project...`;
  log(`Google account connected. ${projectIdText}`);
  log(`Using ${MODEL_DISPLAY_NAMES[flowModel] || flowModel}, ${aspectRatio}, ${workflowMode === "story" ? "Gemini-decided story length" : `${imageCount} images`}, ${generationEngine} prompts, ${generationMode} mode.`);
  if (telegramEnabled && tgBotToken && tgChatId) {
    try {
      resolvedTgChatId = await resolveTelegramChatId(tgBotToken, tgChatId);
      log(`✈️ Telegram delivery is ON: images will send to ${resolvedTgChatId}${tgSendAsDoc ? " (uncompressed document)" : ""}.`);
    } catch (e) {
      log(`✈️ Telegram delivery is ON: images will send to ${tgChatId}${tgSendAsDoc ? " (uncompressed document)" : ""}.`);
    }
  }
  log(directImage ? `Direct Image: ${directImage.mode}, ${directImage.style.label}; user prompt is used directly.` : workflowMode === "story" ? `Story Studio: Gemini is planning ${storyCharacters.length} named character${storyCharacters.length === 1 ? "" : "s"} into a connected cinematic sequence.` : workflowMode === "subject-flow" ? "Subject Flow mode: custom base instruction and visual knowledge are active." : (physicalDetails || customBodyTuning ? "Custom physical details/tuning lock is active and has highest body-shape priority." : "Classic thick hourglass base is active without invented measurements."));
  if(workflowMode==="story") log(storyTextOverlays?"In-image Story lettering is ON: narration cards and speech balloons composed inside full-bleed artwork; no added text bands.":"Story lettering is OFF; the image model will keep panels text-free.");

  const storyCastBible = storyCharacters.map((character) => ({
    name:character.name,
    aliases:character.aliases,
    canonNotes:character.canonNotes,
    ...(character.height ? {height:character.height} : {}),
    ...(character.physique ? {physique:character.physique} : {}),
    outfitNotes:character.outfitNotes || "preserve the canonical garments shown in outfit references",
    identityReferenceCount:character.subjects.length,
    outfitReferenceCount:character.outfits.length
  }));

  // Build Gemini Prompt to generate an array of image prompts
  let geminiPrompt = directImage ? "" : workflowMode === "story"
    ? StoryEngine.prompt(shortPrompt, storyCastBible, imageCount, storyBgStyle, storyTextOverlays, storyInputMode, requestedStoryPanelCount, minimumStoryPanels)
    : workflowMode === "subject-flow"
    ? SubjectFlowDirection.planner({
        system: systemInstruction,
        target: shortPrompt,
        figure: subjectFlowFigureRule,
        count: imageCount,
        hasEnvironment: knowledge.length > 0,
        environmentCount: knowledge.length,
        poseLock:posePlannerLock
      })
    : ClassicDirection.planner({target:shortPrompt,figureRule:classicFigureRule,variations:classicShots,count:imageCount,poseLock:posePlannerLock});
  if(workflowMode==='story'&&hasPoseReference)geminiPrompt += `\n\n${posePlannerLock}`;
  if(storyFigureCharacter)geminiPrompt += '\n\n'+FigureReference.planner(storyFigureCharacter.name,storyFigureCharacter.height);
  if(workflowMode==='story') geminiPrompt += `\nLOCKED DESIGN BIBLE FROM PREVIOUS CHAPTERS: ${JSON.stringify(params.storyDesignBible||{})}. Keep all established designs. Return designBible as an object keyed by exact cast or NPC name, with concise visual appearance strings drawn only from explicit chapter facts and the supplied reference bible. Never invent an unspecified trait; say 'use original reference'. Resolve aliases to the registered name. Include persistent NPC designs so they do not change between chapters.`;
  let plan;
  if (storyJob?.plan) {
    plan=storyJob.plan; imageCount=plan.panels.length;
    log('Resuming the saved storyboard without replanning or regenerating completed panels.');
  } else if (generationEngine === "direct" || (hasPoseReference && workflowMode !== "story")) {
    setStatus(directImage?"Using your prompt and selected style…":hasPoseReference?"Using the exact pose reference…":"Using direct candid prompt…");
    log(hasPoseReference ? `Direct mode: preserving the exact selected pose and camera geometry across ${imageCount} images.` : workflowMode === "subject-flow"
      ? `Direct mode: generating ${imageCount} varied unposed candid blueprints across ${knowledge.length || 1} room(s).`
      : `Direct mode: using the exact user prompt for all ${imageCount} generations.`);
    plan = workflowMode === "subject-flow"
      ? SubjectFlowDirection.directPlan({ count: imageCount, target: shortPrompt, system: systemInstruction, environmentCount: knowledge.length })
      : { prompts: Array.from({ length: imageCount }, () => shortPrompt) };
  } else {
    setStatus(workflowMode === "story" ? "Gemini is writing the story and storyboard…" : `Gemini is creating ${imageCount} variations…`);
    log(workflowMode === "story" ? (requestedStoryPanelCount?`Opening Gemini to build the requested ${requestedStoryPanelCount}-panel storyboard...`:`Opening Gemini to build a complete storyboard of up to ${imageCount} panels (at least ${minimumStoryPanels} for this story)...`) : `Opening Gemini to expand the short prompt into ${imageCount} scenes...`);
    let planText,cachedDraft=storyJob?.draftPlan;
    for(let planningAttempt=1;planningAttempt<=2;planningAttempt++) {
    try {
      const plannerReferences = hasPoseReference
        ? [{dataUrl:poseReference.dataUrl,name:'pose-camera-reference'+(poseReference.name.match(/\.[a-z0-9]+$/i)?.[0]||'.png')}]
        : workflowMode === "subject-flow"
        ? [{ path: "assets/subject-flow-reference-review.jpg", name: "subject-flow-reference-review.jpg" }]
        : [];
      if (plannerReferences.length) {
        log(hasPoseReference?"Attaching the exact user pose/camera reference to Gemini; default pose examples are disabled.":"Subject Flow: attaching candid home reference review collage (57 unposed photos) to Gemini planner.");
      }
      if(cachedDraft){planText=JSON.stringify(cachedDraft);cachedDraft=null;log('Rechecking the saved Gemini response without waiting for a new chapter plan.');}
      else planText = await askGeminiWithRetry({
        type: "ASK_TEXT",
        prompt: geminiPrompt,
        referenceImages: plannerReferences,
        timeoutMs: GEMINI_PLANNING_TIMEOUT_MS,
        retryAttempts:workflowMode==='story'?1:2,
      });

    if (STATE.stopRequested) {
      log("Stopped during Gemini planning.");
      STATE.running = false;
      chrome.runtime.sendMessage({ type: "bb_done" }).catch(() => {});
      return;
    }

    log(workflowMode === "story" ? "Received Gemini storyboard. Validating cast, shot order, and continuity..." : `Received Gemini plan. Validating ${imageCount} prompts...`);
    try {
      let parsedPlan = parseGeminiPlanJson(planText);
      planText = parsedPlan.source;
      plan = parsedPlan.value;
      if(storyJob)await StoryJobs.saveDraft(storyJob,plan);
      if (parsedPlan.repaired) log("Repaired minor Gemini JSON formatting automatically.");
      if (workflowMode === "story") {
        const returnedPanelCount=Array.isArray(plan?.panels)?plan.panels.length:0;
        const panelCountMismatch=requestedStoryPanelCount
          ? returnedPanelCount!==requestedStoryPanelCount
          : returnedPanelCount<minimumStoryPanels;
        if(panelCountMismatch){
          const requiredCount=requestedStoryPanelCount||minimumStoryPanels;
          log(`Gemini returned ${returnedPanelCount} panels; requesting a continuity-safe correction to ${requestedStoryPanelCount?`exactly ${requestedStoryPanelCount}`:`at least ${minimumStoryPanels}`} panels before generation.`);
            planText=await askGeminiWithRetry({
              type:"ASK_TEXT",
              prompt:StoryEngine.panelCountCorrectionPrompt(geminiPrompt,plan,requiredCount,requestedStoryPanelCount),
              timeoutMs:GEMINI_PLANNING_TIMEOUT_MS,
              retryAttempts:1,
            });
          parsedPlan=parseGeminiPlanJson(planText);
          planText=parsedPlan.source;
          plan=parsedPlan.value;
          if(storyJob)await StoryJobs.saveDraft(storyJob,plan);
          log(`Gemini count correction returned ${Array.isArray(plan?.panels)?plan.panels.length:0} panels.`);
        }
        plan = StoryEngine.validate(plan,storyCharacters,imageCount,storyTextOverlays,minimumStoryPanels,requestedStoryPanelCount,hasPoseReference);
        imageCount = plan.panels.length;
        const storyOutput = { title:plan.title,chapter:plan.chapter,panelCount:imageCount,panels:plan.panels.map(panel=>({shot:panel.shot,beat:panel.beat,location:panel.location,characters:panel.characters,narration:panel.narration,dialogue:panel.dialogue})),createdAt:Date.now() };
        await chrome.storage.local.set({ bb_last_story_output:storyOutput });
        chrome.runtime.sendMessage({ type:"bb_story_plan",story:storyOutput }).catch(() => {});
      } else if (!Array.isArray(plan.prompts) || plan.prompts.length !== imageCount || plan.prompts.some((prompt) => typeof prompt !== "string" || !prompt.trim())) {
        throw new Error(`Expected exactly ${imageCount} non-empty prompt strings.`);
      }
    } catch (err) {
      throw new Error("Gemini returned an invalid prompt plan: " + err.message);
    }
    break;
    } catch(error) {
      if(planningAttempt>=2 || STATE.stopRequested || /sign.in|log.in|quota|verification/i.test(error.message))throw error;
      log(`Planner recovery ${planningAttempt}/2: ${error.message}`);
      geminiPrompt += `\nYour previous attempt failed validation: ${String(error.message).slice(0,500)}. Correct the schema and return the complete valid JSON storyboard.`;
      await interruptibleWait(2000*planningAttempt);
    }
    }
  }

  if(storyJob)await StoryJobs.savePlan(storyJob,plan);

  if (!plan || !plan.prompts || plan.prompts.length === 0) {
    throw new Error("Generated plan was empty.");
  }

  log(workflowMode === "story" ? `Storyboard ready: ${plan.title || "Untitled story"} — ${plan.prompts.length} panels.` : `Generated ${plan.prompts.length} prompt variations.`);
  setProgress(10);

  // Direct Image uses its own source, never another section's references.
  let directSourceMediaId = null;
  if (directImage?.source && !STATE.stopRequested) {
    setStatus("Uploading your source image…");
    directSourceMediaId = await uploadReferenceUntilSuccess(flow,directImage.source.dataUrl,flowReferenceFileName(directImage.source,"direct-source"),"Direct Image source");
    if (!directSourceMediaId && !STATE.stopRequested) throw Error("Source image upload failed. Nothing was generated; try the upload again.");
  }
  // Upload References to Flow
  setStatus(directImage ? "Preparing image generation…" : "Uploading references to Google Flow...");
  const subjectMediaIds = [];
  const outfitMediaIds = [];
  const subjectMediaEntries = [];
  const outfitMediaEntries = [];
  const knowledgeMediaIds = [];
  const qualityMediaIds = [];
  const storyStyleMediaIds = [];
  let poseMediaId=null,figureMediaId=null;
  const charactersInStoryboard = workflowMode === "story"
    ? new Set(plan.panels.flatMap((panel) => panel.characters || []))
    : null;
  if(figureReference&&(!storyFigureCharacter||charactersInStoryboard.has(storyFigureCharacter.name))){
    figureMediaId=await uploadReferenceUntilSuccess(flow,figureReference.dataUrl,flowReferenceFileName(figureReference,'figure'),'Figure: '+figureReference.name);
    if(!figureMediaId)throw Error('Figure reference upload failed. Nothing was generated; retry the figure upload.');
    log('Figure reference uploaded; this image has highest body-shape priority.');
  }
  const subjectUploadQueue = workflowMode === "story"
    ? subjects.filter((entry) => charactersInStoryboard.has(entry.characterName))
    : subjects.slice(0,3);
  const outfitUploadQueue = workflowMode === "story"
    ? outfits.filter((entry) => charactersInStoryboard.has(entry.characterName))
    : outfits.slice(0,3);
  const knowledgeUploadQueue = workflowMode === "story" ? [] : knowledge.slice(0,6);
  const qualityUploadQueue = workflowMode === "story" ? [] : quality.slice(0,1);
  if (workflowMode !== "story" && (subjects.length + outfits.length + knowledge.length + quality.length
    > subjectUploadQueue.length + outfitUploadQueue.length + knowledgeUploadQueue.length + qualityUploadQueue.length)) {
    log("Upload optimization: keeping the first 3 identity views, first 3 outfit views, first 6 location views and first style view; unused extras are skipped to stay within Flow's reference budget and shorten setup.");
  }

  for (const s of subjectUploadQueue) {
    if (STATE.stopRequested) break;
    const mediaId = await uploadReferenceUntilSuccess(flow, s.dataUrl, flowReferenceFileName(s,"subject"), `Subject: ${s.name}`);
    if (mediaId) {
      subjectMediaIds.push(mediaId);
      subjectMediaEntries.push({ mediaId,characterId:s.characterId || null,characterName:s.characterName || null });
    }
  }
  for (const o of outfitUploadQueue) {
    if (STATE.stopRequested) break;
    const mediaId = await uploadReferenceUntilSuccess(flow, o.dataUrl, flowReferenceFileName(o,"outfit"), `Outfit: ${o.name}`);
    if (mediaId) {
      outfitMediaIds.push(mediaId);
      outfitMediaEntries.push({ mediaId,characterId:o.characterId || null,characterName:o.characterName || null });
    }
  }
  for (const k of knowledgeUploadQueue) {
    if (STATE.stopRequested) break;
    const mediaId = await uploadReferenceUntilSuccess(flow, k.dataUrl, flowReferenceFileName(k,"knowledge"), `${workflowMode === "classic" ? "Location" : "Knowledge"}: ${k.name}`);
    if (mediaId) knowledgeMediaIds.push(mediaId);
  }
  for (const q of qualityUploadQueue) {
    if (STATE.stopRequested) break;
    const mediaId = await uploadReferenceUntilSuccess(flow, q.dataUrl, flowReferenceFileName(q,"quality"), `Quality: ${q.name}`);
    if (mediaId) qualityMediaIds.push(mediaId);
  }
  for (const [styleIndex,styleReference] of storyStyleReferences.entries()) {
    if (STATE.stopRequested) break;
    const styleMediaId = await uploadReferenceUntilSuccess(flow,styleReference.dataUrl,flowReferenceFileName(styleReference,`webtoon-style-${styleIndex+1}`),`Webtoon style reference ${styleIndex+1}`);
    if (!styleMediaId) throw new Error(`Webtoon style reference ${styleIndex+1} could not be uploaded. Nothing was generated; retry the style-reference upload.`);
    storyStyleMediaIds.push(styleMediaId);
  }
  if(poseReference) {
    poseMediaId=await uploadReferenceUntilSuccess(flow,poseReference.dataUrl,flowReferenceFileName(poseReference,'pose-camera'),'Pose / Camera: '+poseReference.name);
    if(!poseMediaId)throw Error('The pose/camera reference did not upload. Nothing was generated; retry the reference upload.');
    log('Exact pose/camera reference uploaded; random pose and camera variation disabled.');
  }
  if(storyStyleMediaIds.length)log(`Uploaded ${storyStyleMediaIds.length} Webtoon art-style reference image${storyStyleMediaIds.length===1?"":"s"}; the same style references will guide every Story panel.`);

  const missingRequiredSubjectRefs = subjectUploadQueue.length - subjectMediaEntries.length;
  const missingRequiredOutfitRefs = outfitUploadQueue.length - outfitMediaEntries.length;
  const missingRequiredLocationRefs = knowledgeUploadQueue.length - knowledgeMediaIds.length;
  const missingRequiredQualityRefs = qualityUploadQueue.length - qualityMediaIds.length;
  if (!STATE.stopRequested && (missingRequiredSubjectRefs || missingRequiredOutfitRefs || missingRequiredLocationRefs || missingRequiredQualityRefs)) {
    throw new Error(`Reference upload incomplete (${missingRequiredSubjectRefs} subject, ${missingRequiredOutfitRefs} outfit, ${missingRequiredLocationRefs} location, ${missingRequiredQualityRefs} quality). Nothing was generated; retry after the upload issue is resolved.`);
  }
  if (!STATE.stopRequested && knowledgeMediaIds.length) log(`Backend confirmed ${knowledgeMediaIds.length}/${knowledgeUploadQueue.length} location reference upload(s); media IDs are ready for attachment.`);

  if (STATE.stopRequested) {
    STATE.running = false;
      chrome.runtime.sendMessage({ type: "bb_done" }).catch(() => {});
    return;
  }

  // Generate Images
  const queueState = [];
  const totalItems = plan.prompts.length;
  const subjectFlowVariationCues = workflowMode === "subject-flow"
    ? SubjectFlowDirection.createVariationSequence(totalItems,hasPoseReference?PoseReference.cue:"")
    : [];

  for (let i = 0; i < totalItems; i++) {
    const savedBlob=storyJob?.panels[i]?.status==='done'?await readExportBlob(storyJob.panels[i].blobKey):null;
    if(storyJob?.panels[i]?.status==='done'&&!savedBlob)await StoryJobs.checkpoint(storyJob,i,{status:'queued',error:'Saved image missing; recovering its media.'});
    queueState.push({
      index: i + 1,
      status: "queued",
      description: plan.prompts[i].slice(0, 80) + "...",
      ...(storyJob?{storyChapterId:storyJob.id}:{}),
      ...(savedBlob?{status:'done',previewUrl:await blobToDataUrl(await StoryRenderer.thumbnail(savedBlob))}:{}),
    });
  }
  broadcastQueue(queueState);

  let completedCount = queueState.filter(p=>p.status==='done').length;
  let telegramQueue = Promise.resolve();
  const storySceneAnchors = new Map();
  
  const generateImageAtIndex = async (i,{ manualRetry = false } = {}) => {
    if (STATE.stopRequested) return;
    if (!Number.isInteger(i) || i < 0 || i >= totalItems) throw new Error("That image is no longer available to retry.");
    if(!manualRetry && queueState[i].status==='done')return;
    if(storyJob?.panels[i]?.status==='outcome_unknown') {
      queueState[i].status='failed';queueState[i].error='Previous request was unconfirmed. Use Retry unconfirmed panels to explicitly resubmit.';broadcastQueue(queueState);return;
    }
    const storyPanel = workflowMode === "story" ? plan.panels[i] : null;
    if (manualRetry) {
      const retryKey = crypto.randomUUID();
      if(workflowMode === 'classic' && !queueState[i].generation) {
        classicShots[i] = ClassicDirection.shots(1,{target:shortPrompt,hasEnvironment:knowledge.length>0,hasPoseReference,previous:classicHistory})[0];
        classicHistory = ClassicDirection.remember(classicHistory,[classicShots[i]]);
        await chrome.storage.local.set({bb_classic_shot_history:classicHistory});
      }
      if (storyPanel) {
        if (/PUBLIC_ERROR_UNSAFE_GENERATION|POLICY_VIOLATION/i.test(String(queueState[i]?.error||""))) {
          storyPanel.safetyRestage = true;
          log(`Panel ${i + 1} was safety-rejected; retrying the same story beat with a non-graphic, policy-respecting visual treatment.`);
        }
        storyPanel.retryKey = retryKey;
      }
      else plan.prompts[i] = `MANUAL RETRY VARIATION ${retryKey}: Keep the original request and all reference locks, but generate a genuinely fresh composition rather than duplicating the rejected result.\n\n${plan.prompts[i]}`;
    }
    const panelCharacterNames = new Set(storyPanel?.characters || []);
    const activeStoryCharacters = storyCharacters.filter((character) => panelCharacterNames.has(character.name));
    const selectPerCharacter = (entries,limit) => {
      const counts = new Map();
      return entries.filter((entry) => {
        const key = entry.characterName || "__single__";
        const used = counts.get(key) || 0;
        if (used >= limit) return false;
        counts.set(key,used + 1);
        return true;
      });
    };
    // Two-character shots are the most drift-prone. Keep all three available
    // identity angles per character; with one outfit reference each this remains
    // within Flow's nine-reference budget.
    const identityViewsPerCharacter = activeStoryCharacters.length <= 2 ? 3 : 1;
    const outfitViewsPerCharacter = activeStoryCharacters.length <= 1 ? 2 : 1;
    const activeSubjectEntries = workflowMode === "story"
      ? selectPerCharacter(subjectMediaEntries.filter((entry) => panelCharacterNames.has(entry.characterName)),identityViewsPerCharacter)
      : subjectMediaEntries.slice(0,3);
    const activeOutfitEntries = workflowMode === "story"
      ? selectPerCharacter(outfitMediaEntries.filter((entry) => panelCharacterNames.has(entry.characterName)),outfitViewsPerCharacter)
      : workflowMode === "classic" ? outfitMediaEntries.slice(0,1) : outfitMediaEntries.slice(0,3);
    // Flow accepts at most nine reference inputs. Reserve space for the exact
    // face and canonical outfit first, then allow only a small amount of
    // environment/style context so those secondary images cannot crowd them out.
    const activePoseMediaId=workflowMode==='story'&&!activeStoryCharacters.length?null:poseMediaId;
    const poseSlots=activePoseMediaId?1:0;
    const activeFigureMediaId=figureMediaId&&(workflowMode!=='story'||panelCharacterNames.has(storyFigureCharacter.name))?figureMediaId:null;
    const figureSlots=activeFigureMediaId?1:0;
    // Prefer figure/pose and one face+outfit per character over extra face angles.
    if(figureSlots){
      const trimExtra=entries=>{
        const index=entries.findLastIndex((entry,i)=>entries.slice(0,i).some(other=>(other.characterName||'subject')===(entry.characterName||'subject')));
        if(index<0)return false;entries.splice(index,1);return true;
      };
      while(activeSubjectEntries.length+activeOutfitEntries.length+poseSlots+figureSlots>9){
        if(!trimExtra(activeSubjectEntries)&&!trimExtra(activeOutfitEntries))break;
      }
    }
    const activeQualityMediaIds = workflowMode === "story" ? [] : qualityMediaIds.slice(0,Math.min(1,Math.max(0,9-poseSlots-figureSlots-activeSubjectEntries.length-activeOutfitEntries.length)));
    const assignedRoomIndex = knowledgeMediaIds.length > 0 ? (i % knowledgeMediaIds.length) : -1;
    const subjectFlowKnowledgeSlots = Math.max(0,9-poseSlots-figureSlots-activeSubjectEntries.length-activeOutfitEntries.length-activeQualityMediaIds.length);
    // Subject Flow keeps the same canonical Knowledge interior(s) attached to
    // every frame; rotating room references was causing Gemini's scene changes
    // to become literal room changes. Classic retains its existing per-image rotation.
    const activeKnowledgeMediaIds = workflowMode === "story" || assignedRoomIndex < 0 ? []
      : workflowMode === "subject-flow" ? knowledgeMediaIds.slice(0,subjectFlowKnowledgeSlots)
      : [knowledgeMediaIds[assignedRoomIndex]];
    if (workflowMode === "subject-flow" && knowledgeMediaIds.length) {
      log(`Image ${i + 1}: Keeping the same ${activeKnowledgeMediaIds.length} Knowledge interior reference${activeKnowledgeMediaIds.length===1?"":"s"} attached across the batch (${knowledgeMediaIds.length} uploaded; Flow limit is 9 total).`);
    }
    
    // In Story mode, keep each person's face and outfit references adjacent and
    // explicitly paired. This reduces cross-character wardrobe swaps.
    const imageInputs = [];
    if (directSourceMediaId) imageInputs.push({imageInputType:"IMAGE_INPUT_TYPE_REFERENCE",name:directSourceMediaId});
    let imageNumber = 1;
    const refMapLines = [];
    const storyReferenceAssignments = [];

    const anchoredCharacters = new Set();
    const addIdentityReference = (entry) => {
      const identityKey = entry.characterName || "subject";
      const isAnchor = !anchoredCharacters.has(identityKey);
      anchoredCharacters.add(identityKey);
      imageInputs.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: entry.mediaId });
      refMapLines.push(workflowMode === "story"
        ? `REFERENCE IMAGE ${imageNumber}: ${isAnchor ? "PRIMARY" : "SUPPLEMENTARY"} IDENTITY VIEW ONLY for the named character "${entry.characterName}". Preserve the primary anchor's facial anatomy, skin tone, hair and distinctive features. Supplementary views resolve angles, not alternative identities. ${activeFigureMediaId&&entry.characterName===storyFigureCharacter?.name?'The @figure attachment defines body build for this character; entered standing height still applies. This identity view controls the face only.':'Only written physique or height values that are explicitly supplied override the identity photo; if blank, use the photo as the sole body reference.'} Never average this face with another cast member, an NPC, an outfit model, or a previous generated panel. Never use it for clothing or background.`
        : workflowMode === "subject-flow"
        ? `REFERENCE IMAGE ${imageNumber}: ${isAnchor ? "PRIMARY FACE ANCHOR" : "SUPPLEMENTARY FACE VIEW"}. Preserve this exact person's facial geometry, bone structure, eyes, nose, lips, jawline, and natural skin tone. Supplementary views resolve angles and lighting only; never an alternate face.`
        : `REFERENCE IMAGE ${imageNumber}: ${isAnchor ? "PRIMARY FACE & IDENTITY ANCHOR" : "SUPPLEMENTARY FACE VIEW OF THE SAME PERSON"}. ABSOLUTE HIGHEST IDENTITY PRIORITY. Reproduce this person's exact facial anatomy and recognizable likeness: preserve eye shape and spacing, eyelids, brows, nose bridge/tip/width, lips, jawline, cheekbones, hairline, complexion, skin tone, and distinctive marks. This is the exact same real person in every shot. Absolutely NO lookalikes, face swaps, plastic beautification, or generic AI faces. Supplementary views resolve facial angles and lighting continuity only.`);
      if (workflowMode === "story") storyReferenceAssignments.push(`${entry.characterName} FACE = image ${imageNumber}`);
      imageNumber++;
    };
    const addOutfitReference = (entry) => {
      imageInputs.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: entry.mediaId });
      const isPrimaryOutfit = !activeOutfitEntries.slice(0,activeOutfitEntries.indexOf(entry)).some((previous) => (previous.characterName || "__single__") === (entry.characterName || "__single__"));
      refMapLines.push(workflowMode === "story"
        ? `REFERENCE IMAGE ${imageNumber}: CANONICAL OUTFIT VIEW ONLY for the named character "${entry.characterName}". Treat every outfit reference assigned to this same character jointly as views/details of that character's one canonical outfit. Reconstruct and preserve the exact garment categories, cut, neckline, sleeves, layers, hem lengths, colors, fabric weight, pattern placement, trim, footwear, and accessories on that character only. Adapt only the physical fit to the character's locked height, physique, pose, movement, gravity, and contact: use believable stretch, compression, folds, gathering, tension, overlap, and occlusion without redesigning the outfit. Never import the outfit model's face, body, pose, or background.`
        : `REFERENCE IMAGE ${imageNumber}: ${isPrimaryOutfit ? "PRIMARY CANONICAL OUTFIT AUTHORITY" : "SUPPLEMENTARY DETAIL VIEW OF THE SAME CANONICAL OUTFIT"}. CLOTHING ONLY. Preserve the exact garment design, neckline, sleeves, colors, fabric, pattern, and accessories. Fit and drape these garments naturally over the locked subject figure and curves. ABSOLUTE CRITICAL BAN: STRICTLY IGNORE any face, head, hair, body shape, waistline, bust, or background in this outfit image. NEVER copy or inherit the model's body shape from this photo; the outfit model has ZERO authority over the subject's figure or identity.`);
      if (workflowMode === "story") storyReferenceAssignments.push(`${entry.characterName} OUTFIT = image ${imageNumber}`);
      imageNumber++;
    };
    if (workflowMode === "story") {
      for (const character of activeStoryCharacters) {
        for (const entry of activeSubjectEntries.filter((item) => item.characterName === character.name)) addIdentityReference(entry);
        for (const entry of activeOutfitEntries.filter((item) => item.characterName === character.name)) addOutfitReference(entry);
      }
    } else {
      activeSubjectEntries.forEach(addIdentityReference);
      activeOutfitEntries.forEach(addOutfitReference);
    }
    const plannedSceneAnchor=workflowMode==="story"?storySceneAnchors.get(storyPanel.sceneId):null;
    const reservedNonStyleReferences=(plannedSceneAnchor?1:0)+activeKnowledgeMediaIds.length+activeQualityMediaIds.length+poseSlots+figureSlots;
    let storyStyleViewsAttached=0;
    for (const [styleIndex,styleMediaId] of storyStyleMediaIds.entries()) {
      if(imageInputs.length>=9-reservedNonStyleReferences)break;
      imageInputs.push({imageInputType:"IMAGE_INPUT_TYPE_REFERENCE",name:styleMediaId});
      refMapLines.push(`REFERENCE IMAGE ${imageNumber}: WEBTOON ART-STYLE AUTHORITY ONLY (STYLE SAMPLE ${styleIndex+1}). Combine the supplied style samples into one consistent visual language, honoring their shared characteristics; when they differ, the first style sample is the tie-breaker. Match linework, shading, texture, palette, color intensity, contrast, lighting mood and cinematic tone. Copy only art style. Ignore faces, people, bodies, clothes, poses, objects, lettering, layout, panel borders and composition. Identity references alone control faces; outfit references alone control wardrobe. Keep this selected art direction consistent across every panel.`);
      storyStyleViewsAttached++;
      imageNumber++;
    }
    if(i===0&&storyStyleViewsAttached<storyStyleMediaIds.length)log(`Flow's nine-reference limit allows ${storyStyleViewsAttached} of ${storyStyleMediaIds.length} style samples on this panel after preserving character, outfit, scene and quality references.`);
    // Only an environment/prop-only clear plate can anchor a later scene angle.
    // Never feed a previously generated person back as a visual reference: even
    // a small face drift compounds across sequential character panels.
    const previousStoryPanelMediaId = workflowMode === "story"
      ? storySceneAnchors.get(storyPanel.sceneId)
      : null;
    if (previousStoryPanelMediaId && imageInputs.length < 9-poseSlots-figureSlots) {
      imageInputs.push({ imageInputType:"IMAGE_INPUT_TYPE_REFERENCE",name:previousStoryPanelMediaId });
      refMapLines.push(`REFERENCE IMAGE ${imageNumber}: SHARED SCENE ANCHOR — ENVIRONMENT ONLY. Preserve its railing material/color, floor, architecture, furniture, landmarks and lighting under the new camera angle. Ignore all people, faces, bodies, garments, poses and any previously rendered lettering/text in this image: this panel's exact narration/dialogue is provided separately. Original named subject/outfit references remain authoritative. Never use this generated image as identity evidence.`);
      imageNumber++;
    }
    for (const m of activeKnowledgeMediaIds) {
      imageInputs.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: m });
      refMapLines.push(workflowMode === "subject-flow"
        ? `REFERENCE IMAGE ${imageNumber}: CANONICAL KNOWLEDGE INTERIOR — SAME ROOM ONLY. Preserve this user's selected room and its recognizable fixed furniture, architecture, materials, colors and layout. This is not permission to move to another room or invent a replacement interior. Change only camera position within this same room; ignore any people in the reference.`
        : `REFERENCE IMAGE ${imageNumber}: KNOWLEDGE / ENVIRONMENT ONLY. Use its location, objects, architecture, layout, surfaces, and visual context. Ignore every person, identity, and outfit visible in it.`);
      imageNumber++;
    }
    for (const m of activeQualityMediaIds) {
      imageInputs.push({ imageInputType: "IMAGE_INPUT_TYPE_REFERENCE", name: m });
      refMapLines.push(workflowMode === "subject-flow"
        ? `REFERENCE IMAGE ${imageNumber}: QUALITY / AESTHETIC AUTHORITY — MANDATORY PHOTOGRAPHIC FINISH. You MUST visibly replicate this image's exact phone sensor quality: realistic indoor lighting, sensor noise/grain in shadows, unsharpened mid-range smartphone lens feel, natural white balance, and real home-photo exposure. Do not produce a clean AI render or studio photo.`
        : `REFERENCE IMAGE ${imageNumber}: QUALITY / AESTHETIC AUTHORITY. Visibly reproduce its photographic finish: lighting direction and softness, exposure behavior, contrast, white balance, color palette, saturation, grain/noise, sharpness falloff, lens perspective, depth-of-field behavior, texture, and overall raw-versus-polished character. Treat these visual properties as a strong target, not loose inspiration. Never copy its person, face, body, clothing, objects, location, or pose.`);
      imageNumber++;
    }

    if(activeFigureMediaId){
      imageInputs.push({imageInputType:'IMAGE_INPUT_TYPE_REFERENCE',name:activeFigureMediaId});
      refMapLines.push(`REFERENCE IMAGE ${imageNumber}: FIGURE / BODY SHAPE ONLY${storyFigureCharacter?' for '+storyFigureCharacter.name:''}. Highest body authority; ignore this image's face, outfit, pose and background.`);
      imageNumber++;
    }
    if(activePoseMediaId) {
      imageInputs.push({imageInputType:'IMAGE_INPUT_TYPE_REFERENCE',name:activePoseMediaId});
      refMapLines.push(`REFERENCE IMAGE ${imageNumber}: POSE / CAMERA AUTHORITY ONLY. Copy this exact pose, viewpoint, framing and subject placement. Ignore this model's identity, body proportions, outfit and environment; those come from their own assigned references.`);
      imageNumber++;
    }

    // The same source can be selected for more than one role. Upload/attach it
    // once, retaining each role under the same numbered reference in the prompt.
    const uniqueInputs=[],mediaNumbers=new Map(),referenceNumbers=new Map();
    const orderedInputs=activePoseMediaId
      ? [...imageInputs.filter(input=>input.name===activePoseMediaId),...imageInputs.filter(input=>input.name!==activePoseMediaId)]
      : imageInputs;
    for(const input of orderedInputs) {
      if(!mediaNumbers.has(input.name)){uniqueInputs.push(input);mediaNumbers.set(input.name,uniqueInputs.length);}
    }
    for(const [index,input] of imageInputs.entries())referenceNumbers.set(index+1,mediaNumbers.get(input.name));
    if(activePoseMediaId || uniqueInputs.length!==imageInputs.length) {
      imageInputs.splice(0,imageInputs.length,...uniqueInputs);
      for(let index=0;index<refMapLines.length;index++)refMapLines[index]=refMapLines[index].replace(/^REFERENCE IMAGE (\d+):/,(_,number)=>`REFERENCE IMAGE ${referenceNumbers.get(Number(number))}:`);
      for(let index=0;index<storyReferenceAssignments.length;index++)storyReferenceAssignments[index]=storyReferenceAssignments[index].replace(/= image (\d+)$/,(_,number)=>`= image ${referenceNumbers.get(Number(number))}`);
    }
    if (imageInputs.length > 9) throw new Error(`Flow reference safety check failed: ${imageInputs.length} references exceed the 9-image limit.`);
    if (workflowMode === "story") {
      if (activeStoryCharacters.length && (!activeSubjectEntries.length || !activeOutfitEntries.length)) throw new Error(`Panel ${i + 1} is missing an uploaded identity or outfit reference for its visible cast.`);
    } else if (!directImage && (!activeSubjectEntries.length || !activeOutfitEntries.length)) {
      throw new Error("A required identity or outfit reference did not upload; generation was stopped before spending credits.");
    }
    if (activeOutfitEntries.length && !imageInputs.some((input) => input.name === activeOutfitEntries[0].mediaId)) throw new Error("The primary outfit reference is missing from the Flow request; generation was stopped before spending credits.");
    const flowReferenceMap = refMapLines.length > 0 
      ? `\n\nEXACT FLOW REFERENCE MAP — follow image positions strictly:\n${refMapLines.map(line => `- ${line}`).join("\n")}` 
      : "";
    if (workflowMode === "story") log(`Panel ${i + 1} reference map: ${storyReferenceAssignments.length ? storyReferenceAssignments.join("; ") : "no visible named characters; no character references needed"}.`);
    if (i === 0 && !directImage) log(`Reference plan: ${activeSubjectEntries.length} identity, ${activeOutfitEntries.length} outfit, ${activeKnowledgeMediaIds.length} environment and ${activeQualityMediaIds.length+storyStyleViewsAttached} style views prepared (${imageInputs.length}/9 max). ${workflowMode === "classic" ? `REFERENCE IMAGE ${mediaNumbers.get(activeSubjectEntries[0]?.mediaId)} is the primary subject face (${subjectUploadQueue[0]?.name || "unnamed subject"}); outfit image follows and cannot define a face.` : "First identity photo for each visible character anchors that face; first outfit photo anchors that character's wardrobe."} Upscale ${params.upscaleEnabled === false ? "OFF" : "ON"}.`);

    // These backend-only rules are appended after Gemini's scene prompt so Flow receives them every time.
    const referenceLockInstruction = workflowMode === "story"
      ? activeStoryCharacters.length
        ? `NAMED CHARACTER IDENTITY LOCK — ABSOLUTE FACE AUTHORITY: The referenced main cast visible in this panel is ${activeStoryCharacters.map((character) => `"${character.name}"`).join(" and ")}. Match each exact cast name exclusively to its own original identity-reference group and preserve the same canonical facial geometry in every angle, distance, expression, crop, pose, and lighting condition. Facial likeness is more important than cinematic lighting, shot variety, attractiveness, expression, or visual polish. Reproduce each face from its primary original identity photo on every panel; do not rely on the previous generated panel as a face reference. Do not invent, simplify, beautify, idealize, smooth, age-shift, or reinterpret facial details. Keep eye shape and spacing, brow shape, nose bridge and tip, lips, jaw, cheekbones, hairline, complexion, age appearance and distinctive marks unchanged. Supplementary identity photos clarify the same person only. Keep different characters visibly distinct; never blend, average, face-swap, duplicate, or transfer features between them. Outfit references control clothing only and must never contribute a face. Unreferenced supporting NPCs listed by role are allowed, but they must look clearly distinct from the named cast and remain secondary.`
        : `CAST-FREE STORY BEAT: No named protagonist is visible in this panel. Render only the environment, story object, transition, or listed NPCs required by the storyboard. Do not invent, duplicate, or partially reveal a main cast member.`
      : workflowMode === "subject-flow"
      ? `STRICT REFERENCE SEPARATION: Use ${activeSubjectEntries.length} attached subject image${activeSubjectEntries.length === 1 ? "" : "s"} only to preserve the same person's identity; ${activeFigureMediaId?'the @figure attachment defines body proportions.':"no written figure details means retain that person's natural reference build without invented measurements."} The first of ${activeOutfitEntries.length} attached outfit image${activeOutfitEntries.length === 1 ? "" : "s"} is the canonical wardrobe authority and any further outfit views clarify details only; use ${activeKnowledgeMediaIds.length} attached knowledge/environment image${activeKnowledgeMediaIds.length === 1 ? "" : "s"} only as evidence of the selected room and its visible scene facts; and ${activeQualityMediaIds.length} attached quality/aesthetic image${activeQualityMediaIds.length === 1 ? "" : "s"} only for visual finish. Across every batch image preserve the exact garments, colors, fabric, cut, layers, and accessories shown by the primary outfit reference; Gemini's variation text cannot substitute, omit, merge, or redesign any garment. The outfit-reference model contributes clothing only, never identity, body, pose, or background. Preserve the selected room's recognizable furniture and architectural cues where compatible with the target. Do not add unreferenced furniture, props, decor, or people. The target controls the requested action, pose, camera angle, framing, gaze, and composition; reference locks must not override those directions. Never blend reference roles or import a person from any non-subject reference.`
      : `CLASSIC FACE LOCK — TOP IDENTITY PRIORITY: REFERENCE IMAGE 1 is the sole facial identity anchor for this subject and must be reproduced as the same recognizable real person in every variation. Match the face itself, not just broad ethnicity or age: preserve eye shape and spacing, brow shape, nose bridge and tip, lip shape, jawline, cheekbones, hairline, complexion and distinctive marks. Keep facial proportions and age fixed across every pose, expression, camera distance and lighting condition. Expressions may change; facial structure may not. Prefer a clear near-frontal or subtle three-quarter face unless the user's explicit scene requires otherwise. Never beautify, smooth, idealize, average, face-swap, age-shift or invent facial features. Outfit references are clothing-only and their models' faces must be ignored; environment and quality references also have zero authority over identity. Follow the numbered reference map exactly. ${activeFigureMediaId?'The @figure attachment overrides all other body descriptions and reference bodies.':'Written figure details override bodies in all images.'}`;
    const qualityStyleInstruction = qualityMediaIds.length
      ? `QUALITY / AESTHETIC STYLE LOCK — HIGH VISUAL PRIORITY: Use the reference image(s) labeled QUALITY / AESTHETIC in the numbered reference map as the governing target for photographic appearance. The output must visibly inherit their shared lighting behavior, exposure, contrast, color response, phone/lens character, texture, sharpness falloff, noise/grain, depth behavior, and degree of rawness. Do not merely acknowledge or loosely borrow the style. Apply it strongly while keeping Subject Identity, Outfit, and Knowledge / Environment content unchanged. This reference controls visual finish only; it must not change the user's requested action, gaze, camera angle, crop, pose, or composition.`
      : `QUALITY / AESTHETIC STYLE: No quality reference was supplied; follow the raw candid realism lock.`;
    const physicalLockInstruction = workflowMode === "story"
      ? `STORY BODY REFERENCE RULE: Height and physique notes are optional. ${StoryEngine.heightRules(activeStoryCharacters)} ${activeStoryCharacters.map((character) => { const notes=[character.height?`height ${character.height}`:"",character.physique?`physique/features ${character.physique}: preserve these proportions consistently`:""].filter(Boolean).join("; "); return `- ${character.name}: ${activeFigureMediaId&&character.id===storyFigureCharacter?.id?['use @figure as the highest authority for body build',character.height?'standing height '+character.height:''].filter(Boolean).join('; '):notes || "no written figure override; use the primary identity photo as the sole body reference and do not infer extra measurements"}`; }).join("\n")} Explicit standing heights apply to every character, including the figure target. Other written physique notes override the identity photo only when that character has no figure attachment. Identity photos remain authoritative for facial identity; outfit photos control garments only.`
      : workflowMode === "subject-flow"
      ? subjectFlowFigureRule
      : classicFigureRule;
    const storyOutfitLockInstruction = workflowMode === "story"
      ? `STORY OUTFIT ADAPTATION LOCK — ABSOLUTE WARDROBE AUTHORITY:\n${activeStoryCharacters.map((character) => `- ${character.name}: Use only ${character.name}'s own outfit reference set as one canonical outfit. Preserve every visible construction and design detail exactly. Adapt the garment physically—but never stylistically—to ${character.name}'s locked figure and current action through realistic drape, gravity, stretch, compression, folds, contact, seated bunching, walking movement, and partial occlusion. Never reshape the body to match the outfit-reference model and never replace the outfit with a generic story-appropriate costume.`).join("\n")}\nAcross panels, preserve the same canonical outfit and accessories unless the written chapter explicitly contains a visible wardrobe-change event.`
      : "";
    const finalFigureReminder = activeFigureMediaId?'FINAL BODY SHAPE CHECK: Use @figure as the highest body authority. Fit the exact outfit to that body.':'FINAL BODY SHAPE CHECK: Keep the resolved canonical build and entered measurements. Preserve requested thickness across the torso and limbs. Body Tuning overrides Figure Details only for entered traits. Fit the garment to the body with natural ease, folds and drape.';
    let promptText;
    if (directImage) {
      if (directImage.mode === "image-to-image" && (!directSourceMediaId || !imageInputs.some(input=>input.name===directSourceMediaId))) throw Error("The source image is missing from this request.");
      promptText = DirectImage.build(directImage);
    } else if(activePoseMediaId && workflowMode!=='story') {
      const compactMap=imageInputs.map((input,index)=>{
        const roles=[];
        if(input.name===activePoseMediaId)roles.push('POSE / CAMERA TEMPLATE: preserve this exact geometry');
        if(input.name===activeFigureMediaId)roles.push('FIGURE / BODY SHAPE ONLY: highest priority for body proportions');
        if(activeSubjectEntries.some(entry=>entry.mediaId===input.name))roles.push(activeFigureMediaId?'SUBJECT IDENTITY: this exact face only; @figure controls body shape; no pose or camera authority':'SUBJECT IDENTITY: this exact face; body reference only for traits not specified by the written figure; no pose or camera authority');
        if(activeOutfitEntries.some(entry=>entry.mediaId===input.name))roles.push('OUTFIT: exact garment design, colors, material and accessories only');
        if(activeKnowledgeMediaIds.includes(input.name))roles.push('ENVIRONMENT: use this location, materials and furniture within the locked camera geometry');
        if(activeQualityMediaIds.includes(input.name))roles.push("FINISH: lighting, colors and texture only; ignore this image's pose, framing and person");
        return `REFERENCE IMAGE ${index+1}: ${roles.join('; ')}.`;
      }).join('\n');
      promptText=PoseReference.build({target:shortPrompt,system:systemInstruction,
        figure:workflowMode==='classic'?classicFigureRule:subjectFlowFigureRule,
        referenceMap:compactMap,
        finish:activeQualityMediaIds.length?'Match the attached finish reference.':workflowMode==='classic'?'Natural, unfiltered iPhone photo; true colors and skin texture.':'Natural home phone-photo texture and available light.'});
      if(workflowMode==='classic')queueState[i].classicShot={pose:'reference',setting:classicShots[i].id,crop:'reference'};
      if(workflowMode==='subject-flow')await chrome.storage.local.set({[`bb_subject_flow_audit_${i}`]:{createdAt:Date.now(),index:i+1,prompt:promptText,model:flowModel,referenceRoles:compactMap.split('\n'),poseTemplate:true}});
      if(i===0)log('Pose template path: pose image first, no Gemini scene expansion or default pose/camera instructions.');
    } else if (workflowMode === "subject-flow") {
      const cameraConflict = /\b(spy|surveillance|cctv|doorbell|peephole|hidden.camera|door.cam)\b/i.test(systemInstruction + " " + plan.prompts[i]);
      const roles = [
        ...activeSubjectEntries.map((_,j)=>j===0?"PRIMARY FACE ANCHOR: exact Subject identity; preserve this person's recognizable facial geometry":"SUPPLEMENTARY VIEW of the same Subject; angle and lighting context only, never an alternate face"),
        ...activeOutfitEntries.map((_,j)=>j===0?'PRIMARY CANONICAL OUTFIT: preserve these exact garments in every image':'SUPPLEMENTARY DETAIL OF THE SAME OUTFIT; clarify construction only, never substitute or redesign'),
        ...activeKnowledgeMediaIds.map(()=>'Room/environment only; ignore people'),
        ...activeQualityMediaIds.map(()=>'Photographic finish only; ignore people, body and layout')
      ];
      promptText = SubjectFlowDirection.build({
        system: systemInstruction,
        target: shortPrompt,
        scene: plan.prompts[i],
        figure: subjectFlowFigureRule,
        roles,
        hasEnvironment: activeKnowledgeMediaIds.length > 0,
        hasQuality: activeQualityMediaIds.length > 0,
        flowReferenceMap,
        variation: subjectFlowVariationCues[i] || "",
        hasPoseReference
      });
      // These backend locks must reach Flow after Gemini's scene variation.
      // The Subject Flow builder previously received the visual map but omitted
      // the strict wardrobe/environment authority assembled below, allowing a
      // Gemini variation to override the uploaded outfit or selected room.
      promptText += `\n\n${referenceLockInstruction}\n\n${qualityStyleInstruction}\n\n${finalFigureReminder}`;
      if (i === 0) log(`Subject Flow: streamlined reference-first request; figure source: ${physicalDetails ? 'dedicated figure field' : 'base/target instructions'}. ${promptText.length} prompt characters.`);
      if (cameraConflict) log(`Subject Flow audit ${i + 1}: written input contains surveillance terms; normal candid camera override applied.`);
      if (i === 0 && knowledgeMediaIds.length + qualityMediaIds.length > activeSubjectEntries.length) log("Subject Flow audit: non-identity references outnumber identity views. Faces present in those images may compete with the identity reference; image contents have not been automatically verified.");
      
      await chrome.storage.local.set({[`bb_subject_flow_audit_${i}`]:{createdAt:Date.now(),index:i+1,prompt:promptText+(activePoseMediaId?"\n\n"+PoseReference.instruction({imageNumber:imageInputs.findIndex(input=>input.name===activePoseMediaId)+1}):""),model:flowModel,upscale:params.upscaleEnabled !== false,referenceRoles:refMapLines,cameraConflict}});
    } else if (workflowMode === "story") {
      const hasPanelText=inImageStoryLettering&&Boolean(String(storyPanel.narration||'').trim()||(storyPanel.dialogue||[]).some(line=>String(line.text||'').trim()));
      promptText = StoryEngine.imagePrompt(storyPanel,referenceLockInstruction + flowReferenceMap,physicalLockInstruction,storyBgStyle,aspectRatio,hasPanelText,Boolean(activePoseMediaId));
      promptText += `\nCANONICAL CHARACTER DESIGNS: ${JSON.stringify({...plan.designBible,...params.storyDesignBible})}. Registered character notes: ${JSON.stringify(activeStoryCharacters.map(c=>({name:c.name,canonNotes:c.canonNotes,aliases:c.aliases})))}. Preserve these exact designs; do not blend alternate forms or import future-arc changes.`;
      const writtenBodyAuthority = activeStoryCharacters.map(character => activeFigureMediaId&&character.id===storyFigureCharacter?.id?`${character.name}: @figure defines body build; standing height ${character.height || "retain reference stature"}`:`${character.name}: physique ${character.physique || "unspecified; retain reference body"}; height ${character.height || "retain reference height"}`).join("\n");
      promptText += `\n\nFINAL IDENTITY AND BODY PRIORITY — overrides conflicting style or reference-body instructions above:
FACE: Subject identity images alone define each person's exact face. Keep facial proportions, eyes, nose, lips, jaw, hairline, age appearance and distinctive features stable across angles and expressions. Do not beautify, average faces, copy an outfit model, or reinterpret the face from descriptive adjectives. Body changes must not redesign the face.
FIGURE: ${activeFigureMediaId?"The selected @figure image takes priority for its assigned character’s build. Entered standing height still applies. Other written":"Written"} physique and height take precedence over identity-reference body shape. ${writtenBodyAuthority}
OUTFIT: Outfit images control clothes only; fit those exact clothes to the resolved body through natural drape, never reshape the body to fit the outfit model. Outfit notes: ${activeStoryCharacters.map(character=>`${character.name}: ${character.outfitNotes || "none"}`).join("; ")}. Knowledge/style images cannot contribute identity or physique. Preserve these roles in every output.
REFERENCE PAIRING: ${storyReferenceAssignments.join("; ") || "No named character is visible in this shot."} Keep each face and garment paired to the same exact character name. Never transfer, exchange, merge, or borrow an outfit or face across characters.`;
      promptText += hasPanelText
        ? '\n\nFINAL STORY IN-IMAGE LETTERING: The requested narration and dialogue must be drawn INSIDE the original image together with the scene. Black rectangular narration cards with white bold italic serif text; white rounded/oval speech balloons with black comic lettering and a tail toward the visible speaker. Keep all text shapes within a 4% inset, over quiet background only, away from faces, hands, weapons and important action. Keep the scene painted all the way to every edge. No outer white border, top/bottom text strip, footer, letterbox, page margin or separate text area. Never shrink the artwork to fit text. No extension overlay will be added. Copy only the panel’s exact text; no duplicate words or sample captions.'
        : '\n\nFINAL STORY FRAME TEXT BAN: Render absolutely no writing, captions, bubbles, logos, watermarks or UI. Artwork fills every edge; no white border, letterbox, page margin or export footer.';
      promptText += storyBgStyle === "webtoon" ? '\nFINAL LIGHTING: Preserve the selected art reference and the chapter weather/time consistently.' : storyBgStyle === "photorealistic"
        ? `\n\nFINAL LIGHTING OVERRIDE: Use natural, realistic ambient lighting appropriate to the scene's stated weather and time. Ordinary daylight is allowed where the story calls for it. Keep natural colors, true-to-life skin and neutral white balance; no artificial god rays, sunbeams, fake lens flare or stylized grading.`
        : `\n\nFINAL LIGHTING OVERRIDE: NO SUN OR DIRECT SUNLIGHT. This overrides any sunshine or golden-hour wording in the story beat or scene description. For exteriors use overcast grey/diffused ambient light; for interiors use subdued practical fixtures. No sunlit ground, window sun patches, visible sun, sunbeams, rays, god rays, volumetric shafts or lens flare.`;
      if (storyBgStyle === "photorealistic") promptText += `\n\nFINAL NATURAL PHOTO LOOK: Match a clean, unedited photorealistic camera image with neutral white balance and normal contrast. Explicitly exclude added warm/orange tint, amber wash, film grain, digital noise, vignette, bloom, fake bokeh, teal-orange grade, cinematic LUT, smoky haze, plastic smoothing or stylized post-processing. Preserve real materials, skin texture and accurate object colors. ${hasPanelText?"Only the exact requested Story captions and dialogue are allowed; no incidental writing.":"Include absolutely no writing or text."}`;
    } else {
      promptText = ClassicDirection.build({
        target:shortPrompt,
        scene:generationEngine === "gemini" ? plan.prompts[i] : "",
        figureRule:classicFigureRule,
        shot:classicShots[i],
        referenceLock:referenceLockInstruction,
        referenceMap:flowReferenceMap,
        hasPoseReference
      });
      queueState[i].classicShot = {pose:classicShots[i].poseId,setting:classicShots[i].id,crop:classicShots[i].cropId};
      if(i===0)log(hasPoseReference?"Classic: exact reference pose and camera geometry; identity, outfit and figure preserved.":"Classic: fresh pose silhouettes, attractive real backgrounds and natural unfiltered light; recent shots avoided, exact figure and references preserved.");
    }
    if(!directImage && !activePoseMediaId && workflowMode !== 'classic') promptText += workflowMode==='story' ? '\nHAIR: Preserve each character’s canonical hair texture, length and color, including curls when present in the reference or chapter.' : `\n\nHAIR RULE: Do not give the subject curly hair. Keep every other hair detail and natural texture consistent with the reference and the user's request.`;
    if(activePoseMediaId && workflowMode==='story') {
      const poseImageNumber=imageInputs.findIndex(input=>input.name===activePoseMediaId)+1;
      if(!poseImageNumber)throw Error('The selected pose reference is missing from the Flow request.');
      promptText += '\n\n'+PoseReference.instruction({imageNumber:poseImageNumber,story:workflowMode==='story'});
    }
    if(activeFigureMediaId){
      const figureNumber=imageInputs.findIndex(input=>input.name===activeFigureMediaId)+1;
      promptText+='\n\n'+FigureReference.instruction(figureNumber,storyFigureCharacter?.name||'',storyFigureCharacter?.height||'');
    }
    if(workflowMode==='story')promptText+='\n\n'+StoryEngine.heightRules(activeStoryCharacters);
    const itemState = queueState[i];
    delete itemState.error;
    itemState.prompt = promptText;
    if (workflowMode === "story") itemState.displayPrompt = StoryEngine.scenePrompt(storyPanel, storyBgStyle, storyTextOverlays);
    else delete itemState.displayPrompt;
    itemState.status = manualRetry ? "manual_retry" : "generating";
    delete itemState.previewUrl;
    delete itemState.thumbnailUrl;
    broadcastQueue(queueState);
    
    log(`Prompt ${i + 1}: ${promptText.slice(0, 80)}...`);

    let attempt = 0;
    let blob = null;
    let generation = storyJob?.panels[i]?.generation || itemState.generation || null;

    while (!blob && !STATE.stopRequested) {
      attempt++;
      delete itemState.retryAt;
      itemState.status=generation?"downloading":"generating";
      broadcastQueue(queueState);
      try {
        // Once Flow has generated the image, retain that media result while trying
        // alternate download transports. A temporary FI​​FE 403 must not consume
        // quota by generating a completely new image on every retry.
        if (!generation) {
          if(storyJob)await StoryJobs.checkpoint(storyJob,i,{status:'outcome_unknown'});
          generation = await generateFlowImage(flow, promptText, imageInputs, flowModel, aspectRatio,{imageIndex:i+1,attempt});
          itemState.generation = generation;
          if(storyJob)await StoryJobs.checkpoint(storyJob,i,{status:'downloading',generation});
        }
        if (STATE.stopRequested) break;
        if (generation.mediaId) {
          log(`Fetching the confirmed Flow image for ${i + 1} at its returned resolution...`);
          itemState.status = "downloading";
          broadcastQueue(queueState);
          
          const qualityResult = await fetchMaximumQualityFlowImage(flow,generation.mediaId,generation.fifeUrl,{ preferUpscale:params.upscaleEnabled !== false, transport:generation.transport });
          blob = qualityResult.blob;
        } else {
           generation = null;
           throw new Error("No media ID returned.");
        }
      } catch (e) {
        const unusual=/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(`${e.code} ${e.message}`);
        const refusalPaused=e.code==='FLOW_UNUSUAL_ACTIVITY_PAUSED';
        if(unusual) {
          STATE.stopRequested=true;
          STATE.stopReason='Flow paused generation after an unusual-activity refusal. Progress is retained; check the Flow account before resuming.';
          itemState.status='paused';
          itemState.error=String(e.message||e).slice(0,1000);
          if(storyJob)await StoryJobs.checkpoint(storyJob,i,{status:'queued',error:itemState.error,generation:null});
          log(STATE.stopReason,'error');
          broadcastQueue(queueState);
          return;
        }
        if(e.code==='FLOW_TAB_RECOVERY_FAILED') {
          STATE.stopRequested=true;STATE.stopReason=e.message;
          log(e.message,'error');
        }
        // A request that never left the extension is pending work, not a failed image.
        if(!generation&&e.notSubmitted===true&&(STATE.stopRequested||refusalPaused||e.code==='FLOW_REFERENCE_BATCH_PAUSED')) {
          itemState.status='paused';delete itemState.error;
          if(storyJob)await StoryJobs.checkpoint(storyJob,i,{status:'queued',error:null,generation:null});
          log(`Image ${i+1} paused before submission; kept queued for Resume.`);
          broadcastQueue(queueState);return;
        }
        log(`Failed image ${i + 1} attempt ${attempt}: ${e.message}`);
        itemState.error = String(e.message || e).slice(0,1000);
        if(storyJob)await StoryJobs.checkpoint(storyJob,i,{status:e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN'?'outcome_unknown':'failed',error:itemState.error,generation});
        if(e.code==='FLOW_GENERATION_OUTCOME_UNKNOWN')itemState.status='outcome_unknown';

        if(e.code==='FLOW_REFERENCE_MISMATCH') {
          STATE.stopRequested=true;
          STATE.stopReason=`Reference mismatch on image ${i+1}; trace ${e.traceId||'unavailable'}. Batch stopped before further submissions. Copy diagnostics from the activity panel.`;
          log(STATE.stopReason);break;
        }
        if (/DAILY_QUOTA_REACHED|FLOW_AUTH_REQUIRED|UNAUTHENTICATED|Google sign-in is required/i.test(`${e.code} ${e.message}`)) {
          STATE.stopRequested=true;itemState.status='quota_exhausted';
          STATE.stopReason='The account needs sign-in or available quota. Progress saved.';
          log(STATE.stopReason,'error');break;
        }
        if (STATE.stopRequested) break;
        const retry = FlowRetry.decision(e, attempt, {download:!!generation});
        if(!retry.retry){log(`Image ${i+1}: ${e.message}; automatic retry paused.`);break;}
        const baseDelay = retry.delayMs;
        itemState.status = retry.rateLimited ? 'waiting_quota' : 'retrying';
        itemState.attempt = attempt;
        itemState.retryAt = Date.now() + baseDelay;
        log(`Image ${i+1}: retry ${attempt+1} in ${Math.ceil(baseDelay/1000)}s. Stop cancels this wait.`);
        broadcastQueue(queueState);
        try {await interruptibleWait(baseDelay);} catch(error) {if(STATE.stopRequested)break;throw error;}
      }
    }

    if (blob && !STATE.stopRequested && workflowMode === "story" && !panelCharacterNames.size && !(storyPanel.npcs || []).length && !storySceneAnchors.has(storyPanel.sceneId) && i < totalItems - 1) {
      try {
        const continuityDataUrl = await blobToDataUrl(blob);
        const sceneAnchorId = await uploadReferenceUntilSuccess(flow,continuityDataUrl,`story-panel-${i + 1}-continuity.png`,`Story continuity panel ${i + 1}`);
        storySceneAnchors.set(storyPanel.sceneId,sceneAnchorId);
      } catch (continuityError) {
        log(`Could not attach panel ${i + 1} as a visual continuity reference; continuing with Gemini's continuity ledger: ${continuityError.message}`);
      }
    }

    if (blob && workflowMode === "story") {
      const rendered=await withAutoRetry(`Reading panel ${i+1} dimensions`,()=>StoryRenderer.render(blob));
      blob=rendered.blob;
      if(storyJob)await StoryJobs.savePanel(storyJob,i,blob,{generation,width:rendered.width,height:rendered.height});
      log(`Panel ${i+1}: original full-bleed image saved; no added borders or text bands.`);
    }

    if (blob) {
      if (workflowMode !== 'story' && telegramEnabled && tgBotToken && (resolvedTgChatId || tgChatId)) {
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png";
        const filename = `${workflowMode}-image-${String(i+1).padStart(2,"0")}.${extension}`;
        const caption = `Guc guy [${i+1}/${totalItems}] (${workflowMode})\nPrompt: ${shortPrompt.slice(0, 300)}`;
        telegramQueue = telegramQueue.then(async () => {
          if(STATE.stopRequested)return;
          try {
            await sendImageToTelegramWithRetry(tgBotToken, resolvedTgChatId || tgChatId, blob, filename, caption, tgSendAsDoc);
            itemState.telegramSent = true;
            log(`✈️ Sent image ${i+1} to Telegram (Chat: ${resolvedTgChatId || tgChatId}).`,"success");
          } catch(tgError) {
            log(`⚠️ Telegram send failed for image ${i+1}: ${tgError.message}`);
          }
          await sleep(1000);
        });
      }
      delete itemState.error;
      itemState.status = "done";
      try {
        itemState.previewUrl = await blobToDataUrl(storyJob?await StoryRenderer.thumbnail(blob):blob);
      } catch (e) { }
      broadcastQueue(queueState);
    } else {
      if (!["quota_exhausted","failed","outcome_unknown"].includes(itemState.status)) itemState.status = STATE.stopRequested ? "stopped" : "failed";
      broadcastQueue(queueState);
    }
    
    if (!manualRetry) {
      completedCount++;
      setProgress(10 + Math.round((completedCount) / totalItems * 80));
      setStatus(`Processed ${completedCount}/${totalItems}; ${queueState.filter(item => item.status === "done").length} images ready…`);
    }
  };

  STATE.retryHandler = async (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= totalItems) throw new Error("Invalid image index for retry.");
    STATE.running = true;
    STATE.stopRequested = false;
    STATE.stopReason = "";
    FlowRequestGuard.resume();
    if(queueState[index].status === "done")delete queueState[index].generation;
    delete flow.nativeReferenceFailure;
    setStatus(`Retrying image ${index + 1}…`);
    log(`Manual retry requested for image ${index + 1}; generating a fresh variation from its prompt.`);
    try {
      await generateImageAtIndex(index,{ manualRetry:true });
      const succeeded = queueState[index]?.status === "done";
      setStatus(succeeded ? `Image ${index + 1} regenerated.` : `Image ${index + 1} retry failed.`);
      log(succeeded ? `Manual retry completed for image ${index + 1}.` : `Manual retry produced no image for ${index + 1}.`);
    } finally {
      STATE.running = false;
      chrome.runtime.sendMessage({ type:"bb_done" }).catch(() => {});
    }
  };

  log(generationMode === "parallel" 
    ? `Running rate-limited parallel generation for ${totalItems} images; at most two requests will be in flight...` 
    : `Running generation in Sequential mode for ${totalItems} images...`);

  const generateSafely=async(index)=>{
    try {await generateImageAtIndex(index);} catch(e) {
      queueState[index].status=STATE.stopRequested?'stopped':'failed';queueState[index].error=e.message;
      if(storyJob)await StoryJobs.checkpoint(storyJob,index,{status:'failed',error:e.message});
      log(`Panel ${index+1} saved for retry: ${e.message}`);broadcastQueue(queueState);
    }
  };
  if (generationMode === "parallel") {
    // Bound concurrent requests so each panel owns its response and retry budget.
    const maxConcurrency = Math.min(2, totalItems);
    log(`Launching up to ${maxConcurrency} workers for ${totalItems} images. Flow requests start at least 8 seconds apart; at most two can be in flight.`);
    let nextIndex = 0;
    const worker = async () => {
      // Admission spaces token requests; no worker waits for a sibling's image.
      while (!STATE.stopRequested && nextIndex < totalItems) {
        const idx = nextIndex++;
        await generateSafely(idx);
      }
    };
    const workers = Array.from({ length: maxConcurrency }, () => worker());
    await Promise.all(workers);
  } else {
    for (let i = 0; i < totalItems && !STATE.stopRequested; i++) {
        await generateSafely(i);
    }
  }

  // Wait for all queued Telegram uploads to finish
  if (telegramEnabled && tgBotToken && !STATE.stopRequested) {
    setStatus("Finalizing Telegram deliveries…");
    await telegramQueue;
  }

  if (STATE.stopRequested) {
    log("Stopped during generation.");
    setStatus(STATE.stopReason||'Stopped. Progress saved.');
    STATE.running = false;
    chrome.runtime.sendMessage({ type: "bb_done" }).catch(() => {});
    return;
  }

  // Finalize UI
  setStatus("Done!");
  const readyCount = queueState.filter(item => item.status === "done").length;
  log(readyCount === totalItems ? `Generation complete! ${readyCount}/${totalItems} images ready.` : `Run finished: ${readyCount}/${totalItems} images ready; ${totalItems-readyCount} failed or unavailable. Retry the failed items.`);
  setProgress(100);
  STATE.running = false;
  if(!storyJob)chrome.runtime.sendMessage({ type: "bb_done" }).catch(() => {});
}


// ---------------- Google Flow API Boilerplate ----------------

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Blob conversion failed"));
    reader.readAsDataURL(blob);
  });
}

let storyComicFontPromise;
async function loadStoryComicFont() {
  if(!storyComicFontPromise)storyComicFontPromise=(async()=>{
    try{
      const response=await fetch(chrome.runtime.getURL("assets/ComicNeue-Bold.ttf"));
      if(!response.ok)throw new Error("Comic Neue font asset was unavailable");
      const font=new FontFace("Story Comic Neue",await response.arrayBuffer());
      await font.load();
      if(!self.fonts?.add)throw new Error("This worker cannot register custom fonts");
      self.fonts.add(font);return true;
    }catch(error){log(`Comic lettering font could not load; using the built-in sans font (${error.message}).`);return false;}
  })();
  return storyComicFontPromise;
}

async function addStoryTextOverlay(imageBlob,panel) {
  const narration=String(panel?.narration||"").trim();
  const dialogue=(Array.isArray(panel?.dialogue)?panel.dialogue:[]).filter(line=>String(line?.text||"").trim());
  if(!narration&&!dialogue.length)return imageBlob;
  if(typeof OffscreenCanvas!=="function")throw new Error("OffscreenCanvas is unavailable in this browser");
  const bitmap=await createImageBitmap(imageBlob);
  try {
    const width=bitmap.width,height=bitmap.height,canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext("2d"),comicFontReady=await loadStoryComicFont();
    if(!ctx)throw new Error("Could not create a 2D image canvas");
    ctx.drawImage(bitmap,0,0,width,height);
    const scale=Math.max(.72,Math.min(1.8,width/1600));
    // Size lettering against the image width, not min(width,height). The old
    // min-dimension formula made portrait panels noticeably tiny. Keep a
    // stronger floor so both landscape and portrait chapters read at phone size.
    const fontSize=Math.max(34,Math.round(Math.min(width,height)*.04));
    const margin=Math.round(Math.min(width,height)*.035),pad=Math.round(fontSize*.48),lineHeight=Math.round(fontSize*1.3);
    const actorSafetyPad=Math.max(10,Math.round(margin*.4));
    const visibleFigures=[...(panel.cast||[]),...(panel.npcs||[])];
    const occupied=visibleFigures.filter(character=>character.bounds).map(figure=>({figure,x:Math.max(0,figure.bounds.x*width-actorSafetyPad),y:Math.max(0,figure.bounds.y*height-actorSafetyPad),w:Math.min(width,figure.bounds.w*width+actorSafetyPad*2),h:Math.min(height,figure.bounds.h*height+actorSafetyPad*2)}));
    const place=(boxWidth,boxHeight,preferRight,preferBottom=false)=>{
      const sideX=preferRight?width-margin-boxWidth:margin,otherX=preferRight?margin:width-margin-boxWidth;
      const middleY=Math.max(margin,Math.min(height-margin-boxHeight,Math.round(height*.64)));
      const top=[{x:sideX,y:margin},{x:otherX,y:margin},{x:(width-boxWidth)/2,y:margin}],bottom=[{x:sideX,y:middleY},{x:otherX,y:middleY},{x:(width-boxWidth)/2,y:middleY},{x:sideX,y:height-margin-boxHeight},{x:otherX,y:height-margin-boxHeight},{x:(width-boxWidth)/2,y:height-margin-boxHeight}];
      const candidates=preferBottom?[...bottom,...top]:[...top,...bottom];
      return candidates.find(rect=>rect.x>=0&&rect.y>=0&&rect.x+boxWidth<=width&&rect.y+boxHeight<=height&&!occupied.some(actor=>rect.x<actor.x+actor.w&&rect.x+boxWidth>actor.x&&rect.y<actor.y+actor.h&&rect.y+boxHeight>actor.y))||null;
    };
    const wrap=(text,maxWidth,font)=>{
      ctx.font=font;
      const words=String(text).split(/\s+/),lines=[];let line="";
      for(const word of words){const candidate=line?`${line} ${word}`:word;if(line&&ctx.measureText(candidate).width>maxWidth){lines.push(line);line=word;}else line=candidate;}
      if(line)lines.push(line);return lines;
    };
    if(narration){
      const narrationFont=`italic 700 ${fontSize}px ${comicFontReady?'"Story Comic Neue", ':''}Georgia, "Times New Roman", serif`,textWidth=width*.48-2*pad;
      const lines=wrap(narration,textWidth,narrationFont).slice(0,5),boxWidth=Math.min(width*.57,Math.max(...lines.map(line=>{ctx.font=narrationFont;return ctx.measureText(line).width;}))+2*pad),boxHeight=lines.length*Math.round(lineHeight*.9)+2*pad,box=place(boxWidth,boxHeight,false);
      if(box){ctx.save();ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=fontSize*.24;ctx.fillStyle="rgba(4,5,7,.97)";ctx.fillRect(box.x,box.y,boxWidth,boxHeight);ctx.shadowBlur=0;ctx.strokeStyle="rgba(238,238,238,.72)";ctx.lineWidth=Math.max(1,1.25*scale);ctx.strokeRect(box.x,box.y,boxWidth,boxHeight);ctx.font=narrationFont;ctx.fillStyle="#f5f4f2";ctx.textBaseline="top";ctx.textAlign="center";lines.forEach((line,index)=>ctx.fillText(line,box.x+boxWidth/2,box.y+pad+index*Math.round(lineHeight*.9)));ctx.restore();occupied.push({...box,w:boxWidth,h:boxHeight});}
      else log("Skipped narration card: no clear negative-space area was available without covering a character.");
    }
    for(const line of dialogue.slice(0,2)){
      const text=String(line.text||"").trim();if(!text)continue;
      const speaker=String(line.speaker||"").trim(),dialogueFont=`700 ${fontSize}px ${comicFontReady?'"Story Comic Neue", ':''}Arial, Helvetica, sans-serif`;
      const maxBubbleWidth=width*.56,innerWidth=maxBubbleWidth-2*pad;
      const lines=wrap(text,innerWidth,dialogueFont),bubbleWidth=Math.min(maxBubbleWidth,Math.max(fontSize*4,...lines.map(wordLine=>{ctx.font=dialogueFont;return ctx.measureText(wordLine).width;}))+2*pad),dialogueHeight=lines.length*Math.round(lineHeight*.94),bubbleHeight=dialogueHeight+2*pad;
      const target=visibleFigures.find(character=>(character.name||character.role)?.toLocaleLowerCase()===speaker.toLocaleLowerCase());
      const targetX=target?.bounds?(target.bounds.x+target.bounds.w/2)*width:width*.5;
      const targetY=target?.bounds?(target.bounds.y+target.bounds.h*.22)*height:height*.56;
      // Keep speech near its speaker while giving their face and body a clear
      // silhouette. Try lower reading positions first, then nearby open space.
      const xChoices=[margin,width-margin-bubbleWidth,(width-bubbleWidth)/2].filter((x,index,array)=>x>=0&&x+bubbleWidth<=width&&array.indexOf(x)===index);
      const yChoices=[height*.68,height*.5,height*.3,margin,height-margin-bubbleHeight].map(y=>Math.max(margin,Math.min(height-margin-bubbleHeight,y)));
      const candidates=[];
      for(const y of yChoices)for(const x of xChoices)candidates.push({x,y});
      candidates.sort((a,b)=>{
        const score=box=>Math.hypot((box.x+bubbleWidth/2)-targetX,(box.y+bubbleHeight/2)-targetY)+Math.max(0,height*.56-(box.y+bubbleHeight/2))*.22;
        return score(a)-score(b);
      });
      const box=candidates.find(rect=>!occupied.some(actor=>rect.x<actor.x+actor.w&&rect.x+bubbleWidth>actor.x&&rect.y<actor.y+actor.h&&rect.y+bubbleHeight>actor.y))||null;
      if(!box){log(`Skipped dialogue bubble for ${speaker||"unnamed speaker"}: no clear negative-space area was available without covering a character.`);continue;}
      const {x,y}=box,radius=Math.min(bubbleWidth/2,bubbleHeight/2),tailLength=Math.round(fontSize*.58),tailHeight=Math.round(fontSize*.28),towardLeft=targetX<x+bubbleWidth/2,tailTipX=towardLeft?x-tailLength:x+bubbleWidth+tailLength,tailBaseX=towardLeft?x+radius*.45:x+bubbleWidth-radius*.45,tailY=Math.max(y+radius,Math.min(y+bubbleHeight-radius,targetY)),tailBounds={x:Math.min(tailTipX,tailBaseX),y:tailY-tailHeight,w:Math.abs(tailBaseX-tailTipX),h:tailHeight*2},tailIsClear=tailBounds.x>=0&&tailBounds.x+tailBounds.w<=width&&!occupied.some(actor=>actor.figure!==target&&tailBounds.x<actor.x+actor.w&&tailBounds.x+tailBounds.w>actor.x&&tailBounds.y<actor.y+actor.h&&tailBounds.y+tailBounds.h>actor.y);
      ctx.save();ctx.shadowColor="rgba(0,0,0,.42)";ctx.shadowBlur=fontSize*.2;ctx.fillStyle="#f6f5f2";ctx.strokeStyle="rgba(28,29,32,.92)";ctx.lineWidth=Math.max(1.5,2*scale);
      if(tailIsClear){ctx.beginPath();ctx.moveTo(tailBaseX-fontSize*.2,tailY-tailHeight);ctx.lineTo(tailTipX,tailY);ctx.lineTo(tailBaseX-fontSize*.2,tailY+tailHeight);ctx.closePath();ctx.fill();ctx.stroke();}
      ctx.beginPath();ctx.roundRect(x,y,bubbleWidth,bubbleHeight,radius);ctx.fill();ctx.stroke();ctx.shadowBlur=0;
      ctx.textBaseline="top";ctx.textAlign="center";ctx.font=dialogueFont;ctx.fillStyle="#19191c";lines.forEach((wordLine,index)=>ctx.fillText(wordLine,x+bubbleWidth/2,y+pad+index*Math.round(lineHeight*.9)));
      ctx.restore();occupied.push({...box,w:bubbleWidth,h:bubbleHeight});
    }
    return await canvas.convertToBlob({type:"image/png"});
  } finally {bitmap.close?.();}
}

function isGoogleFlowUrl(url) {
  try {
    const parsed = new URL(String(url || ""));
    return parsed.hostname === "labs.google" && /\/fx(?:\/|$)/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

async function findLabsFlowAuthTab() {
  const stored = await chrome.storage.session.get("bb_flow_auth_tab_id").catch(() => ({}));
  if (Number.isInteger(stored.bb_flow_auth_tab_id)) {
    try {
      const bound = await chrome.tabs.get(stored.bb_flow_auth_tab_id);
      const boundUrl = String(bound.url || bound.pendingUrl || "");
      if (/^https:\/\/flow\.google\.com(?:\/|$)/i.test(boundUrl)
        || (/^https:\/\/accounts\.google\.com\//i.test(boundUrl) && /flow\.google/i.test(boundUrl))) {
        return bound;
      }
    } catch {}
    await chrome.storage.session.remove("bb_flow_auth_tab_id").catch(() => {});
  }
  const tabs = await chrome.tabs.query({ url: ["https://flow.google.com/*"] });
  const authTab = tabs
    .filter((tab) => !String(tab.url || tab.pendingUrl || "").includes("accounts.google.com"))
    .sort((a, b) => b.id - a.id)[0];
  if (authTab?.id) await chrome.storage.session.set({ bb_flow_auth_tab_id:authTab.id }).catch(() => {});
  return authTab || null;
}

async function getLabsFlowSession(flowTabId, { openIfMissing = true, focusOnError = true } = {}) {
  let authTab = await findLabsFlowAuthTab();
  if (!authTab && openIfMissing) {
    authTab = await chrome.tabs.create({ url: FLOW_AUTH_HOME_URL, active: false });
    await waitForTabComplete(authTab.id);
    authTab = await findLabsFlowAuthTab();
  }
  if (!authTab?.id) {
    throw new Error("Google sign-in is required.");
  }
  if (/^https:\/\/accounts\.google\.com\//i.test(String(authTab.url || authTab.pendingUrl || ""))) {
    if (focusOnError) await chrome.tabs.update(authTab.id, { active:true }).catch(() => {});
    throw new Error("Finish choosing the Google account in the open sign-in tab.");
  }

  const result = await chrome.scripting.executeScript({
    target: { tabId: authTab.id },
    world: "MAIN",
    func: async () => {
      try {
        const w = typeof WIZ_global_data !== "undefined" ? WIZ_global_data : (window.WIZ_global_data || null);
        const at = w && w.SNlM0e ? String(w.SNlM0e) : "";
        if (!at) return { error: "WIZ session token not found. Please reload flow.google.com." };
        // We also try to extract email from the page if possible
        const emailMatch = document.body.innerHTML.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/);
        const account = emailMatch ? emailMatch[0].toLowerCase() : "Google account";
        return { token: at, account, expiresMs: Date.now() + 86400000 };
      } catch (error) {
        return { error: error.message };
      }
    }
  });
  const session = result?.[0]?.result;
  if (!session?.token) {
    if (focusOnError) await chrome.tabs.update(authTab.id, { active: true }).catch(() => {});
    throw new Error(`Google Labs Flow login is required${session?.error ? ` (${session.error})` : ""}.`);
  }

  return { ...session, authTabId: authTab.id };
}

async function waitForInterceptedToken(tabId, maxWaitMs = 15000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const observed = FLOW_ACCESS_TOKENS.get(tabId);
    if (observed?.token && !FLOW_REJECTED_TOKENS.has(observed.token)) return observed.token;
    const globalObserved = FLOW_ACCESS_TOKEN;
    if (globalObserved?.token && !FLOW_REJECTED_TOKENS.has(globalObserved.token) && (globalObserved.tabId === tabId || !Number.isInteger(globalObserved.tabId))) return globalObserved.token;
    
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const match = document.documentElement.innerHTML.match(/ya29\.[A-Za-z0-9._~-]{30,}/);
          if (match) return match[0];
          // Try to find it in window objects that might have been added
          try {
             const str = JSON.stringify(window.__NEXT_DATA__ || {});
             const match2 = str.match(/ya29\.[A-Za-z0-9._~-]{30,}/);
             if (match2) return match2[0];
          } catch(e) {}
          return null;
        }
      });
      if (results && results[0] && results[0].result) {
        const token = results[0].result;
        if (!FLOW_REJECTED_TOKENS.has(token)) {
          captureFlowAccessToken(token, tabId);
          return token;
        }
      }
    } catch (e) {
      console.warn("[Guc guy] Error scanning page for ya29:", e);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

async function ensureFlowLabsAuth(flow) {
  if (flow.accessToken && flow.authTabId && !FLOW_REJECTED_TOKENS.has(flow.accessToken)) {
     if (flow.accessToken.startsWith("ya29.")) return flow; // it's valid
  }
  
  const authTabId = flow.authTabId || flow.tabId;
  let token = await waitForInterceptedToken(authTabId, 2000);
  
  if (!token) {
    console.log("[Guc guy] Intercepted token missing or rejected, reloading Labs tab...");
    if (authTabId) {
      await chrome.tabs.reload(authTabId);
      token = await waitForInterceptedToken(authTabId, 15000);
    }
  }
  
  if (!token) {
    throw new Error("Google Labs returned the expired Flow token again. Reload the Labs tab once, then retry.");
  }
  
  flow.accessToken = token;
  flow.authTabId = authTabId;
  return flow;
}

function invalidateFlowAccessToken(tabId) {
  const current = FLOW_ACCESS_TOKENS.get(tabId);
  FLOW_ACCESS_TOKENS.delete(tabId);
  if (FLOW_ACCESS_TOKEN?.tabId === tabId || FLOW_ACCESS_TOKEN?.token === current?.token || !Number.isInteger(FLOW_ACCESS_TOKEN?.tabId)) {
    FLOW_ACCESS_TOKEN = null;
    chrome.storage.session.remove("bb_flow_access_token").catch(() => {});
  }
}

const FLOW_SECURITY_QUEUES = new Map();
function mintFlowRecaptchaToken(tabId, action = "IMAGE_GENERATION", { deferAdmission = false } = {}) {
  // Serialize security work while keeping each token in its submitting project.
  const previous = FLOW_SECURITY_QUEUES.get('helper') || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    if (!deferAdmission) await FlowRequestGuard.admit(action);
    return executeFlowSecurityToken(tabId, action);
  });
  FLOW_SECURITY_QUEUES.set('helper', task);
  const cleanup = () => { if (FLOW_SECURITY_QUEUES.get('helper') === task) FLOW_SECURITY_QUEUES.delete('helper'); };
  task.then(cleanup, cleanup);
  return task;
}
async function executeFlowSecurityToken(tabId, action) {
  for (let attempt = 0; attempt < 2; attempt++) {
    await FlowRequestGuard.ready();
    try {
      const siteKey = FLOW_DYNAMIC_SITE_KEYS.get(tabId) || FLOW_RECAPTCHA_SITE_KEY;
      const results = await waitForGenerationOperation(chrome.scripting.executeScript({target:{tabId},world:'MAIN',func:executeFlowProjectSecurity,args:[siteKey,action]}));
      const result = results?.[0]?.result;
      if (!result?.token) throw new Error(result?.error || 'Flow helper returned no response.');
      return result.token;
    } catch(error) {
      await FlowRequestGuard.rejected(error);
      const recoverable = /security library did not initialize|security timed out|helper page did not finish loading|No tab with id|No frame with id|Frame.*removed|tab was closed/i.test(error.message || '');
      if(attempt || error.noRetry || !recoverable)throw Object.assign(error,{notSubmitted:true});
      log('Flow security initialization was incomplete before submission. Retrying in the same project.');
      await interruptibleWait(1000);
    }
  }
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/s);
  if (!match) throw new Error("Reference image is not a valid Base64 data URL.");
  return { mimeType: match[1], imageBytes: match[2] };
}

function parseTelegramChatInput(raw) {
  let text = String(raw || "").trim();
  if (!text) return "";

  // Web telegram link: https://web.telegram.org/k/#-1004410858650 or /a/#-100... or .../#100...
  const webMatch = text.match(/(?:https?:\/\/)?web\.telegram\.org\/[ak]\/#(-?\d+|@[a-zA-Z0-9_]+|[a-zA-Z0-9_]+)/i);
  if (webMatch) {
    text = webMatch[1];
  }

  // Already negative number (e.g. -1004410858650)
  if (/^-\d+$/.test(text)) return text;

  // Channel ID starting with 100 without negative sign: 1004410858650 -> -1004410858650
  if (/^100\d{7,}$/.test(text)) {
    return `-${text}`;
  }

  // Private channel link: t.me/c/4410858650 or t.me/c/1004410858650
  const privateMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/c\/(\d+)(?:\/\d+)?/i);
  if (privateMatch) {
    const rawId = privateMatch[1];
    return rawId.startsWith("100") ? `-${rawId}` : `-100${rawId}`;
  }

  // Pure digits: if 10 or more digits
  if (/^\d+$/.test(text)) return text;

  // t.me/username
  const linkMatch = text.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]{3,})/i);
  if (linkMatch) return `@${linkMatch[1]}`;

  if (text.startsWith("@")) return text;
  if (/^[a-zA-Z0-9_]{4,}$/.test(text)) return `@${text}`;
  return text;
}

async function resolveTelegramChatId(botToken, rawInput) {
  if (!botToken) throw new Error("Bot Token is required.");
  const token = botToken.trim();
  let parsed = parseTelegramChatInput(rawInput);
  if (!parsed) throw new Error("Chat link or ID is required.");

  // If number starts with 100 without minus, add minus
  if (/^100\d{7,}$/.test(parsed)) {
    parsed = `-${parsed}`;
  }
  if (/^-?\d+$/.test(parsed)) return parsed;

  const cleanUser = parsed.replace(/^@/, "").toLowerCase();

  // 1. Try getChat directly with parsed (@username) - works for channels and supergroups
  try {
    const chatRes = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${encodeURIComponent(parsed)}`);
    const chatText = await chatRes.text();
    const chatJson = JSON.parse(chatText);
    if (chatJson.ok && chatJson.result?.id) {
      return String(chatJson.result.id);
    }
  } catch {}

  // 2. Scan recent getUpdates to find user or chat by username
  try {
    const upRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const upText = await upRes.text();
    const upJson = JSON.parse(upText);
    if (upJson.ok && Array.isArray(upJson.result)) {
      for (let i = upJson.result.length - 1; i >= 0; i--) {
        const u = upJson.result[i];
        const msg = u.message || u.edited_message || u.channel_post;
        const from = msg?.from || u.my_chat_member?.from;
        const chat = msg?.chat || u.my_chat_member?.chat;
        if (from?.username?.toLowerCase() === cleanUser || chat?.username?.toLowerCase() === cleanUser) {
          return String(chat?.id || from?.id);
        }
      }
    }
  } catch {}

  // 3. Fallback to parsed
  return parsed;
}

async function autoDetectTelegramChat(botToken) {
  if (!botToken) throw new Error("Bot Token is required.");
  const token = botToken.trim();
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error("Telegram API returned non-JSON."); }
  if (!json.ok) throw new Error(json.description || "Failed to fetch bot updates.");
  const updates = Array.isArray(json.result) ? json.result : [];
  if (!updates.length) {
    throw new Error("No recent messages found. Open Telegram, find your bot, and click /start or send a message to it first (or add bot to your channel).");
  }
  for (let i = updates.length - 1; i >= 0; i--) {
    const u = updates[i];
    const msg = u.message || u.edited_message || u.channel_post;
    const chat = msg?.chat || u.my_chat_member?.chat;
    const user = msg?.from || u.my_chat_member?.from;
    if (chat?.id) {
      const nameParts = [user?.first_name, user?.last_name].filter(Boolean);
      const name = nameParts.length ? nameParts.join(" ") : (user?.username ? `@${user.username}` : "");
      const label = chat.title || name || (chat.username ? `@${chat.username}` : `Chat ${chat.id}`);
      return { ok: true, chatId: String(chat.id), label };
    }
  }
  throw new Error("No chat ID could be found in recent bot updates.");
}

async function sendImageToTelegramWithRetry(botToken, chatInput, blob, filename, caption = "", asDocument = false, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await sendImageToTelegram(botToken, chatInput, blob, filename, caption, asDocument);
    } catch (err) {
      const isLast = attempt >= maxAttempts;
      const msg = String(err?.message || "");
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("too many requests");
      const isAbortOrNetwork = msg.includes("aborted") || msg.includes("timed out") || msg.includes("Failed to fetch") || msg.includes("network");

      if (!isLast && (isRateLimit || isAbortOrNetwork)) {
        const waitMs = isRateLimit ? 5000 : 2500 * attempt;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

async function sendImageToTelegram(botToken, chatInput, blob, filename, caption = "", asDocument = false) {
  if (!botToken || !chatInput) throw new Error("Telegram Bot Token and Chat link/ID are required.");
  if (!(blob instanceof Blob) || !blob.size) throw new Error("Generated image is empty.");
  
  const token = botToken.trim();
  let targetChatId = await resolveTelegramChatId(token, chatInput);
  if (/^100\d{7,}$/.test(targetChatId)) {
    targetChatId = `-${targetChatId}`;
  }
  const isDocument = asDocument || blob.size > 9.8 * 1024 * 1024;
  const method = isDocument ? "sendDocument" : "sendPhoto";
  const url = `https://api.telegram.org/bot${token}/${method}`;

  const executeSend = async (chatIdToSend) => {
    const formData = new FormData();
    formData.append("chat_id", chatIdToSend);
    formData.append(isDocument ? "document" : "photo", blob, filename);
    if (caption) {
      formData.append("caption", caption.slice(0, 1024));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try { controller.abort(new Error("Telegram upload timed out after 120s")); } catch { controller.abort(); }
    }, 120000);
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        signal: controller.signal
      });
      const responseText = await response.text();
      let result;
      try { result = JSON.parse(responseText); }
      catch { throw new Error(`Telegram API returned non-JSON HTTP ${response.status}: ${responseText.slice(0, 200)}`); }
      return { ok: response.ok && result?.ok === true, result, status: response.status };
    } catch (fetchErr) {
      if (controller.signal.aborted) {
        throw new Error(controller.signal.reason?.message || "Telegram upload timed out after 120s");
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }
  };

  let sendResult = await executeSend(targetChatId);
  // Auto-retry with negative or -100 prefix if channel ID was missing minus
  if (!sendResult.ok && sendResult.result?.description?.toLowerCase().includes("chat not found")) {
    const candidates = [];
    if (/^100\d+$/.test(targetChatId)) candidates.push(`-${targetChatId}`);
    else if (/^\d{9,}$/.test(targetChatId)) {
      candidates.push(`-100${targetChatId}`);
      candidates.push(`-${targetChatId}`);
    }
    for (const altId of candidates) {
      const retryResult = await executeSend(altId);
      if (retryResult.ok) {
        return retryResult.result.result;
      }
    }
  }

  if (!sendResult.ok) {
    const desc = sendResult.result?.description || "Unknown error";
    const isChannel = targetChatId.startsWith("-100") || targetChatId.startsWith("-") || /^100\d+$/.test(targetChatId);
    const hint = isChannel
      ? " (For channels: Bot MUST be added as an Administrator with 'Post Messages' permission!)"
      : " (Make sure you clicked /start on the bot first, or use '⚡ Auto-detect my chat'!)";
    throw new Error(`Telegram API rejected send (${sendResult.result?.error_code || sendResult.status}): ${desc}${hint}`);
  }
  return sendResult.result.result;
}

async function testTelegramBot(botToken, chatInput) {
  if (!botToken) throw new Error("Bot Token is required.");
  const token = botToken.trim();
  const rawTarget = (chatInput || "").trim();
  
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const meText = await meRes.text();
  let meJson;
  try { meJson = JSON.parse(meText); }
  catch { throw new Error(`Telegram returned non-JSON: ${meText.slice(0, 120)}`); }
  if (!meJson.ok) throw new Error(`Invalid Bot Token: ${meJson.description || "Connection rejected"}`);
  
  const username = meJson.result?.username || meJson.result?.first_name || "Bot";
  
  if (rawTarget) {
    let targetChatId = await resolveTelegramChatId(token, rawTarget);
    if (/^100\d{7,}$/.test(targetChatId)) {
      targetChatId = `-${targetChatId}`;
    }

    let msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: `🤖 Connected to @${username}!\nGuc guy image delivery is active and working.`
      })
    });
    let msgText = await msgRes.text();
    let msgJson;
    try { msgJson = JSON.parse(msgText); }
    catch { throw new Error(`Telegram send returned non-JSON: ${msgText.slice(0, 120)}`); }

    // If chat not found, try alternative channel ID formats (-100... or -...)
    if (!msgJson.ok && msgJson.description?.toLowerCase().includes("chat not found")) {
      const candidates = [];
      if (/^100\d+$/.test(targetChatId)) candidates.push(`-${targetChatId}`);
      else if (/^\d{9,}$/.test(targetChatId)) {
        candidates.push(`-100${targetChatId}`);
        candidates.push(`-${targetChatId}`);
      }
      for (const altId of candidates) {
        try {
          const altRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: altId,
              text: `🤖 Connected to @${username}!\nGuc guy image delivery is active and working.`
            })
          });
          const altJson = await altRes.json();
          if (altJson.ok) {
            return { ok: true, username, resolvedChatId: String(altId), messageSent: true };
          }
        } catch {}
      }
    }

    if (!msgJson.ok) {
      const desc = msgJson.description || "Unknown error";
      const isChannel = targetChatId.startsWith("-100") || targetChatId.startsWith("-") || /^100\d+$/.test(targetChatId);
      const hint = isChannel
        ? " (Channel me send karne ke liye Bot ko apne Channel me 'Administrator' banana zaroori hai with 'Post Messages' permission!)"
        : " (Make sure you clicked /start on @${username} first, or click '⚡ Auto-detect my chat'!)";
      throw new Error(`Bot is valid (@${username}), but could not send to "${targetChatId}": ${desc}.${hint}`);
    }
    return { ok: true, username, resolvedChatId: String(targetChatId), messageSent: true };
  }
  
  return { ok: true, username, messageSent: false };
}

function flowReferenceFileName(record, fallback) {
  const {mimeType}=decodeDataUrl(record?.dataUrl);
  const extension=({"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif","image/avif":"avif"})[mimeType.toLowerCase()]||"img";
  const source=String(record?.name||fallback).trim();
  const base=source.replace(/\.[^.]+$/," ").trim().replace(/[\\/:*?"<>|]/g,"_").slice(0,120)||fallback;
  return `${base}.${extension}`;
}


async function uploadDataUrlToFlow(flow, dataUrl, fileName) {
  // Cache only within this run/project. The working adapter also reuses a
  // confirmed upload when identical image data occurs in multiple roles.
  if(!flow.referenceUploadCache || flow.referenceUploadCache.projectId!==flow.projectId) {
    flow.referenceUploadCache={projectId:flow.projectId,entries:new Map()};
  }
  const entries=flow.referenceUploadCache.entries;
  if(entries.has(dataUrl))return entries.get(dataUrl);
  const upload=(options={})=>FlowTabRecovery.run(flow,tabId=>uploadDataUrlToFlowUncached(flow,dataUrl,fileName,{...options,tabId}));
  const pending=(async()=>{
    if(flow.useNativeReferenceUpload)return FlowPageUpload.upload(flow,dataUrl,fileName);
    try {return await upload();}
    catch(error) {
      const originalSupported=/^data:image\/(?:jpe?g|png|webp);base64,/i.test(dataUrl);
      const stopped=typeof STATE!=='undefined'&&STATE.stopRequested;
      // A definite INVALID_ARGUMENT rejects this payload, not necessarily the
      // source image. Try the original source bytes once, with fresh request IDs
      // and security context. Never retry auth/policy or unknown-outcome errors.
      if(error.code!=='FLOW_UPLOAD_INVALID_ARGUMENT'||error.noRetry||stopped||!originalSupported||/PUBLIC_ERROR_|PERMISSION|SAFETY|POLICY/i.test(error.message))throw error;
      if(typeof log==='function')log(`Flow rejected the converted reference. Retrying ${fileName} once using the original image bytes and detected file type.`);
      try {return await upload({preserveOriginal:true});}
      catch(originalError) {
        if(originalError.code!=='FLOW_UPLOAD_INVALID_ARGUMENT'||originalError.noRetry||STATE.stopRequested||/PUBLIC_ERROR_|PERMISSION|SAFETY|POLICY/i.test(originalError.message))throw originalError;
        log('Both direct upload formats were rejected. Using Flow\'s own file-upload control for this reference; waiting for a confirmed server asset ID.');
        const mediaId=await FlowPageUpload.upload(flow,dataUrl,fileName);
        flow.useNativeReferenceUpload=true;
        return mediaId;
      }
    }
  })();
  entries.set(dataUrl,pending);
  try {return await pending;}
  catch(error){if(entries.get(dataUrl)===pending)entries.delete(dataUrl);throw error;}
}

async function uploadDataUrlToFlowUncached(flow, dataUrl, fileName, {preserveOriginal=false,tabId=flow.tabId}={}) {
  const traceId=makeFlowId(),events=[];
  let submitted=false;
  const emit=(step,detail={})=>events.push(FlowDiagnostics.record(traceId,step,{rpc:'maseQ',projectId:flow.projectId,fileName,preparation:preserveOriginal?'original-bytes':'normalized-jpeg',...detail}));
  flow.nativeUploadCount=(flow.nativeUploadCount||0)+1;
  try {
  emit('backend_upload_preparing');
  const image = await BigBombFlowRpc.prepareUploadImage(dataUrl, fileName, {preserveOriginal});
  emit('backend_upload_image_prepared',{mimeType:image.mimeType,byteLength:Math.floor(image.imageBytes.length*3/4)-(image.imageBytes.endsWith('==')?2:image.imageBytes.endsWith('=')?1:0)});
  // Keep a distinct stored filename for troubleshooting repeated source names.
  const extension=image.fileName.match(/\.[^.]+$/)?.[0]||'';
  const base=extension?image.fileName.slice(0,-extension.length):image.fileName;
  image.fileName=`${base.slice(0,80)}__${makeFlowId()}${extension}`;
  const requestId = makeFlowId().toUpperCase();
  const clientId = makeFlowId().toUpperCase();
  const challengeToken = await mintFlowRecaptchaToken(tabId, 'UPLOAD_IMAGE');
  await FlowRequestGuard.ready();
  const requestBody = BigBombFlowRpc.buildUploadRequest({
    projectId: flow.projectId, ...image, requestId, clientId, challengeToken
  });

  submitted=null;
  const result = await waitForGenerationOperation(chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async (fReq,projectId,operationId) => {
      const controller = new AbortController();
      (window.__gucUploadControllers ||= new Map()).set(operationId,controller);
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      let submitted=false,sentAt=null;
      try {
        if(location.origin!=='https://flow.google.com'||location.pathname.match(/\/project\/([^/]+)/)?.[1]!==projectId)throw Error('Flow project changed before backend upload.');
        const wiz = window.WIZ_global_data || {};
        const asString = (value) => typeof value === "string" && value ? value : null;
        const at = asString(wiz.SNlM0e);
        const buildLabel = asString(wiz.cfb2h);
        const sessionId = wiz.FdrFJe!=null?String(wiz.FdrFJe):'';
        if (!at || !buildLabel || !sessionId) {
          return {
            error: "Flow editor session metadata is not ready. Refresh the Flow project once.",
            code: "FLOW_RPC_SESSION_NOT_READY",submitted:false
          };
        }

        const authIndex = location.pathname.match(/\/u\/(\d+)/)?.[1] || '0';
        const query = new URLSearchParams({
          rpcids: "maseQ",
          "source-path": `/u/${authIndex}/`,
          bl: buildLabel,
          "f.sid": sessionId,
          hl: "en",
          _reqid: String(Math.floor(100000 + Math.random() * 900000)),
          rt: "c"
        });
        const form = new URLSearchParams();
        form.set("f.req", fReq);
        form.set("at", at);
        submitted=true;sentAt=new Date().toISOString();
        const response = await fetch(`/u/${authIndex}/_/AiSandboxAngularFrontend/data/batchexecute?${query}`, {
          method: "POST",
          credentials: "include",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "x-same-domain": "1"
          },
          body: form.toString()
        });
        const text = await response.text();
        if (!response.ok) {
          return { responseText:text, status:response.status, submitted,sentAt,receivedAt:new Date().toISOString() };
        }
        return { text,status:response.status,submitted,sentAt,receivedAt:new Date().toISOString() };
      } catch (error) {
        return {
          error: error?.name === "AbortError" ? "Timeout" : error.message,
          code: error?.name === "AbortError" ? "FLOW_RPC_TIMEOUT" : null,submitted,sentAt
        };
      } finally {
        clearTimeout(timeoutId);window.__gucUploadControllers?.delete(operationId);
      }
    },
    args: [requestBody,flow.projectId,traceId]
  }), () => chrome.scripting.executeScript({target:{tabId},world:"MAIN",func:id=>window.__gucUploadControllers?.get(id)?.abort(),args:[traceId]}));
  const response = result?.[0]?.result;
  submitted=response?.submitted??null;
  emit('backend_upload_result',{submitted,httpStatus:response?.status??null,sentAt:response?.sentAt||null,receivedAt:response?.receivedAt||null,responseCharacters:(response?.text||response?.responseText||'').length});
  if (!response?.text) {
    const serverError=response?.responseText!=null?`HTTP ${response.status}: ${BigBombFlowRpc.summarizeHttpFailure(response.responseText)}`:response?.error||'no response';
    const error = new Error(`Upload failed: ${serverError}`);
    const uncertain=submitted!==false&&(!response?.status||response.status>=200&&response.status<300);
    error.code = uncertain ? "FLOW_UPLOAD_OUTCOME_UNKNOWN" : response?.code || (response?.status === 401 || response?.status === 403
      ? "FLOW_AUTH_REQUIRED" : "FLOW_UPLOAD_FAILED");
    if(uncertain){error.noRetry=true;error.message+=' The upload may have reached Flow, but no asset was confirmed. Check the project before resuming.';}
    throw error;
  }
  try {
    const uploaded=BigBombFlowRpc.parseUploadResponse(response.text, flow.projectId),mediaId=uploaded.mediaId;
    // Flow may retain a canonical name for an existing asset. Searching our
    // newly requested filename in that case would look for a nonexistent name.
    const actualFileName=uploaded.fileName||image.fileName;
    (flow.referenceFiles||=(Object.create(null)))[mediaId]=actualFileName;
    (flow.referenceAssets||=(Object.create(null)))[mediaId]={...uploaded,fileName:actualFileName,requestedFileName:image.fileName};
    flow.referenceRevision=(flow.referenceRevision||0)+1;
    emit('backend_upload_confirmed',{mediaId,assetId:uploaded.assetId,storedName:actualFileName,requestedName:image.fileName});
    return mediaId;
  }
  catch(error){await FlowRequestGuard.rejected(error);throw error;}
  } catch(error) {
    if(submitted!==false&&!error.code){error.code='FLOW_UPLOAD_OUTCOME_UNKNOWN';error.noRetry=true;}
    if(submitted===false)error.notSubmitted=true;
    await FlowRequestGuard.rejected(error);
    emit('backend_upload_failed',{submitted,code:error.code||'FLOW_UPLOAD_FAILED',reason:error.message});
    await FlowDiagnostics.save({traceId,time:new Date().toISOString(),kind:'upload',projectId:flow.projectId,fileName,code:error.code||'FLOW_UPLOAD_FAILED',submitted,events});
    throw error;
  } finally {flow.nativeUploadCount--;}
}

async function uploadReferenceUntilSuccess(flow, dataUrl, fileName, label) {
  let attempt = 0;
  while (!STATE.stopRequested) {
    attempt += 1;
    try {
      setStatus(`Uploading ${label}...`);
      const mediaId = await uploadDataUrlToFlow(flow, dataUrl, fileName);
      const asset=flow.referenceAssets?.[mediaId];
      log(`Backend reference ready — ${label}; mediaId=${mediaId}; assetId=${asset?.assetId||'unavailable'}; storedName=${flow.referenceFiles?.[mediaId]||'unavailable'}; requestedName=${asset?.requestedFileName||fileName}; project=${flow.projectId}. Ready for the backend generation request.`,"success");
      return mediaId;
    } catch (error) {
      log(`${label} upload failed: ${error.message}`);
      if (!FlowRetry.decision(error,attempt).retry || ["FLOW_AUTH_REQUIRED", "FLOW_UPLOAD_INVALID_IMAGE", "FLOW_UPLOAD_INVALID_ARGUMENT"].includes(error.code)) throw error;
      if (!STATE.stopRequested) {
        // Each retry re-enters uploadDataUrlToFlow, which mints a fresh upload
        // challenge token and request/client IDs. Give Flow a short recovery
        // window instead of immediately repeating the same empty RPC response.
        const delayMs = Math.min(15000, 2500 * (2 ** (attempt - 1)));
        log(`Retrying ${label} upload (attempt ${attempt + 1}) with a fresh Flow upload token...`);
        await interruptibleWait(delayMs);
      }
    }
  }
  return null;
}

function makeFlowId() {
  if (self.crypto?.randomUUID) return self.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.random() * 16 | 0;
    return (char === "x" ? value : (value & 3) | 8).toString(16);
  });
}

async function generateFlowImage(flow, prompt, imageInputs, imageModel, aspectRatio, diagnosticContext) {
  const enumAspects = {
    IMAGE_ASPECT_RATIO_SQUARE:'1:1', IMAGE_ASPECT_RATIO_PORTRAIT:'9:16',
    IMAGE_ASPECT_RATIO_LANDSCAPE:'16:9', IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR:'3:4',
    IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE:'4:3'
  };
  const aspect=enumAspects[aspectRatio]||aspectRatio;
  const modelKey=imageModel||FLOW_IMAGE_MODEL;
  const model=FLOW_MODEL_API_IDS[modelKey]||modelKey;
  log(`Flow backend preparation requested: ${MODEL_DISPLAY_NAMES[modelKey]||modelKey}; ${aspect}; ${imageInputs.length} reference IDs. Request not sent yet.`);
  return FlowTabRecovery.run(flow,()=>FlowBackend.generate(flow,prompt,imageInputs,model,aspect,diagnosticContext));
}

async function requestFlowUpscale(flow, mediaId, quality) {
  const targetTabId = flow.tabId || flow.authTabId;
  const token = await mintFlowRecaptchaToken(targetTabId, 'IMAGE_GENERATION');
  await FlowRequestGuard.ready();
  const context = [null,22,null,null,null,null,null,null,null,null,[token,1]];
  const results = await chrome.scripting.executeScript({
    target:{tabId:targetTabId}, world:'MAIN',
    func:async (payload) => {
      try {
        const w = window.WIZ_global_data || {};
        if (!w.SNlM0e) throw new Error('Flow session is missing.');
        const account = location.pathname.match(/\/u\/(\d+)/)?.[1] || '0';
        const query = new URLSearchParams({rpcids:'SPrCad', 'source-path':'/u/'+account+'/', bl:String(w.cfb2h||''), 'f.sid':String(w.FdrFJe||''),hl:'en',_reqid:String(Math.floor(1e5+Math.random()*9e5)),rt:'c'});
        const response = await fetch('/u/'+account+'/_/AiSandboxAngularFrontend/data/batchexecute?'+query, {
          method:'POST',credentials:'include',signal:AbortSignal.timeout(180000),
          headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','X-Same-Domain':'1'},
          body:new URLSearchParams({'f.req':JSON.stringify([[['SPrCad',JSON.stringify(payload),null,'generic']]]),at:w.SNlM0e}).toString()
        });
        if (!response.ok) throw new Error('Upscale HTTP '+response.status);
        return {text:await response.text()};
      } catch(error) {return {error:error.message};}
    }, args:[[mediaId,quality==='4K'?2:1,context]]
  });
  const result = results?.[0]?.result;
  if (!result?.text) throw new Error(result?.error || 'Flow upscale returned no result.');
  let data;
  try {data = BigBombFlowRpc.parseRpcPayload(result.text,'SPrCad');}
  catch(error){await FlowRequestGuard.rejected(error);throw error;}
  let encoded = '';
  const scan = value => {
    if (typeof value === 'string' && value.length > 2000 && /^[A-Za-z0-9+/=_-]+$/.test(value) && value.length > encoded.length) encoded=value;
    else if (Array.isArray(value)) value.forEach(scan);
  };
  scan(data);
  if (!encoded) throw new Error(quality+' upscale returned no encoded image.');
  const mimeType = encoded.startsWith("iVBOR")
    ? "image/png"
    : encoded.startsWith("UklGR")
      ? "image/webp"
      : "image/jpeg";
  const dataUrl = encoded.startsWith("data:") ? encoded : `data:${mimeType};base64,${encoded}`;
  const imageResponse = await fetch(dataUrl);
  const blob = await imageResponse.blob();
  if (blob.size <= 1000) throw new Error(`${quality} upscale returned an invalid image`);
  const bitmap = await createImageBitmap(blob);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();
  return { blob, width, height };
}

let _4kAccessDenied = false;

async function fetchNativeFlowImage(flow,url) {
  const failures=[];
  // Signed image URLs can work without cookies when credentialed fetch fails.
  for (const credentials of ["include","omit"]) {
    try {
      const controller=new AbortController();
      const response=await waitForGenerationOperation(fetch(url,{credentials,cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])}),()=>controller.abort());
      if(response.ok) return response;
      failures.push(`extension/${credentials}: HTTP ${response.status}`);
    } catch(error) { if(STATE.stopRequested)throw error;failures.push(`extension/${credentials}: ${error.message}`); }
  }
  // Reuse the existing authenticated Labs tab; never send its token to an image host.
  if(Number.isInteger(flow.authTabId)) {
    try {
      const results=await FlowTabRecovery.run(flow,tabId=>chrome.scripting.executeScript({target:{tabId},func:async imageUrl=>{
        try {
          const response=await fetch(imageUrl,{credentials:"include",cache:"no-store",signal:AbortSignal.timeout(30000)});
          if(!response.ok)return {error:`HTTP ${response.status}`};
          const blob=await response.blob();
          const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error("Image read failed"));reader.readAsDataURL(blob);});
          return {dataUrl};
        } catch(error){return {error:error.message};}
      },args:[url]}),{readOnly:true});
      const result=results?.[0]?.result;
      if(result?.dataUrl) return await fetch(result.dataUrl);
      failures.push(`Labs tab: ${result?.error || "no result"}`);
    } catch(error){if(error.noRetry||STATE.stopRequested)throw error;failures.push(`Labs tab: ${error.message}`);}
  }
  let host="unknown";try{host=new URL(url).hostname;}catch{}
  throw Error(`Native image host ${host}: ${failures.join("; ")}`);
}

async function fetchMaximumQualityFlowImage(flow,mediaId,fifeUrl,{ preferUpscale = false, transport } = {}) {
  const originalResolution = transport === 'native-ui' || transport === 'backend-rpc';
  if(preferUpscale && originalResolution)log('Saving the resolution returned by Flow; no extra upscale pass is configured.');
  if (preferUpscale && mediaId && !originalResolution) {
    try {
      const upscaled = await requestFlowUpscale(flow,mediaId,"2K");
      log(`High-quality pass: received ${upscaled.width}×${upscaled.height} 2K image.`);
      return { ...upscaled,quality:"2K" };
    } catch (error) {
      log(`2K upscale unavailable; using native maximum-quality image: ${error.message}`);
    }
  }
  // FI​​FE URLs may be signed. Rewriting a signed native URL to =s2048 can
  // invalidate its signature and return 403, so always retain and try the exact
  // URL emitted by Flow as an authenticated fallback.
  if (fifeUrl) {
    const replaceFifeSize = (value,size) => {
      try {
        const parsed = new URL(value);
        parsed.pathname = /=[^/]+$/.test(parsed.pathname)
          ? parsed.pathname.replace(/=[^/]+$/,`=${size}`)
          : `${parsed.pathname}=${size}`;
        return parsed.toString();
      } catch {
        return value;
      }
    };
    const candidates = preferUpscale && !originalResolution ? [...new Set([
      fifeUrl,
      replaceFifeSize(fifeUrl,"s2048"),
      replaceFifeSize(fifeUrl,"s0")
    ])] : [fifeUrl];
    const failures = [];
    for (const url of candidates) {
      try {
        const response = await fetchNativeFlowImage(flow,url);
        if (!response.ok) {
          failures.push(`HTTP ${response.status}`);
          continue;
        }
        const blob = await waitForGenerationOperation(response.blob());
        if (blob.size <= 1000) {
          failures.push("invalid image body");
          continue;
        }
        const bitmap = await createImageBitmap(blob);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close?.();
        if (url === fifeUrl && candidates[0] !== fifeUrl) log("Signed maximum-size URL was unavailable; recovered the exact native Flow image URL.");
        return { blob, width, height, quality: width >= 1800 || height >= 1800 ? "2K" : "native" };
      } catch (error) {
        if(error.noRetry||STATE.stopRequested)throw error;
        failures.push(error?.message || "fetch failed");
      }
    }
    throw new Error(`Native Flow image download failed (${failures.join("; ")}).`);
  }
  throw new Error(`Flow could not deliver any image: No fifeUrl available.`);
}

// ---------------- Gemini Planning Tab ----------------

async function openFreshGeminiTab() {
  const url = "https://gemini.google.com/";
  const contentScript = "content_gemini.js";
  
  const tab = await chrome.tabs.create({ url, active: false });
  await chrome.tabs.update(tab.id,{autoDiscardable:false}).catch(()=>{});
  try {
  await waitForTabComplete(tab.id);
  
  let alive = false;
  for (let i = 0; i < 8 && !alive; i++) {
    try {
      const r = await chrome.tabs.sendMessage(tab.id, { type: "PING" });
      alive = !!r;
    } catch {}
    if (!alive) {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [contentScript] });
      } catch (e) {}
      await sleep(1500);
    }
  }
  if (!alive) throw new Error("The Gemini planning tab did not become ready.");
  return tab.id;
  } catch(error) {safeCloseTab(tab.id);throw error;}
}

function waitForTabComplete(tabId) {
  return new Promise((resolve, reject) => {
    let finished=false;
    const done=()=>{
      if(finished)return;finished=true;
      chrome.tabs.onUpdated.removeListener(l);
      clearTimeout(timer);resolve();
    };
    const timer = setTimeout(done,30000);
    function l(id, info) {
      if (id === tabId && info.status === "complete") {
        done();
      }
    }
    chrome.tabs.onUpdated.addListener(l);
    // The tab can finish before the listener attaches. Do not wait 30 seconds in that case.
    chrome.tabs.get(tabId).then(tab=>{if(tab.status==='complete')done();}).catch(()=>done());
  });
}

function sendToContent(tabId, payload, timeoutMs = 600000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("sendToContent timed out"));
    }, timeoutMs);
    
    chrome.tabs.sendMessage(tabId, payload, (resp) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
      if (!resp) return reject(new Error("No response from content script."));
      if (resp.error) return reject(new Error(resp.error));
      resolve(resp.result);
    });
  });
}

function requestGenerationStop() {
  if(!STATE.running && !StoryJobs.busy)return;
  STATE.stopRequested=true;
  setStatus('Stopping… cancelling active waits and saving progress.');
  chrome.runtime.sendMessage({type:'bb_stopping'}).catch(()=>{});
}

async function waitForGenerationOperation(pending, cancel) {
  let timer;
  try {
    return await Promise.race([pending,new Promise((_,reject)=>{
      const check=()=>{if(STATE.stopRequested){Promise.resolve().then(()=>cancel?.()).catch(()=>{});reject(Object.assign(Error('Generation stopped.'),{code:'FLOW_STOPPED',noRetry:true}));}};
      timer=setInterval(check,100);check();
    })]);
  } finally {clearInterval(timer);}
}

function safeCloseTab(tabId) {
  if (tabId) { try { chrome.tabs.remove(tabId).catch(()=>{}); } catch {} }
}

async function interruptibleWait(ms) {
  const until=Date.now()+ms;
  while(Date.now()<until) {if(STATE.stopRequested)throw Object.assign(Error('Generation stopped.'),{code:'FLOW_STOPPED',noRetry:true});await sleep(Math.min(500,until-Date.now()));}
}

async function runWithKeepalive(params) {
  const keepalive=setInterval(()=>chrome.runtime.getPlatformInfo().catch(()=>{}),20000);
  try {return await runGeneration(params);} finally {clearInterval(keepalive);}
}

async function withAutoRetry(label,operation,maxAttempts=3) {
  for(let attempt=1;attempt<=maxAttempts;attempt++) {
    if(STATE.stopRequested)throw Error('Generation stopped.');
    try {return await operation();} catch(error) {
      if(attempt===maxAttempts||STATE.stopRequested||/sign.in|log.in|choose.*account|quota|unusual.activity|verification|FLOW_GENERATION_OUTCOME_UNKNOWN/i.test(`${error.code} ${error.message}`))throw error;
      setStatus(`${label}: retry ${attempt+1}/${maxAttempts}…`);log(`${label}: ${error.message}`);
      await interruptibleWait(Math.min(15000,2000*2**(attempt-1)));
    }
  }
}

async function askGeminiWithRetry(payload) {
  return withAutoRetry('Gemini planner',async()=>{
    const tabId=await openFreshGeminiTab();
    const stopWatch=setInterval(()=>{if(STATE.stopRequested)safeCloseTab(tabId);},500);
    try {return await waitForGenerationOperation(sendToContent(tabId,payload,GEMINI_MESSAGE_ENVELOPE_MS),()=>safeCloseTab(tabId));}
    finally {clearInterval(stopWatch);safeCloseTab(tabId);}
  },payload.retryAttempts || 2);
}

// ---------------- Downloading ZIP ----------------

const EXPORT_DB_NAME = "GucGuy-exports";
const EXPORT_STORE_NAME = "files";
let offscreenCreationPromise = null;

function openExportDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(EXPORT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(EXPORT_STORE_NAME)) {
        database.createObjectStore(EXPORT_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open export storage"));
  });
}

async function storeExportBlob(key, blob) {
  const database = await openExportDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(EXPORT_STORE_NAME, "readwrite");
    transaction.objectStore(EXPORT_STORE_NAME).put(blob, key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Could not store export file"));
    transaction.onabort = () => reject(transaction.error || new Error("Export storage was aborted"));
  });
  database.close();
}

async function readExportBlob(key) {
  const database=await openExportDatabase();
  try {return await new Promise((resolve,reject)=>{
    const request=database.transaction(EXPORT_STORE_NAME,'readonly').objectStore(EXPORT_STORE_NAME).get(key);
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });} finally {database.close();}
}

async function ensureOffscreenDownloader() {
  const hasDocument = chrome.offscreen.hasDocument
    ? await chrome.offscreen.hasDocument()
    : (await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] })).length > 0;
  if (hasDocument) return;
  if (!offscreenCreationPromise) {
    offscreenCreationPromise = chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["BLOBS"],
      justification: "Create temporary Blob URLs for generated ZIP download.",
    }).finally(() => { offscreenCreationPromise = null; });
  }
  await offscreenCreationPromise;
}

async function downloadLargeBlob(blob, filename, saveAs = false) {
  if (!(blob instanceof Blob) || !blob.size) throw new Error(`Export ${filename} is empty.`);
  const key = `${Date.now()}-${makeFlowId()}`;
  await storeExportBlob(key, blob);
  await ensureOffscreenDownloader();
  const response = await chrome.runtime.sendMessage({ type: "BB_DOWNLOAD_BLOB", key, filename });
  if (!response?.ok || !response?.url) throw new Error(`Could not save ${filename}: ${response?.error || "download did not start"}`);
  
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url: response.url, filename, saveAs, conflictAction: "uniquify" }, (downloadId) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!downloadId) reject(new Error("Chrome returned no download ID"));
      else resolve(downloadId);
    });
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
