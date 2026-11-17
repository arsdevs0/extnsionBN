# Story upload menu — 4.6.30

Reload the unpacked extension at `D:\pfGG` from Chrome's extensions page and reopen its panel. Confirm **v4.6.30**, then Resume the saved Story.

The supplied 4.6.29 log confirms that the figure reference uploaded successfully. The next reference, also named `download.jpg` but containing different image bytes, received explicit `maseQ INVALID_ARGUMENT` rejections for both normalized and original bytes. Native recovery waited 20 seconds but could not find Upload. No Story generation was sent.

Live inspection of Flow on November 15 found the missing step: its project toolbar exposes **Add media menu**, which reveals a menu item named **Upload**. The previous exact label matcher accepted “Add media” but excluded “Add media menu”, so it never opened that menu. The new matcher recognizes the observed label, opens it once, then hands the image to the existing Flow file-picker pipeline. It also respects an already-expanded menu and waits for delayed or disabled controls.

Upload diagnostics now record a small page-state summary: path, whether the project-not-found screen is present, and whether the Add media/Upload controls were found. A visible Project not found screen is reported as `FLOW_PROJECT_UNAVAILABLE` before file handoff, and pauses the Story with its progress retained. No credentials or page content are included in this summary.

The logged project showed Project not found when inspected in the connected browser account. The user confirmed the run used a different account, so this observation is **not evidence that the original project was missing**. Account selection and project creation were not changed.

Validation: all **40 tests** across `flow-page-upload.test.cjs`, `flow-upload-recovery.test.cjs` and `story-jobs.test.cjs` pass. Coverage includes two raw rejections followed by the delayed current menu and successful native upload, exactly one file handoff, confirmed asset mapping, unavailable projects, cancellation, uncertain outcomes, and saved Story resume. Changed JavaScript syntax and manifest/panel/worker version consistency were checked.

The live toolbar and Upload menu were inspected. The user's image was not uploaded by this debug session, and no live generation was performed. The underlying raw RPC rejection remains unspecified; this patch repairs the confirmed native fallback selector error.

Backup: `tmp/before-upload-menu-4.6.30`. Test log: `tmp/4.6.30-upload-check.log`.
