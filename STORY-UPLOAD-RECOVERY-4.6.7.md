# Story reference upload recovery — 4.6.7

The live failure remains `maseQ / INVALID_ARGUMENT` after both the converted JPEG
and original bytes were sent. Manual upload works according to the user. The
previous original-byte fallback did not solve that failure.

## Evidence and limits

The downloaded current public Flow project module (`wO1vlb`, build
`MuEQyfiDmn0.2018.O`) exposes its file picker, validation/consent path and image
upload handler. Its raw upload structure largely agrees with the older adapter.
It can also add optional metadata based on account flags. That optional field is
not proven to be the cause, so this patch does not blindly inject it.

The failing Chrome window could not be inspected: computer-use returned
`Computer Use was not approved to use Google Chrome`. No successful live upload
in that account has been observed during this change.

## Change

After two definite generic INVALID_ARGUMENT rejections, use Flow's own Upload
control once, with the original validated JPEG/PNG/WebP file. Flow handles its
validation, session, security and RPC construction. The extension only supplies
the selected file and observes the corresponding response; it does not approve
consent dialogs or click Generate.

Match the response to the same project and a unique filename. Store a reference
mapping only after the server returns matching media/asset IDs. On success, use
this upload path for subsequent references in the same run/project. Continue
sharing the existing per-project cache across repeated/concurrent roles.

Serialize the file picker, restore temporary hooks, preserve uncertain outcomes
after handing a file to Flow and never repeatedly submit native uploads. Missing
controls pause Story with `FLOW_UPLOAD_UI_UNAVAILABLE`; saved storyboard/panels
remain available for Resume. Auth/policy refusals and unknown direct-upload
outcomes do not trigger this fallback.

Story narration, panels, Classic visual rules and generation payloads are unchanged.

## Validation

133 regression checks passed before the final per-run native-route preference;
all 46 affected upload/Story checks passed again after that change. Browser fixtures
exercise Flow's observed file-input behavior and both fetch/XHR responses, original
bytes, response matching, concurrent references, duplicate-role caching, Stop,
rejections, missing controls and the full two-rejection-to-native recovery path.
Google responses/security values in these tests are fixtures, not live validation.

Backups: `tmp/before-native-upload-4.6.7/`.

## Apply and verify

Stop the old run, reload the unpacked extension at `chrome://extensions`, reopen
the panel and verify v4.6.7. Resume the saved Story (do not Start over).

If the direct upload is rejected again, the log should reach
`native_upload_preparing`, then `native_upload_confirmed` with a media ID. A
`native_upload_failed` entry is a failure and must not be called a successful fix.
If Flow itself shows an upload confirmation dialog, the user must handle it.
