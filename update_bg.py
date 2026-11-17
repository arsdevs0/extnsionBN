import re

path = r'd:\pfGG\background.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the block that builds customBodyTuning
old_tuning = """
  let customBodyTuning = "";
  if (params.tuneChest) customBodyTuning += "Chest: " + params.tuneChest + ". ";
  if (params.tuneHips) customBodyTuning += "Hips/Thighs: " + params.tuneHips + ". ";
  if (params.tuneNavel) customBodyTuning += "Belly/Navel: " + params.tuneNavel + ". ";
  if (customBodyTuning) customBodyTuning = "ABSOLUTE HIGHEST PRIORITY BODY TUNING OVERRIDE: " + customBodyTuning.strip() + "\\n\\n";
"""

new_tuning = """
  let customBodyTuning = "";
  if (params.tuneHeight) customBodyTuning += "Height: " + params.tuneHeight + ". ";
  if (params.tuneWeight) customBodyTuning += "Weight: " + params.tuneWeight + ". ";
  if (params.tuneBust) customBodyTuning += "Bust/Chest: " + params.tuneBust + ". ";
  if (params.tuneWaist) customBodyTuning += "Waist: " + params.tuneWaist + ". ";
  if (params.tuneHips) customBodyTuning += "Hips/Thighs: " + params.tuneHips + ". ";
  if (params.tuneNavel) customBodyTuning += "Belly/Navel: " + params.tuneNavel + ". ";
  if (customBodyTuning) customBodyTuning = "ABSOLUTE HIGHEST PRIORITY BODY TUNING OVERRIDE (Must strictly follow these measurements/traits): " + customBodyTuning.strip() + "\\n\\n";
"""

code = code.replace(old_tuning.strip(), new_tuning.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated background.js prompt injection')
