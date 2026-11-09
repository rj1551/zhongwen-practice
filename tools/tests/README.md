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
