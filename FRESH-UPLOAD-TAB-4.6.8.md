# Third upload attempt in a fresh tab — 4.6.8

The first two direct reference-upload attempts keep their existing behavior. If
both return a definite generic INVALID_ARGUMENT, the third attempt now opens a
new inactive tab for the **same account and existing project**, waits for loading
and session validation, and uses Flow's own uploader there.

Later native uploads in that run reuse this dedicated tab. The original Flow tab
and its in-flight generations stay intact; existing reference mappings, cached
uploads, storyboard and completed panels remain in the same project.

Stop or a failed load/session check closes only the newly created upload tab,
before any file handoff. A redirected tab cannot upload to a different account
or project. Once a file has been handed to Flow, outcome uncertainty retains the
existing no-resubmission behavior.

Verification uses separate real browser pages with fixture Google responses and
mock Chrome tab APIs. It covers the full two-rejection-to-native pipeline,
different tab IDs for raw/native uploads, one shared upload tab, preserved
original tab, wrong-account/session failures and Stop during loading. It is not
a live upload check on the user's Google account.

All 59 affected upload, tab-recovery and Story checks passed. JavaScript syntax
and manifest/panel version alignment also passed.

Reload the extension and verify v4.6.8, then Resume the saved Story.
`native_upload_preparing` includes the dedicated upload tab ID.

Backup: `tmp/before-fresh-upload-tab-4.6.8/`.
