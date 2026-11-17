import re
with open("auto_flow/assets/adapter-LgTzSSDb.js", "r", encoding="utf-8") as f:
    text = f.read()
for match in re.finditer(r"https://glab.duckmartians.info[^\"]*", text):
    print(match.group(0))
