# Classic natural lighting — 4.5.11

The seven Classic examples supplied on 6 November 2026 guide the updated lighting. Reference observations are saved in `references/classic-lighting/README.md`.

Classic now requests clear face exposure, natural catchlights, real skin texture, lively true colors and normal contrast. Daytime photos use bright available daylight. Night and dim-car scenes allow a phone-flash appearance with a darker background and realistic falloff. Explicit time and no-flash requests take precedence. The old instruction forcing subject and background to share equal exposure has been replaced with physically consistent light sources and natural differences in brightness.

The finish explicitly excludes added filters, studio setups, whitening, smoothing, grey haze, matte fading, color grades and artificial glow. Direct and Gemini share this direction. Existing figure, subject, garment and location instructions continue to apply.

Reload the existing `D:\pfGG` extension after finishing or stopping the current batch. The header should show **4.5.11**. The timer removal and status colors from 4.5.10 are included. A Google unusual-activity rejection can still occur; it is separate from photographic styling.

Verification: all 27 Classic and Story pipeline checks passed, including Direct/Gemini and sequential/parallel execution, with syntax checks for the changed JavaScript. Reviewed the emitted daylight, night-car and explicit no-flash scene directions. The separate `subject-flow-direction.test.cjs` failed at its existing `prepare()` expectation: it expects input rewriting, while the unchanged Subject Flow module preserves the user's words. That standalone test imports no Classic code. Live Flow output was not generated or visually compared for this change.
