# QID video fix — 4.6.22

The supplied 4.6.21 diagnostic stopped before submission with
`FLOW_VIDEO_NOT_SUBMITTED`: the model selector was not visible. Current Flow
places Mode, Select model family and aspect inside **Settings trigger**.

- Open that panel before selecting Video, model and aspect.
- Ignore Material icon ligatures when matching control labels, and click the
  radio button rather than its Material wrapper.
- Select Ingredients for uploaded references and limit output to one video.
- Search the asset picker rather than the project's separate Search field.
- Match decoded multiline prompt strings when observing the generation RPC.
- Keep the current model for Flow auto; preserve exact-reference checks.
- Bump the native helper to 1.0.5 and extension/UI to 4.6.22.

Validation: inspected the current signed-in Flow composer and model menu.
`node --test flow-video.test.cjs` exercises preparation with two references,
single submission/completion with a multiline quoted prompt, current-model
preservation, unavailable models and wrong-reference rejection in an isolated
Chrome fixture. The user's supplied project was not available in the connected
Chrome account, so no live generation was submitted.

All five QID regressions, both helper lifecycle/loader checks and JavaScript
syntax checks pass. The existing popup-controls test still expects five parallel
image workers; the current popup displays two. That unrelated assertion fails
and its worker configuration was not changed by this fix.

Reload the unpacked extension from D:\pfGG to activate 4.6.22. Prior files are in
`tmp/before-qid-4.6.22/`.
