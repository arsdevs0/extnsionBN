import os

path = r'd:\pfGG\background.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = r"promptText = `${subjectFlowPrompt}\n\n${SUBJECT_FLOW_CAMERA_RULE}\n\n${SUBJECT_FLOW_RAWNESS_RULE}\n\n${physicalLockInstruction}\n\n${referenceLockInstruction}${flowReferenceMap}`;"
replacement = r"promptText = `${subjectFlowPrompt}\n\n${SUBJECT_FLOW_CAMERA_RULE}\n\n${SUBJECT_FLOW_RAWNESS_RULE}\n\n${physicalLockInstruction}\n\n${referenceLockInstruction}${flowReferenceMap}\n\nNEGATIVE PROMPT: Posing, modeling, eye contact, looking at camera, influencer, glamorous, arching back, perfect symmetry, studio composition, cinematic.`;"

if target in code:
    code = code.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Target not found")
