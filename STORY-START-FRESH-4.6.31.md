# Start over takes the current chapter — 4.6.31

Reload the unpacked extension from `D:\pfGG`, reopen the panel, and confirm **v4.6.31**. Paste the new chapter in the Story input, update references/settings or queued chapters as desired, then click **Start over**.

Previously, Start over sent no current inputs. The worker cloned the old saved collection, including its chapter sources, settings and design bible. Changing the chapter in the panel therefore had no effect on Start over.

Start over now snapshots and validates the currently entered chapter, queued chapters, character references, figure/pose references, art style, image settings and delivery settings. Normal Story generation uses the same input builder. The confirmation previews the current chapter text. A fresh session receives new chapter IDs, no saved plan, no panels, no PDF and an empty design bible. Old queued chapters are not inherited. The existing generation path creates a new Flow project for this run.

The previous collection is backed up before replacement. Empty/invalid chapter input, incompatible older workers, busy runs and failed backup writes leave it intact. Duplicate Start over calls do not launch parallel collections. Resume continues to use saved chapter progress.

Validation: **38 checks passed** — 36 Story job/figure regression tests and 2 browser UI suites. These cover changed chapter/queue/settings, stale plan/design exclusion, failed backup, invalid input, duplicate requests, confirmation cancellation, current reference forwarding, old-worker detection and existing shared-figure behavior. Changed JavaScript syntax passed. No live image generation was run for this change.

Backup: `tmp/before-fresh-story-4.6.31`. Logs: `tmp/4.6.31-story-check.log`, `tmp/4.6.31-ui-check.log`.
