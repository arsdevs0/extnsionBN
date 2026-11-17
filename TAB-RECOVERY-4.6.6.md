# Flow tab recovery — 4.6.6

The reported `FLOW_REQUEST_NOT_SUBMITTED / No tab with id: 561828317`
kept retrying a captured, closed tab (attempt 116). The generic retry policy
treated that deterministic failure like a temporary server error.

## Change

- Save the original Flow account index with the run's project context.
- For a definitely unsubmitted request, reopen the same project in that account,
  wait for it to load and pass session checks, then use its new tab ID.
- Parallel workers share the replacement. Late failures from the old tab reuse it.
- Keep uploaded reference IDs, the upload cache and confirmed generated media.
- Recover reference uploads only before dispatch. A confirmed image can retry its
  download through the replacement tab without another image generation.
- Never replay an unconfirmed generation or upload after dispatch.
- Limit replacement attempts to two per run and one retry per operation; failed
  recovery pauses with `FLOW_TAB_RECOVERY_FAILED` instead of an endless retry.
- Respect Stop during recovery, clean up unsuccessful replacement tabs and keep
  unsent Story panels queued. Retain confirmed media for download on Resume.

The page transport protocol remains 4.5.9. Classic direction, appearance rules,
Story narration and image payloads are unchanged.

## Verification

Regression coverage includes the exact logged failure, five concurrent workers,
late stale-tab failures, failed loading/session checks, Stop, repeated tab closure,
upload dispatch uncertainty, download recovery and Story resume.

The Chrome smoke test uses actual extension scripting/tab APIs in a separate test
profile with intercepted Google responses and fixture security tokens. Replacement
tabs start at about:blank in the test adapter so interception is attached before
navigation. It verifies one replacement for five workers and five resulting
requests. This does not verify generation against the user's live Google account.

Validation command:

```powershell
node --test --test-reporter=spec flow-tab-recovery.test.cjs flow-extension-smoke.test.cjs flow-upload-recovery.test.cjs flow-upload.test.cjs flow-rpc.test.cjs flow-backend.test.cjs flow-generation.test.cjs flow-request-guard.test.cjs flow-retry.test.cjs flow-security.test.cjs flow-security-recovery.test.cjs story-jobs.test.cjs story-engine.test.cjs story-pipeline.test.cjs classic-direction.test.cjs
```

All 125 checks passed across the regression and Chrome smoke runs.
Syntax, imported-file availability and manifest/panel version alignment were also
checked. Backups are in `tmp/before-tab-recovery-4.6.6/`.

## Apply

Stop the old running batch, reload this unpacked extension from
`chrome://extensions`, and reopen its panel (v4.6.6). Resume the saved Story or
restart the Classic run. An already-running old worker cannot acquire this fix
without an extension reload.
