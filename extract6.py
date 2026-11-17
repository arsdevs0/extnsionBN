import re
with open("auto_flow/assets/adapter-LgTzSSDb.js", "r", encoding="utf-8") as f:
    text = f.read()
# Let's dump all strings that look like typical RPC IDs
# We know 'iMpj6e' is project.createProject.
for match in re.finditer(r'\{[^\}]*"image_generate"\s*:\s*\"([a-zA-Z0-9_]{5,10})\"', text):
    print(match.group(0))
