import os, re
for root, dirs, files in os.walk('auto_flow'):
    for f in files:
        if f.endswith('.js'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                text = file.read()
                # Find decryption function G
                idx = text.find('function G(')
                if idx != -1:
                    print(f"Found G in {f}")
                    print(text[idx:idx+300])
