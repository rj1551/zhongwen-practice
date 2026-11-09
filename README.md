# 中文练功房

A personal Mandarin trainer built around one problem: reading is far ahead of writing, and reading itself is slow.

**Use it:** https://rj1551.github.io/zhongwen-practice/ (add it to the home screen; it works offline).
Anyone opening the link gets an empty copy. Progress lives only on your device until you connect your own private data repo.

## What's in it
- **练 Practice**: one endless session (optional 5/15/30-minute goal). Production-ladder drills (pick the natural sentence → cloze → tiles → hinted typing → free typing), sentence parsing (短句精读), words in context, re-reads. Reviews are scheduled with FSRS; no due counts, no visible clocks, slow-but-right is never wrong.
- **读 Reading**: built-in and generated passages, or paste your own text. Tap any word for pinyin and meaning (CC-CEDICT) and its status in the old Anki deck; save words.
- **听 Listening**: your own audio from a file or link, with a transcript or timed lyrics from LRCLIB. Follow mode, line replay, lost-it marks, line-by-line timing (对时间) and tap-along, 简/繁 both ways, inline pinyin with 一/不 tone changes, play all (连播), karaoke-style view for songs.
- **进度 Progress**: skills, time, saved words, settings, sync, keys, cloud audio, export to Anki/Pleco, version + build time at the bottom.

## How the pieces fit
- **Sync**: progress syncs through a private GitHub repo (`progress/`) and is always merged, never overwritten. Each device enters only a GitHub token; other keys sync from that repo.
- **Grading** of typed answers: Gemini Flash-Lite → Groq Qwen → self-grade. Answers written offline are graded automatically once back online.
- **Daily Claude run**: a scheduled Claude task reads the app's note (`outbox.json`: what's running short, requests such as regrades, example sentences, questions, pinyin checks for songs), writes a pack to `packs/`, and the app picks it up on its next sync. Runbook, input checks, pack checker and push script are in `tools/daily-run/`.
- **Audio** is uploaded to the user's own Cloudflare R2 bucket so other devices can download it.
- **Offline**: the service worker serves the last version opened online; everything local works, and network things (sync, grading, packs, LRCLIB, audio downloads) wait.
- A **Claude-hosted artifact** version (older code) still exists as a backup, bridged by copy/merge codes under 进度 → 搬运进度.

No lyrics or audio are shipped in this repo.

## Working on it
- Edit `index.html` (the whole app) or `data/`, then run `./build.sh` to refresh `docs/`, which GitHub Pages serves (deploys in ~1–2 min).
- When cached files change, bump `CACHE` in `sw.js` (e.g. `zwlgf-v53` → `zwlgf-v54`); build.sh stamps it with the build time into the version shown in Progress. A home-screen app updates after a full close and reopen while online.
- `tools/`: data generators for `data/` (see `tools/README.md`), the daily run (`tools/daily-run/`), and browser tests with fake GitHub/Gemini/Groq/R2 (`tools/tests/README.md`).

## Credits
Dictionary: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) (CC BY-SA 4.0, `data/CEDICT-LICENSE.txt`). Simplified ⇄ traditional table from [OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0, `data/OPENCC-LICENSE.txt`). Timed lyrics are looked up live from [LRCLIB](https://lrclib.net).
