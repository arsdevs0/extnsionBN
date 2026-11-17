# Classic photo reference direction

The user supplied seven Instagram screenshots in this chat on 6 November 2026, named `photo_1_2026-11-06_23-41-33.jpg` through `photo_7_2026-11-06_23-41-33.jpg`. These are the **Classic** photographic examples. The image named `assets/subject-flow-reference-review.jpg` belongs to Subject Flow and is not this reference set.

The screenshots were visually available in the conversation. Their reported Downloads paths were not present on disk when checked, so this folder records the visual direction; it does not contain copied image files.

## Observed lighting

- Photos 7 and 6: bright outdoor cafe portraits, readable faces under broad daylight, visible surroundings and saturated garments. Keep normal lively color, without adding a color filter.
- Photo 5: garden portrait with a nearby phone perspective, clear face exposure and visible background detail.
- Photo 4: a wider seated outdoor portrait; the scene stays readable with soft shadows and a clearly exposed face. Do not force sunset or a golden-hour color wash from this sample.
- Photo 2: outdoor close portrait with directional daylight, small skin highlights, real shadow depth and vivid fabric detail.
- Photos 3 and 1: night plaza and dim car portraits. The person is brightly lit with a phone-flash appearance while the background remains darker. Preserve this physically plausible exposure difference instead of forcing equal brightness throughout the scene.

## User preferences

Natural, attractive personal phone photographs. Neither studio lighting nor dull exposure. No added filter, color cast, skin whitening, smoothing, artificial glow, HDR effect or fabricated blur. Preserve the selected subject, outfit, written figure details, chosen scene and time. Simple walls, lifts, gardens and other ordinary places remain suitable.

The screenshot interface and picture-in-picture videos are unrelated to the photographic reference. These examples inform lighting and photographic finish, not the identity, physique, outfit, venue, interface or text of generated images. Their editing/filter history cannot be determined from screenshots; the requested output is explicitly unfiltered.

## Implementation

`classic-direction.js` applies this direction to both Direct and Gemini through the shared planner and final prompt builder. It uses textual lighting guidance derived from these observations; no extra reference images are uploaded at runtime.
