import re
with open("auto_flow/assets/adapter-LgTzSSDb.js", "r", encoding="utf-8") as f:
    text = f.read()
idx = text.find('class ur')
if idx == -1:
    idx = text.find('class ') # Let's find any class that has rpcid
    
matches = re.finditer(r'class [a-zA-Z0-9_]+\{[^}]*rpcid', text)
for m in matches:
    print(text[m.start():m.start()+500])
