import os
import shutil
import re

ROOT = "."

def convert_pages(folder):
    """تحويل page.html إلى page/index.html"""
    for item in list(os.listdir(folder)):
        full = os.path.join(folder, item)

        if os.path.isdir(full):
            convert_pages(full)
            continue

        if item.endswith(".html") and item != "index.html":
            name = item[:-5]
            new_dir = os.path.join(folder, name)
            os.makedirs(new_dir, exist_ok=True)

            shutil.move(full, os.path.join(new_dir, "index.html"))
            print(f"Moved: {full}")

def fix_links():
    """تعديل روابط الصفحات فقط"""
    for root, dirs, files in os.walk(ROOT):
        for file in files:
            if file.endswith(".html"):
                path = os.path.join(root, file)

                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()

                original = text

                # يحول أي رابط ينتهي بـ .html (عدا index.html)
                text = re.sub(
                    r'((?:href|src)\s*=\s*["\'])(?!https?:|mailto:|tel:)([^"\']+?)\.html(["\'])',
                    lambda m: m.group(1) +
                              (m.group(2) if m.group(2).endswith("index") else m.group(2) + "/")
                              + m.group(3),
                    text
                )

                if text != original:
                    with open(path, "w", encoding="utf-8") as f:
                        f.write(text)

                    print(f"Updated: {path}")

print("=== تحويل الصفحات ===")
convert_pages(ROOT)

print("\n=== تعديل الروابط ===")
fix_links()

print("\n✅ تم الانتهاء بنجاح.")
