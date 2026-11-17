# Classic profiles and figure fidelity — 4.6.1

Reload the unpacked extension at `D:\pfGG` after the current run finishes or is stopped. The popup must show **v4.6.1**.

The shared Classic builder now gives both Direct and Gemini:

- Styling informed by accessible previews from all 14 user-supplied references, including the corrected `heer____heer`, `helenanaeem` and `inawalsaeed` handles. Detailed coverage and limitations are in [the research record](references/classic-bloggers/README.md).
- Five broad pose families per five-shot batch, with 24 flexible cues and persistent recent-history rotation. Exact posing/staging remains Flow's choice unless the user specifies it.
- Nearby, subject-prominent default framing and natural skin/light direction. Explicit full-body, selfie, close-up or wide framing still takes priority.
- Stronger extension-body authority: exact Body Tuning, then Figure Details, then unspecified Classic defaults. A slim outfit-reference model cannot define the output body. Garment sizing and folds adapt to the specified figure while preserving design.
- A planner instruction to omit new physique labels/measurements from scene strings; every final image receives the same exact body contract after any Gemini scene suggestion.

The five overlapping workers and Gemini text-only behavior from 4.6.0 remain in place. Request admission still spaces starts by two seconds. Flow's page transport protocol remains 4.5.9 because this release changes no transport behavior.

Validation: **36 targeted checks passed**, including both engines in sequential and parallel modes, exact figure/tuning propagation, reference-role isolation, fresh pose history and Gemini image-response correction. JavaScript syntax and manifest version were checked. No live Flow/Gemini generation or resulting body/skin appearance was verified in this release.

Changed root files: `classic-direction.js`, `classic-direction.test.cjs`, `manifest.json`, `popup.html`. Backups are under `tmp/before-profile-direction-4.6.1/`.
