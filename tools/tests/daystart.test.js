// The app day starts at 3:38 am local time, like Claude's nightly run (2026-11-10, learner): practice after midnight
// still counts as the day before; reviews come due at 3:38, not 12:00 am. Runs in America/New_York, DST included.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 }, timezoneId: "America/New_York" });
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(() => {
    const at = s => new Date(s).getTime(), set = s => { CLOCK_OFF = at(s) - Date.now(); };
    const hm = t => { const d = new Date(t); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
    const o = {};
    o.keys = ["2026-11-10T01:00", "2026-11-10T03:37", "2026-11-10T03:38", "2026-11-09T23:59"].map(s => dayKey(at(s)));
    o.mid = new Date(midnight(at("2026-11-10T01:00"))).toString().slice(4, 21);
    o.dst = [dayKey(at("2026-11-01T03:00")), hm(dayAt("2026-11-01")), dayKey(at("2027-03-14T03:30")), hm(dayAt("2027-03-14")), Math.round((dayAt("2027-03-15") - dayAt("2027-03-14")) / 36e5)];
    // a review late in the evening, then after midnight: same app day, so it isn't shown again; due at 3:38
    S.items = {}; S.log = {};
    set("2026-11-09T23:00"); recordLadder("L01", 5, 3, "a");
    const it = S.items.L01; o.due = [new Date(it.due).toString().slice(4, 21), hm(it.due)];
    set("2026-11-10T01:30"); o.doneAt0130 = doneToday()("L01"); logDay(120, true); o.logKey = Object.keys(S.log);
    o.home = (() => { renderHome(document.querySelector("#main")); return document.querySelector(".date").textContent; })();
    set("2026-11-10T03:40"); o.doneAt0340 = doneToday()("L01");
    // a review at 1:30 am counts on the previous app day; its next due is still 3:38 of a later morning
    S.items = {}; set("2026-11-10T01:30"); recordLadder("L02", 5, 3, "a"); o.due2 = hm(S.items.L02.due); o.lrDay = dayKey(S.items.L02.lr || now());
    // due times made by older code (12:00 am) move to 3:38 that morning; 3:38 ones and timed ones aren't touched
    S.items.L03 = Object.assign(JSON.parse(JSON.stringify(S.items.L02)), { due: at("2026-11-12T00:00") });
    S.items.B_x = { t: "sen", due: at("2026-11-12T00:00"), b: 1, n: 1, ok: 0 };
    S.items.L05 = Object.assign(JSON.parse(JSON.stringify(S.items.L02)), { due: at("2026-11-03T23:00") }); // old 12 am + N×24 h across the clock change
    S.items.L06 = Object.assign(JSON.parse(JSON.stringify(S.items.L02)), { due: at("2027-03-20T01:00") });
    const before2 = S.items.L02.due; migrateFsrs();
    o.mig = [new Date(S.items.L03.due).toString().slice(4, 21), S.items.L02.due === before2, S.items.B_x.due === at("2026-11-12T00:00"), new Date(S.items.L05.due).toString().slice(4, 21), new Date(S.items.L06.due).toString().slice(4, 21)];
    // across the clock change (Nov 1 2026, 2 am → 1 am): still 3:38, not 2:38 (which would count as the day before)
    S.items = {}; set("2026-10-30T20:00"); recordLadder("L04", 5, 3, "a"); recordLadder("L04", 5, 3, "a");
    o.dstDue = [new Date(S.items.L04.due).toString().slice(4, 21), hm(S.items.L04.due)];
    CLOCK_OFF = 0; return o;
  });
  console.log("   ", JSON.stringify(r));
  ok(r.keys.join() === "2026-11-09,2026-11-09,2026-11-10,2026-11-09", "1:00 and 3:37 am still count as the day before; 3:38 starts the new day");
  ok(r.mid === "Nov 09 2026 03:38", "the app day that 1:00 am belongs to began at 3:38 the day before");
  ok(r.dst[0] === "2026-10-31" && r.dst[1] === "3:38" && r.dst[2] === "2027-03-13" && r.dst[3] === "3:38" && r.dst[4] === 24, "daylight-saving changes: the day still starts at 3:38 (clock-change nights land in the day before): " + r.dst.join(" "));
  ok(r.due[1] === "3:38", "a review's next due time is 3:38 in the morning, not 12:00 am: " + r.due[0]);
  ok(r.doneAt0130 === true, "at 1:30 am a card done at 11 pm is still 'done today' (no repeat)");
  ok(r.logKey.join() === "2026-11-09", "practice at 1:30 am goes into the day before's time log");
  ok(/11月9日/.test(r.home), "home shows the app day's date at 1:30 am: " + r.home);
  ok(r.doneAt0340 === false, "after 3:38 it's a new day");
  ok(r.due2 === "3:38" && r.lrDay === "2026-11-09", "a review at 1:30 am belongs to the day before; next due 3:38");
  ok(r.mig[0] === "Nov 12 2026 03:38" && r.mig[1] && r.mig[2], "old 12:00 am due times move to 3:38; 3:38 ones and parsing sentences are left alone");
  ok(r.mig[3] === "Nov 04 2026 03:38" && r.mig[4] === "Mar 20 2027 03:38", "old due times shifted by a clock change (11 pm, 1 am) move to the 3:38 they meant: " + r.mig[3] + ", " + r.mig[4]);
  ok(r.dstDue[1] === "3:38" && new Date(r.dstDue[0]) > new Date("2026-11-01T12:00"), "a due date past a clock change is still 3:38: " + r.dstDue[0]);
  await b.close();
  console.log(fails ? `FAILED (${fails})` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
