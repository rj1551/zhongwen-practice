// Today's set done (2026-11-10, reworked 2026-11-13): no full-screen divider; when today's due reviews and today's
// new items are done, a slim note sits above the next card for a few seconds, once per app day on any device. Later
// sessions that day skip it, start with any same-day retries, and count all their time as extra.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, timezoneId: "America/New_York" });
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r1 = await page.evaluate(() => {
    const o = {}, kinds = q => q.map(c => c.t + (c.rep ? "*" : "")).join(" ");
    CLOCK_OFF = new Date("2026-11-10T16:00").getTime() - Date.now();
    const k = dayKey(); S.log = {}; S.repeat = []; S.items = {};
    S.nb = { d: k, allow: 0 }; // no new items for today and nothing due: the note comes first
    startSession(0); o.first = kinds(SESSION.q); o.firstIsNote = SESSION.q[0].t === "div";
    o.i = SESSION.i; o.past = !!SESSION.pastDiv; o.done = daySplit(S.log[k]).done;
    o.note = (document.querySelector("#dnote") || {}).textContent || ""; o.card = !!document.querySelector("#slot .card");
    return o;
  });
  console.log("   ", JSON.stringify(r1));
  ok(r1.firstIsNote && r1.i === 1, "with today's set done the queue starts with the note, and the app moves straight on: " + r1.first);
  ok(/今天该做的都做完了/.test(r1.note) && /Everything for today is done/.test(r1.note) && r1.card, "a slim line sits above the next card (no card of its own): " + r1.note);
  ok(r1.past && r1.done === true, "from there time counts as extra, and today is marked done");
  await sleep(6800);
  ok(await page.evaluate(() => !document.querySelector("#dnote")), "the line goes away after a few seconds");
  const home = await page.evaluate(() => { SESSION.ended = true; SESSION = null; setView("home"); return document.querySelector(".date").innerHTML; });
  ok(/setdone/.test(home) && /✓/.test(home), "home shows a ✓ next to the date");
  const r = await page.evaluate(() => {
    const o = {}, kinds = q => q.map(c => c.t + (c.rep ? "*" : "")).join(" "), k = dayKey();
    // a missed drill's retry is ready; a new session today starts with it, with no second note
    S.repeat = [{ t: "lad", id: "L29", r: 6, at: now() - MIN, d: k }];
    startSession(0); o.second = kinds(SESSION.q); o.secondPast = !!SESSION.pastDiv; o.note2 = !!document.querySelector("#dnote");
    const before = JSON.parse(JSON.stringify(S.log[k].by[devId()]));
    logDay(30, true, SESSION.pastDiv ? "extra" : "due"); const after = S.log[k].by[devId()];
    o.extra = [after.extra - (before.extra || 0), (after.due || 0) - (before.due || 0)];
    SESSION = null;
    // done on another device (synced log): this device skips the note too
    S.log = { [k]: { n: 5, ok: 5, sec: 300, by: { otherDev: { n: 5, ok: 5, due: 300, extra: 0, rd: 0, done: 1 } } } }; S.repeat = [];
    startSession(0); o.other = kinds(SESSION.q); o.otherPast = !!SESSION.pastDiv; SESSION = null;
    // the next app day (after 3:38): not done, the note can come again
    CLOCK_OFF = new Date("2026-11-11T09:00").getTime() - Date.now();
    o.nextDone = daySplit(S.log[dayKey()]).done; S.nb = { d: dayKey(), allow: 0 };
    startSession(0); o.next = kinds(SESSION.q); o.nextNote = SESSION.q[0].t === "div"; SESSION = null;
    CLOCK_OFF = 0; return o;
  });
  console.log("   ", JSON.stringify(r));
  ok(r.second.startsWith("lad*") && !r.second.includes("div") && !r.note2, "a later session starts with the same-day retry and has no second note: " + r.second);
  ok(r.secondPast && r.extra[0] === 30 && r.extra[1] === 0, "everything in that later session counts as extra time: " + r.extra);
  ok(!r.other.includes("div") && r.otherPast, "done on the other device → no note here either, time counts as extra");
  ok(r.nextDone === false && r.nextNote, "the next app day starts not done, and the note can come again");
  await b.close();
  console.log(fails ? `FAILED (${fails})` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
