# Story layout, character height and framing — 4.6.32

Story lettering could be rendered by the image model in non-Webtoon styles, while the Webtoon renderer placed text using guessed character bounds. Those bounds did not locate characters in the generated artwork. Long text also had no useful size limit. Figure selection cleared the target character's entered height, and Resume did not forward edited heights.

## Changes

- Every Story art style now requests clean artwork and uses the same bundled lettering renderer when the narration/bubbles toggle is enabled. Narration uses the same bold font as speech instead of italic Georgia. Compact caption and speech gutters remain outside the artwork, including tails. Rendering preserves the complete source image with no footer crop.
- New plans allow silent panels and optional narration. Limits: 100 characters of narration, two dialogue entries of 90 characters each, and 180 characters / 32 words total per panel. Over-budget plans enter the existing planner-correction flow before image generation; text is not silently truncated. Existing saved verbose plans retain every word in continued blocks of at most three narration lines or four speech lines.
- Default planning favors close and medium character coverage, reserving wide views for required geography. Image prompts give explicit close/chest/waist framing and natural conversational separation. Stale normalized bounds no longer shrink characters in image prompts. Close-up adjustments preserve group shots, vehicle scenes, purposeful wides and pose-reference framing.
- Figure images control body build, while each visible character's entered standing height is retained. Explicit cm, metre and feet/inch heights produce pairwise relative-height instructions, with posture and perspective accounted for. Qualitative heights remain verbatim; blank heights do not acquire invented measurements. Heights do not force distant full-body framing.
- Resume forwards current heights by saved character ID for unfinished work. It retains the saved cast, storyboard and completed panels. Existing completed panels are not rewritten.
- The shared figure uploader is now directly inside Story's Characters section, above the character cards, with an Apply to character selector and an explanation of the height rule. Upload, replacement, removal, persistence and the existing reference numbering still work across modes.

## Verification

104 passing checks in total:

- 101 targeted engine, generation pipeline, jobs, pose, figure-fidelity and planner checks: `tmp/4.6.32-regression-check.log`.
- Real Chromium canvas test and fresh Start over UI test passed in `tmp/4.6.32-ui-check.log`. The figure UI check in that run needed its collapsed character card opened; the corrected test passed in `tmp/4.6.32-figure-ui-check.log`.
- Browser rendering checks compare every source-art pixel with the final output, verify text bounds, preserve legacy text, and verify silent frames. English and Hindi previews were inspected at 340px; 420px previews were also produced. Preview files: `tmp/story-layout-4.6.32/`. Story uploader screenshot: `tmp/figure-story-340.png`.
- Syntax checked for all seven changed JavaScript production files; manifest, popup and worker report 4.6.32.

These are local regression and browser-fixture checks. No new paid Flow images were generated. Actual model adherence to height, identity and camera instructions still needs a live generation check; deterministic lettering placement is verified independently of model adherence.

Reload Guc guy from Chrome's extensions page and reopen its panel. In Story, add the figure image and select its character; expand each character card to enter height. Paste the new chapter and use Start over for a new storyboard and new images. Resume retains the saved storyboard and completed images, so new planning/text-density rules apply to fresh planning only.

Pre-change production backup: `tmp/before-story-layout-4.6.32/`.
