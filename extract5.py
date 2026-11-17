import os, re
for root, dirs, files in os.walk('auto_flow'):
    for f in files:
        if f.endswith('.js'):
            with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                text = file.read()
                for match in re.finditer(r'https://glab\.duckmartians\.info[^\'\"\`]*', text):
                    print(f, match.group(0))
