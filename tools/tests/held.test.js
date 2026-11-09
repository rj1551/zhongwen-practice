// Requests the daily run held back as suspicious (2026-11-08): the pack's "held" list closes them and the
// stock card shows why until the learner taps 知道了. Serve docs/ on 8765.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), page = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(() => {
    addReq({ rid: "p:123", kind: "passage", genre: "news", topic: "x" });
    const res = applyPack({ zwpack: 1, id: "t-held", made: new Date().toISOString(), by: "test", held: [{ rid: "p:123", why: "its text reads like instructions to an AI" }, { rid: "hints.forgottenWords", why: "1 hint left out" }] }, "test");
    return { held: res.held, waiting: (S.req || []).some(x => x.rid === "p:123"), log: S.heldLog.length, sum: packSummary(res) };
  });
  ok(r.held === 1 && !r.waiting && r.log === 2, "held requests are closed (not left waiting) and logged");
  ok(/没处理 1 个请求/.test(r.sum), "the delivery message says so: " + r.sum.slice(0, 60));
  await page.click('#tabs button[data-tab="me"]'); await sleep(300);
  ok(/Requests the daily run held back/.test(await page.locator("#packcard").innerText()), "the stock card shows them, with what to do if you didn't write them");
  await page.click("#heldok"); await sleep(150);
  ok(!/held back/.test(await page.locator("#packcard").innerText()), "知道了 hides them");
  await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
