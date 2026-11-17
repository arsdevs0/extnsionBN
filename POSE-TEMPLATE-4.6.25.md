# Pose reconstruction and compact UI — 4.6.25

Pose controls are now collapsed optional rows in all four workflows. Expanded
controls use a small thumbnail and a 62px upload row rather than a large image
block. The active selection remains visible as “Added” when collapsed. Hidden
controls now obey their hidden state, including the image-generation button in
Qid. Story character-field grid rules no longer affect the Qid settings grid.

The previous pose lock was appended to ordinary generation instructions.
Those instructions could still request a fresh pose, face-visible composition,
scene expansion or other camera changes. Story validation also automatically
inserted closeups and replaced some unusual angles.

With a pose reference selected:

- The original pose image is reference 1, with all reference numbers remapped
  after ordering and deduplication.
- Classic and Subject Flow skip Gemini scene expansion and use a separate,
  concise composition-reconstruction prompt. Identity, outfit, figure and
  setting are replacements within the reference pose and camera geometry.
- Story validation does not insert closeups or normalize unusual camera angles.
  Character-panel prompts omit planned shot-size and cast-position prescriptions
  in favor of the reference geometry. Cast-free panels retain story composition.
- Qid uses the same reconstruction direction for its opening frame, a fixed
  camera and only explicitly requested motion. Pose is its first attachment.
- Without a pose reference, normal generation behavior remains available.

Validation: pose pipeline tests cover first-reference ordering, role mapping,
deduplication, retries, failed uploads, photo-planner bypass, Story camera
validation and phone presets. Browser checks cover all four sections, upload,
reload, presets, submission/removal, 340px/420px layouts, collapsed height and
Qid's hidden image-generation button. Existing Story engine checks also pass.

This is still reference-guided model generation, not a deterministic skeleton
constraint. No live output was compared with the user's actual reference in
this change. Chrome native-panel inspection was denied by the computer-use
tool; the original pose and a failed output are needed to diagnose remaining
visual deviations directly.

Reload the unpacked extension from `D:\pfGG` to activate version 4.6.25.
