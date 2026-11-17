
import os

path = "d:/pfGG/popup.html"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

code = code.replace("<title>Flipo</title>", "<title>Guc guy</title>")
code = code.replace("alt=\"Flipo logo\">", "alt=\"Guc guy logo\">")
code = code.replace("<h1>Big<span>BOMB</span></h1>", "<h1>Guc<span> guy</span></h1>")
code = code.replace("<strong id=\"flowTitle\">Flipo account</strong>", "<strong id=\"flowTitle\">Guc guy account</strong>")
code = code.replace("from the Flipo folder", "from the Guc guy folder")
code = code.replace("pairing a phone with Flipo", "pairing a phone with Guc guy")
code = code.replace("<b>Flipo Classic</b>", "<b>Guc guy Classic</b>")
code = code.replace("src=\"assets/Flipo-logo.svg\"", "src=\"icon128.png\"")

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated popup.html")

