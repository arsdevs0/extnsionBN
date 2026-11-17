import os

# 1. Update subject-flow-direction.js
path1 = r'd:\pfGG\subject-flow-direction.js'
with open(path1, 'r', encoding='utf-8') as f:
    code1 = f.read()

target1 = "Across the batch, heavily VARY the subject's natural pose, camera angle, body orientation, and gaze! Force the subject to look away, look down, or focus on a task in most shots - AVOID direct eye contact with the lens unless the user explicitly asked for it. If the user didn't lock the scene to a single specific room, vary the casual setting/location across the images."
replacement1 = "Across the batch, force EXTREME AWKWARD RANDOMNESS in poses, camera angles, and framing! Do not just output static or boring poses. Make the descriptions feel spontaneous, messy, off-balance, and mid-motion (e.g., leaning awkwardly, sprawled out, twisting to reach something, adjusting clothes, slouching heavily). The camera angle should be unpredictable (high, low, crooked). AVOID direct eye contact with the lens unless explicitly requested. Vary the casual setting/location across the images."

if target1 in code1:
    code1 = code1.replace(target1, replacement1)
    with open(path1, 'w', encoding='utf-8') as f:
        f.write(code1)
    print("Patched subject-flow-direction.js")
else:
    print("Target 1 not found")

# 2. Update background.js
path2 = r'd:\pfGG\background.js'
with open(path2, 'r', encoding='utf-8') as f:
    code2 = f.read()

target2a = "The framing must feel incidental, messy, and uncomposed, just like a real camera-roll photo."
replacement2a = "The framing must be unapologetically AWKWARD, ASYMMETRIC, and SPONTANEOUS. Do not center the subject perfectly. Capture mid-action, off-balance posture, unusual camera tilts, and limbs cut off by the frame edge. The image should capture the chaotic randomness of a real camera-roll, not a boring static shot."

target2b = "Keep body posture slumped, relaxed, or genuinely engaged in the task."
replacement2b = "Keep body posture awkward, spontaneous, slumped, relaxed, or genuinely engaged in a messy mid-action task."

if target2a in code2 and target2b in code2:
    code2 = code2.replace(target2a, replacement2a)
    code2 = code2.replace(target2b, replacement2b)
    with open(path2, 'w', encoding='utf-8') as f:
        f.write(code2)
    print("Patched background.js")
else:
    print("Targets in background.js not found")
