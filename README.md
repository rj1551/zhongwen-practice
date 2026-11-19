# 中文练功房

A personal Mandarin trainer built around one problem: reading is far ahead of writing, and reading itself is slow.

**Use it:** https://rj1551.github.io/zhongwen-practice/ (add it to the home screen; it works offline).
Anyone opening the link gets an empty copy. Progress lives only on your device until you connect your own private data repo.

## What's in it
- **练 Practice**: one endless session (optional 5/15/30-minute goal). Each day starts with **today's set**: reviews, a
  daily allowance of new items, one free-writing question, then a reading passage; a ✓ when it's done, and you can
  keep going. Drill types: production ladder (pick the natural sentence → cloze → tiles → hinted typing → free
  typing), sentence parsing (短句精读), words in context and new words, free writing (a question in Chinese answered
  in one sentence, no reference answer; a miss comes back once a few days later), re-reads. Reviews are scheduled
  with FSRS; no due counts, no visible clocks, slow-but-right is never wrong.
- **读 Reading**: built-in and generated passages, or paste your own text. Tap any word for pinyin and meaning
  (CC-CEDICT) and save it for review. First reads are timed quietly to track reading speed.
- **听 Listening**: your own audio from a file or link, with a transcript or timed lyrics from LRCLIB. Follow mode,
  line replay, lost-it marks, line-by-line timing (对时间) and tap-along, 简/繁 both ways, inline pinyin with 一/不
  tone changes, play all (连播), karaoke-style view for songs.
  **刷歌词 Lyric feed**: endless cards of one lyric line each, no pinyin, the song playing from just before the line;
  tap a character you weren't sure of to see its reading in that line. Those characters come back sooner, in other
  lines.
- **进度 Progress**: skills, time spent (today's set / extra / writing / reading / KTV), saved words, settings, sync,
  keys, cloud audio, stock for the daily run, error log, export to Anki/Pleco, version + build time at the bottom.

## How the pieces fit
- **Sync**: progress syncs through a private GitHub repo (`progress/`) and is always merged, never overwritten.
  Each device enters only a GitHub token; other keys sync from that repo.
- **Grading** of typed answers: Gemini Flash-Lite → Groq Qwen → self-grade. Answers written offline are graded
  automatically once back online. Claude re-checks a sample of model grades, and every free-writing answer, in the
  daily run.
- **Daily Claude run**: a scheduled Claude task reads the app's note (`outbox.json`: what's running short to stay
  ahead, requests such as regrades, example sentences, free-writing checks, pinyin checks for songs), writes a pack to
  `packs/`, and the app picks it up on its next sync. Runbook, input checks, pack checker and push script are in
  `tools/daily-run/`.
- **Audio** is uploaded to the user's own Cloudflare R2 bucket so other devices can download it.
- **Offline**: the service worker serves the last version opened online (after at most ~3 s with no signal);
  everything local works, and network things (sync, grading, packs, LRCLIB, audio downloads) wait. The dictionary
  files sit in their own cache, so a normal update downloads ~1 MB, not ~8 MB.
- **Script lock**: the page carries a Content-Security-Policy that lets only its own script run (by SHA-256
  fingerprint, written by `tools/csp.py` at build time), so injected text can't run code.
- A **Claude-hosted artifact** version (much older code) still exists as a backup, bridged only by copy/merge codes
  under 进度 → 搬运进度.

No lyrics or audio are shipped in this repo.

## Working on it
- Rules for Claude sessions (and a good checklist for anyone): `CLAUDE.md`.
- Edit `index.html` (the whole app) or `data/`, then run `./build.sh` to refresh `docs/`, which GitHub Pages serves
  (deploys in ~1–2 min). Never edit `docs/` by hand: the build stamps the version and the script fingerprint.
- Every release bumps `CACHE` in `sw.js` (`zwlgf-vNN`); `DATA` (`zwlgf-data-N`) only when `data/cedict.txt` or
  `data/zhconv.txt` changes. A home-screen app updates after a full close and reopen online, or via 切换 Switch when
  it says a new version is ready.
- **Tests**: `tools/tests/run-all.sh` builds, starts its own servers and runs every browser suite (Playwright +
  Chromium, with fake GitHub/Gemini/Groq/R2); `--no-build` tests `docs/` as committed; name suites to run only
  those. GitHub runs the same on every push (`.github/workflows/tests.yml`) and also checks `docs/` matches the
  sources. Details: `tools/tests/README.md`.
- `tools/`: data generators for `data/` (see `tools/README.md`), the daily run (`tools/daily-run/`), `csp.py`, tests.

## Credits
Dictionary: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) (CC BY-SA 4.0, `data/CEDICT-LICENSE.txt`). Simplified ⇄ traditional table from [OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0, `data/OPENCC-LICENSE.txt`). Timed lyrics are looked up live from [LRCLIB](https://lrclib.net).
