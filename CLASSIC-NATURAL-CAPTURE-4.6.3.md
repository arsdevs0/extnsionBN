# Classic natural phone capture — 4.6.3

Reload the unpacked extension at `D:\pfGG` after the active run finishes or is stopped. The popup should display **v4.6.3**.

Classic now carries neutral camera color guidance through every shot-lighting branch, including night and referenced interiors. Warm lamps can remain locally warm and brown materials keep their actual color, without a global brown/amber cast or a compensating cold/grey look. Night retains its darkness and real fixtures; invented household lighting defaults to neutral white. Explicit no-flash requests use available fixtures only. Interior, night-time and Hindi night wording are recognized by shot routing.

Direct and Gemini share a final iPhone capture rule, as requested: main rear 1x camera in standard Photo mode, Portrait mode off, broad natural depth of field, readable nearby room details, actual scene light sources and normal unretouched iPhone detail. It excludes artificial portrait blur, studio beauty lighting, cinematic grading, glow, skin smoothing, exaggerated HDR processing and sharpening halos. It also avoids adding heavy grain, dirt or exaggerated pores to simulate realism.

The Gemini planner is directed to describe the action, expression, framing and setting without inventing lens effects, studio lighting or post-production treatments. Its suggestions precede the final shared capture rules. Explicit user requests and the existing identity, figure, outfit, location, pose and framing authorities remain in place.

Validation: **52 checks passed** across Classic, Story pipeline, Gemini planning and Gemini text-only handling. This includes Direct/Gemini final requests, indoor/night/outdoor routing, referenced rooms, Hindi no-flash requests, five concurrent workers, figure authority and pose history. JavaScript syntax and manifest/popup version consistency were checked. These are request-level and mocked-generation checks; no live generated image was visually verified.

Changed root files: `classic-direction.js`, `classic-direction.test.cjs`, `manifest.json`, `popup.html`. Backup: `tmp/before-natural-photo-4.6.3/`. No image-download processing or transport code changed.
