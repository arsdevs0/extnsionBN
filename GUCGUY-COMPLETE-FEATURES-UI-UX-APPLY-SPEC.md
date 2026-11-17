# Guc guy — Complete Features, UI/UX, Style & Behaviour Specification

**Inspected version:** 4.6.21. **Date:** 9 November 2026. **Source:** active extension files in `D:\pfGG`.

Is document ko kisi developer/AI ko dekar keh sakte ho: **“Apply this specification. Har mode ka apna UI, generation style, reference priority aur behaviour preserve karo.”** Exact English interface labels are retained so implementation can match the extension.

This is a source-verified specification, not a claim that a live Google generation or pixel comparison was performed. Prompt directions describe what the extension asks the model to produce; they do not guarantee that every generated image obeys them. Historical release notes are secondary to the current executable code. Existing inconsistencies are explicitly recorded in §15.

## Contents

1. Copy-ready implementation instruction
2. Product, architecture and mode boundaries
3. Exact screen structure and shared UI
4. Classic: complete workflow, photographic style and behaviour
5. Subject Flow: complete workflow, visual style and behaviour
6. Story Studio: characters, chapters, styles, continuity and delivery
7. Qid: video controls, prompt rules and submission
8. Shared Body Tuning and generation settings
9. References, processing and upload budgets
10. Queue, previews, retry, stop and logs
11. Google connection, planning and generation lifecycle
12. Telegram delivery
13. Phone remote
14. Persistence, messages and module responsibilities
15. Current inconsistencies and implementation caveats
16. Acceptance checklist
17. Automatically extracted exact inventories and source appendices

## 1. Copy-ready implementation instruction

> Apply the following specification to reproduce Guc guy 4.6.21. Build a Chrome Manifest V3 side-panel extension with four modes: Guc guy Classic, Subject Flow, Story Studio and Qid. Preserve the exact section order, labels, defaults, visibility rules, uploads, persistence, prompt composition and output handling described here. Keep each mode's visual direction separate: Classic uses vivid natural iPhone portraits; Subject Flow uses candid mobile photographs in one canonical referenced room; Story Studio produces chronological cinematic or Webtoon panels with a named cast and durable chapter jobs; Qid submits a realistic short video with its own model, motion and image-reference controls. Reproduce the supplied HTML/CSS and control inventory when exact visual matching is required. Use current runtime limits, not old release-note claims. Treat the inconsistencies in §15 as reviewable decisions rather than silently inventing behaviour. Do not replace implemented controls with decorative placeholders. Verify functional journeys and responsive layout before declaring the implementation complete.

## 2. Product, architecture and mode boundaries

### 2.1 Product identity

| Property | Current value |
|---|---|
| Manifest name / page title | `Guc guy` |
| Header | `Guc guy`, with `guy` in the yellow accent |
| Tagline | `Identity-first AI image studio` |
| Version | `v4.6.21` |
| Manifest description | `Generate identity-consistent AI images and videos with Google Flow.` |
| Extension platform | Manifest V3; minimum Chrome 116 |
| Entry surface | Chrome side panel at `popup.html` |
| Toolbar action title | `Open Flipo` — legacy text still present |
| Background worker | `background.js` |
| Main image service | Google Flow |
| Text planning | Gemini web session, where enabled; Story always uses Gemini |

The interface is a vertically scrolling, compact dark studio. It is not a separate page per mode. One mode selector shows/hides workflow panels while shared account, progress and logging elements remain in the same document.

### 2.2 Mode comparison

| Behaviour | Classic | Subject Flow | Story Studio | Qid |
|---|---|---|---|---|
| Purpose | Same-person natural portraits | User-defined reference-driven image workflow | Connected story panels/keyframes | One short video |
| Identity | Required subject photos | Required subject photos | Named characters, each with identity photos | Optional subject image |
| Outfit | One required image | Required group; one canonical outfit | Required per character | Optional image |
| Environment | One optional image | Knowledge group; same room across batch | Story scene/design ledger; scene anchors | Scene text / starting frame |
| Style references | No dedicated UI | Optional Quality group | Up to four for Webtoon | No style-image group |
| Prompt engines | Gemini Auto / Direct | Gemini Auto / Direct | Gemini only | Local prompt builder + Flow video composer |
| Count | 1–20, default 5 | UI 5–20, default 5 | Planner, up to 60 per chapter | One video |
| Default frame | 3:4 | Shared image frame | 16:9 if no frame was previously chosen | 9:16 |
| Default batch mode | Parallel | Shared Classic preference | Sequential | Single video |
| Body Tuning visible | Yes | Yes | No | No, but saved values are read by its prompt builder |
| Durable chapter/PDF jobs | No | No | Yes | No |

## 3. Exact screen structure and shared UI

### 3.1 Top-to-bottom layout

```text
Body: dark radial-gradient background
└─ main.app-shell — centered, maximum width 540px
   ├─ Header: circular logo + title/tagline + version pill
   ├─ Google account card: status dot + text + login/switch button
   ├─ Phone remote disclosure: instructions, QR button, QR result
   ├─ Four mode buttons
   ├─ Active workflow's reference/composer sections
   ├─ Body Tuning — Classic and Subject Flow
   ├─ Generation settings + Telegram — Classic, Subject Flow, Story
   ├─ Generate images — hidden in Qid
   └─ Progress section
      ├─ Status + completed/total count
      ├─ Thin progress bar
      ├─ Saved Story collection controls, when a session exists
      ├─ Result grid
      ├─ Stop generation
      └─ Live activity logs + Copy diagnostics + Clear

Separate fixed overlay: full image preview + close button.
Qid includes its own Build prompt / Generate video buttons in its panel.
```

### 3.2 Mode navigation

Exact visible labels and captions:

| ID | Label | Caption | Internal mode |
|---|---|---|---|
| `modeClassic` | `Guc guy Classic` | `Natural phone portraits` | `classic` |
| `modeSubjectFlow` | `✦ Subject Flow` | `Gem-style custom workflow` | `subject-flow` |
| `modeStory` | `▣ Story Studio` | `Gemini story + film keyframes` | `story` |
| `modeQid` | `▶ Qid` | `Video prompt studio` | `qid` |

Classic is the initial fallback. Persist selected mode. Clicking a mode updates active styling and panel visibility. When no generation is running it also resets the displayed grid to that mode's placeholders; it is not a separate saved output gallery per mode. Switching modes does not stop an active run. Classic and Subject Flow share one prompt-engine preference.

| Visible element | Classic | Subject Flow | Story | Qid |
|---|---|---|---|---|
| `classicReferences`, `classicPrompts` | Yes | No | No | No |
| `subjectFlowReferences`, `subjectFlowPrompts` | No | Yes | No | No |
| `storyStudio` | No | No | Yes | No |
| `qidStudio` | No | No | No | Yes |
| `bodyTuningSection` | Yes | Yes | No | No |
| `generationSettings` | Yes | Yes | Yes | No |
| `imageCountSetting` | Yes | Yes | No | No |
| Main `generate` button | Yes | Yes | Yes | No |
| Account / remote / queue / logs | Yes | Yes | Yes | Yes |

### 3.3 Design tokens and dimensions

| Token / component | Exact value or behaviour |
|---|---|
| Background | `#07080a` |
| Panel / secondary panel | `#111318` / `#171a20` |
| Border / brighter border | `#292e37` / `#3a414d` |
| Main text / muted text | `#f7f8fa` / `#929aa8` |
| Accent / accent ink | `#facc15` / `#111500` |
| Success / secondary accent | `#63e6a5` |
| Danger | `#ff6b78` |
| Base font | `13px/1.45 Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` |
| Minimum body width | `320px` |
| App width | `100%`, maximum `540px` |
| App padding | `16px 15px 30px` |
| Header | Flex, gap 11px, padding 10px 11px, radius 15px |
| Logo | 46 × 46px, circular, yellow glow |
| Brand title / tagline | 20px / 10px |
| Mode grid | Four equal columns, 7px gap, 5px padding, 13px radius |
| Mode button | 9px 10px padding, 9px radius, left-aligned; title 9px, caption 7px |
| Account card | Three columns: dot / flexible text / action; 12px padding, 14px radius |
| Wide reference upload | 62px high; horizontal icon + copy |
| Single outfit/location drop zone | 115px high, dashed border, 11px radius |
| Subject thumbnails | Square; auto-fill columns with minimum 52px; gap 6px |
| Subject Flow file rows | Columns 34px / flexible filename / 22px action; 8px gap |
| Shared input/select | 36px high, 8px radius, 9px text |
| Main Generate button | 50px high, 13px radius, full width, margin-top 14px |
| Generate gradient | `linear-gradient(100deg,#ecff87,var(--accent) 48%,#83f196)` |
| Progress track | 3px high; width transition 0.3s |
| Normal queue | `repeat(auto-fill,minmax(58px,1fr))`, gap 6px |
| Story queue | `repeat(auto-fill,minmax(128px,1fr))`, gap 8px |
| Log terminal | 112px high, 8px/1.55 monospace, scrollable |
| Preview | Fixed, inset 0, z-index 50, near-black 94% overlay |

The exact stylesheet, including all shadows, gradients, lettering and later overrides, is included in the appendix. CSS source order matters. The named Inter family has no bundled Inter font declaration; actual rendering can fall back to the system font. Story Comic Neue is bundled separately.

### 3.4 Interaction styling and responsive behaviour

- Active mode: yellow border and yellow/green translucent gradient; yellow title.
- Upload hover/drag: yellow border and dark olive background. A selected upload becomes solid-bordered and displays the image.
- Connected account: green border and glowing green dot. Error: red border/dot. Checking: 1.3-second pulse.
- Keyboard focus: 2px yellow outline, 2px offset on buttons, inputs, selects, textareas and summaries, with more specific Story overrides.
- Disabled Generate: opacity 0.38 and blocked pointer cursor. Account pending actions use wait cursor.
- `max-width:370px`: mode navigation, reference pairs, engine selector, Story upload grids, character fields, Story options and shared settings collapse to one column. Account actions move below the copy.
- Body Tuning has an inline two-column grid declaration; it overrides the normal narrow-screen settings-grid column rule.
- Qid grids retain their separate two-column rules at the narrow breakpoint.
- Header, settings and Generate are in normal document flow; there is no implemented sticky footer/navigation.

## 4. Classic — complete workflow, style and behaviour

### 4.1 Section order and controls

1. **References** — subtitle `Keep the same person across every image`.
2. **01 Subject / Identity** — count pill, multi-image upload, gallery.
3. Two-column reference row: **02 Outfit** and **03 Location**.
4. **Your scene** — single-line text input.
5. Collapsed **Physical details / Figure lock** disclosure.
6. **✦ Gemini Auto** / **Direct Prompt** engine buttons.
7. **Body Tuning (Highest Priority)**.
8. Shared Generation and Telegram settings.
9. Generate images, progress, outputs and logs.

| Control | Requirement / limit | Behaviour |
|---|---|---|
| Subject photos | At least one; UI stores up to 8 | Add through file picker or drop; square preview; × removes by ID |
| Outfit | Exactly one selected image required | Replace by selecting/dropping another file; Remove outfit clears storage |
| Location | Optional, one selected image | Replace/remove; defines actual place when supplied |
| Your scene | Required; UI maximum 300 characters | Autosaved while typing; Enter triggers Generate when enabled |
| Physical details | Optional; maximum 1,200 characters | Stable traits; separate from action/scene |
| Engine | Gemini default | Persisted jointly with Subject Flow |

Image files are read as data URLs; non-image MIME types are ignored by the common reader; files larger than 8 MiB trigger an alert. Stored order matters: the first subject is the primary face anchor.

### 4.2 Exact user journey

1. Connect a Google account that has Flow access.
2. Add subject identity images. Put the strongest identity anchor first; additional views clarify the same person.
3. Add the outfit image. Optionally add a location image.
4. Enter the scene/action. Explicit framing, pose, place, time and no-flash instructions influence routing.
5. Optionally enter figure details and individual Body Tuning values.
6. Choose Gemini Auto or Direct Prompt, image model, aspect ratio, count and batch mode.
7. Click Generate images. The UI validates missing subject, outfit and scene; then marks the run active.
8. Background creates a fresh Flow project, prepares scenes, uploads selected references and verifies their IDs.
9. Each image receives an exact numbered reference map and the final Classic body/camera/style contract.
10. Results appear in stable numbered slots. Preview, download, regenerate one image or stop the batch.

### 4.3 Identity, body and outfit authority

These are separate authorities, not one combined description:

| Domain | Governing input |
|---|---|
| Face, skin tone, hairline, age, distinctive marks | First subject identity photo; supporting subject views clarify it |
| Entered body trait | Body Tuning, highest for that trait |
| Other written body traits | Physical details / Figure lock |
| Lower-priority physique wording | Scene prompt, subordinate to body fields |
| Unspecified build | Classic's current specific curvy-hourglass default |
| Clothing design | Outfit reference only |
| Actual referenced place | Location reference |
| Requested action/framing/time | User scene, above conflicting planner suggestions |

**Current default:** approximately **56-inch bust/chest and 56-inch hips**, with fullness focused in those areas, naturally proportioned thighs, and a defined reference-consistent waist/abdomen. The prompt explicitly says these numbers do not imply generalized obesity or an enlarged whole torso. Explicit user measurements override defaults for their dimensions.

The outfit model has no authority over face, body size, waistline, pose or setting. Preserve cut, neckline, sleeves, hem, color, fabric, pattern and accessories. Adapt garment sizing and folds to the resolved body. Loose clothes stay loose; non-stretch fabric does not behave like rubber. Do not slim the body to fit the outfit model.

### 4.4 Classic photographic style

Classic aims for a clear, attractive personal iPhone photograph, usually taken by a friend, with a prominent nearby subject and readable real surroundings.

- Main rear 1× camera in standard Photo mode; an ordinary 2× crop is permitted in the general realism rule.
- Portrait mode off; broad natural depth of field. Modest distance-related softness is allowed, but no artificial uniformly blurred room.
- Natural perspective, normal phone detail, intact complexion and recognisable facial structure.
- Lively, naturally saturated clothes and background; clean whites, rich garment colors and firm natural contrast.
- Neutral camera white balance. A local warm lamp may remain warm; wood remains brown without a global brown/yellow filter.
- Visible skin detail at normal portrait scale: subtle pores, natural lip texture, small expression creases and localized highlights.
- Natural flyaway hair, fabric weave, normal folds, believable contact/shadows.
- Comfortable posture and easy expression. Stylised room design does not turn the image into a campaign shoot.

Exclude studio beauty setups, ring lights, softboxes, artificial rim light, face whitening, porcelain/plastic skin, global airbrushing, invented freckles, painted pores, cinematic LUTs, teal-orange tint, sepia, grey haze, bloom, vignette, excessive HDR, grain overlays and sharpening halos. These are prompt instructions; there is no corresponding Classic post-generation filter pipeline.

### 4.5 Lighting decision tree

| Condition | Actual prompt direction |
|---|---|
| Location image present | Preserve its real place, visible geometry and light-source direction; adapt to requested time |
| Named indoor place | Available real window light or ordinary neutral-white fixtures for an invented room |
| Named outdoor place | Appropriate natural daylight unless time says otherwise |
| Night/evening and not also daytime | Keep night, real fixtures and darker distance; nearby small phone flash may be used |
| Explicit no flash | Available fixtures only; no added flash or hidden fill |
| Unspecified time | Clear daytime light appropriate to the place |

Recognition includes English room/night terms, Romanized Hindi such as `ghar`, `andar`, `kamra`, `raat`, `shaam`, and selected Devanagari terms. No-flash patterns include `no flash`, `without a flash`, `flash off`, `flash nahi/nahin/mat` and `बिना फ्लैश`. This is pattern matching, not comprehensive multilingual intent parsing.

Correct exposure means a readable face with accurate complexion, not lighter skin or blown-out fabric. Night is not automatically changed to daylight. Lighting must be geometrically plausible; local warmth must not become global orange grading.

### 4.6 Locations and premium interiors

With a location reference, keep its materials, wall/door positions and visible layout; do not invent unseen architecture or remodel the room. A named user location overrides random location suggestions.

Without a binding location, choose a visually rich Indian/Pakistani fashion-blogger-style real setting: one strong background anchor plus a few depth details around a close subject. The current pool contains **20** location moods, all listed verbatim in the appendix.

For invented homes, use an affluent contemporary urban home in 2026: refined furniture proportions, quality upholstery, thoughtful joinery, current windows, finished floors and coherent color/material choices. Avoid the repeated floral/damask sofa, plain cream wall, dated brown window/curtain and shabby upholstery default. Do not substitute ornate arches, chandeliers and excessive marble for contemporary design. Keep it lived-in and appropriate to the room; a kitchen should not gain a living-room sofa.

Explicit plain walls, simple places, other architectural styles or supplied reference interiors remain binding even though the general aesthetic prefers rich backgrounds.

### 4.7 Pose, expression and crop variation

The code contains **24 concrete pose cues** divided into **5 families**:

| Family | Exact pose IDs |
|---|---|
| Moving | `stride`, `walk-away-turn`, `step-up`, `mid-pivot`, `look-down-step` |
| Seated | `seated-diagonal`, `seated-side`, `seat-forward`, `seated-lookback` |
| Supported | `rail-side`, `shoulder-lean`, `rail-back`, `doorway-frame` |
| Poised | `hands-behind`, `hand-on-hip`, `ankle-cross`, `side-profile`, `turn-and-pause` |
| Expressive | `hair-tuck`, `hair-lift`, `arms-folded`, `candid-laugh`, `open-palms`, `collarbone-hand` |

Shuffled decks prefer unseen/least-recently-used IDs. The first family cycle avoids five nominally different standing portraits. History persists as `bb_classic_shot_history`, retaining the last 40 pose, place, crop and gaze IDs. Explicit user pose remains authoritative.

Default five crop directions:

| Crop | Direction |
|---|---|
| A | Nearby three-quarter, eye level, mid-thigh up, off-center |
| B | Close waist-up, gentle three-quarter, just above eye level |
| C | Nearby knees-up, diagonal subject, leg stance readable |
| D | Close over-shoulder, one eye/profile readable, torso/shoulder angle |
| E | Nearby side angle, slightly below eye level, waist-up, no distortion |

Explicit selfie, close-up, full-body/head-to-toe or wide/distant wording selects a dedicated framing rule. The six gaze records are direct connection, soft smile, off-camera, laugh, calm and side glance. Their IDs are currently selected and remembered, but their text is not included by `describeShot`; do not claim a guaranteed separate gaze rotation in the final prompt.

### 4.8 Gemini Auto versus Direct

**Gemini Auto:** Gemini receives the target, Classic figure contract, shared photo rules and corresponding shot starting points. It must return exactly N non-empty strings in `{"prompts":[...]}`; requested scene strings are around 40–80 words. It must not invent body measurements or lens/post-production recipes. Only compatible expansion details survive the final Classic contract.

**Direct Prompt:** no Gemini planner request. The user's scene is duplicated for the requested count, then each image receives its own Classic shot/pose/framing and the same identity/body/style rules. “Uses your exact prompt” means no Gemini rewrite; it does not mean the user text is the entire Flow request.

Both paths call the same `ClassicDirection.build`. They preserve the same body, outfit, lighting and capture rules. Neither path is a fixed image-to-image copy of the subject/outfit picture.

## 5. Subject Flow — complete workflow, style and behaviour

### 5.1 Section structure

1. Hero: `SUBJECT FLOW` → `Build your own visual Gemini Gem`.
2. **01 Subject Identity** — multi-image identity group.
3. **02 Outfit Images** — same outfit's garments/details.
4. **03 Knowledge / Environment Images** — room and visual context.
5. **04 Quality / Aesthetic Images** — optional photographic finish.
6. **✍️ Prompts**, marked `Saved automatically`.
7. System Instruction / Base Prompt.
8. Figure details.
9. Target Image Prompt.
10. Preset save/load/delete/export/upload tools.
11. Gem-style behaviour note.
12. Gemini Auto / No Gemini · Direct.
13. Shared Body Tuning, Generation, delivery and results.

| Field | UI limit | Validation |
|---|---|---|
| Each reference group | Up to 8 stored images | Subject and outfit required; Knowledge and Quality optional |
| System Instruction | 5,000 characters; six rows | Required |
| Figure details | 1,200 characters; three rows | Optional |
| Target Image Prompt | 2,500 characters; four rows | Required; backend currently truncates non-Story target to 800 |
| Preset name | 48 characters | Empty save focuses the field |
| Count | UI minimum 5, maximum 20 | Entering mode raises values below 5 |

Group galleries use filename rows, not Classic's plain square grid. Each row contains a 34px preview, ellipsized filename and remove button. Counts update immediately and references persist.

### 5.2 Exact workflow

1. Add identity and canonical outfit views.
2. Add Knowledge images of the room to preserve; multiple images describe views/details of the same interior.
3. Optionally add Quality images to govern photographic finish.
4. Write persistent base instructions and a specific target. Enter exact figure overrides if needed.
5. Optionally save the setup as a named preset.
6. Choose Gemini or Direct, then Generate.
7. The extension prepares scene text, uploads a bounded subset of references, constructs the numbered role map and appends fixed outfit/room/body/finish rules.
8. The same selected Knowledge references remain attached across the batch; they are not rotated as different rooms.

### 5.3 Instruction priority and visual style

The active builder preserves the trimmed target wording. Target action, framing, expression, gaze and location take priority over conflicting base instruction or Gemini expansion. A visible near-frontal/three-quarter face is a default; eye contact is not forced.

Subject Flow uses raw smartphone-camera-roll realism: ordinary available room light, real skin, subtle sensor noise and unsharpened phone-camera quality. Quality references strongly govern lighting, exposure, contrast, color response, grain/noise and degree of polish. They must not replace the requested action/camera composition or import people, furniture or clothing.

Knowledge defines one canonical interior. Preserve recognizable furniture, architecture, surfaces, colors and layout. Reposition the camera inside that room; avoid switching rooms or creating replacement furniture. Unseen areas should be understated and consistent with the visible facts. The builder falls back to a user-described domestic interior when Knowledge is absent.

Physical balance, surface contact, weight and fabric drape must follow the action. Avoid stiff catalog poses. The planner specifically bans repeatedly sitting stiffly on a bed edge looking at a phone and standing stiffly in a kitchen holding a bowl facing the camera.

The current mode has an explicit **no-curly-hair** rule in both planner/builder direction and the appended final prompt. It does not share Classic's unrestricted reference hair treatment.

### 5.4 Reference boundaries and body behaviour

| Reference group | Allowed contribution | Excluded contribution |
|---|---|---|
| Subject | Identity and reference body when no override | Replacement wardrobe/background |
| Outfit | One canonical garment design; later images clarify details | Outfit model's face/body/pose/room |
| Knowledge | The same room and visible facts | People, identity, clothing |
| Quality | Photographic finish | Content, face, body, furniture, pose |

Body Tuning is prepended to dedicated figure details. The current builder says a blank figure should follow identity naturally, but background-appended fallback rules also demand a prominent hourglass figure and tightly fitted curves. This is a real conflicting prompt contract; see §15. Do not describe blank-field behaviour as guaranteed reference-natural.

### 5.5 Gemini and Direct distinction

- Gemini uses the dedicated Subject Flow planner and must return exactly N non-empty strings. A bundled review collage described in logs as 57 candid home photos is attached to the planner.
- The user-selected subject/outfit/Knowledge/Quality images are uploaded to Flow; the Gemini call at this point supplies the bundled collage, not those complete user reference groups.
- Direct duplicates the prepared target exactly and bypasses Gemini. Final requests still include reference/figure/style rules and a randomly shuffled variation cue.
- Six variation cues rotate distinct body action, weight shift, hand placement, orientation and attention while preserving the target. There is no active fixed five-pose/camera recipe in `directPlan`.
- Audit data per image is stored under `bb_subject_flow_audit_<zero-based-index>` with final prompt, model, roles and flags.

### 5.6 Presets: exact actions

| Action | Behaviour |
|---|---|
| Save preset | Snapshot prompts, figure field, engine, model, aspect, count, upscale, batch preference and four reference groups |
| Existing name | Case-insensitive same-name save replaces that preset and keeps its ID |
| Load | Restore saved values and image groups; a full-settings snapshot can also restore another workflow and its Classic/Story data |
| Delete | Remove selected preset immediately; no confirmation in this handler |
| Export selected | Download `<safe-name>.guc-guy-preset.json` |
| Upload preset | Parse/validate JSON, normalize fields and references, save/select it; user must press Load to apply |

Export envelope: `{"format":"guc-guy-subject-flow-preset","version":1,"preset":{...}}`. Import accepts that envelope or a raw object containing a non-empty name. File limit: 100 MiB. Imported count is clamped to 5–20. Image data URLs and names are included; it is a portable setup snapshot, not merely three prompt strings.

The current full-settings snapshot includes Classic references/prompts and Story cast/source/style configuration. It does **not** capture every setting in the extension: Body Tuning, Qid files/controls and Telegram credentials are not part of this desktop preset object. Import normalization also omits the saved `generationMode` field; a roundtrip is not exact for every preference.

## 6. Story Studio — complete workflow and behaviour

### 6.1 Layout and defaults

Top order: Character Library → cinematic hero → Story brief/Novel chapter switch → source composer and @ menu → Chapter queue → Characters → Cinematic tone / Film pacing / lettering toggle → Webtoon references when relevant → workflow note → generated chapter and storyboard.

| Setting | Current behaviour |
|---|---|
| Source mode | Story brief default; Novel chapter selectable |
| Source field | 30,000-character textarea, eight rows |
| Tone default | Brooding crime drama (`crime-noir`) |
| Batch preference | Sequential; separate storage from Classic/Subject Flow |
| Aspect | 16:9 when no saved explicit image aspect exists |
| Initial cast | One empty editable character if none saved |
| Lettering | First initialization migration turns it on; later saved preference respected |
| Extra chapters | Up to 3 in addition to current; 4 per collection |
| Output | Ordered still images, scene prompts, generated chapter and complete PDF |

Story Studio produces keyframes and a PDF. The scene-prompt copy feature prepares image-to-video input; it does not itself render a finished film or submit every Story panel to Qid.

### 6.2 Character Library

- Collection selector includes `Choose a cast collection…`, `Shadow Slave · load full cast`, `My saved characters`, and saved cast backups.
- Search filters name/alias. `+ New` adds a character and scrolls to it.
- Shadow Slave loads the supplied full cast: 17 distinct characters from 19 designs, including alternate Sunny/Nightmare forms.
- Current cast is backed up before switching; named custom designs are preserved in saved characters.
- Alternate forms are selectable; do not merge them into one invented appearance.
- Library items have a small reference preview, character/variant information and add/use controls.
- Per-character Save preset requires name, identity and outfit before saving the snapshot.

### 6.3 Character editor

Each character is a `<details>` card. Empty unnamed characters open by default; named cards render collapsed. Summary shows a two-digit number, name, optional variant, Save preset and Remove. Remove is disabled when only one character remains.

| Field | UI type / maximum | Backend normalization |
|---|---|---|
| Character name | Input / 50 | 50 characters |
| Aliases | Input / 700 | 500 characters |
| Novel / design notes | Textarea / 700 | 2,000-character upper cap |
| Height · optional | Input / 700 | 120 characters |
| Physique / figure · optional | Textarea / 700 | 700 characters |
| Canonical outfit notes | Textarea / 500 | 500 characters |
| Identity photos | Up to 3 | Required at least one |
| Outfit photos | Up to 2 | Required at least one |

All character names must be non-empty and unique ignoring case. Alias conflicts are checked. The source's @ suggestions refer to registered characters; a mention assigns participation in that beat, not automatic visibility in every panel.

Character height/physique are optional. When blank, original identity photos govern the body. When present, written values override reference body proportions while facial identity remains anchored to the original photos. Story does not use Classic's 56-inch default.

### 6.4 Story brief and Novel chapter

**Story brief:** Gemini expands the source into a complete connected story and chronological storyboard in the user's language.

**Novel chapter:** treat pasted source as the adaptation's authority. Preserve event order, meaning, character roles and continuity rather than inventing a replacement chapter. Selecting this mode enables lettering through its switch handler.

Generated chapter output includes title, Copy chapter, scrollable chapter text and a collapsible storyboard shot list. Shot rows contain ordered number, shot/beat, location, visible characters, narration and dialogue previews. Copy chapter writes title plus body; success label temporarily becomes `Copied`.

### 6.5 Chapter queue

Each extra draft is an expandable card with title, source text, Move up and Remove. Sources cannot be blank when starting. Draft source limit is 30,000 characters; stored title is capped at 160. Drafts persist separately from the durable running collection.

`+ Chapter` is disabled when the available count is exhausted. While a collection is active, `Add drafts to running story` can append drafts within the four-chapter total. Successful append clears the draft editor list. Chapters execute in source order, even if individual panel workers finish out of order.

### 6.6 Panel counts and planning

There is no visible Story image-count control. The background extracts explicit English requests such as `exactly 24 panels`, `make 24 panels`, `panel count: 24`, and related patterns. Valid extracted counts start at 4 and are capped at 60. Even approximate wording matched by this parser is subsequently treated as an exact count.

Otherwise:

```text
minimum panels = min(60, max(8, ceil(source word count / 75)))
maximum panels = 60
```

Gemini chooses the needed number within that range. A wrong exact count or a count below the minimum triggers a correction request before generation. The UI helper returning 24 is not the actual runtime storyboard length.

Each panel is one frozen moment. Cover setup → action → reaction → payoff without collapsing separate events into one frame. Use purposeful close-ups, normally at least two when named characters are present. Prefer eye-level straight-axis/subtle three-quarter coverage. An exceptional side/profile/high/low/obstructed angle needs an action-based reason; planner direction allows at most one exceptional angle. Avoid Dutch tilt and arbitrary extreme perspectives.

### 6.7 Story data and continuity

Planner schema includes title, complete chapter, ordered panels, scene IDs/descriptions, time/location, shot/angle/angleReason, beat/action/emotion, carry/world state, transitions in/out, cast and normalized bounds, vehicles, NPCs, optional narration/dialogue and design bible.

- Registered cast: maximum four visible characters per panel. Larger groups are covered through several connected panels.
- Pair each character's original identity references with that same character's outfit references.
- Preserve facial geometry, age, hair, skin and distinctive details across scenes.
- Preserve canonical outfit construction unless the source shows an actual wardrobe-change event.
- Preserve screen direction, prop hand, eye line, geography, relative height, weather and time.
- Vehicle ledger tracks stable IDs, shape, make/model, color, damage, direction, lanes, spacing and occupants; cabin seating and driver position remain coherent.
- Design bible carries forward across chapters, including established NPC designs.
- Off-screen dialogue remains a voice; it does not force a new visible person into the shot. Off-screen balloons have no tail.
- Only a cast-free/NPC-free environment/prop plate can become a generated scene anchor. Do not use a previously generated face as identity evidence.

### 6.8 All five visual styles

| UI label / ID | Style | Light / finish |
|---|---|---|
| Brooding crime drama / `crime-noir` | Prestige crime-drama tension, industrial texture, controlled shadows | Overcast/diffused exteriors, subdued practical interiors; no direct sun/rays/lens flare |
| Natural photorealism / `photorealistic` | Clean, neutral, ungraded camera realism | Scene-appropriate daylight allowed; accurate white balance; no warm wash, grain, vignette, bloom, fake bokeh or LUT |
| Grounded thriller / `grounded-thriller` | Natural color, restrained contrast, quiet suspense | Same final no-direct-sun rule; motivated practical light |
| Warm character drama / `warm-drama` | Human warmth, natural skin, gentle practical light | Modest warmth; no exaggerated grade; final no-direct-sun rule still applies |
| Webtoon illustration / `webtoon` | Consistent illustrated linework, shading, palette and atmosphere | Supplied style samples govern finish; no forced default dark/noir appearance |

Classic's iPhone styling and Subject Flow's raw-room finish must not leak into these Story style branches.

### 6.9 Webtoon art references and lettering

Webtoon-only style area accepts up to four images. Custom samples replace the default supplied set. Files are limited to 8 MiB, resized to maximum long edge 1,600px, composited on white and encoded as JPEG quality 0.86. Default bundled sample roles are atmosphere, acting, interior and action.

Samples govern ink, shading, texture, palette, saturation, contrast and mood, not identity, clothes, depicted objects, layout, text or composition. The first sample breaks disagreements. Flow's reference budget can reduce the number actually attached to a crowded panel.

**Webtoon + lettering on:** Flow is asked for clean artwork; the extension renders exact narration and dialogue afterward with its renderer. Narration uses black cards with bold italic serif treatment; speech uses white bubbles and bundled Comic Neue. Place in available space, protect faces/hands/props, expand gutter only when needed and retain complete text.

**Webtoon + lettering off:** keep text-free art; the Webtoon renderer may still perform its conservative footer handling.

**Other styles + lettering on:** final background prompt asks the image model itself to draw exact narration/dialogue; it explicitly prohibits a separate post-generation overlay. Earlier planner wording still describes extension typesetting, so preserve this actual branch distinction.

**Other styles + lettering off:** ban writing, signs, captions, logos, watermarks, bubbles, numbers, screens/pages with text and overlays.

Webtoon output requests a blank white bottom 6% export gutter. The renderer trims only verified empty footer/isolated recognized footer watermark areas; it is not a general artwork watermark remover.

### 6.10 Resume, Stop, Start over and PDF

| Control | Exact behaviour |
|---|---|
| Resume | Continue saved collection, re-use saved plan/draft and completed panel blobs |
| Stop | Stop admitting new work, retain progress; already-sent request may finish |
| Start over | Disabled while busy; confirms new generation credits, backs up previous collection, replans/regenerates saved chapter sources/cast/settings |
| Retry unconfirmed panels | Visible only when idle with unknown outcomes; explicit resubmit confirmation required |
| Clear saved queue | Disabled while busy; confirm before discarding active saved session |
| Save complete PDF | Appears when complete PDF exists; actual download requires this click |
| Send PDF to Telegram | Manual send/retry of saved PDF using current bot settings |

On browser/worker restart, active Story jobs become paused and can resume. Finished images are kept in IndexedDB. Missing stored blobs are detected and panels become recoverable work. Unconfirmed paid requests are not blindly regenerated.

After all chapters complete, assemble one ordered PDF with page breaks between whole panels. If above 49 MiB, assembly tries a narrower 1,000px/quality-0.76 version. Oversized Telegram delivery is rejected while keeping the local file. PDF saving is manual; configured Telegram PDF delivery can be automatic. A delivery failure does not discard the completed PDF.

## 7. Qid — video prompt studio

### 7.1 Exact controls and defaults

| Control | Options / default |
|---|---|
| Video scene / action | Required textarea; maximum 1,800 characters, four rows |
| Video model | Omni 1.2 (`omni-1-2`, default), Gemini Omni Flash (`omni-flash`), Veo 3.1 Fast (`veo-31-fast`), Veo 3.1 Quality (`veo-31-quality`), Use Flow's current video model (`flow-auto`) |
| Frame | 9:16 portrait default; 16:9 landscape |
| Face | Keep face hidden default; Face visible |
| Motion | Mirror outfit showcase default; slow turn; hair adjustment; window/balcony; seated; doorway entrance; custom |
| Subject reference | Optional one image |
| Outfit reference | Optional one image |
| Starting frame | Optional one image |
| Desi-inspired styling | Checked by default |
| Build prompt | Writes read-only prepared prompt and attempts clipboard copy |
| Generate video | Builds prompt, uploads images, configures Flow and submits |
| Prepared prompt | Seven-row read-only textarea |

Reference areas are button-based drop zones with click, drag/drop, Enter/Space activation and Remove image. Preview object URLs are revoked on replacement. These files are held in file inputs and **do not survive reopening**; text/select/checkbox values are saved as `bb_qid...` keys.

The current product has no motion-clip upload, duration selector, seed, audio toggle or dedicated Qid Body Tuning controls.

### 7.2 Every motion preset

| ID | Actual requested movement |
|---|---|
| `mirror` | Natural weight shift, small sleeve/hair adjustment, gentle half-turn in mirror outfit showcase |
| `turn` | Slow controlled three-quarter turn to side profile and back, pauses, steady camera |
| `hair` | Small hair adjustment, relaxed shoulder shift, subtle turn toward camera |
| `window` | Look toward view, shift weight, turn slightly toward camera |
| `seated` | Subtle posture adjustment, relaxed hand movement, small look toward camera |
| `entrance` | Calm doorway entrance, small turn toward camera, relaxed final pose |
| `custom` | Follow only action described in scene |

### 7.3 Prompt assembly and style

Order: coherent-video/identity instruction → SCENE → ACTION → FRAME → FACE → FIGURE → OUTFIT → START FRAME → no motion clip notice → POSE → BACKGROUND → CAPTURE → Desi/general non-explicit fashion presentation.

- A nearby close/medium-close prominent person; its fixed frame rule says to ignore distant framing.
- Visible face with reference: maintain selected identity. Visible face without reference: fictional, non-identifiable face. Hidden-face mode: naturally obscure face or keep it outside frame.
- Figure baseline: approximately 56-inch bust and 56-inch hips, natural reference-consistent waist/abdomen rather than generalized enlarged torso.
- Saved Body Tuning values are appended even though that section is hidden in Qid. This branch does not use Classic's full explicit precedence resolver.
- Outfit image governs exact garments/material/colors/details; adapt fit to subject, not outfit model's shape.
- Without outfit: checked Desi option uses tasteful desi everyday styling; unchecked uses scene-appropriate clothing.
- Starting image requests matching opening composition and clothing continuity, then believable motion.
- Small continuous actions; avoid frozen pose or repeated pose loop. Keep hands, joints, cloth, props and contact plausible.
- Real layered environment with readable details around prominent subject.
- Phone-video perspective, true skin/fabric, lively natural color/contrast. No beauty filter, grade, plastic skin, extra people, text or logos.

### 7.4 Generate video lifecycle

1. Require scene; build full prompt and validate chosen model/frame.
2. Read up to three image references. Backend accepts JPEG, PNG, WebP and GIF base64 images; common file reader also imposes 8 MiB per file.
3. Create a fresh Flow project and upload references with confirmed media IDs.
4. Reload project after uploads if necessary, then inject `content_flow_video.js` in page MAIN world.
5. Require helper version `1.0.4`; configure Video mode/model/aspect, select uploaded references and verify attachment identity before submitting.
6. Exact requested model must be available unless Flow-auto is selected; do not silently claim unavailable models ran.
7. Admit video generation through the shared request guard; click Generate once and track acknowledgment separately from clicking.
8. Poll helper progress every 350ms, with an eight-minute completion window after helper start.
9. Display verified Google video URL in an inline controlled video player, plus Download and Open Flow project.
10. If submission may have happened but result cannot be confirmed, retain `outcome_unknown` and instruct project inspection before retry.

Queue download filename: `GucGuy/qid-video-<index>.mp4`, with Save As dialog. Only recognised HTTPS Google/Flow media hosts are accepted for the player. Qid does not use shared image model/count/upscale/Telegram controls.

## 8. Shared Body Tuning and generation settings

### 8.1 Body Tuning

Six plain text fields in a two-column grid: Height; Weight; Bust / Chest; Waist; Hips & Thighs; Belly / Navel. Each autosaves. These are descriptive strings; the UI does not parse units, validate physical measurements or offer sliders.

Classic assembles them into a highest-priority per-trait body contract. Subject Flow prepends them to its physical details. Story has individual character height/physique fields. Qid reads these saved shared values despite hiding the panel.

### 8.2 Generation controls

| Control | Values / exact behaviour |
|---|---|
| Image model | Nano Banana Pro = `GEM_PIX_2`; Nano Banana 2.1 = `NARWHAL`; Nano Banana 2 Lite = `HARBOR_SEAL` |
| API alias | `NARWHAL` maps to `BELUGA`; internal legacy `BELUGA` accepted |
| Aspect ratio | 9:16 portrait, 3:4 portrait default, 1:1 square, 4:3 landscape, 16:9 landscape |
| Images at once | Numeric; default 5; Classic 1–20; Subject Flow UI 5–20 |
| Batch mode | Parallel · up to 2 in flight / Sequential · one at a time |
| Upscale preference | 2K when available / Original image; default on |
| Quality badge | `◉ High-detail phone look`, or `◉ Live-action cinematic` in Story |
| Batch badge | `⚡ Parallel · 2` or `↪ Sequential` |

Parallel means at most **two workers/in-flight image requests**, with generation starts at least **8 seconds apart**. It does not launch 20 requests simultaneously. Sequential processes one image at a time. The generic request-guard factory defaults to 2 seconds for callers/tests, but the live singleton is configured with 8,000ms.

Upscale is a saved preference; the interface explicitly says an extra 2K upscale pass is unavailable and Flow's returned resolution is saved. Do not promise a working additional 2K pass based on the dropdown label.

## 9. References, processing and upload budgets

### 9.1 Storage limits versus active generation budget

| Mode/group | Stored UI limit | Uploaded/attached behaviour |
|---|---|---|
| Classic subject | 8 | First 3 uploaded and attached |
| Classic outfit | 1 | One canonical outfit |
| Classic location | 1 | Attached when present |
| Subject Flow subject | 8 | First 3 |
| Subject Flow outfit | 8 | First 3, all same canonical outfit |
| Subject Flow Knowledge | 8 | First 6 uploaded; attach only what fits after subject/outfit/quality reservations |
| Subject Flow Quality | 8 | First 1 uploaded/attached |
| Story per-character identity | 3 | All relevant characters uploaded; at most 3 views each in one/two-character shots, 1 each for larger casts |
| Story per-character outfit | 2 | Up to 2 for one character; 1 each with multiple characters |
| Webtoon styles | 4 | Attach remaining capacity, reserving scene context |
| Qid | 1 per each of 3 roles | Up to 3 selected images |

The final image request budget is **9 unique reference inputs**. Identity and canonical outfit get priority. Subject Flow retains the same bounded Knowledge subset for all images. Classic's internal multi-environment support can rotate one environment per image, but its normal UI supplies one location.

The same uploaded media selected for more than one role is deduplicated; numbered maps are remapped to the single attachment. Keep every retained role description. Missing required upload/attachment confirmation fails before spending generation credits.

### 9.2 Reference meaning

An image is not a universal inspiration reference. The filename/group/order determines its role. The final request explicitly numbers each image and tells Flow what it can and cannot contribute. Preserve this separation in any reimplementation; uploading images without the role map is incomplete functionality.

Reference transport uses the signed-in Flow project and helper modules to upload and confirm media. It caches reusable media by project/content context, records diagnostics and treats unknown upload outcomes separately from known failures. Do not fabricate media IDs or silently proceed when required files are missing.

## 10. Queue, preview, retry, stop and logs

### 10.1 Queue display

- Initial Classic/Subject Flow placeholders equal requested count; Story/Qid start with one placeholder.
- Each card has two-digit position and readable status. Order follows request/panel order, not completion time.
- Normal image crop aspect follows selected ratio; Story uses full image height/contain treatment; video uses auto sizing.
- Completed cards get a green border; failed cards red. Generating/downloading/retrying/manual-retry use a 1.3s animated yellow shimmer.
- Completed count counts only `done`. General progress can reach 100% when all work was processed even if some images failed; inspect count/logs.
- Error text is available as a title/tooltip. Retry countdown uses retryAt and attempt values when present.

Statuses handled across rendering/runtime include `waiting`, `queued`, `preparing`, `generating`, `downloading`, `retrying`, `waiting_quota`, `manual_retry`, `done`, `failed`, `quota_exhausted`, `stopped`, `paused`, `outcome_unknown`.

### 10.2 Preview and downloads

Click image to open full overlay. Story reads full stored panel on demand rather than treating its small grid thumbnail as the deliverable. Close by close button or clicking the overlay background. The current popup does not register Escape-to-close for this image overlay; Escape is handled for the Story mention menu.

Normal card download uses a legacy `BigBOMB/image-<index>.png` path. Story panel save uses `Story-Studio/chapter-<chapter>-panel-<index>.<jpg|png>` with Save As. Story complete PDF is separate. Qid download uses MP4 and Save As. Do not infer ZIP export from the presence of JSZip in worker imports.

### 10.3 Regenerate one image

Non-Story/non-video cards offer ↻ for done, failed, quota-exhausted, stopped, paused and outcome-unknown states. It is inactive during another run. Unknown outcome requires confirmation because the first request may already have generated/charged.

Manual retry affects the chosen image, not the entire batch. A completed Classic retry clears prior generation metadata and can choose a fresh shot from history. Other non-Story prompt retry logic adds a unique retry-variation marker. A known generated result with a download failure can recover media rather than blindly purchase a duplicate. The retry handler is in worker memory; it is not a durable gallery service across arbitrary restarts.

### 10.4 Stop and retry policy

Stop disables itself while acknowledgment is pending and sets `Stopping…`. New submissions stop; paid requests already sent may complete. Failure to acknowledge Stop restores controls and exposes the error.

| Failure class | Behaviour |
|---|---|
| Transient pressure: 429, unavailable, internal, deadline | Bounded retry with backoff |
| Daily quota / policy / unsafe generation / permission / sign-in | Do not automatically loop generation |
| Unusual activity refusal | Stop shared admission, retain progress, require account inspection/resume |
| Unknown generation or upload outcome | Do not blindly resubmit |
| Closed/invalid tab or unrecoverable tab recovery | Stop corresponding retry path; preserve diagnosis |
| Download-only error with known generation | Prefer media recovery |

Shared retry delay formula is `min(45000, 3000 * 2^min(attempt-1,4))`. Retry budgets are operation-specific; do not implement infinite retries. Exact worker loops and helper call sites remain in the source snapshot map.

### 10.5 Logs and diagnostics

Live terminal shows timestamped activity, success and error coloring. Clear resets logs. Copy diagnostics reads saved reports and current state, produces JSON in the clipboard, and temporarily acknowledges success. Reports cover project/ref verification, selected models, request stage, HTTP failures and unknown outcomes. Do not display hidden transport/security details as extra user setup steps.

## 11. Google connection, Gemini and generation lifecycle

### 11.1 Account card

Initial HTML says `Guc guy account`, `Checking your Google sign-in…`, `No Flow project tab is required`, and `Sign up / Log in with Google`.

Popup then checks/restores account. Connected state says `Google account connected`, account identifier/readiness, `No Flow project tab needed · projects are created automatically`, and `Switch account`. Some fallback/error strings still use BigBOMB branding.

Click opens Google account chooser; button disables while pending. Poll every 1.5s for up to two minutes during login. Normal account refresh runs every 15s. Generate is disabled until connected and whenever another run is active. The product does not require the user to manually create a Flow project first.

### 11.2 Images: ordered stages

```text
Validate inputs
→ Resolve mode, settings, body fields and reference groups
→ Create fresh inactive Flow project/editor
→ Gemini plan or local direct plan
→ Validate/repair planner JSON; save Story drafts/plans
→ Upload bounded reference groups; confirm media
→ Build exact per-image reference map and prompt
→ Admit under 8-second spacing / two-in-flight maximum
→ Generate with selected model/aspect
→ Retrieve returned image at available quality
→ Story render/checkpoint, when relevant
→ Queue preview + configured delivery
→ Finish, or retain resumable/failed state
```

Google tabs are normally background tabs. Keep Chrome running and Google signed in. The side panel opens a runtime keepalive port and pings every 20s; background Story work also uses keepalive activity.

### 11.3 Gemini behaviour

Gemini is a text planner. Parse JSON, validate count and schema, and repair limited malformed JSON formatting. Responses must not be accepted just because some text appeared. Content helper handles stable completion and stalled responses; planning timeout is eight minutes, message envelope ten minutes. Story saves parsed draft before strict validation so Resume can recheck it.

Classic passes text plan instructions; Subject Flow adds a bundled candid-reference collage; Story supplies cast/design metadata. Do not claim that every user's selected reference image is automatically sent to Gemini. Flow receives actual selected image references in the subsequent image stage.

## 12. Telegram delivery

### 12.1 Interface

Blue-tinted full-width panel inside Generation. Main checkbox: `✈️ Send to Telegram Bot`. Enabling reveals Bot Token password input, Target Chat Link or ID, `⚡ Auto-detect my chat`, Send uncompressed (Document), Test Bot and status text.

- Token is entered from BotFather and saved locally; no token is embedded in this document.
- Chat field accepts supported `t.me` links, @channel/username or numeric chat IDs; resolution depends on what the bot can access.
- Auto-detect uses bot updates; it is not arbitrary account discovery.
- Test Bot is an actual bot test action, not local validation only.
- Settings autosave. Disabling hides configuration without deleting saved credentials.

### 12.2 Output behaviour

Classic/Subject Flow completed images are queued for bot delivery when enabled and token/chat values are provided. Document mode preserves uncompressed attachment delivery; photo mode uses Telegram's image path. Sends are serialized, include image index/mode/prompt caption, retry with a finite budget and pause one second between queued sends.

Story sends one completed collection PDF through its delivery path instead of using the same per-image Telegram branch. Failed delivery is logged and retained for retry. Qid currently has no Telegram generation path in this UI.

## 13. Phone remote

### 13.1 Pairing journey

1. On PC run `start-mobile-remote.bat`; Node 18+ is required for bridge setup.
2. Keep bridge and Chrome running on an awake PC.
3. Expand Phone remote and choose Create phone QR.
4. Scan on a phone on the same trusted Wi-Fi.
5. Phone connects to the bridge and controls the PC's saved configuration and runs.

Bridge uses port **32189**, with worker WebSocket `ws://127.0.0.1:32189/bridge`. Generating a new QR replaces the pairing token. The QR/link is a control credential. There is no internet relay; this is not a remote-anywhere service.

### 13.2 Remote interface and supported operations

Remote page order: brand → connection/status/progress/queue + Start/Stop → Workflow & generation → Full prompt settings → Reference images → Save/upload full preset → selected generated image preview/download → Recent activity.

Its workflow selector includes Classic, Subject Flow and Story. **Qid is absent.** It supports saved prompts/settings, reference upload/remove, character editing, full preset import/export, start/stop/retry and output preview. It does not expose every modern desktop Story control or the Body Tuning/Telegram/Qid interface as identical controls.

Remote design: 850px maximum shell, 15px base font, 42px minimum inputs/buttons, rounded dark cards, yellow primary actions, two-column layout from 680px. It is intentionally more touch-sized than the compact desktop panel. Exact markup/CSS is included in the appendices.

## 14. Persistence, messages and module responsibilities

### 14.1 Storage categories

| Storage | Purpose |
|---|---|
| `chrome.storage.local` with `bb_` keys | Modes, prompts, references, settings, characters, presets, draft chapters, diagnostics |
| Legacy `ig_` values | Migrated/fallback values where corresponding current values are missing |
| `bb_classic_shot_history` | Last 40 choices for Classic pose/place/crop/gaze rotation |
| `bb_subject_flow_audit_<i>` | Submitted Subject Flow prompt/role audit |
| `chrome.storage.session` | Session-scoped Flow auth token state |
| IndexedDB `GucGuy-exports`, store `files` | Export blobs, durable Story session/panels/PDF |
| Worker `STATE` | Running/stopping, current queue/status/progress/logs, live retry handler |
| Qid file inputs | Current selected video reference files; not persisted |

Shared model/aspect/count/engine persist across Classic/Subject Flow. Story has separate batch preference but uses shared model/aspect. Reference groups remain mode-specific. Presets snapshot image data rather than referring to files that must stay on disk.

### 14.2 Important runtime messages

| Message | Purpose |
|---|---|
| `CHECK_FLOW`, `CONNECT_FLOW_ACCOUNT` | Inspect/connect account |
| `bb_generate` | Start Classic, Subject Flow or Story |
| `bb_qid_generate` | Start Qid |
| `GET_STATE` | Restore runtime UI |
| `bb_stop`, `bb_retry_image` | Stop or retry chosen image |
| `bb_status`, `bb_progress`, `bb_queue`, `bb_log`, `bb_done`, `bb_stopping` | Worker → panel updates |
| `bb_story_plan`, `bb_story_session` | Story chapter/session updates |
| `bb_story_state/resume/stop/start_over/append/discard` | Durable Story lifecycle |
| `bb_story_pdf_save/pdf_send/panel_save/panel_preview` | Story output access |
| `PAIR_PHONE_REMOTE` | Generate pairing link/QR |
| `bb_autodetect_telegram`, `bb_test_telegram` | Telegram setup actions |
| `CLEAR_LOGS` | Reset current log view/state |

### 14.3 Source map

| File | Responsibility |
|---|---|
| `manifest.json` | Extension permissions, entrypoint, content script registration |
| `popup.html` / `popup.css` | Static UI hierarchy, labels, appearance, responsive rules |
| `popup.js` | Autosave, mode switching, uploads, validation, presets, Qid prompt, queue rendering |
| `background.js` | Account/project setup, generation orchestration, reference roles, delivery, runtime messages |
| `classic-direction.js` | Classic body, pose, locations, capture and prompt builders |
| `subject-flow-direction.js` | Subject Flow planner, Direct plan, final builder and variation cues |
| `story-engine.js` | Story planning/schema validation, scene/image prompt construction |
| `story-tools-ui.js` / `story-library.js` | Cast library, presets, drafts and session controls |
| `story-jobs.js` | Durable jobs, checkpoints, resume/start-over, complete PDF delivery |
| `story-renderer.js` | Webtoon lettering, conservative footer handling, thumbnails/PDF |
| `content_gemini.js` | Gemini web interaction and response detection |
| `flow-backend.js`, `flow-rpc.js`, `flow-compat.js` | Flow request transport and compatibility |
| `flow-request-guard.js`, `flow-retry.js` | Admission, stop/security refusal, retry decisions |
| `flow-page-upload.js`, upload/native/bridge helpers | Reference upload and confirmed page state |
| `flow-tab-recovery.js`, `flow-diagnostics.js` | Tab recovery and request traces |
| `content_flow_video.js` | Qid native composer/model/ref verification and video lifecycle |
| `offscreen.html` / `offscreen.js` | Large-blob download support |
| `server.js`, `remote-control.html`, `start-mobile-remote.bat` | Local phone bridge, remote UI and launcher |
| `assets/`, `references/` | Icons/fonts/cast/style samples and research evidence |

Manifest requests storage/unlimitedStorage, downloads, clipboardWrite, scripting, tabs, offscreen, sidePanel, webRequest, identity and identity.email. Hosts include Gemini, Flow, relevant Google API/media domains, Telegram API and loopback bridge. Respect these boundaries; no server API key-based Gemini integration is implemented by this manifest.

## 15. Current inconsistencies and implementation caveats

These findings distinguish exact current behaviour from labels/comments/history. A clone can preserve them; an improved rebuild should make each change explicit.

| Finding | Current truth / implication |
|---|---|
| Branding | Guc guy UI coexists with BigBOMB/Flipo text, paths and package names |
| Version | Manifest/header 4.6.21; bridge package version 4.3.8 and older notes are not active extension version |
| Classic unspecified measurements | Current prompt contains approximate 56-inch chest/hips; old helper text/log says “without invented measurements” |
| Parallelism | Current runtime 2 workers, 8s starts; older notes say 5 workers/2s or Story 3 workers |
| Classic gaze deck | Gaze IDs rotate and persist, but gaze text is omitted from `describeShot` |
| Direct label | Exact scene preserved; final prompt still adds mode/reference/style instructions |
| Subject Flow target length | UI 2,500; background slices non-Story scene to 800 |
| Subject Flow blank figure | Builder says reference-natural; later locks add hourglass/clinging-clothes fallback |
| Subject Flow target vs Knowledge | Target declares highest priority but canonical-room lock can conflict with an outside-room target |
| Subject Flow hair | Explicit no-curly rule, even if another rule says preserve reference hair |
| Subject Flow old constants | Background's forceful 1–4m/40–70% camera and room-expansion strings are defined; active builder does not simply append those constants |
| Surveillance audit | Log can say a camera override was applied; `prepare` only trims and does not rewrite surveillance wording |
| Gemini sees references | Planner text mentions references, but current actual image payload is the bundled Subject Flow collage; user groups go to Flow |
| Reference limits | Up to 8 stored is not 8 active per group; final cap is 9 unique inputs |
| Preset completeness | Desktop snapshot lacks six tuning fields, Qid inputs and Telegram configuration; import drops batch field |
| Story 24 helper | Not a fixed 24-panel job; background uses explicit count/density with max 60 |
| Story aspect | Existing chosen shared aspect remains; switching mode does not always force landscape |
| Story lettering default | Raw HTML unchecked, first-run migration on |
| Story lettering path | Webtoon overlay is extension-rendered; other tones can use model-rendered text |
| Story label | `Live-action cinematic` badge can remain even with Webtoon selected |
| Qid Body Tuning | Hidden shared inputs still affect Qid prompt |
| Qid prompt priority | Fixed near/medium framing can conflict with requested distant scene; fixed figure is always included |
| Qid starting frame | Prompt uses opening-frame semantics; verify native Flow attachment behaviour rather than promising an unavailable model-specific conditioning feature |
| Qid prompt edit | Output textarea is read-only; Generate rebuilds from controls |
| Qid duration/audio | No dedicated user controls; do not invent exact clip duration or audio guarantees |
| Output guarantees | Face fidelity, garment/body match, exact lettering and blur control are model instructions, not measured pass/fail enforcement |
| Remote parity | No Qid; several remote model labels are older than desktop; modern Story controls are not mirrored completely |
| Responsive grid | Inline Body Tuning columns and Qid's own grid do not share every narrow-screen collapse |
| Queue persistence | Main results/retry state are not equivalent to durable Story checkpoint storage |

## 16. Acceptance checklist for applying this spec

### Shared UI and state

- [ ] Render compact dark panel at 320/340/370/420/540px and inspect actual overflow/wrapping.
- [ ] Reproduce labels, section order, dimensions, active states and keyboard focus from exact appendices.
- [ ] Restore saved settings and references after closing/reopening panel.
- [ ] Correct mode visibility; account/logs/results remain accessible.
- [ ] Block double generation; connected-state gating; stop acknowledgment and error recovery.
- [ ] Never represent stored reference count as active request attachment count.

### Classic

- [ ] Require subject, outfit and scene; support optional location/figure and six tuning fields.
- [ ] Both engines use the same final Classic identity/body/camera contract.
- [ ] Explicit pose/framing/time/location wins over incompatible random/planner suggestions.
- [ ] Preserve first face anchor and clothing-only outfit role.
- [ ] Exercise all five pose families, recent-history selection and default crop rotation.
- [ ] Verify day/night/no-flash/reference-interior prompt routing.
- [ ] Confirm actual request has intended figure and no unrequested image post-processing.

### Subject Flow

- [ ] Require identity, outfit, base and target; preserve separate groups.
- [ ] Same Knowledge room subset attached across the batch within nine refs.
- [ ] Direct bypasses Gemini; final rule assembly still runs.
- [ ] Preset save/load/overwrite/delete/export/import and legacy handling work.
- [ ] Explicitly decide how to handle the documented blank-figure and length conflicts.

### Story

- [ ] Unique names/aliases; reference pairing; four visible registered cast maximum.
- [ ] Brief/Novel source behaviour, @ suggestions and queued chapters work.
- [ ] Test count extraction/density/correction without fixing every story to 24 panels.
- [ ] Keep each of five visual styles separate; Webtoon custom/default art references.
- [ ] Check rendered lettering and complete text; preserve art and panel order in PDF.
- [ ] Stop/restart/Resume skips completed panels and retains drafts/design bible.
- [ ] Start over confirms cost and preserves backup; unknown requests require explicit resubmit.
- [ ] PDF manual save and failed Telegram delivery preserve local output.

### Qid and integrations

- [ ] Build prompt works without submitting; no required image refs.
- [ ] All model/frame/face/motion choices and three file controls work.
- [ ] Confirm selected refs/model before single submission; distinguish clicked vs accepted.
- [ ] Handle unavailable model and unknown outcome without blind retries.
- [ ] Play/download verified result and open its actual Flow project.
- [ ] Telegram tests and real sends are only triggered by their intended actions.
- [ ] Phone pairing/token replacement, saved config updates and reconnect work locally.

The checklist is for future implementation/QA. This documentation task inspected source and generated the inventories below; it did not run paid Flow requests, send Telegram messages or claim these future acceptance checks passed.

## 17. Exact inventories and source appendices

The following sections are generated from the inspected files to preserve exact strings and styling without relying on paraphrase. Source code in collapsible blocks is supporting implementation evidence; the readable sections above explain how the pieces behave together.

<!-- GENERATED EXACT APPENDICES -->

### 17.1 Every static desktop input and selector

Defaults below are HTML defaults. Runtime restoration and migration can override them as described above. `hidden` and `disabled` list attributes on the control itself; ancestor/mode visibility is governed by §3.2.

| ID | Type | HTML default | Attributes / limits | Exact placeholder | Select values → labels |
| --- | --- | --- | --- | --- | --- |
| qidPrompt | textarea | (empty) | maxlength=1800; rows=4 | Describe the scene and action you want… |  |
| qidModel | select | omni-1-2 |  |  | omni-1-2 → Omni 1.2<br>omni-flash → Gemini Omni Flash<br>veo-31-fast → Veo 3.1 Fast<br>veo-31-quality → Veo 3.1 Quality<br>flow-auto → Use Flow's current video model |
| qidAspect | select | VIDEO_ASPECT_RATIO_PORTRAIT |  |  | VIDEO_ASPECT_RATIO_PORTRAIT → 9:16 · portrait<br>VIDEO_ASPECT_RATIO_LANDSCAPE → 16:9 · landscape |
| qidFace | select | hidden |  |  | hidden → Keep face hidden<br>visible → Face visible |
| qidMotion | select | mirror |  |  | mirror → Mirror outfit showcase<br>turn → Slow turn and side profile<br>hair → Hair adjustment and gentle pose<br>window → Window / balcony pose<br>seated → Seated pose with subtle movement<br>entrance → Doorway entrance and camera turn<br>custom → Use scene description only |
| qidSubject | input:file | (empty) | accept=image/*; hidden |  |  |
| qidOutfit | input:file | (empty) | accept=image/*; hidden |  |  |
| qidStartFrame | input:file | (empty) | accept=image/*; hidden |  |  |
| qidDesiStyle | input:checkbox | checked |  |  |  |
| qidOutputPrompt | textarea | (empty) | rows=7; readonly | Your prepared prompt will appear here… |  |
| subjectFiles | input:file | (empty) | accept=image/*; multiple |  |  |
| outfitFile | input:file | (empty) | accept=image/* |  |  |
| locationFile | input:file | (empty) | accept=image/* |  |  |
| shortPrompt | input:text | (empty) | maxlength=300; autocomplete=off | e.g. A casual photo by a plain wall, in a lift or a garden |  |
| physicalDetails | textarea | (empty) | maxlength=1200; rows=4 | e.g. 5'6, thick hourglass, full thighs, soft abdomen; your chest, waist and hip measurements… |  |
| sfSubjectFiles | input:file | (empty) | accept=image/*; multiple |  |  |
| sfOutfitFiles | input:file | (empty) | accept=image/*; multiple |  |  |
| sfKnowledgeFiles | input:file | (empty) | accept=image/*; multiple |  |  |
| sfQualityFiles | input:file | (empty) | accept=image/*; multiple |  |  |
| sfSystemPrompt | textarea | (empty) | maxlength=5000; rows=6 | Define the permanent rules, identity behavior, composition standards, camera style and anything every image must follow. |  |
| sfFigureDetails | textarea | (empty) | maxlength=1200; rows=3 | Your exact physique, proportions and height. Leave blank to use details already written in your base/target prompt. |  |
| sfTargetPrompt | textarea | (empty) | maxlength=2500; rows=4 | Describe the image or scene you want to create right now. |  |
| sfPresetName | input:text | (empty) | maxlength=48 | Preset name |  |
| sfPresetSelect | select | (empty) |  |  |  → No saved presets |
| sfPresetFile | input:file | (empty) | accept=application/json,.json; hidden |  |  |
| storyLibrarySeries | select | current |  |  | current → Choose a cast collection…<br>shadow → Shadow Slave · load full cast<br>custom → My saved characters |
| storyLibrarySearch | input:search | (empty) |  | Search name or alias… |  |
| storyBrief | textarea | (empty) | maxlength=30000; rows=8 | e.g. @Ayesha reaches the old station at dusk. @Ravi is waiting with a letter that changes everything… |  |
| storyBgStyle | select | crime-noir |  |  | crime-noir → Brooding crime drama<br>photorealistic → Natural photorealism<br>grounded-thriller → Grounded thriller<br>warm-drama → Warm character drama<br>webtoon → Webtoon illustration |
| storyTextOverlays | input:checkbox | unchecked |  |  |  |
| storyStyleReferenceInput | input:file | (empty) | accept=image/*; multiple |  |  |
| tuneHeight | input:text | (empty) |  | e.g. 5'5 or Short |  |
| tuneWeight | input:text | (empty) |  | e.g. 85kg or Heavy |  |
| tuneBust | input:text | (empty) |  | e.g. 56-inch or Huge |  |
| tuneWaist | input:text | (empty) |  | e.g. Soft, 36-inch, Narrow |  |
| tuneHips | input:text | (empty) |  | e.g. 56-inch, Wide |  |
| tuneNavel | input:text | (empty) |  | e.g. Chubby, exposed navel |  |
| imageModel | select | GEM_PIX_2 |  |  | GEM_PIX_2 → Nano Banana Pro<br>NARWHAL → Nano Banana 2.1<br>HARBOR_SEAL → Nano Banana 2 Lite |
| aspectRatio | select | IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR |  |  | IMAGE_ASPECT_RATIO_PORTRAIT → 9:16 Portrait<br>IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR → 3:4 Portrait<br>IMAGE_ASPECT_RATIO_SQUARE → 1:1 Square<br>IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE → 4:3 Landscape<br>IMAGE_ASPECT_RATIO_LANDSCAPE → 16:9 Landscape |
| imageCount | input:number | 5 | min=1; max=20 |  |  |
| generationMode | select | parallel |  |  | parallel → Parallel · up to 2 in flight<br>sequential → Sequential · one at a time |
| upscaleEnabled | select | on |  |  | on → 2K when available<br>off → Original image |
| tgEnabled | input:checkbox | unchecked |  |  |  |
| tgBotToken | input:password | (empty) |  | e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ... |  |
| tgChatId | input:text | (empty) |  | e.g. https://t.me/username, @channel, or 123456789 |  |
| tgSendAsDoc | input:checkbox | unchecked |  |  |  |

### 17.2 Every static desktop button

Dynamically created gallery, character, draft and result buttons are described in the main specification and exact UI logic appendix.

| ID | Exact visible text | Initial flags / metadata |
| --- | --- | --- |
| connectFlowAccount | Sign up / Log in with Google |  |
| pairPhone | Create phone QR |  |
| modeClassic | Guc guy Classic Natural phone portraits | data-mode=classic |
| modeSubjectFlow | ✦ Subject Flow Gem-style custom workflow | data-mode=subject-flow |
| modeStory | ▣ Story Studio Gemini story + film keyframes | data-mode=story |
| modeQid | ▶ Qid Video prompt studio | data-mode=qid |
| qidSubjectDrop | Drop image or click to choose | aria-label=Drop or choose subject image |
| qidSubjectClear | Remove image | hidden |
| qidOutfitDrop | Drop image or click to choose | aria-label=Drop or choose outfit image |
| qidOutfitClear | Remove image | hidden |
| qidStartFrameDrop | Drop image or click to choose | aria-label=Drop or choose starting frame image |
| qidStartFrameClear | Remove image | hidden |
| qidBuildPrompt | Build prompt |  |
| qidGenerate | Generate video |  |
| removeOutfit | Remove outfit | hidden |
| removeLocation | Remove location | hidden |
| engineGemini | ✦ Gemini Auto Creates unique prompt variations | data-engine=gemini |
| engineDirect | Direct Prompt Uses your exact prompt | data-engine=direct |
| saveSfPreset | Save preset |  |
| loadSfPreset | Load | disabled |
| deleteSfPreset | Delete | disabled |
| exportSfPreset | Export selected | disabled |
| uploadSfPreset | Upload preset |  |
| sfEngineGemini | ✦ Gemini Auto Creates faithful prompt variations | data-engine=gemini |
| sfEngineDirect | No Gemini · Direct Uses your target prompt exactly | data-engine=direct |
| newLibraryCharacter | + New |  |
| storySourceBrief | Story brief | role=tab |
| storySourceNovel | Novel chapter | role=tab |
| addQueuedChapter | + Chapter |  |
| appendQueuedChapters | Add drafts to running story | hidden |
| addStoryCharacter | + Add character |  |
| copyStoryChapter | Copy chapter |  |
| tgTestBtn | Test Bot |  |
| generate | Generate images → |  |
| resumeStory | Resume | title=Continue saved chapters; keep completed panels |
| stopStory | Stop | title=Stop new requests and save progress |
| startOverStory | Start over | title=Generate these saved chapters again from the beginning |
| retryUnknownStory | Retry unconfirmed panels | hidden |
| saveStoryPdf | ↓ Save complete PDF | hidden |
| sendStoryPdf | Send PDF to Telegram | hidden |
| discardStory | Clear saved queue |  |
| stop | Stop generation | disabled |
| copyDiagnostics | Copy diagnostics |  |
| clearLogs | Clear |  |
| closePreview | × | aria-label=Close preview |

### 17.3 Classic — all 20 location moods, verbatim

These are optional mood suggestions when the target/reference does not bind a place.

| ID | Indoor flag | Exact setting text |
| --- | --- | --- |
| cafe-patio | false | A lively cafe patio with jewel-green plants, patterned tile or painted trim, one attractive table detail and a colorful but believable social background. |
| rooftop | false | A colorful city rooftop with crisp railing lines, saturated building accents and a readable skyline close behind the subject, never a distant travel panorama. |
| courtyard | false | A modern courtyard with a bold painted doorway, patterned floor or colored tile, leafy pots and layered architecture around the close portrait. |
| waterfront | false | A waterside cafe or promenade with colorful railing details, sparkling but natural water reflections, and a nearby shoreline setting visible behind the subject. |
| botanical | false | A lush garden path with deep green leaves, vivid flowers in a few colors, textured stone and a house or cafe detail behind the subject. |
| boutique | false | A fashionable city storefront with glossy glass, colorful signs kept unreadable, vivid window displays and real street texture close behind the subject. |
| pool-terrace | false | A stylish pool terrace with clear turquoise water, colorful loungers or towels, lush planting and bright real daylight; keep the person close and prominent. |
| gallery | true | A contemporary art-gallery corner with one large colorful artwork, warm wood or polished stone, gallery lighting and visible architectural depth behind a close portrait. |
| lobby | true | A premium hotel lounge with emerald or burgundy upholstery, brass details used sparingly, a statement lamp and layered modern architecture; avoid empty beige walls. |
| veranda | false | A bright home veranda with vivid potted flowers, a colored tile edge, modern chairs and leafy outdoor depth visible around the subject. |
| cafe-window | true | A stylish cafe window seat with colored cushions, textured wall or tile, window reflections and green street life visible just beyond the subject. |
| stone-steps | false | Broad stone steps beside a vivid painted wall, iron railing or flowering planter, with alternating light and shadow giving the close composition depth. |
| flower-terrace | false | A flower terrace with saturated bougainvillea or seasonal blooms, colored planters, textured paving and natural outfit-to-flower contrast. |
| palm-path | false | A palm-lined garden walkway with deep green fronds, terracotta pots, colorful flowering plants and a nearby residential or cafe backdrop. |
| marina | false | A marina-side cafe with blue water, colorful boat details, a textured railing and reflections visible behind a close subject; avoid distant wide framing. |
| library-lounge | true | A refined modern home lounge with a deep teal or wine-colored sofa, warm wood, one striking art object, a plant and real lived-in detail. |
| glass-atrium | true | A glass atrium with colorful reflections, a textured stone column, lush indoor greenery and a bright architectural background that stays readable. |
| garden-bench | false | A landscaped garden bench beneath flowering branches, with a colorful cushion, layered foliage and a tiled or stone path around the close portrait. |
| terracotta | false | A terracotta-toned modern courtyard with crisp geometry, cobalt or teal accents, leafy plants and rich natural color without an orange filter. |
| sculpture-plaza | false | A contemporary sculpture plaza with a bold colorful sculpture, clean paving, planted edges and close architectural layers rather than a wide empty plaza. |

### 17.4 Classic — all 24 concrete pose cues, verbatim

| ID | Exact cue |
| --- | --- |
| stride | Catch one clear walking step toward camera: front foot advancing, rear heel lifted, hips angled and one arm swinging naturally. |
| walk-away-turn | Catch the subject taking a step away from camera with the back and one shoulder visible, then turning the head for a clear over-shoulder glance. |
| seated-diagonal | Sit diagonally on a real chair or bench, one forearm resting on its arm or table and torso turned toward camera; do not use a bed-edge pose. |
| seated-side | Sit sideways with both knees angled in one direction, shoulders turned back toward camera and hands resting separately on lap and chair. |
| rail-side | Stand beside an actual railing or counter, rest one forearm lightly on it, shift weight to the outside leg and turn the torso three-quarters toward camera. |
| shoulder-lean | Lean one shoulder against a real textured wall or column, keep the other shoulder forward and let both arms hang relaxed at different heights. |
| step-up | Catch the subject stepping onto a low real step, one knee bent and the other leg grounded; glance sideways instead of standing square to camera. |
| hair-tuck | Show one hand tucking hair behind one ear while the opposite arm stays relaxed; turn the face slightly toward camera and keep all fingers natural. |
| hands-behind | Place both hands loosely behind the lower back, draw one shoulder slightly forward and angle the hips away from camera for an open silhouette. |
| hand-on-hip | Rest only one hand on the hip with elbow out; keep the other hand down holding a small real prop or touching a nearby surface. |
| ankle-cross | Stand with ankles crossed, weight on the rear leg, one hand lightly holding a bag or sleeve and shoulders turned at a different angle from the hips. |
| side-profile | Turn the body almost side-on, keep the face in a clear three-quarter profile, one shoulder nearer the lens and gaze just past the camera. |
| mid-pivot | Catch a small mid-pivot: feet planted at different angles, torso rotating toward camera and loose fabric shifting naturally from the turn. |
| hair-lift | Lift one arm to adjust hair above the head while the other hand rests at the waist; keep the raised elbow visible and shoulders relaxed. |
| arms-folded | Fold arms loosely at mid-torso with one hand visible on the opposite sleeve; keep shoulders soft and body turned slightly off-center. |
| candid-laugh | Catch a genuine laugh with head turned slightly aside, shoulders lifted naturally and one hand briefly covering or brushing near the smile. |
| look-down-step | Pause during a small step while looking down toward the path, one hand holding the outfit edge or bag strap and the other arm loose. |
| seat-forward | Sit near the front of a real chair with torso leaning slightly forward, elbows separated and hands naturally occupied with a cup or phone. |
| rail-back | If a real chair or ledge is present, lean back on one hand with chest open and knees angled; otherwise use a relaxed shoulder lean on a real support. |
| doorway-frame | Stand partly inside a real doorway, one hand touching the doorframe above shoulder height, one foot forward and torso angled into the room. |
| seated-lookback | While seated, turn the torso and head back toward camera over one shoulder; keep hips facing away and hands resting on the seat for support. |
| open-palms | Show a small conversational gesture with one palm turned upward near the waist and the other hand relaxed; shoulders and gaze face slightly off-camera. |
| collarbone-hand | Rest fingertips lightly near the collarbone without covering the neckline, keep the second arm down and angle one shoulder toward camera. |
| turn-and-pause | Pause halfway through a gentle turn with shoulders at different depths, one foot pivoted and face glancing back toward the lens. |

### 17.5 Classic — six stored gaze choices

These texts exist in the source deck; the current shot formatter does not emit them as a separate gaze instruction.

| ID | Exact text |
| --- | --- |
| direct | A confident direct connection with the camera. |
| soft-smile | A small easy smile and relaxed eyes. |
| off-camera | An engaged off-camera expression. |
| laugh | A lively spontaneous expression. |
| calm | A calm self-assured expression. |
| side-glance | A playful sideways expression. |

### 17.6 Exact storage-key declarations

Local storage stores data for this installed extension, not an account-synced cloud library.

```javascript
const STORAGE = {
  upscale:"bb_upscale_enabled",
  subjects:"bb_subject_references", outfit:"bb_outfit_reference", location:"bb_location_reference",
  prompt:"bb_short_prompt", physical:"bb_physical_details", engine:"bb_prompt_engine", model:"bb_image_model", aspect:"bb_aspect_ratio", count:"bb_image_count",
  mode:"bb_creation_mode", sfSubjects:"bb_sf_subjects", sfOutfits:"bb_sf_outfits", sfKnowledge:"bb_sf_knowledge", sfQuality:"bb_sf_quality",
  sfSystem:"bb_sf_system_prompt", sfTarget:"bb_sf_target_prompt", sfFigure:"bb_sf_figure_details",
  sfPresets:"bb_sf_prompt_presets",
  generationMode:"bb_generation_mode",
  storyGenerationMode:"bb_story_generation_mode",
  tgEnabled:"bb_tg_enabled", tgBotToken:"bb_tg_bot_token", tgChatId:"bb_tg_chat_id", tgSendAsDoc:"bb_tg_send_as_doc",
  storyBrief:"bb_story_brief", storyCharacters:"bb_story_characters", storyOutput:"bb_last_story_output",
  storyBgStyle: "bb_story_bg_style", storyStyleReference:"bb_story_style_reference", storyStyleReferences:"bb_story_style_references", storyInputMode:"bb_story_input_mode", storyTextOverlays:"bb_story_text_overlays", storyLetteringDefaultMigrated:"bb_story_lettering_default_migrated", tuneHeight: "bb_tune_height", tuneWeight: "bb_tune_weight", tuneBust: "bb_tune_bust", tuneWaist: "bb_tune_waist", tuneHips: "bb_tune_hips", tuneNavel: "bb_tune_navel"
};
const LEGACY_STORAGE = {
  subjects:"ig_subject_references", outfit:"ig_outfit_reference", location:"ig_location_reference",
  prompt:"ig_short_prompt", physical:"ig_physical_details", engine:"ig_prompt_engine", model:"ig_image_model", aspect:"ig_aspect_ratio", count:"ig_image_count",
  mode:"ig_creation_mode", sfSubjects:"ig_sf_subjects", sfOutfits:"ig_sf_outfits", sfKnowledge:"ig_sf_knowledge", sfQuality:"ig_sf_quality",
  sfSystem:"ig_sf_system_prompt", sfTarget:"ig_sf_target_prompt",
  storyBrief:"ig_story_brief", storyCharacters:"ig_story_characters", storyOutput:"ig_last_story_output"
};
```

### 17.7 Complete desktop HTML — labels, hierarchy, inline styles and accessibility attributes

Source: [popup.html](<D:/pfGG/popup.html>)

<details>
<summary>Expand exact popup.html source</summary>

````html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Guc guy</title>
    <link rel="stylesheet" href="popup.css">
  </head>
  <body>
    <main class="app-shell">
      <header class="topbar">
        <img class="brand-logo" src="icon128.png" alt="Guc guy logo">
        <div class="brand-copy"><h1>Guc<span> guy</span></h1><p>Identity-first AI image studio</p></div>
      <span class="version">v4.6.22</span>
      </header>

      <section id="flowCard" class="flow-card checking" aria-live="polite">
        <span class="flow-orbit"><i id="flowDot"></i></span>
        <div class="flow-copy"><strong id="flowTitle">Guc guy account</strong><p id="flowStatus">Checking your Google sign-in…</p><small id="flowHint">No Flow project tab is required</small></div>
        <div class="flow-actions"><button id="connectFlowAccount" class="account-button primary" type="button">Sign up / Log in with Google</button></div>
      </section>

      <details class="mobile-remote">
        <summary>📱 Phone remote <small>same Wi‑Fi · local only</small></summary>
        <p id="remoteHint">Run start-mobile-remote.bat once from the Guc guy folder, then create a QR. Keep the QR private; it grants control on this trusted Wi‑Fi.</p>
        <button id="pairPhone" type="button">Create phone QR</button>
        <div id="remotePairResult" hidden>
          <img id="phoneQr" alt="QR code for pairing a phone with Guc guy">
          <small id="phoneAddress"></small>
        </div>
      </details>

      <nav class="mode-switch" aria-label="Creation mode">
        <button id="modeClassic" class="mode-option active" type="button" data-mode="classic"><b>Guc guy Classic</b><small>Natural phone portraits</small></button>
        <button id="modeSubjectFlow" class="mode-option" type="button" data-mode="subject-flow"><b>✦ Subject Flow</b><small>Gem-style custom workflow</small></button>
        <button id="modeStory" class="mode-option" type="button" data-mode="story"><b>▣ Story Studio</b><small>Gemini story + film keyframes</small></button>
        <button id="modeQid" class="mode-option" type="button" data-mode="qid"><b>▶ Qid</b><small>Video prompt studio</small></button>
      </nav>

      <section id="qidStudio" class="section-block workflow-panel qid-studio" hidden>
        <div class="section-title"><span>Qid · Video Studio</span><small>Build a Flow-ready video prompt</small></div>
        <p class="story-tools-note">Add your own subject, outfit and optional starting-frame images. They are uploaded to the new Flow project and attached after their IDs are checked.</p>
        <label for="qidPrompt">Video scene / action</label>
        <textarea id="qidPrompt" maxlength="1800" rows="4" placeholder="Describe the scene and action you want…"></textarea>
        <div class="qid-grid">
          <label class="character-field">Video model<select id="qidModel"><option value="omni-1-2">Omni 1.2</option><option value="omni-flash">Gemini Omni Flash</option><option value="veo-31-fast">Veo 3.1 Fast</option><option value="veo-31-quality">Veo 3.1 Quality</option><option value="flow-auto">Use Flow's current video model</option></select></label>
          <label class="character-field">Frame<select id="qidAspect"><option value="VIDEO_ASPECT_RATIO_PORTRAIT">9:16 · portrait</option><option value="VIDEO_ASPECT_RATIO_LANDSCAPE">16:9 · landscape</option></select></label>
          <label class="character-field">Face<select id="qidFace"><option value="hidden">Keep face hidden</option><option value="visible">Face visible</option></select></label>
          <label class="character-field">Motion<select id="qidMotion"><option value="mirror">Mirror outfit showcase</option><option value="turn">Slow turn and side profile</option><option value="hair">Hair adjustment and gentle pose</option><option value="window">Window / balcony pose</option><option value="seated">Seated pose with subtle movement</option><option value="entrance">Doorway entrance and camera turn</option><option value="custom">Use scene description only</option></select></label>
        </div>
        <div class="qid-grid qid-refs">
          <div class="character-field qid-ref-field"><span class="qid-ref-title">Subject reference <small>Optional · image</small></span><button id="qidSubjectDrop" class="qid-image-drop" type="button" aria-label="Drop or choose subject image"><span class="qid-drop-copy"><b>Drop image</b><small>or click to choose</small></span><img hidden alt="Subject reference preview"></button><input id="qidSubject" type="file" accept="image/*" hidden><button id="qidSubjectClear" class="qid-clear" type="button" hidden>Remove image</button></div>
          <div class="character-field qid-ref-field"><span class="qid-ref-title">Outfit reference <small>Optional · image</small></span><button id="qidOutfitDrop" class="qid-image-drop" type="button" aria-label="Drop or choose outfit image"><span class="qid-drop-copy"><b>Drop image</b><small>or click to choose</small></span><img hidden alt="Outfit reference preview"></button><input id="qidOutfit" type="file" accept="image/*" hidden><button id="qidOutfitClear" class="qid-clear" type="button" hidden>Remove image</button></div>
          <div class="character-field qid-ref-field"><span class="qid-ref-title">Starting frame <small>Optional · image</small></span><button id="qidStartFrameDrop" class="qid-image-drop" type="button" aria-label="Drop or choose starting frame image"><span class="qid-drop-copy"><b>Drop image</b><small>or click to choose</small></span><img hidden alt="Starting frame preview"></button><input id="qidStartFrame" type="file" accept="image/*" hidden><button id="qidStartFrameClear" class="qid-clear" type="button" hidden>Remove image</button></div>
        </div>
        <label class="qid-check"><input id="qidDesiStyle" type="checkbox" checked> Desi-inspired styling (adapted to the outfit reference, if supplied)</label>
        <div class="qid-actions"><button id="qidBuildPrompt" class="account-button" type="button">Build prompt</button><button id="qidGenerate" class="account-button primary" type="button">Generate video</button></div>
        <p id="qidStatus" class="story-tools-note" aria-live="polite">Qid uses the selected subject and outfit as Flow references. The chosen model must be available on your Flow account.</p>
        <textarea id="qidOutputPrompt" rows="7" readonly aria-label="Generated Qid video prompt" placeholder="Your prepared prompt will appear here…"></textarea>
      </section>

      <section id="classicReferences" class="section-block workflow-panel">
        <div class="section-title"><span>References</span><small>Keep the same person across every image</small></div>

        <article class="reference-card subject-card">
          <div class="reference-heading"><span class="step">01</span><div><strong>Subject / Identity</strong><small>Multiple images allowed</small></div><span id="subjectCount" class="count-pill">0</span></div>
          <label id="subjectDropZone" class="drop-zone wide" for="subjectFiles">
            <input id="subjectFiles" type="file" accept="image/*" multiple>
            <span class="upload-icon">+</span><span><b>Add subject photos</b><small>Use face angles plus one clear full-body photo</small></span>
          </label>
          <div id="subjectGallery" class="reference-gallery"></div>
        </article>

        <div class="reference-row">
          <article class="reference-card">
            <div class="reference-heading"><span class="step">02</span><div><strong>Outfit</strong><small>Clothing only</small></div></div>
            <label id="outfitDropZone" class="drop-zone" for="outfitFile">
              <input id="outfitFile" type="file" accept="image/*">
              <img id="outfitPreview" class="reference-preview" alt="Outfit reference" hidden>
              <span class="upload-copy"><b>Add outfit</b><small>Required</small></span>
            </label>
            <button id="removeOutfit" class="remove-button" type="button" hidden>Remove outfit</button>
          </article>

          <article class="reference-card optional-card">
            <div class="reference-heading"><span class="step">03</span><div><strong>Location</strong><small>Optional</small></div></div>
            <label id="locationDropZone" class="drop-zone" for="locationFile">
              <input id="locationFile" type="file" accept="image/*">
              <img id="locationPreview" class="reference-preview" alt="Location reference" hidden>
              <span class="upload-copy"><b>Add location</b><small>Optional · simple real places</small></span>
            </label>
            <button id="removeLocation" class="remove-button" type="button" hidden>Remove location</button>
          </article>
        </div>
      </section>

      <section id="classicPrompts" class="section-block prompt-section workflow-panel">
        <label for="shortPrompt">Your scene</label>
        <input id="shortPrompt" type="text" maxlength="300" autocomplete="off" placeholder="e.g. A casual photo by a plain wall, in a lift or a garden">

        <details class="physical-details">
          <summary><span>Physical details / Figure lock</span><small>Optional · strictly followed</small></summary>
          <div class="physical-details-body">
            <label for="physicalDetails">Describe only stable physical traits</label>
            <textarea id="physicalDetails" maxlength="1200" rows="4" placeholder="e.g. 5'6, thick hourglass, full thighs, soft abdomen; your chest, waist and hip measurements…"></textarea>
            <p>Your figure controls the body, even when the outfit model is slim. Clothes adapt to your figure. Body Tuning wins if the same trait conflicts with these notes; unspecified build traits use Classic's thick hourglass default without invented measurements.</p>
          </div>
        </details>

        <div class="engine-switch" role="group" aria-label="Prompt engine">
          <button id="engineGemini" class="engine-option active" type="button" data-engine="gemini"><b>✦ Gemini Auto</b><small>Creates unique prompt variations</small></button>
          <button id="engineDirect" class="engine-option" type="button" data-engine="direct"><b>Direct Prompt</b><small>Uses your exact prompt</small></button>
        </div>
      </section>

      <section id="subjectFlowReferences" class="section-block workflow-panel" hidden>
        <div class="subject-flow-hero">
          <span>SUBJECT FLOW</span>
          <strong>Build your own visual Gemini Gem</strong>
          <p>Identity, wardrobe, environment and aesthetic references stay in their own lanes.</p>
        </div>

        <article class="reference-card subject-card">
          <div class="reference-heading"><span class="step">01</span><div><strong>Subject Identity</strong><small>Face angles + one full-body photo work best</small></div><span id="sfSubjectCount" class="count-pill">0</span></div>
          <label id="sfSubjectDropZone" class="drop-zone wide" for="sfSubjectFiles">
            <input id="sfSubjectFiles" type="file" accept="image/*" multiple>
            <span class="upload-icon">+</span><span><b>📸 Subject References</b><small>Drag & Drop or click to upload</small></span>
          </label>
          <div id="sfSubjectGallery" class="file-gallery"></div>
        </article>

        <article class="reference-card flow-reference-group">
          <div class="reference-heading"><span class="step">02</span><div><strong>Outfit Images</strong><small>Exact clothing, fabric and accessories</small></div><span id="sfOutfitCount" class="count-pill">0</span></div>
          <label id="sfOutfitDropZone" class="drop-zone wide" for="sfOutfitFiles">
            <input id="sfOutfitFiles" type="file" accept="image/*" multiple>
            <span class="upload-icon">+</span><span><b>Add outfit images</b><small>Drag & Drop or click to upload outfits</small></span>
          </label>
          <div id="sfOutfitGallery" class="file-gallery"></div>
        </article>

        <article class="reference-card flow-reference-group">
          <div class="reference-heading"><span class="step">03</span><div><strong>Knowledge / Environment Images</strong><small>Locations, objects and visual context</small></div><span id="sfKnowledgeCount" class="count-pill">0</span></div>
          <label id="sfKnowledgeDropZone" class="drop-zone wide" for="sfKnowledgeFiles">
            <input id="sfKnowledgeFiles" type="file" accept="image/*" multiple>
            <span class="upload-icon">+</span><span><b>Add knowledge images</b><small>Teach the workflow what the scene should contain</small></span>
          </label>
          <div id="sfKnowledgeGallery" class="file-gallery"></div>
        </article>

        <article class="reference-card flow-reference-group optional-card">
          <div class="reference-heading"><span class="step">04</span><div><strong>Quality / Aesthetic Images</strong><small>Optional · style and finish only</small></div><span id="sfQualityCount" class="count-pill">0</span></div>
          <label id="sfQualityDropZone" class="drop-zone wide" for="sfQualityFiles">
            <input id="sfQualityFiles" type="file" accept="image/*" multiple>
            <span class="upload-icon">+</span><span><b>Add quality references</b><small>Lighting, texture, camera feel and color treatment</small></span>
          </label>
          <div id="sfQualityGallery" class="file-gallery"></div>
        </article>
      </section>

      <section id="subjectFlowPrompts" class="section-block subject-flow-prompts workflow-panel" hidden>
        <div class="section-title"><span>✍️ Prompts</span><small>Saved automatically</small></div>
        <label for="sfSystemPrompt">System Instruction <em>Base Prompt</em></label>
        <textarea id="sfSystemPrompt" maxlength="5000" rows="6" placeholder="Define the permanent rules, identity behavior, composition standards, camera style and anything every image must follow."></textarea>
        <label for="sfFigureDetails">Figure details <em>Optional — overrides conflicting body references</em></label>
        <textarea id="sfFigureDetails" maxlength="1200" rows="3" placeholder="Your exact physique, proportions and height. Leave blank to use details already written in your base/target prompt."></textarea>
        <label for="sfTargetPrompt">Target Image Prompt <em>Gemini creates variations of this</em></label>
        <textarea id="sfTargetPrompt" maxlength="2500" rows="4" placeholder="Describe the image or scene you want to create right now."></textarea>
        <div class="sf-preset-tools" aria-label="Subject Flow prompt presets">
          <div class="sf-preset-save"><input id="sfPresetName" type="text" maxlength="48" placeholder="Preset name"><button id="saveSfPreset" type="button">Save preset</button></div>
          <div class="sf-preset-load"><select id="sfPresetSelect" aria-label="Saved Subject Flow presets"><option value="">No saved presets</option></select><button id="loadSfPreset" type="button" disabled>Load</button><button id="deleteSfPreset" type="button" disabled>Delete</button></div>
          <div class="sf-preset-files"><button id="exportSfPreset" type="button" disabled>Export selected</button><button id="uploadSfPreset" type="button">Upload preset</button><input id="sfPresetFile" type="file" accept="application/json,.json" hidden></div>
          <small>Full setup: prompts, figure, image settings and all four reference groups. Upload/export presets as JSON files.</small>
        </div>
        <div class="gem-note"><b>Gem-style behavior</b><span>The base instruction governs every result; uploaded references provide visual knowledge without mixing identities, outfits or environments.</span></div>
        <div class="engine-switch" role="group" aria-label="Subject Flow prompt engine">
          <button id="sfEngineGemini" class="engine-option active" type="button" data-engine="gemini"><b>✦ Gemini Auto</b><small>Creates faithful prompt variations</small></button>
          <button id="sfEngineDirect" class="engine-option" type="button" data-engine="direct"><b>No Gemini · Direct</b><small>Uses your target prompt exactly</small></button>
        </div>
      </section>

      <section id="storyStudio" class="section-block workflow-panel story-studio" hidden>
        <section class="story-library" aria-label="Character library">
          <div class="story-tools-head"><div><small>CHARACTER LIBRARY</small><strong>Your cast. One consistent design.</strong></div><button id="newLibraryCharacter" type="button">+ New</button></div>
          <div class="story-library-filters"><select id="storyLibrarySeries" aria-label="Character collection"><option value="current">Choose a cast collection…</option><option value="shadow">Shadow Slave · load full cast</option><option value="custom">My saved characters</option></select><input id="storyLibrarySearch" type="search" placeholder="Search name or alias…" aria-label="Search characters"></div>
          <div id="storyLibraryList" class="story-library-list"></div>
          <p id="storyLibraryNotice" class="story-tools-note" aria-live="polite">Select Shadow Slave to add the full cast automatically. Your current cast is saved separately before switching. Alternate looks remain selectable.</p>
        </section>
        <div class="story-hero">
          <span>STORY STUDIO · CINEMATIC KEYFRAMES</span>
          <strong>Build a story, shot by shot.</strong>
          <p>Plan a connected short film with consistent cast, wardrobe, locations and 16:9 cinematic stills ready for image-to-video.</p>
        </div>

        <div class="story-source-switch" role="tablist" aria-label="Story source">
          <button id="storySourceBrief" class="active" type="button" role="tab" aria-selected="true">Story brief</button>
          <button id="storySourceNovel" type="button" role="tab" aria-selected="false">Novel chapter</button>
        </div>
        <label class="story-field" for="storyBrief"><span id="storySourceLabel">Story / scene feed</span><small id="storySourceMeta">Use @ to tag characters</small></label>
        <div class="story-composer"><textarea id="storyBrief" maxlength="30000" rows="8" placeholder="e.g. @Ayesha reaches the old station at dusk. @Ravi is waiting with a letter that changes everything…"></textarea><div id="storyMentionMenu" class="mention-menu" role="listbox" hidden></div></div>
        <p id="storySourceHint" class="story-hint">Gemini expands your brief into an ordered cinematic chapter and storyboard.</p>

        <section class="story-chapter-queue" aria-label="Extra chapter queue">
          <div class="story-tools-head"><div><strong>Chapter queue</strong><small>Current chapter + up to 3 extra · one PDF</small></div><button id="addQueuedChapter" type="button">+ Chapter</button></div>
          <div id="storyQueueDrafts"></div>
          <button id="appendQueuedChapters" type="button" hidden>Add drafts to running story</button>
          <p class="story-tools-note">Chapters run in order. Parallel mode allows up to 2 Flow requests in flight with rate-limited starts. Progress is saved after each panel.</p>
        </section>

        <div class="story-section-head">
          <div><strong>Characters</strong><small>Add as many as your story needs · up to four cast members per panel for reference accuracy · physique notes optional</small></div>
          <button id="addStoryCharacter" type="button">+ Add character</button>
        </div>
        <div id="storyCharacters" class="story-character-list"></div>

        <div class="story-options">
          <label class="story-bg-label"><span>Cinematic tone</span><select id="storyBgStyle"><option value="crime-noir" selected>Brooding crime drama</option><option value="photorealistic">Natural photorealism</option><option value="grounded-thriller">Grounded thriller</option><option value="warm-drama">Warm character drama</option><option value="webtoon">Webtoon illustration</option></select></label>
          <div><strong>Film pacing</strong><small>Establishing shot → action → reaction → payoff</small></div>
          <label class="story-text-toggle"><input id="storyTextOverlays" type="checkbox"><span><strong>Consistent narration &amp; speech bubbles</strong><small>Same webtoon look across every chapter. Text sits in clear areas of the panel; extra space is used only when needed.</small></span></label>
        </div>
        <div id="storyStyleReferenceSection" class="story-style-reference" hidden>
          <div class="story-style-reference-copy"><strong>Webtoon art references · up to 4</strong><small>Your supplied illustrated examples guide Webtoon by default. Add your own samples to choose another look. References guide ink, shading and atmosphere; scenes and cast follow your chapter.</small></div>
          <label class="story-style-upload"><input id="storyStyleReferenceInput" type="file" accept="image/*" multiple><span>＋ Add style references</span></label>
          <div id="storyStyleReferenceGallery" class="story-style-reference-gallery"></div>
        </div>
        <div class="gem-note"><b>Story → shot list → keyframes</b><span>Character identity, height, physique and wardrobe stay locked across each ordered landscape image.</span></div>
        <article id="storyChapterOutput" class="story-chapter-output" hidden>
          <div class="story-chapter-head"><div><small>GENERATED CHAPTER</small><strong id="storyChapterTitle">Untitled chapter</strong></div><button id="copyStoryChapter" type="button">Copy chapter</button></div>
          <div id="storyChapterText" class="story-chapter-text"></div>
          <details class="story-shot-list"><summary>Storyboard shot list <span id="storyShotCount">0 shots</span></summary><div id="storyShots"></div></details>
        </article>
      </section>

      
            <section id="bodyTuningSection" class="section-block body-tuning-section">
        <div class="section-title"><span>Body Tuning (Highest Priority)</span></div>
        <div class="settings-grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
          <label><span>Height</span><input type="text" id="tuneHeight" placeholder="e.g. 5'5 or Short"></label>
          <label><span>Weight</span><input type="text" id="tuneWeight" placeholder="e.g. 85kg or Heavy"></label>
          <label><span>Bust / Chest</span><input type="text" id="tuneBust" placeholder="e.g. 56-inch or Huge"></label>
          <label><span>Waist</span><input type="text" id="tuneWaist" placeholder="e.g. Soft, 36-inch, Narrow"></label>
          <label><span>Hips & Thighs</span><input type="text" id="tuneHips" placeholder="e.g. 56-inch, Wide"></label>
          <label><span>Belly / Navel</span><input type="text" id="tuneNavel" placeholder="e.g. Chubby, exposed navel"></label>
        </div>
      </section>

<section id="generationSettings" class="section-block settings-section">

        <div class="section-title"><span>Generation</span><div class="quality-badges"><small id="qualityBadge" class="phone-badge">◉ High-detail phone look</small><small id="generationModeBadge" class="parallel-badge">⚡ Parallel</small></div></div>
        <div class="settings-grid">
          <label><span>Image model</span><select id="imageModel"><option value="GEM_PIX_2">Nano Banana Pro</option><option value="NARWHAL">Nano Banana 2.1</option><option value="HARBOR_SEAL">Nano Banana 2 Lite</option></select></label>
          <label><span>Aspect ratio</span><select id="aspectRatio"><option value="IMAGE_ASPECT_RATIO_PORTRAIT">9:16 Portrait</option><option value="IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR" selected>3:4 Portrait</option><option value="IMAGE_ASPECT_RATIO_SQUARE">1:1 Square</option><option value="IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE">4:3 Landscape</option><option value="IMAGE_ASPECT_RATIO_LANDSCAPE">16:9 Landscape</option></select></label>
          <label id="imageCountSetting" class="count-setting"><span>Images at once</span><input id="imageCount" type="number" min="1" max="20" value="5"></label>
          <label><span>Batch mode</span><select id="generationMode"><option value="parallel">Parallel · up to 2 in flight</option><option value="sequential">Sequential · one at a time</option></select></label>
          <label><span>Upscale preference</span><select id="upscaleEnabled"><option value="on">2K when available</option><option value="off">Original image</option></select><small>Flow currently saves the returned image resolution; an extra 2K upscale pass is unavailable.</small></label>
          <div class="delivery-settings" style="grid-column: 1 / -1; background: rgba(0, 136, 204, 0.06); border: 1px solid rgba(0, 136, 204, 0.25); border-radius: 8px; padding: 10px 12px; margin-top: 4px; display: flex; flex-direction: column; gap: 8px;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin: 0;">
              <span style="display: flex; flex-direction: column; gap: 2px;">
                <strong style="font-size: 13px; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
                  <span>✈️ Send to Telegram Bot</span>
                </strong>
                <small style="color: #94a3b8; font-size: 11px;">Send completed images directly to your chosen Telegram ID</small>
              </span>
              <input id="tgEnabled" type="checkbox" style="width: 18px; height: 18px; cursor: pointer; accent-color: #0088cc;">
            </label>

            <div id="tgConfigFields" style="display: none; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);">
              <label style="display: flex; flex-direction: column; gap: 4px;">
                <span style="font-size: 11px; color: #cbd5e1;">Bot Token <small style="color: #64748b;">(from @BotFather)</small></span>
                <input id="tgBotToken" type="password" placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..." style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 8px; color: #f8fafc; font-size: 12px; font-family: monospace;">
              </label>

              <label style="display: flex; flex-direction: column; gap: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <span style="font-size: 11px; color: #cbd5e1;">Target Chat Link or ID</span>
                  <a id="tgAutoDetectBtn" href="#" style="font-size: 10px; color: #38bdf8; text-decoration: none; cursor: pointer;">⚡ Auto-detect my chat</a>
                </div>
                <input id="tgChatId" type="text" placeholder="e.g. https://t.me/username, @channel, or 123456789" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 6px 8px; color: #f8fafc; font-size: 12px; font-family: monospace;">
                <small style="color: #64748b; font-size: 10px;">Paste your profile link (t.me/name), channel link, @username, or numeric ID.</small>
              </label>

              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 11px; color: #94a3b8; margin: 0;">
                  <input id="tgSendAsDoc" type="checkbox" style="width: 14px; height: 14px; accent-color: #0088cc;">
                  <span>Send uncompressed (Document)</span>
                </label>
                <button id="tgTestBtn" type="button" style="background: #0088cc; color: white; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; font-weight: 500; cursor: pointer;">Test Bot</button>
              </div>
              <div id="tgStatusText" style="font-size: 11px; color: #94a3b8; display: none;"></div>
            </div>
          </div>
        </div>
      </section>

      <button id="generate" class="generate-button" type="button"><span>Generate images</span><i>→</i></button>

      <section class="progress-section" aria-live="polite">
        <div class="progress-head"><strong id="queueSummary">Ready to create</strong><span id="queueCounts">0 / 5</span></div>
        <div class="progress-track"><div id="progressFill" class="progress-fill"></div></div>
        <section id="storyDelivery" class="story-delivery" hidden aria-live="polite">
          <div class="story-tools-head"><div><small>STORY COLLECTION</small><strong id="storyDeliveryTitle">Saved chapter progress</strong></div></div>
          <div class="story-run-controls" role="group" aria-label="Story generation controls">
            <button id="resumeStory" type="button" title="Continue saved chapters; keep completed panels">Resume</button>
            <button id="stopStory" type="button" title="Stop new requests and save progress">Stop</button>
            <button id="startOverStory" type="button" title="Generate these saved chapters again from the beginning">Start over</button>
          </div>
          <p id="storyRunHint" class="story-tools-note">Resume keeps completed panels. Start over replans all saved chapters using the same characters and settings.</p>
          <div id="storyChapterProgress"></div>
          <p id="storyDeliveryStatus" class="story-tools-note"></p>
          <div class="story-delivery-actions"><button id="retryUnknownStory" type="button" hidden>Retry unconfirmed panels</button><button id="saveStoryPdf" type="button" hidden>↓ Save complete PDF</button><button id="sendStoryPdf" type="button" hidden>Send PDF to Telegram</button><button id="discardStory" type="button">Clear saved queue</button></div>
          <p class="story-tools-note">PDF saves only when you click Save. Telegram uses your bot settings. Pages break between complete panels; artwork and text stay together.</p>
        </section>
        <div id="queueList" class="queue-grid"></div>
        <button id="stop" class="stop-button" type="button" disabled>Stop generation</button>
        <section class="log-panel">
          <div class="log-head"><span><i></i> Live activity logs</span><div class="log-actions"><button id="copyDiagnostics" type="button">Copy diagnostics</button><button id="clearLogs" type="button">Clear</button></div></div>
          <div id="terminal" class="terminal" role="log" aria-live="polite"><span class="log-empty">Waiting for generation activity…</span></div>
        </section>
      </section>
    </main>

    <div id="imagePreview" class="preview-overlay" hidden>
      <button id="closePreview" class="preview-close" type="button" aria-label="Close preview">×</button>
      <img id="previewImage" alt="Generated image preview"><p id="previewCaption"></p>
    </div>
    <script src="story-library.js"></script>
    <script src="story-tools-ui.js"></script>
    <script src="popup.js"></script>
  </body>
</html>

````

</details>

### 17.8 Complete desktop CSS — exact source order and all responsive overrides

Source: [popup.css](<D:/pfGG/popup.css>)

<details>
<summary>Expand exact popup.css source</summary>

````css
:root { color-scheme:dark; --bg:#07080a; --panel:#111318; --panel2:#171a20; --line:#292e37; --line-bright:#3a414d; --text:#f7f8fa; --muted:#929aa8; --accent:#facc15; --accent-2:#63e6a5; --accent-ink:#111500; --danger:#ff6b78; --success:#63e6a5; }
* { box-sizing:border-box; }
html,body { margin:0; min-width:320px; min-height:100%; }
body { background:radial-gradient(circle at 92% -4%,rgba(250,204,21,.12),transparent 25%),radial-gradient(circle at -10% 32%,rgba(99,230,165,.055),transparent 30%),var(--bg); color:var(--text); font:13px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
button,input,select,textarea { font:inherit; } button { cursor:pointer; }
.app-shell { width:100%; max-width:540px; min-height:100vh; margin:0 auto; padding:16px 15px 30px; }
.topbar { display:flex; align-items:center; gap:11px; margin-bottom:12px; padding:10px 11px; border:1px solid rgba(255,255,255,.055); border-radius:15px; background:linear-gradient(125deg,rgba(21,24,29,.94),rgba(11,13,16,.78)); box-shadow:0 12px 30px rgba(0,0,0,.18); }
.brand-logo { width:46px; height:46px; border-radius:50%; filter:drop-shadow(0 0 14px rgba(250,204,21,.2)); }
.brand-copy { min-width:0; } .brand-copy h1 { margin:0; font-size:20px; letter-spacing:-.65px; } .brand-copy h1 span { color:var(--accent); }
.brand-copy p { margin:1px 0 0; color:var(--muted); font-size:10px; }
.version { margin-left:auto; padding:4px 8px; border:1px solid rgba(250,204,21,.2); border-radius:999px; background:rgba(250,204,21,.045); color:#fef08a; font-size:8px; }

.flow-card { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:11px; margin-bottom:12px; padding:12px; border:1px solid var(--line); border-radius:14px; background:linear-gradient(135deg,rgba(20,23,28,.98),rgba(12,14,17,.98)); box-shadow:0 8px 24px rgba(0,0,0,.15); transition:border-color .25s,box-shadow .25s,background .25s; }
.flow-card.connected { border-color:rgba(99,230,165,.42); box-shadow:inset 0 0 24px rgba(99,230,165,.035); }
.flow-card.error { border-color:rgba(255,107,120,.34); }
.mobile-remote { margin:-2px 0 12px; padding:9px 11px; border:1px solid var(--line); border-radius:11px; background:#0d0f13; }
.mobile-remote summary { cursor:pointer; color:#dfe3ea; font-size:10px; font-weight:800; }
.mobile-remote summary small { margin-left:5px; color:var(--muted); font-size:8px; font-weight:600; }
.mobile-remote p { margin:8px 0; color:var(--muted); font-size:9px; }
.mobile-remote button { min-height:30px; padding:5px 9px; border:1px solid var(--line-bright); border-radius:7px; background:#171a20; color:var(--text); font-size:9px; font-weight:750; }
.mobile-remote button:hover { border-color:var(--accent); }
#remotePairResult { display:flex; align-items:center; gap:9px; margin-top:9px; }
#remotePairResult[hidden] { display:none; }
#remotePairResult img { width:106px; height:106px; border:5px solid white; border-radius:7px; background:white; }
#phoneAddress { overflow-wrap:anywhere; color:var(--muted); font:8px/1.4 ui-monospace,monospace; }
.flow-orbit { display:grid; place-items:center; width:29px; height:29px; border-radius:50%; background:rgba(146,152,165,.08); }
.flow-orbit i { width:9px; height:9px; border-radius:50%; background:#737985; box-shadow:0 0 0 5px rgba(115,121,133,.1); }
.connected .flow-orbit i { background:var(--success); box-shadow:0 0 0 5px rgba(99,230,165,.1),0 0 13px rgba(99,230,165,.6); }
.error .flow-orbit i { background:var(--danger); box-shadow:0 0 0 5px rgba(255,107,120,.1); }
.checking .flow-orbit { animation:pulse 1.3s ease infinite; } @keyframes pulse { 50% { opacity:.45; } }
.flow-copy { min-width:0; } .flow-card strong { display:block; font-size:11px; letter-spacing:-.1px; }
.flow-card p { margin:2px 0 0; color:#a9b0bb; font-size:8px; line-height:1.35; }
.flow-card small { display:block; margin-top:3px; color:#68717e; font-size:7px; line-height:1.3; }
.flow-actions { display:flex; flex-direction:column; gap:5px; }
.flow-card button { min-width:48px; padding:5px 8px; border:1px solid var(--line); border-radius:7px; background:var(--panel2); color:var(--text); font-size:8px; font-weight:750; }
.flow-card button { white-space:nowrap; }
.flow-card button.primary { border-color:rgba(250,204,21,.3); background:rgba(250,204,21,.09); color:var(--accent); }
.flow-card button.account-button { border-color:rgba(115,168,255,.34); background:rgba(115,168,255,.1); color:#a9c8ff; }
.flow-card button:disabled { cursor:wait; opacity:.5; }
.connected .flow-card button { color:var(--success); }

.mode-switch { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; padding:5px; border:1px solid var(--line); border-radius:13px; background:#0c0e12; }
.mode-option { display:flex; flex-direction:column; align-items:flex-start; gap:1px; min-width:0; padding:9px 10px; border:1px solid transparent; border-radius:9px; background:transparent; color:var(--muted); text-align:left; }
.mode-option b { color:#c9cdd4; font-size:9px; } .mode-option small { overflow:hidden; max-width:100%; font-size:7px; text-overflow:ellipsis; white-space:nowrap; }
.mode-option.active { border-color:rgba(250,204,21,.5); background:linear-gradient(120deg,rgba(250,204,21,.1),rgba(99,230,165,.04)); }
.mode-option.active b { color:var(--accent); }
.workflow-panel[hidden] { display:none; }
.qid-studio>label:not(.qid-check) { display:block; margin:10px 0 5px; color:#d9dee7; font-size:9px; font-weight:750; }
.qid-studio textarea,.qid-studio select,.qid-studio input[type=file] { width:100%; padding:9px; border:1px solid var(--line); border-radius:8px; outline:0; background:#090b0e; color:var(--text); font-size:9px; }
.qid-studio textarea { resize:vertical; line-height:1.5; }
.qid-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:10px; }
.qid-grid .character-field { display:flex; flex-direction:column; gap:5px; color:#d9dee7; font-size:9px; }
.qid-grid .character-field small { color:var(--muted); font-size:8px; }
.qid-ref-field { min-width:0; }
.qid-ref-title { display:flex; flex-direction:column; gap:2px; }
.qid-image-drop { display:grid; place-items:center; width:100%; min-height:82px; overflow:hidden; padding:7px; border:1px dashed #373c46; border-radius:9px; background:#0e1014; color:var(--muted); text-align:center; }
.qid-image-drop:hover,.qid-image-drop.dragover { border-color:var(--accent); background:#141810; }
.qid-image-drop .qid-drop-copy { display:flex; flex-direction:column; gap:3px; }
.qid-image-drop .qid-drop-copy b { color:#d9dee7; font-size:9px; }
.qid-image-drop img { display:block; width:100%; height:78px; object-fit:cover; border-radius:5px; }
.qid-image-drop img[hidden],.qid-image-drop .qid-drop-copy[hidden] { display:none; }
.qid-clear { align-self:flex-start; padding:2px 0; border:0; background:none; color:var(--muted); font-size:8px; }
.qid-clear:hover { color:var(--danger); }
.qid-check { display:flex; align-items:center; gap:7px; margin:11px 0; color:#d9dee7; font-size:9px; }
.qid-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:8px 0; }
.qid-actions button { min-height:38px; padding:8px; border:1px solid var(--line-bright); border-radius:9px; background:var(--panel2); color:var(--text); font-size:9px; font-weight:800; }
.qid-actions button.primary { border-color:rgba(250,204,21,.4); background:rgba(250,204,21,.1); color:var(--accent); }
.qid-actions button:disabled { cursor:wait; opacity:.55; }
.queue-card.video-result { display:flex; flex-direction:column; justify-content:flex-start; gap:5px; aspect-ratio:auto!important; min-height:160px; padding:7px; }
.queue-card.video-result video { display:block; width:100%; max-height:320px; aspect-ratio:9/16; object-fit:contain; border-radius:6px; background:#050607; }
.queue-card.video-result .queue-number,.queue-card.video-result .queue-status { position:static; }
.queue-card.video-result .queue-download { top:12px; right:12px; }
.qid-open-project { margin:2px 0 20px; padding:5px 8px; border:1px solid var(--line); border-radius:7px; background:#171a20; color:#dfe3ea; font-size:8px; }

.section-block { margin-top:12px; padding:14px; border:1px solid var(--line); border-radius:15px; background:linear-gradient(145deg,rgba(18,21,26,.92),rgba(13,15,19,.86)); box-shadow:0 10px 26px rgba(0,0,0,.11); }
.section-title { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:11px; }
.section-title>span { font-size:11px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
.section-title small { color:var(--muted); font-size:8px; }
.reference-card { min-width:0; } .subject-card { padding-bottom:12px; border-bottom:1px solid var(--line); }
.reference-row { display:grid; grid-template-columns:1fr 1fr; gap:10px; padding-top:12px; }
.reference-heading { display:flex; align-items:center; gap:7px; margin-bottom:7px; }
.reference-heading>div { display:flex; flex-direction:column; min-width:0; } .reference-heading strong { font-size:10px; } .reference-heading small { color:var(--muted); font-size:8px; }
.step { color:var(--accent); font:700 9px/1 ui-monospace,monospace; }
.count-pill { margin-left:auto; padding:2px 7px; border-radius:999px; background:rgba(250,204,21,.09); color:var(--accent); font-size:8px; font-weight:800; }
.drop-zone { position:relative; display:grid; place-items:center; height:115px; overflow:hidden; border:1px dashed #373c46; border-radius:11px; background:#0e1014; transition:border-color .18s,background .18s; }
.drop-zone.wide { display:flex; height:62px; padding:10px 13px; gap:10px; justify-content:flex-start; }
.drop-zone:hover,.drop-zone.dragover { border-color:var(--accent); background:#141810; box-shadow:inset 0 0 0 1px rgba(250,204,21,.06); }
.drop-zone.has-image { border-style:solid; border-color:var(--line); }
.drop-zone input[type="file"] { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.upload-icon { display:grid; place-items:center; flex:0 0 30px; height:30px; border-radius:9px; background:var(--panel2); color:var(--accent); font-size:20px; }
.drop-zone.wide>span:last-child,.upload-copy { display:flex; flex-direction:column; }
.drop-zone b { font-size:9px; } .drop-zone small { color:var(--muted); font-size:8px; }
.upload-copy { align-items:center; gap:3px; padding:10px; text-align:center; }
.upload-copy::before { content:"+"; display:grid; place-items:center; width:26px; height:26px; margin-bottom:2px; border-radius:8px; background:var(--panel2); color:var(--accent); font-size:18px; }
.reference-preview { width:100%; height:100%; object-fit:cover; } .drop-zone.has-image .upload-copy { display:none; }
.reference-gallery { display:grid; grid-template-columns:repeat(auto-fill,minmax(52px,1fr)); gap:6px; margin-top:7px; }
.subject-thumb { position:relative; aspect-ratio:1; overflow:hidden; border:1px solid var(--line); border-radius:8px; background:var(--panel2); }
.subject-thumb img { width:100%; height:100%; object-fit:cover; }
.subject-thumb button { position:absolute; right:3px; top:3px; display:grid; place-items:center; width:18px; height:18px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,.75); color:white; font-size:12px; }
.remove-button { display:block; width:100%; margin-top:5px; padding:0; border:0; background:none; color:var(--muted); font-size:8px; } .remove-button:hover { color:var(--danger); } .remove-button[hidden] { display:none; }

.subject-flow-hero { margin:-2px -2px 14px; padding:12px; border:1px solid rgba(250,204,21,.16); border-radius:11px; background:radial-gradient(circle at 100% 0,rgba(250,204,21,.1),transparent 45%),#0d1012; }
.subject-flow-hero span { color:var(--accent); font:800 7px/1 ui-monospace,monospace; letter-spacing:.14em; }
.subject-flow-hero strong { display:block; margin-top:5px; font-size:13px; letter-spacing:-.2px; }
.subject-flow-hero p { margin:3px 0 0; color:var(--muted); font-size:8px; }
.flow-reference-group { padding-top:12px; margin-top:12px; border-top:1px solid var(--line); }
.file-gallery { display:grid; gap:6px; margin-top:7px; }
.file-card { display:grid; grid-template-columns:34px minmax(0,1fr) 22px; align-items:center; gap:8px; min-width:0; padding:5px; border:1px solid var(--line); border-radius:8px; background:#0d0f13; }
.file-card img { width:34px; height:34px; border-radius:6px; object-fit:cover; }
.file-card span { overflow:hidden; color:#cdd2da; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }
.file-card button { display:grid; place-items:center; width:20px; height:20px; padding:0; border:0; border-radius:50%; background:rgba(255,107,120,.08); color:var(--muted); }
.file-card button:hover { color:var(--danger); background:rgba(255,107,120,.15); }

.subject-flow-prompts>label { display:flex; align-items:center; justify-content:space-between; gap:8px; margin:11px 1px 6px; color:#d7dae0; font-size:9px; font-weight:800; }
.subject-flow-prompts>label em { color:var(--muted); font-size:7px; font-style:normal; font-weight:600; }
.subject-flow-prompts textarea { width:100%; resize:vertical; padding:10px 11px; border:1px solid var(--line); border-radius:9px; outline:0; background:#090b0e; color:var(--text); font-size:9px; line-height:1.55; }
.subject-flow-prompts textarea:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(250,204,21,.06); }
.subject-flow-prompts textarea::placeholder { color:#555d69; }
.gem-note { display:flex; gap:9px; margin-top:9px; padding:9px; border:1px solid rgba(99,230,165,.15); border-radius:9px; background:rgba(99,230,165,.035); }
.gem-note b { flex:0 0 auto; color:var(--success); font-size:8px; } .gem-note span { color:var(--muted); font-size:7px; line-height:1.45; }
.sf-preset-tools { display:grid; gap:6px; margin-top:9px; }
.sf-preset-save,.sf-preset-load,.sf-preset-files { display:flex; gap:5px; min-width:0; }
.sf-preset-tools input,.sf-preset-tools select { min-width:0; flex:1; padding:6px 7px; border:1px solid var(--line); border-radius:7px; background:var(--panel2); color:var(--text); font-size:8px; }
.sf-preset-tools button { flex:0 0 auto; padding:6px 8px; border:1px solid rgba(115,168,255,.28); border-radius:7px; background:rgba(115,168,255,.07); color:#b9d0ff; font-size:8px; font-weight:750; }
.sf-preset-tools button:disabled { opacity:.4; cursor:not-allowed; }
.sf-preset-files button { flex:1; }
.sf-preset-tools small { color:var(--muted); font-size:7px; line-height:1.4; }

.story-hero { margin:-2px -2px 13px; padding:13px; border:1px solid rgba(115,168,255,.2); border-radius:11px; background:radial-gradient(circle at 100% 0,rgba(115,168,255,.13),transparent 46%),#0d1015; }
.story-hero span { color:#a9c8ff; font:800 7px/1 ui-monospace,monospace; letter-spacing:.14em; }
.story-hero strong { display:block; margin-top:5px; font-size:13px; letter-spacing:-.2px; }
.story-hero p { margin:4px 0 0; color:var(--muted); font-size:8px; }
.story-field { display:flex; justify-content:space-between; gap:8px; margin:0 1px 6px; color:#d7dae0; font-size:9px; font-weight:800; }
.story-field small { color:var(--muted); font-size:7px; font-weight:600; }
.story-composer { position:relative; }
#storyBrief { width:100%; resize:vertical; padding:10px 11px; border:1px solid var(--line); border-radius:9px; outline:0; background:#090b0e; color:var(--text); font-size:9px; line-height:1.55; }
#storyBrief:focus { border-color:#73a8ff; box-shadow:0 0 0 3px rgba(115,168,255,.07); }
.story-hint { margin:5px 1px 0; color:var(--muted); font-size:7px; line-height:1.4; }
.mention-menu { position:absolute; z-index:20; left:8px; bottom:8px; display:grid; min-width:125px; max-width:90%; max-height:130px; overflow:auto; padding:4px; border:1px solid rgba(115,168,255,.35); border-radius:8px; background:#141923; box-shadow:0 8px 24px #0009; }
.mention-menu[hidden] { display:none; }
.mention-menu button { padding:7px 9px; border:0; border-radius:5px; background:transparent; color:#dce8ff; text-align:left; font-size:9px; }
.mention-menu button:hover { background:rgba(115,168,255,.13); }
.story-section-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:14px 0 8px; }
.story-section-head>div { display:flex; flex-direction:column; } .story-section-head strong { font-size:10px; } .story-section-head small { color:var(--muted); font-size:7px; }
.story-section-head button { padding:6px 9px; border:1px solid rgba(115,168,255,.3); border-radius:7px; background:rgba(115,168,255,.08); color:#a9c8ff; font-size:8px; font-weight:800; }
.story-section-head button:disabled { opacity:.35; cursor:not-allowed; }
.story-character-list { display:grid; gap:9px; }
.story-character-card { padding:10px; border:1px solid var(--line); border-radius:11px; background:#0c0e12; }
.story-character-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.story-character-head strong { color:#a9c8ff; font-size:9px; }
.story-character-head button { padding:2px 0; border:0; background:none; color:var(--danger); font-size:7px; }
.story-character-head button:disabled { visibility:hidden; }
.character-fields { display:grid; grid-template-columns:1fr 110px; gap:7px; }
.character-field { display:flex; flex-direction:column; gap:4px; color:var(--muted); font-size:7px; font-weight:800; text-transform:uppercase; }
.character-field:last-child { grid-column:1/-1; }
.character-field input,.character-field textarea { width:100%; padding:8px 9px; border:1px solid var(--line); border-radius:7px; outline:0; background:#090b0e; color:var(--text); font-size:9px; line-height:1.4; text-transform:none; resize:vertical; }
.character-field input:focus,.character-field textarea:focus { border-color:#73a8ff; }
.story-upload-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:8px; }
.story-upload { position:relative; display:flex; flex-direction:column; justify-content:center; min-height:48px; padding:7px 9px; border:1px dashed #373c46; border-radius:8px; background:#0e1014; }
.story-upload:hover,.story-upload.dragover { border-color:#73a8ff; background:rgba(115,168,255,.045); }
.story-upload input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
.story-upload b { color:#d6e4ff; font-size:8px; } .story-upload small { color:var(--muted); font-size:7px; }
.story-image-gallery { display:flex; flex-wrap:wrap; gap:4px; margin-top:5px; }
.story-image-tile { position:relative; width:36px; height:36px; overflow:hidden; border:1px solid var(--line); border-radius:6px; }
.story-image-tile img { width:100%; height:100%; object-fit:cover; }
.story-image-tile button { position:absolute; right:2px; top:2px; display:grid; place-items:center; width:14px; height:14px; padding:0; border:0; border-radius:50%; background:rgba(0,0,0,.75); color:white; font-size:10px; }
.story-options { display:grid; grid-template-columns:120px 1fr; gap:8px; margin-top:11px; padding:9px; border:1px solid var(--line); border-radius:9px; background:#0d0f13; }
.story-options label,.story-options>div { display:flex; flex-direction:column; gap:4px; }
.story-options span,.story-options strong { color:#d7dae0; font-size:8px; }
.story-options small { color:var(--muted); font-size:7px; }
.story-options input { width:100%; height:32px; padding:0 8px; border:1px solid var(--line); border-radius:7px; outline:0; background:#090b0e; color:var(--text); font-size:9px; }
.story-options .story-text-toggle { grid-column:1/-1; display:flex; flex-direction:row; align-items:center; gap:8px; padding-top:7px; border-top:1px solid var(--line); cursor:pointer; }
.story-options .story-text-toggle input { flex:none; width:14px; height:14px; margin:0; accent-color:#c7a86a; }
.story-source-switch { display:grid; grid-template-columns:1fr 1fr; gap:4px; margin:10px 0 8px; padding:4px; border:1px solid var(--line); border-radius:9px; background:#0a0c0f; }
.story-source-switch button { min-height:31px; border:1px solid transparent; border-radius:7px; background:transparent; color:var(--muted); font-size:9px; font-weight:800; cursor:pointer; }
.story-source-switch button.active { border-color:rgba(199,174,132,.28); background:linear-gradient(135deg,rgba(199,174,132,.16),rgba(199,174,132,.055)); color:#efe2cb; box-shadow:0 2px 10px rgba(0,0,0,.18); }
.story-source-switch button:focus-visible { outline:2px solid #c7ae84; outline-offset:1px; }
.story-studio #storyBrief { min-height:138px; line-height:1.55; }
.story-studio #storyBrief.novel-source { min-height:220px; font-size:10px; }
.story-style-reference { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:center; margin-top:8px; padding:9px; border:1px solid rgba(178,148,105,.28); border-radius:9px; background:linear-gradient(135deg,rgba(110,78,49,.14),#0d0f13 70%); }
.story-style-reference[hidden] { display:none; }
.story-style-reference-copy { display:flex; min-width:0; flex-direction:column; gap:4px; }
.story-style-reference-copy strong { color:#e5d3b1; font-size:9px; }
.story-style-reference-copy small { color:var(--muted); font-size:7px; line-height:1.45; }
.story-style-upload { display:grid; min-height:32px; place-items:center; padding:0 9px; border:1px dashed #594b39; border-radius:7px; color:#e5d3b1; font-size:8px; cursor:pointer; }
.story-style-upload:hover { border-color:#b29469; background:rgba(178,148,105,.08); }
.story-style-upload input { position:absolute; width:1px; height:1px; opacity:0; }
.story-style-reference-gallery { display:grid; grid-column:1/-1; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.story-style-reference-tile { position:relative; display:flex; align-items:center; gap:8px; min-width:0; padding:5px; border:1px solid var(--line); border-radius:7px; background:#090b0e; }
.story-style-reference-tile img { width:50px; height:40px; flex:none; border-radius:4px; object-fit:cover; }
.story-style-reference-tile span { overflow:hidden; flex:1; color:#c7cbd2; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
.story-style-reference-tile button { width:22px; height:22px; border:1px solid #39332a; border-radius:6px; background:#17130e; color:#ead8b9; font-size:14px; }
.story-text-toggle span { display:flex; flex-direction:column; gap:3px; }
.story-lettering-preview { display:block; max-width:100%; margin-top:8px; padding:8px 10px; overflow-wrap:anywhere; white-space:normal; }
.story-lettering-preview p { margin:4px 0 0; white-space:normal; overflow-wrap:anywhere; font-size:14px; line-height:1.5; }
.story-lettering-preview>span { display:block; font:700 8px/1.3 ui-sans-serif,system-ui,sans-serif; letter-spacing:.12em; text-transform:uppercase; }
.story-lettering-narration { border:1px solid rgba(236,236,236,.38); background:#090a0d; color:#f4f2ef; box-shadow:0 3px 10px rgba(0,0,0,.3); }
.story-lettering-narration p { font:italic 700 16px/1.32 Georgia,"Times New Roman","Nirmala UI",serif; text-align:center; }
.story-lettering-narration>span { color:#c5c9d0; }
.story-lettering-dialogue { width:fit-content; max-width:min(100%,340px); padding:8px 12px; border:1px solid #bfc2c7; border-radius:20px; background:#f5f4f1; color:#17181b; box-shadow:0 2px 6px rgba(0,0,0,.2); }
.story-lettering-dialogue p { font:700 16px/1.45 "Story Comic Neue",Arial,Helvetica,sans-serif; text-align:center; }
.story-lettering-dialogue>span { color:#62656a; font-size:8px; letter-spacing:.08em; }
.story-chapter-output { margin-top:11px; overflow:hidden; border:1px solid rgba(115,168,255,.24); border-radius:10px; background:linear-gradient(145deg,rgba(115,168,255,.055),#0b0d11 42%); }
.story-chapter-output[hidden] { display:none; }
.story-chapter-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 11px; border-bottom:1px solid var(--line); }
.story-chapter-head>div { display:flex; min-width:0; flex-direction:column; gap:3px; }
.story-chapter-head small { color:#73a8ff; font-size:7px; font-weight:900; letter-spacing:.09em; }
.story-chapter-head strong { overflow:hidden; color:#eef4ff; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.story-chapter-head button { flex:0 0 auto; padding:6px 8px; border:1px solid rgba(115,168,255,.28); border-radius:7px; background:rgba(115,168,255,.08); color:#cfe0ff; font-size:8px; font-weight:800; }
.story-chapter-head button:hover { background:rgba(115,168,255,.15); }
.story-chapter-text { max-height:250px; padding:11px; overflow:auto; color:#b9c1cd; font-size:9px; line-height:1.65; white-space:pre-wrap; scrollbar-width:thin; scrollbar-color:#303a49 transparent; }
.story-shot-list { border-top:1px solid var(--line); }
.story-shot-list summary { display:flex; justify-content:space-between; padding:9px 11px; color:#d8e4f8; cursor:pointer; font-size:8px; font-weight:800; list-style:none; }
.story-shot-list summary::-webkit-details-marker { display:none; }
.story-shot-list summary span { color:var(--muted); font-weight:600; }
#storyShots { display:grid; gap:5px; max-height:230px; padding:0 9px 9px; overflow:auto; }
.story-shot-row { display:grid; grid-template-columns:30px minmax(0,1fr); gap:9px; align-items:start; padding:10px; border:1px solid var(--line); border-radius:9px; background:#0d0f13; }
.story-shot-row>b { display:grid; width:28px; height:28px; place-items:center; border-radius:7px; background:#171b22; color:#d5b77f; font:800 10px ui-monospace,monospace; }
.story-shot-row>div { display:grid; gap:5px; min-width:0; }
.story-shot-row strong { color:#e4eaf3; font-size:10px; line-height:1.45; }
.story-shot-row small { color:#aab2bf; font-size:9px; line-height:1.4; white-space:normal; overflow-wrap:anywhere; }

.prompt-section>label { display:block; margin-bottom:7px; color:var(--muted); font-size:9px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
#shortPrompt { width:100%; height:42px; padding:0 12px; border:1px solid var(--line); border-radius:10px; outline:0; background:#0d0f13; color:var(--text); }
#shortPrompt:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(250,204,21,.07); } #shortPrompt::placeholder { color:#626874; }
.physical-details { margin-top:9px; overflow:hidden; border:1px solid var(--line); border-radius:9px; background:#0e1014; }
.physical-details summary { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px; cursor:pointer; list-style:none; color:#cdd2da; font-size:9px; font-weight:750; }
.physical-details summary::-webkit-details-marker { display:none; } .physical-details summary::before { content:"+"; color:var(--accent); font-size:14px; line-height:1; }
.physical-details[open] summary::before { content:"−"; } .physical-details summary span { margin-right:auto; }
.physical-details summary small { color:var(--success); font-size:7px; font-weight:700; }
.physical-details-body { padding:0 9px 9px; border-top:1px solid var(--line); }
.physical-details-body label { display:block; margin:8px 0 5px; color:var(--muted); font-size:7px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
#physicalDetails { width:100%; min-height:76px; resize:vertical; padding:9px 10px; border:1px solid var(--line); border-radius:8px; outline:0; background:#090b0e; color:var(--text); font:inherit; font-size:9px; line-height:1.5; }
#physicalDetails:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(250,204,21,.06); } #physicalDetails::placeholder { color:#555d69; }
.physical-details-body p { margin:6px 1px 0; color:#6f7784; font-size:7px; }
.engine-switch { display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:9px; }
.engine-option { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; padding:9px; border:1px solid var(--line); border-radius:9px; background:#0e1014; color:var(--text); text-align:left; }
.engine-option b { font-size:9px; } .engine-option small { color:var(--muted); font-size:7px; }
.engine-option.active { border-color:rgba(250,204,21,.65); background:rgba(250,204,21,.07); } .engine-option.active b { color:var(--accent); }

.parallel-badge { padding:3px 7px; border-radius:999px; background:rgba(250,204,21,.08); color:var(--accent)!important; font-weight:800; }
.parallel-badge.sequential-badge { background:rgba(131,241,150,.1); color:#83f196!important; }
.quality-badges { display:flex; align-items:center; gap:5px; } .phone-badge { padding:3px 7px; border-radius:999px; background:rgba(99,230,165,.07); color:var(--success)!important; font-weight:800; }
.settings-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
.settings-grid label { display:flex; flex-direction:column; gap:5px; min-width:0; color:var(--muted); font-size:8px; font-weight:700; text-transform:uppercase; }
.settings-grid select,.settings-grid input { width:100%; height:36px; min-width:0; padding:0 9px; border:1px solid var(--line); border-radius:8px; outline:0; background:#0d0f13; color:var(--text); font-size:9px; text-transform:none; }
.settings-grid select:focus,.settings-grid input:focus { border-color:var(--accent); }
.count-setting { grid-column:1/-1; }

.generate-button { display:flex; align-items:center; justify-content:space-between; width:100%; height:50px; margin-top:14px; padding:0 17px; border:0; border-radius:13px; background:linear-gradient(100deg,#ecff87,var(--accent) 48%,#83f196); color:var(--accent-ink); font-weight:900; box-shadow:0 10px 28px rgba(250,204,21,.13); }
.generate-button i { font-style:normal; font-size:19px; } .generate-button:hover { filter:brightness(1.05); } .generate-button:disabled { cursor:not-allowed; filter:none; opacity:.38; }

.progress-section { margin-top:15px; padding-top:13px; border-top:1px solid var(--line); }
.progress-head { display:flex; justify-content:space-between; color:var(--muted); font-size:9px; } .progress-head strong { color:var(--text); }
.progress-track { height:3px; margin:8px 0 11px; overflow:hidden; border-radius:9px; background:var(--panel2); } .progress-fill { width:0; height:100%; border-radius:inherit; background:var(--accent); transition:width .3s ease; }
.queue-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(58px,1fr)); gap:6px; min-height:68px; }
.queue-grid.story-queue { grid-template-columns:repeat(auto-fill,minmax(128px,1fr)); gap:8px; }
.queue-card { position:relative; aspect-ratio:3/4; overflow:hidden; border:1px solid var(--line); border-radius:8px; background:var(--panel); }
.queue-card img { width:100%; height:100%; object-fit:cover; cursor:zoom-in; }
.queue-card.story-result { display:grid; align-content:start; aspect-ratio:auto!important; overflow:hidden; }
.queue-card.story-result>img { display:block; width:100%; height:auto; object-fit:cover; }
.queue-card.story-result .queue-status { position:static; inset:auto; width:auto; margin:0 7px 7px; padding:4px 6px; border-radius:5px; background:#151922; text-align:left; }
.queue-prompt-details { min-width:0; padding:7px; border-top:1px solid var(--line); background:#0c0e12; }
.queue-prompt-details summary { color:#c8d8f2; cursor:pointer; font-size:8px; font-weight:800; }
.queue-prompt-text { display:block; width:100%; min-height:76px; margin-top:7px; resize:vertical; padding:7px; border:1px solid var(--line); border-radius:6px; background:#080a0d; color:#b9c4d4; font:7px/1.45 ui-monospace,"Cascadia Code",monospace; white-space:pre-wrap; }
.queue-prompt-copy { margin-top:5px; padding:6px 8px; border:1px solid rgba(115,168,255,.28); border-radius:6px; background:rgba(115,168,255,.08); color:#cfe0ff; font-size:8px; font-weight:750; }
.queue-prompt-copy:hover { background:rgba(115,168,255,.16); }
.queue-number { position:absolute; left:4px; top:4px; z-index:2; display:grid; place-items:center; min-width:17px; height:17px; padding:0 4px; border-radius:5px; background:rgba(0,0,0,.7); font-size:8px; }
.queue-status { position:absolute; z-index:2; inset:auto 4px 4px; overflow:hidden; color:#c8ccd4; font-size:7px; text-align:center; text-overflow:ellipsis; text-transform:uppercase; white-space:nowrap; }
.queue-download { position:absolute; z-index:3; right:4px; top:4px; display:grid; place-items:center; width:18px; height:18px; padding:0; border:1px solid rgba(255,255,255,.2); border-radius:5px; background:rgba(0,0,0,.72); color:white; font-size:11px; }
.queue-download:hover { background:var(--accent); color:var(--accent-ink); }
.queue-retry { position:absolute; z-index:4; right:27px; top:4px; display:grid; place-items:center; width:18px; height:18px; padding:0; border:1px solid rgba(255,255,255,.2); border-radius:5px; background:rgba(0,0,0,.72); color:#ff3366; font-size:13px; font-weight:900; line-height:1; }
.queue-retry:hover { border-color:rgba(250,204,21,.7); background:var(--accent); color:var(--accent-ink); }
.queue-card.failed .queue-retry,.queue-card.quota_exhausted .queue-retry { right:4px; }
.queue-card.generating::after,.queue-card.downloading::after,.queue-card.retrying::after,.queue-card.manual_retry::after { content:""; position:absolute; inset:0; background:linear-gradient(110deg,transparent 20%,rgba(250,204,21,.12) 48%,transparent 75%); background-size:250% 100%; animation:shimmer 1.3s linear infinite; }
.queue-card.done { border-color:rgba(99,230,165,.5); } .queue-card.failed { border-color:rgba(255,107,120,.5); } @keyframes shimmer { to { background-position:-250% 0; } }
.stop-button { display:block; margin:10px auto 0; border:0; background:none; color:var(--danger); font-size:9px; } .stop-button:disabled { visibility:hidden; }
.log-panel { margin-top:12px; overflow:hidden; border:1px solid var(--line); border-radius:10px; background:#090b0e; }
.log-head { display:flex; align-items:center; justify-content:space-between; padding:8px 9px; border-bottom:1px solid var(--line); color:#c9cdd4; font-size:8px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
.log-head span { display:flex; align-items:center; gap:6px; } .log-head i { width:6px; height:6px; border-radius:50%; background:var(--success); box-shadow:0 0 7px rgba(99,230,165,.7); }
.log-head button { padding:0; border:0; background:none; color:var(--muted); font-size:8px; text-transform:uppercase; } .log-head button:hover { color:var(--text); }
.log-actions { display:flex; gap:10px; align-items:center; }
.terminal { height:112px; padding:8px 9px; overflow:auto; color:#8e98a7; font:8px/1.55 ui-monospace,"Cascadia Code",monospace; white-space:pre-wrap; word-break:break-word; scrollbar-width:thin; scrollbar-color:#30353e transparent; }
.terminal .log-line { display:block; } .terminal .log-time { color:#59616e; } .terminal .log-info { color:#aab3c0; } .terminal .log-error { color:#ff8792; } .terminal .log-success { color:#7ceab1; }
.log-empty { color:#535b68; }
.preview-overlay { position:fixed; z-index:50; inset:0; display:grid; place-items:center; padding:35px 18px; background:rgba(3,4,6,.94); } .preview-overlay[hidden] { display:none; }
.preview-overlay img { max-width:100%; max-height:calc(100vh - 90px); border-radius:10px; } .preview-overlay p { position:absolute; bottom:10px; margin:0; color:var(--muted); }
.preview-close { position:absolute; right:12px; top:8px; border:0; background:none; color:white; font-size:25px; }
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible { outline:2px solid rgba(250,204,21,.75); outline-offset:2px; }
@media(max-width:370px) { .mode-switch,.reference-row,.engine-switch,.story-upload-grid,.character-fields,.story-options { grid-template-columns:1fr; } .character-field:last-child { grid-column:auto; } .settings-grid { grid-template-columns:1fr; } .count-setting { grid-column:auto; } .flow-card { grid-template-columns:auto minmax(0,1fr); } .flow-actions { grid-column:1/-1; flex-direction:row; } .flow-actions button { flex:1; } }
@font-face { font-family:"Story Comic Neue"; src:url("assets/ComicNeue-Bold.ttf") format("truetype"); font-style:normal; font-weight:700; font-display:swap; }
.story-library,.story-chapter-queue,.story-delivery { min-width:0; margin:0 0 15px; padding:14px; border:1px solid #30383d; border-radius:14px; background:linear-gradient(145deg,#1a211c,#101416); }
.story-tools-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; }
.story-tools-head>div { display:grid; gap:5px; min-width:0; }
.story-tools-head strong { color:#f0f3e9; font-size:13px; line-height:1.35; }
.story-tools-head small { color:#adbca5; font-size:10px; line-height:1.5; }
.story-tools-head button,.story-library button,.story-chapter-queue button,.story-delivery button { border:1px solid #3c493b; border-radius:8px; background:#202b20; color:#e4f6c6; padding:8px 10px; font-size:11px; white-space:normal; }
.story-library button:disabled,.story-chapter-queue button:disabled,.story-delivery button:disabled { opacity:.5; cursor:default; }
.story-library-filters { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
.story-library-filters input,.story-library-filters select,.story-queued-draft input,.story-queued-draft textarea { min-width:0; width:100%; border:1px solid #384239; border-radius:8px; background:#0d1210; color:#e3eade; padding:9px; font:11px/1.5 inherit; }
.story-library-list { display:grid; gap:7px; max-height:246px; margin-top:10px; overflow:auto; scrollbar-width:thin; }
.story-library-item { display:flex; align-items:center; gap:10px; min-width:0; padding:7px; border:1px solid #2a342c; background:#121a15; border-radius:9px; }
.story-library-item img { width:44px; height:55px; object-fit:cover; object-position:top; border-radius:5px; }
.story-library-item>div { display:grid; flex:1; gap:4px; min-width:0; }
.story-library-item strong { font-size:12px; color:#edf0e7; }.story-library-item small { font-size:10px; color:#acb9aa; overflow-wrap:anywhere; }
.story-tools-note { margin:10px 0 0; color:#9ca99d; font-size:10px; line-height:1.6; overflow-wrap:anywhere; }
.story-chapter-queue { background:#11171a; border-color:#2a363e; }.story-queued-draft { padding:10px 0; border-top:1px solid #29353c; }
.story-queued-draft summary { cursor:pointer; color:#d4e0e7; font-size:12px; margin-bottom:9px; overflow-wrap:anywhere; }.story-queued-draft input { margin-bottom:7px; }.story-queued-draft textarea { resize:vertical; min-height:130px; }
.story-delivery { margin-top:14px; }.story-delivery-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
.story-chapter-status { display:grid; gap:5px; padding:10px 0; border-bottom:1px solid #2d362e; overflow-wrap:anywhere; }.story-chapter-status strong { font-size:12px; }.story-chapter-status small,.story-chapter-status span { font-size:10px; color:#a9b5ab; line-height:1.5; }
#saveStoryPdf { background:#dff49f; color:#172014; font-weight:800; }#discardStory { color:#c0b4ae; background:transparent; }
.story-run-controls {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
.story-run-controls button {min-height:40px;padding:9px 5px;font-weight:750;}
#resumeStory:not(:disabled) {background:#dff49f;color:#172014;}
#stopStory {border-color:#74414a;background:#301c22;color:#ffb3bd;}
#startOverStory {border-color:#615638;background:#272317;color:#efdaa3;}
.queue-card.story-result>img { object-fit:contain; aspect-ratio:auto!important; }
.story-character-head { cursor:pointer; gap:10px; list-style:none; margin-bottom:0; }.story-character-head strong {flex:1;font-size:11px;}.story-character-head button {font-size:9px;}.story-character-card[open] .story-character-head {margin-bottom:12px;}
@media(max-width:370px) {.story-library-filters {grid-template-columns:1fr;}.story-library,.story-chapter-queue,.story-delivery {padding:10px;}}

````

</details>

### 17.9 Classic prompt engine — exact rules, decks, selection and final prompt order

Source: [classic-direction.js](<D:/pfGG/classic-direction.js>)

<details>
<summary>Expand exact classic-direction.js source</summary>

````javascript
/* Classic-only photo direction. Story and Subject Flow use their own builders. */
(function(root) {
  const baseFigure = 'SPECIFIC CURVY HOURGLASS DEFAULT: Unless the user supplies different measurements, use approximately a 56-inch bust/chest and about 56-inch hips. Keep the fullness focused in the bust and hips, with naturally proportioned thighs and a defined, reference-consistent waist and abdomen. These measurements do not mean a generally fat or obese build; do not enlarge the whole torso or stomach to imply them. Keep anatomy and body scale believable. Never replace the specified silhouette with a slim, thin or straight fashion-model build, and do not exaggerate curves through a deep back arch or distorted lens.';
  // Visual direction from the user's seven Classic examples, 6 Nov 2026.
  // See references/classic-lighting/README.md for daylight and phone-flash cues.
  const realism = 'NATURAL INSTAGRAM PHONE PHOTO: A clear, attractive personal iPhone photo taken by a friend, with an easy expression and comfortable, unforced posture. Use the iPhone main rear 1x camera in standard Photo mode or an ordinary 2x crop, natural perspective, readable background detail and normal iPhone-camera sharpness. Preserve real skin texture, small natural highlights, flyaway hairs, cloth weave and normal creases. Keep the original complexion, facial structure, age appearance and hair texture. STRAIGHT-FROM-CAMERA COLOR: Let standard phone-camera processing produce vivid, saturated-but-believable colors, punchy natural contrast, rich garment colors, clean whites and defined shadows. Keep saturation in the clothes and setting lively while skin remains true to the subject. No later filter or post-generation grading, skin whitening, beauty smoothing, faded matte blacks, grey haze, sepia, orange/teal tint, cinematic grade, vignette, bloom, exaggerated HDR or artificial sharpening halos. Avoid studio lighting, ring lights, softboxes, fake portrait-mode blur, cutout edges, polished campaign posing and plastic skin.';
  const lightRule = 'NATURAL LIGHT AND EXPOSURE: Make the face and eyes clearly readable, with healthy natural skin color, small real catchlights and detail in both skin highlights and shadows. Bright means correct photographic exposure, never lighter skin, a glowing face or blown-out fabric. In daylight use bright available sky/window light or ordinary daylight with physically consistent gentle facial shadows. Preserve rich color and firm natural contrast in the clothes and surroundings; do not wash out colors, flatten every shadow or tint the skin. At night or in a dim car, a nearby phone flash may light the person clearly while the distant background stays darker and its practical lights remain visible; use realistic flash falloff and contact shadows. Honor the requested time and any explicit flash/no-flash direction. No golden hour, sunset glow, amber wash, orange skin, artificial rim light or decorative light beams. Subject and setting share a coherent light-source geometry; their brightness may differ naturally with distance from the source. Avoid underexposed faces, muddy grey skin, flat dull exposure and artificial studio fill.';
  // Apply color to every lighting branch, including night and referenced rooms.
  const colorRule = 'CAMERA COLOR: Use neutral camera white balance and faithful object colors with vivid natural color and strong, clean midtone contrast. White fabric and neutral walls should read neutral under the main light; preserve the actual complexion and distinct garment colors. A warm lamp may stay warm locally, and real wood or brown furniture stays its actual color, without tinting the whole photograph yellow, orange, beige or brown. No global warm/brown wash, sepia grade or compensating blue/grey cast. Keep clothes and background richly colored as they would look in a well-exposed standard phone photo; never whiten skin or mute the room.';
  const captureRule = 'STANDARD PHONE CAPTURE — FINAL PHOTOGRAPHIC FINISH: Use standard iPhone Photo mode with Portrait mode off, and the broad depth of field of its main camera at normal portrait distance. Keep nearby furniture, walls and room details readable together with the person. Allow only modest distance-related optical softness; never create a sharp cutout person against an evenly defocused room. No portrait-mode depth mask, creamy bokeh, Gaussian background blur or DSLR shallow-focus look. An attractive pose or stylish room does not imply a professional photo shoot. Light the whole scene from its actual window, household/street fixtures or a permitted small on-camera flash; keep ordinary uneven falloff and real contact shadows. Do not add a beauty key light, softbox glow, rim/backlight, spotlight on the face or a studio fill setup. Indoors should feel like a personal iPhone photo in a real occupied room, with well-kept materials, subtle everyday detail and plausible reflections. Photographic realism comes from the camera, natural light and real textures; do not invent worn walls, shabby upholstery or outdated fittings to make the photo look real. Premium interior design must still be photographed casually, without an architectural-render finish or staged interiors-campaign lighting. Use a straight-from-camera iPhone finish with normal contrast, intact skin texture and natural camera detail. No added post-processing look: cinematic LUT, color grade, bloom/halation, glow, vignette, exaggerated HDR tone mapping, lifted matte shadows, crushed blacks, skin retouching, denoising smear, clarity/sharpening halos or added grain overlays. Do not simulate rawness by adding dirt, exaggerated pores, heavy noise or deliberate blur. At night, darkness comes from exposure and distance, not a brown filter or smeared background. These capture defaults apply to both planned and newly invented settings; only an explicit user photographic request can override them.';
  // Public previews from the user's profile list, reviewed 8 Nov 2026.
  // See references/classic-bloggers/README.md for coverage and exclusions.
  const skinRule = 'REAL SKIN AT NORMAL PORTRAIT DISTANCE: Keep subtle, irregular skin texture at the scale the camera could actually resolve: fine pores where visible, soft facial hairs, natural lip texture and small expression creases. Preserve gentle tonal variation and existing marks instead of making every patch of skin one flat color. Makeup may sit naturally on the skin without erasing its surface. Keep the face, neck, chest, arms and hands consistent in complexion, with differences explained by real light and shadow. Small localized highlights can appear on the nose, cheeks and shoulders; do not coat the whole person in glossy light. No waxy or airbrushed skin, porcelain finish, painted-on pores, exaggerated blemishes, oversharpened texture, added freckles or uniform grain. This is ordinary phone-photo skin, not a macro dermatology image.';
  const portraitRule = 'SUBJECT-PROMINENT FRAMING: Unless the user explicitly asks for a wide or distant view, keep the camera near enough for the face, expression, skin and outfit texture to remain readable. Prefer close or medium personal portraits and nearby outfit crops; background depth should surround a prominent subject without making the person small. A flattering photo preserves the specified body volume, not a slimmer silhouette. Leave the exact framing to Flow; explicit selfie, close-up, full-body or wide framing wins.';
  // Creative directions, not replicas or fixed pose/venue recipes.
  const places = [
  {
    "id": "cafe-patio",
    "indoor": false,
    "location": "A lively cafe patio with jewel-green plants, patterned tile or painted trim, one attractive table detail and a colorful but believable social background."
  },
  {
    "id": "rooftop",
    "indoor": false,
    "location": "A colorful city rooftop with crisp railing lines, saturated building accents and a readable skyline close behind the subject, never a distant travel panorama."
  },
  {
    "id": "courtyard",
    "indoor": false,
    "location": "A modern courtyard with a bold painted doorway, patterned floor or colored tile, leafy pots and layered architecture around the close portrait."
  },
  {
    "id": "waterfront",
    "indoor": false,
    "location": "A waterside cafe or promenade with colorful railing details, sparkling but natural water reflections, and a nearby shoreline setting visible behind the subject."
  },
  {
    "id": "botanical",
    "indoor": false,
    "location": "A lush garden path with deep green leaves, vivid flowers in a few colors, textured stone and a house or cafe detail behind the subject."
  },
  {
    "id": "boutique",
    "indoor": false,
    "location": "A fashionable city storefront with glossy glass, colorful signs kept unreadable, vivid window displays and real street texture close behind the subject."
  },
  {
    "id": "pool-terrace",
    "indoor": false,
    "location": "A stylish pool terrace with clear turquoise water, colorful loungers or towels, lush planting and bright real daylight; keep the person close and prominent."
  },
  {
    "id": "gallery",
    "indoor": true,
    "location": "A contemporary art-gallery corner with one large colorful artwork, warm wood or polished stone, gallery lighting and visible architectural depth behind a close portrait."
  },
  {
    "id": "lobby",
    "indoor": true,
    "location": "A premium hotel lounge with emerald or burgundy upholstery, brass details used sparingly, a statement lamp and layered modern architecture; avoid empty beige walls."
  },
  {
    "id": "veranda",
    "indoor": false,
    "location": "A bright home veranda with vivid potted flowers, a colored tile edge, modern chairs and leafy outdoor depth visible around the subject."
  },
  {
    "id": "cafe-window",
    "indoor": true,
    "location": "A stylish cafe window seat with colored cushions, textured wall or tile, window reflections and green street life visible just beyond the subject."
  },
  {
    "id": "stone-steps",
    "indoor": false,
    "location": "Broad stone steps beside a vivid painted wall, iron railing or flowering planter, with alternating light and shadow giving the close composition depth."
  },
  {
    "id": "flower-terrace",
    "indoor": false,
    "location": "A flower terrace with saturated bougainvillea or seasonal blooms, colored planters, textured paving and natural outfit-to-flower contrast."
  },
  {
    "id": "palm-path",
    "indoor": false,
    "location": "A palm-lined garden walkway with deep green fronds, terracotta pots, colorful flowering plants and a nearby residential or cafe backdrop."
  },
  {
    "id": "marina",
    "indoor": false,
    "location": "A marina-side cafe with blue water, colorful boat details, a textured railing and reflections visible behind a close subject; avoid distant wide framing."
  },
  {
    "id": "library-lounge",
    "indoor": true,
    "location": "A refined modern home lounge with a deep teal or wine-colored sofa, warm wood, one striking art object, a plant and real lived-in detail."
  },
  {
    "id": "glass-atrium",
    "indoor": true,
    "location": "A glass atrium with colorful reflections, a textured stone column, lush indoor greenery and a bright architectural background that stays readable."
  },
  {
    "id": "garden-bench",
    "indoor": false,
    "location": "A landscaped garden bench beneath flowering branches, with a colorful cushion, layered foliage and a tiled or stone path around the close portrait."
  },
  {
    "id": "terracotta",
    "indoor": false,
    "location": "A terracotta-toned modern courtyard with crisp geometry, cobalt or teal accents, leafy plants and rich natural color without an orange filter."
  },
  {
    "id": "sculpture-plaza",
    "indoor": false,
    "location": "A contemporary sculpture plaza with a bold colorful sculpture, clean paving, planted edges and close architectural layers rather than a wide empty plaza."
  }
];
  const poses = [
  {
    "id": "stride",
    "text": "Catch one clear walking step toward camera: front foot advancing, rear heel lifted, hips angled and one arm swinging naturally."
  },
  {
    "id": "walk-away-turn",
    "text": "Catch the subject taking a step away from camera with the back and one shoulder visible, then turning the head for a clear over-shoulder glance."
  },
  {
    "id": "seated-diagonal",
    "text": "Sit diagonally on a real chair or bench, one forearm resting on its arm or table and torso turned toward camera; do not use a bed-edge pose."
  },
  {
    "id": "seated-side",
    "text": "Sit sideways with both knees angled in one direction, shoulders turned back toward camera and hands resting separately on lap and chair."
  },
  {
    "id": "rail-side",
    "text": "Stand beside an actual railing or counter, rest one forearm lightly on it, shift weight to the outside leg and turn the torso three-quarters toward camera."
  },
  {
    "id": "shoulder-lean",
    "text": "Lean one shoulder against a real textured wall or column, keep the other shoulder forward and let both arms hang relaxed at different heights."
  },
  {
    "id": "step-up",
    "text": "Catch the subject stepping onto a low real step, one knee bent and the other leg grounded; glance sideways instead of standing square to camera."
  },
  {
    "id": "hair-tuck",
    "text": "Show one hand tucking hair behind one ear while the opposite arm stays relaxed; turn the face slightly toward camera and keep all fingers natural."
  },
  {
    "id": "hands-behind",
    "text": "Place both hands loosely behind the lower back, draw one shoulder slightly forward and angle the hips away from camera for an open silhouette."
  },
  {
    "id": "hand-on-hip",
    "text": "Rest only one hand on the hip with elbow out; keep the other hand down holding a small real prop or touching a nearby surface."
  },
  {
    "id": "ankle-cross",
    "text": "Stand with ankles crossed, weight on the rear leg, one hand lightly holding a bag or sleeve and shoulders turned at a different angle from the hips."
  },
  {
    "id": "side-profile",
    "text": "Turn the body almost side-on, keep the face in a clear three-quarter profile, one shoulder nearer the lens and gaze just past the camera."
  },
  {
    "id": "mid-pivot",
    "text": "Catch a small mid-pivot: feet planted at different angles, torso rotating toward camera and loose fabric shifting naturally from the turn."
  },
  {
    "id": "hair-lift",
    "text": "Lift one arm to adjust hair above the head while the other hand rests at the waist; keep the raised elbow visible and shoulders relaxed."
  },
  {
    "id": "arms-folded",
    "text": "Fold arms loosely at mid-torso with one hand visible on the opposite sleeve; keep shoulders soft and body turned slightly off-center."
  },
  {
    "id": "candid-laugh",
    "text": "Catch a genuine laugh with head turned slightly aside, shoulders lifted naturally and one hand briefly covering or brushing near the smile."
  },
  {
    "id": "look-down-step",
    "text": "Pause during a small step while looking down toward the path, one hand holding the outfit edge or bag strap and the other arm loose."
  },
  {
    "id": "seat-forward",
    "text": "Sit near the front of a real chair with torso leaning slightly forward, elbows separated and hands naturally occupied with a cup or phone."
  },
  {
    "id": "rail-back",
    "text": "If a real chair or ledge is present, lean back on one hand with chest open and knees angled; otherwise use a relaxed shoulder lean on a real support."
  },
  {
    "id": "doorway-frame",
    "text": "Stand partly inside a real doorway, one hand touching the doorframe above shoulder height, one foot forward and torso angled into the room."
  },
  {
    "id": "seated-lookback",
    "text": "While seated, turn the torso and head back toward camera over one shoulder; keep hips facing away and hands resting on the seat for support."
  },
  {
    "id": "open-palms",
    "text": "Show a small conversational gesture with one palm turned upward near the waist and the other hand relaxed; shoulders and gaze face slightly off-camera."
  },
  {
    "id": "collarbone-hand",
    "text": "Rest fingertips lightly near the collarbone without covering the neckline, keep the second arm down and angle one shoulder toward camera."
  },
  {
    "id": "turn-and-pause",
    "text": "Pause halfway through a gentle turn with shoulders at different depths, one foot pivoted and face glancing back toward the lens."
  }
];
  // Five broad silhouette families prevent five different labels from still
  // producing five standing portraits. Exact staging remains the renderer's job.
  const poseFamilies = {
    moving: ['stride','walk-away-turn','step-up','mid-pivot','look-down-step'],
    seated: ['seated-diagonal','seated-side','seat-forward','seated-lookback'],
    supported: ['rail-side','shoulder-lean','rail-back','doorway-frame'],
    poised: ['hands-behind','hand-on-hip','ankle-cross','side-profile','turn-and-pause'],
    expressive: ['hair-tuck','hair-lift','arms-folded','candid-laugh','open-palms','collarbone-hand']
  };
  for (const [family,ids] of Object.entries(poseFamilies)) {
    for (const pose of poses) if (ids.includes(pose.id)) pose.family = family;
  }
  const gazes = [
  {
    "id": "direct",
    "text": "A confident direct connection with the camera."
  },
  {
    "id": "soft-smile",
    "text": "A small easy smile and relaxed eyes."
  },
  {
    "id": "off-camera",
    "text": "An engaged off-camera expression."
  },
  {
    "id": "laugh",
    "text": "A lively spontaneous expression."
  },
  {
    "id": "calm",
    "text": "A calm self-assured expression."
  },
  {
    "id": "side-glance",
    "text": "A playful sideways expression."
  }
];
  function deck(items, recent, random) {
    const result=[...items];
    for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
    // Unused choices first, then the least recently used. Still works when the
    // requested batch is larger than the remaining unseen choices.
    const history=Array.isArray(recent)?recent:[];
    return result.sort((a,b)=>history.lastIndexOf(a.id)-history.lastIndexOf(b.id));
  }
  function remember(previous={},shots=[]) {
    const append=(key,values)=>[...(Array.isArray(previous?.[key])?previous[key]:[]),...values].slice(-40);
    return {poseIds:append('poseIds',shots.map(s=>s.poseId)),placeIds:append('placeIds',shots.map(s=>s.id)),cropIds:append('cropIds',shots.map(s=>s.cropId)),gazeIds:append('gazeIds',shots.map(s=>s.gazeId))};
  }
  function variedPoseDeck(recent,random) {
    const remaining=deck(poses,recent,random),result=[],usedFamilies=new Set();
    while(remaining.length) {
      let index=remaining.findIndex(pose=>!usedFamilies.has(pose.family));
      if(index<0){
        // Start a new family cycle with a different silhouette from the
        // preceding shots, even when a batch contains more than five images.
        usedFamilies.clear();
        for(const pose of result.slice(-4))usedFamilies.add(pose.family);
        index=remaining.findIndex(pose=>!usedFamilies.has(pose.family));
        if(index<0){usedFamilies.clear();index=0;}
      }
      const [pose]=remaining.splice(index,1);
      usedFamilies.add(pose.family);result.push(pose);
    }
    return result;
  }
  function figure({physical='',tuning=''}={}) {
    return `FIGURE AUTHORITY — EXTENSION BODY SETTINGS OVERRIDE EVERY REFERENCE BODY:
Use supplied measurements verbatim; do not invent numbers, enlarge them, average them with an outfit model, or use perspective to make the body smaller.
${tuning.trim()?`EXACT BODY TUNING — highest priority for the traits entered:\n${tuning.trim()}`:''}
${physical.trim()?`WRITTEN FIGURE DETAILS — next priority:\n${physical.trim()}`:''}
For any conflicting trait, Body Tuning wins over Figure Details; Figure Details win over physique wording in the scene. Explicit measurements control their own dimensions; the thick base fills only unspecified build details. Facial identity stays anchored to the subject photos.
DEFAULT FOR UNSPECIFIED BUILD TRAITS ONLY:\n${baseFigure}
VISIBLE BODY FIDELITY: Render requested measurements at the named body areas; do not infer generalized fatness or enlarge the waist/abdomen unless the user's own figure description or reference supports it. When the user explicitly requests a thick/full build, show natural volume in the bust, torso, hips and thighs where the crop reveals them. Preserve the same resolved build in every pose and across the entire batch. Identity, outfit, background and blogger-style references cannot slim it down or replace it with another person's proportions. Explicit written measurements always override conflicting defaults.
CLOTHING FIT: Keep the exact referenced garments, cut, color, pattern and intended ease. Fit them to this body using gravity, seams, folds and plausible tension. A slim outfit-reference model supplies garment design only: adapt garment sizing and panel circumference to the specified body instead of retaining that model's narrow silhouette. Preserve neckline shape, sleeve style, hem design, pattern and construction while allowing body-dependent widths and folds to change. Non-stretch fabric drapes with appropriate ease instead of stretching like rubber. Loose clothing stays loose; do not turn every garment into a tight bodycon outfit or reshape the person to fit the outfit model.`;
  }
  function framing(target,index) {
    if(/\b(selfie|front cam(?:era)?|arm['’]?s? length)\b/i.test(target))return 'Honor the requested selfie or mirror-selfie framing. Use a plausible phone position, arm length and reflection with one consistent subject; preserve natural face and body proportions.';
    if(/\b(close[ -]?up|headshot|head.and.shoulders|close shot)\b/i.test(target))return 'Honor the requested close portrait; keep the face recognizable with natural perspective. Do not widen the crop just to show body measurements.';
    if(/\b(full[ -]?(?:body|length)|head.to.toe|entire body|feet visible)\b/i.test(target))return 'Show the complete head-to-toe body and footwear, with a little floor around the feet. Keep the camera level and limbs naturally proportioned.';
    if(/\b(wide shot|environmental portrait|distant|far away)\b/i.test(target))return 'Honor the requested wider framing without distorting body proportions or cluttering the location.';
    return [
      'CAMERA A — nearby three-quarter portrait, eye-level and slightly off-center; frame from mid-thigh upward so the pose silhouette and face are clear, with a colorful setting occupying one side of the frame.',
      'CAMERA B — close waist-up portrait from a gentle three-quarter angle, camera just above eye level; keep the face large and sharp while showing a rich, readable background over the shoulder.',
      'CAMERA C — nearby knees-up portrait at eye level, subject turned diagonally across frame; show the leg stance and outfit shape, with the subject filling most of the image rather than a distant scene.',
      'CAMERA D — close over-the-shoulder composition at normal phone distance; keep one eye/face profile readable, show shoulder and torso angle, with textured architecture or plants behind.',
      'CAMERA E — nearby side-angle portrait, camera slightly below eye level but not distorted; frame waist-up with the subject off-center and vivid background detail visible in the open side.'
    ][index%5];
  }
  function shots(count,{target='',hasEnvironment=false,random=Math.random,previous={}}={}) {
    const indoor=/\b(lift|elevator|corridor|hallway|landing|room|bedroom|livingroom|bathroom|kitchen|lounge|home|house|apartment|flat|indoors?|interiors?|inside|lobby|garage|ghar|andar|kamra|kamre|makaan)\b/i.test(target) || /घर|अंदर|कमरा|मकान/u.test(target);
    const specifiedLocation=indoor || /\b(wall|garden|park|stairs?|staircase|entrance|doorway|balcony|terrace|street|road|walkway|cafe|caf[eé]|restaurant|hotel|car|parking|beach|gym|store|shop|mall|museum|airport|deewar|diwar|bagicha)\b/i.test(target);
    const outdoor=/\b(garden|park|balcony|terrace|street|road|walkway|beach|outdoors?|outside|bagicha)\b/i.test(target);
    const night=/\b(night(?:[ -]?time)?|evening|after dark|midnight|raat|shaam)\b/i.test(target) || /रात|शाम/u.test(target);
    const daytime=/\b(daytime|daylight|morning|afternoon|din)\b/i.test(target);
    const noFlash=/\b(no[ -]?flash|without\s+(?:a\s+)?flash|flash\s+(?:off|nahi|nahin|mat))\b/i.test(target) || /बिना\s*फ्लैश/u.test(target);
    const pool=deck(places,previous?.placeIds,random);
    const posePool=variedPoseDeck(previous?.poseIds,random);
    const gazePool=deck(gazes,previous?.gazeIds,random);
    const cropPool=deck([0,1,2,3,4].map(id=>({id})),previous?.cropIds,random);
    return Array.from({length:count},(_,i)=>{
      const pose=posePool[i%posePool.length],gaze=gazePool[i%gazePool.length],crop=cropPool[i%cropPool.length];
      const place=pool.shift()||places[i%places.length];
      const location=hasEnvironment
        ? 'Use the attached location as the same real place. Retain its materials, wall/door positions and visible layout; find an attractive angle with depth, material texture and clean separation around the subject. Do not add a new venue or invent unseen architecture.'
        : specifiedLocation
        ? 'Use exactly the location named in the user target. Find a visually attractive composition within that setting using its real depth, textures and leading lines; vary the camera position without changing the setting.'
        : `If the user target names any setting, that setting takes priority. Otherwise invent an attractive real location in the Indian/Pakistani fashion-blogger Instagram aesthetic. Optional mood inspiration: ${place.location} Choose the venue and details creatively; this is not an exact location prescription or a photo to copy.`;
      const lightSource=hasEnvironment
        ? 'Keep the actual light sources and direction visible in the location reference, adapted to the requested time. Use a plausible exposure that keeps the face clear; retain the same real place and its light-source geometry.'
        : specifiedLocation && indoor===outdoor
        ? "Follow the named setting's actual available light sources, whether indoors or outdoors, with true colors and natural shadows. Do not invent outdoor sky light inside an enclosed space."
        : (specifiedLocation?indoor:place.indoor)
        ? 'Use available window light where a window really exists, or ordinary neutral-white ceiling or wall fixtures for an invented room. Keep plausible light direction and falloff, neutral white balance and clear true colors throughout the room. Do not default to tungsten-yellow lamps or an amber-lit interior.'
        : 'Use bright daytime open shade facing the open sky or ordinary daylight, with a clearly exposed face, small natural catchlights, true skin and garment colors and soft contact shadows.';
      const lighting=(night&&!daytime
        ? `${hasEnvironment?'Retain the referenced place and its actual fixtures. ':''}Keep the requested night or evening setting. Use existing ambient lights and fixtures at night. ${!hasEnvironment&&(specifiedLocation?indoor:place.indoor)?'For invented indoor fixtures, default to ordinary neutral-white household light unless the user requests another source; do not automatically switch to amber lamps because it is night. ':''}${noFlash?'NO FLASH: Expose using the available fixtures only, retaining believable shadow depth; do not add a flash or a hidden fill light.':'A small nearby on-camera phone flash may expose the face and outfit cleanly while the background stays naturally darker. Keep realistic flash falloff and contact shadows, not a large diffused beauty light.'} Retain highlight detail and readable background shapes wherever actual light reaches them. Honor an explicit no-flash request; never turn night into daylight or add a studio setup.`
        : `${lightSource} Choose correct exposure for the face and outfit, preserving natural shadow depth and highlight detail. ${daytime?'Keep the requested daytime setting. ':''}For an unspecified time, use clear daytime light appropriate to the place. Avoid dim grey exposure, washed-out skin and a filter-like color cast.`)+` ${colorRule}`;
      return {id:hasEnvironment?'reference':specifiedLocation?'requested':place.id,poseId:pose.id,poseFamily:pose.family,gazeId:gaze.id,cropId:crop.id,variationIndex:i+1,batchSize:count,location,lighting,
        pose:`POSE DIVERSITY LOCK — SHOT ${i+1} OF ${count}. Keep the user's explicitly requested action or pose if present. Otherwise make this selected body action visibly readable: ${pose.text} This is a concrete body position, not just a mood. Do not replace it with a front-facing feet-together catalog stance or the same seated pose. Use natural anatomy, relaxed shoulders and believable balance; no exaggerated back arch. Do not copy the stance, hands or camera angle from identity/outfit references.`,framing:framing(target,crop.id)};
    });
  }
  // The user's 8 Nov example showed the unwanted floral-sofa / blank beige-wall
  // default. It is diagnostic evidence, not a location reference to reproduce.
  const interiorRule = 'CONTEMPORARY INTERIOR DEFAULT: When inventing a home or indoor setting without a supplied location reference, use a present-day, attractive, lived-in urban interior with visibly premium design and finish. CURRENT AFFLUENT HOME — 2026: Aim for a well-designed, high-end contemporary Indian/Pakistani city home. Show that quality through refined furniture proportions, good upholstery, thoughtful joinery, well-finished floors, current window treatments and a coherent material/color palette. Even a small corner should look considered and expensive in its workmanship. A generic sofa pushed against a large bare cream wall is not enough to establish this home. Let a few complementary elements reveal the room around the nearby subject: for example, an interesting adjoining area, well-designed storage, a material transition, tasteful art or a good window outlook. These are optional qualities, not a furniture checklist or a fixed layout; choose a coherent combination creatively and vary it between invented settings. If seating is appropriate, favor current refined shapes with solid or subtly textured premium upholstery; do not default to bulky floral/damask sofa sets, matching busy patterned cushions, old brown curtain/window frames or scuffed beige walls. Use the fixtures appropriate to the named room; a kitchen or bathroom should not acquire a living-room sofa. Keep personal everyday details and real comfort, without turning the home into a hotel lobby, empty showroom or oversized mansion. Do not substitute gold ornament, chandeliers, ornate arches or excessive marble for good contemporary design. Indian/Pakistani styling does not imply a haveli or a dated family sitting room. Neutral white balance does not mean furnishing the entire room in beige: preserve distinct real material colors and restrained, confident color accents. No yellow, amber, sepia or global brown wash; no compensating cold grey cast. At night retain believable practical lighting and darkness with clear skin color. Identity and outfit references do not supply the room, furniture, curtains or wall colors unless the same image is explicitly assigned a location/environment role. A supplied location reference or explicitly requested architectural style overrides this default: preserve its actual materials, colors and geometry, and never remodel the referenced room.';
  const sceneRule = 'DESI FASHION-BLOGGER PHOTO AESTHETIC / VISUALLY RICH BACKGROUND: The photo must have a genuinely attractive, colorful real setting behind the nearby subject; a blank wall, empty hallway, plain beige room or generic sofa backdrop is a failed result. Use a distinct setting anchor—such as a vivid cafe patio, flowering garden, colored tile, premium lounge upholstery, reflective glass storefront, modern courtyard or textured city terrace—plus one or two believable depth details. Make background colors rich and naturally saturated, with clear contrast against the outfit, while keeping skin color accurate and the person prominent. Background should be visibly readable in the frame, not reduced to a blurred color wash. Keep the setting believable and casually photographed, with realistic object scale, floor contact, reflections and shadow direction. Vary the venue and dominant background color between batch images. Take only general photo qualities from the supplied public-profile research; do not copy any creator\'s face, body, exact pose, clothes or composition. An explicit user location or location reference remains binding.';
  function describeShot(shot) {
    return `SETTING: ${shot.location}\nLIGHT: ${shot.lighting}\nPOSE: ${shot.pose}\nFRAMING: ${shot.framing}`;
  }
  function planner({target,figureRule,variations,count}) {
    return `Write a JSON text plan with exactly ${count} creative briefs for a separate image renderer. Do not create images yourself. The briefs should convey natural, striking Indian/Pakistani fashion-blogger Instagram photo styling. Preserve the same referenced person and outfit; do not imitate a celebrity face or invent a nationality.
USER TARGET:\n${target}
${figureRule}
${realism}
${skinRule}
${portraitRule}
${sceneRule}
${interiorRule}
${lightRule}
${captureRule}
Use each starting point below to make its corresponding brief visibly different. The user-requested action, named setting and framing remain binding. For unspecified poses, preserve the selected concrete body action and silhouette; do not turn each brief into a centered, front-facing stance or repeated bed/chair pose. For unspecified settings, choose a clearly colorful, attractive real background and vary its dominant colors and setting anchor across the batch. Keep the subject nearby and prominent, never a distant travel shot. Keep the specified figure natural and the mood confident and attractive. Do not put body-size labels, new measurements or reference-model proportions in scene strings; the extension applies the exact body contract separately.
Keep scene strings focused on action, expression, framing and the real setting. Do not embellish them with lens/aperture recipes, background blur, studio lighting, warm color palettes or post-production effects. Use the shot's specified time and light sources; the shared camera rules control photographic finish.
For an invented home/interior, convey its contemporary premium residential quality and meaningful room detail in the brief; do not collapse the setting to a generic sofa and plain wall. Quality of furnishings does not change the natural iPhone capture rules. Preserve explicit named venues, styles and supplied locations.
${variations.map((shot,i)=>`SHOT ${i+1}\n${describeShot(shot)}`).join('\n\n')}
Return only valid JSON {"prompts":[...]} with exactly ${count} non-empty strings. Each string is a compact scene description of about 40-80 words. Preserve the corresponding pose action and camera framing cue so the outputs have different visible silhouettes and angles. Keep the nearby subject large while showing the colorful, readable background. Leave only incidental hand/finger details and exact venue micro-details to Flow. The exact figure contract and reference map will be applied separately to every image.`;
  }
  function build({target,scene='',figureRule,shot,referenceLock='',referenceMap=''}) {
    return `ONE continuous, full-bleed realistic phone photograph, one person and one moment.
${referenceLock}
${referenceMap}
USER TARGET — binding action, requested setting and framing:\n${target}
${scene&&scene!==target?`PLANNER SCENE SUGGESTION — use only compatible details; discard any conflicting body, location, pose or lighting suggestion. Do not inherit planner-only lens, depth-of-field, color grading or retouching directions; use the shared capture rules below:\n${scene}`:''}
FINAL CLASSIC PHOTO DIRECTION — identity, outfit, realism and explicit user requests override conflicting planner suggestions. The selected pose action and camera composition below are required for this image, not loose inspiration:
${describeShot(shot)}
BATCH VARIETY: This is shot ${shot.variationIndex||1} of ${shot.batchSize||1}. Make its pose silhouette and camera angle clearly different from a generic centered front-facing portrait. If multiple images are requested, do not repeat the same body orientation, arm gesture, seated/standing structure or camera relationship. Keep the selected action recognizable while remaining natural.
${figureRule}
${sceneRule}
${interiorRule}
${realism}
${skinRule}
${portraitRule}
${lightRule}
${captureRule}
FINAL CHECK: Preserve the referenced face and hair, exact written body traits, resolved body build and garment construction. Thick/full settings must remain visibly thick/full even when every outfit reference shows a slim model. Fit the clothes to the specified body; never fit the body to the clothes. Keep natural volume instead of slimming through pose, crop or lens distortion. Invent a fresh, appealing moment from the creative brief; do not mechanically reproduce a preset pose or setting. No added captions, watermarks, collage, illustration or CGI.`;
  }
  const api={figure,shots,remember,planner,build};
  if(typeof module!=='undefined')module.exports=api;else root.ClassicDirection=api;
})(typeof globalThis!=='undefined'?globalThis:this);

````

</details>

### 17.10 Subject Flow prompt engine — exact Direct, Gemini and image contracts

Source: [subject-flow-direction.js](<D:/pfGG/subject-flow-direction.js>)

<details>
<summary>Expand exact subject-flow-direction.js source</summary>

````javascript
/* Subject Flow only. Saved user inputs are never mutated. */
const SubjectFlowDirection = (() => {
  function prepare(value) {
    // Preserve the user's exact wording. Rewriting camera, action, or pose terms
    // here can silently contradict the requested target.
    return String(value || '').trim();
  }

  const VARIATION_CUES = [
    'Choose a distinct, story-appropriate body action and hand placement; keep the requested target unchanged.',
    'Show a different natural moment in the same scene, with a clearly different weight shift and interaction.',
    'Use a fresh, believable action beat that fits the target and setting; do not repeat another image’s pose.',
    'Vary the subject’s body orientation and attention naturally while preserving every target detail.',
    'Capture a new moment in the action with purposeful hands, believable balance, and a distinct silhouette.',
    'Create a meaningfully different candid beat that remains fully consistent with the target and references.'
  ];

  function createVariationSequence(count = 5) {
    const result = [];
    while (result.length < count) {
      const cycle = VARIATION_CUES.slice();
      for (let i = cycle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cycle[i], cycle[j]] = [cycle[j], cycle[i]];
      }
      result.push(...cycle.slice(0, count - result.length));
    }
    return result;
  }

  function directPlan({ count = 5, target = '', system = '', environmentCount = 0 }) {
    const preparedTarget = prepare(target);
    return { prompts: Array.from({ length: count }, () => preparedTarget) };
  }

  function planner({system,target,figure='',count=5,hasEnvironment=false,environmentCount=0}) {
    return `You are the scene planner for Subject Flow. Plan distinct, realistic image variations from the user's actual instructions and attached references. Do not reuse a fixed pose/camera recipe.

MANDATORY PLANNING RULES:
1. USER TARGET REQUEST IS THE PRIMARY AUTHORITY:
   If the user specified an action, pose, framing, or location in USER TARGET (below), you MUST faithfully execute it.
2. WHEN AN ACTION, POSE, OR DETAIL IS NOT EXPLICITLY SPECIFIED:
   Invent a fresh, believable variation that fits the setting and references. Make each image's physical action meaningfully distinct when the target allows it, while preserving continuity.
3. Do not repeat the same pose or action across the batch. Vary the physical beat and interaction when the target leaves them open. The subject's face should remain clearly visible by default; camera gaze is optional and must follow the target when specified.
4. ABSOLUTELY BANNED:
   - DO NOT describe the subject sitting stiffly on the edge of the bed looking down at a phone.
   - DO NOT describe the subject standing stiffly in the kitchen holding a bowl facing the camera.
   - No stiff catalog postures.
5. KNOWLEDGE INTERIOR IS CANONICAL:
   - Every scene in this batch stays in the exact same interior shown by the attached Knowledge reference image(s). Never move the subject to another room, house, venue, or invented interior.
   - Multiple Knowledge references are additional views/details of the same user-selected interior, not separate locations. Do not distribute scenes among different rooms.
   - Preserve recognizable fixed features, furniture, materials, colors, and layout from Knowledge. Reframe only by changing the camera position within that same room; do not invent replacement furniture or architecture.
6. ABSOLUTE BODY SHAPE & FIGURE FIDELITY:
   Every single planned variation MUST strictly maintain the subject's exact written figure, curves, and body proportions:
   ${figure.trim() ? `EXACT FIGURE LOCK:\n   ${figure.trim()}` : 'Preserve the exact body build and curves described in the instructions.'}
   - NEVER describe or imply a thin, slim, flat, or androgynous catalog model body.
   - Poses, weight shifts, and clothing drape MUST actively respect and fit this exact figure (garments hugging curves, realistic fabric stretch across bust, waist, and hips).
7. HAIR TEXTURE OVERRIDE:
   Do not give the subject curly hair. Keep the hair's other natural texture and appearance unchanged.

USER BASE INSTRUCTIONS (Permanent Rules & Setting):
${prepare(system)}

USER TARGET IMAGE PROMPT (PRESERVE EXACTLY; MANDATORY PRIMARY ACTION & SCENE):
${prepare(target)}

${figure.trim()?`MANDATORY FIGURE DETAILS (CANONICAL BODY):\n${figure.trim()}`:'Preserve the body details written in base and target.'}

Return ONLY valid raw JSON {"prompts":[...]} with exactly ${count} non-empty strings. No markdown or commentary.`;
  }

  function build({system='',target='',scene='',figure='',roles=[],hasEnvironment=false,hasQuality=false,flowReferenceMap='',variation=''}) {
    const preparedSystem = prepare(system);
    const preparedTarget = prepare(target);
    const preparedScene = prepare(scene);
    const cleanFigure = figure.trim() || 'No additional figure details specified; follow the identity reference naturally.';

    return `ONE coherent photorealistic candid image in the location requested by the user.

USER TARGET IMAGE REQUEST — HIGHEST PRIORITY, PRESERVE VERBATIM:
${preparedTarget}
${preparedScene && preparedScene !== preparedTarget ? `GEMINI SCENE EXPANSION — USE ONLY DETAILS THAT DO NOT CONFLICT WITH TARGET:\n${preparedScene}\n` : ''}
USER BASE INSTRUCTION (APPLY ONLY WHERE IT DOES NOT CONFLICT WITH TARGET):
${preparedSystem}

ACTION, FRAMING & VARIETY:
Follow the target's requested action, pose, framing, expression, gaze, and location exactly. Gemini expansion is subordinate and must never replace or reinterpret any of those details. If the target leaves the pose open, use the supplied variation cue to create a distinct, believable action beat. Keep the face clearly recognizable and visible by default, using a natural near-frontal or three-quarter view unless the target requests another view. Do not force eye contact. Maintain physically plausible balance, contact, orientation, and object placement.

${variation}

PHYSICAL REALISM:
Use natural body weight, believable contact with surfaces, and fabric behavior consistent with the action. Preserve the subject's natural hair appearance except for the explicit no-curly constraint. Do not impose a camera gaze, pose, lighting mood, or setting that the target did not request.

KNOWLEDGE INTERIOR — FIXED LOCATION AUTHORITY:
${hasEnvironment ? `The attached Knowledge reference image(s) define the one canonical interior for this whole batch. Keep every image inside that exact same room. Preserve its recognizable fixed furniture, architecture, surfaces, colors, and layout. You may change only the camera position and framing within the room. Do not switch rooms, invent another interior, replace the room with generic home decor, or add unreferenced furniture. If a requested camera angle shows an unseen area, keep it understated and consistent with the visible room; never create a new venue.` : `Use the domestic interior explicitly described by the user. Do not invent a different room or venue.`}

FIGURE, IDENTITY & OUTFIT LOCK:
- PRIMARY FACE ANCHOR: Reference Image 1 strictly defines facial geometry, eyes, nose, lips, jaw, and age. Preserve identifiable features across expressions; do not beautify, average, or replace the face.
- CANONICAL FIGURE LOCK — SUPREME BODY AUTHORITY OVER ALL REFERENCES:
  ${cleanFigure}
  The subject's physical build, bust, waist, hips, and body curves MUST visibly and unmistakably match this exact specification. Garments from outfit references MUST stretch, cling, and drape naturally over this exact body shape.
  CRITICAL: NEVER inherit, copy, or borrow the body proportions or waistline of the model in the outfit reference photos. Outfit photos are for CLOTHING ONLY, NEVER for body shape. Strictly ZERO thin or flat catalog model physique.
- CANONICAL OUTFIT: The PRIMARY CANONICAL OUTFIT reference identified in the EXACT FLOW REFERENCE MAP strictly defines the garments. Use that exact outfit in every image; any supplementary outfit references clarify details of the same outfit only. Preserve garment types, cut, neckline, sleeves, layers, fabric, pattern, colors, footwear, and accessories. Fit those exact clothes over the canonical figure. Gemini scene descriptions cannot replace, omit, or redesign the outfit.

${hasQuality ? `QUALITY & FINISH LOCK — MANDATORY PHOTOGRAPHIC FINISH:
Visibly inherit the photographic texture, realistic available indoor lighting (tube light/lamp), sensor grain/noise, exposure behavior, and unsharpened mobile phone quality of the attached Quality reference image. No AI plastic look, no studio lighting, no glamour polish.` : `FINISH: Raw smartphone camera roll quality with available room light, subtle sensor noise, and real skin texture.`}

${flowReferenceMap ? `${flowReferenceMap}\n` : ''}
NEGATIVE PROMPT: Physically impossible balance or object placement, duplicated/extra limbs, altered identity, altered requested outfit, contradictions of target, studio lighting unless requested, CGI, fake bokeh, plastic skin, split image, collage, watermark.`;
  }

  const contract = `SUBJECT FLOW CANDID SNAPSHOT CONTRACT: Capture an authentic, unposed moment in the room. Body weight presses into surfaces naturally. Follow user base instruction and target request. Expand knowledge room from new camera viewpoints. No posing, no modeling, no camera-ready smiles. Genuine mobile phone camera roll feel.`;

  return { prepare, directPlan, planner, build, contract, createVariationSequence };
})();

if (typeof module !== 'undefined') module.exports = SubjectFlowDirection;

````

</details>

### 17.11 Final background prompt assembly — locks appended after the builders

Source: [background.js](<D:/pfGG/background.js>)

<details>
<summary>Expand exact background.js source</summary>

````javascript
    const referenceLockInstruction = workflowMode === "story"
      ? activeStoryCharacters.length
        ? `NAMED CHARACTER IDENTITY LOCK — ABSOLUTE FACE AUTHORITY: The referenced main cast visible in this panel is ${activeStoryCharacters.map((character) => `"${character.name}"`).join(" and ")}. Match each exact cast name exclusively to its own original identity-reference group and preserve the same canonical facial geometry in every angle, distance, expression, crop, pose, and lighting condition. Facial likeness is more important than cinematic lighting, shot variety, attractiveness, expression, or visual polish. Reproduce each face from its primary original identity photo on every panel; do not rely on the previous generated panel as a face reference. Do not invent, simplify, beautify, idealize, smooth, age-shift, or reinterpret facial details. Keep eye shape and spacing, brow shape, nose bridge and tip, lips, jaw, cheekbones, hairline, complexion, age appearance and distinctive marks unchanged. Supplementary identity photos clarify the same person only. Keep different characters visibly distinct; never blend, average, face-swap, duplicate, or transfer features between them. Outfit references control clothing only and must never contribute a face. Unreferenced supporting NPCs listed by role are allowed, but they must look clearly distinct from the named cast and remain secondary.`
        : `CAST-FREE STORY BEAT: No named protagonist is visible in this panel. Render only the environment, story object, transition, or listed NPCs required by the storyboard. Do not invent, duplicate, or partially reveal a main cast member.`
      : workflowMode === "subject-flow"
      ? `STRICT REFERENCE SEPARATION: Use ${activeSubjectEntries.length} attached subject image${activeSubjectEntries.length === 1 ? "" : "s"} only to preserve the same person's identity; no written figure details means retain that person's natural reference build without invented measurements. The first of ${activeOutfitEntries.length} attached outfit image${activeOutfitEntries.length === 1 ? "" : "s"} is the canonical wardrobe authority and any further outfit views clarify details only; use ${activeKnowledgeMediaIds.length} attached knowledge/environment image${activeKnowledgeMediaIds.length === 1 ? "" : "s"} only as evidence of the selected room and its visible scene facts; and ${activeQualityMediaIds.length} attached quality/aesthetic image${activeQualityMediaIds.length === 1 ? "" : "s"} only for visual finish. Across every batch image preserve the exact garments, colors, fabric, cut, layers, and accessories shown by the primary outfit reference; Gemini's variation text cannot substitute, omit, merge, or redesign any garment. The outfit-reference model contributes clothing only, never identity, body, pose, or background. Preserve the selected room's recognizable furniture and architectural cues where compatible with the target. Do not add unreferenced furniture, props, decor, or people. The target controls the requested action, pose, camera angle, framing, gaze, and composition; reference locks must not override those directions. Never blend reference roles or import a person from any non-subject reference.`
      : `CLASSIC FACE LOCK — TOP IDENTITY PRIORITY: REFERENCE IMAGE 1 is the sole facial identity anchor for this subject and must be reproduced as the same recognizable real person in every variation. Match the face itself, not just broad ethnicity or age: preserve eye shape and spacing, brow shape, nose bridge and tip, lip shape, jawline, cheekbones, hairline, complexion and distinctive marks. Keep facial proportions and age fixed across every pose, expression, camera distance and lighting condition. Expressions may change; facial structure may not. Prefer a clear near-frontal or subtle three-quarter face unless the user's explicit scene requires otherwise. Never beautify, smooth, idealize, average, face-swap, age-shift or invent facial features. Outfit references are clothing-only and their models' faces must be ignored; environment and quality references also have zero authority over identity. Follow the numbered reference map exactly. Written figure details override bodies in all images.`;
    const qualityStyleInstruction = qualityMediaIds.length
      ? `QUALITY / AESTHETIC STYLE LOCK — HIGH VISUAL PRIORITY: Use the reference image(s) labeled QUALITY / AESTHETIC in the numbered reference map as the governing target for photographic appearance. The output must visibly inherit their shared lighting behavior, exposure, contrast, color response, phone/lens character, texture, sharpness falloff, noise/grain, depth behavior, and degree of rawness. Do not merely acknowledge or loosely borrow the style. Apply it strongly while keeping Subject Identity, Outfit, and Knowledge / Environment content unchanged. This reference controls visual finish only; it must not change the user's requested action, gaze, camera angle, crop, pose, or composition.`
      : `QUALITY / AESTHETIC STYLE: No quality reference was supplied; follow the raw candid realism lock.`;
    const physicalLockInstruction = workflowMode === "story"
      ? `STORY BODY REFERENCE RULE: Height and physique notes are optional. ${activeStoryCharacters.map((character) => { const notes=[character.height?`height ${character.height}`:"",character.physique?`physique/features ${character.physique}: preserve these proportions consistently`:""].filter(Boolean).join("; "); return `- ${character.name}: ${notes || "no written figure override; use the primary identity photo as the sole body reference and do not infer extra measurements"}`; }).join("\n")} Only explicitly supplied height or physique notes override the identity photo. Identity photos remain authoritative for facial identity and unspecified body details; outfit photos control garments only.`
      : workflowMode === "subject-flow"
      ? `NON-NEGOTIABLE FIGURE & PHYSIQUE LOCK — ABSOLUTE HIGHEST BODY AUTHORITY (OVERRIDES ALL REFERENCE IMAGES):
EXACT SPECIFIED BODY MEASUREMENTS & PHYSIQUE:
${effectiveFigure || "Distinct, prominent curvy hourglass figure with narrow waist, full bust, and wide voluptuous hips."}
Treat this written physique specification as the CANONICAL BODY SPECIFICATION that strictly governs the generated subject:
- The subject's body build, curves, bust, waist, hips, and physical measurements in this image MUST visibly and accurately match this exact specification.
- The outfit from the outfit reference MUST stretch, conform, and drape naturally over THIS EXACT CURVY/SPECIFIED FIGURE.
- CRITICAL OVERRIDE: NEVER copy, inherit, borrow, or average towards the body shape, waistline, bust, or proportions of the model shown in the outfit reference image. Outfit references control garments ONLY, NEVER the body inside them.
- NEVER slim down, flatten, or replace this figure with a generic thin fashion model.`
      : classicFigureRule;
    const storyOutfitLockInstruction = workflowMode === "story"
      ? `STORY OUTFIT ADAPTATION LOCK — ABSOLUTE WARDROBE AUTHORITY:\n${activeStoryCharacters.map((character) => `- ${character.name}: Use only ${character.name}'s own outfit reference set as one canonical outfit. Preserve every visible construction and design detail exactly. Adapt the garment physically—but never stylistically—to ${character.name}'s locked figure and current action through realistic drape, gravity, stretch, compression, folds, contact, seated bunching, walking movement, and partial occlusion. Never reshape the body to match the outfit-reference model and never replace the outfit with a generic story-appropriate costume.`).join("\n")}\nAcross panels, preserve the same canonical outfit and accessories unless the written chapter explicitly contains a visible wardrobe-change event.`
      : "";
    const finalFigureReminder = workflowMode === "classic" ? "Keep the specified measurements and thick hourglass build with natural garment fit." : physicalDetails || customBodyTuning
      ? `FINAL BODY SHAPE CHECK: The subject's physical build must visibly match the specified body tuning (${effectiveFigure}). Under no circumstances should the subject have a generic thin fashion-model build. Garments must stretch and conform over this exact figure.`
      : "FINAL BODY SHAPE CHECK: Distinct, prominent curvy hourglass figure with narrow waist, full bust, and wide voluptuous hips. Outfits must cling tightly to curves. Strictly NO flat, straight, or thin catalog model physique.";
    let promptText;
    if (workflowMode === "subject-flow") {
      const cameraConflict = /\b(spy|surveillance|cctv|doorbell|peephole|hidden.camera|door.cam)\b/i.test(systemInstruction + " " + plan.prompts[i]);
      const roles = [
        ...activeSubjectEntries.map((_,j)=>j===0?"PRIMARY FACE ANCHOR: exact Subject identity; preserve this person's recognizable facial geometry":"SUPPLEMENTARY VIEW of the same Subject; angle and lighting context only, never an alternate face"),
        ...activeOutfitEntries.map((_,j)=>j===0?'PRIMARY CANONICAL OUTFIT: preserve these exact garments in every image':'SUPPLEMENTARY DETAIL OF THE SAME OUTFIT; clarify construction only, never substitute or redesign'),
        ...activeKnowledgeMediaIds.map(()=>'Room/environment only; ignore people'),
        ...activeQualityMediaIds.map(()=>'Photographic finish only; ignore people, body and layout')
      ];
      promptText = SubjectFlowDirection.build({
        system: systemInstruction,
        target: shortPrompt,
        scene: plan.prompts[i],
        figure: effectiveFigure,
        roles,
        hasEnvironment: activeKnowledgeMediaIds.length > 0,
        hasQuality: activeQualityMediaIds.length > 0,
        flowReferenceMap,
        variation: subjectFlowVariationCues[i] || ""
      });
      // These backend locks must reach Flow after Gemini's scene variation.
      // The Subject Flow builder previously received the visual map but omitted
      // the strict wardrobe/environment authority assembled below, allowing a
      // Gemini variation to override the uploaded outfit or selected room.
      promptText += `\n\n${physicalLockInstruction}\n\n${referenceLockInstruction}\n\n${qualityStyleInstruction}\n\n${finalFigureReminder}`;
      if (i === 0) log(`Subject Flow: streamlined reference-first request; figure source: ${physicalDetails ? 'dedicated figure field' : 'base/target instructions'}. ${promptText.length} prompt characters.`);
      if (cameraConflict) log(`Subject Flow audit ${i + 1}: written input contains surveillance terms; normal candid camera override applied.`);
      if (i === 0 && knowledgeMediaIds.length + qualityMediaIds.length > activeSubjectEntries.length) log("Subject Flow audit: non-identity references outnumber identity views. Faces present in those images may compete with the identity reference; image contents have not been automatically verified.");
      
      await chrome.storage.local.set({[`bb_subject_flow_audit_${i}`]:{createdAt:Date.now(),index:i+1,prompt:promptText,model:flowModel,upscale:params.upscaleEnabled !== false,referenceRoles:refMapLines,cameraConflict}});
    } else if (workflowMode === "story") {
      promptText = StoryEngine.imagePrompt(storyPanel,referenceLockInstruction + flowReferenceMap,physicalLockInstruction,storyBgStyle,aspectRatio,storyTextOverlays && !fixedStoryLettering);
      promptText += `\nCANONICAL CHARACTER DESIGNS: ${JSON.stringify({...plan.designBible,...params.storyDesignBible})}. Registered character notes: ${JSON.stringify(activeStoryCharacters.map(c=>({name:c.name,canonNotes:c.canonNotes,aliases:c.aliases})))}. Preserve these exact designs; do not blend alternate forms or import future-arc changes.`;
      const writtenBodyAuthority = activeStoryCharacters.map(character => `${character.name}: physique ${character.physique || "unspecified; retain reference body"}; height ${character.height || "retain reference height"}`).join("\n");
      promptText += `\n\nFINAL IDENTITY AND BODY PRIORITY — overrides conflicting style or reference-body instructions above:
FACE: Subject identity images alone define each person's exact face. Keep facial proportions, eyes, nose, lips, jaw, hairline, age appearance and distinctive features stable across angles and expressions. Do not beautify, average faces, copy an outfit model, or reinterpret the face from descriptive adjectives. Body changes must not redesign the face.
FIGURE: Written physique and height take precedence over reference-image body shape. ${writtenBodyAuthority}
OUTFIT: Outfit images control clothes only; fit those exact clothes to the written body through natural drape, never reshape the body to fit the outfit model. Outfit notes: ${activeStoryCharacters.map(character=>`${character.name}: ${character.outfitNotes || "none"}`).join("; ")}. Knowledge/style images cannot contribute identity or physique. Preserve these roles in every output.
REFERENCE PAIRING: ${storyReferenceAssignments.join("; ") || "No named character is visible in this shot."} Keep each face and garment paired to the same exact character name. Never transfer, exchange, merge, or borrow an outfit or face across characters.`;
      promptText += storyBgStyle === 'webtoon'
        ? `\n\nFINAL STORY FRAME TEXT BAN: Render no text, captions, bubbles, logos or watermarks. ${fixedStoryLettering?'The extension adds the exact narration and dialogue afterward. Compose natural low-detail negative space above the cast and beside each speaker for that lettering; keep faces, hands and important props outside those spaces. Continue the illustrated environment behind them, with no pre-drawn boxes.':''} EXPORT GUTTER: Keep the bottom 6% of the image pure white, empty of all artwork, people, props and text. Keep the complete scene above that gutter; never cut faces, bodies, action or important objects at the edge.`
        : storyTextOverlays
        ? `\n\nFINAL IN-IMAGE LETTERING AUTHORITY: The image model must draw the exact narration and dialogue supplied above as part of the generated artwork. This instruction overrides any generic no-text wording in earlier prompt sections. Copy every line verbatim and legibly; add no other writing. Never add a separate post-generation overlay.`
        : `\n\nFINAL STORY FRAME TEXT BAN: Render absolutely no text or writing anywhere in the frame. No letters, words, numbers, subtitles, captions, speech/thought bubbles, logos, watermarks, UI, labels, readable signs, book pages, screens, or graphic overlays.`;
      promptText += storyBgStyle === "webtoon" ? '\nFINAL LIGHTING: Preserve the selected art reference and the chapter weather/time consistently.' : storyBgStyle === "photorealistic"
        ? `\n\nFINAL LIGHTING OVERRIDE: Use natural, realistic ambient lighting appropriate to the scene's stated weather and time. Ordinary daylight is allowed where the story calls for it. Keep natural colors, true-to-life skin and neutral white balance; no artificial god rays, sunbeams, fake lens flare or stylized grading.`
        : `\n\nFINAL LIGHTING OVERRIDE: NO SUN OR DIRECT SUNLIGHT. This overrides any sunshine or golden-hour wording in the story beat or scene description. For exteriors use overcast grey/diffused ambient light; for interiors use subdued practical fixtures. No sunlit ground, window sun patches, visible sun, sunbeams, rays, god rays, volumetric shafts or lens flare.`;
      if (storyBgStyle === "photorealistic") promptText += `\n\nFINAL NATURAL PHOTO LOOK: Match a clean, unedited photorealistic camera image with neutral white balance and normal contrast. Explicitly exclude added warm/orange tint, amber wash, film grain, digital noise, vignette, bloom, fake bokeh, teal-orange grade, cinematic LUT, smoky haze, plastic smoothing or stylized post-processing. Preserve real materials, skin texture and accurate object colors. ${storyTextOverlays?"Render only the exact requested narration/dialogue lettering within the image.":"Include absolutely no writing or text."}`;
    } else {
      promptText = ClassicDirection.build({
        target:shortPrompt,
        scene:generationEngine === "gemini" ? plan.prompts[i] : "",
        figureRule:classicFigureRule,
        shot:classicShots[i],
        referenceLock:referenceLockInstruction,
        referenceMap:flowReferenceMap
      });
      queueState[i].classicShot = {pose:classicShots[i].poseId,setting:classicShots[i].id,crop:classicShots[i].cropId};
      if(i===0)log("Classic: fresh pose silhouettes, attractive real backgrounds and natural unfiltered light; recent shots avoided, exact figure and references preserved.");
    }
    if(workflowMode !== 'classic') promptText += workflowMode==='story' ? '\nHAIR: Preserve each character’s canonical hair texture, length and color, including curls when present in the reference or chapter.' : `\n\nHAIR RULE: Do not give the subject curly hair. Keep every other hair detail and natural texture consistent with the reference and the user's request.`;

````

</details>

### 17.12 Story planner, validation, tones, image prompt and copyable scene prompt

Source: [story-engine.js](<D:/pfGG/story-engine.js>)

<details>
<summary>Expand exact story-engine.js source</summary>

````javascript
/* Story Studio 5: plan -> validate -> clean cinematic keyframes. */
const StoryEngine = (() => {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  function requestedPanelCount(source,maxPanels=60) {
    const value=String(source||'');
    const patterns=[
      /\b(?:exactly|make(?: it| sure)?|create|generate|use|do|give me|want|need|have|target|around|about|roughly|approximately|at least|in|with|total of)\s+(?:exactly\s+)?(\d{1,3})\s+(?:storyboard\s+|story\s+)?panels?\b/i,
      /\b(\d{1,3})\s+(?:storyboard\s+|story\s+)?panels?\s+(?:exactly|total)\b/i,
      /\b(?:panel\s+count|number\s+of\s+panels)\s*(?:should\s+be|of|is|:|=)?\s*(\d{1,3})\b/i
    ];
    for(const pattern of patterns){const match=value.match(pattern);if(match){const count=Number(match[1]);if(Number.isInteger(count)&&count>=4)return Math.min(count,maxPanels);}}
    return null;
  }
  function minimumPanelCount(source,maxPanels=60) {
    const words=(String(source||'').match(/[\p{L}\p{N}’'-]+/gu)||[]).length;
    return Math.min(maxPanels,Math.max(8,Math.ceil(words/75)));
  }
  function rect(value,label) {
    if (!value || !['x','y','w','h'].every(key => Number.isFinite(value[key]))) throw Error(`${label}: missing numeric rectangle`);
    const {x,y,w,h}=value;
    if(x<.02 || y<.02 || w<=0 || h<=0 || x+w>.98 || y+h>.98) throw Error(`${label}: rectangle outside safe image edges`);
    return {x,y,w,h};
  }
  function prompt(brief,cast,maxPanels,bgStyle='crime-noir',textOverlays=false,inputMode='brief',requestedPanels=null,minimumPanels=8) {
    const simpleNarration=inputMode==='novel'&&bgStyle==='webtoon';
    const sourceNarration=simpleNarration
      ?'Turn descriptive paragraphs and internal thoughts into clear, natural Webtoon narration and expressive reaction panels. Keep the original emotion, suspense and reasoning, but explain them with everyday words and short, direct sentences. Preserve the meaning and useful context without ornate language or vague summaries.'
      :'Capture the core dramatic power of the author\'s prose by turning descriptive atmospheric paragraphs and internal thoughts into rich, evocative Webtoon visual narration and expressive reaction panels. Webtoon narration must carry the emotional and psychological weight of the novel (atmospheric tension, suspense, tactical assessments, and inner monologues) rather than dry 5-word summaries.';
    const sourceInstruction=inputMode==='novel'
      ?`SOURCE MODE: ADAPT A COMPLETE NOVEL CHAPTER INTO A WEBTOON STORYBOARD. Treat the pasted chapter as canon, not as loose inspiration. Preserve its event order, cause and effect, reveals, relationships, character motivations, important objects and consequences. Do not invent, remove, merge or reorder plot events. ${sourceNarration} Preserve distinctive dialogue and its speaker; lightly shorten only when needed to fit a readable speech bubble without changing meaning. Use clear establishing shots, action beats, close reactions and purposeful pauses so the result reads like a paced Webtoon chapter (e.g. Solo Leveling, Omniscient Reader). The supplied cast list and identity/outfit references define the main characters; match the novel's character names to those exact cast names.`
      :'SOURCE MODE: BUILD A COMPLETE STORY FROM THE USER\'S BRIEF. Expand it into a coherent beginning, escalation, choice and payoff while respecting the named cast and story facts.';
    const toneInstruction=bgStyle==='webtoon'
      ?'Use polished cinematic Webtoon illustration with confident, consistent ink contours, expressive acting, realistic anatomy and detailed environments. Do not impose a dark, noir, muted, warm, cool, or other fixed palette or lighting mood. When an art-style reference is attached to each image request, it is the authority for the entire visual treatment—including linework, palette, color intensity, shading, contrast, lighting mood and cinematic tone—and must be matched consistently panel to panel. Character identity and outfit references remain authoritative. Keep the story\'s stated weather, time and physical light sources.'
      :bgStyle==='photorealistic'
      ?'Use neutral, clean ungraded photorealism like a normal camera photo: accurate natural color and white balance, realistic skin and fabric, true scene-appropriate ambient exposure. No warm/orange color cast, amber wash, film grain, sensor noise, vignette, bloom, fake bokeh, cinematic LUT, teal-orange grade, smoky haze or stylized effects. Natural daylight is allowed only when appropriate to the story weather and time. Preserve clear landscape coverage and story action.'
      :bgStyle==='warm-drama'
      ?'Use a gentle, grounded character-drama mood with natural skin tones, modest warmth and soft motivated practical light; avoid exaggerated color grading. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.'
      :bgStyle==='grounded-thriller'
      ?'Use grounded suspense, natural color, restrained contrast and quiet tension without stylized effects. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.'
      :'Use brooding prestige crime-drama atmosphere: quiet menace, industrial texture, smoky rooms and deliberate shadows, without copying any specific series sets, shots, characters or costumes. Keep exteriors overcast grey or dim diffused ambient light only and interiors lit by practical lamps; no visible sun, sunbeams, god rays or lens flare.';
    const sample={version:4,title:'Story title',chapter:'Complete connected short-film story',panels:[{
      id:1,beat:'A courier arrives with an unexpected message',location:'Rain-dark railway platform',time:'blue hour',carry:'A sealed envelope is still in the courier’s left hand',worldState:'Same green-tiled platform, iron columns, analog clock, wet ground and neutral practical platform lamps; sealed cream envelope in courier’s left hand; no other props change.',transitionIn:'Opening shot; establish the platform and courier.',transitionOut:'Courier holds the envelope out; protagonist begins reaching with the right hand.',
      shot:'establishing',angle:'wide, eye-level, clean straight-axis view',angleReason:'A wide establishing frame introduces the station and the distance between them.',action:'The protagonist notices the courier across the platform',emotion:'Guarded curiosity',
      cast:[{name:'Exact name',pose:'Still beside the platform clock',gaze:'courier',bounds:{x:.62,y:.22,w:.25,h:.66}}],
      ...(textOverlays?{narration:'The last train was already gone.',dialogue:[{speaker:'Exact name',text:'Then we leave on foot.'}]}:{}),
      vehicles:[],npcs:[],visual:'Layered platform depth, practical lamps, wet concrete, restrained smoke and a readable silhouette',
      sceneId:'station-platform',sceneDescription:'Old iron columns, green tile, analog clock, wet concrete and neutral practical platform lamps'
    }]};
    const overlayNarration=simpleNarration
      ?'For each panel write one clear, easy-to-read narration line and up to two short dialogue entries as exact visible text, in the user\'s language. Narration: State the needed story context, inner thought, decision or sense of danger in simple, natural language. Use familiar words and one clear idea at a time. Keep the source meaning, emotion and useful details; avoid poetic metaphors, abstract wording and long, complicated sentences. Keep each narration line between 30 and 160 characters, readable at a glance without sounding childish or adding filler.'
      :'For each panel write one evocative, high-impact Webtoon narration line and up to two short dialogue entries as exact visible text, in the user\'s language. Narration: Craft authentic Webtoon/Manhwa narration that captures the novel\'s inner monologue, tactical calculations, environmental dread, or dramatic narrative beats (e.g., Solo Leveling / Omniscient Reader style). Do NOT reduce the author\'s prose to bland, generic 5-word summaries. Narration should give vital story context, reveal a character\'s hidden thoughts, describe the suffocating atmosphere, or highlight an impending turning point. Keep each narration line between 30 and 160 characters—concise enough for a clean manhwa caption card, but rich with drama and weight.';
    const narrationStyle=simpleNarration
      ?'Write narration that is easy to understand on the first read, in the user\'s language. Use everyday words, short direct sentences and clear connections between cause and effect. Express the original feelings, suspense, inner thoughts and tactical reasoning plainly. Avoid ornate metaphors, philosophical filler, dense clauses and artificially grand phrasing. Preserve the narrator\'s viewpoint and tense, exact names, lore terms, facts and intended meaning. Do not invent thoughts, add slang or oversimplify important details. Simplify only narration wording; keep dialogue and visual/art direction under their existing rules.'
      :'Tell the story with the dramatic intensity and cinematic pacing of a world-class Webtoon. Write in natural, vivid language in the user\'s language. Use evocative, atmospheric phrasing for narration rather than dry catalog descriptions. Let narration deliver genuine psychological depth, inner monologue, or suspense that elevates the visible artwork.';
    const overlayInstructions=textOverlays
      ?`OPTIONAL IN-IMAGE WEBTOON LETTERING IS ON. ${overlayNarration} Dialogue: Dialogue must sound sharp and authentic to each specific character, moving the scene forward without repeating earlier lines or restating what the narration already said. Keep each dialogue line under 90 characters. Store the speaker name only as internal metadata so the balloon can be placed by the correct visible character; NEVER include the character name or a speaker label in the visible bubble text. The extension will typeset the narration and dialogue verbatim with a fixed font and fixed card/bubble shapes after generating clean artwork. Text gutters expand to preserve complete text without covering the art. Never request the image model to render lettering.`
      :'OPTIONAL IN-IMAGE WEBTOON LETTERING IS OFF. Do not include narration or dialogue text; generated keyframes remain completely text-free.';
    return `You are a feature-film visual storyteller and cinematographer. Return raw JSON only, using this schema: ${JSON.stringify(sample)}
STORY / SCENE FEED: ${brief}
${sourceInstruction}
CHARACTER TAGS: Names written as @Character in the feed identify who must participate in that beat. Preserve those exact supplied names. A tagged character is not automatically in every shot; use the story context and the tag's immediate beat.
CAST REFERENCE BIBLE: ${JSON.stringify(cast)}
CAST SIZE AND PANEL COVERAGE: The cast list may contain any number of registered characters. Do not drop, merge, rename, or forget characters because the cast is large. Each frame can carry only a limited number of identity and outfit references, so show no more than four registered cast characters in one panel. When a story beat involves a larger group, cover it with several directly connected panels (establish the group, then use motivated two-shots and close reactions) so every story-relevant character remains present in the sequence and identities/outfits stay correctly paired. Do not turn a registered character into an NPC to bypass this limit.
${overlayInstructions}
${textOverlays?'DIALOGUE SPEAKERS: Use the exact visible cast name or the supporting NPC name/role. If a voice comes from outside this shot, retain its exact dialogue and add offscreen:true to that dialogue entry. Do not add a visible person just to give an off-screen voice a bubble. Off-screen voice bubbles have no directional tail.':''}
LANGUAGE AND NARRATION STYLE: ${narrationStyle} Make each panel's narration and dialogue distinctly purposeful; never reuse identical lines or generic filler. Dialogue should feel natural, crisp, and conversational. Speaker names are storyboard metadata only; never write a character name as part of the words inside a speech bubble.
${requestedPanels?`USER-REQUESTED PANEL COUNT — EXACT: Return exactly ${requestedPanels} panels, no fewer and no more. The user explicitly requested this count; do not replace it with your own shorter estimate. Give every panel a distinct story beat and preserve the full event sequence.`:`PANEL DENSITY: Return at least ${minimumPanels} panels and up to ${maxPanels} only if the story needs them. Do not compress separate actions, reactions, reveals, decisions, dialogue turns, travel beats, or consequences into one frame. One panel captures one frozen moment, not a sequence of actions. Expand the complete story at a clear beat-by-beat pace; never arbitrarily stop at 10–12 panels. Every panel must advance the story or give a purposeful reaction, reveal, pause, or continuity view—never pad with duplicate shots.`}
Write a focused, complete story in the user's language, then translate it into chronological cinematic keyframes.${requestedPanels?` Use exactly ${requestedPanels} panels.`:` Use the number of panels the chapter genuinely needs, with the panel-density minimum above.`} Make the story build from a clear setup through escalation and choice to a satisfying payoff. Each frame is a legible film shot. Use conventional coverage: mostly eye-level straight-axis or subtle three-quarter views, stable two-shots, clean over-the-shoulders, close reactions, and story-relevant inserts. Include at least two intentional close-up shots of named characters when they are present: use them for an emotional reaction, realization, decision, or a crucial detail—not as random zooms. A close-up means a clearly readable face/head-and-shoulders frame, not another medium shot. A profile, hard side view, high/low angle, obstructed view, or unusual perspective is exceptional: use it only when the action clearly needs it, explain that reason in angleReason, and use no more than one such shot in this sequence. Never add an angle just to create variety. No dutch/canted tilt, slanted horizon, extreme perspective, arbitrary side view, or camera peeking from behind an object. Keep faces clearly visible in character shots. Keep screen direction, prop hands, positions, eye-lines, relative heights, weather, time and geography continuous. Carry is the concrete state inherited from the previous frame.
Every adjacent pair must be directly connectable as consecutive moments of one continuous take or a motivated film cut: explicitly state transitionIn (how this frame begins from the prior frame) and transitionOut (the exact pose/action/prop state that leads to the next frame). Also give every panel a concise worldState: inventory and visual state of all story-relevant recurring objects, vehicles, set dressing, weather, damage, and their exact positions/owners/holders. Keep recurring objects visually identical (same make, color, shape, damage, contents and orientation) and keep locations, background landmarks, weather and practical lights stable while the scene remains there. An object may move, change hands, be used, damaged or disappear only when the story explicitly shows that change; update worldState and carry the result into all later panels. Never silently add, remove, duplicate, redesign, teleport or swap a prop or vehicle. Preserve positions, screen direction, eye-lines, hand holding, vehicle lane, seat assignments, wardrobe, lighting and set details across the cut. Advance action in small believable steps; do not reset poses, teleport props, reverse travel direction, or skip consequences. For the first frame, transitionIn establishes the scene; for the last, transitionOut resolves the sequence. Avoid a new angle that breaks geography; use motivated coverage while matching the established axis.
Treat every story-critical vehicle, pursuer, threat, or offscreen action as something the viewer must actually see. For a car chase, allocate enough frames to establish the lead car, clearly show the pursuing car, show the gap closing or chase maneuver, and then show the protagonists' reaction or consequence. Do not merely mention the pursuer in chapter prose, hide it offscreen, or collapse the chase into one confusing frame. Use additional panels up to the limit when the action needs them; every required car should be visually identifiable and spatially consistent.
Every panel must include id, beat, location, time, carry, worldState, transitionIn, transitionOut, shot, angle, angleReason, action, emotion, cast, vehicles, npcs, visual, sceneId and sceneDescription. Each visible cast entry must include the exact name, pose, gaze and normalized bounds. Use shots from: establishing, wide, two-shot, medium, medium-close, close, over-shoulder, insert. Angle is a separate camera instruction; visual describes scene content and must not add a conflicting camera angle.
For any vehicle scene, every panel must have a vehicles array (empty only when no vehicle is part of the scene). Give every recurring vehicle a stable unique id such as lead-car or pursuing-car and repeat it exactly. Record for each: makeModel, bodyType, color, distinctiveStructure, damage, facingDirection, travelDirection, lane, screenPosition, relativePosition, and occupants with exact character names and seats. The first appearance establishes canonical make/model, body type, color, structure and damage; never change these later. Update direction/lane/position only when the story explicitly shows a turn, lane change, pass, stop or collision; otherwise carry them forward. Describe each movement in transitionOut, then match it in the next panel's transitionIn. Camera coverage may change screen position only as a consequence of a stated view/axis change; physical lane, heading and spacing stay consistent. Keep separate cars separate, with stable identities and lead/pursuer relationship. In cabin shots, seats face the windshield, occupants sit upright; the named driver stays at the steering wheel and named passengers stay in assigned seats. Never put anyone sideways, backwards, floating, merged, or in a seat facing the wrong way. Keep steering-wheel side and cabin structure consistent. Do not combine incompatible interior and exterior viewpoints in one frame.
Only exact names in CAST REFERENCE BIBLE may appear in cast. Any other visible person (for example an antagonist, guard, courier, or bodybuilder) must be listed as a supporting NPC in npcs, with a stable name/role, description, action, gaze and normalized bounds. Never treat an NPC as a registered character or attach a registered character's identity/outfit references to them. Identity references define registered faces and, unless the user supplies optional height or physique notes, define body continuity too. Only supplied height/physique notes override the identity photo. Outfit references and outfit notes define registered wardrobe. Never blend identities or use another character's clothing. Keep costumes unchanged across the story unless the plot explicitly includes a wardrobe change. Add no crowd unless the story needs it. Use normalized cast bounds within .02–.98 as approximate composition guidance, with no text-safe zones.
Keep physical locations fixed across reverse angles: repeat the exact same sceneId and sceneDescription for every shot in one place. Change them only when the story physically moves. Show coherent production design, deep foreground/midground/background, believable lens perspective and expressive blocking. ${toneInstruction} Never infer period wardrobe; wardrobe references always win.
${textOverlays?'When in-image lettering is ON, include only the exact narration and dialogue strings defined for that panel; no other readable writing. When it is OFF, keep the frame entirely text-free. Never render logos, watermarks, app UI, notification banners, close buttons, X icons, or text-like marks.':'Keep the frame entirely text-free: no words, captions, logos, watermarks, comic bubbles, borders, split panels, collage, app UI, notification banners, close buttons, X icons, lettering or text-like marks.'} Do not reserve empty margins for text; compose the full scene naturally. Keep faces, hands and story-critical props visible and anatomically plausible. Hair rule: preserve each character's reference and novel hair texture, length and color, including curls. Do not impose a generic hairstyle. ${bgStyle==='webtoon'?'Maintain a polished cinematic Webtoon illustration; follow the attached art reference for its exact mood and tone. Avoid cute, chibi or children\'s cartoon styling.':'Maintain photorealistic cinematic drama, not fashion posing, illustration, anime or a generic glossy poster.'} Before returning, audit story order, tag participation, character/outfit continuity and scene geography.`;
  }
  function panelCountCorrectionPrompt(originalPrompt,currentPlan,requiredCount,exactCount=null) {
    const countRule=exactCount?`The user requested exactly ${exactCount} panels.`:`This storyboard needs at least ${requiredCount} panels to keep its distinct story beats readable.`;
    return `${originalPrompt}\n\nMANDATORY PANEL-COUNT CORRECTION: Your previous storyboard did not satisfy the panel count. ${countRule} Revise the CURRENT STORYBOARD below into the required count. Do not omit or reorder source events. If expanding, split combined actions into their own chronological frozen moments, add necessary reactions, reveals, dialogue turns, travel/action steps and consequences; every added panel must be distinct and useful, with direct continuity to its neighbors. Do not add filler or duplicate shots. Preserve all names, story facts, dialogue meaning, vehicle/prop states, location continuity, and the full schema for every panel. Return the complete corrected JSON only, with ${exactCount?`exactly ${exactCount}`:`at least ${requiredCount}`} panels.\nCURRENT STORYBOARD TO CORRECT:\n${JSON.stringify(currentPlan)}`;
  }

  function validate(raw,characters,maxPanels=20,textOverlays=false,minimumPanels=6,exactCount=null) {
    if(raw?.version!==4 || !text(raw.chapter) || !text(raw.title)) throw Error('Story 4 requires version, title and full chapter');
    if(!Array.isArray(raw.panels)||raw.panels.length<(exactCount?4:6)||raw.panels.length>maxPanels) throw Error(`Story needs ${exactCount?4:6}–${maxPanels} panels`);
    if(exactCount&&raw.panels.length!==exactCount) throw Error(`Gemini returned ${raw.panels.length} panels; the request specified exactly ${exactCount}.`);
    if(!exactCount&&raw.panels.length<minimumPanels) throw Error(`Gemini returned ${raw.panels.length} panels; this story needs at least ${minimumPanels} to preserve its full sequence.`);
    const names=new Map();
    for(const c of characters)for(const alias of [c.name,...String(c.aliases||'').split(',')].map(s=>s.trim()).filter(Boolean)) {
      const key=alias.toLowerCase();
      if(names.has(key)&&names.get(key)!==c.name)throw Error(`Ambiguous character alias: ${alias}`);
      names.set(key,c.name);
    }
    let unusualAngleCount=0;
    const panels=raw.panels.map((p,index)=>{
      const fail=message=>{throw Error(`Panel ${index+1}: ${message}`);};
      for(const key of ['beat','location','time','carry','action','emotion','visual']) if(!text(p[key])) fail(`missing ${key}`);
      if(!['close','medium-close','waist','knees','over-shoulder','detail','establishing','wide','two-shot','medium','insert'].includes(p.shot)) fail('unsupported shot');
      if(!Array.isArray(p.cast)) fail('missing cast');
      const promotedNpcs=[];
      const cast=p.cast.map(c=>{
        const suppliedName=text(c.name);
        const name=names.get(suppliedName.toLowerCase());
        if(!name) {
          if(!suppliedName) fail('unnamed cast entry');
          if(!text(c.pose)||!text(c.gaze)) fail(`supporting person ${suppliedName} is missing pose or gaze`);
          const bounds=rect(c.bounds,`Panel ${index+1} supporting person`);
          promotedNpcs.push({name:suppliedName,role:suppliedName,description:[text(c.description),text(c.physique),text(c.pose)].filter(Boolean).join('; '),action:text(c.pose),gaze:text(c.gaze),bounds});
          return null;
        }
        if(!text(c.pose)||!text(c.gaze)) fail('missing pose or gaze');
        return {...c,name,bounds:rect(c.bounds,`Panel ${index+1} cast`)};
      }).filter(Boolean);
      if(cast.length>4) fail('more than four registered cast characters are visible; split this group beat across connected panels so each person keeps their own identity and outfit references');
      const npcs=[];
      for(const npc of [...(Array.isArray(p.npcs)?p.npcs:[]),...promotedNpcs]) {
        const registered=names.get(text(npc.name||npc.role).toLowerCase());
        if(registered) {
          if(!cast.some(c=>c.name===registered))cast.push({name:registered,pose:text(npc.action)||text(npc.pose)||'present in this beat',gaze:text(npc.gaze)||'scene action',bounds:rect(npc.bounds,`Panel ${index+1} cast`)});
        } else npcs.push(npc);
      }
      if(new Set(cast.map(c=>c.name)).size!==cast.length)fail('the same character appears twice under different aliases');
      if(cast.length>4)fail('more than four registered characters; split the group beat');
      const vehicles=Array.isArray(p.vehicles)?p.vehicles.map(v=>({
        id:text(v.id),makeModel:text(v.makeModel),bodyType:text(v.bodyType),color:text(v.color),
        distinctiveStructure:text(v.distinctiveStructure),damage:text(v.damage)||'none',
        facingDirection:text(v.facingDirection),travelDirection:text(v.travelDirection),lane:text(v.lane),
        screenPosition:text(v.screenPosition),relativePosition:text(v.relativePosition),
        occupants:Array.isArray(v.occupants)?v.occupants.map(o=>({name:text(o.name),seat:text(o.seat)})):[]
      })):[];
      if(!cast.length && !npcs.length && !['detail','insert','establishing','wide'].includes(p.shot)) fail('character required');
      const unusualAngle=/\b(profile|side(?:-on)?|low angle|high angle|dutch|canted|tilt|oblique|from below|from above|behind (?:a|the)|through (?:a|the))\b/i.test(text(p.angle));
      const unusualLimit=1;
      const cameraAdjusted=unusualAngle&&(!text(p.angleReason)||unusualAngleCount>=unusualLimit);
      if(unusualAngle&&!cameraAdjusted) unusualAngleCount++;
      const angle=cameraAdjusted?'eye-level, straight-axis or subtle three-quarter view with faces unobstructed':text(p.angle)||'eye-level, straight-axis view';
      const protectedRegions=(Array.isArray(p.protectedRegions)?p.protectedRegions:[]).map(b=>rect(b,`Panel ${index+1} protected detail`));
      return {...p,id:index+1,cast,npcs,vehicles,angle,cameraAdjusted,unusualAngle:unusualAngle&&!cameraAdjusted,lettering:[],protectedRegions,characters:cast.map(c=>c.name),introType:'none',
        scenePrompt:p.visual,continuity:`${p.location}; ${p.time}; ${p.carry}`,
        blocking:cast.map(c=>`${c.name}: ${c.pose}; gaze ${c.gaze}`)};
    });
    const speakerKey=value=>text(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const speakerNames=new Map([...names].map(([alias,name])=>[speakerKey(alias),name]));
    panels.forEach((panel,pIdx)=>{
      if(!textOverlays){delete panel.narration;delete panel.dialogue;return;}
      panel.narration=text(panel.narration);
      if(panel.narration.length>1200)throw Error(`Panel ${pIdx+1}: narration is too long; split it into another panel without dropping words.`);
      const visibleSpeakers=new Map(panel.cast.map(c=>[speakerKey(c.name),c.name]));
      for(const npc of panel.npcs){
        const speaker=text(npc.name)||text(npc.role);
        for(const alias of [npc.name,npc.role,...String(npc.aliases||'').split(',')])if(text(alias)) {
          const key=speakerKey(alias);
          // An ambiguous shared role must not attach a balloon to the wrong NPC.
          if(!visibleSpeakers.has(key))visibleSpeakers.set(key,speaker);
          else if(visibleSpeakers.get(key)!==speaker)visibleSpeakers.set(key,null);
        }
      }
      panel.dialogue=(Array.isArray(panel.dialogue)?panel.dialogue:[]).filter(line=>text(line?.text)).map(line=>{
        const canonical=speakerNames.get(speakerKey(line.speaker))||text(line.speaker);
        const speaker=visibleSpeakers.get(speakerKey(canonical));
        if(text(line.text).length>1200)throw Error(`Panel ${pIdx+1}: split long dialogue into another panel.`);
        const offscreen=line.offscreen===true||!speaker;
        return {speaker:speaker||canonical||'Off-screen voice',text:text(line.text),...(offscreen?{offscreen:true}:{})};
      });
    });
    panels.forEach((panel,index)=>{
      const previous=panels[index-1], next=panels[index+1];
      panel.worldState=text(panel.worldState)||`${panel.sceneDescription||panel.location}; ${panel.carry}; preserve all visible recurring objects, vehicle details, background landmarks, weather, lighting and their positions from the previous panel unless this action explicitly changes them.`;
      panel.transitionIn=text(panel.transitionIn)||(previous?`Continue from panel ${index}: ${previous.transitionOut||previous.carry}.`:`Opening setup: establish ${panel.location}, ${panel.time}, and the characters' starting positions.`);
      panel.transitionOut=text(panel.transitionOut)||(next?`End on a pose and prop state that leads directly into panel ${index+2}: ${next.action}; carry forward ${next.carry}.`:`Resolve the story beat and hold a clear final pose.`);
    });
    // Keep each recurring vehicle's physical identity fixed while allowing only story-motivated movement.
    const vehicleBible=new Map();
    for(const panel of panels){
      const context=`${panel.beat} ${panel.action} ${panel.visual} ${panel.location} ${panel.carry}`;
      const vehicleMentioned=/\b(car|vehicle|automobile|taxi|truck|lorry|van|chase|pursu)\b/i.test(context);
      panel.vehicleContinuity=vehicleMentioned||panel.vehicles.length>0;
      if(vehicleMentioned&&!panel.vehicles.length){
        if(vehicleBible.size) panel.vehicles=[...vehicleBible.values()].map(vehicle=>({...vehicle,occupants:[...vehicle.occupants]}));
        else {
          const fallbackVehicle=(id,relativePosition)=>({id,makeModel:'same model established at first appearance',bodyType:'same body type established at first appearance',
            color:'same color established at first appearance',distinctiveStructure:'same grille, windows, lights, trim and proportions throughout',damage:'none',
            facingDirection:'forward along the established road direction',travelDirection:'forward along the established road direction',lane:'same established lane',
            screenPosition:'same established screen position',relativePosition,occupants:[]});
          panel.vehicles=[fallbackVehicle('lead-car','lead vehicle; preserve its gap to the pursuing vehicle'),
            ...(/pursu|chase/i.test(context)?[fallbackVehicle('pursuing-car','behind the lead vehicle at the established chase distance')]:[])];
        }
      }
      panel.vehicles=panel.vehicles.map((vehicle,index)=>{
        const id=vehicle.id||`vehicle-${index+1}`;
        const previous=vehicleBible.get(id);
        const movementShown=/\b(turn|turns|turning|swerve|change lane|switch lane|overtake|pass(?:es|ed)?|brake|brakes|braking|stop|stops|stopped|reverse|reverses|collision|crash|hits|strikes|pulls over|accelerate|accelerates|accelerating|u-turn)\b/i.test(`${panel.action} ${panel.transitionIn} ${panel.transitionOut}`);
        const viewChangeShown=/\b(camera|angle|reverse shot|cut to|interior|exterior|wide shot|close-up|overhead|tracking shot|new view)\b/i.test(`${panel.angle} ${panel.transitionIn} ${panel.transitionOut}`);
        const normalized={...vehicle,id,
          makeModel:previous?.makeModel||vehicle.makeModel||'same established vehicle model',
          bodyType:previous?.bodyType||vehicle.bodyType||'same established body type',
          color:previous?.color||vehicle.color||'same established color',
          distinctiveStructure:previous?.distinctiveStructure||vehicle.distinctiveStructure||'preserve established grille, windows, lights, trim and proportions',
          damage:previous?.damage||vehicle.damage||'none',
          facingDirection:previous&&!movementShown?previous.facingDirection:(vehicle.facingDirection||previous?.facingDirection||'same heading as previous panel'),
          travelDirection:previous&&!movementShown?previous.travelDirection:(vehicle.travelDirection||previous?.travelDirection||'same travel direction as previous panel'),
          lane:previous&&!movementShown?previous.lane:(vehicle.lane||previous?.lane||'same lane as previous panel'),
          screenPosition:previous&&!viewChangeShown&&!movementShown?previous.screenPosition:(vehicle.screenPosition||previous?.screenPosition||'same screen position as previous view'),
          relativePosition:previous&&!movementShown?previous.relativePosition:(vehicle.relativePosition||previous?.relativePosition||'same spacing and relationship to other vehicles'),
          occupants:vehicle.occupants.length?vehicle.occupants:(previous?.occupants||[])
        };
        vehicleBible.set(id,normalized);
        return normalized;
      });
    }
    const requiredCloseups=Math.min(2,panels.filter(panel=>panel.cast.length).length);
    let closeupCount=panels.filter(panel=>panel.shot==='close'&&panel.cast.length).length;
    const closeupCandidates=panels.filter(panel=>panel.cast.length&&panel.shot!=='close').sort((a,b)=>{
      const priority=panel=>/react|realiz|discover|decid|fear|shock|understand|betray|hesitat|remember/i.test(`${panel.beat} ${panel.emotion} ${panel.action}`)?1:0;
      return priority(b)-priority(a);
    });
    for(const panel of closeupCandidates){
      if(closeupCount>=requiredCloseups) break;
      panel.shot='close';
      panel.angle='eye-level, subtle three-quarter close-up with the face unobstructed';
      panel.closeupAdjusted=true;
      closeupCount++;
    }
    const scenes=new Map();
    panels.forEach(p=>{
      p.sceneId=text(p.sceneId)||'main-scene';
      if(!scenes.has(p.sceneId)) scenes.set(p.sceneId,text(p.sceneDescription)||p.location);
      p.sceneDescription=scenes.get(p.sceneId);
    });
    const designBible={};
    if(raw.designBible&&typeof raw.designBible==='object'&&!Array.isArray(raw.designBible))for(const [name,design] of Object.entries(raw.designBible)) {
      if(typeof design==='string'&&design.trim()&&name!=='__proto__')designBible[names.get(name.toLowerCase())||name]=design.trim().slice(0,2000);
    }
    for(const p of panels)for(const npc of p.npcs) {
      const name=text(npc.name)||text(npc.role);
      if(name&&name!=='__proto__') {if(!designBible[name])designBible[name]=text(npc.description);npc.description=designBible[name];}
    }
    return {version:4,title:raw.title,chapter:raw.chapter,designBible,panels,prompts:panels.map(p=>p.visual)};
  }
  function imagePrompt(panel,referenceMap,physicalLock,bgStyle,aspectRatio='IMAGE_ASPECT_RATIO_LANDSCAPE',textInImage=false) {
    const framing=aspectRatio==='IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE'?'4:3 landscape':aspectRatio==='IMAGE_ASPECT_RATIO_SQUARE'?'1:1 square':aspectRatio==='IMAGE_ASPECT_RATIO_PORTRAIT'?'9:16 portrait':aspectRatio==='IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR'?'3:4 portrait':'16:9 widescreen landscape';
    const tone=bgStyle==='webtoon'?'When supplied, follow the Webtoon art-style reference exactly for palette, color intensity, contrast, shading and cinematic mood; without one, let the story and scene set the mood in full-color cinematic illustration, with no default dark/noir look':bgStyle==='photorealistic'?'neutral, clean ungraded photorealism; accurate natural color and white balance, normal camera-photo contrast, realistic skin and fabric, no warm/orange cast, film grain, sensor noise, vignette, bloom, fake bokeh, cinematic LUT, teal-orange grade, haze or stylized effects':bgStyle==='grounded-thriller'?'grounded suspense, natural color, controlled tension':bgStyle==='warm-drama'?'warm human drama, natural skin tones, gentle practical light':'brooding prestige crime drama, quiet menace, industrial texture, restrained color and deliberate shadows';
    const lighting=bgStyle==='webtoon'?'When an art-style reference is attached, follow its lighting behavior and tone. Without one, use scene-appropriate cinematic lighting and let the story set the mood. Keep weather and time physically consistent; do not force noir darkness or a fixed color cast.':bgStyle==='photorealistic'?'Use neutral white balance and physically believable ambient exposure appropriate to the stated weather and time; natural daylight is allowed when called for. Keep color temperature true to the scene and avoid added amber warmth, dramatic color casts or artificial lighting effects.':'Exteriors: overcast grey or dim diffused ambient light only. Interiors: low-key motivated practical lamps only. No visible sun, direct sunlight, sunny/golden-hour lighting, sunlit patches, window sunbeams, god rays, volumetric beams, heavenly glow or lens-flare streaks.';
    const photographicDirection=bgStyle==='photorealistic'?'Use natural camera framing and realistic lens perspective, normal camera-photo depth of field, clean detail and balanced exposure; no stylized cinematic lighting or grading.':'Use deliberate cinematic framing, layered depth, practical light sources, expressive shadow and believable lens perspective.';
    const dialogueAssignments=(panel.dialogue||[]).map((line,index)=>`Balloon ${index+1} ${line.offscreen?`is an off-screen voice from ${line.speaker}; use no directional tail and do not add that person to the visible cast`:`is spoken by ${line.speaker}; place it beside that visible character`}, but the balloon must contain ONLY these exact words: “${line.text}” (never print the speaker name or a name label).`).join(' ');
    const letteringInstruction=textInImage?`IN-IMAGE WEBTOON LETTERING — RENDER THESE EXACT WORDS DIRECTLY INSIDE THIS IMAGE, NOT AS A LATER OVERLAY. ${panel.narration?`NARRATION CAPTION CARD (copy verbatim, no edits): “${panel.narration}”. Render this as an authentic Webtoon/Manhwa narration caption box: a sleek, solid black or deep dark slate rectangular card with razor-sharp borders and crisp, high-contrast, bold white/cream lettering, placed unobtrusively at the top margin or bottom corner.`:'No narration card.'} ${dialogueAssignments||'No dialogue balloons.'} Use authentic high-end Webtoon typography: dialogue in clean white rounded speech balloons with dark legible letters; directional tails only for visible speakers, never for off-screen voices. Keep all text clear of faces, eyes, hands, and story-critical action. Do not add speaker names, labels, repeat, paraphrase, omit, or misspell any words. The lettering must be part of the generated artwork itself; no extension overlay will be applied.`:'NO IN-IMAGE TEXT: keep the entire image free of words, letters, numbers, captions, bubbles, logos, and watermarks.';
    const vehicleContext=panel.vehicleContinuity?`\nVEHICLE GEOMETRY LOCK: Render exactly the listed vehicles, retaining each stable id, make/model, body type, paint color, distinctive body structure and damage. Vehicle state for this panel: ${JSON.stringify(panel.vehicles)}. Never redesign a car, change its body shape, color, grille, windows, lights, wheelbase or damage; never duplicate, merge or swap lead and pursuing cars. Preserve each vehicle's front/rear orientation, heading, travel direction, lane, screen position, relative spacing and occupants from this ledger. Alter a position or direction only if this panel's action and transition explicitly show the move. In cabin views, preserve the same steering-wheel side and seat layout; seats face the windshield, people sit upright, named driver stays at the wheel and passengers remain in assigned seats. No sideways/backwards/floating/merged bodies, seat swaps, impossible limbs, or fused interior/exterior perspectives.`:'';
    return `STORY STUDIO 5. ONE full-bleed ${bgStyle==='webtoon'?'cinematic Webtoon illustrated frame':bgStyle==='photorealistic'?'neutral natural photorealistic landscape photograph':'photorealistic cinematic film still'}, one frozen instant, composed for ${framing}. Use the full frame; no reserved caption area. ${letteringInstruction} No app UI, notification/banner/card, close button, X icon, borders, logos, watermark or collage.
SHOT: ${panel.shot}. BEAT: ${panel.beat}. ACTION: ${panel.action}. EMOTION: ${panel.emotion}.
FRAMING AUTHORITY: Obey the planned shot size exactly. For a close shot, frame a clear face/head-and-shoulders reaction; let the face fill the frame and keep the background secondary. Do not widen it into a medium or establishing shot. For a wide/establishing shot, show enough geography to understand the action.
CAMERA: ${text(panel.angle)||'motivated eye-level composition'}. ${photographicDirection} FACE MATCH HAS PRIORITY OVER STYLE: match every visible named character to that character's primary identity photo; preserve exact eye shape and spacing, brows, nose, lips, jaw, cheekbones, hairline, complexion, age and distinctive marks. Do not substitute a generic face or let shadows, color grading, angle, expression or atmosphere redesign facial features. Supplementary photos clarify the same face only.
${vehicleContext}
SCENE: ${panel.visual}
TONE: ${tone}. ${lighting} Tone controls atmosphere only; it never changes a character's face or wardrobe.
${panel.retryKey ? `RETRY ${panel.retryKey}: fresh micro-expression, preserve beat, continuity and any requested in-image lettering.` : ''}
CONTINUITY: ${panel.location}; ${panel.time}; ${panel.carry}. WORLD STATE (high authority): ${panel.worldState}. IN: ${panel.transitionIn}. OUT: ${panel.transitionOut}. Match every recurring object's identity, condition and position, plus background, screen direction, gaze, hand/prop state, vehicle layout, weather and light to the adjacent panel; this is a consecutive moment, not a reset. Change or remove an item only when the action explicitly shows it, then preserve the changed state in later panels.
FIXED PHYSICAL SET ${panel.sceneId}: ${panel.sceneDescription}. Keep materials, floor, architecture, landmarks and lighting direction consistent across reverse angles. Camera movement must not redesign the location.
CAST AND COMPOSITION GUIDES (normalized): ${JSON.stringify(panel.cast)}
VEHICLE LEDGER: ${JSON.stringify(panel.vehicles)}
NPCs: ${JSON.stringify(panel.npcs)}
${panel.safetyRestage?'SAFETY-RESPECTING RESTAGE: Preserve this same story beat, characters, setting, and emotional consequence, but depict it non-graphically and without explicit or disturbing detail. Suggest danger through expressions, distance, soundless environmental clues, or a calm aftermath; do not show gore, exposed injuries, sexual content, or exploitative framing. Do not change the story into a different event.':''}
${textInImage?'Do not add a separate post-generation text overlay; the narration and dialogue above must be rendered as part of this image.':'No text or graphic overlays.'} Use the whole image area naturally; keep faces, bodies, hands and story-critical objects readable.
${physicalLock}
${referenceMap}

Use each named character's own identity and outfit images only. Preserve exact garments, pattern, color, fit, height, physique and face. Adapt drape to current action, do not redesign. Keep gestures and expressions story-driven, never a fashion pose. The selected tone applies only to lighting, production texture and emotional tone; do not invent period clothing. ${lighting} ${bgStyle==='webtoon'?'Output a polished cinematic Webtoon illustration with realistic anatomy and expressive acting. When supplied, follow the art-style reference\'s visual mood and tone; without one, let the story set the mood.':'Output live-action photorealism only: no cartoon, CGI, animation, anime, illustration, painting or stylized rendering.'}`;
  }
  function scenePrompt(panel,bgStyle='crime-noir',textOverlays=false) {
    const cast=panel.cast.map(c=>`${c.name}: ${c.pose}, looking ${c.gaze}`).join('; ');
    const vehicles=panel.vehicles.map(v=>`${v.id}: ${v.makeModel}, ${v.bodyType}, ${v.color}; heading ${v.facingDirection}, ${v.travelDirection}, ${v.lane}, ${v.relativePosition}; damage ${v.damage}`).join('. ');
    const style=bgStyle==='webtoon'?'Cinematic Webtoon illustration; when supplied, let the art-style reference set palette, lighting mood, contrast, ink and shading consistently across panels. Without a reference, let the story set the visual mood; do not force dark/noir treatment.':bgStyle==='photorealistic'?'Neutral ungraded camera-photo realism, accurate white balance and natural skin; no warm color cast, grain, noise, vignette, bloom or cinematic LUT. Allow scene-appropriate ambient daylight.':bgStyle==='warm-drama'?'Warm character drama, natural skin tones and gentle practical lighting; overcast grey exteriors, no sun or sunrays.':bgStyle==='grounded-thriller'?'Grounded suspense, natural color and controlled tension; overcast grey exteriors, no sun or sunrays.':'Brooding prestige crime-drama atmosphere, restrained color, controlled shadows and practical low-key lighting; overcast grey exteriors, no sun or sunrays.';
    const lettering=textOverlays?`Fixed extension lettering, added after the clean artwork: narration card, copy exactly “${panel.narration||'none'}”. ${(panel.dialogue||[]).map((line,index)=>`Dialogue balloon ${index+1} ${line.offscreen?`is an off-screen voice from ${line.speaker}, with no tail; do not add that person to the visible cast`:`belongs beside ${line.speaker}`}, but its visible text is ONLY “${line.text}”; never include the character name or a speaker label.`).join(' ')||'No dialogue balloons.'} Use the shared Story Comic Neue font, dark rectangular narration cards and white speech bubbles in expandable gutters; preserve all artwork and words.`:'The image itself must contain no text, captions, lettering, logos or watermark.';
    return `${bgStyle==='webtoon'?'Cinematic Webtoon illustrated keyframe':'Photorealistic cinematic live-action keyframe'}, ${panel.shot}, ${panel.angle}. ${panel.location}, ${panel.time}. ${panel.action} ${panel.emotion ? `Emotional tone: ${panel.emotion}.` : ''} ${cast ? `Characters: ${cast}.` : ''} World/prop state: ${panel.worldState}. ${vehicles ? `Vehicle continuity: ${vehicles}.` : ''} Beat state: ${panel.carry}. Begin from: ${panel.transitionIn} End on: ${panel.transitionOut} Keep vehicle model, body shape, color, heading, lane, position and spacing unchanged except for explicitly shown movement; preserve recurring props, set, weather and lighting between connected shots. ${panel.safetyRestage?'Retry as a non-graphic, policy-respecting depiction of the same story beat.':''} ${style} ${lettering}`.replace(/\s+/g,' ').trim();
  }
  return {prompt,requestedPanelCount,minimumPanelCount,panelCountCorrectionPrompt,validate,imagePrompt,scenePrompt,overlap};
})();
if(typeof module!=='undefined')module.exports=StoryEngine;


````

</details>

### 17.13 Story library — exact supplied names, aliases and variant assets

Source: [story-library.js](<D:/pfGG/story-library.js>)

<details>
<summary>Expand exact story-library.js source</summary>

````javascript
/* User-supplied visual references. These are editable designs, not official character art. */
const StoryLibrary = (() => {
  const rows = [
    ['sunny','Sunny','Sunless, Lost from Light','Sunny_Sunless.jpg','Sunless'],
    ['sunny','Sunny','Sunless, Lord of Shadows, Lost from Light','Sunny_Lord_of_Shadows.png','Lord of Shadows'],
    ['nephis','Nephis','Changing Star, Neph','Nephis_Changing_Star.jpg','Changing Star'],
    ['cassie','Cassie','Cassia, Song of the Fallen','Cassie_Song_of_the_Fallen.png','Song of the Fallen'],
    ['effie','Effie','Athena, Raised by Wolves','Effie_Raised_by_Wolves.jpg','Raised by Wolves'],
    ['kai','Kai','Nightingale','Kai_Nightingale.png','Nightingale'],
    ['jet','Jet','Master Jet, Soul Reaper','Master_Jet.png','Master Jet'],
    ['mordret','Mordret','Prince of Nothing','Mordret_Prince_of_Nothing.png','Prince of Nothing'],
    ['morgan','Morgan','Morgan of Valor','Morgan_of_Valor.jpg','Valor'],
    ['anvil','Anvil','Anvil of Valor, King of Swords','Anvil_of_Valor.png','Valor'],
    ['ki-song','Ki Song','Queen of Worms','Ki_Song_Queen_of_Worms.png','Queen of Worms'],
    ['madoc','Madoc','Whispering Blade','Madoc_Whispering_Blade.jpeg','Whispering Blade'],
    ['gunlaug','Gunlaug','Bright Lord','Gunlaug_Bright_Lord.jpg','Bright Lord'],
    ['noctis','Noctis','Immortal of Hope','Noctis_Immortal_of_Hope.jpg','Immortal of Hope'],
    ['saint','Saint','Shadow Saint','Shadow_Saint.png','Shadow Saint'],
    ['serpent','Serpent','Soul Serpent','Soul_Serpent.png','Soul Serpent'],
    ['fiend','Fiend','Ravenous Fiend, Scavy, Imp','Ravenous_Fiend_Scavy.jpg','Ravenous Fiend'],
    ['nightmare','Nightmare','Nightmare Steed','Nightmare_Steed.png','Steed'],
    ['nightmare','Nightmare','Nightmare Steed','Nightmare_Variation.jpg','Variation']
  ];
  const presets = rows.map(([entityId,name,aliases,file,variant]) => ({
    id:`shadow-slave-${file}`,entityId:`shadow-slave-${entityId}`,name,aliases,variant,
    series:'Shadow Slave',asset:`assets/characters/shadow-slave/${file}`,
    canonNotes:`Selected visual form: ${variant}. Preserve the supplied design across panels. Use only appearance facts stated in the pasted chapter; do not import later-arc powers, costumes, injuries, age changes or transformations.`,
    outfitNotes:'Use the clothing, armor, accessories or creature surface in this selected reference. Keep its design and colors unless the chapter explicitly describes a change.'
  }));
  function aliases(character) {
    return [character.name,...String(character.aliases||'').split(',')].map(s=>s.trim()).filter(Boolean);
  }
  function checkAliases(characters) {
    const names=new Map();
    for(const character of characters) for(const name of aliases(character)) {
      const key=name.toLocaleLowerCase();
      if(names.has(key)&&names.get(key)!==character.name) throw Error(`Alias “${name}” belongs to two characters. Choose one form or edit its aliases.`);
      names.set(key,character.name);
    }
    return names;
  }
  return {presets,aliases,checkAliases};
})();
if(typeof module!=='undefined')module.exports=StoryLibrary;

````

</details>

### 17.14 Story controls — library actions, drafts and session button behaviour

Source: [story-tools-ui.js](<D:/pfGG/story-tools-ui.js>)

<details>
<summary>Expand exact story-tools-ui.js source</summary>

````javascript
let storyQueueDraft=[],customCharacterPresets=[],savedCastPresets=[],storySessionView=null;
const STORY_TOOLS_KEYS={presets:'bb_character_presets',drafts:'bb_story_queue_drafts',casts:'bb_cast_presets'};
const storyNode=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
async function saveCharacterPreset(character) {
  if(!character.name.trim()||!character.subjects.length||!character.outfits.length)throw Error('Add a name, identity reference and outfit reference before saving a character preset.');
  const preset=structuredClone(character);preset.presetId=character.presetId||crypto.randomUUID();character.presetId=preset.presetId;
  const at=customCharacterPresets.findIndex(p=>p.presetId===preset.presetId);
  if(at<0)customCharacterPresets.push(preset);else customCharacterPresets[at]=preset;
  await chrome.storage.local.set({[STORY_TOOLS_KEYS.presets]:customCharacterPresets});await saveStoryCharacters();
  byId('storyLibrarySeries').value='custom';renderCharacterLibrary();byId('storyLibraryNotice').textContent=`${character.name} saved. Add this same design to any later chapter with one click.`;
}
async function materializeCharacter(preset) {
  let character;
  if(preset.asset) {
    const response=await fetch(chrome.runtime.getURL(preset.asset));if(!response.ok)throw Error('Character reference could not load.');
    const blob=await response.blob();
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
    const record={id:crypto.randomUUID(),name:preset.asset.split('/').pop(),dataUrl};
    character={...newStoryCharacter(),...preset,subjects:[record],outfits:[{...record,id:crypto.randomUUID()}]};
    delete character.asset;
  } else character=structuredClone(preset);
  character.id=crypto.randomUUID();
  return character;
}
async function addLibraryCharacter(preset) {
  const character=await materializeCharacter(preset);
  const existing=state.storyCharacters.findIndex(c=>(character.entityId&&c.entityId===character.entityId)||c.name.trim().toLowerCase()===character.name.trim().toLowerCase());
  if(existing>=0)state.storyCharacters[existing]=character;
  else {
    const empty=state.storyCharacters.findIndex(c=>!c.name.trim()&&!c.subjects.length&&!c.outfits.length);
    if(empty>=0)state.storyCharacters[empty]=character;else state.storyCharacters.push(character);
  }
  await saveStoryCharacters();renderStoryCharacters();renderCharacterLibrary();
  byId('storyLibraryNotice').textContent=`${character.name}${character.variant?` · ${character.variant}`:''} ${existing>=0?'updated':'added'}. Identity and outfit references are paired.`;
}
function refreshCastOptions() {
  const select=byId('storyLibrarySeries'),selected=select.value;
  select.querySelectorAll('[data-saved-cast]').forEach(n=>n.remove());
  for(const preset of savedCastPresets){const option=storyNode('option','',preset.label);option.value=`cast:${preset.id}`;option.dataset.savedCast='true';select.append(option);}
  select.value=selected;
}
async function saveCurrentCast() {
  const characters=state.storyCharacters.filter(c=>c.name.trim()||c.subjects.length||c.outfits.length);
  if(!characters.length)return null;
  const label=`Saved cast · ${characters.map(c=>c.name||'Unnamed').slice(0,2).join(' + ')} · ${new Date().toLocaleString()}`;
  const snapshot={id:crypto.randomUUID(),label,characters:structuredClone(characters)};
  savedCastPresets.push(snapshot);
  for(const character of characters) {
    if(!character.name.trim())continue;
    customCharacterPresets.push({...structuredClone(character),presetId:crypto.randomUUID(),savedLabel:label});
  }
  await chrome.storage.local.set({[STORY_TOOLS_KEYS.casts]:savedCastPresets,[STORY_TOOLS_KEYS.presets]:customCharacterPresets});refreshCastOptions();return snapshot;
}
async function selectStoryCollection() {
  const select=byId('storyLibrarySeries'),value=select.value;
  if(value!=='shadow'&&!value.startsWith('cast:')){renderCharacterLibrary();return;}
  select.disabled=true;
  try {
    let incoming;
    if(value==='shadow') {
      const unique=new Map();for(const preset of StoryLibrary.presets)if(!unique.has(preset.entityId))unique.set(preset.entityId,preset);
      incoming=await Promise.all([...unique.values()].map(materializeCharacter));
    } else {
      const saved=savedCastPresets.find(p=>`cast:${p.id}`===value);if(!saved)throw Error('Saved cast is unavailable.');
      incoming=structuredClone(saved.characters).map(c=>({...c,id:crypto.randomUUID()}));
    }
    const previous=await saveCurrentCast();
    state.storyCharacters=incoming;await saveStoryCharacters();renderStoryCharacters();renderCharacterLibrary();
    byId('storyLibraryNotice').textContent=`${incoming.length} characters loaded automatically.${previous?` Previous characters saved as “${previous.label}”.`:''} Choose alternate forms below when your chapter needs them.`;
  } catch(e){alert(e.message);}finally{select.disabled=false;}
}
function renderCharacterLibrary() {
  const host=byId('storyLibraryList');host.replaceChildren();
  const custom=byId('storyLibrarySeries').value!=='shadow',query=byId('storyLibrarySearch').value.trim().toLowerCase();
  const presets=(custom?customCharacterPresets:StoryLibrary.presets).filter(p=>`${p.name} ${p.aliases||''} ${p.variant||''}`.toLowerCase().includes(query));
  for(const preset of presets) {
    const row=storyNode('article','story-library-item'),img=storyNode('img');img.src=preset.asset?chrome.runtime.getURL(preset.asset):preset.subjects[0]?.dataUrl;img.alt=preset.name;img.loading='lazy';
    const info=storyNode('div');info.append(storyNode('strong','',preset.name),storyNode('small','',preset.variant||preset.savedLabel||preset.aliases||'Custom character'));
    const active=state.storyCharacters.some(c=>preset.entityId?c.entityId===preset.entityId&&c.variant===preset.variant:c.presetId===preset.presetId);
    const add=storyNode('button','',active?'✓ Added':'+ Add');add.type='button';add.disabled=active;add.setAttribute('aria-label',`Add ${preset.name} ${preset.variant||''}`);
    add.addEventListener('click',async()=>{add.disabled=true;try {await addLibraryCharacter(preset);}catch(e){alert(e.message);add.disabled=false;}});
    row.append(img,info,add);
    if(custom){const del=storyNode('button','story-preset-delete','×');del.title=`Delete preset ${preset.name}`;del.type='button';del.addEventListener('click',async()=>{customCharacterPresets=customCharacterPresets.filter(p=>p.presetId!==preset.presetId);await chrome.storage.local.set({[STORY_TOOLS_KEYS.presets]:customCharacterPresets});renderCharacterLibrary();});row.append(del);}
    host.append(row);
  }
  if(!presets.length)host.append(storyNode('p','story-tools-note',custom?'Save a character card as a preset to reuse it here.':'No matching characters.'));
}
function renderChapterDrafts() {
  const host=byId('storyQueueDrafts');host.replaceChildren();
  storyQueueDraft.forEach((draft,index)=>{
    const card=storyNode('details','story-queued-draft');card.open=!draft.source;
    const summary=storyNode('summary','',draft.title||`Queued chapter ${index+2}`);
    const title=storyNode('input');title.placeholder=`Chapter ${index+2} title (optional)`;title.value=draft.title;title.maxLength=160;title.setAttribute('aria-label',`Queued chapter ${index+2} title`);
    const source=storyNode('textarea');source.value=draft.source;source.rows=6;source.maxLength=30000;source.placeholder='Paste the complete next chapter…';source.setAttribute('aria-label',`Queued chapter ${index+2} text`);
    const save=()=>chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:storyQueueDraft});
    title.addEventListener('input',()=>{draft.title=title.value;summary.textContent=title.value||`Queued chapter ${index+2}`;save();});source.addEventListener('input',()=>{draft.source=source.value;save();});
    const actions=storyNode('div','story-delivery-actions');
    const up=storyNode('button','','↑ Move up');up.type='button';up.disabled=index===0;up.addEventListener('click',()=>{[storyQueueDraft[index-1],storyQueueDraft[index]]=[storyQueueDraft[index],storyQueueDraft[index-1]];save();renderChapterDrafts();});
    const remove=storyNode('button','','Remove');remove.type='button';remove.addEventListener('click',()=>{storyQueueDraft.splice(index,1);save();renderChapterDrafts();});actions.append(up,remove);
    card.append(summary,title,source,actions);host.append(card);
  });
  const available=storySessionView?.busy?Math.max(0,4-storySessionView.chapters.length):3;
  byId('addQueuedChapter').disabled=storyQueueDraft.length>=available;
  byId('appendQueuedChapters').hidden=!storySessionView?.busy||!storyQueueDraft.length;
}
function renderStorySession(session) {
  storySessionView=session;byId('storyDelivery').hidden=!session;
  if(!session)return;
  if(state.mode==='story'||session.busy)generationRunning=Boolean(session.busy);syncControls();
  byId('storyDeliveryTitle').textContent=session.pdf?'Your webtoon is ready':`Story collection · ${session.chapters.length} chapter${session.chapters.length===1?'':'s'}`;
  const host=byId('storyChapterProgress');host.replaceChildren();
  session.chapters.forEach((c,i)=>{const row=storyNode('div','story-chapter-status');row.append(storyNode('strong','',`${i+1}. ${c.title}`),storyNode('small','',`${c.status.replaceAll('_',' ')} · ${c.done}/${c.total||'—'} panels`));if(c.error)row.append(storyNode('span','',c.error));host.append(row);});
  byId('storyDeliveryStatus').textContent=session.pdf?`${(session.pdf.size/1024/1024).toFixed(1)} MB · Telegram: ${session.pdf.telegram.replaceAll('_',' ')}${session.pdf.error?` · ${session.pdf.error}`:''}`:session.error||'Completed panels are saved. Temporary failures retry automatically.';
  byId('saveStoryPdf').hidden=!session.pdf;byId('sendStoryPdf').hidden=!session.pdf;byId('sendStoryPdf').disabled=session.busy;
  byId('resumeStory').disabled=session.busy||session.status==='done';
  byId('stopStory').disabled=!session.busy||session.status==='stopping';
  byId('stopStory').textContent=session.status==='stopping'?'Stopping…':'Stop';
  byId('startOverStory').disabled=session.busy;
  byId('startOverStory').title=session.busy?'Stop the current run first':'Replan and regenerate all saved chapters';
  byId('storyRunHint').textContent=session.status==='stopping'?'Saving progress. An image request already sent to Google may finish before the run stops.':session.busy?'Stop saves progress. Resume and Start over become available after it stops.':'Resume keeps completed panels. Start over replans all saved chapters using the same characters and settings.';
  byId('retryUnknownStory').hidden=session.busy||!session.hasUnknown;
  byId('discardStory').disabled=session.busy;renderChapterDrafts();
}
async function storyAction(type,extra={}) {
  const result=await chrome.runtime.sendMessage({type,...extra});if(!result?.ok)throw Error(result?.error||'Story action failed.');
  if('session'in result)renderStorySession(result.session);return result;
}
async function initStoryTools() {
  const saved=await chrome.storage.local.get(Object.values(STORY_TOOLS_KEYS));
  customCharacterPresets=Array.isArray(saved[STORY_TOOLS_KEYS.presets])?saved[STORY_TOOLS_KEYS.presets]:[];
  savedCastPresets=Array.isArray(saved[STORY_TOOLS_KEYS.casts])?saved[STORY_TOOLS_KEYS.casts]:[];refreshCastOptions();
  if(state.storyCharacters.length&&state.storyCharacters.every(c=>c.entityId?.startsWith('shadow-slave-')))byId('storyLibrarySeries').value='shadow';
  if(state.storyCharacters.length&&state.storyCharacters.every(c=>c.entityId?.startsWith('shadow-slave-')))byId('storyLibrarySeries').value='shadow';
  storyQueueDraft=Array.isArray(saved[STORY_TOOLS_KEYS.drafts])?saved[STORY_TOOLS_KEYS.drafts].slice(0,3):[];
  byId('storyLibrarySeries').addEventListener('change',selectStoryCollection);byId('storyLibrarySearch').addEventListener('input',renderCharacterLibrary);
  byId('newLibraryCharacter').addEventListener('click',()=>{byId('addStoryCharacter').click();byId('storyCharacters').lastElementChild?.scrollIntoView({behavior:'smooth',block:'start'});});
  byId('addQueuedChapter').addEventListener('click',()=>{if(storyQueueDraft.length<3){storyQueueDraft.push({title:'',source:''});renderChapterDrafts();chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:storyQueueDraft});}});
  const action=(id,type,extra)=>byId(id).addEventListener('click',async()=>{const button=byId(id);button.disabled=true;try {await storyAction(type,extra||{});}catch(e){alert(e.message);}finally{button.disabled=false;if(storySessionView)renderStorySession(storySessionView);}});
  action('resumeStory','bb_story_resume');action('stopStory','bb_story_stop');action('saveStoryPdf','bb_story_pdf_save');action('sendStoryPdf','bb_story_pdf_send');
  byId('startOverStory').addEventListener('click',async()=>{
    if(!storySessionView||storySessionView.busy)return;
    if(!confirm(`Start all ${storySessionView.chapters.length} saved chapter(s) over? This replans and regenerates every panel using the saved characters/settings and uses new generation credits. Resume continues existing progress instead.`))return;
    const button=byId('startOverStory');button.disabled=true;
    try {await storyAction('bb_story_start_over');}catch(e){alert(e.message);}finally{button.disabled=false;if(storySessionView)renderStorySession(storySessionView);}
  });
  byId('retryUnknownStory').addEventListener('click',()=>{if(confirm('Google may already have charged for an unconfirmed request. Submit those panels again?'))storyAction('bb_story_resume',{confirmUnknown:true}).catch(e=>alert(e.message));});
  byId('discardStory').addEventListener('click',()=>{if(confirm('Clear this saved queue? Save its PDF first if you need it.'))storyAction('bb_story_discard').catch(e=>alert(e.message));});
  byId('appendQueuedChapters').addEventListener('click',async()=>{try {await storyAction('bb_story_append',{chapters:storyQueueDraft});storyQueueDraft=[];await chrome.storage.local.set({[STORY_TOOLS_KEYS.drafts]:[]});renderChapterDrafts();}catch(e){alert(e.message);}});
  renderCharacterLibrary();renderChapterDrafts();
  const result=await chrome.runtime.sendMessage({type:'bb_story_state'});if(result?.ok)renderStorySession(result.session);
}

````

</details>

### 17.15 Story durable jobs — checkpoints, resume, start-over and PDF delivery

Source: [story-jobs.js](<D:/pfGG/story-jobs.js>)

<details>
<summary>Expand exact story-jobs.js source</summary>

````javascript
/* Durable story jobs. Generation checkpoints are written before/after paid requests. */
const StoryJobs = (() => {
  let session=null,busy=false,loaded=false,initializing=null,write=Promise.resolve();
  const key='story-session-v1';
  function view() {
    if(!session)return null;
    return {id:session.id,status:session.status,busy,error:session.error||'',pdf:session.pdf||null,hasUnknown:session.chapters.some(c=>c.panels.some(p=>p.status==='outcome_unknown')),
      chapters:session.chapters.map(c=>({id:c.id,title:c.title,status:c.status,error:c.error||'',done:(c.panels||[]).filter(p=>p.status==='done').length,total:c.plan?.panels.length||0}))};
  }
  async function persist() {
    const snapshot=structuredClone(session);
    write=write.catch(()=>{}).then(()=>storeExportBlob(key,snapshot));await write;
    chrome.runtime.sendMessage({type:'bb_story_session',session:view()}).catch(()=>{});
  }
  async function init() {
    if(loaded)return;
    if(initializing)return initializing;
    initializing=(async()=>{
    session=await readExportBlob(key);loaded=true;
    let changed=false;
    for(const chapter of session?.chapters||[])for(const panel of chapter.panels||[]) {
      if(panel.status==='failed'&&!panel.generation&&panel.error==='Generation stopped before Flow submission.') {
        panel.status='queued';delete panel.error;changed=true;
      }
    }
    if(session&&session.status!=='done'&&!session.error&&session.chapters.some(c=>c.panels.some(p=>p.status==='failed'&&/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(p.error||'')))) {
      session.error='Google Flow rejected image generation (PUBLIC_ERROR_UNUSUAL_ACTIVITY). Progress saved. You can retry or resume now.';
      changed=true;
    }
    if(session&&['running','stopping','exporting'].includes(session.status)){
      session.status='paused';session.error=session.error||'Browser or extension restarted. Resume continues saved panels.';
      for(const chapter of session.chapters)if(chapter.status==='running')chapter.status='paused';
      changed=true;
    }
    if(changed)await persist();
    })();
    try {await initializing;}finally{initializing=null;}
  }
  function sources(params) {
    const extra=Array.isArray(params.storyChapters)?params.storyChapters:[];
    if(extra.length>3)throw Error('Story mode supports the current chapter plus 3 queued chapters.');
    const values=[{source:params.shortPrompt,title:params.storyTitle},...extra];
    return values.map((entry,index)=>{
      const source=String(entry.source||'').trim();
      if(!source||source.length>30000)throw Error(`Chapter ${index+1} needs 1–30,000 characters.`);
      return {id:crypto.randomUUID(),title:String(entry.title||`Chapter ${index+1}`).slice(0,160),source,status:'queued',panels:[],plan:null};
    });
  }
  async function start(params) {
    await init();if(busy||STATE.running)throw Error('A generation is already running.');
    const chapters=sources(params);
    StoryLibrary.checkAliases(params.storyCharacters||[]);
    if(session&&session.status!=='done')throw Error('Resume the saved story or discard it before starting another.');
    const settings=structuredClone(params);delete settings.tgBotToken;delete settings.tgChatId;delete settings.storyChapters;
    session={id:crypto.randomUUID(),status:'running',chapters,settings,designBible:params.storyDesignBible||{},pdf:null};
    // Keep credentials in the existing settings storage, not in the exported job.
    STATE.stopRequested=false;busy=true;
    try {await chrome.storage.local.set({bb_tg_bot_token:String(params.tgBotToken||''),bb_tg_chat_id:String(params.tgChatId||'')});await persist();}
    catch(e){busy=false;throw e;}
    run().catch(fatal);return view();
  }
  async function fatal(error) {
    busy=false;STATE.running=false;session.status='paused';session.error=error.message;
    await persist();setStatus(`Story paused: ${error.message}`);chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
  }
  async function credentials() {
    const saved=await chrome.storage.local.get(['bb_tg_bot_token','bb_tg_chat_id']);
    return {tgBotToken:saved.bb_tg_bot_token||'',tgChatId:saved.bb_tg_chat_id||''};
  }
  async function run() {
    if(!STATE.stopRequested)session.status='running';delete session.error;
    if(!STATE.stopRequested)STATE.stopReason='';
    const keepalive=setInterval(()=>{chrome.runtime.getPlatformInfo().catch(()=>{});},20000);
    try {
      for(const chapter of session.chapters) {
        if(STATE.stopRequested)break;
        if(chapter.status==='done')continue;
        chapter.status='running';delete chapter.error;await persist();
        try {
          if(STATE.stopRequested){chapter.status='paused';if(STATE.stopReason)chapter.error=session.error=STATE.stopReason;break;}
          await runGeneration({...session.settings,...await credentials(),shortPrompt:chapter.source,storyDesignBible:session.designBible,_storyChapter:chapter});
          if(STATE.stopRequested){chapter.status='paused';if(STATE.stopReason)chapter.error=session.error=STATE.stopReason;break;}
          const failed=chapter.panels.filter(p=>p.status!=='done');
          chapter.status=failed.length?'needs_attention':'done';
          if(failed.length)chapter.error=`${failed.length} panel(s) need retry. Saved panels are retained.`;
        } catch(e) {
          chapter.status=STATE.stopRequested?'paused':'needs_attention';chapter.error=e.message;log(`Chapter ${chapter.title}: ${e.message}`);
          const referenceBlocked=['FLOW_UPLOAD_INVALID_ARGUMENT','FLOW_UPLOAD_INVALID_IMAGE','FLOW_UPLOAD_OUTCOME_UNKNOWN','FLOW_UPLOAD_UI_UNAVAILABLE','FLOW_REFERENCE_MAPPING_MISSING','FLOW_TAB_RECOVERY_FAILED'].includes(e.code);
          if(referenceBlocked||/sign.in|auth|quota|unusual.activity|verification/i.test(e.message)){STATE.stopRequested=true;STATE.stopReason=session.error=e.message;chapter.status='paused';}
        } finally {STATE.running=false;await persist();await closeFlowSecurityHelperTab().catch(()=>{});}
      }
      if(!STATE.stopRequested&&session.chapters.every(c=>c.status==='done')) {
        setStatus('Building the complete webtoon PDF…');session.status='exporting';await persist();
        await buildPdf();session.status=STATE.stopRequested?'paused':'done';
      } else {session.status=STATE.stopRequested?'paused':'needs_attention';}
      setStatus(session.status==='done'?'All chapters ready. Save PDF below.':session.error||'Story progress saved. Resume to retry unfinished panels.');
    } finally {
      clearInterval(keepalive);busy=false;STATE.running=false;await persist();chrome.runtime.sendMessage({type:'bb_done'}).catch(()=>{});
    }
  }
  async function savePlan(chapter,plan) {
    chapter.plan=plan;delete chapter.draftPlan;chapter.title=plan.title||chapter.title;
    chapter.panels=plan.panels.map((_,i)=>chapter.panels[i]||{index:i+1,status:'queued'});
    // Existing designs win. Later chapters may add designs but cannot silently redesign them.
    for(const [name,design] of Object.entries(plan.designBible||{}))if(!session.designBible[name])session.designBible[name]=design;
    await persist();
  }
  async function saveDraft(chapter,plan) {chapter.draftPlan=structuredClone(plan);await persist();}
  async function checkpoint(chapter,index,patch) {chapter.panels[index]={...chapter.panels[index],...patch};await persist();}
  async function savePanel(chapter,index,blob,patch={}) {
    const blobKey=`story-panel:${session.id}:${chapter.id}:${index}`;await storeExportBlob(blobKey,blob);
    await checkpoint(chapter,index,{...patch,blobKey,status:'done'});
  }
  async function buildPdf() {
    let blob=await StoryRenderer.pdf(session.chapters,readExportBlob);
    if(blob.size>49*1024*1024)blob=await StoryRenderer.pdf(session.chapters,readExportBlob,{maxWidth:1000,quality:.76});
    const pdfKey=`story-pdf:${session.id}`;await storeExportBlob(pdfKey,blob);
    session.pdf={key:pdfKey,filename:`Story-Studio-${session.id.slice(0,8)}.pdf`,size:blob.size,telegram:'not_sent'};
    await persist();
    if(session.settings.telegramEnabled&&!STATE.stopRequested)await deliverPdf(blob);
  }
  async function deliverPdf(blob) {
    try {
      const {tgBotToken,tgChatId}=await credentials();
      if(!tgBotToken||!tgChatId)throw Error('Add Telegram bot token and chat ID in settings, then tap Send PDF.');
      if(blob.size>49*1024*1024)throw Error('PDF exceeds Telegram’s 50 MB bot limit. Use Save PDF for the complete file.');
      await sendImageToTelegramWithRetry(tgBotToken,tgChatId,blob,session.pdf.filename,`${session.chapters.length} chapters · complete webtoon`,true);
      session.pdf.telegram='sent';delete session.pdf.error;
    } catch(e) {session.pdf.telegram='failed';session.pdf.error=e.message;log(`PDF saved; Telegram delivery: ${e.message}`);}
    await persist();
  }
  async function handle(message) {
    await init();
    if(message.type==='bb_story_state')return {ok:true,session:view()};
    if(message.type==='bb_story_discard') {
      if(busy||STATE.running)throw Error('Stop the current generation before discarding its saved story.');
      session=null;await persist();return {ok:true,session:null};
    }
    if(!session)throw Error('No saved story is available.');
    if(message.type==='bb_story_stop') {
      if(!busy)return {ok:true,session:view()};
      requestGenerationStop();session.status='stopping';
      setStatus('Stopping… saving current progress.');await persist();
      return {ok:true,session:view()};
    }
    if(message.type==='bb_story_start_over') {
      if(busy||STATE.running)throw Error('Stop the running generation first, then choose Start over.');
      const previous=structuredClone(session);
      busy=true;
      try {
        // Preserve the previous collection and its files before replacing the active job.
        await storeExportBlob(`story-history:${previous.id}`,previous);
        session={id:crypto.randomUUID(),status:'running',settings:structuredClone(previous.settings),
          designBible:structuredClone(previous.designBible||{}),pdf:null,
          chapters:previous.chapters.map(c=>({id:crypto.randomUUID(),title:c.title,source:c.source,status:'queued',plan:null,panels:[]}))};
        STATE.stopRequested=false;STATE.retryHandler=null;await persist();
      } catch(error) {session=previous;busy=false;throw error;}
      broadcastQueue([]);setProgress(0);setStatus('Starting all saved chapters over…');
      run().catch(fatal);return {ok:true,session:view()};
    }
    if(['bb_story_panel_save','bb_story_panel_preview'].includes(message.type)) {
      const chapter=session.chapters.find(c=>c.id===message.chapterId),panel=chapter?.panels[Number(message.index)-1];
      if(panel?.status!=='done'||!panel.blobKey)throw Error('This saved panel is unavailable.');
      const blob=await readExportBlob(panel.blobKey);
      if(message.type==='bb_story_panel_preview')return {ok:true,dataUrl:await blobToDataUrl(blob)};
      await downloadLargeBlob(blob,`Story-Studio/chapter-${session.chapters.indexOf(chapter)+1}-panel-${message.index}.${blob.type==='image/jpeg'?'jpg':'png'}`,true);return {ok:true};
    }
    if(message.type==='bb_story_append') {
      if(session.status==='done'||session.status==='exporting')throw Error('This collection is complete. Start a new story collection.');
      const incoming=Array.isArray(message.chapters)?message.chapters:[];
      if(!incoming.length||session.chapters.length+incoming.length>4)throw Error('A collection holds the current chapter plus 3 extra chapters.');
      const added=incoming.map((entry,index)=>sources({shortPrompt:entry.source,storyTitle:entry.title||`Chapter ${session.chapters.length+index+1}`})[0]);
      session.chapters.push(...added);await persist();return {ok:true,session:view()};
    }
    if(message.type==='bb_story_resume') {
      if(busy||STATE.running)throw Error('Generation is already running.');
      if(session.status==='done')return {ok:true,session:view()};
      const unknown=session.chapters.flatMap(c=>c.panels).filter(p=>p.status==='outcome_unknown');
      if(unknown.length&&!message.confirmUnknown)throw Error('A request was interrupted before Google confirmed the result. Check Flow, then use “Retry unconfirmed panels” if you want to submit those panels again.');
      if(message.confirmUnknown)for(const p of unknown){p.status='queued';delete p.generation;}
      STATE.stopRequested=false;session.status='running';delete session.error;busy=true;
      try {await persist();}catch(error){busy=false;session.status='paused';throw error;}
      run().catch(fatal);return {ok:true,session:view()};
    }
    if(message.type==='bb_story_pdf_save') {
      if(!session.pdf)throw Error('Complete all queued chapters first.');
      const blob=await readExportBlob(session.pdf.key);await downloadLargeBlob(blob,session.pdf.filename,true);return {ok:true};
    }
    if(message.type==='bb_story_pdf_send') {
      if(!session.pdf)throw Error('Complete all queued chapters first.');
      if(busy)throw Error('Wait for the story to finish.');
      await deliverPdf(await readExportBlob(session.pdf.key));return {ok:true,session:view()};
    }
    throw Error('Unknown story action.');
  }
  return {start,init,view,handle,savePlan,saveDraft,checkpoint,savePanel,get busy(){return busy;}};
})();

````

</details>

### 17.16 Qid exact prompt builder and submission payload

Source: [popup.js](<D:/pfGG/popup.js>)

<details>
<summary>Expand exact popup.js source</summary>

````javascript
function buildQidSubmissionPrompt() {
  const scene=byId("qidPrompt").value.trim();
  if(!scene)throw Error("Describe the video scene or action first.");
  const subject=byId("qidSubject").files?.[0],outfit=byId("qidOutfit").files?.[0],start=byId("qidStartFrame").files?.[0],clip=null;
  const motion={mirror:"A relaxed mirror outfit showcase with a natural weight shift, one small sleeve or hair adjustment, and a gentle half-turn.",turn:"A slow, controlled three-quarter turn to side profile and back, with small pauses and a steady camera.",hair:"A gentle pose sequence with a small hair adjustment, relaxed shoulder shift, and subtle turn toward the camera.",window:"A quiet window or balcony moment: look toward the view, shift weight naturally, then turn slightly toward camera.",seated:"A seated pose with a subtle posture adjustment, relaxed hand movement, and a small look toward camera.",entrance:"A calm doorway entrance followed by a small turn toward camera and relaxed final pose.",custom:"Follow only the action described in the scene."}[byId("qidMotion").value];
  const explicit=[byId("tuneHeight")?.value.trim()&&`Height: ${byId("tuneHeight").value.trim()}.`,byId("tuneWeight")?.value.trim()&&`Overall build: ${byId("tuneWeight").value.trim()}.`,byId("tuneBust")?.value.trim()&&`Bust/chest: ${byId("tuneBust").value.trim()}.`,byId("tuneWaist")?.value.trim()&&`Waist: ${byId("tuneWaist").value.trim()}.`,byId("tuneHips")?.value.trim()&&`Hips/thighs: ${byId("tuneHips").value.trim()}.`,byId("tuneNavel")?.value.trim()&&`Belly/navel: ${byId("tuneNavel").value.trim()}.`].filter(Boolean).join(" ");
  const prompt=[
    "Create one coherent, realistic short video. Keep the selected subject recognizable and consistent; motion references may guide movement only, never identity.",
    `SCENE: ${scene}`,
    `ACTION: ${motion}`,
    `FRAME: ${byId("qidAspect").value.includes("PORTRAIT")?"Vertical 9:16 portrait":"Horizontal 16:9 landscape"}. Keep the person close or medium-close, prominent, and clearly visible; ignore distant framing.`,
    `FACE: ${byId("qidFace").value==="visible"?(subject?"Keep the selected subject's face visible and consistent with the subject reference.":"Use a fictional, non-identifiable face."):"Keep the face naturally obscured or outside frame."}`,
    `FIGURE: Approximately 56-inch bust/chest and about 56-inch hips. This is a specific bust-and-hip silhouette, not a fat or generally obese body. Keep waist and abdomen natural and reference-consistent; do not enlarge the whole torso to create these proportions. ${explicit} Preserve the same silhouette during motion; do not slim the subject or borrow proportions from the outfit model.`,
    `OUTFIT: ${outfit?"Use the selected outfit reference for the actual clothing design, colors, material and details. Fit and drape the outfit to the specified subject's proportions; the outfit model does not define body shape.":byId("qidDesiStyle").checked?"Use tasteful desi-inspired everyday styling fitted naturally to the specified silhouette.":"Choose simple scene-appropriate clothing fitted naturally to the specified silhouette."}`,
    start?"START FRAME: Match the selected frame's opening composition and clothing continuity, then continue with believable motion.":"Start in a relaxed, believable pose appropriate to the scene.",
    clip?"MOTION CLIP: Use only as movement and camera-rhythm guidance. Do not copy its identity, face, body or outfit.":"Use only the selected image references; no motion clip is attached.",
    "POSE: Make a small continuous action sequence with natural, varied body language; avoid a frozen pose or repeated pose loop. Keep hands, joints, fabric and contact with props plausible.",
    "BACKGROUND: Show a believable, layered real environment with a few clear details such as furnishings, plants, architecture or street texture. Keep it interesting without shrinking the subject into a distant shot.",
    "CAPTURE: Natural phone-video perspective, realistic skin and fabric texture, lively true-to-scene color, natural contrast and saturation. No beauty filter, artificial color grade, plastic skin, extra people, text or logos.",
    byId("qidDesiStyle").checked?"Grounded desi fashion and lifestyle presentation; non-explicit.":"Realistic fashion and lifestyle presentation; non-explicit."
  ].join("\n\n");
  byId("qidOutputPrompt").value=prompt;
  return {prompt,subject,outfit,start,clip};
}
qidGenerateButton.addEventListener("click",async () => {
  if(generationRunning)return;
  try {
    const built=buildQidSubmissionPrompt();
    const references=[];
    for(const [role,file] of [["subject",built.subject],["outfit",built.outfit],["start frame",built.start]]) if(file) references.push({...await imageRecord(file),role});
    generationRunning=true;generationStopping=false;syncControls();
    byId("progressFill").style.width="5%";byId("queueSummary").textContent="Preparing Qid video in Flow…";
    renderQueue([{index:1,type:"video",status:"preparing"}]);
    byId("qidStatus").textContent=`Preparing video · ${references.length} reference image${references.length===1?"":"s"} · 56-inch bust / ~56-inch hips, not a fat build.`;
    const result=await chrome.runtime.sendMessage({type:"bb_qid_generate",prompt:built.prompt,model:byId("qidModel").value,aspect:byId("qidAspect").value,references});
    if(!result?.ok)throw Error(result?.error||"Could not start Qid video generation.");
  } catch(error) { generationRunning=false;syncControls();byId("qidStatus").textContent=error.message;alert(error.message); }
});

````

</details>

### 17.17 Qid native Flow interaction — model discovery and verified submission

Source: [content_flow_video.js](<D:/pfGG/content_flow_video.js>)

<details>
<summary>Expand exact content_flow_video.js source</summary>

````javascript
/* Native Flow video composer. It drives the visible composer and observes its own result. */
(() => {
  const version = "1.0.5";
  if (window.GucFlowVideoNative?.version?.() === version) return;
  const jobs = new Map();
  let armed = null;
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const clean = value => String(value || "").replace(/\s+/g, " ").trim();
  // Material icons contain ligature text (videocam, crop_9_16, etc.).
  // Strip those nodes without losing the actual label next to them.
  const controlText = el => {
    if (!el) return "";
    const copy = el.cloneNode(true);
    copy.querySelectorAll('mat-icon,.material-icons,.material-symbols-outlined,[aria-hidden="true"]').forEach(node => node.remove());
    return clean(copy.textContent);
  };
  const label = el => clean(el?.getAttribute("aria-label") || controlText(el));
  const editor = () => document.querySelector('.ProseMirror[contenteditable="true"]');
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const buttons = () => [...document.querySelectorAll("button")].filter(visible);
  const button = name => buttons().find(el => label(el) === name);
  const modeControls = () => [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="tab"],[role="menuitem"],[role="option"],mat-button-toggle')].filter(el => visible(el) && !(el.tagName === "MAT-BUTTON-TOGGLE" && el.querySelector('button,[role="radio"]')));
  const modeControl = () => modeControls().find(el => /^(?:video\b|text to video\b|image to video\b|ingredients to video\b)/i.test(label(el)));
  const videoModelName = name => /^(?:veo\b|gemini omni\b|omni\b)/i.test(name);
  const videoModelControl = el => videoModelName(label(el)) || videoModelName(controlText(el));
  const modeSelected = el => el?.getAttribute("aria-checked") === "true" || el?.getAttribute("aria-selected") === "true" || el?.getAttribute("aria-pressed") === "true" || el?.getAttribute("data-state") === "checked" || /\b(?:selected|active|checked)\b/i.test(el?.className || "");
  const selectedAgent = () => {
    const agent=button("Agent");
    if(!agent)return null;
    let node=agent;
    for(let depth=0;node&&depth<4;depth++,node=node.parentElement)if(modeSelected(node))return agent;
    return null;
  };
  const controlsEvidence = () => modeControls().slice(0,32).map(el=>({label:label(el),tag:el.tagName,role:el.getAttribute("role"),pressed:el.getAttribute("aria-pressed"),checked:el.getAttribute("aria-checked"),selected:el.getAttribute("aria-selected"),state:el.getAttribute("data-state"),className:String(el.className||"").slice(0,100)}));
  const ingredientsButton = () => buttons().find(el => label(el) === "Add ingredients to the prompt box" || /add ingredients/i.test(label(el)));
  const menuItems = () => [...document.querySelectorAll('[role="menuitem"],[role="option"]')].filter(visible);
  const assetList = () => [...document.querySelectorAll('[role="listbox"]')].find(visible);
  const assetSearch = () => [...document.querySelectorAll("input")].find(el => visible(el) && /search assets/i.test(`${el.getAttribute("aria-label") || ""} ${el.placeholder || ""}`));
  const chips = () => [...document.querySelectorAll('flow-image-ingredient-chip,flow-video-ingredient-chip,[data-testid*="ingredient-chip"]')].filter(visible).map(chip => {
    const id = chip.getAttribute("data-media-id") || chip.querySelector("[data-media-id]")?.getAttribute("data-media-id");
    if (id) return id;
    const src = chip.querySelector("img,video")?.currentSrc || chip.querySelector("img,video")?.src || "";
    return src.match(/\/(?:image|video|media)\/([^/?]+)/)?.[1] || "";
  }).filter(Boolean);
  const fileStem = value => String(value || "").normalize("NFC").replace(/[\u200b-\u200d\ufeff]/g, "").trim().replace(/\.[^.]+$/, "");
  function check(job) {
    if (job.cancelled) throw Error("Video generation stopped before Flow submission.");
    if (location.origin !== "https://flow.google.com" || location.pathname.match(/\/project\/([\w-]+)/)?.[1] !== job.projectId) throw Error("Flow project changed before video submission.");
  }
  async function wait(job, test, what, timeout = 20000) {
    const until = Date.now() + timeout;
    job.waitingFor = what;
    while (Date.now() < until) { check(job); const value = test(); if (value) { job.waitingFor = null; return value; } await pause(150); }
    throw Error(`Flow video composer: ${what} did not become ready. ${job.clicked ? "Check the Flow project before retrying." : "Nothing was submitted."}`);
  }
  async function click(job, el, what) { const target = await wait(job, () => el(), what); check(job); target.click(); return target; }
  function fill(el, value) {
    if (el instanceof HTMLInputElement) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  async function selectVideoMode(job) {
    // Agent has a separate prompt flow and does not expose the standard Video
    // mode picker. Switch back to the standard composer before touching models.
    const agent = selectedAgent();
    if (agent) {
      agent.click();
      await wait(job, () => !selectedAgent(), "standard prompt composer", 12000);
    }

    // Current Flow puts Mode, model family and aspect in one settings panel.
    // Open it before looking for controls that only exist inside that panel.
    let option = modeControl();
    if (!option && button("Settings trigger")) {
      await click(job, () => button("Settings trigger"), "video settings");
      option = await wait(job, modeControl, "Video mode in Flow settings", 12000);
    }
    if (!option) {
      const visibleControls = () => modeControls().map(label).filter(Boolean).slice(0, 24).join(" · ") || "none";
      const selector = await wait(job, modelControl, `Flow model selector (visible controls: ${visibleControls()})`, 12000);
      if (videoModelControl(selector)) return;
      selector.click();
      await pause(250);
      const controls = visibleControls();
      option = await wait(job, modeControl, `Video option in Flow model menu (visible controls: ${controls})`, 12000);
    }
    if (!modeSelected(option)) option.click();
    await wait(job, () => modeSelected(modeControl()) || (!modeControl() && videoModelControl(modelControl())), "Video mode selection", 12000);
  }
  function modelControl() {
    return modeControls().find(el => /\b(?:select|choose) model(?: family)?\b/i.test(label(el)) && !/settings|more options/i.test(label(el))) || modeControls().find(videoModelControl) || modeControls().find(el => /^nano banana\b/i.test(label(el)));
  }
  function modelOptions() {
    return menuItems().map(el => ({ el, name: label(el) })).filter(item => item.name && !/^(more|back|settings)$/i.test(item.name));
  }
  function wantedModelMatch(option, requested) {
    const name = option.toLowerCase();
    if (!requested || requested === "flow-auto") return false;
    if (requested === "omni-1-2") return /omni\s*1\.2|omni\s*1,2/i.test(name);
    if (requested === "omni-flash") return /omni.*flash|flash.*omni/i.test(name);
    if (requested === "veo-31-fast") return /veo\s*3\.1.*fast/i.test(name);
    if (requested === "veo-31-quality") return /veo\s*3\.1.*(quality|high quality)/i.test(name);
    return false;
  }
  async function chooseModel(job) {
    const current = modelControl();
    if (!current) throw Error("Flow's video model selector was not found.");
    const currentName = controlText(current);
    if (job.model === "flow-auto" && videoModelName(currentName)) {
      job.selectedModel = currentName;
      return;
    }
    current.click();
    const options = await wait(job, () => modelOptions().length ? modelOptions() : null, "available video models", 12000);
    job.availableModels = options.map(item => item.name).slice(0, 24);
    if (job.model === "flow-auto") {
      const available = options.find(item => item.name.toLowerCase() === currentName.toLowerCase());
      if (!available) throw Error("Flow did not expose a selectable video model.");
      job.selectedModel = available.name;
      available.el.click();
      await wait(job, () => !menuItems().length, "video model selection");
      return;
    }
    const matches = options.filter(item => wantedModelMatch(item.name, job.model));
    if (matches.length !== 1) throw Object.assign(Error(`Requested video model is not uniquely available in this Flow account. Available: ${job.availableModels.join(" · ") || "none found"}`), { code: "FLOW_VIDEO_MODEL_UNAVAILABLE", noRetry: true });
    job.selectedModel = matches[0].name;
    matches[0].el.click();
    await wait(job, () => !menuItems().length, "video model selection");
  }
  function exactAsset(reference) {
    const options = [...(assetList()?.querySelectorAll('[role="option"]') || [])].filter(visible);
    const byId = options.filter(el => [el.getAttribute("data-media-id"), ...[...el.querySelectorAll("[data-media-id]")].map(n => n.getAttribute("data-media-id"))].includes(reference.mediaId));
    if (byId.length === 1) return byId[0];
    const byName = options.filter(el => {
      const ids = [el.getAttribute("data-media-id"), ...[...el.querySelectorAll("[data-media-id]")].map(n => n.getAttribute("data-media-id"))].filter(Boolean);
      if (ids.length && !ids.includes(reference.mediaId)) return false;
      return [label(el), el.getAttribute("title"), el.getAttribute("aria-label"), ...[...el.querySelectorAll("[title],[aria-label],.asset-title")].map(label)].some(v => fileStem(v) === fileStem(reference.fileName));
    });
    return byName.length === 1 ? byName[0] : null;
  }
  async function attach(job, reference, index) {
    const before = chips();
    await click(job, ingredientsButton, "Add ingredients");
    const search = await wait(job, assetSearch, "reference search");
    fill(search, reference.fileName);
    const option = await wait(job, () => exactAsset(reference), `exact reference ${reference.fileName}`, 12000);
    option.click();
    await wait(job, () => chips().length > before.length, `reference ${index + 1} attachment`, 30000);
    const now = chips();
    if (now.length !== before.length + 1 || now.at(-1) !== reference.mediaId) throw Object.assign(Error(`Flow attached the wrong video reference at position ${index + 1}. Nothing was submitted.`), { code: "FLOW_REFERENCE_MISMATCH", noRetry: true });
    if (assetList()) { const close = ingredientsButton(); close?.click(); await wait(job, () => !assetList(), "reference picker close"); }
  }
  async function prepare(job) {
    check(job);
    job.events.push({step:"composer_controls_initial",time:new Date().toISOString(),detail:{controls:controlsEvidence()}});
    const promptEditor = await wait(job, editor, "video prompt editor", 45000);
    if (promptEditor.innerText.trim() && promptEditor.innerText.trim() !== job.prompt) throw Error("The Flow project has unsaved composer text. Use a fresh Flow project.");
    await selectVideoMode(job);
    await chooseModel(job);
    // Uploaded references are ingredients; do not inherit a previous Frames
    // selection, which exposes a different attachment UI.
    if (job.references.length) {
      const ingredients = modeControls().find(el => label(el) === "Ingredients");
      if (ingredients && !modeSelected(ingredients)) {
        ingredients.click();
        await wait(job, () => modeSelected(modeControls().find(el => label(el) === "Ingredients")), "video ingredients mode", 12000);
      }
    }
    const aspectLabel = job.aspect === "VIDEO_ASPECT_RATIO_PORTRAIT" ? "9:16" : "16:9";
    const aspectOptions = () => modeControls().filter(el => clean(label(el)) === aspectLabel);
    if (!aspectOptions().length) {
      await click(job, () => button("Settings trigger"), "video preferences");
    }
    const aspect = await wait(job, () => aspectOptions()[0], `${aspectLabel} video frame option`, 12000);
    if (!modeSelected(aspect)) aspect.click();
    await wait(job, () => modeSelected(aspectOptions()[0]), `${aspectLabel} video frame selection`, 12000);
    const singleOutput = modeControls().find(el => label(el) === "x1");
    if (singleOutput && !modeSelected(singleOutput)) {
      singleOutput.click();
      await wait(job, () => modeSelected(modeControls().find(el => label(el) === "x1")), "one video output", 12000);
    }
    if (button("Settings trigger") && aspectOptions().length) button("Settings trigger").click();
    for (const [index, reference] of job.references.entries()) await attach(job, reference, index);
    job.referenceIds = chips();
    if (JSON.stringify(job.referenceIds) !== JSON.stringify(job.references.map(ref => ref.mediaId))) throw Object.assign(Error("The attached references changed before video submission."), { code: "FLOW_REFERENCE_MISMATCH", noRetry: true });
    const target = editor(); target.focus();
    const range = document.createRange(); range.selectNodeContents(target); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    if (!document.execCommand("insertText", false, job.prompt)) throw Error("Flow could not accept the video prompt.");
    await wait(job, () => editor()?.innerText.trim() === job.prompt.trim(), "complete video prompt");
    job.stage = "ready";
  }
  function containsPrompt(value, prompt) {
    // Compare decoded strings: JSON.stringify escapes the newlines and quotes
    // in QID's prepared prompt, hiding an otherwise matching submission.
    if (typeof value === "string") return value.includes(prompt);
    if (Array.isArray(value)) return value.some(item => containsPrompt(item, prompt));
    if (value && typeof value === "object") return Object.values(value).some(item => containsPrompt(item, prompt));
    return false;
  }
  function matchingRequest(body, url, job = armed) {
    if (!job || armed !== job || !String(url || "").includes("batchexecute")) return false;
    try {
      const text = new URLSearchParams(String(body || "")).get("f.req");
      const batch = JSON.parse(text);
      const rows = [];
      const visit = value => {
        if (!Array.isArray(value)) return;
        if (typeof value[0] === "string" && typeof value[1] === "string") rows.push(value);
        for (const child of value) if (Array.isArray(child)) visit(child);
      };
      visit(batch);
      const row = rows.find(item => item[0] !== "ogiZ0b" && containsPrompt(JSON.parse(item[1]), job.prompt));
      if (!row) return false;
      const payload = JSON.parse(row[1]);
      const raw = JSON.stringify(payload);
      if (!job.references.every(reference => raw.includes(reference.mediaId))) return false;
      armed = null; job.submitted = true; job.rpc = row[0]; job.stage = "processing"; job.processingAt = Date.now();
      job.events.push({ step: "video_request_observed", time: new Date().toISOString(), detail: { rpc: job.rpc, references: job.references.length, model: job.selectedModel || "Flow selected" } });
      return true;
    } catch { return false; }
  }
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === "string" ? input : input?.url || String(input);
    const target = armed;
    let requestBody = init?.body;
    let bodyPromise = null;
    if (target && requestBody === undefined && input instanceof Request) { try { bodyPromise = input.clone().text(); } catch {} }
    const matched = matchingRequest(requestBody, url, target);
    const result = originalFetch.apply(this, arguments);
    if (matched) result.then(response => response.clone().text().then(text => { target.httpStatus = response.status; target.responseCharacters = text.length; target.responseText = text.slice(0, 20000); if (response.status < 200 || response.status >= 300) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = `Flow video request returned HTTP ${response.status}.`; } else if (/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = "Flow rejected the video request: " + (text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0] || "account permission or quota error"); } }).catch(() => {}), error => { target.stage = "failed"; target.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; target.error = `Flow video request connection failed: ${error.message}`; });
    else if (bodyPromise) bodyPromise.then(body => { if (matchingRequest(body, url, target)) result.then(response => response.clone().text().then(text => { target.httpStatus = response.status; target.responseCharacters = text.length; target.responseText = text.slice(0, 20000); if (response.status < 200 || response.status >= 300) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = `Flow video request returned HTTP ${response.status}.`; } else if (/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)) { target.stage = "failed"; target.code = "FLOW_VIDEO_REJECTED"; target.error = "Flow rejected the video request: " + (text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0] || "account permission or quota error"); } }).catch(() => {}), error => { target.stage = "failed"; target.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; target.error = error.message; }); }).catch(() => {});
    return result;
  };
  const xhrUrls = new WeakMap(), xhrOpen = XMLHttpRequest.prototype.open, xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) { xhrUrls.set(this, String(url)); return xhrOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function(body) {
    const target = armed, matched = matchingRequest(body, xhrUrls.get(this), target);
    if (matched) this.addEventListener("loadend", () => { const text=String(this.responseText||"");target.httpStatus=this.status;target.responseCharacters=text.length;target.responseText=text.slice(0,20000);if(this.status<200||this.status>=300||/PUBLIC_ERROR_[A-Z0-9_]+|RESOURCE_EXHAUSTED|PERMISSION_DENIED/.test(text)){target.stage="failed";target.code="FLOW_VIDEO_REJECTED";target.error=`Flow video request was rejected: ${text.match(/PUBLIC_ERROR_[A-Z0-9_]+/)?.[0]||`HTTP ${this.status}`}.`;} }, { once: true });
    return xhrSend.apply(this, arguments);
  };
  function resultVideo(job) {
    const videos = [...document.querySelectorAll("video")].filter(el => (el.currentSrc || el.src || el.querySelector("source")?.src) && !job.initialVideoSources.has(el.currentSrc || el.src || el.querySelector("source")?.src));
    const element = videos.find(el => /^https:\/\//.test(el.currentSrc || el.src || el.querySelector("source")?.src || ""));
    if (!element) return null;
    return { url: element.currentSrc || element.src || element.querySelector("source")?.src, duration: Number.isFinite(element.duration) ? element.duration : null };
  }
  function fail(job, error) { job.stage = "failed"; job.error = error.message; job.code = error.code || (job.clicked ? "FLOW_VIDEO_OUTCOME_UNKNOWN" : "FLOW_VIDEO_NOT_SUBMITTED"); if (armed === job) armed = null; }
  window.GucFlowVideoNative = {
    version: () => version,
    begin(config) {
      if ([...jobs.values()].some(job => ["preparing", "ready", "armed", "processing"].includes(job.stage))) return { error: "A Flow video composer is already active." };
      const job = { ...config, stage: "preparing", clicked: false, submitted: false, events: [], initialVideoSources: new Set([...document.querySelectorAll("video")].map(el => el.currentSrc || el.src || el.querySelector("source")?.src).filter(Boolean)) };
      jobs.set(job.id, job); prepare(job).catch(error => fail(job, error)); return { ok: true };
    },
    submit(id) {
      const job = jobs.get(id); if (!job || job.stage !== "ready") return { error: "The Flow video composer is not ready." };
    const generate = buttons().find(el => /^(start generation|generate|generate video|create video)$/i.test(label(el)) && !el.disabled && el.getAttribute("aria-disabled") !== "true");
      if (!generate) return { error: "Flow's video Generate button is not ready." };
      job.clicked = true; job.stage = "armed"; armed = job; generate.click(); return { ok: true };
    },
    status(id) {
      const job = jobs.get(typeof id === "string" ? id : id.id); if (!job) return null;
      if (job.stage === "processing") {
        const result = resultVideo(job);
        if (result) { job.videoUrl = result.url; job.duration = result.duration; job.stage = "done"; }
        else if (Date.now() - job.processingAt > 8 * 60 * 1000) { job.stage = "failed"; job.error = "Flow accepted the request but its video did not appear in the project within 8 minutes. Open the Flow project and inspect it before retrying."; job.code = "FLOW_VIDEO_OUTCOME_UNKNOWN"; }
      }
      return { version, stage: job.stage, clicked: job.clicked, submitted: job.submitted, waitingFor: job.waitingFor || null, error: job.error || null, code: job.code || null, videoUrl: job.videoUrl || null, duration: job.duration || null, selectedModel: job.selectedModel || null, availableModels: job.availableModels || [], rpc: job.rpc || null, httpStatus: job.httpStatus || null, responseText: job.responseText || "", events: job.events.slice(-25) };
    },
    cancel(id) { const job = jobs.get(id); if (job && !job.clicked) { job.cancelled = true; fail(job, Error("Video generation stopped before submission.")); } },
    forget(id) { const job = jobs.get(id); if (job && !["preparing", "ready", "armed", "processing"].includes(job.stage)) jobs.delete(id); }
  };
})();

````

</details>

### 17.18 Shared request admission and security refusal handling

Source: [flow-request-guard.js](<D:/pfGG/flow-request-guard.js>)

<details>
<summary>Expand exact flow-request-guard.js source</summary>

````javascript
/* Shared request spacing; each worker owns its stoppable retry loop. */
const FlowRequestGuard = (() => {
  function create({now=Date.now,wait=ms=>new Promise(r=>setTimeout(r,ms)),stopped=()=>false,onUnusualActivity=()=>{},spacingMs=2000}={}) {
    let nextStart=0,queue=Promise.resolve();
    function check() {
      if(stopped())throw Object.assign(Error('Generation stopped before Flow submission.'),{code:'FLOW_REQUEST_NOT_SUBMITTED',notSubmitted:true,noRetry:true});
    }
    async function ready() {check();}
    // Called only when starting/resuming a run or explicitly retrying an image.
    function resume() {nextStart=0;}
    function admit(action) {
      const task=queue.catch(()=>{}).then(async()=>{
        await ready();
        if(action==='IMAGE_GENERATION'||action==='VIDEO_GENERATION') {
          while(now()<nextStart){check();await wait(Math.min(500,nextStart-now()));}
          check();nextStart=now()+spacingMs;
        }
      });
      queue=task;return task;
    }
    async function rejected(error) {
      if(!/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(`${error?.reason||''} ${error?.message||''}`))return;
      // This is an account/security refusal, not transient capacity pressure.
      // Stop admission synchronously so queued workers cannot submit more work.
      error.noRetry=true;
      onUnusualActivity(error);
    }
    return {ready,admit,rejected,resume};
  }
  const guard=create({
    stopped:()=>typeof STATE!=='undefined'&&STATE.stopRequested,
    onUnusualActivity:()=>{
      if(typeof STATE!=='undefined'&&STATE) {
        STATE.stopRequested=true;
        STATE.stopReason='Flow paused generation after an unusual-activity refusal. Progress is retained; check the Flow account before resuming.';
      }
    },
    spacingMs:8000
  });
  return {...guard,create};
})();
if(typeof module!=='undefined')module.exports=FlowRequestGuard;

````

</details>

### 17.19 Retry decision contract

Source: [flow-retry.js](<D:/pfGG/flow-retry.js>)

<details>
<summary>Expand exact flow-retry.js source</summary>

````javascript
/* Retry only failures that are known not to have produced a generation. */
const FlowRetry = (() => {
  function decision(error, attempt = 1, {download = false} = {}) {
    const message = `${error?.code || ''} ${error?.message || ''}`;
    if (/FLOW_GENERATION_OUTCOME_UNKNOWN|FLOW_UPLOAD_OUTCOME_UNKNOWN|FLOW_UPLOAD_UI_UNAVAILABLE|FLOW_STOPPED|FLOW_TAB_RECOVERY_FAILED|No tab with id\b|Invalid tab ID\b|tab (?:was|has been) closed/i.test(message)) return {retry:false};
    const delayMs=Math.min(45000,3000*2**Math.min(Math.max(0,attempt-1),4));
    // Flow's unusual-activity refusal is an account/security gate, not a
    // transient capacity limit. Repeated submissions can worsen the block.
    if (/PUBLIC_ERROR_UNUSUAL_ACTIVITY/.test(message)) return {retry:false,delayMs,rateLimited:true};
    if (/DAILY_QUOTA|UNSAFE_GENERATION|POLICY_VIOLATION|PERMISSION_DENIED|UNAUTHENTICATED|FLOW_AUTH_REQUIRED|sign.in|verification|INVALID_ARGUMENT|NOT_FOUND|HTTP (400|401|403|404)\b/i.test(message)) return {retry:false};
    const transient = /HTTP 429\b|RESOURCE_EXHAUSTED|\bUNAVAILABLE\b|\bINTERNAL\b|DEADLINE_EXCEEDED/i.test(message);
    if (error?.noRetry && !transient) return {retry:false};
    if (!download && error?.code === 'FLOW_GENERATION_REJECTED' && !transient) return {retry:false};
    return {retry:true, delayMs, rateLimited:/429|RESOURCE_EXHAUSTED/.test(message)};
  }
  return {decision};
})();
if (typeof module !== 'undefined') module.exports = FlowRetry;

````

</details>

### 17.20 Phone remote — exact markup, styles and interactions

Source: [remote-control.html](<D:/pfGG/remote-control.html>)

<details>
<summary>Expand exact remote-control.html source</summary>

````html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="dark"><title>Guc guy Remote</title>
<style>
:root{color-scheme:dark;--bg:#090b0e;--panel:#15181e;--line:#303640;--text:#f4f6fa;--muted:#9da6b4;--accent:#facc15;--green:#70e6a7;--red:#ff707e}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 90% 0,rgba(250,204,21,.13),transparent 35%),var(--bg);color:var(--text);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{max-width:850px;margin:auto;padding:18px 13px 48px}.brand{display:flex;align-items:center;gap:11px;margin:2px 0 16px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:var(--accent);font-size:22px;font-weight:900;color:#18060c}.brand b{display:block;font-size:19px}.brand small,.muted{color:var(--muted);font-size:12px}.card{padding:15px;margin:11px 0;border:1px solid var(--line);border-radius:15px;background:rgba(21,24,30,.95)}.card h2{font-size:15px;margin:0 0 12px}.section-label{color:var(--muted);font-size:12px;font-weight:700;margin:15px 0 7px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{min-width:0}.field.full{grid-column:1/-1}label{display:block;margin:1px 0 5px;color:#c5cbd4;font-size:12px;font-weight:650}input,select,textarea{width:100%;min-height:42px;padding:10px 11px;border:1px solid var(--line);border-radius:10px;background:#0d1015;color:var(--text);font:14px system-ui}textarea{min-height:92px;resize:vertical}textarea.tall{min-height:145px}.row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.row>*{flex:1}.row .fixed{flex:0 0 auto}button,.button{min-height:42px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:#242832;color:var(--text);font:700 13px system-ui;text-align:center}button.primary{border:0;background:var(--accent);color:#210810}button.stop{color:#ffabb4}button:disabled{opacity:.42}.tiny{min-height:34px;padding:6px 9px;font-size:12px}.danger{color:#ffabb4}.status{font-size:17px;font-weight:750}.track{height:7px;margin-top:9px;border-radius:8px;background:#292e36;overflow:hidden}.fill{height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--green));transition:width .2s}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:13px}.queue{display:grid;grid-template-columns:repeat(auto-fit,minmax(75px,1fr));gap:7px;margin-top:11px}.tile{padding:8px 4px;border:1px solid var(--line);border-radius:9px;text-align:center;font-size:11px}.tile.done{border-color:#3c996e;color:var(--green)}.tile.failed{border-color:#aa4a58;color:#ffabb4}.logs{max-height:220px;overflow:auto;color:var(--muted);font:11px/1.5 ui-monospace,monospace;white-space:pre-wrap}.notice{padding:10px;margin:9px 0;border:1px solid #705b31;border-radius:11px;background:#211b11;color:#f0d5a1;font-size:12px}.notice.error{border-color:#813b47;background:#251419;color:#ffbdc4}.dot{display:inline-block;width:8px;height:8px;margin-right:7px;border-radius:50%;background:var(--red)}.dot.on{background:var(--green);box-shadow:0 0 8px var(--green)}.ref-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.ref-card{border:1px solid var(--line);border-radius:10px;padding:7px;min-width:0}.ref-card img{display:block;width:100%;height:118px;object-fit:cover;border-radius:7px;background:#0b0d11}.ref-name{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:5px 1px}.char-card{border:1px solid var(--line);border-radius:12px;padding:12px;margin:9px 0}.char-card h3{margin:0 0 9px;font-size:14px}.preview{display:block;max-width:100%;max-height:68vh;object-fit:contain;margin:10px auto;border-radius:10px}.hidden{display:none!important}.hint{font-size:11px;color:var(--muted);margin-top:6px}@media(min-width:680px){.shell{padding-top:24px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}.two-col>.card{margin:0 0 11px}}
</style>
</head>
<body><main class="shell">
<header class="brand"><span class="mark">G</span><div><b>Guc guy Remote</b><small>Full settings · same Wi‑Fi</small></div></header>
<div id="notice" class="notice hidden"></div>
<section class="card"><div class="muted"><i id="dot" class="dot"></i><span id="connectionText">Connecting to your PC…</span> <span id="saved" class="muted"></span></div><div id="status" class="status" style="margin-top:9px">Waiting for Guc guy</div><div id="progressText" class="muted">0% complete</div><div class="track"><div id="progress" class="fill"></div></div><div id="queue" class="queue"></div><div class="actions"><button id="start" class="primary">Start generation</button><button id="stop" class="stop" disabled>Stop generation</button></div></section>
<div class="two-col"><section class="card"><h2>Workflow & generation</h2><div class="grid">
<div class="field full"><label for="mode">Workflow</label><select id="mode"><option value="classic">Classic</option><option value="subject-flow">Subject Flow</option><option value="story">Story</option></select></div>
<div class="field"><label for="engine">Prompt planning</label><select id="engine"><option value="gemini">Gemini planned</option><option value="direct">Direct prompt</option></select></div>
<div class="field"><label for="generationMode">Batch mode</label><select id="generationMode"><option value="parallel">Parallel</option><option value="sequential">Sequential</option></select></div>
<div class="field"><label for="model">Image model</label><select id="model"><option value="GEM_PIX_2">Nano Banana Pro</option><option value="NARWHAL">Nano Banana</option><option value="HARBOR_SEAL">Imagen</option></select></div>
<div class="field"><label for="aspect">Aspect ratio</label><select id="aspect"><option value="IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR">Portrait 3:4</option><option value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait 9:16</option><option value="IMAGE_ASPECT_RATIO_SQUARE">Square</option><option value="IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE">Landscape 4:3</option><option value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape 16:9</option></select></div>
<div class="field"><label for="count">Number of images</label><input id="count" type="number" min="1" max="20" value="5"></div>
<div class="field"><label for="upscale">High-quality upscale</label><select id="upscale"><option value="true">On</option><option value="false">Off</option></select></div>
</div><div class="hint" id="countHint">Subject Flow requires at least 5 images.</div></section>
<section class="card"><h2>Full prompt settings</h2><div id="classicFields" class="grid">
<div class="field full"><label for="shortPrompt">Scene / prompt</label><textarea id="shortPrompt" class="tall" placeholder="Describe the scene"></textarea></div><div class="field full"><label for="physicalDetails">Physical details</label><textarea id="physicalDetails" placeholder="Optional identity / body details"></textarea></div></div>
<div id="subjectFields" class="hidden"><div class="field"><label for="systemInstruction">Base description / instructions</label><textarea id="systemInstruction" class="tall" placeholder="Persistent subject, scene and photography instructions"></textarea></div><div class="field" style="margin-top:10px"><label for="targetPrompt">Target scene</label><textarea id="targetPrompt" class="tall" placeholder="What should happen in this generation?"></textarea></div><div class="field" style="margin-top:10px"><label for="figureDetails">Figure details</label><textarea id="figureDetails" placeholder="Optional physical details"></textarea></div></div>
<div id="storyFields" class="hidden"><div class="field"><label for="storyBrief">Story brief</label><textarea id="storyBrief" class="tall" placeholder="Describe story, setting and tone"></textarea></div><div class="section-label">Story characters</div><div id="characters"></div><button id="addCharacter" class="tiny">+ Add character</button></div>
</section></div>
<section class="card"><h2>Reference images</h2><p class="hint">Upload from your phone. These files transfer over the paired local Wi‑Fi connection and are saved in Flipo on your PC.</p><div id="refsClassic"><div class="section-label">Classic identity images</div><div id="refs-subjects" class="ref-grid"></div><label class="button" for="upload-subjects">+ Add identity images</label><input class="hidden file" id="upload-subjects" type="file" accept="image/*" multiple><div class="section-label">Outfit image</div><div id="refs-outfit" class="ref-grid"></div><label class="button" for="upload-outfit">Upload / replace outfit</label><input class="hidden file" id="upload-outfit" type="file" accept="image/*"><div class="section-label">Location image</div><div id="refs-location" class="ref-grid"></div><label class="button" for="upload-location">Upload / replace location</label><input class="hidden file" id="upload-location" type="file" accept="image/*"></div>
<div id="refsSubjectFlow" class="hidden"><div class="section-label">Subject Flow identity images</div><div id="refs-sfSubjects" class="ref-grid"></div><label class="button" for="upload-sfSubjects">+ Add identity images</label><input class="hidden file" id="upload-sfSubjects" type="file" accept="image/*" multiple><div class="section-label">Outfit images</div><div id="refs-sfOutfits" class="ref-grid"></div><label class="button" for="upload-sfOutfits">+ Add outfit images</label><input class="hidden file" id="upload-sfOutfits" type="file" accept="image/*" multiple><div class="section-label">Knowledge / room images</div><div id="refs-sfKnowledge" class="ref-grid"></div><label class="button" for="upload-sfKnowledge">+ Add knowledge images</label><input class="hidden file" id="upload-sfKnowledge" type="file" accept="image/*" multiple><div class="section-label">Photo-quality reference images</div><div id="refs-sfQuality" class="ref-grid"></div><label class="button" for="upload-sfQuality">+ Add style images</label><input class="hidden file" id="upload-sfQuality" type="file" accept="image/*" multiple></div>
<div id="refsStory" class="hidden"></div></section>
<section class="card"><h2>Save / upload full preset</h2><div class="row"><div class="field"><label for="presetName">Preset name</label><input id="presetName" maxlength="48" placeholder="My complete setup"></div><button id="savePreset" class="primary fixed">Save current</button></div><div class="row" style="margin-top:10px"><div class="field"><label for="presetSelect">Saved presets</label><select id="presetSelect"><option value="">Choose a preset</option></select></div><button id="loadPreset" class="fixed">Load</button><button id="exportPreset" class="fixed">Export</button><button id="deletePreset" class="danger fixed">Delete</button></div><div style="margin-top:10px"><label class="button" for="presetFile">Upload preset JSON</label><input class="hidden" id="presetFile" type="file" accept="application/json,.json"></div><div class="hint">Includes prompts, workflow, generation settings, and saved reference images.</div></section>
<section id="previewCard" class="card hidden"><h2>Generated image</h2><img id="preview" class="preview"><a id="download" class="button" download="flipo-image.png">Download image</a></section>
<section class="card"><h2>Recent activity</h2><div id="logs" class="logs">No activity yet.</div></section>
<p class="muted">Keep Chrome open and the Flipo phone bridge running on the PC. Prompts and image references are sent only between the paired phone and PC over your local network. The QR allows control of your runs; keep it private.</p>
</main>
<script>
(()=>{
 const $=id=>document.getElementById(id),token=location.hash.slice(1);location.hash="";let socket=null,config=null,saveTimer=0,previewUrl="",charRefCache=new Map(),pending=new Map();
 function uid(){if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();const bytes=new Uint8Array(16);if(globalThis.crypto?.getRandomValues)globalThis.crypto.getRandomValues(bytes);else for(let i=0;i<bytes.length;i++)bytes[i]=Math.random()*256;bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;return[...bytes].map((b,i)=>`${i===4||i===6||i===8||i===10?"-":""}${b.toString(16).padStart(2,"0")}`).join("")}
 function notice(text,error=false){const n=$("notice");n.textContent=text;n.classList.toggle("error",error);n.classList.remove("hidden");if(!error)setTimeout(()=>n.classList.add("hidden"),2600)}
 function send(command,data={}){if(socket?.readyState!==WebSocket.OPEN){notice("PC bridge disconnected. Start it on the PC and reconnect.",true);const failed=Promise.reject(Error("PC bridge disconnected."));failed.catch(()=>{});return failed}const requestId=uid(),request=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(Error("Flipo did not respond in time."))},30000);pending.set(requestId,{resolve,reject,timer});socket.send(JSON.stringify({command,requestId,...data}))});request.catch(()=>{});return request}
 if(!/^[a-f0-9]{64}$/.test(token)){notice("Invalid pairing link. Open Flipo on the PC and scan a fresh QR code.",true);return}
 function connect(){const scheme=location.protocol==="https:"?"wss:":"ws:";socket=new WebSocket(`${scheme}//${location.host}/phone?token=${token}`);socket.onopen=()=>{$("dot").classList.add("on");$("connectionText").textContent="Connected to Flipo on your PC";send("state").catch(()=>{});send("config").catch(()=>{})};socket.onclose=()=>{$("dot").classList.remove("on");$("connectionText").textContent="PC bridge disconnected · reconnecting…";for(const item of pending.values()){clearTimeout(item.timer);item.reject(Error("PC bridge disconnected."))}pending.clear();setTimeout(connect,1800)};socket.onerror=()=>socket.close();socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}if(m.requestId&&pending.has(m.requestId)){const item=pending.get(m.requestId);pending.delete(m.requestId);clearTimeout(item.timer);if(m.type==="result"&&!m.ok||m.type==="error"){item.reject(Error(m.error||"Command could not be completed."));notice(m.error||"Command could not be completed.",true)}else item.resolve(m)}if(m.type==="state")renderState(m.state);if(m.type==="config"||m.type==="preset"&&m.config){applyConfig(m.config);$("saved").textContent="· synced"}if(m.type==="reference"&&m.record){const selector=`img[data-ref="${m.group}:${m.characterId||""}:${m.id}"]`;document.querySelectorAll(selector).forEach(img=>img.src=m.record.dataUrl)}if(m.type==="preview"){previewUrl=m.dataUrl;$("preview").src=previewUrl;$("download").href=previewUrl;$("previewCard").classList.remove("hidden");$("previewCard").scrollIntoView({behavior:"smooth",block:"center"})}if(m.type==="preset"&&m.preset)downloadPreset(m.preset);if(m.type==="result"&&!m.ok||m.type==="error")notice(m.error||"Command could not be completed.",true)}}
 function renderState(s){$("status").textContent=s.status||"Ready";$("progress").style.width=`${s.progress||0}%`;$("progressText").textContent=`${s.progress||0}% complete`;$("start").disabled=Boolean(s.running);$("stop").disabled=!s.running;const q=$("queue");q.replaceChildren();for(const item of s.queue||[]){const tile=document.createElement("button");tile.className=`tile ${item.status||""}`;tile.textContent=`${item.index} · ${(item.status||"queued").replaceAll("_"," ")}`;if(["failed","stopped","quota_exhausted"].includes(item.status)){tile.title=item.error||"Tap to retry";tile.onclick=()=>send("retry",{index:item.index})}else if(item.hasPreview){tile.title="Tap to view / download";tile.onclick=()=>send("get-preview",{index:item.index})}q.append(tile)}$("logs").textContent=(s.logs||[]).map(x=>{const d=new Date(x.time);return`${Number.isNaN(d.getTime())?"":d.toLocaleTimeString()} ${x.text}`}).join("\n")||"No activity yet."}
 function applyConfig(c){if(!c)return;config=c;for(const [id,key] of [["mode","mode"],["engine","engine"],["generationMode","generationMode"],["model","model"],["aspect","aspect"],["count","count"],["upscale","upscale"],["shortPrompt","shortPrompt"],["physicalDetails","physicalDetails"],["systemInstruction","systemInstruction"],["targetPrompt","targetPrompt"],["figureDetails","figureDetails"],["storyBrief","storyBrief"]]){if($(id))$(id).value=c[key]??$(id).value}renderMode();renderReferences();renderCharacters();renderPresets();$("saved").textContent="· synced"}
 function renderMode(){const mode=$("mode").value;$("classicFields").classList.toggle("hidden",mode!=="classic");$("subjectFields").classList.toggle("hidden",mode!=="subject-flow");$("storyFields").classList.toggle("hidden",mode!=="story");$("refsClassic").classList.toggle("hidden",mode!=="classic");$("refsSubjectFlow").classList.toggle("hidden",mode!=="subject-flow");$("refsStory").classList.toggle("hidden",mode!=="story");$("count").min=mode==="subject-flow"?"5":"1";$("countHint").textContent=mode==="subject-flow"?"Subject Flow requires at least 5 images.":"Choose from 1 to 20 images."}
 const refGroups=[["subjects","Classic identity"],["sfSubjects","Subject Flow identity"],["sfOutfits","Subject Flow outfits"],["sfKnowledge","Subject Flow knowledge"],["sfQuality","Subject Flow style"]];
 function refRecord(group,id,characterId){return group.startsWith("story")?(charRefCache.get(`${characterId}:${group}`)||[]).find(x=>x.id===id):group==="outfit"?config?.references.outfit:group==="location"?config?.references.location:(config?.references[group]||[]).find(x=>x.id===id)}
 function renderRefGroup(group,records,container,charId=""){const root=$(container);if(!root)return;root.replaceChildren();for(const r of records||[]){const card=document.createElement("div");card.className="ref-card";const img=document.createElement("img");img.alt=r.name||"Reference image";img.dataset.ref=`${group}:${charId}:${r.id}`;if(r.dataUrl){img.src=r.dataUrl;}else{send("get-reference",{group,id:r.id,characterId:charId});}const name=document.createElement("div");name.className="ref-name";name.textContent=r.name||"Reference image";const row=document.createElement("div");row.className="row";const view=document.createElement("button");view.className="tiny";view.textContent="View";view.onclick=()=>send("get-reference",{group,id:r.id,characterId:charId});const del=document.createElement("button");del.className="tiny danger";del.textContent="Remove";del.onclick=()=>send("remove-reference",{group,id:r.id,characterId:charId});row.append(view,del);card.append(img,name,row);root.append(card)}}
 function renderReferences(){if(!config)return;const r=config.references||{};renderRefGroup("subjects",r.subjects,"refs-subjects");renderRefGroup("outfit",r.outfit?[r.outfit]:[],"refs-outfit");renderRefGroup("location",r.location?[r.location]:[],"refs-location");renderRefGroup("sfSubjects",r.sfSubjects,"refs-sfSubjects");renderRefGroup("sfOutfits",r.sfOutfits,"refs-sfOutfits");renderRefGroup("sfKnowledge",r.sfKnowledge,"refs-sfKnowledge");renderRefGroup("sfQuality",r.sfQuality,"refs-sfQuality")}
 function renderCharacters(){if(!config)return;const root=$("characters");root.replaceChildren();for(const ch of config.storyCharacters||[]){const card=document.createElement("div");card.className="char-card";card.innerHTML=`<h3>Story character</h3><div class="grid"><div class="field"><label>Name</label><input data-key="name" maxlength="50"></div><div class="field"><label>Height</label><input data-key="height" maxlength="120"></div><div class="field full"><label>Physique / details</label><textarea data-key="physique"></textarea></div></div><div class="section-label">Identity photos (up to 3)</div><div class="ref-grid" data-ref-root="subjects"></div><label class="button">+ Add identity<input class="hidden char-upload" type="file" accept="image/*" multiple data-group="storySubjects"></label><div class="section-label">Outfit photos (up to 2)</div><div class="ref-grid" data-ref-root="outfits"></div><label class="button">+ Add outfit<input class="hidden char-upload" type="file" accept="image/*" multiple data-group="storyOutfits"></label><button class="tiny danger remove-character">Remove character</button>`;card.querySelector("h3").textContent=ch.name||"Story character";for(const input of card.querySelectorAll("[data-key]")){input.value=ch[input.dataset.key]||"";input.oninput=()=>{ch[input.dataset.key]=input.value;scheduleSave()}}renderRefGroup("storySubjects",ch.subjects,card.querySelector('[data-ref-root="subjects"]'),ch.id);renderRefGroup("storyOutfits",ch.outfits,card.querySelector('[data-ref-root="outfits"]'),ch.id);card.querySelector(".remove-character").onclick=()=>{config.storyCharacters=config.storyCharacters.filter(x=>x.id!==ch.id);renderCharacters();scheduleSave()};card.querySelectorAll(".char-upload").forEach(input=>input.onchange=()=>uploadFiles(input.dataset.group,input.files,ch.id));root.append(card)}}
 function renderPresets(){const select=$("presetSelect"),chosen=select.value;select.replaceChildren(new Option("Choose a preset",""));for(const p of config?.presets||[]){const op=new Option(`${p.name} (${p.referenceCount} refs)`,p.id);select.append(op)}if((config?.presets||[]).some(p=>p.id===chosen))select.value=chosen}
 function currentConfig(){return{...config,mode:$("mode").value,engine:$("engine").value,generationMode:$("generationMode").value,model:$("model").value,aspect:$("aspect").value,count:Number($("count").value),upscale:$("upscale").value==="true",shortPrompt:$("shortPrompt").value,physicalDetails:$("physicalDetails").value,systemInstruction:$("systemInstruction").value,targetPrompt:$("targetPrompt").value,figureDetails:$("figureDetails").value,storyBrief:$("storyBrief").value,storyCharacters:config?.storyCharacters||[]}}
 function scheduleSave(){if(!config)return;$("saved").textContent="· saving…";clearTimeout(saveTimer);saveTimer=setTimeout(()=>send("save-config",{config:currentConfig()}),500)}
 async function imageData(file){if(file.size>8*1024*1024)throw Error(`${file.name} is larger than 8 MB`);if(!file.type.startsWith("image/"))throw Error(`${file.name} is not an image`);return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error("Could not read image"));reader.onload=()=>resolve({id:uid(),name:file.name,dataUrl:reader.result});reader.readAsDataURL(file)})}
 async function uploadFiles(group,fileList,characterId=""){try{for(const file of [...(fileList||[])]){const record=await imageData(file);await send("set-reference",{group,characterId,record})}}catch(error){notice(error.message,true)}}
 for(const group of ["subjects","sfSubjects","sfOutfits","sfKnowledge","sfQuality","outfit","location"]){const input=$("upload-"+group);input.onchange=()=>{uploadFiles(group,input.files);input.value=""}}
 $("mode").onchange=()=>{renderMode();scheduleSave()};for(const id of ["engine","generationMode","model","aspect","count","upscale","shortPrompt","physicalDetails","systemInstruction","targetPrompt","figureDetails","storyBrief"])$(id).addEventListener("input",scheduleSave);for(const id of ["engine","generationMode","model","aspect","count","upscale"])$(id).addEventListener("change",scheduleSave);
 $("addCharacter").onclick=()=>{config.storyCharacters=config.storyCharacters||[];if(config.storyCharacters.length>=4)return notice("A story supports up to 4 characters.",true);config.storyCharacters.push({id:uid(),name:`Character ${config.storyCharacters.length+1}`,height:"",physique:"",subjects:[],outfits:[]});renderCharacters();scheduleSave()};
 $("start").onclick=async()=>{clearTimeout(saveTimer);try{await send("save-config",{config:currentConfig()});await send("start")}catch(error){notice(error.message,true)}};$("stop").onclick=()=>send("stop").catch(()=>{});$("savePreset").onclick=()=>send("save-preset",{name:$("presetName").value}).catch(()=>{});$("loadPreset").onclick=()=>{if($("presetSelect").value)send("load-preset",{id:$("presetSelect").value}).catch(()=>{})};$("deletePreset").onclick=()=>{if($("presetSelect").value)send("delete-preset",{id:$("presetSelect").value}).catch(()=>{})};$("exportPreset").onclick=()=>{if($("presetSelect").value)send("export-preset",{id:$("presetSelect").value}).catch(()=>{})};
 function downloadPreset(p){const blob=new Blob([JSON.stringify({format:"flipo-subject-flow-preset",version:1,preset:p},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=(p.name||"flipo-preset").replace(/[^a-z0-9_-]+/gi,"-")+".flipo-preset.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 $("presetFile").onchange=async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;try{if(file.size>100*1024*1024)throw Error("Preset JSON exceeds 100 MB");const parsed=JSON.parse(await file.text()),preset=parsed?.format==="flipo-subject-flow-preset"?parsed.preset:parsed;send("import-preset",{preset})}catch(error){notice(error.message,true)}};
 connect();
 window.addEventListener("pagehide",()=>clearTimeout(saveTimer));
})();
</script></body></html>

````

</details>

### 17.21 Manifest — permissions and entrypoints

Source: [manifest.json](<D:/pfGG/manifest.json>)

<details>
<summary>Expand exact manifest.json source</summary>

````json
{
  "manifest_version": 3,
  "name": "Guc guy",
  "version": "4.6.22",
  "minimum_chrome_version": "116",
  "description": "Generate identity-consistent AI images and videos with Google Flow.",
  "permissions": [
    "storage",
    "unlimitedStorage",
    "downloads",
    "clipboardWrite",
    "scripting",
    "tabs",
    "offscreen",
    "sidePanel",
    "webRequest",
    "identity",
    "identity.email"
  ],
  "host_permissions": [
    "https://gemini.google.com/*",
    "https://flow.google.com/*",
    "https://flow-content.google/*",
    "https://flow.google/*",
    "https://aisandbox-pa.googleapis.com/*",
    "https://*.googleapis.com/*",
    "https://*.googleusercontent.com/*",
    "https://api.telegram.org/*",
    "http://127.0.0.1:32189/*",
    "http://localhost:32189/*"
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; media-src 'self' https: data: blob:"
  },
  "background": {
    "service_worker": "background.js"
  },
  "web_accessible_resources": [
    {
      "resources": [
        "assets/lettering-thought-reference.jpg",
        "assets/lettering-narration-dialogue-reference.png",
        "assets/lettering-speech-reference.png",
        "assets/subject-flow-reference-review.jpg"
      ],
      "matches": [
        "https://gemini.google.com/*"
      ]
    }
  ],
  "action": {
    "default_title": "Open Flipo"
  },
  "side_panel": {
    "default_path": "popup.html"
  },
  "content_scripts": [
    {
      "matches": [
        "https://gemini.google.com/*"
      ],
      "js": [
        "content_gemini.js"
      ],
      "run_at": "document_idle"
    },
    {
      "matches": [
        "https://flow.google.com/*"
      ],
      "js": [
        "content_flow_bridge.js"
      ],
      "run_at": "document_start"
    },
    {
      "matches": [
        "https://flow.google.com/*"
      ],
      "js": [
        "content_flow_capture.js"
      ],
      "run_at": "document_start",
      "world": "MAIN"
    }
  ],
  "icons": {
    "16": "icon128.png",
    "48": "icon128.png",
    "128": "icon128.png"
  }
}

````

</details>

### 17.22 Source fingerprint index

SHA-256 fingerprints identify the exact local files used for this documentation snapshot. They contain no account tokens, selected personal images or stored browser data.

| Source file | Bytes | SHA-256 |
| --- | --- | --- |
| manifest.json | 2204 | be7c9795d3d7d95c5db98987e8fc8703e005af61bb93f3111de928531373d7bc |
| popup.html | 31143 | 96d70ae6dbf4b567e82fea604f8718dc3c8994d9768fed2f528d2c0896a00df8 |
| popup.css | 39916 | 44eb18473459198d8ad134030d3f3f3c59561a490fb5227d4d88fc68d3cf256a |
| popup.js | 81279 | 3efb817f43d846ad9462ad9d49e607f77352c6f39c611b3ff35acd65c6fbf1be |
| background.js | 188373 | 1824d7af95de1bc9afe33fca7b0af44e90a6709a3e32246828ff0e751511b209 |
| classic-direction.js | 37728 | 5091455ddec05f97d4e0c030281c88239633f40ec472eb79d07b967ebbb19e7e |
| subject-flow-direction.js | 9671 | d0ff65c937d249ca89fbbd944cfd053fefde14abc5ed0016f604c571abf3d527 |
| story-engine.js | 47690 | 6c323f72c4cfdb77163bf1d422d12c8dc3c968e332a237ef0e49fb3ca576bc52 |
| story-library.js | 3115 | fd23c54da45bf01f8276622e669cfa5851276f6b7c9c7ae786fd09764c5ff327 |
| story-tools-ui.js | 14431 | 307b6e2d3008ddcad063c6def517ffe52745087cf7b434cb24c9549e9a7c889b |
| story-jobs.js | 13334 | c8ed378cf8474c5adf05e61e31bbad4d8685437d35b1ba8d296061fdec565365 |
| story-renderer.js | 11015 | 6707f74e18eb2e0975f350c1ff246fc17bb7d8f2e0417bf43ba968f357559068 |
| content_gemini.js | 15498 | 87a15ff4a7f974ace8dbd986aa726d605c841267e4f2d180e2b2822f71bc42de |
| content_flow_video.js | 21682 | e4a194f1eecb99742526b2b2ac20d3b834348d86ba4f4703fc402b6e6a8c29a4 |
| flow-backend.js | 6623 | fcce62e09a1908287ae6abae4c0fdced1e8ea816a363210a6a70725490fb766c |
| flow-rpc.js | 12145 | 57f3eb361171d7066414e65a9da7a62fe7cb85f28cd0624346ccc37006433518 |
| flow-compat.js | 2281 | f107a962c3c6b419a087971dcf9a556e208d84a0df5d244066463bda37b6203d |
| flow-request-guard.js | 1888 | 211bc595b1d6a0ab41e84bf6d6d19538f9a97abab0d748ec218e360dcc465f27 |
| flow-retry.js | 1481 | 5fb84ac613720c50164b6192ecf50e1938f33251f6c280ad21c1d05b12d1c460 |
| flow-diagnostics.js | 1851 | 5881e53a8b61c5900d43e711e28ece02a781f69c1410db416cb4d6fdc730d1f9 |
| flow-page-upload.js | 6677 | d72d43b65afce71558fa47eb90f5c07d0d0626d1e921668ae81653b72461df71 |
| flow-tab-recovery.js | 4368 | 9bb0036bf5d6c63faa3d7b33dfddbb20437b1c3ed28a57916c548447d02f0292 |
| offscreen.js | 2099 | 877e84dace1f835387826a5f86c622a1d23d20e2b75d0787873749b3c70a09fb |
| remote-control.html | 25029 | 75a9aae2a732983286462ce983222ae5022387e3616eaf7fdb9807fa39d75855 |
| server.js | 10622 | 49b142e132f5c8e694be3d40394b0b0193bac2a7720252e8f9eed7ec1128160a |
| start-mobile-remote.bat | 712 | b9f519026515ad1874dd784f1094bd3eecb38317c6f4e240873d4b0bfffe8fb6 |

### 17.23 What was verified for this document

- Manifest version and the four actual mode panels were read from the active root files.
- Static controls, option values, labels and placeholders were extracted from `popup.html`.
- Classic location, pose and gaze counts were checked against the actual arrays.
- Exact source blocks were copied from an explicit allowlist of runtime files.
- No browser-stored identity photos, bot tokens, pairing tokens or account credentials were read for this document.
- No live generation, Telegram send, phone pairing or extension-code modification was performed.
- A source audit establishes code behaviour; generated likeness/style and rendered pixel parity require separate live/visual validation.
