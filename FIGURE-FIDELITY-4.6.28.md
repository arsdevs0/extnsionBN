# Figure fidelity — 4.6.28

Reload the unpacked extension from `D:\pfGG` in Chrome's extensions page and reopen the side panel. The header should show v4.6.28. Existing saved figure inputs remain available.

Classic and Subject Flow now use one body-specification builder for planning and final image requests, including pose-reference runs. Body Tuning overrides Figure Details for the same entered trait; Figure Details override conflicting body wording in the scene, and scene body instructions override defaults/reference bodies. Each final request contains the original figure once, with the original tuning values.

The pose path previously replaced the full figure instructions with raw text and asked for the pose model's exact outer silhouette. It now retains the body specification, uses pose for posture/camera, and allows the body outline, clothing width and necessary contact adjustments to reflect the requested build. The same pose helper is also used by Story and Qid.

Classic's hard-coded 56-inch defaults and instructions to restrict fullness to bust/hips were removed. Its blank-input fallback is a qualitative thick build without invented measurements. Custom figure inputs do not receive a competing default. Subject Flow no longer appends a narrow-waist/tight-clothing fallback that conflicts with written figure or garment fit. Exact face and garment-design reference roles remain separate.

Validation:

- 19 new figure tests cover both workflows, direct/Gemini planning, sequential/parallel batches, pose on/off, automatic preparation retry, manual retry, embedded figure instructions, partial measurements and worker module loading.
- 48 focused figure, pose and Direct Image tests pass.
- Two browser UI suites pass, including entering distinct Classic/Subject Flow figures, forwarding Body Tuning, retaining both after panel reload, pose controls, and Direct Image.
- Broader comparison: before 66 passed / 16 failed; after 90 passed / 11 failed, including the 19 new tests. Four old figure assertions were updated for the new precedence/default behavior; the existing blank-default test now passes. All remaining failures were present before this change; they concern older retry, camera/location/planner, Story and Subject Flow expectations.
- Changed JavaScript syntax and manifest version consistency checked.

No live Flow image was generated or visually compared. These checks verify the figure instructions and reference roles sent to Flow, not exact model compliance or body measurements in rendered images.

Backup: `tmp/before-figure-fidelity-4.6.28`. Test logs: `tmp/figure-4.6.28-*.log`.
