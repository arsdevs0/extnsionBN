import os

path = r'd:\pfGG\background.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target1 = 'const physicalDetails = String(params.physicalDetails || "").trim().slice(0, 1200);'
replacement1 = """
  let customBodyTuning = "";
  if (params.tuneChest) customBodyTuning += "Chest: " + params.tuneChest + ". ";
  if (params.tuneHips) customBodyTuning += "Hips/Thighs: " + params.tuneHips + ". ";
  if (params.tuneNavel) customBodyTuning += "Belly/Navel: " + params.tuneNavel + ". ";
  if (customBodyTuning) customBodyTuning = "ABSOLUTE HIGHEST PRIORITY BODY TUNING OVERRIDE: " + customBodyTuning.strip() + "\\n\\n";

  const physicalDetails = String(params.physicalDetails || "").trim().slice(0, 1200);
"""

target2 = 'const effectiveFigure = physicalDetails || (defaultFemaleFigureActive ? CLASSIC_DEFAULT_FEMALE_FIGURE : "");'
replacement2 = 'const effectiveFigure = customBodyTuning + (physicalDetails || (defaultFemaleFigureActive ? CLASSIC_DEFAULT_FEMALE_FIGURE : ""));'

target3 = '? `NON-NEGOTIABLE FIGURE LOCK - ABSOLUTE HIGHEST BODY AUTHORITY OVER ALL IMAGES AND TEXT: ${physicalDetails}\\nTreat the written description as the subject\\\'s canonical body specification.'
replacement3 = '? `NON-NEGOTIABLE FIGURE LOCK - ABSOLUTE HIGHEST BODY AUTHORITY OVER ALL IMAGES AND TEXT: ${customBodyTuning}${physicalDetails}\\nTreat the written description as the subject\\\'s canonical body specification.'

target4 = 'The physical build, body shape, figure, curves, and measurements described in the SYSTEM INSTRUCTION and TARGET IMAGE REQUEST take absolute priority.'
replacement4 = 'The physical build, body shape, figure, curves, and measurements described in the SYSTEM INSTRUCTION and TARGET IMAGE REQUEST take absolute priority. ${customBodyTuning}'

code = code.replace(target1, replacement1)
code = code.replace(target2, replacement2)
code = code.replace(target3, replacement3)
code = code.replace(target4, replacement4)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched background.js')
