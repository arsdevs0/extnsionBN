
import os

path = "d:/pfGG/popup.js"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add to STORAGE
code = code.replace("storyBgStyle: \"bb_story_bg_style\"", "storyBgStyle: \"bb_story_bg_style\", tuneChest: \"bb_tune_chest\", tuneHips: \"bb_tune_hips\", tuneNavel: \"bb_tune_navel\"")

# 2. Add Event Listeners (Find where storyBgStyle is listened to)
target_listen = "byId(\"storyBgStyle\").addEventListener(\"change\",() => chrome.storage.local.set({ [STORAGE.storyBgStyle]:byId(\"storyBgStyle\").value }));"
replacement_listen = target_listen + """
byId("tuneChest").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneChest]: byId("tuneChest").value }));
byId("tuneHips").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneHips]: byId("tuneHips").value }));
byId("tuneNavel").addEventListener("change", () => chrome.storage.local.set({ [STORAGE.tuneNavel]: byId("tuneNavel").value }));
"""
code = code.replace(target_listen, replacement_listen)

# 3. Add to init load
target_load = "byId(\"storyBgStyle\").value = saved(\"storyBgStyle\") || \"real\";"
replacement_load = target_load + """
  byId("tuneChest").value = saved("tuneChest") || "";
  byId("tuneHips").value = saved("tuneHips") || "";
  byId("tuneNavel").value = saved("tuneNavel") || "";
"""
code = code.replace(target_load, replacement_load)

# 4. Add to bb_generate message
target_msg = "storyBgStyle:isStory ? byId(\"storyBgStyle\").value : \"real\","
replacement_msg = target_msg + """
        tuneChest: byId("tuneChest").value,
        tuneHips: byId("tuneHips").value,
        tuneNavel: byId("tuneNavel").value,
"""
code = code.replace(target_msg, replacement_msg)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("Updated popup.js")

