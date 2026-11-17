/* Direct Image owns its inputs and style-only presets; no portrait/body defaults. */
(function(root) {
  const styles = Object.freeze([
    {id:'original', label:'Original / No Style', description:'Follow your prompt without adding a preset look.', direction:''},
    {id:'natural', label:'Natural Phone Photo', description:'Everyday iPhone photo, real textures and available light.', direction:'Natural unfiltered iPhone photograph in standard Photo mode. Use available scene light, accurate white balance, true colors, readable surroundings and real material textures. No artificial portrait blur, studio polish, skin smoothing or added color grade.'},
    {id:'instagram', label:'Instagram / Classic', description:'Attractive personal Instagram photo with lively, believable colors.', direction:'Natural Instagram phone-photo aesthetic: clear, attractive personal iPhone image, easy unforced expression when people are present, rich but believable garment and setting colors, real textures and readable background. Keep the requested subject and setting. No campaign posing, plastic skin, fake bokeh or cinematic filter.'},
    {id:'candid', label:'Raw Candid / Subject Flow', description:'Spontaneous, unposed snapshot with ordinary light.', direction:'Raw candid handheld phone snapshot, spontaneous mid-action timing and unpolished framing. Ordinary available light, real skin and fabric textures, natural uneven exposure. No influencer staging, camera-ready posing, beauty lighting, forced blur or cinematic grading. Respect any explicit pose or camera request.'},
    {id:'photorealistic', label:'Natural Photorealism', description:'Clean camera realism with neutral colors and balanced exposure.', direction:'Neutral, clean, ungraded photorealism, accurate natural color and white balance, normal camera contrast, realistic materials and scene-appropriate exposure. No added warm cast, grain, vignette, bloom, fake bokeh, cinematic LUT or stylized effects.'},
    {id:'crime-noir', label:'Brooding Crime Drama', description:'Restrained colors, deliberate shadows and a tense film-still mood.', direction:'Photorealistic prestige crime-drama film still: quiet menace, restrained colors, industrial texture and deliberate shadows. Motivated low-key practical lighting and layered cinematic framing. Apply the mood without changing the requested subjects, era, clothing, location or time.'},
    {id:'grounded-thriller', label:'Grounded Thriller', description:'Natural colors and controlled cinematic tension.', direction:'Photorealistic grounded suspense, natural color, restrained contrast, quiet tension and believable cinematic framing. Use scene-appropriate motivated practical light, without exaggerated grading or stylized effects.'},
    {id:'warm-drama', label:'Warm Character Drama', description:'Gentle practical light, modest warmth and natural skin tones.', direction:'Photorealistic warm character-drama mood, natural skin tones, modest warmth and gentle motivated practical light. Expressive but grounded cinematic composition, without exaggerated orange grading. Preserve the requested scene and time.'},
    {id:'webtoon', label:'Webtoon Illustration', description:'Cinematic illustration, confident ink and expressive detail.', direction:'Polished cinematic Webtoon illustration with confident ink contours, full color, consistent shading, expressive acting when characters are present, realistic anatomy and detailed environments. Let the requested scene determine palette and lighting; do not force a dark/noir look or cute chibi proportions.'}
  ].map(Object.freeze));
  function sourceImage(value) {
    if (!value || typeof value.dataUrl !== 'string') return null;
    const match = value.dataUrl.match(/^data:image\/(png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/i);
    if (!match || match[2].length % 4 !== 0 || match[2].length * 3 / 4 - (match[2].match(/=+$/)?.[0].length || 0) > 8 * 1024 * 1024) return null;
    return {name:String(value.name || 'source.png').slice(0,180), dataUrl:value.dataUrl};
  }
  function validate(params) {
    const prompt = String(params.shortPrompt || '').trim();
    if (!prompt) throw Error('Write an image prompt first.');
    if (prompt.length > 6000) throw Error('Keep the prompt under 6,000 characters.');
    const mode = params.directMode || 'text-to-image';
    if (!['text-to-image','image-to-image'].includes(mode)) throw Error('Choose Text to Image or Image to Image.');
    const style = styles.find(item => item.id === (params.directStyle || 'original'));
    if (!style) throw Error('Choose an available image style.');
    const source = mode === 'image-to-image' ? sourceImage(params.directSource) : null;
    if (mode === 'image-to-image' && !source) throw Error('Add a PNG, JPEG, WebP, GIF or AVIF source image under 8 MB.');
    return {prompt, mode, style, source};
  }
  function normalize(params, config) {
    // Explicitly drop inputs from other sections even if a stale caller sends them.
    return {...params, shortPrompt:config.prompt, generationEngine:'direct',
      subjects:[], outfits:[], knowledge:[], quality:[], face:null, outfit:null, location:null,
      poseReference:null, physicalDetails:'', systemInstruction:'',
      tuneHeight:'', tuneWeight:'', tuneBust:'', tuneWaist:'', tuneHips:'', tuneNavel:''};
  }
  function build(config) {
    if (config.mode === 'text-to-image' && !config.style.direction) return config.prompt;
    const sections = [config.mode === 'image-to-image'
      ? 'Edit REFERENCE IMAGE 1 according to the user prompt. Preserve all content and details not requested to change, including identity, body proportions, clothing, objects and composition. A selected style changes the visual treatment only; explicit requested edits take priority.'
      : 'Create one image following the user prompt.'];
    sections.push('USER PROMPT:\n' + config.prompt);
    if (config.style.direction) sections.push('SELECTED STYLE — ' + config.style.label + ':\n' + config.style.direction + '\nApply this look only where compatible with the explicit subject, action, pose, composition and other details in the user prompt. Do not invent people or body traits because of a style preset.');
    return sections.join('\n\n');
  }
  const api = {styles, sourceImage, validate, normalize, build};
  root.DirectImage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
