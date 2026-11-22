# 中文练功房

A personal Mandarin trainer built around one problem: reading is far ahead of writing, and reading itself is slow.
It was made for one learner (the repo owner), so some parts assume that learner's history and accounts. See
[Using it yourself](#using-it-yourself) for what that means and what you'd need.

The live copy: https://rj1551.github.io/zhongwen-practice/ (add it to the home screen; it works offline).

## What's in it
- **练 Practice**: one endless session (optional 5/15/30-minute goal). Each day starts with **today's set**: reviews, a
  daily allowance of new items, one free-writing question, then a reading passage; a ✓ when it's done, and you can
  keep going. Drill types: production ladder (pick the natural sentence → cloze → tiles → hinted typing → free
  typing), sentence parsing (短句精读), words in context and new words, free writing (a question in Chinese answered
  in one sentence, no reference answer; a miss comes back once a few days later), re-reads. Reviews are scheduled
  with FSRS; no due counts, no visible clocks, slow-but-right is never wrong.
- **读 Reading**: built-in and generated passages (including 微博·抖音-style posts that use current slang), or paste
  your own text. Tap any word for pinyin and meaning (CC-CEDICT) and save it for review. First reads are timed
  quietly to track reading speed.
  **书架 Books**: add a book as .txt (UTF-8 or GBK) or .epub (not copy-protected). Chapters come from the book's table
  of contents or from heading lines (第一章…, "1. 标题"…); traditional books are shown in simplified, with the original
  a tap away. Read by scrolling or by pages, with font size, search through the whole book (🔍 or Ctrl/Cmd+F), an
  automatic bookmark and the same word popup. Book reading has its own speed and lookups-per-1,000-characters
  figures (in 进度, never while reading) and doesn't count toward today's set.
- **听 Listening**: your own audio from a file or link, with a transcript or timed lyrics from LRCLIB. Follow mode,
  line replay, lost-it marks, line-by-line timing (对时间) and tap-along, 简/繁 both ways, inline pinyin with 一/不
  tone changes, play all (连播), karaoke-style view for songs.
  **刷歌词 Lyric feed**: runs of lyric lines with the song playing from just before them, no pinyin, 简/繁 toggle;
  tap a character you weren't sure of to see its reading in that line. Those characters come back sooner, in other
  lines.
- **进度 Progress**: skills, time spent (today's set / extra / writing / reading / books / KTV), book reading figures,
  saved words, settings, sync, AI keys, cloud storage (audio and books, Download all before a trip), stock for the
  daily run, recently deleted (30 days), error log, export to Anki/Pleco, version + build time at the bottom.

## How the pieces fit
- **Sync**: progress syncs through a private GitHub repo (`progress/`) and is always merged, never overwritten.
  Each device enters only a GitHub token; other keys sync from that repo (`settings/`).
- **Grading** of typed answers: Gemini Flash-Lite → Groq Qwen → self-grade. Answers written offline are graded
  automatically once back online. Claude re-checks a sample of model grades, and every free-writing answer, in the
  daily run.
- **Daily Claude run**: a scheduled Claude task reads the app's note (`outbox.json`: what's running short to stay
  ahead, requests such as regrades, example sentences, free-writing checks, pinyin checks for songs), writes a pack to
  `packs/`, and the app picks it up on its next sync. Runbook, input checks, pack checker and push script are in
  `tools/daily-run/`. It never searches the web: social-media slang comes only from `data/slang.json`.
- **Cloud storage**: listening audio and book texts go to the user's own Cloudflare R2 bucket (`audio/`, `books/`) so
  other devices can download them; progress only holds small records. Books and audio are also kept on each device.
- **Offline**: the service worker serves the last version opened online (after at most ~3 s with no signal);
  everything local works, and network things (sync, grading, packs, LRCLIB, downloads) wait. The dictionary files
  sit in their own cache, so a normal update downloads ~1 MB, not ~8 MB.
- **Script lock**: the page carries a Content-Security-Policy that lets only its own script run (by SHA-256
  fingerprint, written by `tools/csp.py` at build time), so injected text can't run code.
- A **Claude-hosted artifact** version (much older code) still exists as the owner's backup, bridged only by
  copy/merge codes under 进度 → 搬运进度.

No lyrics, audio or book texts are shipped in this repo.

## Using it yourself
Opening the live link gives you an empty copy that keeps its progress in your browser only. Nothing of yours reaches
the owner, and nothing of the owner's reaches you. What works with nothing set up, and what each extra unlocks:

| You have | What works |
|---|---|
| Just the link | Built-in drills, parsing sentences and passages; your own texts; the dictionary; books and listening files on this device; the lyric feed. Typed answers are self-graded. Progress lives in this browser only (clearing site data loses it; export a code under 进度 → 搬运进度 to keep a copy). |
| + a **private GitHub repo** and a fine-grained token with *Contents: read and write* on that repo only | Sync between devices and a backup of everything. Enter both under 进度 → 同步 on each device (the repo box defaults to the owner's, so change it to yours). AI and cloud keys entered on one device then reach your others. |
| + a **Gemini API key** (Google AI Studio, free tier) and/or a **Groq key** | Typed answers graded by a model instead of by you (进度 → 其他 AI). |
| + a **Cloudflare R2 bucket** (free tier: 10 GB) with an API token limited to it (*Object Read & Write*) and a CORS rule allowing GET, PUT and DELETE from the app's address (any headers, exposing `ETag` and `Content-Length`) | Audio and books on all your devices (进度 → 云端存储). |
| + a **Claude plan with scheduled tasks** (Claude Code on the web) and the GitHub repo above | New material and checks every night: drills, sentences, passages, example sentences for saved words, free-writing prompts and checks, regrades, pinyin checks for songs. The task clones this repo read-only and your data repo with push access, and follows `tools/daily-run/RUNBOOK.md`. Without it, the built-in material eventually runs out; you can also ask any Claude chat for a pack and paste it under 进度 → 备货. |

Parts that are the owner's and would need changing for someone else, which is easier in a fork (your own GitHub
Pages copy) than through the owner's link:
- **Word list**: `data/words.json` comes from the owner's Anki history. It decides the 熟 / 顽固 / … labels in the word
  popup, the "known words" share on passages, and which words the nightly run targets. Regenerate it from your own
  Anki export with `tools/mkwords.py` (see `tools/README.md`), or expect those labels to describe the owner, not you.
- **Built-in content** (drills, parsing sentences, passages) was written for the owner's weak points; it's general
  enough to use, but not tuned to you.
- **Names**: the RUNBOOK and the sync box's default name the owner's data repo (`rj1551/zhongwen-data`); change both.
- **Updates**: the live link changes whenever the owner releases. A fork lets you take updates when you choose.

## Working on it
- Rules for Claude sessions (and a good checklist for anyone): `CLAUDE.md`.
- Edit `index.html` (the whole app) or `data/`, then run `./build.sh` to refresh `docs/`, which GitHub Pages serves
  (deploys in ~1–2 min). Never edit `docs/` by hand: the build stamps the version and the script fingerprint.
- Every release bumps `CACHE` in `sw.js` (`zwlgf-vNN`); `DATA` (`zwlgf-data-N`) only when `data/cedict.txt` or
  `data/zhconv.txt` changes. A home-screen app updates after a full close and reopen online, or via 切换 Switch when
  it says a new version is ready.
- **Tests**: `tools/tests/run-all.sh` builds, starts its own servers and runs every browser suite (Playwright +
  Chromium, with fake GitHub/Gemini/Groq/R2; ~3 min); `--no-build` tests `docs/` as committed; name suites to run
  only those. GitHub runs the same on every push (`.github/workflows/tests.yml`) and also checks `docs/` matches the
  sources. Details: `tools/tests/README.md`.
- `tools/`: data generators for `data/` (see `tools/README.md`), the daily run (`tools/daily-run/`), `csp.py`, tests.

## Credits
Dictionary: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) (CC BY-SA 4.0, `data/CEDICT-LICENSE.txt`). Simplified ⇄ traditional table from [OpenCC](https://github.com/BYVoid/OpenCC) (Apache-2.0, `data/OPENCC-LICENSE.txt`). Timed lyrics are looked up live from [LRCLIB](https://lrclib.net).
