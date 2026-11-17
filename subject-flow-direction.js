/* Subject Flow only. Saved user inputs are never mutated. */
const SubjectFlowDirection = (() => {
  const figureDirection = typeof module !== 'undefined' ? require('./figure-direction.js') : FigureDirection;
  function figure({physical='',tuning=''}={}) {
    return figureDirection.build({physical,tuning});
  }
  function prepare(value) {
    // Preserve the user's exact wording. Rewriting camera, action, or pose terms
    // here can silently contradict the requested target.
    return String(value || '').trim();
  }

  const VARIATION_CUES = [
    'Choose a distinct, story-appropriate body action and hand placement; keep the requested target unchanged.',
    'Show a different natural moment in the same scene, with a clearly different weight shift and interaction.',
    'Use a fresh, believable action beat that fits the target and setting; do not repeat another image’s pose.',
    'Vary the subject’s body orientation and attention naturally while preserving every target detail.',
    'Capture a new moment in the action with purposeful hands, believable balance, and a distinct silhouette.',
    'Create a meaningfully different candid beat that remains fully consistent with the target and references.'
  ];

  function createVariationSequence(count = 5, poseCue = "") {
    if(poseCue)return Array.from({length:count},()=>poseCue);
    const result = [];
    while (result.length < count) {
      const cycle = VARIATION_CUES.slice();
      for (let i = cycle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cycle[i], cycle[j]] = [cycle[j], cycle[i]];
      }
      result.push(...cycle.slice(0, count - result.length));
    }
    return result;
  }

  function directPlan({ count = 5, target = '', system = '', environmentCount = 0 }) {
    const preparedTarget = prepare(target);
    return { prompts: Array.from({ length: count }, () => preparedTarget) };
  }

  function planner({system,target,figure='',count=5,hasEnvironment=false,environmentCount=0,poseLock=''}) {
    return `You are the scene planner for Subject Flow. ${poseLock ? 'Preserve the selected pose/camera reference exactly; create realistic variations only in details left unlocked by the user.' : "Plan distinct, realistic image variations from the user's actual instructions and attached references. Do not reuse a fixed pose/camera recipe."}

MANDATORY PLANNING RULES:
1. USER TARGET REQUEST IS THE PRIMARY AUTHORITY:
   If the user specified an action, pose, framing, or location in USER TARGET (below), you MUST faithfully execute it.
2. WHEN AN ACTION, POSE, OR DETAIL IS NOT EXPLICITLY SPECIFIED:
   Invent a fresh, believable variation that fits the setting and references. Make each image's physical action meaningfully distinct when the target allows it, while preserving continuity.
3. ${poseLock?"Keep the selected reference pose and camera geometry identical across the batch.":"Do not repeat the same pose or action across the batch."} Vary the physical beat and interaction when the target leaves them open. The subject's face should remain clearly visible by default; camera gaze is optional and must follow the target when specified.
4. DEFAULTS TO AVOID UNLESS EXPLICITLY REQUESTED OR SHOWN IN THE SELECTED POSE REFERENCE:
   - DO NOT describe the subject sitting stiffly on the edge of the bed looking down at a phone.
   - DO NOT describe the subject standing stiffly in the kitchen holding a bowl facing the camera.
   - No stiff catalog postures.
5. KNOWLEDGE INTERIOR IS CANONICAL:
   - Every scene in this batch stays in the exact same interior shown by the attached Knowledge reference image(s). Never move the subject to another room, house, venue, or invented interior.
   - Multiple Knowledge references are additional views/details of the same user-selected interior, not separate locations. Do not distribute scenes among different rooms.
   - Preserve recognizable fixed features, furniture, materials, colors, and layout from Knowledge. Reframe only by changing the camera position within that same room; do not invent replacement furniture or architecture.
6. ABSOLUTE BODY SHAPE & FIGURE FIDELITY:
   Every single planned variation MUST strictly maintain the subject's exact written figure, curves, and body proportions:
   ${figure.trim() ? `EXACT FIGURE LOCK:\n   ${figure.trim()}` : 'Preserve the exact body build and curves described in the instructions.'}
   - Do not add body-size adjectives or measurements in scene strings. The extension supplies the original body specification separately to every image.
   - Keep poses, weight shifts and clothing drape compatible with the requested body. Preserve garment ease and realistic fabric behavior.
7. HAIR TEXTURE OVERRIDE:
   Do not give the subject curly hair. Keep the hair's other natural texture and appearance unchanged.

USER BASE INSTRUCTIONS (Permanent Rules & Setting):
${prepare(system)}

USER TARGET IMAGE PROMPT (PRESERVE EXACTLY; MANDATORY PRIMARY ACTION & SCENE):
${prepare(target)}

${figure.trim()?`MANDATORY FIGURE DETAILS (CANONICAL BODY):\n${figure.trim()}`:'Preserve the body details written in base and target.'}

${poseLock}
Return ONLY valid raw JSON {"prompts":[...]} with exactly ${count} non-empty strings. No markdown or commentary.`;
  }

  function build({system='',target='',scene='',figure='',roles=[],hasEnvironment=false,hasQuality=false,flowReferenceMap='',variation='',hasPoseReference=false}) {
    const preparedSystem = prepare(system);
    const preparedTarget = prepare(target);
    const preparedScene = prepare(scene);
    const cleanFigure = figure.trim() || 'Follow body details in the target/base instructions; use the subject reference only for unspecified traits. Do not invent measurements.';

    return `ONE coherent photorealistic candid image in the location requested by the user.

CANONICAL BODY SPECIFICATION — applies before references and scene expansion:
${cleanFigure}

USER TARGET IMAGE REQUEST — ACTION, SETTING AND FRAMING AUTHORITY, PRESERVE VERBATIM:
${preparedTarget}
${preparedScene && preparedScene !== preparedTarget ? `GEMINI SCENE EXPANSION — USE ONLY DETAILS THAT DO NOT CONFLICT WITH TARGET:\n${preparedScene}\n` : ''}
USER BASE INSTRUCTION (APPLY ONLY WHERE IT DOES NOT CONFLICT WITH TARGET):
${preparedSystem}

ACTION, FRAMING & VARIETY:
Follow the target's requested action, pose, framing, expression, gaze, and location exactly. Gemini expansion is subordinate and must never replace or reinterpret any of those details. ${hasPoseReference?"The dedicated pose/camera image is an explicit request: preserve its exact pose, viewing angle, gaze and crop. Do not apply random variation or force a visible/front-facing face.":"If the target leaves the pose open, use the supplied variation cue to create a distinct, believable action beat. Keep the face clearly recognizable and visible by default, using a natural near-frontal or three-quarter view unless the target requests another view. Do not force eye contact."} Maintain physically plausible balance, contact, orientation, and object placement.

${variation}

PHYSICAL REALISM:
Use natural body weight, believable contact with surfaces, and fabric behavior consistent with the action. Preserve the subject's natural hair appearance except for the explicit no-curly constraint. Do not impose a camera gaze, pose, lighting mood, or setting that the target did not request.

KNOWLEDGE INTERIOR — FIXED LOCATION AUTHORITY:
${hasEnvironment ? `The attached Knowledge reference image(s) define the one canonical interior for this whole batch. Keep every image inside that exact same room. Preserve its recognizable fixed furniture, architecture, surfaces, colors, and layout. You may change only the camera position and framing within the room. Do not switch rooms, invent another interior, replace the room with generic home decor, or add unreferenced furniture. If a requested camera angle shows an unseen area, keep it understated and consistent with the visible room; never create a new venue.` : `Use the domestic interior explicitly described by the user. Do not invent a different room or venue.`}

FIGURE, IDENTITY & OUTFIT LOCK:
- PRIMARY FACE ANCHOR: Reference Image 1 strictly defines facial geometry, eyes, nose, lips, jaw, and age. Preserve identifiable features across expressions; do not beautify, average, or replace the face.
- CANONICAL FIGURE LOCK — SUPREME BODY AUTHORITY OVER ALL REFERENCES:
  Use the canonical body specification above. The written build overrides body proportions in identity, outfit, pose and quality references. A thick/full body must retain its requested volume throughout the torso and limbs, rather than only changing bust or hips. Fit the garments to that body with their original ease and fabric behavior; never force loose clothing to cling.
  Outfit photos supply garment design only. Their models do not define the subject's body.
- CANONICAL OUTFIT: The PRIMARY CANONICAL OUTFIT reference identified in the EXACT FLOW REFERENCE MAP strictly defines the garments. Use that exact outfit in every image; any supplementary outfit references clarify details of the same outfit only. Preserve garment types, cut, neckline, sleeves, layers, fabric, pattern, colors, footwear, and accessories. Fit those exact clothes over the canonical figure. Gemini scene descriptions cannot replace, omit, or redesign the outfit.

${hasQuality ? `QUALITY & FINISH LOCK — MANDATORY PHOTOGRAPHIC FINISH:
Visibly inherit the photographic texture, realistic available indoor lighting (tube light/lamp), sensor grain/noise, exposure behavior, and unsharpened mobile phone quality of the attached Quality reference image. No AI plastic look, no studio lighting, no glamour polish.` : `FINISH: Raw smartphone camera roll quality with available room light, subtle sensor noise, and real skin texture.`}

${flowReferenceMap ? `${flowReferenceMap}\n` : ''}
NEGATIVE PROMPT: Physically impossible balance or object placement, duplicated/extra limbs, altered identity, altered requested outfit, contradictions of target, studio lighting unless requested, CGI, fake bokeh, plastic skin, split image, collage, watermark.`;
  }

  const contract = `SUBJECT FLOW CANDID SNAPSHOT CONTRACT: Capture an authentic, unposed moment in the room. Body weight presses into surfaces naturally. Follow user base instruction and target request. Expand knowledge room from new camera viewpoints. No posing, no modeling, no camera-ready smiles. Genuine mobile phone camera roll feel.`;

  return { prepare, directPlan, planner, build, figure, contract, createVariationSequence };
})();

if (typeof module !== 'undefined') module.exports = SubjectFlowDirection;
