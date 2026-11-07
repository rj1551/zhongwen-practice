const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch(); let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
  const store = {}; // shared fake Claude db
  async function dev(items) {
    const ctx = await browser.newContext();
    await ctx.exposeFunction("dbGet", () => JSON.stringify(store));
    await ctx.exposeFunction("dbSet", (id, d) => { store[id] = JSON.parse(d); });
    await ctx.addInitScript(st => {
      if (st && !sessionStorage.s) { sessionStorage.s = 1; localStorage.setItem("zwlgf:state:v1", st); }
      window.claude = { use: async k => k === "db" ? { collection: () => ({ get: async () => ({ docs: Object.entries(JSON.parse(await dbGet())).map(([id, d]) => ({ id, exists: true, data: () => d })) }), doc: id => ({ set: async d => dbSet(id, JSON.stringify(d)) }) }) } : k === "user" ? { id: async () => "me" } : k === "sample" ? { json: async () => ({ score: 3 }) } : null };
    }, items ? JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, items, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } }) : null);
    const page = await ctx.newPage(); page.on("pageerror", e => { console.log("ERR", e.message); fails++; });
    await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden); await sleep(1500); await page.evaluate(() => SYNCQ);
    return page;
  }
  const T = Math.floor(Date.now() / 1000);
  const A = await dev({ L01: { t: "lad", n: 1, h: [[T, 5, 3]] } });
  ok(store["items-" + 0] !== undefined || Object.keys(store).some(k => k.startsWith("items-")), "hosted: A wrote item parts: " + Object.keys(store).join(","));
  const B = await dev({ L02: { t: "lad", n: 1, h: [[T, 5, 2]] } });
  ok(await B.evaluate(() => Object.keys(S.items).sort().join()) === "L01,L02", "hosted: B merged A's");
  await A.evaluate(() => { S.items.L03 = { t: "lad", n: 1, h: [[Math.floor(Date.now()/1000), 5, 3]] }; save(); }); await sleep(4000); await A.evaluate(() => SYNCQ);
  ok(Object.values(store).some(d => d.items && d.items.L03), "hosted: 2.5 s write still works");
  ok(await A.evaluate(() => !document.querySelector("#ghcard")), "hosted: no GitHub card");
  console.log(fails ? "FAILED" : "ALL PASSED"); await browser.close();
})();
