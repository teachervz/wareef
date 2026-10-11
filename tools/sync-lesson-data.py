#!/usr/bin/env python3
"""Copy lesson-index.json into js/lesson-data.js.

lesson-index.json is the authoritative textbook index. Browsers block reading
JSON files from pages opened with file://, so the pages load the same data
from js/lesson-data.js instead. Run this after every edit to lesson-index.json:

    python3 tools/sync-lesson-data.py
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "lesson-index.json").read_text(encoding="utf-8"))
js = ("/* AUTO-GENERATED from lesson-index.json by tools/sync-lesson-data.py — do not edit by hand. */\n"
      "window.LESSON_INDEX = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n")
(root / "js" / "lesson-data.js").write_text(js, encoding="utf-8")
count = sum(len(u["lessons"]) for u in data["units"])
print(f"js/lesson-data.js updated: {len(data['units'])} groups, {count} entries")
