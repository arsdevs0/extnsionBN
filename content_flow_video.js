/* Native Flow video composer. It drives the visible composer and observes its own result. */
(() => {
  const version = "1.0.5";
  if (window.GucFlowVideoNative?.version?.() === version) return;
  const jobs = new Map();
  let armed = null;
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  // Material icons contain ligature text (videocam, crop_9_16, etc.).
  // Strip those nodes without losing the actual label next to them.
  const controlText = el => {
    if (!el) return "";
    const copy = el.cloneNode(true);
    copy.querySelectorAll('mat-icon,.material-icons,.material-symbols-outlined,[aria-hidden="true"]').forEach(node => node.remove());
    return clean(copy.textContent);
  };
  const label = el => clean(el?.getAttribute("aria-label") || controlText(el));
  const editor = () => document.querySelector('.ProseMirror[contenteditable="true"]');
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const buttons = () => [...document.querySelectorAll("button")].filter(visible);
  const button = name => buttons().find(el => label(el) === name);
  const modeControls = () => [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="tab"],[role="menuitem"],[role="option"],mat-button-toggle')].filter(el => visible(el) && !(el.tagName === "MAT-BUTTON-TOGGLE" && el.querySelector('button,[role="radio"]')));
  const modeControl = () => modeControls().find(el => /^(?:video\b|text to video\b|image to video\b|ingredients to video\b)/i.test(label(el)));
  const videoModelName = name => /^(?:veo\b|gemini omni\b|omni\b)/i.test(name);
  const videoModelControl = el => videoModelName(label(el)) || videoModelName(controlText(el));
  const modeSelected = el => el?.getAttribute("aria-checked") === "true" || el?.getAttribute("aria-selected") === "true" || el?.getAttribute("aria-pressed") === "true" || el?.getAttribute("data-state") === "checked" || /\b(?:selected|active|checked)\b/i.test(el?.className || "");
  const selectedAgent = () => {
    const agent=button("Agent");
    if(!agent)return null;
    let node=agent;
    for(let depth=0;node&&depth<4;depth++,node=node.parentElement)if(modeSelected(node))return agent;
    return null;
  };
  const controlsEvidence = () => modeControls().slice(0,32).map(el=>({label:label(el),tag:el.tagName,role:el.getAttribute("role"),pressed:el.getAttribute("aria-pressed"),checked:el.getAttribute("aria-checked"),selected:el.getAttribute("aria-selected"),state:el.getAttribute("data-state"),className:String(el.className||"").slice(0,100)}));
  const ingredientsButton = () => buttons().find(el => label(el) === "Add ingredients to the prompt box" || /add ingredients/i.test(label(el)));
  const menuItems = () => [...document.querySelectorAll('[role="menuitem"],[role="option"]')].filter(visible);
  const assetList = () => [...document.querySelectorAll('[role="listbox"]')].find(visible);
  const assetSearch = () => [...document.querySelectorAll("input")].find(el => visible(el) && /search assets/i.test(`${el.getAttribute("aria-label") || ""} ${el.placeholder || ""}`));
  const chips = () => [...document.querySelectorAll('flow-image-ingredient-chip,flow-video-ingredient-chip,[data-testid*="ingredient-chip"]')].filter(visible).map(chip => {
    const id = chip.getAttribute("data-media-id") || chip.querySelector("[data-media-id]")?.getAttribute("data-media-id");
    if (id) return id;
    const src = chip.querySelector("img,video")?.currentSrc || chip.querySelector("img,video")?.src || "";
    return src.match(/\/(?:image|video|media)\/([^/?]+)/)?.[1] || "";
  }).filter(Boolean);
  const fileStem = value => String(value || "").normalize("NFC").replace(/[\u200b-\u200d\ufeff]/g, "").trim().replace(/\.[^.]+$/, "");
  function check(job) {
    if (job.cancelled) throw Error("Video generation stopped before Flow submission.");
    if (location.origin !== "https://flow.google.com" || location.pathname.match(/\/project\/([\w-]+)/)?.[1] !== job.projectId) throw Error("Flow project changed before video submission.");
  }
  async function wait(job, test, what, timeout = 20000) {
    const until = Date.now() + timeout;
    job.waitingFor = what;
    while (Date.now() < until) { check(job); const value = test(); if (value) { job.waitingFor = null; return value; } await pause(150); }
    throw Error(`Flow video composer: ${what} did not become ready. ${job.clicked ? "Check the Flow project before retrying." : "Nothing was submitted."}`);
  }
  async function click(job, el, what) { const target = await wait(job, () => el(), what); check(job); target.click(); return target; }
  function fill(el, value) {
    if (el instanceof HTMLInputElement) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  async function selectVideoMode(job) {
    // Agent has a separate prompt flow and does not expose the standard Video
    // mode picker. Switch back to the standard composer before touching models.
    const agent = selectedAgent();
    if (agent) {
      agent.click();
      await wait(job, () => !selectedAgent(), "standard prompt composer", 12000);
    }

    // Current Flow puts Mode, model family and aspect in one settings panel.
    // Open it before looking for controls that only exist inside that panel.
    let option = modeControl();
    if (!option && button("Settings trigger")) {
      await click(job, () => button("Settings trigger"), "video settings");
      option = await wait(job, modeControl, "Video mode in Flow settings", 12000);
    }
    if (!option) {
      const visibleControls = () => modeControls().map(label).filter(Boolean).slice(0, 24).join(" · ") || "none";
      const selector = await wait(job, modelControl, `Flow model selector (visible controls: ${visibleControls()})`, 12000);
      if (videoModelControl(selector)) return;
      selector.click();
      await pause(250);
      const controls = visibleControls();
      option = await wait(job, modeControl, `Video option in Flow model menu (visible controls: ${controls})`, 12000);
    }
    if (!modeSelected(option)) option.click();
    await wait(job, () => modeSelected(modeControl()) || (!modeControl() && videoModelControl(modelControl())), "Video mode selection", 12000);
  }
  function modelControl() {
    return modeControls().find(el => /\b(?:select|choose) model(?: family)?\b/i.test(label(el)) && !/settings|more options/i.test(label(el))) || modeControls().find(videoModelControl) || modeControls().find(el => /^nano banana\b/i.test(label(el)));
  }
  function modelOptions() {
    return menuItems().map(el => ({ el, name: label(el) })).filter(item => item.name && !/^(more|back|settings)$/i.test(item.name));
  }
  function wantedModelMatch(option, requested) {
    const name = option.toLowerCase();
    if (!requested || requested === "flow-auto") return false;
    if (requested === "omni-1-2") return /omni\s*1\.2|omni\s*1,2/i.test(name);
    if (requested === "omni-flash") return /omni.*flash|flash.*omni/i.test(name);
    if (requested === "veo-31-fast") return /veo\s*3\.1.*fast/i.test(name);
    if (requested === "veo-31-quality") return /veo\s*3\.1.*(quality|high quality)/i.test(name);
    return false;
  }
  async function chooseModel(job) {
    const current = modelControl();
    if (!current) throw Error("Flow's video model selector was not found.");
    const currentName = controlText(current);
    if (job.model === "flow-auto" && videoModelName(currentName)) {
      job.selectedModel = currentName;
      return;
    }
    current.click();
    const options = await wait(job, () => modelOptions().length ? modelOptions() : null, "available video models", 12000);
    job.availableModels = options.map(item => item.name).slice(0, 24);
    if (job.model === "flow-auto") {
      const available = options.find(item => item.name.toLowerCase() === currentName.toLowerCase());
      if (!available) throw Error("Flow did not expose a selectable video model.");
      job.selectedModel = available.name;
      available.el.click();
      await wait(job, () => !menuItems().length, "video model selection");
      return;
    }
    const matches = options.filter(item => wantedModelMatch(item.name, job.model));
    if (matches.length !== 1) throw Object.assign(Error(`Requested video model is not uniquely available in this Flow account. Available: ${job.availableModels.join(" · ") || "none found"}`), { code: "FLOW_VIDEO_MODEL_UNAVAILABLE", noRetry: true });
    job.selectedModel = matches[0].name;
    matches[0].el.click();
    await wait(job, () => !menuItems().length, "video model selection");
  }
  function exactAsset(reference) {
    const options = [...(assetList()?.querySelectorAll('[role="option"]') || [])].filter(visible);
    const byId = options.filter(el => [el.getAttribute("data-media-id"), ...[...el.querySelectorAll("[data-media-id]")].map(n => n.getAttribute("data-media-id"))].includes(reference.mediaId));
    if (byId.length === 1) return byId[0];
    const byName = options.filter(el => {
      const ids = [el.getAttribute("data-media-id"), ...[...el.querySelectorAll("[data-media-id]")].map(n => n.getAttribute("data-media-id"))].filter(Boolean);
      if (ids.length && !ids.includes(reference.mediaId)) return false;
      return [label(el), el.getAttribute("title"), el.getAttribute("aria-label"), ...[...el.querySelectorAll("[title],[aria-label],.asset-title")].map(label)].some(v => fileStem(v) === fileStem(reference.fileName));
    });
    return byName.length === 1 ? byName[0] : null;
  }
  async function attach(job, reference, index) {
    const before = chips();
    await click(job, ingredientsButton, "Add ingredients");
    const search = await wait(job, assetSearch, "reference search");
    fill(search, reference.fileName);
    const option = await wait(job, () => exactAsset(reference), `exact reference ${reference.fileName}`, 12000);
    option.click();
    await wait(job, () => chips().length > before.length, `reference ${index + 1} attachment`, 30000);
    const now = chips();
    if (now.length !== before.length + 1 || now.at(-1) !== reference.mediaId) throw Object.assign(Error(`Flow attached the wrong video reference at position ${index + 1}. Nothing was submitted.`), { code: "FLOW_REFERENCE_MISMATCH", noRetry: true });
    if (assetList()) { const close = ingredientsButton(); close?.click(); await wait(job, () => !assetList(), "reference picker close"); }
  }
  async function prepare(job) {
    check(job);
    job.events.push({step:"composer_controls_initial",time:new Date().toISOString(),detail:{controls:controlsEvidence()}});
    const promptEditor = await wait(job, editor, "video prompt editor", 45000);
    if (promptEditor.innerText.trim() && promptEditor.innerText.trim() !== job.prompt) throw Error("The Flow project has unsaved composer text. Use a fresh Flow project.");
    await selectVideoMode(job);
    await chooseModel(job);
    // Uploaded references are ingredients; do not inherit a previous Frames
    // selection, which exposes a different attachment UI.
    if (job.references.length) {
      const ingredients = modeControls().find(el => label(el) === "Ingredients");
      if (ingredients && !modeSelected(ingredients)) {
        ingredients.click();
        await wait(job, () => modeSelected(modeControls().find(el => label(el) === "Ingredients")), "video ingredients mode", 12000);
      }
    }
    const aspectLabel = job.aspect === "VIDEO_ASPECT_RATIO_PORTRAIT" ? "9:16" : "16:9";
    const aspectOptions = () => modeControls().filter(el => clean(label(el)) === aspectLabel);
    if (!aspectOptions().length) {
      await click(job, () => button("Settings trigger"), "video preferences");
    }
    const aspect = await wait(job, () => aspectOptions()[0], `${aspectLabel} video frame option`, 12000);
    if (!modeSelected(aspect)) aspect.click();
    await wait(job, () => modeSelected(aspectOptions()[0]), `${aspectLabel} video frame selection`, 12000);
    const singleOutput = modeControls().find(el => label(el) === "x1");
    if (singleOutput && !modeSelected(singleOutput)) {
      singleOutput.click();
      await wait(job, () => modeSelected(modeControls().find(el => label(el) === "x1")), "one video output", 12000);
    }
    if (button("Settings trigger") && aspectOptions().length) button("Settings trigger").click();
    for (const [index, reference] of job.references.entries()) await attach(job, reference, index);
    job.referenceIds = chips();
    if (JSON.stringify(job.referenceIds) !== JSON.stringify(job.references.map(ref => ref.mediaId))) throw Object.assign(Error("The attached references changed before video submission."), { code: "FLOW_REFERENCE_MISMATCH", noRetry: true });
    const target = editor(); target.focus();
    const range = document.createRange(); range.selectNodeContents(target); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    if (!document.execCommand("insertText", false, job.prompt)) throw Error("Flow could not accept the video prompt.");
    await wait(job, () => editor()?.innerText.trim() === job.prompt.trim(), "complete video prompt");
    job.stage = "ready";
  }
  function containsPrompt(value, prompt) {
    // Compare decoded strings: JSON.stringify escapes the newlines and quotes
    // in QID's prepared prompt, hiding an otherwise matching submission.
    if (typeof value === "string") return value.includes(prompt);
    if (Array.isArray(value)) return value.some(item => containsPrompt(item, prompt));
    if (value && typeof value === "object") return Object.values(value).some(item => containsPrompt(item, prompt));
    return false;
  }
  function matchingRequest(body, url, job = armed) {
    if (!job || armed !== job || !String(url || "").includes("batchexecute")) return false;
    try {
      const text = new URLSearchParams(String(body || "")).get("f.req");
      const batch = JSON.parse(text);
      const rows = [];
      const visit = value => {
        if (!Array.isArray(value)) return;
        if (typeof value[0] === "string" && typeof value[1] === "string") rows.push(value);
        for (const child of value) if (Array.isArray(child)) visit(child);
      };
      visit(batch);
      const row = rows.find(item => item[0] !== "ogiZ0b" && containsPrompt(JSON.parse(item[1]), job.prompt));
      if (!row) return false;
      const payload = JSON.parse(row[1]);
      const raw = JSON.stringify(payload);
      if (!job.references.every(reference => raw.includes(reference.mediaId))) return false;
      armed = null; job.submitted = true; job.rpc = row[0]; job.stage = "processing"; job.processingAt = Date.now();
      job.events.push({ step: "video_request_observed", time: new Date().toISOString(), detail: { rpc: job.rpc, references: job.references.length, model: job.selectedModel || "Flow selected" } });
      return true;
    } catch { return false; }
  }
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === "string" ? input : input?.url || String(input);
    const target = armed;
    let requestBody = init?.body;
    let bodyPromise = null;
    if (target && requestBody === undefined && input instanceof Request) { try { bodyPromise = input.clone().text(); } catch {} }
    const matched = matchingRequest(requestBody, url, target);
    const result = originalFetch.apply(this, arguments);
    if (matched) result.then(response => response.clone().text().then(text => { target.httpStatus = response.status; target.responseCharacters = text.length; target.responseText = text.slice(0, 20000); if (response.status < 200 || response.status >= 300) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = `Flow video request returned HTTP ${response.status}.`; } else if (/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = "Flow rejected the video request: " + (text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0] || "account permission or quota error"); } }).catch(() => {}), error => { target.stage = "failed"; target.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; target.error = `Flow video request connection failed: ${error.message}`; });
    else if (bodyPromise) bodyPromise.then(body => { if (matchingRequest(body, url, target)) result.then(response => response.clone().text().then(text => { target.httpStatus = response.status; target.responseCharacters = text.length; target.responseText = text.slice(0, 20000); if (response.status < 200 || response.status >= 300) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = `Flow video request returned HTTP ${response.status}.`; } else if (/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = "Flow rejected the video request: " + (text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0] || "account permission or quota error"); } }).catch(() => {}), error => { target.stage = "failed"; target.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; target.error = error.message; }); }).catch(() => {});
    return result;
  };
  const xhrUrls = new WeakMap(), xhrOpen = XMLHttpRequest.prototype.open, xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) { xhrUrls.set(this, String(url)); return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function(body) {
    const target = armed, matched = matchingRequest(body, xhrUrls.get(this), target);
    if (matched) this.addEventListener("loadend", () => { const text=String(this.responseText||"");target.httpStatus=this.status;target.responseCharacters=text.length;target.responseText=text.slice(0,20000);if(this.status<200||this.status>=300||/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)){target.stage="failed";target.code="FLOW_VIDEO_REJECTED";target.error=`Flow video request was rejected: ${text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0]||`HTTP ${this.status}`}.`;} }, { once: true });
    return xhrSend.apply(this, arguments);
  };
  function resultVideo(job) {
    const videos = [...document.querySelectorAll("video")].filter(el => (el.currentSrc || el.src || el.querySelector("source")?.src) && !job.initialVideoSources.has(el.currentSrc || el.src || el.querySelector("source")?.src));
    const element = videos.find(el => /^https:\/\//.test(el.currentSrc || el.src || el.querySelector("source")?.src || ""));
    if (!element) return null;
    return { url: element.currentSrc || element.src || element.querySelector("source")?.src, duration: Number.isFinite(element.duration) ? element.duration : null };
  }
  function fail(job, error) { job.stage = "failed"; job.error = error.message; job.code = error.code || (job.clicked ? "FLOW_VIDEO_OUTCOME_UNKNOWN" : "FLOW_VIDEO_NOT_SUBMITTED"); if (armed === job) armed = null; }
  window.GucFlowVideoNative = {
    version: () => version,
    begin(config) {
      if ([...jobs.values()].some(job => ["preparing", "ready", "armed", "processing"].includes(job.stage))) return { error: "A Flow video composer is already active." };
      const job = { ...config, stage: "preparing", clicked: false, submitted: false, events: [], initialVideoSources: new Set([...document.querySelectorAll("video")].map(el => el.currentSrc || el.src || el.querySelector("source")?.src).filter(Boolean)) };
      jobs.set(job.id, job); prepare(job).catch(error => fail(job, error)); return { ok: true };
    },
    submit(id) {
      const job = jobs.get(id); if (!job || job.stage !== "ready") return { error: "The Flow video composer is not ready." };
    const generate = buttons().find(el => /^(start generation|generate|generate video|create video)$/i.test(label(el)) && !el.disabled && el.getAttribute("aria-disabled") !== "true");
      if (!generate) return { error: "Flow's video Generate button is not ready." };
      job.clicked = true; job.stage = "armed"; armed = job; generate.click(); return { ok: true };
    },
    status(id) {
      const job = jobs.get(typeof id === "string" ? id : id.id); if (!job) return null;
      if (job.stage === "processing") {
        const result = resultVideo(job);
        if (result) { job.videoUrl = result.url; job.duration = result.duration; job.stage = "done"; }
        else if (Date.now() - job.processingAt > 8 * 60 * 1000) { job.stage = "failed"; job.error = "Flow accepted the request but its video did not appear in the project within 8 minutes. Open the Flow project and inspect it before retrying."; job.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; }
      }
      return { version, stage: job.stage, clicked: job.clicked, submitted: job.submitted, waitingFor: job.waitingFor || null, error: job.error || null, code: job.code || null, videoUrl: job.videoUrl || null, duration: job.duration || null, selectedModel: job.selectedModel || null, availableModels: job.availableModels || [], rpc: job.rpc || null, httpStatus: job.httpStatus || null, responseText: job.responseText || "", events: job.events.slice(-25) };
    },
    cancel(id) { const job = jobs.get(id); if (job && !job.clicked) { job.cancelled = true; fail(job, Error("Video generation stopped before submission.")); } },
    forget(id) { const job = jobs.get(id); if (job && !["preparing", "ready", "armed", "processing"].includes(job.stage)) jobs.delete(id); }
  };
})();
