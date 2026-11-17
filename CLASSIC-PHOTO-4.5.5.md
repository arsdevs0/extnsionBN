# Classic photo direction — 4.5.5

Reload the existing unpacked extension from `D:\pfGG` in Chrome's Extensions page. The header should show **v4.5.5**. Existing saved inputs remain in Chrome storage; no ZIP or reinstall is needed.

## Direct and Gemini

Both engines now use the same Classic photo builder and preassigned shot settings. Direct keeps the user's scene as its input. Gemini expands that scene into compact variations; the final prompt applies the same body, reference, location and lighting rules after Gemini's suggestion. Conflicting suggestions have no authority over those rules.

Classic defaults to a naturally **thick, full hourglass** figure, including full thighs and substantial body volume. It explicitly prohibits slimming the person through physique changes, posing or lens distortion. Body Tuning has first priority for entered traits, followed by Figure Details, then the scene's body wording. Explicit measurements control their own dimensions; the thick base fills unspecified traits without inventing fixed measurements. Referenced garments retain their construction and intended fit, including loose clothing.

Unspecified locations vary among simple walls, a lift, a garden corner, a corridor, a landing, an entrance and a walkway. A named setting or attached location takes priority. Ambiguous indoor/outdoor settings use their actual available light sources. No Indian/Pakistani setting, luxury venue or regional decor is forced.

Photo direction favors natural personal phone portraits: ordinary perspective, skin texture, believable material details, relaxed posture and consistent subject/background exposure. Golden-hour, sunset-glow, orange-wash, studio-polish and fake-bokeh defaults are excluded. Face and hair remain anchored to the subject reference.

These changes are scoped to Classic. Story/Webtoon/Photorealism and Subject Flow retain their own builders. Flow submission and reference-upload handling remain as documented in the 4.5.4 reliability notes.

## Verification

The focused regression suite passed **83 tests**, including Direct and Gemini in sequential and parallel modes, all six Body Tuning fields, exact reference pairing, location references, malformed Gemini-plan recovery, native Flow concurrency and Story/Photorealism regressions:

```powershell
node --test classic-direction.test.cjs flow-native.test.cjs flow-request-guard.test.cjs gemini-planning.test.cjs story-engine.test.cjs story-pipeline.test.cjs story-jobs.test.cjs flow-generation.test.cjs flow-upload.test.cjs flow-security.test.cjs flow-security-recovery.test.cjs flow-helper-lifecycle.test.cjs flow-helper-loader.test.cjs flow-rpc.test.cjs mobile-remote.test.cjs
```

These checks use mocked services and browser fixtures. Live image generation and visual quality were not verified for this release. Prompt rules preserve the requested priorities; they cannot guarantee that the image model renders exact physical dimensions.
