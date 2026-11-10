# Browser tests (Playwright + Chromium), written 2026-11-06 in the build chat

These drive the built app (`docs/`) in Chromium with fakes in place of the outside services:
a fake GitHub (in-memory git with fast-forward checks), fake Gemini/Groq, a fake Cloudflare R2 that checks every
request's Signature V4, and a fake `window.claude` for the hosted version.

How they were run (paths are hard-coded for the cloud sandbox; adjust if yours differ):
1. `./build.sh`, then copy `docs/` to `/home/claude/tests/site` and serve it:
   `setsid python3 -m http.server 8765 -d /home/claude/tests/site > /tmp/http.log 2>&1 < /dev/null &`
   (`keepalive.test.js` also needs a copy in `site2/` with `https://api.github.com/repos/` replaced by
   `http://localhost:8766/repos/`, served on 8767.)
2. Run from the folder holding these files: `node gh.test.js` (sync, 37 checks), `pack.test.js` (packs/outbox),
   `grade.test.js` (grading chain), `req.test.js` (requests), `check.test.js` (sample re-check), `r2.test.js`
   (audio), `hosted.test.js` + `hostedgrade.js` (hosted version), `sigv4.test.js` (signing vs AWS examples).
   `listen.test.js` (2026-11-07, 72 checks incl. the pinned player bar, Aa menu, line-by-line timing, songs vs talk; word popup outside tap; transcript size, 简/繁 both ways, pinyin, lookups from lyrics, no sideways scroll; LRCLIB match + order; fix timing; tap along; 20-minute sections; deleting that sticks + Recently deleted). `r2.test.js` now expects cloud audio to go only when a bin entry is deleted for good.
   Playwright is loaded from `/home/claude/.npm-global/lib/node_modules/playwright`.
Each prints PASS/FAIL lines and "ALL PASSED". `sigv4.js` is the same signer as in index.html.
- `time.test.js` (2026-11-08): time log split into scheduled / extra / reading, per device, older days, the Progress 时间 card.
- `held.test.js` (2026-11-08): requests the daily run held back as suspicious are closed and shown on the stock card.
- Daily-run guards (no browser): `tools/daily-run/inputs.js` (checked, trimmed inputs; suspicious requests held) and `push-pack.sh` (pushes only packs/, after the check) — tried by hand on fake repos with injected text.
- `lyrics.test.js` (2026-11-08): Claude's lyric analysis — requests, answers per lyrics version, word split / sung pinyin / tricky underline / 解释 Notes, do-all flag.
- `merge.test.js` (2026-11-09): songs/texts merge by group of fields, settings key by key, the do-all-lyrics choice by time; answers stay a union. `r2.test.js` also covers the usage line and the free-10-GB upload guard.
- `pyfix.test.js` (2026-11-09): Claude's pinyin check — requests carry the app's pinyin per line; corrections only (position + 1–4 characters + reading / grouping / meaning); 一/不 tone changes on the device; up to 30 songs a run (the Do-all button was removed).
- `sen.test.js` (2026-11-09): sentence parsing — after answering, the words in the "how it parses" breakdown open the dictionary popup (readings, save with the whole sentence, src `S:<id>`); 继续 closes it.
- `daystart.test.js` (2026-11-10): the app day starts at 3:38 am (New York time zone in the test, daylight-saving nights included) — day labels, due times at 3:38, once-a-day rule, time log, home date, migration of old 12:00 am due times.
