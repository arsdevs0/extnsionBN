# Direct Image — 4.6.26

Reload the unpacked extension at D:\pfGG once any active run finishes. Open the new Direct Image tab; the header should show v4.6.26.

- Text to Image uses a prompt without requiring any references.
- Image to Image uses one uploaded source plus an edit prompt. Unrequested source details are preserved by prompt instruction; visual fidelity depends on the image model.
- Nine choices: Original / No Style, Natural Phone Photo, Instagram / Classic, Raw Candid / Subject Flow, Natural Photorealism, Brooding Crime Drama, Grounded Thriller, Warm Character Drama, and Webtoon Illustration.
- Presets carry the existing looks into a separate style-only catalog; they do not inherit portrait requirements, body defaults, random pose rules, story planning, or another section's references. Explicit user scene details take priority.
- Separate saved prompt, input mode, style and source. Prompt limit: 6,000 characters. Source limit: 8 MB (PNG, JPEG, WebP, GIF or AVIF). Switching to Text to Image retains the draft upload but never submits it.
- Existing image model, aspect ratio, batch, result previews, downloads, Stop and Retry are reused. Direct Image does not call Gemini planning.

Changed existing files: popup.html, popup.js, background.js and manifest.json. Original bytes and SHA-256 hashes are in tmp/before-direct-image-4.6.26. The existing popup.css, style builders, transport, authentication and other workflow modules were not edited.

Validation:
- 16 targeted tests pass: direct-image.test.cjs, direct-image-ui.test.cjs, pose-reference-ui.test.cjs.
- Browser checks use local fixtures, covering both modes, all style options, upload/remove, persistence, validation errors, failed start, Stop, previous tab state and 340/420-pixel layouts.
- Pipeline checks verify actual final prompts and references, no stale-input leakage, no Gemini/Classic planning, upload failure, retries, download recovery and Stop.
- Existing regression comparison: 44 pass / 16 fail on both the untouched backup and current code, with identical failing test names. Existing assertions concern earlier retry/concurrency/figure/direction behavior and were left unchanged. Evidence: tmp/direct-image-qa/regression-comparison.json.
- JavaScript syntax checks pass. No live Google generation was performed and no credits were spent by these checks.
