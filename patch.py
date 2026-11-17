
with open('popup.html', 'r', encoding='utf-8') as f:
    html = f.read()
target = '<div class=\"story-options\">'
replacement = target + '\n          <label class=\"story-bg-label\"><span>Panel background</span><select id=\"storyBgStyle\"><option value=\"real\" selected>Real background</option><option value=\"manhwa\">White / Manhwa style</option><option value=\"black\">Black background</option></select></label>'
if target in html:
    html = html.replace(target, replacement)
    with open('popup.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print('Replaced')
else:
    print('Not found')

