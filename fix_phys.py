
import os

path = "d:/pfGG/background.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target = """    const physicalLockInstruction = workflowMode === "story"
      ? `STORY CAST BODY AND HEIGHT LOCK - HIGHEST CHARACTER AUTHORITY:\\n${activeStoryCharacters.map((character) => `- ${character.name}: height ${character.height || "exactly as visible in identity references"}; physique/features: ${character.physique || "preserve exactly from identity references"}. Keep these proportions, apparent scale, posture, garment fit, and relative height consistent in every panel.`).join("\\n")}\\nWritten height and physique override conflicting body information in identity or outfit references, while identity references still control faces and outfit references still control garments.`
      : workflowMode === "subject-flow"
      ? `SUBJECT IDENTITY LOCK: The first subject view defines facial anatomy; additional views resolve that same face. Expression may change with the activity. BODY AUTHORITY: Use the physique, measurements and height explicitly written in the System Instruction and Target Image Request, not the outfit model or style references. Retain subject-reference body traits only where the written request leaves them unspecified. Outfit references control garments only.`"""

replacement = """    const physicalLockInstruction = workflowMode === "story"
      ? `STORY CAST BODY AND HEIGHT LOCK - HIGHEST CHARACTER AUTHORITY:\\n${activeStoryCharacters.map((character) => `- ${character.name}: height ${character.height || "exactly as visible in identity references"}; physique/features: ${character.physique || "preserve exactly from identity references"}. Keep these proportions, apparent scale, posture, garment fit, and relative height consistent in every panel.`).join("\\n")}\\nWritten height and physique override conflicting body information in identity or outfit references, while identity references still control faces and outfit references still control garments.`
      : workflowMode === "subject-flow"
      ? `SUBJECT IDENTITY LOCK: The first subject view defines facial anatomy; additional views resolve that same face. NON-NEGOTIABLE FIGURE LOCK - ABSOLUTE HIGHEST BODY AUTHORITY: The physical build, body shape, figure, curves, and measurements described in the SYSTEM INSTRUCTION and TARGET IMAGE REQUEST take absolute priority. Treat the written description as the canonical body specification. The outfit must conform and drape over THIS EXACT FIGURE. NEVER inherit, blend with, or average toward the body shown in the outfit or subject reference images, and never substitute a generic or slim fashion-model figure. Do not slim, widen, or conceal the requested figure. Outfit references control garments only, NOT the body inside them.`"""

if target in code:
    code = code.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")

