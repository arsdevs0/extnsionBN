# Parallel generation, Classic creative direction and Gemini planning — 4.6.0

Reload the unpacked extension at `D:\pfGG` after finishing or stopping the current run. The header must show **4.6.0**. Choose **Parallel · up to 5 at once**.

## Result

- The live code previously capped the batch at three workers. It now starts five workers. Generation overlaps while Flow request starts remain spaced by two seconds; it does not wait for image 1 to finish before submitting image 2.
- Each image retains its own result and retry state. Temporary failures and explicit unusual-activity refusals retry with bounded backoff until success or Stop. Unknown submitted outcomes, policy refusals, authentication and exhausted daily quota do not automatically resubmit. Confirmed images survive download retries.
- New runs create a fresh Flow tab and project using the same signed-in account. Security tokens are requested in the submitting project. The page-transport protocol remains compatible with 4.5.9 so an already-loaded helper is not replaced during active work; the extension release is 4.6.0.
- Classic now sends Indian/Pakistani fashion-blogger creative direction: attractive real surroundings, outfit/background contrast, architectural or green depth, and bold natural body language. Its 24 pose moods, 20 background moods and five framing moods are **loose inspiration**, not exact photo replicas or forced pose/venue recipes. Recent choices persist across runs; manual regenerate also receives a fresh cue.
- Explicit user poses, framing, locations and location references remain authoritative. Identity, garment, figure measurements and natural unfiltered daylight/night-flash rules are preserved. The desi aesthetic does not alter identity, ethnicity or skin tone.
- Every Gemini request is wrapped as a text-only JSON planning task. Active image-tool toggles are cleared when identifiable; an uncleared image mode blocks submission. Generated-image responses are detected and corrected once to text, then passed to the existing bounded planner recovery if still wrong. References are for analysis, not image generation.
- Stop feedback and recovery from a failed Stop message work in the popup. Green success logs remain intact.

## Reference research

Initial public image-search results and descriptions informed the visual direction, without copying an individual image or identifying a required venue. Examples: [Pakistani cafe styling — Style 101](https://tribune.com.pk/story/2291667/style-101-em-by-mahwish-haider), [Komal Pandey cafe outfit reference](https://www.pinterest.com/pin/463167142928658442/), [Areej Fatima Saeed outdoor outfit reference](https://www.pinterest.com/pin/areej-fatima-saeed-on-instagram-my-favourite-suffusebysanayasir-areejfatimasaeed--870039221734054518/). The Tribune article browser page timed out.

Follow-up visual research on 8 November 2026 used the [AnonyIG public profile viewer](https://anonyig.com/en1/instagram-profile-viewer/). Available post previews were loaded and inspected for [Areej Fatima](https://www.instagram.com/areej.fatima/), [Anushae Says](https://www.instagram.com/anushaesays/) and [Kritika Khurana / ThatBohoGirl](https://www.instagram.com/thatbohogirl/). This was a review of the available preview grids, not their full archives. Areej's visible set showed event interactions and angled body language; Anushae's included textured home interiors, a side-oriented outfit portrait and different camera relationships; Kritika's visible award set showed expressive gestures, close/wider crops and strong outfit/background contrast. Event branding and ceremonial lighting were not copied into the natural-photo direction. The Komal Pandey profile fetch failed. No downloaded blogger images are sent to Flow.

## Verification

95 targeted checks passed. This includes five overlapping requests through the actual Chrome MV3 scripting API with intercepted Google responses, out-of-order result matching, continuous retry and Stop, Classic history and creative freedom, reference preservation, Gemini text-only recovery, and popup checks at 340/420 px.

```powershell
node --test --test-reporter=spec classic-direction.test.cjs gemini-planning.test.cjs gemini-text-only.test.cjs flow-request-guard.test.cjs flow-retry.test.cjs story-pipeline.test.cjs story-jobs.test.cjs flow-upload.test.cjs flow-backend.test.cjs flow-generation.test.cjs flow-security.test.cjs flow-security-recovery.test.cjs flow-extension-smoke.test.cjs popup-controls.test.cjs
```

Live Google acceptance, Gemini UI behavior on the signed-in account, and final generated image appearance have not been verified. Prompt diversity guides an image model; it does not guarantee that the model never repeats a composition.
