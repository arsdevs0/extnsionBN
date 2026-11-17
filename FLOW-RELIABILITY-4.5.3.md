# Native Flow submission — 4 November 2026

The user confirmed that the same signed-in Chrome account can generate manually on Flow. The previous custom generation RPC still returned PUBLIC_ERROR_UNUSUAL_ACTIVITY, so 4.5.3 replaces that generation path with Flow's own composer and Generate action. This is a transport fix; it does not change art prompts, character presets or the Webtoon/Photorealism boundary.

## Submission and references

- The extension opens its own project tab in the background. Chrome must remain running and signed in; the user does not need to open the project manually.
- Each uploaded reference gets a unique filename and a media-ID mapping. This prevents two Sunny files, such as face and outfit views, from being confused by the asset picker.
- New assets are loaded into the native project only after pending native generations and uploads finish. New uploads wait during that refresh. The picker then selects and verifies the exact media IDs in panel order.
- The composer selects Image, the requested model and aspect, x1 output, and disables Agent mode. Aspect and output count are applied after model selection because changing models can reset their defaults.
- One panel owns the composer at a time. The two-second admission interval is applied immediately before Generate. Once the native request is observed, the composer becomes available for another panel while the first response is pending. The existing three-worker limit remains.
- The observer copies only the matching native response. It does not mint generation tokens, change security data, rewrite the native request, or fall back to custom generation RPC. Fetch, Request-object bodies and XHR are supported.

## Stop, retry and output

An actual rejection keeps its error. Siblings cancelled before submission stay queued for Resume and show as paused, instead of displaying misleading failed-image messages. Old exact “Generation stopped before Flow submission.” failures without accepted media migrate back to queued. Existing unknown outcomes and real failures are preserved.

A click whose outcome cannot be confirmed is never automatically repeated. An unmatched click also prevents another panel from taking over that composer. Missing or changed response schemas remain unknown, rather than being treated as a definite rejection. Genuine unusual-activity responses still establish the existing shared, persisted cooldown.

Native-generated images are saved at their original resolution. The previous custom 2K upscale RPC is skipped on this path because it could reproduce the same security rejection after a successful native generation. The UI and logs explicitly disclose this limitation; they do not claim an upscale occurred. Saved legacy media retains its existing download recovery.

## Verification and limits

67 focused automated checks pass across the current test files, including 12 native browser-fixture checks. The native fixture uses an isolated headless browser with intercepted, simulated Flow responses; it makes no live Google request. It checks three overlapping jobs and out-of-order completion, reference order, model/aspect/output selection, Request and XHR observation, cancellation before clicking, missing mappings, unconfirmed clicks, refresh ownership, real security rejections, schema changes, setting mismatches and unrelated-request isolation.

The Story controls browser check also passes at 340px and 420px, including Stop, Resume, Start over and off-screen dialogue without a bubble tail. JavaScript syntax, manifest version and referenced content-script paths were checked.

The live signed-in Flow DOM was inspected to confirm the editor, settings and asset-picker controls. Temporary reference selection was cleared, and original settings were left as found. The installed extension has not been reloaded or used for a live native generation in this verification. Google acceptance and any future DOM/schema changes therefore remain unverified.

Reload the existing D:\pfGG extension in Chrome, check for v4.5.3, then use Resume. No ZIP or reinstall is required. Existing Story plans and completed images remain stored.
