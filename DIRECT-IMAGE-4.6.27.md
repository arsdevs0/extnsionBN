# Direct Image routing repair — 4.6.27

Reload Guc guy in chrome://extensions, then reopen its side panel. The header should show v4.6.27. Reloading the existing unpacked extension keeps its saved drafts and references.

Direct Image now submits a dedicated `bb_direct_image_generate` message. Both the background dispatcher and generation runner resolve that message to Direct Image, even if a caller supplies a conflicting workflow value. Legacy `bb_generate` messages with `workflowMode: direct-image` remain supported. Unknown workflow values produce an explicit reload error instead of falling through to Classic's subject/outfit validation.

Before submitting, the panel checks the loaded worker's workflow capabilities using `GET_STATE`. An older worker receives no generation request; the panel shows a reload instruction and retains the draft. Generate is disabled during this check to prevent duplicate submissions.

The reported subject-reference error could not be reproduced in the original on-disk Direct Image runner, which already bypassed Classic reference requirements. A stale loaded worker is a possible cause, but the live extension could not be inspected because browser policy blocked the extensions page. No live image generation was performed.

Validation:

- 18 Direct Image tests pass, including the actual background message listener, Text to Image, Image to Image, all styles, legacy messages, invalid inputs, Stop and retry.
- 2 browser fixture suites pass, covering Direct Image controls, stale-worker handling, saved drafts, and existing pose controls.
- Existing pipeline comparison: 50 passed / 15 failed before; 54 passed / the same 15 failed after. The additional four passing tests cover routing. No new failing test names.
- JavaScript syntax checks pass. Existing figure, Subject Flow direction and pose modules match their pre-change backups exactly. The requested figure-specific change was not completed because the edit was blocked by a content restriction; incomplete changes were restored.

Backup: `tmp/before-figure-direct-4.6.27`. Test evidence: `tmp/direct-routing-ui.log` and `tmp/direct-routing-regression.log`.
