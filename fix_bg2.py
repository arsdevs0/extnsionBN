import os

path = r'd:\pfGG\background.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = "Capture mid-action, off-balance posture, unusual camera tilts, and limbs cut off by the frame edge. The image should capture the chaotic randomness of a real camera-roll, not a boring static shot."
replacement = "Capture extreme mid-action, off-balance posture, unusual camera tilts, and limbs cut off by the frame edge. Emulate the chaotic randomness of a leaked camera-roll: face buried in a pillow, slouching with a double chin, back profiles while bending over, or the photographer's hand casually in the foreground. Never use a boring static standing/sitting portrait."

if target in code:
    code = code.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")
