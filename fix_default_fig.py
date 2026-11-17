
import os

path = "d:/pfGG/background.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target1 = "const defaultFemaleFigureActive = workflowMode === \"classic\" && !physicalDetails && !explicitlyMaleSubject;"
replacement1 = "const defaultFemaleFigureActive = (workflowMode === \"classic\" || workflowMode === \"subject-flow\") && !physicalDetails && !explicitlyMaleSubject;"

target2 = """      ? `SUBJECT IDENTITY LOCK: The first subject view defines facial anatomy; additional views resolve that same face. NON-NEGOTIABLE FIGURE LOCK - ABSOLUTE HIGHEST BODY AUTHORITY: The physical build, body shape, figure, curves, and measurements described in the SYSTEM INSTRUCTION and TARGET IMAGE REQUEST take absolute priority. Treat the written description as the canonical body specification. The outfit must conform and drape over THIS EXACT FIGURE. NEVER inherit, blend with, or average toward the body shown in the outfit or subject reference images, and never substitute a generic or slim fashion-model figure. Do not slim, widen, or conceal the requested figure. Outfit references control garments only, NOT the body inside them.`"""
replacement2 = """      ? `SUBJECT IDENTITY LOCK: The first subject view defines facial anatomy; additional views resolve that same face. NON-NEGOTIABLE FIGURE LOCK - ABSOLUTE HIGHEST BODY AUTHORITY: The physical build, body shape, figure, curves, and measurements described in the SYSTEM INSTRUCTION and TARGET IMAGE REQUEST take absolute priority. ${defaultFemaleFigureActive ? "\\n\\nCANONICAL BASELINE FIGURE: " + CLASSIC_DEFAULT_FEMALE_FIGURE + "\\n\\n" : ""}Treat the written description as the canonical body specification. The outfit must conform and drape over THIS EXACT FIGURE. NEVER inherit, blend with, or average toward the body shown in the outfit or subject reference images, and never substitute a generic or slim fashion-model figure. Do not slim, widen, or conceal the requested figure. Outfit references control garments only, NOT the body inside them.`"""

if target1 in code and target2 in code:
    code = code.replace(target1, replacement1)
    code = code.replace(target2, replacement2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")

