import sys
with open('auto_flow/assets/adapter-LgTzSSDb.js', 'r', encoding='utf-8') as f:
    text = f.read()
for func in ['Er', 'kr']:
    idx = text.find('function ' + func + '(')
    if idx != -1:
        start = idx
        brace_count = 0
        in_string = False
        str_char = ''
        i = text.find('{', start)
        if i != -1:
            brace_count = 1
            i += 1
            while i < len(text) and brace_count > 0:
                c = text[i]
                if in_string:
                    if c == '\\': i += 1
                    elif c == str_char: in_string = False
                else:
                    if c == '"' or c == "'" or c == '`': in_string = True; str_char = c
                    elif c == '{': brace_count += 1
                    elif c == '}': brace_count -= 1
                i += 1
            print(text[start:i] + "\n====================\n")
