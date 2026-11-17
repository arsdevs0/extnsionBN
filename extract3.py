with open('auto_flow/assets/adapter-LgTzSSDb.js', 'r', encoding='utf-8') as f:
    text = f.read()
for func in ['z', 'F', '_', '_r']:
    idx = text.find('function ' + func + '(')
    if idx != -1:
        print(text[idx:idx+300])
