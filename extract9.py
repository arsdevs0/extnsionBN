import re
with open("auto_flow/assets/adapter-LgTzSSDb.js", "r", encoding="utf-8") as f:
    text = f.read()
# find occurrences of rpcids object
for match in re.finditer(r'rpcids:\s*\{[^}]+\}', text):
    print(match.group(0))
