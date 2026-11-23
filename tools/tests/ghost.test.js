// Re-reading with a ghost (v93): picked each time on the practice re-read card and in 阅读; the highlight moves phrase
// by phrase at the best counted re-read (or first read) + 5 %, capped at 250; it pauses while the app is hidden;
// 跟上意思了吗？ after 读完了 — only a followed run counts as a best or retires the passage at native speed (plain
// re-reads too); history entries carry ok / ghost and survive a merge.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STATE = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(st => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); } }, STATE);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const pid = await page.evaluate(() => { const p = [...PSG.values()].find(p => !p.mine && !p.gen); S.reads[p.id] = { cpm: 100, score: 3, t: now() - 5 * DAY, looked: 0, rr: [[now() - 3 * DAY, 120]] }; save(); return p.id; });
  // phrases
  const ph = await page.evaluate(id => { const ps = ghostPhrases(passageTokens(PSG.get(id))[0].map(t => t.replace(/\//g, ""))); return { n: ps.length, max: Math.max(...ps.map(x => x.n)), all: ps.map(x => x.toks.join("")).join("") === passageTokens(PSG.get(id))[0].join("").replace(/\//g, "") }; }, pid);
  ok(ph.n > 3 && ph.max <= 12 && ph.all, "a paragraph is cut into short phrases that keep all its text: " + JSON.stringify(ph));
  ok(await page.evaluate(id => ghostCpm(S.reads[id]) === 126, pid), "the ghost's pace = best so far (an old re-read of 120) + 5% = 126");

  // ---- the practice card ----
  const card = async () => page.evaluate(id => { window.__res = null; window.__next = false; renderReread(id, $("#main"), r => { window.__res = r; }, () => { window.__next = true; }); }, pid);
  await card();
  ok(/读 Read/.test(await page.textContent("#rr-plain")) && /带鬼影读/.test(await page.textContent("#rr-ghost")) && /126 字\/分/.test(await page.textContent("#rr-ghost")) && !(await page.$(".ghp")), "the re-read card asks first: 读 Read, or 👻 with the ghost at 126 字/分 (text hidden until picked)");
  // fast ghost for timing: best 600 → capped at 250 (≈ 1.7 s for a 7-character phrase)
  await page.evaluate(id => { S.reads[id].rr = [[now() - 3 * DAY, 600]]; }, pid);
  await card();
  ok(await page.evaluate(() => /250 字\/分/.test($("#rr-ghost").textContent)), "the ghost never goes above native speed (250)");
  await page.click("#rr-ghost"); await page.waitForSelector(".ghp.gh");
  const g0 = await page.evaluate(() => +$(".ghp.gh").dataset.g);
  await page.waitForFunction(g => { const h = $(".ghp.gh"); return h && +h.dataset.g > g; }, g0, { timeout: 6000 });
  ok(true, "the highlight moves on phrase by phrase");
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => true }));
  const h1 = await page.evaluate(() => +$(".ghp.gh").dataset.g); await sleep(2500);
  const h2 = await page.evaluate(() => +$(".ghp.gh").dataset.g);
  await page.evaluate(() => Object.defineProperty(document, "hidden", { configurable: true, get: () => false }));
  ok(h2 === h1, "it waits while the app is hidden (" + h1 + " → " + h2 + ")");
  await page.screenshot({ path: (process.env.TEST_OUT || "/tmp") + "/ghost-card.png" });
  await page.click("#done"); await page.waitForSelector("#rr-ok");
  ok(!(await page.$(".ghp.gh")) && /跟上意思了吗/.test(await page.textContent("#fb")), "读完了 stops the ghost and asks 跟上意思了吗？");
  await page.click("#rr-no");
  let r = await page.evaluate(id => S.reads[id], pid), last = r.rr[r.rr.length - 1];
  ok(last[2] === 0 && last[3] === 1 && last[1] > 250 && !r.fluent, "not quite followed: kept with ok 0 + ghost 1, and doesn't retire the passage even above 250 (" + last[1] + ")");
  ok(/不算最好成绩/.test(await page.textContent("#fb")) && /比鬼影快/.test(await page.textContent("#fb")) && await page.evaluate(() => !!window.__res && window.__res.rr), "the result: beat the ghost, but not counted as a best");
  ok(await page.evaluate(id => rrBest(S.reads[id]) === 600, pid), "the best ignores runs you didn't follow (still 600)");
  // plain re-read, followed, fast → retires it (the same rule as before, now with the check)
  await card(); await page.click("#rr-plain");
  ok(!(await page.$(".ghp.gh")), "读 Read: no ghost");
  await page.click("#done"); await page.click("#rr-ok");
  r = await page.evaluate(id => S.reads[id], pid); last = r.rr[r.rr.length - 1];
  ok(last[2] === 1 && last[3] === 0 && r.fluent && /新纪录|最好/.test(await page.textContent("#fb")) && /母语者的速度/.test(await page.textContent("#fb")), "a followed plain re-read above 250 is a best and retires the passage");

  // ---- 阅读 ----
  await page.evaluate(id => { const r = S.reads[id]; delete r.fluent; r.rr = [[now() - 3 * DAY, 120]]; r.lastT = now() - 3 * DAY; save(); setView("read"); }, pid);
  await page.waitForSelector(`[data-p="${pid}"][data-re]`); await page.click(`[data-p="${pid}"][data-re]`);
  await page.waitForSelector("#rr-ghost");
  ok(/126 字\/分/.test(await page.textContent("#rr-ghost")), "in 阅读 a re-read asks first too");
  await page.click("#rr-ghost"); await page.waitForSelector("#rd .ghp .tk");
  await page.waitForSelector("#rd .ghp.gh");
  const tk = page.locator("#rd .ghp .tk").nth(3); await tk.click(); await page.waitForSelector("#sheet");
  ok(true, "with the ghost, words are still tappable for the popup");
  await page.keyboard.press("Escape");
  await page.click("#done"); await page.waitForSelector("#rr-ok"); await page.click("#rr-ok");
  await page.waitForSelector("#list");
  r = await page.evaluate(id => S.reads[id], pid); last = r.rr[r.rr.length - 1];
  ok(last[2] === 1 && last[3] === 1 && /重读 · Re-read 👻/.test(await page.textContent("#main")) && /母语速度 Native 250/.test(await page.textContent("#main")), "the 阅读 re-read records ok + ghost and shows the result against the 250 line");
  ok(await page.evaluate(id => S.reads[id].fluent === true, pid), "a followed 阅读 re-read above 250 retires the passage too (it didn't before)");
  await page.click("#list");
  // plain in 阅读: no phrases
  await page.evaluate(id => { delete S.reads[id].fluent; S.reads[id].lastT = now() - 3 * DAY; render(); }, pid);
  await page.click(`[data-p="${pid}"][data-re]`); await page.click("#rr-plain"); await page.waitForSelector("#rd .tk");
  ok(!(await page.$("#rd .ghp")), "读 Read in 阅读: the passage as usual, no ghost");
  await page.click("#back");
  // merge keeps the new fields; old two-field entries count
  const mg = await page.evaluate(id => { const a = JSON.parse(JSON.stringify(S)), b = JSON.parse(JSON.stringify(S)); b.reads[id].rr = b.reads[id].rr.concat([[now() + 1, 99, 0, 1]]); const m = mergeStates(a, b).reads[id].rr; return { last: m[m.length - 1], old: rrOk([1, 2]) }; }, pid);
  ok(JSON.stringify(mg.last.slice(1)) === "[99,0,1]" && mg.old, "a merge keeps ok / ghost on each re-read; old entries (time, speed) still count");
  const err = await page.evaluate(() => localStorage.getItem("zwlgf:errlog"));
  ok(!err || err === "[]", "nothing in the error log: " + err);
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
