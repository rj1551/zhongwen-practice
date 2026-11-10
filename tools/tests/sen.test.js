// Sentence parsing (短句精读): after answering, the words in the "how it parses" breakdown open the dictionary popup
// (2026-11-09, learner), like in reading; the chunk layout stays.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const info = await page.evaluate(() => {
    const item = [...SEN.values()].find(x => x.s.includes("|") && /[，。]/.test(x.s));
    const el = document.createElement("div"); el.id = "tsen"; document.querySelector("#main").replaceChildren(el);
    window.__next = 0; renderSen(item, el, () => {}, () => { window.__next++; });
    return { id: item.id, s: item.s, right: item.opts[0] };
  });
  console.log("   sentence:", info.id, info.s);
  await page.waitForFunction(() => CED, null, { timeout: 20000 });
  ok(true, "showing a parsing card loads the full dictionary");
  await page.click("#tsen #gotit"); await sleep(100);
  await page.locator("#tsen .opt").filter({ hasText: info.right }).click(); await sleep(50);
  if (!(await page.locator("#tsen #senchunks").count())) { await page.locator("#tsen .opt").filter({ hasText: info.right }).click(); await sleep(100); } // tap-to-confirm
  const tks = await page.locator("#tsen #senchunks .tk").allTextContents();
  const plain = info.s.replace(/[|\/]/g, ""), shown = await page.locator("#tsen #senchunks").textContent();
  console.log("   words:", tks.join(" · "));
  ok(tks.length >= 3, "the breakdown's words are tappable (" + tks.length + ")");
  ok(shown === info.s.split("|").map(c => c.replace(/\//g, "")).filter(c => !/^[\p{P}\s]+$/u.test(c)).join(""), "the chunks still show the whole sentence minus punctuation");
  ok(await page.locator("#tsen #senchunks > span").count() === info.s.split("|").filter(c => !/^[\p{P}\s]+$/u.test(c.replace(/\//g, ""))).length, "one underlined span per chunk, as before");
  const w = tks.find(t => t.length >= 2) || tks[0];
  await page.locator("#tsen #senchunks .tk").filter({ hasText: w }).first().click(); await sleep(250);
  const sh = await page.evaluate(() => { const s = document.querySelector("#sheet"); return s ? { w: s.querySelector(".w").textContent, rd: s.querySelectorAll(".rd").length, txt: s.innerText } : null; });
  ok(sh && sh.w === w && sh.rd >= 1, "tapping " + w + " opens the dictionary popup with its readings: " + (sh ? sh.txt.split("\n").slice(0, 3).join(" / ") : "none"));
  ok(await page.locator("#tsen #senchunks .tk.looked").count() === 1, "the tapped word is marked as looked up");
  const save = page.locator("#sheet button").filter({ hasText: /加入|Save/ }).first();
  if (await save.count()) {
    await save.click(); await sleep(150);
    const bk = await page.evaluate(w => S.bank[w], w);
    ok(bk && bk.src === "S:" + info.id && bk.s === plain, "saving keeps the whole sentence (with punctuation) and where it came from: " + JSON.stringify(bk && { s: bk.s, src: bk.src }));
  } else ok(false, "the popup has a save button");
  await page.locator("#tsen button.btn.wide").last().click(); await sleep(100);
  ok(await page.evaluate(() => !document.querySelector("#sheet") && window.__next === 1), "继续 closes the popup and moves on");
  await b.close();
  console.log(fails ? `FAILED (${fails})` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
