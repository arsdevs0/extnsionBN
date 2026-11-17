# Modern Classic interiors — 4.6.2

Reload the unpacked extension at `D:\pfGG` after any active generation finishes or is stopped. The popup should display **v4.6.2**.

Classic's shared Direct/Gemini direction now defaults invented homes and interiors to contemporary, attractive, lived-in urban rooms: current furniture, clean geometry, tactile fresh finishes, a balanced neutral palette and restrained color accents. Exact staging and furnishings remain Flow's choice.

Removed positive heritage and warm-material cues from the rotating background moods. Desi blogger styling no longer suggests a haveli/antique interior by default. Indoor lighting explicitly favors natural window light or neutral-white fixtures, true scene colors and neutral white balance rather than a global yellow/amber wash. Night scenes retain their requested time. A supplied location reference or explicitly requested architectural style remains authoritative; the extension does not remodel a referenced room.

Home/indoor detection now also recognizes house, apartment, flat, kitchen, bathroom, lounge and common Hindi/Hinglish words including ghar, andar and kamra. These targets retain their named setting instead of receiving an unrelated rotating venue.

Validation: **25 Classic checks passed**, including Direct/Gemini generation, home/Hindi location routing, room-light selection, nighttime/reference preservation, written figure authority, five concurrent workers and fresh pose history. JavaScript syntax and matching manifest/popup version also passed. These are request-level/mocked-generation checks; no live generated interior was visually verified.

Changed: `classic-direction.js`, `classic-direction.test.cjs`, `manifest.json`, `popup.html`. Backup: `tmp/before-modern-interiors-4.6.2/`.
