# Reference attachment correction — 4 November 2026

The live 4.5.3 run stopped at “Flow UI: attached reference did not become ready.” Inspection of the user's failing Flow project showed the matching asset in the picker preview, an enabled Add to prompt button, and zero attached ingredient chips. Selecting an asset was not enough in this picker path.

4.5.4 completes the native Add to prompt action after checking that the visible preview matches the uniquely named reference. It also supports pickers that attach immediately on selection. An ingredient placeholder counts as an existing chip while its thumbnail loads, so the extension does not click Add a second time. The exact attached media ID and order must match before the next reference or Generate action; a different identity fails before submission.

Live inspection confirmed that Add to prompt creates the ingredient chip, initially as a placeholder, then with its media-ID image URL. The temporary inspection reference on the idle project was cleared afterward. The updated extension's complete live generation path still requires Reload/Resume; no successful generated image is claimed here.

All 16 native browser-fixture tests pass. The fixture now defaults to the observed preview-then-add behaviour, which the old fixture did not cover. Tests include three parallel jobs with six explicit reference additions, direct attachment, delayed thumbnails without duplicate additions, wrong-reference rejection, cancellation while Add is disabled, and existing response/retry protections. JavaScript syntax and manifest references were verified.

Reload the existing D:\pfGG extension, check for v4.5.4, then Resume. Saved plans, completed panels, art modes and the original-resolution output behaviour are unchanged by this patch.
