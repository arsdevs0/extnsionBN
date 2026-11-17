with open("auto_flow/assets/naming-Bysx_Vg_.js", "r", encoding="utf-8") as f:
    text = f.read()
idx = text.find('function $(')
if idx != -1:
    print(text[idx:idx+300])
