# Activity colours and refusal wait — 4.5.10

Reload the existing unpacked extension at `D:\pfGG` after stopping any active run. The header shows **4.5.10**.

Confirmed uploads, ready references, confirmed generations and successful Telegram sends now carry an explicit success level from the background worker to both live and restored activity logs. The popup renders these in green. Older Flow diagnostic entries are classified by their event name, so filenames containing words such as `failed` cannot change a confirmed upload's colour. Preparations and HTTP responses remain neutral until the result is confirmed; failures are red.

The extension's two-minute unusual-activity cooldown and its persisted deadline are no longer used. A refusal pauses the current run, and Retry, Resume or a new run can proceed immediately. Existing request spacing and the Stop button still work. Google may still reject the next request; this change removes the local wait and does not establish live generation success.

Verification: 71 targeted checks pass for admission, backend requests, uploads, generation, Classic retry/new-run behavior and Story jobs/pipeline. Popup rendering checked at 340px and 420px for saved logs, live messages and older entries. The successful message colour is `rgb(124, 234, 177)`; failures are `rgb(255, 135, 146)`.

```powershell
node --test --test-reporter=dot flow-request-guard.test.cjs flow-backend.test.cjs flow-upload.test.cjs flow-generation.test.cjs classic-direction.test.cjs story-pipeline.test.cjs story-jobs.test.cjs
node tmp/status-colors-qa.cjs
```
