import re

path = r'd:\pfGG\popup.js'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update STORAGE keys
old_storage = 'tuneChest: "bb_tune_chest", tuneHips: "bb_tune_hips", tuneNavel: "bb_tune_navel"'
new_storage = 'tuneHeight: "bb_tune_height", tuneWeight: "bb_tune_weight", tuneBust: "bb_tune_bust", tuneWaist: "bb_tune_waist", tuneHips: "bb_tune_hips", tuneNavel: "bb_tune_navel"'
code = code.replace(old_storage, new_storage)

# 2. Update listeners (find the old ones and replace)
old_listeners = """
byId("tuneChest").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneChest]: byId("tuneChest").value }));
byId("tuneHips").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneHips]: byId("tuneHips").value }));
byId("tuneNavel").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneNavel]: byId("tuneNavel").value }));
"""
new_listeners = """
['tuneHeight', 'tuneWeight', 'tuneBust', 'tuneWaist', 'tuneHips', 'tuneNavel'].forEach(id => {
  byId(id).addEventListener("input", () => chrome.storage.local.set({ [STORAGE[id]]: byId(id).value }));
});
"""
if 'byId("tuneChest").addEventListener' in code:
    code = re.sub(r'byId\("tuneChest"\).addEventListener.*?\);', '', code, flags=re.DOTALL)
    code = re.sub(r'byId\("tuneHips"\).addEventListener.*?\);', '', code, flags=re.DOTALL)
    code = re.sub(r'byId\("tuneNavel"\).addEventListener.*?\);', '', code, flags=re.DOTALL)
    # Insert new listeners right after storyBgStyle
    code = code.replace('byId("storyBgStyle").addEventListener("change",() => chrome.storage.local.set({ [STORAGE.storyBgStyle]:byId("storyBgStyle").value }));',
                        'byId("storyBgStyle").addEventListener("change",() => chrome.storage.local.set({ [STORAGE.storyBgStyle]:byId("storyBgStyle").value }));\n' + new_listeners)


# 3. Update init load
old_load = """
  byId("tuneChest").value = saved("tuneChest") || "";
  byId("tuneHips").value = saved("tuneHips") || "";
  byId("tuneNavel").value = saved("tuneNavel") || "";
"""
new_load = """
  ['tuneHeight', 'tuneWeight', 'tuneBust', 'tuneWaist', 'tuneHips', 'tuneNavel'].forEach(id => {
    byId(id).value = saved(id) || "";
  });
"""
if 'byId("tuneChest").value' in code:
    code = code.replace(old_load.strip(), new_load.strip())

# 4. Update bb_generate payload
old_payload = """
        tuneChest: byId("tuneChest").value,
        tuneHips: byId("tuneHips").value,
        tuneNavel: byId("tuneNavel").value,
"""
new_payload = """
        tuneHeight: byId("tuneHeight").value,
        tuneWeight: byId("tuneWeight").value,
        tuneBust: byId("tuneBust").value,
        tuneWaist: byId("tuneWaist").value,
        tuneHips: byId("tuneHips").value,
        tuneNavel: byId("tuneNavel").value,
"""
if 'tuneChest: byId("tuneChest").value' in code:
    code = code.replace(old_payload.strip(), new_payload.strip())

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated popup.js state logic')
