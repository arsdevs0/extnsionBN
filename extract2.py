with open('auto_flow/assets/adapter-LgTzSSDb.js', 'r', encoding='utf-8') as f:
    text = f.read()
idx = text.find('function Er(')
if idx != -1:
    print(text[idx:idx+1500])
