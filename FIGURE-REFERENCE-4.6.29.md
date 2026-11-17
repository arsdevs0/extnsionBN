# Figure image and Story upload recovery — 4.6.29

Reload the unpacked extension from `D:\pfGG` at `chrome://extensions`, then reopen its side panel. The header should show **v4.6.29**. For an interrupted Story, use **Resume** to keep the saved plan and completed panels.

## Figure Reference

- One shared upload appears below Classic Location, below Subject Flow Knowledge, and with the reference controls in Story, Direct Image and Qid.
- The selected image is attached to generation requests and named `REFERENCE IMAGE n (@figure)` using its actual position after reference ordering and deduplication. It has highest body-shape priority over written figure details, Body Tuning, identity-photo bodies, outfit models and pose silhouettes. Face, clothing, pose and environment retain their own roles.
- Story includes a character selector. Only panels showing that character receive the figure attachment. Other characters and cast-free panels retain their existing specifications.
- Figure selection survives panel reload, mode changes, preset save/load/import/export and remote preset round-trips. Removing it restores written figure/tuning behavior without erasing the saved text.
- Resume applies the currently selected figure to unfinished Story work while retaining completed panels and the chapter plan. The selected character must belong to that saved Story cast. Remote resume calls without a new figure keep the saved selection.
- The nine-image Flow limit reserves space for figure and pose, trimming supplemental character views where needed. Qid's three-image limit includes figure and pose; excess selections produce an explicit error.

## Story failure from the supplied logs

The Classic run confirmed six generations. The Story run stopped before generation: `download.jpg` received `maseQ` code 3 `INVALID_ARGUMENT` for both normalized and original bytes. HTTP 200 was only transport success. Native recovery then failed with `FLOW_UPLOAD_UI_UNAVAILABLE` about 0.3 seconds after starting.

Native recovery now waits up to 20 seconds for the project Upload control to become visible and enabled, including delayed Add media menus. Document/session readiness alone does not mean Angular has mounted these controls. The file-picker hook is armed only after finding the control. Stop, project checks, explicit rejection and uncertain-outcome handling remain in place.

The logs do not identify why the raw RPC rejected that particular upload. This change repairs the premature failure of its native recovery path; it does not claim to fix the underlying raw RPC rejection.

## Validation

- 15 figure workflow tests cover Classic/Subject Flow with both prompt engines and pose combinations, retries, deduplication, upload failure, Direct Image, Story targeting, saved-plan resume and completed-panel preservation.
- A browser fixture covers the shared UI in all five modes, persistence, preset import/load, Story Resume, Qid with/without pose, numbering, reference limits and an outdated-worker guard. Narrow 340 px screenshots were inspected; the existing pose and Direct Image UI suites also passed.
- All 11 pose/remote regression tests pass, including forwarding and restoring the shared figure through remote presets.
- 18 upload/recovery tests passed, including both raw rejections followed by a delayed native control and confirmed asset. An additional Stop-during-control-loading test passed without sending a file.
- The broader 116-test run initially had 111 passes and 5 failures. One test fixture lacked the new shared module; it was corrected and its 11-test suite passed. Four older failures remain: two Story expectations for five workers/endless unusual-activity retry, and two preset source-pattern assertions that already fail against the 4.6.28 backup. Their outdated expectations were not used to change current protective behavior.
- Changed JavaScript syntax and manifest/UI/worker version consistency checked.

No live Flow upload or generated-image comparison was verified. The available Flow tab inspection timed out. Tests establish attachment/prompt behavior and local recovery behavior, not exact image-model compliance.

Main source backup: `tmp/before-figure-image-4.6.29`. Logs and UI screenshots: `tmp/4.6.29-*.log` and `tmp/figure-*-340.png`.
