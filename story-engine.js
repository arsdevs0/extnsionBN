/* Story Studio 5: plan -> validate -> clean cinematic keyframes. */
const StoryEngine = (() => {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const letteringLimits={narration:100,dialogue:90,dialogueCount:2,total:180,words:32};
  function validateLettering(panel,index) {
    const narration=text(panel.narration),dialogue=panel.dialogue||[],all=[narration,...dialogue.map(d=>text(d.text))].filter(Boolean);
    const wordCount=(all.join(' ').match(/[\p{L}\p{M}\p{N}’'-]+/gu)||[]).length;
    if([...narration].length>letteringLimits.narration||dialogue.some(d=>[...d.text].length>letteringLimits.dialogue)||dialogue.length>letteringLimits.dialogueCount||all.reduce((n,t)=>n+[...t].length,0)>letteringLimits.total||wordCount>letteringLimits.words) {
      throw Error(`Panel ${index+1}: too much lettering. Use optional narration <=100 characters, <=2 dialogue bubbles of <=90 characters each, <=180 characters and <=32 words total. Remove visual repetition; move necessary exchanges to adjacent beats, preserving speaker, plot and meaning. Do not truncate words.`);
    }
  }
  function heightCm(value) {
    const s=text(value).toLowerCase().replace(/[′’]/g,"'").replace(/[″“”]/g,'"');
    let m=s.match(/^(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetres?)\.?$/);
    if(m)return +m[1]||null;
    m=s.match(/^(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)\.?$/);
    if(m)return +m[1]*100||null;
    m=s.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|foot|')\s*(?:(\d+(?:\.\d+)?)\s*(?:in|inches?|"))?$/);
    return m?(+m[1]*12+(+m[2]||0))*2.54||null:null;
  }
  function heightRules(characters) {
    const specified=characters.filter(c=>text(c.height));
    if(!specified.length)return '';
    const rules=specified.map(c=>`${c.name}: standing height ${text(c.height)}; apply to this character only, in every frame.`);
    for(let i=0;i<specified.length;i++)for(let j=i+1;j<specified.length;j++) {
      const a=specified[i],b=specified[j],ah=heightCm(a.height),bh=heightCm(b.height);
      if(ah&&bh)rules.push(`${a.name} / ${b.name}: standing-height ratio ${(ah/bh).toFixed(3)}; ${Math.abs(ah-bh).toFixed(1)} cm difference (${ah===bh?'equal standing height':(ah>bh?a.name:b.name)+' taller'}).`);
    }
    return `PER-CHARACTER HEIGHT LOCK:\n${rules.join('\n')}\nEntered standing height overrides inferred stature from identity, figure, outfit or previous scene images. Figure references still control body build and proportions. On the same ground plane at equal camera depth, preserve the relative head/shoulder levels; do not equalize heights. Respect seated/bent poses and perspective: these are standing body measurements, not a forced pixel-height ratio. Keep close framing; do not pull the camera back to show feet or place people farther apart merely to demonstrate height.`;
  }
  function requestedPanelCount(source,maxPanels=60) {
    const value=String(source||'');
    const patterns=[
      /\b(?:exactly|make(?: it| sure)?|create|generate|use|do|give me|want|need|have|target|around|about|roughly|approximately|at least|in|with|total of)\s+(?:exactly\s+)?(\d{1,3})\s+(?:storyboard\s+|story\s+)?panels?\b/i,
      /\b(\d{1,3})\s+(?:storyboard\s+|story\s+)?panels?\s+(?:exactly|total)\b/i,
      /\b(?:panel\s+count|number\s+of\s+panels)\s*(?:should\s+be|of|is|:|=)?\s*(\d{1,3})\b/i
    ];
    for(const pattern of patterns){const match=value.match(pattern);if(match){const count=Number(match[1]);if(Number.isInteger(count)&&count>=4)return Math.min(count,maxPanels);}}
    return null;
  }
  function minimumPanelCount(source,maxPanels=60) {
    const words=(String(source||'').match(/[\p{L}\p{N}’'-]+/gu)||[]).length;
    return Math.min(maxPanels,Math.max(8,Math.ceil(words/75)));
  }
  function rect(value,label) {
    if (!value || !['x','y','w','h'].every(key => Number.isFinite(value[key]))) throw Error(`${label}: missing numeric rectangle`);
    const {x,y,w,h}=value;
    if(x<.02 || y<.02 || w<=0 || h<=0 || x+w>.98 || y+h>.98) throw Error(`${label}: rectangle outside safe image edges`);
    return {x,y,w,h};
  }
  function prompt(brief,cast,maxPanels,bgStyle='crime-noir',textOverlays=false,inputMode='brief',requestedPanels=null,minimumPanels=8) {
    const sourceNarration='Turn descriptive paragraphs and internal thoughts into expressive action and reaction panels. Use short, natural narration only for essential context or thoughts the artwork cannot convey. Preserve emotion, reasoning and cause and effect without restating visible actions.';
    const sourceInstruction=inputMode==='novel'
      ?`SOURCE MODE: ADAPT A COMPLETE NOVEL CHAPTER INTO A WEBTOON STORYBOARD. Treat the pasted chapter as canon, not as loose inspiration. Preserve its event order, cause and effect, reveals, relationships, character motivations, important objects and consequences. Do not invent, remove, merge or reorder plot events. ${sourceNarration} Preserve distinctive dialogue and its speaker; lightly shorten only when needed to fit a readable speech bubble without changing meaning. Use clear establishing shots, action beats, close reactions and purposeful pauses so the result reads like a paced Webtoon chapter (e.g. Solo Leveling, Omniscient Reader). The supplied cast list and identity/outfit references define the main characters; match the novel's character names to those exact cast names.`
      :'SOURCE MODE: BUILD A COMPLETE STORY FROM THE USER\'S BRIEF. Expand it into a coherent beginning, escalation, choice and payoff while respecting the named cast and story facts.';
    const toneInstruction=bgStyle==='webtoon'
      ?'Use polished cinematic Webtoon illustration with confident, consistent ink contours, expressive acting, realistic anatomy and detailed environments. Do not impose a dark, noir, muted, warm, cool, or other fixed palette or lighting mood. When an art-style reference is attached to each image request, it is the authority for the entire visual treatment—including linework, palette, color intensity, shading, contrast, lighting mood and cinematic tone—and must be matched consistently panel to panel. Character identity and outfit references remain authoritative. Keep the story\'s stated weather, time and physical light sources.'
      :bgStyle==='photorealistic'
      ?'Use neutral, clean ungraded photorealism like a normal camera photo: accurate natural color and white balance, realistic skin and fabric, true scene-appropriate ambient exposure. No warm/orange color cast, amber wash, film grain, sensor noise, vignette, bloom, fake bokeh, cinematic LUT, teal-orange grade, smoky haze or stylized effects. Natural daylight is allowed only when appropriate to the story weather and time. Preserve readable close character coverage and story action.'
      :bgStyle==='warm-drama'
      ?'Use a gentle, grounded character-drama mood with natural skin tones, modest warmth and soft motivated practical light; avoid exaggerated color grading. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.'
      :bgStyle==='grounded-thriller'
      ?'Use grounded suspense, natural color, restrained contrast and quiet tension without stylized effects. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.'
      :'Use brooding prestige crime-drama atmosphere: quiet menace, industrial texture, smoky rooms and deliberate shadows, without copying any specific series sets, shots, characters or costumes. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.';
    const sample={version:4,title:'Story title',chapter:'Complete connected short-film story',panels:[{
      id:1,beat:'A courier arrives with an unexpected message',location:'Rain-dark railway platform',time:'blue hour',carry:'A sealed envelope is still in the courier’s left hand',worldState:'Same green-tiled platform, iron columns, analog clock, wet ground and neutral practical platform lamps; sealed cream envelope in courier’s left hand; no other props change.',transitionIn:'Opening shot; establish the platform and courier.',transitionOut:'Courier holds the envelope out; protagonist begins reaching with the right hand.',
      shot:'establishing',angle:'wide, eye-level, clean straight-axis view',angleReason:'A wide establishing frame introduces the station and the distance between them.',action:'The protagonist notices the courier across the platform',emotion:'Guarded curiosity',
      cast:[{name:'Exact name',pose:'Still beside the platform clock',gaze:'courier',bounds:{x:.62,y:.22,w:.25,h:.66}}],
      ...(textOverlays?{narration:'The last train was already gone.',dialogue:[{speaker:'Exact name',text:'Then we leave on foot.'}]}:{}),
      vehicles:[],npcs:[],visual:'Layered platform depth, practical lamps, wet concrete, restrained smoke and a readable silhouette',
      sceneId:'station-platform',sceneDescription:'Old iron columns, green tile, analog clock, wet concrete and neutral practical platform lamps'
    }]};
    const overlayNarration='Narration is OPTIONAL, never required on every panel. Prefer silent action, reaction and atmosphere panels. When needed, use one short direct thought or context sentence, at most 100 characters. Use up to two dialogue entries, each at most 90 characters; total visible text must be at most 180 characters AND 32 words per panel. Usually use either narration or dialogue. Avoid repeating what the art already shows. Split necessary exchanges across connected beats; keep the exact panel-count constraint and preserve plot facts, speaker and meaning.';
    const narrationStyle='Write clear natural narration in the user\'s language, readable on the first pass. Preserve viewpoint, tense, names, facts and emotional meaning. Use everyday words and short direct sentences; avoid ornate metaphors, dense clauses, repeated explanations and filler. Let expressive artwork carry the scene.';
    const overlayInstructions=textOverlays
      ?`IN-IMAGE STORY LETTERING IS ON FOR EVERY ART STYLE. ${overlayNarration} Dialogue: Dialogue must sound sharp and authentic to each specific character, moving the scene forward without repeating earlier lines or restating what the narration already said. Keep each dialogue line under 90 characters. Store the speaker name only as internal metadata so the balloon can be placed by the correct visible character; NEVER include the character name or a speaker label in the visible bubble text. The image model renders the exact text together with the art. Compose space INSIDE the scene for compact black narration cards and white speech balloons. Narration uses consistent white bold italic serif lettering; dialogue uses consistent black rounded comic lettering. Plan quiet wall, sky or shadow areas beside/above the cast for text without covering faces, hands, weapons or key props. Keep that background fully painted to the image edges; never create an external text band, white border or blank footer. Do not make the character distant to fit lettering.`
      :'OPTIONAL IN-IMAGE WEBTOON LETTERING IS OFF. Do not include narration or dialogue text; generated keyframes remain completely text-free.';
    return `You are a feature-film visual storyteller and cinematographer. Return raw JSON only, using this schema: ${JSON.stringify(sample)}
STORY / SCENE FEED: ${brief}
${sourceInstruction}
CHARACTER TAGS: Names written as @Character in the feed identify who must participate in that beat. Preserve those exact supplied names. A tagged character is not automatically in every shot; use the story context and the tag's immediate beat.
CAST REFERENCE BIBLE: ${JSON.stringify(cast)}
${heightRules(cast)}
CAST SIZE AND PANEL COVERAGE: The cast list may contain any number of registered characters. Do not drop, merge, rename, or forget characters because the cast is large. Each frame can carry only a limited number of identity and outfit references, so show no more than four registered cast characters in one panel. When a story beat involves a larger group, cover it with several directly connected panels (establish the group, then use motivated two-shots and close reactions) so every story-relevant character remains present in the sequence and identities/outfits stay correctly paired. Do not turn a registered character into an NPC to bypass this limit.
${overlayInstructions}
${textOverlays?'DIALOGUE SPEAKERS: Use the exact visible cast name or the supporting NPC name/role. If a voice comes from outside this shot, retain its exact dialogue and add offscreen:true to that dialogue entry. Do not add a visible person just to give an off-screen voice a bubble. Off-screen voice bubbles have no directional tail.':''}
LANGUAGE AND NARRATION STYLE: ${narrationStyle} Make each panel's narration and dialogue distinctly purposeful; never reuse identical lines or generic filler. Dialogue should feel natural, crisp, and conversational. Speaker names are storyboard metadata only; never write a character name as part of the words inside a speech bubble.
${requestedPanels?`USER-REQUESTED PANEL COUNT — EXACT: Return exactly ${requestedPanels} panels, no fewer and no more. The user explicitly requested this count; do not replace it with your own shorter estimate. Give every panel a distinct story beat and preserve the full event sequence.`:`PANEL DENSITY: Return at least ${minimumPanels} panels and up to ${maxPanels} only if the story needs them. Do not compress separate actions, reactions, reveals, decisions, dialogue turns, travel beats, or consequences into one frame. One panel captures one frozen moment, not a sequence of actions. Expand the complete story at a clear beat-by-beat pace; never arbitrarily stop at 10–12 panels. Every panel must advance the story or give a purposeful reaction, reveal, pause, or continuity view—never pad with duplicate shots.`}
Write a focused, complete story in the user's language, then translate it into chronological cinematic keyframes.${requestedPanels?` Use exactly ${requestedPanels} panels.`:` Use the number of panels the chapter genuinely needs, with the panel-density minimum above.`} Make the story build from a clear setup through escalation and choice to a satisfying payoff. Each frame is a legible film shot. Use conventional coverage: mostly eye-level straight-axis or subtle three-quarter views, stable two-shots, clean over-the-shoulders, close reactions, and story-relevant inserts. Keep at least 70% of character panels in medium, medium-close, close, tight two-shot or close over-shoulder coverage. At least a third of eligible single-character panels should be close reactions. Use wide/establishing coverage only for a new location or action that requires geography, normally no more than one in five panels. Include at least two intentional close-up shots of named characters when they are present: use them for an emotional reaction, realization, decision, or a crucial detail—not as random zooms. A close-up means a clearly readable face/head-and-shoulders frame, not another medium shot. A profile, hard side view, high/low angle, obstructed view, or unusual perspective is exceptional: use it only when the action clearly needs it, explain that reason in angleReason, and use no more than one such shot in this sequence. Never add an angle just to create variety. No dutch/canted tilt, slanted horizon, extreme perspective, arbitrary side view, or camera peeking from behind an object. Keep faces clearly visible and large enough to read on a phone. Medium means waist-up or chest-up, never a small full-body figure surrounded by scenery. Tight two-shots show both people waist-up; ordinary conversation uses natural conversational separation, not opposite edges of an empty room. Respect distance explicitly required by the story. Keep screen direction, prop hands, positions, eye-lines, relative heights, weather, time and geography continuous. Carry is the concrete state inherited from the previous frame.
Every adjacent pair must be directly connectable as consecutive moments of one continuous take or a motivated film cut: explicitly state transitionIn (how this frame begins from the prior frame) and transitionOut (the exact pose/action/prop state that leads to the next frame). Also give every panel a concise worldState: inventory and visual state of all story-relevant recurring objects, vehicles, set dressing, weather, damage, and their exact positions/owners/holders. Keep recurring objects visually identical (same make, color, shape, damage, contents and orientation) and keep locations, background landmarks, weather and practical lights stable while the scene remains there. An object may move, change hands, be used, damaged or disappear only when the story explicitly shows that change; update worldState and carry the result into all later panels. Never silently add, remove, duplicate, redesign, teleport or swap a prop or vehicle. Preserve positions, screen direction, eye-lines, hand holding, vehicle lane, seat assignments, wardrobe, lighting and set details across the cut. Advance action in small believable steps; do not reset poses, teleport props, reverse travel direction, or skip consequences. For the first frame, transitionIn establishes the scene; for the last, transitionOut resolves the sequence. Avoid a new angle that breaks geography; use motivated coverage while matching the established axis.
Treat every story-critical vehicle, pursuer, threat, or offscreen action as something the viewer must actually see. For a car chase, allocate enough frames to establish the lead car, clearly show the pursuing car, show the gap closing or chase maneuver, and then show the protagonists' reaction or consequence. Do not merely mention the pursuer in chapter prose, hide it offscreen, or collapse the chase into one confusing frame. Use additional panels up to the limit when the action needs them; every required car should be visually identifiable and spatially consistent.
Every panel must include id, beat, location, time, carry, worldState, transitionIn, transitionOut, shot, angle, angleReason, action, emotion, cast, vehicles, npcs, visual, sceneId and sceneDescription. Each visible cast entry must include the exact name, pose, gaze and normalized bounds. Use shots from: establishing, wide, two-shot, medium, medium-close, close, over-shoulder, insert. Angle is a separate camera instruction; visual describes scene content and must not add a conflicting camera angle.
For any vehicle scene, every panel must have a vehicles array (empty only when no vehicle is part of the scene). Give every recurring vehicle a stable unique id such as lead-car or pursuing-car and repeat it exactly. Record for each: makeModel, bodyType, color, distinctiveStructure, damage, facingDirection, travelDirection, lane, screenPosition, relativePosition, and occupants with exact character names and seats. The first appearance establishes canonical make/model, body type, color, structure and damage; never change these later. Update direction/lane/position only when the story explicitly shows a turn, lane change, pass, stop or collision; otherwise carry them forward. Describe each movement in transitionOut, then match it in the next panel's transitionIn. Camera coverage may change screen position only as a consequence of a stated view/axis change; physical lane, heading and spacing stay consistent. Keep separate cars separate, with stable identities and lead/pursuer relationship. In cabin shots, seats face the windshield, occupants sit upright; the named driver stays at the steering wheel and named passengers stay in assigned seats. Never put anyone sideways, backwards, floating, merged, or in a seat facing the wrong way. Keep steering-wheel side and cabin structure consistent. Do not combine incompatible interior and exterior viewpoints in one frame.
Only exact names in CAST REFERENCE BIBLE may appear in cast. Any other visible person (for example an antagonist, guard, courier, or bodybuilder) must be listed as a supporting NPC in npcs, with a stable name/role, description, action, gaze and normalized bounds. Never treat an NPC as a registered character or attach a registered character's identity/outfit references to them. Identity references define registered faces and, unless the user supplies optional height or physique notes, define body continuity too. Only supplied height/physique notes override the identity photo. Outfit references and outfit notes define registered wardrobe. Never blend identities or use another character's clothing. Keep costumes unchanged across the story unless the plot explicitly includes a wardrobe change. Add no crowd unless the story needs it. Use normalized cast bounds within .02–.98 as approximate composition guidance, as character blocking guides. When lettering is enabled, describe quiet background areas for the text within the composition; avoid overlap with faces, hands and important action.
Keep physical locations fixed across reverse angles: repeat the exact same sceneId and sceneDescription for every shot in one place. Change them only when the story physically moves. Show coherent production design, deep foreground/midground/background, believable lens perspective and expressive blocking. ${toneInstruction} Never infer period wardrobe; wardrobe references always win.
${textOverlays?'When in-image lettering is ON, include only the exact narration and dialogue strings defined for that panel; no other readable writing. When it is OFF, keep the frame entirely text-free. Never render logos, watermarks, app UI, notification banners, close buttons, X icons, or text-like marks.':'Keep the frame entirely text-free: no words, captions, logos, watermarks, comic bubbles, borders, split panels, collage, app UI, notification banners, close buttons, X icons, lettering or text-like marks.'} Do not reserve empty margins for text; compose the full scene naturally. Keep faces, hands and story-critical props visible and anatomically plausible. Hair rule: preserve each character's reference and novel hair texture, length and color, including curls. Do not impose a generic hairstyle. ${bgStyle==='webtoon'?'Maintain a polished cinematic Webtoon illustration; follow the attached art reference for its exact mood and tone. Avoid cute, chibi or children\'s cartoon styling.':'Maintain photorealistic cinematic drama, not fashion posing, illustration, anime or a generic glossy poster.'} Before returning, audit story order, tag participation, character/outfit continuity and scene geography.`;
  }
  function panelCountCorrectionPrompt(originalPrompt,currentPlan,requiredCount,exactCount=null) {
    const countRule=exactCount?`The user requested exactly ${exactCount} panels.`:`This storyboard needs at least ${requiredCount} panels to keep its distinct story beats readable.`;
    return `${originalPrompt}\n\nMANDATORY PANEL-COUNT CORRECTION: Your previous storyboard did not satisfy the panel count. ${countRule} Revise the CURRENT STORYBOARD below into the required count. Do not omit or reorder source events. If expanding, split combined actions into their own chronological frozen moments, add necessary reactions, reveals, dialogue turns, travel/action steps and consequences; every added panel must be distinct and useful, with direct continuity to its neighbors. Do not add filler or duplicate shots. Preserve all names, story facts, dialogue meaning, vehicle/prop states, location continuity, and the full schema for every panel. Return the complete corrected JSON only, with ${exactCount?`exactly ${exactCount}`:`at least ${requiredCount}`} panels.\nCURRENT STORYBOARD TO CORRECT:\n${JSON.stringify(currentPlan)}`;
  }

  function validate(raw,characters,maxPanels=20,textOverlays=false,minimumPanels=6,exactCount=null,poseLocked=false) {
    if(raw?.version!==4 || !text(raw.chapter) || !text(raw.title)) throw Error('Story 4 requires version, title and full chapter');
    if(!Array.isArray(raw.panels)||raw.panels.length<(exactCount?4:6)||raw.panels.length>maxPanels) throw Error(`Story needs ${exactCount?4:6}–${maxPanels} panels`);
    if(exactCount&&raw.panels.length!==exactCount) throw Error(`Gemini returned ${raw.panels.length} panels; the request specified exactly ${exactCount}.`);
    if(!exactCount&&raw.panels.length<minimumPanels) throw Error(`Gemini returned ${raw.panels.length} panels; this story needs at least ${minimumPanels} to preserve its full sequence.`);
    const names=new Map();
    for(const c of characters)for(const alias of [c.name,...String(c.aliases||'').split(',')].map(s=>s.trim()).filter(Boolean)) {
      const key=alias.toLowerCase();
      if(names.has(key)&&names.get(key)!==c.name)throw Error(`Ambiguous character alias: ${alias}`);
      names.set(key,c.name);
    }
    let unusualAngleCount=0;
    const panels=raw.panels.map((p,index)=>{
      const fail=message=>{throw Error(`Panel ${index+1}: ${message}`);};
      for(const key of ['beat','location','time','carry','action','emotion','visual']) if(!text(p[key])) fail(`missing ${key}`);
      if(!['close','medium-close','waist','knees','over-shoulder','detail','establishing','wide','two-shot','medium','insert'].includes(p.shot)) fail('unsupported shot');
      if(!Array.isArray(p.cast)) fail('missing cast');
      const promotedNpcs=[];
      const cast=p.cast.map(c=>{
        const suppliedName=text(c.name);
        const name=names.get(suppliedName.toLowerCase());
        if(!name) {
          if(!suppliedName) fail('unnamed cast entry');
          if(!text(c.pose)||!text(c.gaze)) fail(`supporting person ${suppliedName} is missing pose or gaze`);
          const bounds=rect(c.bounds,`Panel ${index+1} supporting person`);
          promotedNpcs.push({name:suppliedName,role:suppliedName,description:[text(c.description),text(c.physique),text(c.pose)].filter(Boolean).join('; '),action:text(c.pose),gaze:text(c.gaze),bounds});
          return null;
        }
        if(!text(c.pose)||!text(c.gaze)) fail('missing pose or gaze');
        return {...c,name,bounds:rect(c.bounds,`Panel ${index+1} cast`)};
      }).filter(Boolean);
      if(cast.length>4) fail('more than four registered cast characters are visible; split this group beat across connected panels so each person keeps their own identity and outfit references');
      const npcs=[];
      for(const npc of [...(Array.isArray(p.npcs)?p.npcs:[]),...promotedNpcs]) {
        const registered=names.get(text(npc.name||npc.role).toLowerCase());
        if(registered) {
          if(!cast.some(c=>c.name===registered))cast.push({name:registered,pose:text(npc.action)||text(npc.pose)||'present in this beat',gaze:text(npc.gaze)||'scene action',bounds:rect(npc.bounds,`Panel ${index+1} cast`)});
        } else npcs.push(npc);
      }
      if(new Set(cast.map(c=>c.name)).size!==cast.length)fail('the same character appears twice under different aliases');
      if(cast.length>4)fail('more than four registered characters; split the group beat');
      const vehicles=Array.isArray(p.vehicles)?p.vehicles.map(v=>({
        id:text(v.id),makeModel:text(v.makeModel),bodyType:text(v.bodyType),color:text(v.color),
        distinctiveStructure:text(v.distinctiveStructure),damage:text(v.damage)||'none',
        facingDirection:text(v.facingDirection),travelDirection:text(v.travelDirection),lane:text(v.lane),
        screenPosition:text(v.screenPosition),relativePosition:text(v.relativePosition),
        occupants:Array.isArray(v.occupants)?v.occupants.map(o=>({name:text(o.name),seat:text(o.seat)})):[]
      })):[];
      if(!cast.length && !npcs.length && !['detail','insert','establishing','wide'].includes(p.shot)) fail('character required');
      const unusualAngle=/\b(profile|side(?:-on)?|low angle|high angle|dutch|canted|tilt|oblique|from below|from above|behind (?:a|the)|through (?:a|the))\b/i.test(text(p.angle));
      const unusualLimit=1;
      const cameraAdjusted=!poseLocked&&unusualAngle&&(!text(p.angleReason)||unusualAngleCount>=unusualLimit);
      if(unusualAngle&&!cameraAdjusted) unusualAngleCount++;
      const angle=cameraAdjusted?'eye-level, straight-axis or subtle three-quarter view with faces unobstructed':text(p.angle)||'eye-level, straight-axis view';
      const protectedRegions=(Array.isArray(p.protectedRegions)?p.protectedRegions:[]).map(b=>rect(b,`Panel ${index+1} protected detail`));
      return {...p,id:index+1,cast,npcs,vehicles,angle,cameraAdjusted,unusualAngle:unusualAngle&&!cameraAdjusted,lettering:[],protectedRegions,characters:cast.map(c=>c.name),introType:'none',
        scenePrompt:p.visual,continuity:`${p.location}; ${p.time}; ${p.carry}`,
        blocking:cast.map(c=>`${c.name}: ${c.pose}; gaze ${c.gaze}`)};
    });
    const speakerKey=value=>text(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const speakerNames=new Map([...names].map(([alias,name])=>[speakerKey(alias),name]));
    panels.forEach((panel,pIdx)=>{
      if(!textOverlays){delete panel.narration;delete panel.dialogue;return;}
      panel.narration=text(panel.narration);
      if(panel.narration.length>1200)throw Error(`Panel ${pIdx+1}: narration is too long; split it into another panel without dropping words.`);
      const visibleSpeakers=new Map(panel.cast.map(c=>[speakerKey(c.name),c.name]));
      for(const npc of panel.npcs){
        const speaker=text(npc.name)||text(npc.role);
        for(const alias of [npc.name,npc.role,...String(npc.aliases||'').split(',')])if(text(alias)) {
          const key=speakerKey(alias);
          // An ambiguous shared role must not attach a balloon to the wrong NPC.
          if(!visibleSpeakers.has(key))visibleSpeakers.set(key,speaker);
          else if(visibleSpeakers.get(key)!==speaker)visibleSpeakers.set(key,null);
        }
      }
      panel.dialogue=(Array.isArray(panel.dialogue)?panel.dialogue:[]).filter(line=>text(line?.text)).map(line=>{
        const canonical=speakerNames.get(speakerKey(line.speaker))||text(line.speaker);
        const speaker=visibleSpeakers.get(speakerKey(canonical));
        if(text(line.text).length>1200)throw Error(`Panel ${pIdx+1}: split long dialogue into another panel.`);
        const offscreen=line.offscreen===true||!speaker;
        return {speaker:speaker||canonical||'Off-screen voice',text:text(line.text),...(offscreen?{offscreen:true}:{})};
      });
      validateLettering(panel,pIdx);
    });
    panels.forEach((panel,index)=>{
      const previous=panels[index-1], next=panels[index+1];
      panel.worldState=text(panel.worldState)||`${panel.sceneDescription||panel.location}; ${panel.carry}; preserve all visible recurring objects, vehicle details, background landmarks, weather, lighting and their positions from the previous panel unless this action explicitly changes them.`;
      panel.transitionIn=text(panel.transitionIn)||(previous?`Continue from panel ${index}: ${previous.transitionOut||previous.carry}.`:`Opening setup: establish ${panel.location}, ${panel.time}, and the characters' starting positions.`);
      panel.transitionOut=text(panel.transitionOut)||(next?`End on a pose and prop state that leads directly into panel ${index+2}: ${next.action}; carry forward ${next.carry}.`:`Resolve the story beat and hold a clear final pose.`);
    });
    // Keep each recurring vehicle's physical identity fixed while allowing only story-motivated movement.
    const vehicleBible=new Map();
    for(const panel of panels){
      const context=`${panel.beat} ${panel.action} ${panel.visual} ${panel.location} ${panel.carry}`;
      const vehicleMentioned=/\b(car|vehicle|automobile|taxi|truck|lorry|van|chase|pursu)\b/i.test(context);
      panel.vehicleContinuity=vehicleMentioned||panel.vehicles.length>0;
      if(vehicleMentioned&&!panel.vehicles.length){
        if(vehicleBible.size) panel.vehicles=[...vehicleBible.values()].map(vehicle=>({...vehicle,occupants:[...vehicle.occupants]}));
        else {
          const fallbackVehicle=(id,relativePosition)=>({id,makeModel:'same model established at first appearance',bodyType:'same body type established at first appearance',
            color:'same color established at first appearance',distinctiveStructure:'same grille, windows, lights, trim and proportions throughout',damage:'none',
            facingDirection:'forward along the established road direction',travelDirection:'forward along the established road direction',lane:'same established lane',
            screenPosition:'same established screen position',relativePosition,occupants:[]});
          panel.vehicles=[fallbackVehicle('lead-car','lead vehicle; preserve its gap to the pursuing vehicle'),
            ...(/pursu|chase/i.test(context)?[fallbackVehicle('pursuing-car','behind the lead vehicle at the established chase distance')]:[])];
        }
      }
      panel.vehicles=panel.vehicles.map((vehicle,index)=>{
        const id=vehicle.id||`vehicle-${index+1}`;
        const previous=vehicleBible.get(id);
        const movementShown=/\b(turn|turns|turning|swerve|change lane|switch lane|overtake|pass(?:es|ed)?|brake|brakes|braking|stop|stops|stopped|reverse|reverses|collision|crash|hits|strikes|pulls over|accelerate|accelerates|accelerating|u-turn)\b/i.test(`${panel.action} ${panel.transitionIn} ${panel.transitionOut}`);
        const viewChangeShown=/\b(camera|angle|reverse shot|cut to|interior|exterior|wide shot|close-up|overhead|tracking shot|new view)\b/i.test(`${panel.angle} ${panel.transitionIn} ${panel.transitionOut}`);
        const normalized={...vehicle,id,
          makeModel:previous?.makeModel||vehicle.makeModel||'same established vehicle model',
          bodyType:previous?.bodyType||vehicle.bodyType||'same established body type',
          color:previous?.color||vehicle.color||'same established color',
          distinctiveStructure:previous?.distinctiveStructure||vehicle.distinctiveStructure||'preserve established grille, windows, lights, trim and proportions',
          damage:previous?.damage||vehicle.damage||'none',
          facingDirection:previous&&!movementShown?previous.facingDirection:(vehicle.facingDirection||previous?.facingDirection||'same heading as previous panel'),
          travelDirection:previous&&!movementShown?previous.travelDirection:(vehicle.travelDirection||previous?.travelDirection||'same travel direction as previous panel'),
          lane:previous&&!movementShown?previous.lane:(vehicle.lane||previous?.lane||'same lane as previous panel'),
          screenPosition:previous&&!viewChangeShown&&!movementShown?previous.screenPosition:(vehicle.screenPosition||previous?.screenPosition||'same screen position as previous view'),
          relativePosition:previous&&!movementShown?previous.relativePosition:(vehicle.relativePosition||previous?.relativePosition||'same spacing and relationship to other vehicles'),
          occupants:vehicle.occupants.length?vehicle.occupants:(previous?.occupants||[])
        };
        vehicleBible.set(id,normalized);
        return normalized;
      });
    }
    // Only tighten eligible single-person coverage; retain wide geography,
    // vehicle action and every visible participant in group shots.
    const closeupEligible=panels.filter(p=>p.cast.length===1&&!p.npcs.length&&!p.vehicles.length&&!['wide','establishing','insert'].includes(p.shot));
    const requiredCloseups=poseLocked?0:Math.min(closeupEligible.length,Math.max(2,Math.ceil(closeupEligible.length/3)));
    let closeupCount=closeupEligible.filter(p=>p.shot==='close').length;
    const closeupCandidates=closeupEligible.filter(p=>p.shot!=='close').sort((a,b)=>{
      const priority=p=>/react|realiz|discover|decid|fear|shock|understand|betray|hesitat|remember/i.test(p.beat+' '+p.emotion+' '+p.action)?1:0;
      return priority(b)-priority(a);
    });
    for(const panel of closeupCandidates){
      if(closeupCount>=requiredCloseups)break;
      panel.shot='close';panel.angle='eye-level, subtle three-quarter close-up with the face unobstructed';
      panel.angleReason='Read the existing emotion and action in a close character view.';
      panel.closeupAdjusted=true;closeupCount++;
    }
    const scenes=new Map();
    panels.forEach(p=>{
      p.sceneId=text(p.sceneId)||'main-scene';
      if(!scenes.has(p.sceneId)) scenes.set(p.sceneId,text(p.sceneDescription)||p.location);
      p.sceneDescription=scenes.get(p.sceneId);
    });
    const designBible={};
    if(raw.designBible&&typeof raw.designBible==='object'&&!Array.isArray(raw.designBible))for(const [name,design] of Object.entries(raw.designBible)) {
      if(typeof design==='string'&&design.trim()&&name!=='__proto__')designBible[names.get(name.toLowerCase())||name]=design.trim().slice(0,2000);
    }
    for(const p of panels)for(const npc of p.npcs) {
      const name=text(npc.name)||text(npc.role);
      if(name&&name!=='__proto__') {if(!designBible[name])designBible[name]=text(npc.description);npc.description=designBible[name];}
    }
    return {version:4,title:raw.title,chapter:raw.chapter,designBible,panels,prompts:panels.map(p=>p.visual)};
  }
  function imagePrompt(panel,referenceMap,physicalLock,bgStyle,aspectRatio='IMAGE_ASPECT_RATIO_LANDSCAPE',textInImage=false,poseLocked=false) {
    const framing=aspectRatio==='IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE'?'4:3 landscape':aspectRatio==='IMAGE_ASPECT_RATIO_SQUARE'?'1:1 square':aspectRatio==='IMAGE_ASPECT_RATIO_PORTRAIT'?'9:16 portrait':aspectRatio==='IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR'?'3:4 portrait':'16:9 widescreen landscape';
    const tone=bgStyle==='webtoon'?'When supplied, follow the Webtoon art-style reference exactly for palette, color intensity, contrast, shading and cinematic mood; without one, let the story and scene set the mood in full-color cinematic illustration, with no default dark/noir look':bgStyle==='photorealistic'?'neutral, clean ungraded photorealism; accurate natural color and white balance, normal camera-photo contrast, realistic skin and fabric, no warm/orange cast, film grain, sensor noise, vignette, bloom, fake bokeh, cinematic LUT, teal-orange grade, haze or stylized effects':bgStyle==='grounded-thriller'?'grounded suspense, natural color, controlled tension':bgStyle==='warm-drama'?'warm human drama, natural skin tones, gentle practical light':'brooding prestige crime drama, quiet menace, industrial texture, restrained color and deliberate shadows';
    const lighting=bgStyle==='webtoon'?'When an art-style reference is attached, follow its lighting behavior and tone. Without one, use scene-appropriate cinematic lighting and let the story set the mood. Keep weather and time physically consistent; do not force noir darkness or a fixed color cast.':bgStyle==='photorealistic'?'Use neutral white balance and physically believable ambient exposure appropriate to the stated weather and time; natural daylight is allowed when called for. Keep color temperature true to the scene and avoid added amber warmth, dramatic color casts or artificial lighting effects.':'Exteriors: overcast grey or dim diffused ambient light only. Interiors: low-key motivated practical lamps only. No visible sun, direct sunlight, sunny/golden-hour lighting, sunlit patches, window sunbeams, god rays, volumetric beams, heavenly glow or lens-flare streaks.';
    const photographicDirection=bgStyle==='photorealistic'?'Use natural camera framing and realistic lens perspective, normal camera-photo depth of field, clean detail and balanced exposure; no stylized cinematic lighting or grading.':'Use deliberate cinematic framing, layered depth, practical light sources, expressive shadow and believable lens perspective.';
    const dialogueAssignments=(panel.dialogue||[]).map((line,index)=>`Balloon ${index+1} ${line.offscreen?`is an off-screen voice from ${line.speaker}; use no directional tail and do not add that person to the visible cast`:`is spoken by ${line.speaker}; place it beside that visible character`}, but the balloon must contain ONLY these exact words: “${line.text}” (never print the speaker name or a name label).`).join(' ');
    const letteringInstruction=textInImage?`IN-IMAGE WEBTOON LETTERING — RENDER THESE EXACT WORDS DIRECTLY INSIDE THIS IMAGE, NOT AS A LATER OVERLAY.
${panel.narration?`NARRATION CARD (copy verbatim): “${panel.narration}”. Use one compact opaque black rectangular card, crisp white bold italic serif lettering, left-aligned for multiple lines or centered for one short line. Place it over a quiet painted background in the upper part of this composition, like a finished webtoon panel.`:'No narration card.'}
${dialogueAssignments||'No speech balloons.'}
SPEECH STYLE: White or very pale cream oval/rounded balloons, thin black outline, clear black rounded comic lettering, one consistent font and weight. Make tails lead toward the speaking mouth without crossing eyes, faces, hands or props. Off-screen voices have no directional tail; never invent a visible speaker or print a speaker label.
FIT AND READING ORDER: Narration then speech, top-to-bottom with clear separation. Use readable, consistent lettering about 4–5% of image width. Keep narration to 1–3 short lines and each speech balloon to 1–4 lines. Fit the shape to the words with modest internal padding, never an oversized empty balloon. Usually keep all lettering below about 22% of the picture area. Keep every shape and tail inside a 4% edge inset. Arrange the scene and text together so text sits over background and characters stay close and readable. Never cover the face, hair silhouette, hands, weapons or story-critical action; never cut a balloon at the frame edge. Do not copy text from reference images, add extra quotation marks, repeat, paraphrase or misspell the supplied lines.
FULL-BLEED OUTPUT: Artwork continues to all four edges behind the lettering. No white outer border, blank text band, footer, page margin, letterboxing, expanded canvas or separate caption area. No extension overlay will be added.`:'NO IN-IMAGE TEXT: keep the entire image free of words, letters, numbers, captions, bubbles, logos, and watermarks.';
    const vehicleContext=panel.vehicleContinuity?`\nVEHICLE GEOMETRY LOCK: Render exactly the listed vehicles, retaining each stable id, make/model, body type, paint color, distinctive body structure and damage. Vehicle state for this panel: ${JSON.stringify(panel.vehicles)}. Never redesign a car, change its body shape, color, grille, windows, lights, wheelbase or damage; never duplicate, merge or swap lead and pursuing cars. Preserve each vehicle's front/rear orientation, heading, travel direction, lane, screen position, relative spacing and occupants from this ledger. Alter a position or direction only if this panel's action and transition explicitly show the move. In cabin views, preserve the same steering-wheel side and seat layout; seats face the windshield, people sit upright, named driver stays at the wheel and passengers remain in assigned seats. No sideways/backwards/floating/merged bodies, seat swaps, impossible limbs, or fused interior/exterior perspectives.`:'';
    return `${poseLocked?'POSE TEMPLATE RECONSTRUCTION: Recreate REFERENCE IMAGE 1 geometry exactly, replacing only the named characters, clothes and scene content.\n':''}STORY STUDIO 5. ONE full-bleed ${bgStyle==='webtoon'?'cinematic Webtoon illustrated frame':bgStyle==='photorealistic'?'neutral natural photorealistic photograph':'photorealistic cinematic film still'}, one frozen instant, composed for ${framing}. Use the full frame; no external caption area. ${letteringInstruction} No app UI, notifications, close button, X icon, outer border, logos, watermark or collage.
SHOT: ${poseLocked?"reference posture and crop, with the specified body proportions":panel.shot}. BEAT: ${panel.beat}. ACTION: ${panel.action}. EMOTION: ${panel.emotion}.
${poseLocked?"FRAMING AUTHORITY: Match REFERENCE IMAGE 1 camera position, angle, crop, subject scale and joint positions. Do not apply storyboard shot sizes, close-up corrections, face-visibility preferences or gaze changes.":"FRAMING AUTHORITY: The SHOT size overrides any conflicting crop or distance in scene descriptions. Close: face and shoulders, face about 35–55% of image height. Medium-close: chest-up, head/torso fills about 75–90% of image height. Medium: waist-up, body crop fills about 70–90% of image height. Two-shot: tight waist-up coverage of both participants, readable faces, natural conversational separation unless the action requires a gap. Over-shoulder: stay close to the speaking face, foreground shoulder at an edge. Do not turn these into distant full-body figures or fill most of the frame with empty environment. Wide/establishing: show only the geography the beat needs; insert: fill the image with the relevant object. Preserve physical distance required by the story; move the camera closer instead of teleporting characters."}
CAMERA: ${poseLocked?'Use only the exact camera geometry of REFERENCE IMAGE 1.':(text(panel.angle)||'motivated eye-level composition')+'. '+photographicDirection} FACE MATCH HAS PRIORITY OVER STYLE: match every visible named character to that character's primary identity photo; preserve exact eye shape and spacing, brows, nose, lips, jaw, cheekbones, hairline, complexion, age and distinctive marks. Do not substitute a generic face or let shadows, color grading, angle, expression or atmosphere redesign facial features. Supplementary photos clarify the same face only.
${vehicleContext}
SCENE CONTENT ONLY: ${poseLocked?panel.location+"; "+panel.sceneDescription:panel.visual}
TONE: ${tone}. ${lighting} Tone controls atmosphere only; it never changes a character's face or wardrobe.
${panel.retryKey && !poseLocked ? `RETRY ${panel.retryKey}: fresh micro-expression, preserve beat, continuity and any requested in-image lettering.` : ''}
CONTINUITY: ${panel.location}; ${panel.time}; ${panel.carry}. WORLD STATE (high authority): ${panel.worldState}. IN: ${panel.transitionIn}. OUT: ${panel.transitionOut}. Match every recurring object's identity, condition and position, plus background, screen direction, gaze, hand/prop state, vehicle layout, weather and light to the adjacent panel; this is a consecutive moment, not a reset. Change or remove an item only when the action explicitly shows it, then preserve the changed state in later panels.
FIXED PHYSICAL SET ${panel.sceneId}: ${panel.sceneDescription}. Keep materials, floor, architecture, landmarks and lighting direction consistent across reverse angles. Camera movement must not redesign the location.
${poseLocked?"CAST IDENTITIES (pose and placement come only from REFERENCE IMAGE 1): "+JSON.stringify(panel.cast.map(({name})=>({name}))):"CAST ACTION AND SCREEN ORDER (crop is governed by SHOT, not old bounding boxes): "+JSON.stringify(panel.cast.map(({bounds,...c})=>({...c,screenSide:bounds?(bounds.x+bounds.w/2<.5?'left':'right'):'story-driven'})))}
VEHICLE LEDGER: ${JSON.stringify(panel.vehicles)}
NPCs: ${JSON.stringify(panel.npcs.map(({bounds,...npc})=>npc))}
${panel.safetyRestage?'SAFETY-RESPECTING RESTAGE: Preserve this same story beat, characters, setting, and emotional consequence, but depict it non-graphically and without explicit or disturbing detail. Suggest danger through expressions, distance, soundless environmental clues, or a calm aftermath; do not show gore, exposed injuries, sexual content, or exploitative framing. Do not change the story into a different event.':''}
${textInImage?'Compose the exact narration and dialogue above inside this image. There is no post-generation overlay.':'No text or graphic overlays.'} Use the whole image area naturally; keep faces, bodies, hands and story-critical objects readable.
${physicalLock}
${referenceMap}

Use each named character's own identity and outfit images only. Preserve exact garments, pattern, color, fit, height, physique and face. Adapt drape to current action, do not redesign. ${poseLocked?"Keep gestures, head position, expression, gaze and limb placement identical to REFERENCE IMAGE 1; story events do not authorize a different pose or crop.":"Keep gestures and expressions story-driven, never a fashion pose."} The selected tone applies only to lighting, production texture and emotional tone; do not invent period clothing. ${lighting} ${bgStyle==='webtoon'?'Output a polished cinematic Webtoon illustration with realistic anatomy and expressive acting. When supplied, follow the art-style reference\'s visual mood and tone; without one, let the story set the mood.':'Output live-action photorealism only: no cartoon, CGI, animation, anime, illustration, painting or stylized rendering.'}`;
  }
  function scenePrompt(panel,bgStyle='crime-noir',textOverlays=false) {
    const cast=panel.cast.map(c=>`${c.name}: ${c.pose}, looking ${c.gaze}`).join('; ');
    const vehicles=panel.vehicles.map(v=>`${v.id}: ${v.makeModel}, ${v.bodyType}, ${v.color}; heading ${v.facingDirection}, ${v.travelDirection}, ${v.lane}, ${v.relativePosition}; damage ${v.damage}`).join('. ');
    const style=bgStyle==='webtoon'?'Cinematic Webtoon illustration; when supplied, let the art-style reference set palette, lighting mood, contrast, ink and shading consistently across panels. Without a reference, let the story set the visual mood; do not force dark/noir treatment.':bgStyle==='photorealistic'?'Neutral ungraded camera-photo realism, accurate white balance and natural skin; no warm color cast, grain, noise, vignette, bloom or cinematic LUT. Allow scene-appropriate ambient daylight.':bgStyle==='warm-drama'?'Warm character drama, natural skin tones and gentle practical lighting; overcast grey exteriors, no sun or sunrays.':bgStyle==='grounded-thriller'?'Grounded suspense, natural color and controlled tension; overcast grey exteriors, no sun or sunrays.':'Brooding prestige crime-drama atmosphere, restrained color, controlled shadows and practical low-key lighting; overcast grey exteriors, no sun or sunrays.';
    const lettering=textOverlays?`In-image lettering composed with the artwork: black narration card, copy exactly “${panel.narration||'none'}”. ${(panel.dialogue||[]).map((line,index)=>`Dialogue balloon ${index+1} ${line.offscreen?`is an off-screen voice from ${line.speaker}, with no tail; do not add that person to the visible cast`:`belongs beside ${line.speaker}`}, but its visible text is ONLY “${line.text}”; never include the character name or a speaker label.`).join(' ')||'No dialogue balloons.'} Use white bold italic serif narration on compact black rectangular cards and black comic lettering inside white rounded speech balloons. Keep them inside the scene, clear of faces and action. Artwork fills all edges with no external white bands, margins or borders.`:'The image itself must contain no text, captions, lettering, logos or watermark.';
    return `${bgStyle==='webtoon'?'Cinematic Webtoon illustrated keyframe':'Photorealistic cinematic live-action keyframe'}, ${panel.shot}, ${panel.angle}. ${panel.location}, ${panel.time}. ${panel.action} ${panel.emotion ? `Emotional tone: ${panel.emotion}.` : ''} ${cast ? `Characters: ${cast}.` : ''} World/prop state: ${panel.worldState}. ${vehicles ? `Vehicle continuity: ${vehicles}.` : ''} Beat state: ${panel.carry}. Begin from: ${panel.transitionIn} End on: ${panel.transitionOut} Keep vehicle model, body shape, color, heading, lane, position and spacing unchanged except for explicitly shown movement; preserve recurring props, set, weather and lighting between connected shots. ${panel.safetyRestage?'Retry as a non-graphic, policy-respecting depiction of the same story beat.':''} ${style} ${lettering}`.replace(/\s+/g,' ').trim();
  }
  return {heightCm,heightRules,letteringLimits,prompt,requestedPanelCount,minimumPanelCount,panelCountCorrectionPrompt,validate,imagePrompt,scenePrompt,overlap};
})();
if(typeof module!=='undefined')module.exports=StoryEngine;

