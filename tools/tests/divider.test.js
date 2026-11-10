// The 复习完了 divider shows once per app day (2026-11-10, learner): a later session — on this device or another —
// skips it, starts with any same-day retries, and counts all its time as extra.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, timezoneId: "America/New_York" });
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(() => {
    const o = {}, kinds = q => q.map(c => c.t + (c.rep ? "*" : "")).join(" ");
    CLOCK_OFF = new Date("2026-11-10T16:00").getTime() - Date.now();
    const k = dayKey(); S.log = {}; S.repeat = [];
    // 1. first session today: reviews (if any), then the divider before new material
    startSession(0); o.first = kinds(SESSION.q); o.firstPast = !!SESSION.pastDiv;
    // reach the divider: it records "reviews done" for today
    SESSION.i = SESSION.q.findIndex(c => c.t === "div"); render(); o.done1 = daySplit(S.log[k]).done;
    SESSION.ended = true; SESSION = null;
    // 2. a missed drill's retry is ready; a new session today starts with it, with no second divider
    S.repeat = [{ t: "lad", id: "L29", r: 6, at: now() - MIN, d: k }];
    startSession(0); o.second = kinds(SESSION.q); o.secondPast = !!SESSION.pastDiv;
    // its answers count as extra time
    const before = JSON.parse(JSON.stringify(S.log[k].by[devId()]));
    logDay(30, true, SESSION.pastDiv ? "extra" : "due"); const after = S.log[k].by[devId()];
    o.extra = [after.extra - (before.extra || 0), (after.due || 0) - (before.due || 0)];
    SESSION = null;
    // 3. reviews finished on another device (synced log): this device skips the divider too
    S.log = { [k]: { n: 5, ok: 5, sec: 300, by: { otherDev: { n: 5, ok: 5, due: 300, extra: 0, rd: 0, done: 1 } } } }; S.repeat = [];
    startSession(0); o.other = kinds(SESSION.q); o.otherPast = !!SESSION.pastDiv; SESSION = null;
    // 4. the next app day (after 3:38) the divider is back
    CLOCK_OFF = new Date("2026-11-11T09:00").getTime() - Date.now();
    o.nextDone = daySplit(S.log[dayKey()]).done; startSession(0); o.next = kinds(SESSION.q); o.nextPast = !!SESSION.pastDiv; SESSION = null;
    CLOCK_OFF = 0; return o;
  });
  console.log("   ", JSON.stringify(r));
  ok(r.first.includes("div"), "first session today has the divider: " + r.first);
  ok(r.done1 === true, "reaching it records reviews done for today");
  ok(r.second.startsWith("lad*") && !r.second.includes("div"), "a later session starts with the same-day retry and has no second divider: " + r.second);
  ok(r.secondPast && r.extra[0] === 30 && r.extra[1] === 0, "everything in that later session counts as extra time: " + r.extra);
  ok(!r.other.includes("div") && r.otherPast, "reviews finished on the other device → no divider here either, time counts as extra");
  ok(r.next.includes("div"), "the next app day the divider is back: " + r.next);
  ok(r.nextDone === false, "a new app day starts with reviews not done");
  await b.close();
  console.log(fails ? `FAILED (${fails})` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
