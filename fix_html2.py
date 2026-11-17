
import os

path = "d:/pfGG/popup.html"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

replacement = """
      <section class="section-block body-tuning-section">
        <div class="section-title"><span>Body Tuning (Highest Priority)</span></div>
        <div class="settings-grid" style="grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
          <label><span>Chest / Boobs</span><select id="tuneChest">
            <option value="">Default/Auto</option>
            <option value="very large, heavy, natural breasts, 56-inch bust">Extra Large / Heavy</option>
            <option value="large, full, voluptuous breasts">Large / Voluptuous</option>
            <option value="moderate, proportional breasts">Moderate</option>
            <option value="flat, small breasts">Small / Flat</option>
          </select></label>
          <label><span>Hips & Thighs</span><select id="tuneHips">
            <option value="">Default/Auto</option>
            <option value="extremely wide hips, 56-inch hips, very thick thighs, heavy lower body">Extra Thick / Wide</option>
            <option value="wide rounded hips, thick thighs, curvy lower body">Curvy / Broad</option>
            <option value="moderate hips, average thighs">Moderate</option>
            <option value="narrow hips, slim thighs">Slim / Narrow</option>
          </select></label>
          <label><span>Belly / Navel</span><select id="tuneNavel">
            <option value="">Default/Auto</option>
            <option value="soft, non-flat chubby stomach, plump belly, visible deep navel">Chubby + Exposed Navel</option>
            <option value="soft, non-flat stomach, lower-abdominal fullness">Soft Belly</option>
            <option value="flat, toned stomach, visible navel">Flat + Exposed Navel</option>
            <option value="flat, toned stomach">Flat / Toned</option>
          </select></label>
        </div>
      </section>

      <section class="section-block settings-section">
"""

code = code.replace("<section class=\"section-block settings-section\">", replacement)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("Added UI in popup.html")

