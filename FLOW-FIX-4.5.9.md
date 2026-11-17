# Chrome argument fix 4.5.9

The 4.5.8 run at 20:56–20:57 on 6 November 2026 successfully uploaded both subject references and the outfit. No location was supplied. Generation failed before sending any image-generation request because the extension passed `['version', undefined]` to `chrome.scripting.executeScript`. Chrome rejects an undefined argument with `Value is unserializable`.

The backend bridge now omits the optional argument when calling methods without one. Definite argument-serialization failures before submission are marked non-retryable, avoiding repeated attempts at the same programming error. The backend-only transport is retained.

The earlier Playwright adapter accepted undefined values, unlike Chrome's scripting API, so the previous test suite missed this defect. The adapter now enforces that boundary. The new regression test failed with the reported error before the fix and passed afterward.

`flow-extension-smoke.test.cjs` additionally loads a minimal MV3 extension containing the production backend modules into an isolated Chrome profile. It reproduces Chrome's actual rejection of the old argument list, then runs the fixed version/begin/status/forget calls for three backend generations through the real `chrome.scripting` API. Google page data, tokens and responses are local fixtures; the user's browser profile is not used and live Google acceptance is not established by this test.

Reload the existing `D:\pfGG` extension after stopping any active batch. Confirm **4.5.9** in the header. No ZIP, reinstall or storage reset is needed.

All 27 targeted test entries below pass, including the real Chrome API check. Changed active JavaScript files pass syntax checks.

```powershell
node --test flow-backend.test.cjs flow-extension-smoke.test.cjs flow-generation.test.cjs flow-upload.test.cjs
```
