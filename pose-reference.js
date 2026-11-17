/* Shared optional pose/camera authority for every creation workflow. */
(function(root) {
  const modes = ['classic', 'subject-flow', 'story', 'qid'];
  function record(value) {
    if (!value || typeof value.dataUrl !== 'string' ||
        !/^data:image\/(?:png|jpeg|webp|gif|avif);base64,/i.test(value.dataUrl) || value.dataUrl.length > 11 * 1024 * 1024) return null;
    return {id:String(value.id || ''), name:String(value.name || 'Pose reference').slice(0,180), dataUrl:value.dataUrl};
  }
  function saved(value) {
    return Object.fromEntries(modes.map(mode => [mode, record(value?.[mode])]));
  }
  const cue = 'Match the selected POSE / CAMERA reference exactly. Keep its body position, hand placement, viewing angle and crop unchanged across the batch; vary only details the user leaves free.';
  function instruction({imageNumber, video=false, planner=false, story=false}={}) {
    return `EXACT POSE / CAMERA REFERENCE LOCK — USER-SELECTED COMPOSITION AUTHORITY:
${imageNumber ? `REFERENCE IMAGE ${imageNumber}` : 'The dedicated Pose / Camera reference'} supplies the exact pose and camera geometry, not loose inspiration. Match body orientation, torso lean, head tilt, gaze direction, arm/hand/finger placement, leg positions, weight distribution and contact points. Match camera height, azimuth, elevation, tilt, viewing side, distance/perspective, framing, crop, subject scale and placement. Do not mirror, recenter, rotate, zoom, widen the crop, reveal a hidden face or replace the gesture to make the image more attractive.
This explicit visual request overrides default pose diversity, random camera cues, near-frontal face preferences, candid/unposed rules, room-reprojection rules and planner suggestions. Keep the same pose and angle in every requested image; variation is allowed only in unlocked details. A specific written request to change a named detail changes only that detail; otherwise preserve the reference as-is.
Transfer pose and camera geometry only. Subject references still define identity, written figure details define body proportions, outfit references define clothes, and environment references define the location. Preserve joint articulation and camera perspective while rebuilding the outer body contour to fit the specified physique. Body width, volume, garment outline and limb gaps may change with that physique; never retain a slim pose model's outline by shrinking the requested body. Make only the small contact adjustments needed for plausible anatomy. If the same image is also assigned another reference role, the written figure still takes precedence over its body shape.
${planner ? 'PLANNER: Preserve the instruction to match the dedicated reference in every applicable brief. Do not invent, describe from guesswork, or randomize its unseen geometry; the image renderer receives the original image. Do not substitute training examples or a bundled pose collage.' : 'FINAL CHECK: Compare the requested pose, left/right placement, camera viewpoint and framing to this exact attached image before rendering.'}
${story ? 'STORY: Apply this lock to panels with named characters; cast-free establishing shots and inserts keep their story composition. Preserve the chapter events and lettering while making character-shot pose and camera choices consistent with this reference.' : ''}
${video ? 'VIDEO: Match the reference pose and composition in the opening frame. Keep the camera angle and framing locked throughout; allow only motion explicitly requested in the scene, starting from this pose, plus subtle breathing or fabric movement. Ignore conflicting preset turns, pose sequences and default face-visibility/framing choices.' : ''}`;
  }
  function build({target='',system='',figure='',referenceMap='',video=false,finish='Natural, unfiltered phone photograph.'}={}) {
    return `RECONSTRUCT REFERENCE IMAGE 1. Treat this as a subject/wardrobe replacement in that exact composition, not a new pose or a new shot.
Keep projected joint positions as posture guides: head, shoulders, elbows, wrists, fingers, hips, knees and feet. Preserve viewing side, left/right placement, head tilt, gaze and body lean. Keep camera viewpoint, perspective, tilt, crop and subject placement. Do not mirror, recenter, zoom, reveal a hidden face or substitute a new pose.
BODY SHAPE IS NOT POSE: Rebuild the outer contour and garment outline for the specified figure. Limb gaps, occlusion and contact surfaces may change with its volume; allow only small joint/contact adjustments required by anatomy. Never compress a thick body into a slim pose model's outline.

REFERENCE ROLES:
${referenceMap}

Use each reference only for its assigned role. Written figure controls body size; identity controls face; outfit controls garment design. Pose and finish references cannot override figure.
BODY: ${figure || 'Use the subject identity reference build and any explicit body details in the user instructions.'}

USER SCENE CONTENT:
${String(target).trim()}
${system?`USER BASE / STYLE DETAILS:\n${String(system).trim()}\n`:''}
Generic varied/candid/flattering/face-visible directions do not change this pose or camera. An explicit request to edit a named pose/camera detail changes only that detail.
FINISH: ${finish}
${video?'VIDEO: Match the reference pose and composition in the opening frame. Keep the camera angle and framing locked throughout. Begin any action explicitly requested in USER SCENE CONTENT from this exact pose; otherwise only subtle breathing and fabric movement. Do not add preset turns, hand adjustments or pose sequences.':'ONE image, one moment. No new pose, alternative angle, collage, captions or watermark.'}
FINAL GEOMETRY CHECK: Keep reference posture and camera with the specified body's own width and volume. The reference's outer body contour is not a size constraint.`;
  }
  const api = {modes, record, saved, cue, instruction, build};
  if (typeof module !== 'undefined') module.exports = api;
  else root.PoseReference = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
