# 中文练功房

A personal Mandarin trainer built around one problem: reading is far ahead of writing.

- **Placement test**: words in context, chunking, news parsing, natural vs. English-shaped Chinese, writing, timed reading.
- **Production ladder**: each drill climbs 5 rungs, from picking the natural sentence to writing it from scratch.
- **Chunking drills**: split running text into the units you'd read.
- **Reader**: tap any word for pinyin, gloss and its status in your old Anki deck.

Two versions share this code:
- **Claude-hosted artifact**: AI grading, generated passages and drills, progress synced to your Claude account.
- **This repo on GitHub Pages** (`docs/`): installable and fully offline, no AI. Built for use in China.

Move progress between them with 进度 → 导出 / 导入.

Edit `index.html` or `data/`, then run `./build.sh` to refresh `docs/`.
