# Reference search recovery — 6 November 2026

The reported `Flow UI: reference <filename> did not become ready` error occurs while locating an asset, before selecting it, attaching it or clicking Generate. The user confirmed that searching the shorter original name manually finds the reference. This is a different stage from the preview/Add-to-prompt issue corrected in 4.5.4.

The previous lookup searched the entire UUID-suffixed filename and required exact `.asset-title` text. It had no alternative query or picker recovery. The updated lookup tries the full upload name, the original short name and the unique upload token, then reopens the picker once if necessary. Searches remain bounded and Stop interrupts them. Both input and change events notify the search field.

Selection still requires the exact uploaded media ID or the complete unique filename. A short search is never permission to select the first similar result. Full title/accessible-label metadata, filenames displayed without their extension and media-ID thumbnails are supported. The attached ingredient IDs and their order are still verified before Generate. Existing direct-attachment and preview/Add-to-prompt paths remain supported.

Only the asset search/picker is retried. This recovery neither uploads a second copy nor repeats a Generate action, and it does not reload a project containing pending generations. A missing or ambiguous reference stops before submission with a clearer error. Unknown outcomes after clicking Generate retain their existing protection against automatic resubmission.

All 22 native browser-fixture tests passed, including short-name fallback with two same-base uploads, truncated titles, extension-free labels, media-ID lookup, stale-picker recovery, missing-reference limits and cancellation during fallback, plus existing parallel and unknown-outcome checks. The fixture uses the reported filename shape. These are simulated Flow responses, not a live Google generation; the exact live DOM/search-index cause could not be inspected because the failing Flow tab was not exposed to the browser tool.

Reload the existing `D:\pfGG` extension and check for **v4.5.6**. Retry the failed item, or use Resume in Story mode. No ZIP or reinstall is required. Classic direction, Story styles, character data and completed outputs are unchanged by this patch.
