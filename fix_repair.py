
import os

path = "d:/pfGG/story-engine.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target = "Use the revised cast rectangles below y=0.32. The upper area is continuous real scene background reserved for lettering"
replacement = "Use the revised cast rectangles above y=0.68. The bottom area is continuous real scene background reserved for lettering"

if target in code:
    code = code.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Not found")

