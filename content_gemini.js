(() => {
  if (window.__BIGBOMB_INJECTED__) return;
  window.__BIGBOMB_INJECTED__ = true;

  const overlay = document.createElement("div");
  overlay.id = "__bigbomb_overlay__";
  overlay.style.cssText = `
    position:fixed;z-index:2147483647;right:12px;bottom:12px;
    background:#0f0a1a;color:#c2d6ff;font:12px/1.4 system-ui,sans-serif;
    border:1px solid #7c5cfc;border-radius:8px;padding:8px 10px;max-width:320px;
    box-shadow:0 6px 20px rgba(0,0,0,.5);pointer-events:none;`;
  overlay.textContent = "BigBOMB (Gemini): ready";
  document.documentElement.appendChild(overlay);
  const setOverlay = (s) => { overlay.textContent = "BigBOMB: " + s; };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const COMPOSER_SELECTORS = [
    'rich-textarea .ql-editor',
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="prompt" i]',
    'div[contenteditable="true"]',
    'textarea[aria-label*="prompt" i]'
  ];
  const SEND_SELECTORS = [
    'button[aria-label*="Send" i]',
    'button[aria-label*="Submit" i]',
    '.send-button'
  ];

  const findFirst = (sels) => {
    for (const s of sels) {
      const el = deepQueryAll(s).find((node) => node.getClientRects().length && getComputedStyle(node).visibility !== "hidden");
      if (el) return el;
    }
    return null;
  };

  function deepQueryAll(selector,root=document,results=[]) {
    try { results.push(...root.querySelectorAll(selector)); } catch {}
    let elements = [];
    try { elements = root.querySelectorAll("*"); } catch {}
    for (const element of elements) {
      if (element.shadowRoot) deepQueryAll(selector,element.shadowRoot,results);
    }
    return results;
  }

  const waitFor = async (fn, { timeout = 60000, interval = 400 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const v = await fn();
        if (v) return v;
      } catch {}
      await sleep(interval);
    }
    throw new Error("Timeout waiting for Gemini UI element.");
  };

  async function setComposerText(text) {
    const el = await waitFor(() => findFirst(COMPOSER_SELECTORS), { timeout: 90000 });
    el.focus();
    if (el.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      el.innerHTML = "";
      const p = document.createElement("p");
      p.innerText = text;
      el.appendChild(p);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await sleep(500);
    return el;
  }

  async function clickSend() {
    const btn = await waitFor(() => {
      const b = findFirst(SEND_SELECTORS);
      if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return null;
      return b;
    }, { timeout: 90000 });
    btn.click();
    await sleep(300);
  }

  async function attachReferenceImages(referenceImages) {
    const references = (Array.isArray(referenceImages) ? referenceImages : []).filter((reference) => reference?.path || /^data:image\/(png|jpeg|webp|gif|avif);base64,/.test(reference?.dataUrl || ''));
    if (!references.length) return;
    setOverlay(`loading ${references.length} reference image${references.length===1?'':'s'}…`);
    const files = await Promise.all(references.map(async (reference,index) => {
      const response = await fetch(reference.dataUrl || chrome.runtime.getURL(reference.path));
      if (!response.ok) throw new Error(`Could not load packaged lettering reference ${index + 1} (${response.status}).`);
      const blob = await response.blob();
      return new File([blob],reference.name || `bigbomb-lettering-reference-${index + 1}.png`,{ type:blob.type || "image/png" });
    }));

    const findFileInput = () => {
      const inputs = deepQueryAll('input[type="file"]').filter(input=>!input.disabled);
      return inputs.find((input) => /image|png|jpe?g/i.test(input.accept || "")) || inputs[0] || null;
    };
    const visible=node=>node.getClientRects().length&&getComputedStyle(node).visibility!=="hidden";
    const previewImages=()=>deepQueryAll('img').filter(node=>visible(node)&&node.complete&&node.naturalWidth>0).map(node=>node.currentSrc||node.src);
    const originalPreviews=new Set(previewImages());
    const attachmentControls=()=>deepQueryAll('button,[role="button"]').filter(node=>visible(node)&&/remove.*(?:image|file|attachment)|(?:image|file|attachment).*remove/i.test(`${node.getAttribute('aria-label')||''} ${node.getAttribute('title')||''}`));
    const originalControls=new Set(attachmentControls());
    const previewLabels=()=>deepQueryAll('[aria-label],[title],img[alt]').filter(visible);
    const originalPreviewLabels=new Set(previewLabels());
    let confirmationPolls=0;
    const attachmentConfirmed=()=>{
      const newImages=previewImages().filter(src=>src&&!originalPreviews.has(src));
      const newControls=attachmentControls().filter(node=>!originalControls.has(node));
      const newPreviewLabels=previewLabels().filter(node=>!originalPreviewLabels.has(node)&&files.some(file=>`${node.getAttribute('aria-label')||''} ${node.getAttribute('title')||''} ${node.getAttribute('alt')||''}`.includes(file.name)));
      // Gemini renders attachment chips differently across UI builds: some
      // versions expose a loaded thumbnail, others expose only a remove button
      // or filename chip. Requiring a thumbnail AND a second control caused
      // false negatives even after the file had attached successfully.
      const confirmed=newImages.length>=files.length||newControls.length>=files.length||newPreviewLabels.length>=files.length;
      confirmationPolls=confirmed?confirmationPolls+1:0;
      return confirmationPolls>=3;
    };
    let input = findFileInput();
    if (!input) {
      const controls = deepQueryAll('button,[role="button"]');
      const uploadMenuButton = controls.find((control) => /open upload menu|attach|add files?|add image|upload/i.test(`${control.getAttribute("aria-label") || ""} ${control.getAttribute("title") || ""} ${control.innerText || ""}`));
      uploadMenuButton?.click();
      await sleep(900);
      input = await waitFor(findFileInput,{ timeout:20000,interval:300 });
    }
    if (!input) throw new Error("Gemini image uploader was not found.");

    setOverlay(`attaching ${files.length} reference image${files.length===1?'':'s'}…`);
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    const filesSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"files")?.set;
    if (filesSetter) filesSetter.call(input,transfer.files); else input.files = transfer.files;
    input.dispatchEvent(new Event("input",{ bubbles:true,composed:true }));
    input.dispatchEvent(new Event("change",{ bubbles:true,composed:true }));

    // FileList assignment alone is not proof of an uploaded image. Compare
    // loaded previews/remove controls against the pre-upload UI baseline.
    try {
      await waitFor(attachmentConfirmed,{ timeout:60000,interval:500 });
    } catch { throw new Error("GEMINI_ATTACHMENT_UNCONFIRMED: No new loaded image preview or attachment control was confirmed. No prompt was sent. Check the Gemini upload UI before retrying."); }
    await sleep(3000);
    setOverlay(`${files.length} lettering references attached`);
  }

  function getMessageBlocks() {
    // Select a single response layer; nested selectors otherwise count one answer twice.
    for (const selector of ['model-response', 'message-content', '.model-response-text']) {
      const blocks = deepQueryAll(selector).filter((node) => node.getClientRects().length);
      if (blocks.length) return blocks;
    }
    return [];
  }

  function getLastAssistantText() {
    const blocks = getMessageBlocks();
    if (!blocks.length) return "";
    const last = blocks[blocks.length - 1];
    const pres = [...last.querySelectorAll("pre")];
    if (pres.length) return pres.map((c) => c.innerText).join("\n").trim();
    return last.innerText.trim();
  }

  function textOnlyPlannerPrompt(prompt, correction=false) {
    return `TEXT-ONLY PLANNING TASK — RETURN JSON TEXT.
You are the planning component of an application. A separate Google Flow component will render the images later. Your only deliverable here is the requested JSON document containing written prompts or storyboard data.
Do not generate, draw, render, edit or attach any image. Do not use image-generation tools, Canvas or an image-creation mode. Any attached images are for visual analysis only. Image-making language inside the brief describes the later Flow job, not an action for you to perform.
${correction?'CORRECTION: The last response used image generation. Stop that task and provide the complete requested JSON as text instead.':''}
BEGIN PLANNING BRIEF
${String(prompt || '')}
END PLANNING BRIEF
Now write only the complete JSON requested in the brief. Keep visual instructions inside JSON strings. No generated images, image links, prose introduction or markdown fences.`;
  }

  async function ensureTextPlanningMode() {
    const visible=node=>node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
    const selectedImageTools=()=>deepQueryAll('[aria-pressed="true"],[aria-selected="true"],[data-test-id="selected-tool"],[data-testid="selected-tool"]').filter(node=>visible(node)&&/create images?|image generation|generate images?|चित्र बनाएं|इमेज बनाएं/i.test(`${node.getAttribute('aria-label')||''} ${node.innerText||''}`));
    for(const tool of selectedImageTools()) {
      const remove=[...tool.querySelectorAll('button,[role="button"]')].find(node=>visible(node)&&/remove|close|deselect|clear/i.test(`${node.getAttribute('aria-label')||''} ${node.getAttribute('title')||''}`));
      if(remove)remove.click();
      else if(tool.getAttribute('aria-pressed')==='true'&&tool.matches('button,[role="button"]'))tool.click();
    }
    await sleep(200);
    if(selectedImageTools().length)throw Error('GEMINI_IMAGE_MODE_ACTIVE: Switch Gemini to normal chat; the planner requires JSON text. No planning request was sent.');
  }

  function lastResponseIsImageGeneration() {
    const blocks=getMessageBlocks(),last=blocks[blocks.length-1];
    if(!last)return false;
    const text=getLastAssistantText();
    if(looksLikeCompleteJson(text))return false;
    if(last.querySelector('generated-image,image-generation,[data-test-id*="generated-image"],[data-testid*="generated-image"]'))return true;
    if([...last.querySelectorAll('img')].some(img=>img.getClientRects().length&&img.naturalWidth>=200&&img.naturalHeight>=200))return true;
    return /^(?:creating|generating|drawing|rendering)\s+(?:your\s+|an?\s+)?(?:images?|pictures?|photos?|illustrations?)\b/i.test(text.trim());
  }

  function isGeminiGenerating() {
    const indicators = [
      'message-loading', '.generating-indicator',
      '[aria-label="Generating"]', '.loading-spinner',
      'mat-progress-bar', '.progress-bar'
    ];
    for (const sel of indicators) {
      if ([...document.querySelectorAll(sel)].some(indicator=>indicator.getClientRects().length&&getComputedStyle(indicator).visibility!=='hidden')) return true;
    }
    if ([...document.querySelectorAll('button[aria-label*="Stop" i]')].some(button=>button.getClientRects().length&&getComputedStyle(button).visibility!=='hidden')) return true;
    return false;
  }

  function looksLikeCompleteJson(text) {
    const value = String(text || "").trim().replace(/```\s*$/i, "").trim();
    if (!value.endsWith("]") && !value.endsWith("}")) return false;
    const start = value.search(/[\[{]/);
    if (start < 0) return false;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < value.length; index++) {
      const char = value[index];
      if (escaped) { escaped = false; continue; }
      if (char === "\\" && inString) { escaped = true; continue; }
      if (char === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (char === "{" || char === "[") depth++;
      if (char === "}" || char === "]") depth--;
      if (depth < 0) return false;
    }
    return depth === 0 && !inString;
  }

  async function waitForResponseDone(timeoutMs) {
    const start = Date.now();
    let lastText = "";
    let unchangedCount = 0;
    let lastProgress = start;
    while (Date.now() - start < timeoutMs) {
      const currentText = getLastAssistantText();
      if(lastResponseIsImageGeneration())throw Error('GEMINI_IMAGE_RESPONSE: Gemini started image generation instead of returning the text plan.');
      const isGenerating = isGeminiGenerating();
      if (currentText && currentText === lastText) {
        unchangedCount++;
        if (!isGenerating && looksLikeCompleteJson(currentText) && unchangedCount >= 2) return;
        if (!isGenerating && unchangedCount >= 12) return;
        if (isGenerating && looksLikeCompleteJson(currentText) && unchangedCount >= 6) return;
      } else if(currentText !== lastText) {
        lastText = currentText;
        unchangedCount = 0;
        lastProgress=Date.now();
      }
      if(Date.now()-lastProgress>180000)throw Error('GEMINI_RESPONSE_STALLED: No new response text for 3 minutes. Retrying the planner.');
      await sleep(500);
    }
    throw new Error(`Gemini did not finish within ${Math.round(timeoutMs / 60000)} minutes.`);
  }

  async function askText(prompt, timeoutMs, referenceImages=[]) {
    setOverlay("preparing text-only planner…");
    await ensureTextPlanningMode();
    await setComposerText(textOnlyPlannerPrompt(prompt));
    await attachReferenceImages(referenceImages);
    for(let attempt=0;attempt<2;attempt++) {
      await ensureTextPlanningMode();
      const beforeCount = getMessageBlocks().length;
      setOverlay("requesting JSON text…");
      await clickSend();
      try {
        await waitFor(() => getMessageBlocks().length > beforeCount, { timeout: 120000 });
        await waitForResponseDone(timeoutMs);
        if(lastResponseIsImageGeneration())throw Error('GEMINI_IMAGE_RESPONSE: Expected a JSON text plan.');
        setOverlay("text plan received");
        return getLastAssistantText();
      } catch(error) {
        if(!/GEMINI_IMAGE_RESPONSE/.test(error.message)||attempt)throw error;
        setOverlay("correcting Gemini to JSON text…");
        findFirst(['button[aria-label*="Stop" i]'])?.click();
        await waitFor(()=>!isGeminiGenerating(),{timeout:15000,interval:300});
        await ensureTextPlanningMode();
        await setComposerText(textOnlyPlannerPrompt(prompt,true));
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
      try {
        if (msg.type === "PING") return sendResponse({ result: "pong" });
        if (msg.type === "ASK_TEXT") {
          const result = await askText(msg.prompt, msg.timeoutMs || 1200000, msg.referenceImages || []);
          return sendResponse({ result });
        }
        sendResponse({ error: "Unknown message type" });
      } catch (e) {
        setOverlay("ERROR: " + (e?.message || e));
        sendResponse({ error: e?.message || String(e) });
      }
    })();
    return true;
  });

  console.log("[BigBOMB] Gemini content script ready on", location.href);
})();
