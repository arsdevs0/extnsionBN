import os

path = r'd:\pfGG\background.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = r"promptText = ${subjectFlowPrompt}\n\n\n\n\n\n\n\n;"
replacement = r"promptText = `${subjectFlowPrompt}\n\n${SUBJECT_FLOW_CAMERA_RULE}\n\n${SUBJECT_FLOW_RAWNESS_RULE}\n\n${physicalLockInstruction}\n\n${referenceLockInstruction}${flowReferenceMap}`;"

if target in code:
    code = code.replace(target, replacement)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    print("Fixed syntax error")
else:
    print("Target not found")
