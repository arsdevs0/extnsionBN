
import os

path = "d:/pfGG/background.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target = "with believable lower-abdominal fullness, and thick substantial thighs. Bust and hips have comparable overall"
replacement = "with believable lower-abdominal fullness, and thick substantial thighs. This is a highly attractive, proportional thick build (roughly 80-85kg), absolutely NOT medically obese, NOT 120kg, and NOT morbidly overweight. Bust and hips have comparable overall"

if target in code:
    code = code.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")

