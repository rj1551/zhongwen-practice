// Time log (2026-11-08): scheduled vs extra exercises vs reading, per device (two devices on one day add up),
// older days kept as "not split", the Progress → 时间 card with 7 / 30 / 12 weeks / all. Serve docs/ on 8765.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(() => {
    const out = {}, k = dayKey();
    S.log = {}; S.log[dayKey(now() - 40 * DAY)] = { n: 30, ok: 25, sec: 1800 }; // an old-format day
    logDay(100, true); logDay(50, false); logDone(); logDay(200, true, "extra"); logDay(300, true, "read");
    out.today = JSON.parse(JSON.stringify(S.log[k]));
    // the other device the same day, and an older-code copy of the day (totals only)
    const other = JSON.parse(JSON.stringify(S)); const dv = Object.keys(S.log[k].by)[0];
    other.log[k].by = { dX: { n: 3, ok: 3, due: 120, extra: 0, rd: 60 } }; logTotals(other.log[k]);
    const m = mergeStates(S, other); out.merged = m.log[k];
    const legacy = { n: m.log[k].n, ok: m.log[k].ok, sec: m.log[k].sec }; // what old code would send back
    out.again = mergeLogDay(m.log[k], legacy);
    out.oldDay = mergeLogDay({ n: 30, ok: 25, sec: 1800 }, { n: 20, ok: 18, sec: 2400 });
    // a day started by older code, then continued here
    S.log[k] = { n: 5, ok: 5, sec: 600 }; logDay(60, true); out.cont = JSON.parse(JSON.stringify(S.log[k]));
    S.log[k] = out.merged; save();
    return out;
  });
  const t = r.today, dv = Object.keys(t.by)[0];
  ok(t.by[dv].due === 150 && t.by[dv].extra === 200 && t.by[dv].rd === 300 && t.by[dv].done === 1, "scheduled, extra and reading are counted apart, and 'all reviews done' is noted: " + JSON.stringify(t.by[dv]));
  ok(t.sec === 650 && t.n === 3, "totals still add up (reading time counts, but not as an answered card): " + t.sec + " s, " + t.n);
  ok(r.merged.sec === 650 + 180 && Object.keys(r.merged.by).length === 2, "two devices on the same day add up instead of keeping the larger: " + r.merged.sec);
  ok(r.again.sec === r.merged.sec, "a copy of the day from older code (totals only) doesn't count twice: " + r.again.sec);
  ok(r.oldDay.sec === 2400 && !r.oldDay.by, "two old-format days merge as before (larger)");
  ok(r.cont.old.sec === 600 && r.cont.sec === 660, "a day begun by older code keeps its time as 'not split' and adds the new: " + r.cont.sec);
  await page.click('#tabs button[data-tab="me"]'); await sleep(300);
  const card = () => page.locator("#timecard").innerText();
  let txt = await card();
  ok(/该复习的 scheduled 5 min/.test(txt) && /额外 extra 3 min/.test(txt) && /阅读 Reading 6 min/.test(txt), "(both devices) the card splits exercises into scheduled + extra, and reading: " + txt.split("\n").filter(l => /Exercises|Reading/.test(l)).join(" | "));
  ok(await page.locator("#timecard .tb").count() === 7 && /✓/.test(txt), "7 days by default, ✓ on a day all reviews were done");
  ok(/今天|周/.test(await page.locator(".tdet").innerText()) && /\d+ min/.test(await page.locator(".tdet").innerText()), "the latest bar's minutes are shown under the chart without hovering: " + await page.locator(".tdet").innerText());
  await page.locator('[data-tb="0"]').click(); await sleep(100);
  ok(await page.locator('.tb.sel').getAttribute("data-tb") === "0" && /nothing logged|min/.test(await page.locator(".tdet").innerText()), "tapping another bar shows its breakdown: " + await page.locator(".tdet").innerText());
  await page.click('[data-tr="30"]'); ok(await page.locator("#timecard .tb").count() === 30, "30 days");
  await page.click('[data-tr="12w"]'); ok(await page.locator("#timecard .tb").count() === 12, "12 weeks");
  await page.click('[data-tr="all"]'); await sleep(100); txt = await card();
  ok(await page.locator("#timecard .tb").count() >= 2 && /Earlier, not split/.test(txt) && /30 min/.test(txt), "all: by month, older days shown as 'not split' (the 30-minute day 40 days ago)");
  const hs = await page.evaluate(() => [...document.querySelectorAll("#timecard .tcol")].map(c => c.offsetHeight)); ok(hs.every(h => h > 50), "bars have room on a phone");
  const keep = await page.evaluate(() => { for (let i = 0; i < 900; i++) S.log[dayKey(now() - (i + 100) * DAY)] = { n: 1, ok: 1, sec: 60 }; save(); return Object.keys(S.log).length; });
  ok(keep === 800, "about two years of days are kept (was 120): " + keep);
  await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
