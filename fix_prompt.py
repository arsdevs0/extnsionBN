
import os

path = "d:/pfGG/background.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target = "promptText = SubjectFlowDirection.build({system:systemInstruction,target:shortPrompt,scene:plan.prompts[i],figure:physicalDetails,roles,hasEnvironment:activeKnowledgeMediaIds.length > 0,hasQuality:activeQualityMediaIds.length > 0});"
replacement = "promptText = SubjectFlowDirection.build({system:systemInstruction,target:shortPrompt,scene:plan.prompts[i],figure:physicalDetails,roles,hasEnvironment:activeKnowledgeMediaIds.length > 0,hasQuality:activeQualityMediaIds.length > 0});\n      promptText += `\\n\\n${physicalLockInstruction}\\n\\n${referenceLockInstruction}${flowReferenceMap}\\n\\n${qualityStyleInstruction}`;"

if target in code:
    code = code.replace(target, replacement)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Not found")

