import re

path = r'd:\pfGG\popup.html'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

new_ui = """      <section class="section-block body-tuning-section">
        <div class="section-title"><span>Body Tuning (Highest Priority)</span></div>
        <div class="settings-grid" style="grid-template-columns: 1fr 1fr; gap: 8px;">
          <label><span>Height</span><input type="text" id="tuneHeight" placeholder="e.g. 5'5 or Short"></label>
          <label><span>Weight</span><input type="text" id="tuneWeight" placeholder="e.g. 85kg or Heavy"></label>
          <label><span>Bust / Chest</span><input type="text" id="tuneBust" placeholder="e.g. 56-inch or Huge"></label>
          <label><span>Waist</span><input type="text" id="tuneWaist" placeholder="e.g. Soft, 36-inch, Narrow"></label>
          <label><span>Hips & Thighs</span><input type="text" id="tuneHips" placeholder="e.g. 56-inch, Wide"></label>
          <label><span>Belly / Navel</span><input type="text" id="tuneNavel" placeholder="e.g. Chubby, exposed navel"></label>
        </div>
      </section>"""

# We need to replace the old body-tuning-section. It starts at <section class="section-block body-tuning-section"> 
# and ends right before <section class="section-block settings-section">
code = re.sub(r'<section class="section-block body-tuning-section">.*?(?=<section class="section-block settings-section">)', new_ui + '\n\n', code, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated popup.html UI')
