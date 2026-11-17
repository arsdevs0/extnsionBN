# Story lettering inside the artwork — 4.6.33

The supplied references show full-bleed artwork with black narration cards and white speech balloons inside the scene. The 4.6.32 external-gutter approach did not match that requirement and added unwanted white bands.

## Behavior

- Story now asks the image model to compose artwork and exact panel lettering together in every art style when lettering is enabled. Narration is a compact black rectangular card with white bold italic serif text. Dialogue uses white rounded/oval balloons, dark comic lettering and speaker-directed tails. Off-screen speech has no tail.
- Prompts specify text size, short line counts, modest padding, a 4% edge inset, reading order and placement over painted background away from faces, hands and action. Full artwork continues to every edge. No external caption strips, margins, blank footer or letterboxing are requested.
- Existing short-text limits, optional narration, silent panels, close framing, heights and figure selection remain. Silent panels explicitly request no lettering.
- The image finalization function only reads dimensions and returns the original blob. It cannot add duplicate captions, external gutters, a crop or a white canvas. The generation pipeline saves that original blob.
- PDF panel pages now place the image at `(0,0)` at the page's full dimensions; the former 16-point top/bottom padding is removed. Chapter title pages remain separate.
- The Story UI describes in-image lettering. Manifest, worker and popup report 4.6.33.

## Verification

- 102 focused checks passed: `tmp/4.6.33-check.log`.
- 10 applicable existing pipeline checks passed (nine in `tmp/4.6.33-pipeline-check.log`, plus the corrected dimension-only photorealism check in `tmp/4.6.33-photo-check.log`). Two unrelated older tests asserting superseded five-worker/unusual-activity retry behavior were excluded.
- One real Chromium export check passed using the user's second reference image: `tmp/4.6.33-export-check.log`. It verifies byte-identical image output, unchanged dimensions, proportional thumbnails, and a PDF panel page with no added padding or vertical offset. This is an export check of the supplied reference, not a newly generated sample. The fixture PDF and image preview are in `tmp/story-in-image-4.6.33/`.
- JavaScript syntax checks passed.

No new paid Flow generation was run. Native text spelling and placement remain subject to the image model; local checks establish the request contract and that the extension adds no borders or text layers. They do not prove a newly generated image visually matches the references.

Reload the extension and reopen its panel. Use Start over for fresh images; completed saved panels retain their existing pixels. Backup: `tmp/before-in-image-story-4.6.33/`.
