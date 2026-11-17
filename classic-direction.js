/* Classic-only photo direction. Story and Subject Flow use their own builders. */
(function(root) {
  const figureDirection = typeof module !== 'undefined' ? require('./figure-direction.js') : FigureDirection;
  const baseFigure = 'THICK HOURGLASS BASE: A visibly thick, full-bodied build with substantial torso, upper-arm, hip and thigh volume, a natural waist and a soft abdomen. Keep anatomy believable and proportions consistent. Do not invent numeric measurements. Explicit user body instructions override this default.';
  // Visual direction from the user's seven Classic examples, 6 Nov 2026.
  // See references/classic-lighting/README.md for daylight and phone-flash cues.
  const realism = 'NATURAL INSTAGRAM PHONE PHOTO: A clear, attractive personal iPhone photo taken by a friend, with an easy expression and comfortable, unforced posture. Use the iPhone main rear 1x camera in standard Photo mode or an ordinary 2x crop, natural perspective, readable background detail and normal iPhone-camera sharpness. Preserve real skin texture, small natural highlights, flyaway hairs, cloth weave and normal creases. Keep the original complexion, facial structure, age appearance and hair texture. STRAIGHT-FROM-CAMERA COLOR: Let standard phone-camera processing produce vivid, saturated-but-believable colors, punchy natural contrast, rich garment colors, clean whites and defined shadows. Keep saturation in the clothes and setting lively while skin remains true to the subject. No later filter or post-generation grading, skin whitening, beauty smoothing, faded matte blacks, grey haze, sepia, orange/teal tint, cinematic grade, vignette, bloom, exaggerated HDR or artificial sharpening halos. Avoid studio lighting, ring lights, softboxes, fake portrait-mode blur, cutout edges, polished campaign posing and plastic skin.';
  const lightRule = 'NATURAL LIGHT AND EXPOSURE: Make the face and eyes clearly readable, with healthy natural skin color, small real catchlights and detail in both skin highlights and shadows. Bright means correct photographic exposure, never lighter skin, a glowing face or blown-out fabric. In daylight use bright available sky/window light or ordinary daylight with physically consistent gentle facial shadows. Preserve rich color and firm natural contrast in the clothes and surroundings; do not wash out colors, flatten every shadow or tint the skin. At night or in a dim car, a nearby phone flash may light the person clearly while the distant background stays darker and its practical lights remain visible; use realistic flash falloff and contact shadows. Honor the requested time and any explicit flash/no-flash direction. No golden hour, sunset glow, amber wash, orange skin, artificial rim light or decorative light beams. Subject and setting share a coherent light-source geometry; their brightness may differ naturally with distance from the source. Avoid underexposed faces, muddy grey skin, flat dull exposure and artificial studio fill.';
  // Apply color to every lighting branch, including night and referenced rooms.
  const colorRule = 'CAMERA COLOR: Use neutral camera white balance and faithful object colors with vivid natural color and strong, clean midtone contrast. White fabric and neutral walls should read neutral under the main light; preserve the actual complexion and distinct garment colors. A warm lamp may stay warm locally, and real wood or brown furniture stays its actual color, without tinting the whole photograph yellow, orange, beige or brown. No global warm/brown wash, sepia grade or compensating blue/grey cast. Keep clothes and background richly colored as they would look in a well-exposed standard phone photo; never whiten skin or mute the room.';
  const captureRule = 'STANDARD PHONE CAPTURE — FINAL PHOTOGRAPHIC FINISH: Use standard iPhone Photo mode with Portrait mode off, and the broad depth of field of its main camera at normal portrait distance. Keep nearby furniture, walls and room details readable together with the person. Allow only modest distance-related optical softness; never create a sharp cutout person against an evenly defocused room. No portrait-mode depth mask, creamy bokeh, Gaussian background blur or DSLR shallow-focus look. An attractive pose or stylish room does not imply a professional photo shoot. Light the whole scene from its actual window, household/street fixtures or a permitted small on-camera flash; keep ordinary uneven falloff and real contact shadows. Do not add a beauty key light, softbox glow, rim/backlight, spotlight on the face or a studio fill setup. Indoors should feel like a personal iPhone photo in a real occupied room, with well-kept materials, subtle everyday detail and plausible reflections. Photographic realism comes from the camera, natural light and real textures; do not invent worn walls, shabby upholstery or outdated fittings to make the photo look real. Premium interior design must still be photographed casually, without an architectural-render finish or staged interiors-campaign lighting. Use a straight-from-camera iPhone finish with normal contrast, intact skin texture and natural camera detail. No added post-processing look: cinematic LUT, color grade, bloom/halation, glow, vignette, exaggerated HDR tone mapping, lifted matte shadows, crushed blacks, skin retouching, denoising smear, clarity/sharpening halos or added grain overlays. Do not simulate rawness by adding dirt, exaggerated pores, heavy noise or deliberate blur. At night, darkness comes from exposure and distance, not a brown filter or smeared background. These capture defaults apply to both planned and newly invented settings; only an explicit user photographic request can override them.';
  // Public previews from the user's profile list, reviewed 8 Nov 2026.
  // See references/classic-bloggers/README.md for coverage and exclusions.
  const skinRule = 'REAL SKIN AT NORMAL PORTRAIT DISTANCE: Keep subtle, irregular skin texture at the scale the camera could actually resolve: fine pores where visible, soft facial hairs, natural lip texture and small expression creases. Preserve gentle tonal variation and existing marks instead of making every patch of skin one flat color. Makeup may sit naturally on the skin without erasing its surface. Keep the face, neck, chest, arms and hands consistent in complexion, with differences explained by real light and shadow. Small localized highlights can appear on the nose, cheeks and shoulders; do not coat the whole person in glossy light. No waxy or airbrushed skin, porcelain finish, painted-on pores, exaggerated blemishes, oversharpened texture, added freckles or uniform grain. This is ordinary phone-photo skin, not a macro dermatology image.';
  const portraitRule = 'SUBJECT-PROMINENT FRAMING: Unless the user explicitly asks for a wide or distant view, keep the camera near enough for the face, expression, skin and outfit texture to remain readable. Prefer close or medium personal portraits and nearby outfit crops; background depth should surround a prominent subject without making the person small. A flattering photo preserves the specified body volume, not a slimmer silhouette. Leave the exact framing to Flow; explicit selfie, close-up, full-body or wide framing wins.';
  // Creative directions, not replicas or fixed pose/venue recipes.
  const places = [
  {
    "id": "cafe-patio",
    "indoor": false,
    "location": "A lively cafe patio with jewel-green plants, patterned tile or painted trim, one attractive table detail and a colorful but believable social background."
  },
  {
    "id": "rooftop",
    "indoor": false,
    "location": "A colorful city rooftop with crisp railing lines, saturated building accents and a readable skyline close behind the subject, never a distant travel panorama."
  },
  {
    "id": "courtyard",
    "indoor": false,
    "location": "A modern courtyard with a bold painted doorway, patterned floor or colored tile, leafy pots and layered architecture around the close portrait."
  },
  {
    "id": "waterfront",
    "indoor": false,
    "location": "A waterside cafe or promenade with colorful railing details, sparkling but natural water reflections, and a nearby shoreline setting visible behind the subject."
  },
  {
    "id": "botanical",
    "indoor": false,
    "location": "A lush garden path with deep green leaves, vivid flowers in a few colors, textured stone and a house or cafe detail behind the subject."
  },
  {
    "id": "boutique",
    "indoor": false,
    "location": "A fashionable city storefront with glossy glass, colorful signs kept unreadable, vivid window displays and real street texture close behind the subject."
  },
  {
    "id": "pool-terrace",
    "indoor": false,
    "location": "A stylish pool terrace with clear turquoise water, colorful loungers or towels, lush planting and bright real daylight; keep the person close and prominent."
  },
  {
    "id": "gallery",
    "indoor": true,
    "location": "A contemporary art-gallery corner with one large colorful artwork, warm wood or polished stone, gallery lighting and visible architectural depth behind a close portrait."
  },
  {
    "id": "lobby",
    "indoor": true,
    "location": "A premium hotel lounge with emerald or burgundy upholstery, brass details used sparingly, a statement lamp and layered modern architecture; avoid empty beige walls."
  },
  {
    "id": "veranda",
    "indoor": false,
    "location": "A bright home veranda with vivid potted flowers, a colored tile edge, modern chairs and leafy outdoor depth visible around the subject."
  },
  {
    "id": "cafe-window",
    "indoor": true,
    "location": "A stylish cafe window seat with colored cushions, textured wall or tile, window reflections and green street life visible just beyond the subject."
  },
  {
    "id": "stone-steps",
    "indoor": false,
    "location": "Broad stone steps beside a vivid painted wall, iron railing or flowering planter, with alternating light and shadow giving the close composition depth."
  },
  {
    "id": "flower-terrace",
    "indoor": false,
    "location": "A flower terrace with saturated bougainvillea or seasonal blooms, colored planters, textured paving and natural outfit-to-flower contrast."
  },
  {
    "id": "palm-path",
    "indoor": false,
    "location": "A palm-lined garden walkway with deep green fronds, terracotta pots, colorful flowering plants and a nearby residential or cafe backdrop."
  },
  {
    "id": "marina",
    "indoor": false,
    "location": "A marina-side cafe with blue water, colorful boat details, a textured railing and reflections visible behind a close subject; avoid distant wide framing."
  },
  {
    "id": "library-lounge",
    "indoor": true,
    "location": "A refined modern home lounge with a deep teal or wine-colored sofa, warm wood, one striking art object, a plant and real lived-in detail."
  },
  {
    "id": "glass-atrium",
    "indoor": true,
    "location": "A glass atrium with colorful reflections, a textured stone column, lush indoor greenery and a bright architectural background that stays readable."
  },
  {
    "id": "garden-bench",
    "indoor": false,
    "location": "A landscaped garden bench beneath flowering branches, with a colorful cushion, layered foliage and a tiled or stone path around the close portrait."
  },
  {
    "id": "terracotta",
    "indoor": false,
    "location": "A terracotta-toned modern courtyard with crisp geometry, cobalt or teal accents, leafy plants and rich natural color without an orange filter."
  },
  {
    "id": "sculpture-plaza",
    "indoor": false,
    "location": "A contemporary sculpture plaza with a bold colorful sculpture, clean paving, planted edges and close architectural layers rather than a wide empty plaza."
  }
];
  const poses = [
  {
    "id": "stride",
    "text": "Catch one clear walking step toward camera: front foot advancing, rear heel lifted, hips angled and one arm swinging naturally."
  },
  {
    "id": "walk-away-turn",
    "text": "Catch the subject taking a step away from camera with the back and one shoulder visible, then turning the head for a clear over-shoulder glance."
  },
  {
    "id": "seated-diagonal",
    "text": "Sit diagonally on a real chair or bench, one forearm resting on its arm or table and torso turned toward camera; do not use a bed-edge pose."
  },
  {
    "id": "seated-side",
    "text": "Sit sideways with both knees angled in one direction, shoulders turned back toward camera and hands resting separately on lap and chair."
  },
  {
    "id": "rail-side",
    "text": "Stand beside an actual railing or counter, rest one forearm lightly on it, shift weight to the outside leg and turn the torso three-quarters toward camera."
  },
  {
    "id": "shoulder-lean",
    "text": "Lean one shoulder against a real textured wall or column, keep the other shoulder forward and let both arms hang relaxed at different heights."
  },
  {
    "id": "step-up",
    "text": "Catch the subject stepping onto a low real step, one knee bent and the other leg grounded; glance sideways instead of standing square to camera."
  },
  {
    "id": "hair-tuck",
    "text": "Show one hand tucking hair behind one ear while the opposite arm stays relaxed; turn the face slightly toward camera and keep all fingers natural."
  },
  {
    "id": "hands-behind",
    "text": "Place both hands loosely behind the lower back, draw one shoulder slightly forward and angle the hips away from camera for an open silhouette."
  },
  {
    "id": "hand-on-hip",
    "text": "Rest only one hand on the hip with elbow out; keep the other hand down holding a small real prop or touching a nearby surface."
  },
  {
    "id": "ankle-cross",
    "text": "Stand with ankles crossed, weight on the rear leg, one hand lightly holding a bag or sleeve and shoulders turned at a different angle from the hips."
  },
  {
    "id": "side-profile",
    "text": "Turn the body almost side-on, keep the face in a clear three-quarter profile, one shoulder nearer the lens and gaze just past the camera."
  },
  {
    "id": "mid-pivot",
    "text": "Catch a small mid-pivot: feet planted at different angles, torso rotating toward camera and loose fabric shifting naturally from the turn."
  },
  {
    "id": "hair-lift",
    "text": "Lift one arm to adjust hair above the head while the other hand rests at the waist; keep the raised elbow visible and shoulders relaxed."
  },
  {
    "id": "arms-folded",
    "text": "Fold arms loosely at mid-torso with one hand visible on the opposite sleeve; keep shoulders soft and body turned slightly off-center."
  },
  {
    "id": "candid-laugh",
    "text": "Catch a genuine laugh with head turned slightly aside, shoulders lifted naturally and one hand briefly covering or brushing near the smile."
  },
  {
    "id": "look-down-step",
    "text": "Pause during a small step while looking down toward the path, one hand holding the outfit edge or bag strap and the other arm loose."
  },
  {
    "id": "seat-forward",
    "text": "Sit near the front of a real chair with torso leaning slightly forward, elbows separated and hands naturally occupied with a cup or phone."
  },
  {
    "id": "rail-back",
    "text": "If a real chair or ledge is present, lean back on one hand with chest open and knees angled; otherwise use a relaxed shoulder lean on a real support."
  },
  {
    "id": "doorway-frame",
    "text": "Stand partly inside a real doorway, one hand touching the doorframe above shoulder height, one foot forward and torso angled into the room."
  },
  {
    "id": "seated-lookback",
    "text": "While seated, turn the torso and head back toward camera over one shoulder; keep hips facing away and hands resting on the seat for support."
  },
  {
    "id": "open-palms",
    "text": "Show a small conversational gesture with one palm turned upward near the waist and the other hand relaxed; shoulders and gaze face slightly off-camera."
  },
  {
    "id": "collarbone-hand",
    "text": "Rest fingertips lightly near the collarbone without covering the neckline, keep the second arm down and angle one shoulder toward camera."
  },
  {
    "id": "turn-and-pause",
    "text": "Pause halfway through a gentle turn with shoulders at different depths, one foot pivoted and face glancing back toward the lens."
  }
];
  // Five broad silhouette families prevent five different labels from still
  // producing five standing portraits. Exact staging remains the renderer's job.
  const poseFamilies = {
    moving: ['stride','walk-away-turn','step-up','mid-pivot','look-down-step'],
    seated: ['seated-diagonal','seated-side','seat-forward','seated-lookback'],
    supported: ['rail-side','shoulder-lean','rail-back','doorway-frame'],
    poised: ['hands-behind','hand-on-hip','ankle-cross','side-profile','turn-and-pause'],
    expressive: ['hair-tuck','hair-lift','arms-folded','candid-laugh','open-palms','collarbone-hand']
  };
  for (const [family,ids] of Object.entries(poseFamilies)) {
    for (const pose of poses) if (ids.includes(pose.id)) pose.family = family;
  }
  const gazes = [
  {
    "id": "direct",
    "text": "A confident direct connection with the camera."
  },
  {
    "id": "soft-smile",
    "text": "A small easy smile and relaxed eyes."
  },
  {
    "id": "off-camera",
    "text": "An engaged off-camera expression."
  },
  {
    "id": "laugh",
    "text": "A lively spontaneous expression."
  },
  {
    "id": "calm",
    "text": "A calm self-assured expression."
  },
  {
    "id": "side-glance",
    "text": "A playful sideways expression."
  }
];
  function deck(items, recent, random) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    // Unused choices first, then the least recently used. Still works when the
    // requested batch is larger than the remaining unseen choices.
    const history=Array.isArray(recent)?recent:[];
    return result.sort((a,b)=>history.lastIndexOf(a.id)-history.lastIndexOf(b.id));
  }
  function remember(previous={},shots=[]) {
    const append=(key,values)=>[...(Array.isArray(previous?.[key])?previous[key]:[]),...values].slice(-40);
    return {poseIds:append('poseIds',shots.map(s=>s.poseId)),placeIds:append('placeIds',shots.map(s=>s.id)),cropIds:append('cropIds',shots.map(s=>s.cropId)),gazeIds:append('gazeIds',shots.map(s=>s.gazeId))};
  }
  function variedPoseDeck(recent,random) {
    const remaining=deck(poses,recent,random),result=[],usedFamilies=new Set();
    while(remaining.length) {
      let index=remaining.findIndex(pose=>!usedFamilies.has(pose.family));
      if(index<0){
        // Start a new family cycle with a different silhouette from the
        // preceding shots, even when a batch contains more than five images.
        usedFamilies.clear();
        for(const pose of result.slice(-4))usedFamilies.add(pose.family);
        index=remaining.findIndex(pose=>!usedFamilies.has(pose.family));
        if(index<0){usedFamilies.clear();index=0;}
      }
      const [pose]=remaining.splice(index,1);
      usedFamilies.add(pose.family);result.push(pose);
    }
    return result;
  }
  function figure({physical='',tuning=''}={}) {
    return figureDirection.build({physical,tuning,defaultFigure:baseFigure});
  }
  function framing(target,index) {
    if(/\b(selfie|front cam(?:era)?|arm['’]?s? length)\b/i.test(target))return 'Honor the requested selfie or mirror-selfie framing. Use a plausible phone position, arm length and reflection with one consistent subject; preserve natural face and body proportions.';
    if(/\b(close[ -]?up|headshot|head.and.shoulders|close shot)\b/i.test(target))return 'Honor the requested close portrait; keep the face recognizable with natural perspective. Do not widen the crop just to show body measurements.';
    if(/\b(full[ -]?(?:body|length)|head.to.toe|entire body|feet visible)\b/i.test(target))return 'Show the complete head-to-toe body and footwear, with a little floor around the feet. Keep the camera level and limbs naturally proportioned.';
    if(/\b(wide shot|environmental portrait|distant|far away)\b/i.test(target))return 'Honor the requested wider framing without distorting body proportions or cluttering the location.';
    return [
      'CAMERA A — nearby three-quarter portrait, eye-level and slightly off-center; frame from mid-thigh upward so the pose silhouette and face are clear, with a colorful setting occupying one side of the frame.',
      'CAMERA B — close waist-up portrait from a gentle three-quarter angle, camera just above eye level; keep the face large and sharp while showing a rich, readable background over the shoulder.',
      'CAMERA C — nearby knees-up portrait at eye level, subject turned diagonally across frame; show the leg stance and outfit shape, with the subject filling most of the image rather than a distant scene.',
      'CAMERA D — close over-the-shoulder composition at normal phone distance; keep one eye/face profile readable, show shoulder and torso angle, with textured architecture or plants behind.',
      'CAMERA E — nearby side-angle portrait, camera slightly below eye level but not distorted; frame waist-up with the subject off-center and vivid background detail visible in the open side.'
    ][index%5];
  }
  function shots(count,{target='',hasEnvironment=false,hasPoseReference=false,random=Math.random,previous={}}={}) {
    const indoor=/\b(lift|elevator|corridor|hallway|landing|room|bedroom|livingroom|bathroom|kitchen|lounge|home|house|apartment|flat|indoors?|interiors?|inside|lobby|garage|ghar|andar|kamra|kamre|makaan)\b/i.test(target) || /घर|अंदर|कमरा|मकान/u.test(target);
    const specifiedLocation=indoor || /\b(wall|garden|park|stairs?|staircase|entrance|doorway|balcony|terrace|street|road|walkway|cafe|caf[eé]|restaurant|hotel|car|parking|beach|gym|store|shop|mall|museum|airport|deewar|diwar|bagicha)\b/i.test(target);
    const outdoor=/\b(garden|park|balcony|terrace|street|road|walkway|beach|outdoors?|outside|bagicha)\b/i.test(target);
    const night=/\b(night(?:[ -]?time)?|evening|after dark|midnight|raat|shaam)\b/i.test(target) || /रात|शाम/u.test(target);
    const daytime=/\b(daytime|daylight|morning|afternoon|din)\b/i.test(target);
    const noFlash=/\b(no[ -]?flash|without\s+(?:a\s+)?flash|flash\s+(?:off|nahi|nahin|mat))\b/i.test(target) || /बिना\s*फ्लैश/u.test(target);
    const pool=deck(places,previous?.placeIds,random);
    const posePool=variedPoseDeck(previous?.poseIds,random);
    const gazePool=deck(gazes,previous?.gazeIds,random);
    const cropPool=deck([0,1,2,3,4].map(id=>({id})),previous?.cropIds,random);
    return Array.from({length:count},(_,i)=>{
      const pose=posePool[i%posePool.length],gaze=gazePool[i%gazePool.length],crop=cropPool[i%cropPool.length];
      const place=pool.shift()||places[i%places.length];
      const location=hasPoseReference
        ? (hasEnvironment ? 'Keep the attached location as the same real place, preserving its materials and layout. Match the dedicated pose/camera reference viewpoint and crop within this location.' : 'Use the user-requested setting, or invent a believable setting if none is specified. Compose it around the exact dedicated pose/camera reference viewpoint and crop; do not change the camera to display the setting.')
        : hasEnvironment
        ? 'Use the attached location as the same real place. Retain its materials, wall/door positions and visible layout; find an attractive angle with depth, material texture and clean separation around the subject. Do not add a new venue or invent unseen architecture.'
        : specifiedLocation
        ? 'Use exactly the location named in the user target. Find a visually attractive composition within that setting using its real depth, textures and leading lines; vary the camera position without changing the setting.'
        : `If the user target names any setting, that setting takes priority. Otherwise invent an attractive real location in the Indian/Pakistani fashion-blogger Instagram aesthetic. Optional mood inspiration: ${place.location} Choose the venue and details creatively; this is not an exact location prescription or a photo to copy.`;
      const lightSource=hasEnvironment
        ? 'Keep the actual light sources and direction visible in the location reference, adapted to the requested time. Use a plausible exposure that keeps the face clear; retain the same real place and its light-source geometry.'
        : specifiedLocation && indoor===outdoor
        ? "Follow the named setting's actual available light sources, whether indoors or outdoors, with true colors and natural shadows. Do not invent outdoor sky light inside an enclosed space."
        : (specifiedLocation?indoor:place.indoor)
        ? 'Use available window light where a window really exists, or ordinary neutral-white ceiling or wall fixtures for an invented room. Keep plausible light direction and falloff, neutral white balance and clear true colors throughout the room. Do not default to tungsten-yellow lamps or an amber-lit interior.'
        : 'Use bright daytime open shade facing the open sky or ordinary daylight, with a clearly exposed face, small natural catchlights, true skin and garment colors and soft contact shadows.';
      const lighting=(night&&!daytime
        ? `${hasEnvironment?'Retain the referenced place and its actual fixtures. ':''}Keep the requested night or evening setting. Use existing ambient lights and fixtures at night. ${!hasEnvironment&&(specifiedLocation?indoor:place.indoor)?'For invented indoor fixtures, default to ordinary neutral-white household light unless the user requests another source; do not automatically switch to amber lamps because it is night. ':''}${noFlash?'NO FLASH: Expose using the available fixtures only, retaining believable shadow depth; do not add a flash or a hidden fill light.':'A small nearby on-camera phone flash may expose the face and outfit cleanly while the background stays naturally darker. Keep realistic flash falloff and contact shadows, not a large diffused beauty light.'} Retain highlight detail and readable background shapes wherever actual light reaches them. Honor an explicit no-flash request; never turn night into daylight or add a studio setup.`
        : `${lightSource} Choose correct exposure for the face and outfit, preserving natural shadow depth and highlight detail. ${daytime?'Keep the requested daytime setting. ':''}For an unspecified time, use clear daytime light appropriate to the place. Avoid dim grey exposure, washed-out skin and a filter-like color cast.`)+` ${colorRule}`;
      return {id:hasEnvironment?'reference':specifiedLocation?'requested':place.id,poseId:hasPoseReference?'reference':pose.id,poseFamily:hasPoseReference?'reference':pose.family,gazeId:hasPoseReference?'reference':gaze.id,cropId:hasPoseReference?'reference':crop.id,variationIndex:i+1,batchSize:count,location,lighting,
        pose:hasPoseReference?"EXACT REFERENCE POSE: Match the dedicated pose image body orientation, head, hands, legs and gaze. Do not invent another action.":`POSE DIVERSITY LOCK — SHOT ${i+1} OF ${count}. Keep the user's explicitly requested action or pose if present. Otherwise make this selected body action visibly readable: ${pose.text} This is a concrete body position, not just a mood. Do not replace it with a front-facing feet-together catalog stance or the same seated pose. Use natural anatomy, relaxed shoulders and believable balance; no exaggerated back arch. Do not copy the stance, hands or camera angle from identity/outfit references.`,framing:hasPoseReference?"EXACT REFERENCE CAMERA: Match the dedicated pose image viewpoint, camera height, tilt, distance, crop and subject placement.":framing(target,crop.id)};
    });
  }
  // The user's 8 Nov example showed the unwanted floral-sofa / blank beige-wall
  // default. It is diagnostic evidence, not a location reference to reproduce.
  const interiorRule = 'CONTEMPORARY INTERIOR DEFAULT: When inventing a home or indoor setting without a supplied location reference, use a present-day, attractive, lived-in urban interior with visibly premium design and finish. CURRENT AFFLUENT HOME — 2026: Aim for a well-designed, high-end contemporary Indian/Pakistani city home. Show that quality through refined furniture proportions, good upholstery, thoughtful joinery, well-finished floors, current window treatments and a coherent material/color palette. Even a small corner should look considered and expensive in its workmanship. A generic sofa pushed against a large bare cream wall is not enough to establish this home. Let a few complementary elements reveal the room around the nearby subject: for example, an interesting adjoining area, well-designed storage, a material transition, tasteful art or a good window outlook. These are optional qualities, not a furniture checklist or a fixed layout; choose a coherent combination creatively and vary it between invented settings. If seating is appropriate, favor current refined shapes with solid or subtly textured premium upholstery; do not default to bulky floral/damask sofa sets, matching busy patterned cushions, old brown curtain/window frames or scuffed beige walls. Use the fixtures appropriate to the named room; a kitchen or bathroom should not acquire a living-room sofa. Keep personal everyday details and real comfort, without turning the home into a hotel lobby, empty showroom or oversized mansion. Do not substitute gold ornament, chandeliers, ornate arches or excessive marble for good contemporary design. Indian/Pakistani styling does not imply a haveli or a dated family sitting room. Neutral white balance does not mean furnishing the entire room in beige: preserve distinct real material colors and restrained, confident color accents. No yellow, amber, sepia or global brown wash; no compensating cold grey cast. At night retain believable practical lighting and darkness with clear skin color. Identity and outfit references do not supply the room, furniture, curtains or wall colors unless the same image is explicitly assigned a location/environment role. A supplied location reference or explicitly requested architectural style overrides this default: preserve its actual materials, colors and geometry, and never remodel the referenced room.';
  const sceneRule = 'DESI FASHION-BLOGGER PHOTO AESTHETIC / VISUALLY RICH BACKGROUND: The photo must have a genuinely attractive, colorful real setting behind the nearby subject; a blank wall, empty hallway, plain beige room or generic sofa backdrop is a failed result. Use a distinct setting anchor—such as a vivid cafe patio, flowering garden, colored tile, premium lounge upholstery, reflective glass storefront, modern courtyard or textured city terrace—plus one or two believable depth details. Make background colors rich and naturally saturated, with clear contrast against the outfit, while keeping skin color accurate and the person prominent. Background should be visibly readable in the frame, not reduced to a blurred color wash. Keep the setting believable and casually photographed, with realistic object scale, floor contact, reflections and shadow direction. Vary the venue and dominant background color between batch images. Take only general photo qualities from the supplied public-profile research; do not copy any creator\'s face, body, exact pose, clothes or composition. An explicit user location or location reference remains binding.';
  function describeShot(shot) {
    return `SETTING: ${shot.location}\nLIGHT: ${shot.lighting}\nPOSE: ${shot.pose}\nFRAMING: ${shot.framing}`;
  }
  function planner({target,figureRule,variations,count,poseLock=''}) {
    return `Write a JSON text plan with exactly ${count} creative briefs for a separate image renderer. Do not create images yourself. The briefs should convey natural, striking Indian/Pakistani fashion-blogger Instagram photo styling. Preserve the same referenced person and outfit; do not imitate a celebrity face or invent a nationality.
USER TARGET:\n${target}
${figureRule}
${realism}
${skinRule}
${poseLock ? 'FRAMING: The dedicated pose/camera image defines the exact crop, distance and subject scale.' : portraitRule}
${sceneRule}
${interiorRule}
${lightRule}
${captureRule}
${poseLock?"Keep the selected pose/camera reference geometry identical in every brief. Ignore requests for pose/camera diversity below; vary only unlocked details.":"Use each starting point below to make its corresponding brief visibly different."} The user-requested action, named setting and framing remain binding. For unspecified poses, preserve the selected concrete body action and silhouette; do not turn each brief into a centered, front-facing stance or repeated bed/chair pose. For unspecified settings, choose a clearly colorful, attractive real background and vary its dominant colors and setting anchor across the batch. Keep the subject nearby and prominent, never a distant travel shot. Keep the specified figure natural and the mood confident and attractive. Do not put body-size labels, new measurements or reference-model proportions in scene strings; the extension applies the exact body contract separately.
Keep scene strings focused on action, expression, framing and the real setting. Do not embellish them with lens/aperture recipes, background blur, studio lighting, warm color palettes or post-production effects. Use the shot's specified time and light sources; the shared camera rules control photographic finish.
For an invented home/interior, convey its contemporary premium residential quality and meaningful room detail in the brief; do not collapse the setting to a generic sofa and plain wall. Quality of furnishings does not change the natural iPhone capture rules. Preserve explicit named venues, styles and supplied locations.
${variations.map((shot,i)=>`SHOT ${i+1}\n${describeShot(shot)}`).join('\n\n')}
${poseLock}
Return only valid JSON {"prompts":[...]} with exactly ${count} non-empty strings. Each string is a compact scene description of about 40-80 words. ${poseLock ? 'Every brief must preserve the exact selected reference pose, hands, viewing angle and crop. Leave that geometry to the original image supplied to Flow; do not invent a camera or action description.' : 'Preserve the corresponding pose action and camera framing cue so the outputs have different visible silhouettes and angles. Keep the nearby subject large while showing the colorful, readable background. Leave only incidental hand/finger details and exact venue micro-details to Flow.'} The exact figure contract and reference map will be applied separately to every image.`;
  }
  function build({target,scene='',figureRule,shot,referenceLock='',referenceMap='',hasPoseReference=false}) {
    return `ONE continuous, full-bleed realistic phone photograph, one person and one moment.
${figureRule}
${referenceLock}
${referenceMap}
USER TARGET — binding action, requested setting and framing:\n${target}
${scene&&scene!==target?`PLANNER SCENE SUGGESTION — use only compatible details; discard any conflicting body, location, pose or lighting suggestion. Do not inherit planner-only lens, depth-of-field, color grading or retouching directions; use the shared capture rules below:\n${scene}`:''}
FINAL CLASSIC PHOTO DIRECTION — identity, outfit, realism and explicit user requests override conflicting planner suggestions. The selected pose action and camera composition below are required for this image, not loose inspiration:
${describeShot(shot)}
${hasPoseReference?"REFERENCE CONSISTENCY: Keep the same exact pose, camera angle and framing in every batch image.":`BATCH VARIETY: This is shot ${shot.variationIndex||1} of ${shot.batchSize||1}. Make its pose silhouette and camera angle clearly different from a generic centered front-facing portrait. If multiple images are requested, do not repeat the same body orientation, arm gesture, seated/standing structure or camera relationship. Keep the selected action recognizable while remaining natural.`}
${sceneRule}
${interiorRule}
${realism}
${skinRule}
${hasPoseReference ? 'FRAMING: Match the dedicated pose/camera reference crop, distance and subject scale exactly.' : portraitRule}
${lightRule}
${captureRule}
FINAL CHECK: Preserve the referenced face and hair, exact written body traits, resolved body build and garment construction. Thick/full settings must remain visibly thick/full even when every outfit reference shows a slim model. Fit the clothes to the specified body; never fit the body to the clothes. Keep natural volume instead of slimming through pose, crop or lens distortion. ${hasPoseReference?"Reproduce the selected reference pose and camera geometry exactly.":"Invent a fresh, appealing moment from the creative brief; do not mechanically reproduce a preset pose or setting."} No added captions, watermarks, collage, illustration or CGI.`;
  }
  const api={figure,shots,remember,planner,build};
  if(typeof module!=='undefined')module.exports=api;else root.ClassicDirection=api;
})(typeof globalThis!=='undefined'?globalThis:this);
