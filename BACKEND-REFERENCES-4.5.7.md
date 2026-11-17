# Backend reference uploads — 4.5.7

Reload the existing unpacked extension at `D:\pfGG`; the header should show **v4.5.7**. No ZIP or reinstall is required.

## Comparison with the supplied extension

Inspected `D:\Downloads\download (1).zip`, version 10.9.1, including `assets/adapter-CEOGdgvO.js`. Its `jr`/`ht` upload functions send image bytes through a backend RPC and its prepare step caches confirmed media IDs by source data. The ordinary image upload payload uses the same field layout as this extension: project/security context, image bytes, MIME type, filename and request/client IDs. The supplied adapter sends those media IDs directly to its generation RPC and does not depend on finding its upload filename in the UI.

Our file upload already uses the backend RPC, and continues to do so. This update addresses reference bookkeeping rather than adding file-picker automation. Flow's native composer still attaches the confirmed references and submits generation, preserving the existing request handling.

## Corrections

- Classic's selected Location is forwarded even when a caller also provides an empty generic `knowledge` array.
- Every supplied location and quality reference must return a confirmed media ID before generation starts, alongside the existing identity/outfit checks. The log identifies Classic uploads as Location and reports the backend-confirmed location count.
- Upload parsing retains the backend's actual asset filename. Native lookup uses this canonical name instead of assuming Flow accepted the newly requested UUID filename. The project, media ID and asset ID must still agree; empty media IDs are rejected.
- Identical source data shares one backend upload within a run/project, including simultaneous callers. Rejected uploads are evicted from the cache so a permitted retry actually sends a fresh upload.
- If one uploaded image serves multiple roles, the composer attaches it once. Numbered reference instructions retain each role and are renumbered consistently, including Story face/outfit assignments.

Existing Classic appearance rules, Story lettering/styles, character presets, native generation limits and unknown-result retry protections are retained.

## Verification

The tests exercise backend request construction and upload-response parsing; canonical server filenames; duplicate and concurrent upload reuse; rejected-upload cache eviction; Direct and Gemini location forwarding; failure before generation when a selected location has no upload ID; and shared-image reference numbering. A browser-fixture test follows three backend upload responses through subject/outfit/location attachment and one native Generate submission. Existing native parallel, cancellation and response-isolation tests also pass.

These tests simulate service responses. The user's failing live upload response was not available, so the exact cause of that particular run and live Google acceptance remain unverified. A backend upload acknowledgement and a native composer attachment are reported as separate stages.
