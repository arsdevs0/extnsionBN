# Optional pose / camera reference — 4.6.23

Classic, Subject Flow, Story Studio and Qid now each have a separate optional
Pose / Camera Reference upload with drag/drop, preview, filename and removal.
Selections persist across reloads and are included in full preset save,
load, import and export. The phone remote supports the same per-mode image
for its Classic, Subject Flow and Story workflows.

Selecting an image explicitly locks body/hand/head placement, gaze, camera
viewpoint, distance, framing and subject placement. Default pose diversity,
random camera cues and portrait/candid preferences cannot override it.
Identity, physique, wardrobe and environment retain their separate authorities.
Removing the image restores normal generation behavior.

Gemini receives the original pose image instead of the bundled candid collage.
Direct and Gemini paths attach it to Flow with a numbered pose/camera role and
a final precedence instruction. Image generation reserves a reference slot and
preserves that assignment on retries and after reference deduplication. A failed
pose upload stops generation rather than proceeding without the selected image.

Story applies the pose to shots with named characters; cast-free shots retain
their story composition. Qid matches the opening pose and locks the camera,
allowing only explicitly requested motion. Qid retains Flow's existing limit of
three image references and asks for an extra image to be removed before upload.

Validation: 10 pose pipeline/storage regressions, a browser test covering all
four UI sections (including reload, preset import/load, submission, removal and
340px layout), 14 Gemini planning/text-only checks, 18 Story job checks and five
Qid composer checks passed. JavaScript syntax was checked. UI screenshots are
in `tmp/pose-*-420.png`. No paid live image/video generation was submitted;
actual model fidelity has not been visually tested.

Reload the unpacked extension at `D:\pfGG` to activate version 4.6.23.
Main pre-change files are preserved in `tmp/before-pose-4.6.23/`.
