# Flow backend transport 4.5.8

Stop any running batch, then reload **Guc guy** from Chrome's Extensions page. Keep the existing unpacked folder, `D:\pfGG`. The extension header must show **4.5.8**. Saved characters, prompts and Story collections remain in Chrome storage.

## What changed

Flow image generation now sends the prompt and confirmed reference media IDs directly through the signed-in background tab. It does not search the asset picker, attach composer chips, type into the Flow prompt box, click Generate or activate the Flow tab. Uploads also use backend requests. A signed-in Chrome session and background Flow tabs are still required. Gemini planning continues using the existing Gemini integration.

The supplied `download (1).zip` version 10.9.1 was reviewed without installing it. Its adapter uploads bytes, retains the returned media IDs and supplies those IDs in the generation payload. Our previous active path uploaded through the backend, then attempted to attach the same assets again using the frontend picker. That second step produced the reported “different reference” failures, including runs with only subjects and outfit. The new active path has no picker step.

The generation payload and HTTP envelope match the reviewed ordinary-image adapter: `ogiZ0b`, per-image reference IDs, model/aspect, client context, request IDs and batch ID. The old backend implementation already had substantially the same payload shape. This change does **not** establish that the older `PUBLIC_ERROR_UNUSUAL_ACTIVITY` rejection is resolved. No live Google generation was submitted for this version.

Parallel requests own separate IDs, payloads and response jobs. Results are matched to the originating panel even when they finish in a different order. Existing admission spacing and security cooldown remain. Stop prevents later submissions; already dispatched work may finish. An uncertain submitted result is not automatically regenerated. Original returned image URLs and resolution are preserved; an extra upscale pass is not configured.

## Diagnostics

Every generation records an image number, attempt, trace ID, project, model/aspect and reference filename/media/asset mapping. Events distinguish preparation, payload readiness, fetch dispatch, HTTP response, usable output confirmation and failure. “Request sent” means the page invoked fetch; only “generation confirmed” means a usable media ID and image URL were decoded. If the tab disappears during dispatch, `submitted: null` means the extension cannot determine whether submission occurred.

Upload events include the source filename, dispatch/response timestamps when observed, HTTP status, and confirmed stored filename/media ID. An upload is not called ready before the response mapping is validated. Upload failures retain a report.

**Copy diagnostics**, beside Clear in Live activity logs, copies the current Flow activity plus the last 20 retained reports (generation successes/failures and upload failures). Reports survive extension reload. It does not download or send anything. Credentials, full prompts, image bytes, full server responses and signed URLs are excluded. Clear continues clearing the visible activity log; retained diagnostic reports are separate.

The inactive `flow-native.js` and `content_flow_native.js` files are legacy source only. Neither is loaded by the current background worker or manifest. Classic photo direction, Webtoon rendering, Photorealism, character presets, chapter queues and PDF/Telegram delivery are unchanged.

## Verification

93 focused automated test entries pass across the active backend, uploads, codecs, security admission/helper lifecycle, Classic Direct/Gemini, Story planning/pipeline/jobs, and mobile relay. The new backend suite includes 45 payload combinations, three concurrent jobs with different references and out-of-order completion, zero-request pre-submit Stop, post-submit Stop, missing mappings, wrong project/session, HTTP failures, broken responses, tab loss, unusual-activity cooldown, report redaction and bounded storage. Network responses are fixtures, so these checks do not prove Google's live server will accept a request.

The popup browser check passes at 340px and 420px, including Copy diagnostics and existing Stop/Resume/Start over controls. JavaScript syntax checks pass for all changed active scripts.

Commands:

```powershell
node --test classic-direction.test.cjs flow-backend.test.cjs flow-request-guard.test.cjs gemini-planning.test.cjs story-engine.test.cjs story-pipeline.test.cjs story-jobs.test.cjs flow-generation.test.cjs flow-upload.test.cjs flow-security.test.cjs flow-security-recovery.test.cjs flow-helper-lifecycle.test.cjs flow-helper-loader.test.cjs flow-rpc.test.cjs mobile-remote.test.cjs
node tmp/story-controls-qa.cjs
```
