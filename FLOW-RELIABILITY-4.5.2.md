# Flow unusual-activity investigation — 4 November 2026

The reported `ogiZ0b / PUBLIC_ERROR_UNUSUAL_ACTIVITY / PERMISSION_DENIED` is a Google security rejection. `NARWHAL` is correctly mapped to `BELUGA`; that log line is not a model error. A code change cannot guarantee that Google will accept an account/session it continues to restrict.

Compared this extension with the user's thumbnail maker at `D:/Downloads/Cun/flow-asset-batch/`. Its token initialization uses one shared same-origin `/about` helper queue and its generation RPC uses the account root as `source-path`. This extension mixed project-tab initialization with helper fallback, queued by caller tab even though the helper was shared, and allowed image workers to close that helper outside its queue. Those differences are now corrected. The loader follows Google's official loader key when available and uses a restricted ScriptURL policy for Google's reCAPTCHA child scripts. No security tokens are logged or persisted.

Parallel generation still allows three image workers. Security initialization for generation/upscale requests is spaced by two seconds to avoid immediate bursts; completed-image downloads remain independent. Explicit unusual-activity responses establish a shared two-minute minimum cooldown before any new submit. The timestamp is persisted, so Reload/Resume does not immediately repeat the rejected requests. No automatic retry loop is used for permission rejections. After the cooldown, Resume remains available. Stops and project navigation are checked before image submission. Uploaded references, accepted media and completed panels retain their existing recovery behavior.

Google's official help recommends waiting a couple of minutes and disabling VPN/proxy use for this error. Its image documentation also confirms additional short-term restrictions for suspicious activity or very rapid generation:

- https://support.google.com/flow/answer/16353333
- https://support.google.com/flow/answer/16729550
- https://docs.cloud.google.com/recaptcha/docs/create-assessment-website (single-use tokens, two-minute expiry)

A related third-party investigation reports both direct-RPC failures and inconsistent browser-UI results; it does not establish a universal fix: https://github.com/crisng95/flowkit/issues/58 . No hidden-widget or fingerprint workaround from that discussion was added.

Local verification covers shared initialization across different caller tabs, bounded initialization recovery, generation/account routing, project-navigation rejection, immediate blocking of waiting workers, persisted cooldowns, Stop during admission, reference pairing and three-worker Story generation. All 50 focused test entries pass. These tests use simulated transport, not the live Google service.

Live inspection was attempted through Computer Use. An initial approval-service 503 prevented inspection; a later attempt established that the internal Extensions tab could not be claimed. Native Chrome inspection then stopped because Computer Use could not confidently determine its current URL. No live reload or image submission was performed.
