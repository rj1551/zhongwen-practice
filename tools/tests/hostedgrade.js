const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext();
  await ctx.addInitScript(() => { window.claude = { use: async k => k === "sample" ? { json: async () => ({ score: 3, chunk: "ok", notes: [] }) } : null }; });
  const p = await ctx.newPage(); p.on("pageerror", e => console.log("ERR", e.message));
  await p.goto("http://localhost:8765/"); await p.waitForFunction(() => !document.querySelector("#tabs").hidden && AI);
  await p.evaluate(() => { const el = document.createElement("div"); el.id = "t"; document.body.prepend(el); renderLadder(LADDER.get("L01"), 5, el, r => window.__r = r, () => {}); });
  await p.fill("#t #ans", "测试一下"); await p.click("#t #check"); await p.waitForFunction(() => window.__r);
  const t = await p.$eval("#t", e => e.innerText);
  console.log(/Disagree with Claude/.test(t) ? "PASS hosted: Claude grades, override names Claude" : "FAIL " + t.slice(0, 200));
  console.log(await p.evaluate(() => typeof autoCard === "function" && offwCard() === "") ? "PASS hosted: no auto-grading card" : "FAIL hosted card");
  await b.close();
})();
