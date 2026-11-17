import os

path = r'd:\pfGG\subject-flow-direction.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "Across the batch only unspecified timing and small framing differences may vary; keep the same requested action, outfit, room and lighting."
replacement = "Across the batch, heavily VARY the subject's natural pose, camera angle, body orientation, and gaze! Force the subject to look away, look down, or focus on a task in most shots - AVOID direct eye contact with the lens unless the user explicitly asked for it. If the user didn't lock the scene to a single specific room, vary the casual setting/location across the images."

if target in code:
    code = code.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")
