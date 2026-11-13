// Today's allowance of new items and where they go (2026-11-13, learner; claude/design-new-material-rhythm.md):
// sized so the next 2 weeks' reviews take ~half the usual card time (not reading), 1–12 a day (0 only when reviews
// alone fill the whole usual time), set once per app day, trip pace during a trip; mixed into roughly the first 40%
// of a session after same-day retries; the note only once reviews and the allowance are done.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, timezoneId: "America/New_York" });
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(() => {
    const o = {}, at = s => new Date(s).getTime(), set = s => { CLOCK_OFF = at(s) - Date.now(); };
    const logDays = (mins, rd = 0) => { S.log = {}; for (let i = 1; i <= 14; i++) S.log[dayKey(now() - i * DAY)] = { n: 10, ok: 9, sec: (mins + rd) * 60, by: { dv: { n: 10, ok: 9, due: mins * 60, extra: 0, rd: rd * 60, done: 1 } } }; };
    const fresh = () => { S.items = {}; S.repeat = []; S.nb = null; S.settings = Object.assign({}, S.settings, { stock: null }); };
    // answer a card the way practice would (85% / 90% right), so the next block sees today's new items
    const answer = c => {
      if (c.t === "lad") recordLadder(c.id, c.r || 5, 3, c.r === 4 || c.r === 5 ? "x" : undefined);
      else if (c.t === "bank") recordBox("B:" + c.id, "bank", true, "ctx");
      else if (c.t === "sen") recordSen(c.id, true, 1);
      else if (c.t === "ctx") recordBox(c.id, "ctx", true, "ctx");
    };
    const isFresh = c => (c.t === "lad" || c.t === "ctx" || c.t === "bank") && !c.due && !c.rep && !S.items[c.t === "bank" ? "B:" + c.id : c.id];
    set("2026-11-13T10:00");
    // 1. light load: nothing to review → a good handful; more card time → more; reading time doesn't count
    fresh(); logDays(10); o.light10 = newAllowance();
    fresh(); logDays(25); o.light25 = newAllowance();
    fresh(); logDays(10, 30); o.light10read = newAllowance();
    o.cm = [(() => { logDays(10, 30); return cardMinsPerDay(); })()];
    // 2. heavy load: 40 drills + 30 words met over the past days → reviews fill much of the next 2 weeks
    fresh();
    const lad = [...LADDER.keys()].slice(0, 40), ctxw = [...CTX.keys()].slice(0, 30);
    lad.forEach((id, i) => { set(new Date(at("2026-11-13T10:00") - (2 + i % 5) * DAY).toISOString()); recordLadder(id, 5, 3, "x"); });
    ctxw.forEach((id, i) => { set(new Date(at("2026-11-13T10:00") - (1 + i % 4) * DAY).toISOString()); recordBox(id, "ctx", true, "ctx"); });
    set("2026-11-13T10:00"); S.nb = null;
    logDays(10); o.heavy10 = newAllowance(); o.load = loadSec(14); o.usual10 = cardMinsPerDay() * 60 * 14;
    S.nb = null; logDays(60); o.heavy60 = newAllowance(); o.usual60 = cardMinsPerDay() * 60 * 14;
    // fixed for the day: changing the log later today doesn't move it; tomorrow it's worked out again
    S.nb = null; logDays(10); const a1 = newAllowance(); logDays(60); o.fixed = newAllowance() === a1;
    set("2026-11-14T10:00"); o.nextDay = newAllowance(); o.nextKey = S.nb.d; set("2026-11-13T10:00");
    // 3. trip: the trip pace replaces the allowance
    fresh(); logDays(10);
    S.settings = setSettings({ stock: Object.assign({}, stockCfg(), { trip: true, from: dayKey(), to: dayKey(now() + 9 * DAY) }) });
    o.trip = [newAllowance(), tripNewCap()]; S.settings = setSettings({ stock: Object.assign({}, stockCfg(), { trip: false }) });
    // 4. placement: 20 reviews due, 3 new for today → new items in the first ~40%, then the note
    fresh(); logDays(10);
    const due = [...LADDER.keys()].slice(0, 12), dueW = [...CTX.keys()].slice(0, 8);
    set("2026-11-01T10:00"); due.forEach(id => recordLadder(id, 5, 3, "x")); dueW.forEach(id => recordBox(id, "ctx", true, "ctx"));
    set("2026-11-13T10:00");
    for (const id of [...due, ...dueW]) S.items[id].due = now() - 3600e3; // these 20 are due now
    S.nb = { d: dayKey(), allow: 3 };
    const rid = [...LADDER.keys()][30]; set("2026-11-05T10:00"); recordLadder(rid, 5, 3, "x"); set("2026-11-13T10:00"); S.items[rid].due = now() + 5 * DAY; // seen before, not due
    S.repeat = [{ t: "lad", id: rid, r: 6, at: now() - MIN, d: dayKey() }];
    const used = new Set(), seq = [];
    for (let k = 0; k < 8 && !seq.some(c => c.t === "div"); k++) { const blk = buildBlock(8, used); if (!blk.length) break; for (const c of blk) { seq.push(Object.assign({ fresh: isFresh(c) }, c)); if (c.t !== "div") answer(c); } }
    o.seq = seq.map(c => c.rep ? "R" : c.t === "div" ? "|" : c.fresh ? "N" : c.due ? "r" : c.t[0]).join("");
    o.newIdx = seq.map((c, i) => c.fresh ? i : -1).filter(i => i >= 0 && i < seq.findIndex(x => x.t === "div"));
    o.divIdx = seq.findIndex(c => c.t === "div"); o.dueBefore = seq.slice(0, o.divIdx).filter(c => c.due).length;
    o.gap = used.newGap;
    CLOCK_OFF = 0; return o;
  });
  console.log("   ", JSON.stringify(r));
  ok(r.light10 >= 3 && r.light10 <= 12, "light review load, ~10 card-minutes a day → a handful of new items: " + r.light10);
  ok(r.light25 >= r.light10, "more card time → at least as many: " + r.light25);
  ok(r.light10read === r.light10 && Math.round(r.cm[0]) === 10, "reading time doesn't count toward card time");
  ok(r.load > 0.5 * r.usual10 ? r.heavy10 <= 1 : true, `heavy load at 10 min/day → 1 (or 0): ${r.heavy10} (reviews ${Math.round(r.load / 60)} of ${Math.round(r.usual10 / 60)} min over 14 days)`);
  ok(r.load > r.usual10 ? r.heavy10 === 0 : r.heavy10 >= 1, "0 only when reviews alone would fill the whole usual time");
  ok(r.heavy60 > r.heavy10 && r.heavy60 <= 12, "the same load with 60 card-minutes a day leaves room for more (max 12): " + r.heavy60);
  ok(r.fixed && r.nextKey === "2026-11-14", "set once per app day; worked out again the next day");
  ok(r.trip[0] === r.trip[1] && r.trip[0] > 0, "during a trip the trip pace is the allowance: " + r.trip);
  ok(r.seq[0] === "R", "same-day retries still come first: " + r.seq);
  ok(r.newIdx.length === 3, "all 3 of today's new items come before the note: " + r.newIdx);
  ok(r.newIdx.every(i => i <= Math.ceil(0.5 * (r.dueBefore + 3)) + 1), `…in roughly the first 40% of the session (gap ${r.gap}): ${r.newIdx}`);
  ok(r.dueBefore === 20 && r.divIdx > Math.max(...r.newIdx), "the note comes once all 20 reviews and the 3 new items are done (at card " + r.divIdx + ")");
  await b.close();
  console.log(fails ? `FAILED (${fails})` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
