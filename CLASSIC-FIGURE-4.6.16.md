# Classic figure fidelity — 4.6.16

The unspecified Classic body default now preserves the user's requested proportions: approximately 56-inch bust/chest and 56-inch hips, without interpreting those dimensions as generalized fatness. Waist and abdomen remain natural and reference-consistent unless the user specifies otherwise. Exact body measurements and outfit fit retain the existing authority order.

Classic's existing profile research and prompt direction remain in `references/classic-bloggers/README.md` and `classic-direction.js`: close/medium portrait framing, varied pose families, colorful believable locations, vivid natural contrast and no simulated post-processing. The profile-derived guidance is limited to general framing, location, color and pose cues; it does not reproduce an account's face or exact composition.

Qid 4.6.16 also broadens native Flow mode control discovery to recognize accessible mode buttons, tabs and radio controls. The previous failure occurred because the helper waited only for a radio named “Video”; no video request was submitted in that failure. If Flow exposes no matching control, the diagnostic now includes the visible control labels.

JavaScript syntax and manifest JSON were checked. No live Flow video run was performed here.
