# Browser tests (Playwright + Chromium), written 2026-11-06 in the build chat

These drive the built app (`docs/`) in Chromium with fakes in place of the outside services:
a fake GitHub (in-memory git with fast-forward checks), fake Gemini/Groq, and a fake Cloudflare R2 that checks every
request's Signature V4. (The hosted-version tests were removed with the hosted code in v68.)

**Run them all (v69):** `tools/tests/run-all.sh` (builds first) or `tools/tests/run-all.sh --no-build` (tests the
committed `docs/`, as the GitHub `tests` workflow does on every push); add suite names to run only those. It makes
its own copies of `docs/` in a temp folder, starts the servers below and stops them, and exits non-zero if any suite
fails. Environment: `PLAYWRIGHT` (path to the playwright package; default `playwright`, the runner also tries the
global npm folder), `TEST_SITE` (the patched copy nosignal/update edit), `TEST_OUT` (screenshots). Pages whose script
text is patched for a test get a fresh script-lock fingerprint with `tools/csp.py` (else the app wouldn't start).

Older notes on running suites by hand (the runner now does all of this):
1. `./build.sh`, then copy `docs/` to `/home/claude/tests/site` and serve it:
   `setsid python3 -m http.server 8765 -d /home/claude/tests/site > /tmp/http.log 2>&1 < /dev/null &`
   (`keepalive.test.js` also needs a copy in `site2/` with `https://api.github.com/repos/` replaced by
   `http://localhost:8766/repos/`, served on 8767.)
2. Run from the folder holding these files: `node gh.test.js` (sync, 37 checks), `pack.test.js` (packs/outbox),
   `grade.test.js` (grading chain), `req.test.js` (requests), `check.test.js` (sample re-check), `r2.test.js`
   (audio), `sigv4.test.js` (signing vs AWS examples).
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
- `divider.test.js` (2026-11-10, reworked 2026-11-13): today's set done → a slim note above the next card for a few seconds (no full-screen divider), once per app day on any device; later sessions start with same-day retries, no second note, all time extra; home ✓; back the next day.
- `rhythm.test.js` (2026-11-13): today's allowance of new items (light/heavy load, card time not reading, 0 only when reviews fill the whole time, fixed per app day, trip pace) and placement (retries first, new items in the first ~40%, note after reviews + allowance).
- `nosignal.test.js` + `hangsrv.js` (2026-11-14): opening the app with no signal. `hangsrv.js` serves a copy of `docs/` and can be told to
  hang (accept requests, never answer, like a phone with no signal), be slow (5 s) or answer normally. Serve `docs/` copied to
  `/home/claude/tests/site` with the service-worker line's `location.protocol === "https:"` check removed (it only registers on https):
  `sed -i 's/ \&\& location.protocol === "https:") {/) {/' site/index.html` (since v68; v64–v67: `s/!window.claude \&\& location.protocol === "https:") {/!window.claude) {/`),
  then `setsid node hangsrv.js site 8790 &` and `node nosignal.test.js`. Checks: no signal → opens from the saved copy in ~3 s (before the
  fix it never opened); offline → at once; online → a new version straight away; slow → saved copy, and the late answer is saved for next time.
- `nudge.test.js` (2026-11-15, same server/site as `nosignal.test.js`): the 备份 Backup reminder never shows when GitHub sync is set up on the
  device (it used to flash on the first draw, before sync connected), and still shows on a device without sync.
- `update.test.js` (2026-11-16, same server/site): "新版本已下载 · New version ready". Online + same version → no notice; slow → opens the saved
  version, the notice appears once the late download is saved; hidden during practice, back on the next screen; ✕ hides it for that
  version; 切换 Switch runs the new version; an older saved copy never offers a switch.
- `vocab.test.js` (2026-11-16, 8765 server): what generated readings aim at — `reviewWords` (struggling saved/word cards
  first, then saved words not met yet), `fadingWords` (weak Anki words with interval > 30 days, no card in the app),
  `newWords` (weak words that never passed 30 days alternating with unseen HSK 7–9; not after 3 offers in generated
  passages); the note carries the three lists; `inputs.js` keeps them (and an older app's `forgottenWords`).
- `autowords.test.js` (2026-11-16, 8765 server): new words as cards — 5 picked words kept waiting, none before its
  sentence, sentence requests flagged `new`, alternation with saved words (both directions), 新词 first card without
  记得/忘了, 知道了 starts reviews, later label 词汇, 我认识 drops it for good, saving it from a reading keeps one card and
  its sentence, merge keeps `saved`. (`req.test.js` ignores `new` sentence requests since v67.)
- `cache.test.js` (2026-11-18, v68; own server on 8791, run `./build.sh` first): the two offline stores. A v67 device
  (one store with the dictionary) upgrades without downloading the dictionary or the 简/繁 table again (copied into
  `zwlgf-data-N`); an ordinary release renews only the app store; offline the dictionary still loads; bumping `DATA`
  in `sw.js` downloads it once and removes the old store. Checked against a deliberately broken copy step: it fails.
- `store.test.js` (2026-11-18, v68, 8765 server): saving on this device. Damaged saved progress is copied aside
  (`zwlgf:state:unreadable`) before anything is saved, home card, 复制 / 删掉 (two taps); with an older copy still kept
  nothing is written over until it's removed; storage full → toast once + home card, gone after a save that works;
  the error log (Progress → 出错记录): repeats counted, uncaught errors and promise rejections caught, last 30, copy,
  clear, a damaged log never breaks it.
- `csp.test.js` (2026-11-18, v69, 8765 server + its own on 8792): the script lock. The app starts and normal use
  (every tab, a session) causes no violations; https requests and blob: audio still work; injected `onerror=`,
  `javascript:` links, `<script>` elements, scripts from other sites, frames and objects are refused (checked: the
  same injections all run on a copy without the lock); the policy allows only the fingerprint (no eval, no inline);
  a stale fingerprint stops the app and `csp.py` fixes it; `csp.py` refuses markup with inline handlers.
- `sched.test.js` (2026-11-18, v72, 8765 server): scheduled reading. Due per the 阅读量 setting (1 every 2 days: not
  the day after a first read, again the day after that; 1 or 2 a day); the passage comes after the cards and the ✓ and
  the note wait for it; the full reader (word popup) inside practice; 今天不读 · No reading today gives the ✓ and
  doesn't carry over; 2 a day → two passages; newest pack passage first, genre setting decides; own texts never;
  ■ halfway → home card, a resumed read is marked `half` and doesn't count toward speed; a first read in 阅读 after the
  cards gives the ✓; nothing unread → ✓ as before; forecast unaffected; `cd`/`nr` flags merge. `divider.test.js` now
  starts with every passage read.
- `fw.test.js` (2026-11-18, v73, 8765 server, mocked Groq/Gemini): free writing. A built-in prompt after the cards,
  the ✓ waits for it; dictionary taps in the question; graded at once (no reference answer); a 2 → comeback in 3
  days, nothing shown, then last time's answer + correction, retired; a 3 → no comeback; time logged as `fw`, not card
  time; 加入练习 → a `fwdrill` request, answered by a pack drill with its rid; Claude's checks in the note, Claude's
  grade wins both ways and shows as a regrade; offline → kept, graded later, feedback card next session; pack prompts
  (topic requests first), the topics box, stock `short.fw`, merge of answer/comeback groups, forecast unaffected;
  `inputs.js` and `check-pack.js` on the new request kinds and pack fields. `sched.test.js` / `divider.test.js` start
  with today's free writing done / no prompts left.
