
import os

path = "d:/pfGG/background.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

target1 = "if (STATE.running) { log(\"Already running.\"); return; }"
replacement1 = "if (STATE.running) { log(\"Already running.\"); return; }\n  if (STATE.editorTabId) { safeCloseTab(STATE.editorTabId); STATE.editorTabId = null; }"

target2 = "const flow = await getDirectFlowContext();\n  log(\"Opened a fresh Flow project"
replacement2 = "const flow = await getDirectFlowContext();\n  STATE.editorTabId = flow.tabId;\n  log(\"Opened a fresh Flow project"

if target1 in code and target2 in code:
    code = code.replace(target1, replacement1)
    code = code.replace(target2, replacement2)
    with open(path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Patched successfully")
else:
    print("Not found")

