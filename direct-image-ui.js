/* Separate saved draft and upload for the Direct Image section. */
const DirectImageUI = (() => {
  function create({byId, imageRecord, setupDropZone}) {
    const key = 'bb_direct_image_draft';
    const prompt = byId('directImagePrompt'), mode = byId('directImageMode'), style = byId('directImageStyle');
    let source = null, pendingUpload = false, revision = 0, saveQueue = Promise.resolve();
    for (const item of DirectImage.styles) {
      const option = document.createElement('option');
      option.value = item.id; option.textContent = item.label; style.appendChild(option);
    }
    function render() {
      byId('directImageUpload').hidden = mode.value !== 'image-to-image';
      byId('directImageStyleHint').textContent = DirectImage.styles.find(item => item.id === style.value)?.description || '';
      byId('directImagePromptHint').textContent = mode.value === 'image-to-image'
        ? 'Describe what to change in your image. Other details will be kept as close as possible.'
        : 'Describe anything you want to create. No reference image is needed.';
      const preview = byId('directImagePreview');
      if (source) preview.src = source.dataUrl; else preview.removeAttribute('src');
      preview.hidden = !source;
      byId('directImageDropZone').classList.toggle('has-image', Boolean(source));
      byId('directImageRemove').hidden = !source;
      byId('directImageFileName').textContent = pendingUpload ? 'Reading image…' : source?.name || 'PNG, JPEG, WebP, GIF or AVIF · up to 8 MB';
      byId('directImageUploadCopy').hidden = Boolean(source);
    }
    function save() {
      const draft = {prompt:prompt.value, mode:mode.value, style:style.value, source};
      saveQueue = saveQueue.then(() => chrome.storage.local.set({[key]:draft})).catch(error => {
        byId('directImageStatus').textContent = 'Could not save this draft: ' + error.message;
      });
      return saveQueue;
    }
    for (const input of [prompt, mode, style]) input.addEventListener('input', () => { render(); save(); });
    async function upload(file) {
      if (!file) return;
      const current = ++revision; pendingUpload = true; render();
      try {
        const record = DirectImage.sourceImage(await imageRecord(file));
        if (!record) throw Error('Choose a PNG, JPEG, WebP, GIF or AVIF image under 8 MB.');
        if (current !== revision) return;
        source = record; byId('directImageStatus').textContent = ''; await save();
      } catch (error) { if (current === revision) byId('directImageStatus').textContent = error.message; }
      finally { if (current === revision) { pendingUpload = false; render(); } }
    }
    byId('directImageFile').addEventListener('change', event => { upload(event.target.files?.[0]); event.target.value = ''; });
    setupDropZone('directImageDropZone', files => upload(files?.[0]));
    byId('directImageDropZone').addEventListener('click', () => byId('directImageFile').click());
    byId('directImageRemove').addEventListener('click', () => {
      revision++; pendingUpload = false; source = null; byId('directImageStatus').textContent = ''; render(); save();
    });
    render();
    return {
      async restore() {
        const saved = (await chrome.storage.local.get(key))[key] || {};
        prompt.value = typeof saved.prompt === 'string' ? saved.prompt.slice(0,6000) : '';
        mode.value = saved.mode === 'image-to-image' ? saved.mode : 'text-to-image';
        style.value = DirectImage.styles.some(item => item.id === saved.style) ? saved.style : 'original';
        source = DirectImage.sourceImage(saved.source); render();
      },
      request() {
        if (pendingUpload) throw Error('Wait for the image to finish loading.');
        const request = {type:'bb_direct_image_generate', workflowMode:'direct-image', generationEngine:'direct',
          shortPrompt:prompt.value.trim(), directMode:mode.value, directStyle:style.value,
          directSource:mode.value === 'image-to-image' ? source : null};
        DirectImage.validate(request); byId('directImageStatus').textContent = ''; return request;
      }
    };
  }
  return {create};
})();
