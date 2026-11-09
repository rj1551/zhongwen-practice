// Claude's pinyin check (2026-11-09): songs ask for it with the pinyin the app shows; answers are corrections only
// (position + 1–4 characters + reading / grouping / meaning); the app applies them; 一/不 tone changes on the device.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [
    { id: "Ap", title: "像风一样", kind: "link", url: "https://example.com", t: Date.now(), type: "song", cues: [[1, "我等的模样好不具象"], [3, "了却心愿不是一样的"], [5, "一个人一起走"]] },
    { id: "Aq", title: "第二首", kind: "link", url: "https://example.com", t: Date.now() - 9000, type: "song", cues: [[1, "雨落下"]] },
  ] }, best: { combo: 0 } });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); localStorage.setItem("zwlgf:cuepref", JSON.stringify({ py: true })); } }, st);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(() => { loadCedict(); loadZhc(); }); await page.waitForFunction(() => CED && ZHC, null, { timeout: 20000 });
  const req = await page.evaluate(() => outboxRequests().filter(r => r.kind === "pyfix"));
  ok(req.length === 2 && req[0].rid === "f:Ap" && req[0].auto.length === 3, "songs ask for a pinyin check, with the app's pinyin per line: " + req.map(r => r.rid).join(" "));
  console.log("   auto:", req[0].auto.join("  /  "));
  ok(/不是\[búshì\]/.test(req[0].auto[1]) && /一样\[yíyàng\]/.test(req[0].auto[1]), "不 / 一 tone changes applied on the device (不是 búshì, 一样 yíyàng)");
  ok(/一个人\[yígèrén\]/.test(req[0].auto[2]) && /一起\[yìqǐ\]/.test(req[0].auto[2]), "一个人 yígèrén, 一起 yìqǐ (line start too)");
  const sd = await page.evaluate(() => { const t = s => s.split("|").map(x => ({ s: x })); return [sandhi(t("第|一|天"), ["dì", "yī", "tiān"]), sandhi(t("看|一|看"), ["kàn", "yī", "kàn"]), sandhi(t("十一|月"), ["shíyī", "yuè"]), sandhi(t("统一"), ["tǒngyī"]), sandhi(t("不|好"), ["bù", "hǎo"])]; });
  ok(JSON.stringify(sd) === JSON.stringify([["dì", "yī", "tiān"], ["kàn", "yi", "kàn"], ["shíyī", "yuè"], ["tǒngyī"], ["bù", "hǎo"]]), "exceptions: 第一 / 看一看 / 十一月 / 统一 / 不好 stay right: " + JSON.stringify(sd));
  const pk = { zwpack: 1, id: "t-pf", made: new Date().toISOString(), by: "test", pyfix: [{ rid: "f:Ap", h: req[0].h, fixes: [
    { l: 0, at: 0, w: "我等", split: [1, 1], py: "wǒ děng" },
    { l: 0, at: 5, w: "好不", py: "hǎobù", gl: "so very (here)" },
    { l: 1, at: 0, w: "了", py: "liǎo" },
    { l: 1, at: 2, w: "错的", py: "x" } ] }] };
  const r = await page.evaluate(p => { const res = applyPack(p, "test"); const it = S.gen.listen.find(x => x.id === "Ap"); return { pf: res.pf, n: it.pyf.fixes.length, left: outboxRequests().filter(r => r.kind === "pyfix").map(r => r.rid), sum: packSummary(res) }; }, pk);
  ok(r.pf === 1 && r.n === 3, "corrections stored; one that doesn't match its spot is dropped");
  ok(r.left.join() === "f:Aq", "the checked song drops out of the requests");
  ok(/拼音检查好了/.test(r.sum), "the delivery message says so");
  await page.click('#tabs button[data-tab="listen"]'); await sleep(300); await page.click('[data-l="Ap"]'); await sleep(500);
  if (await page.locator("#lcues").isHidden()) { await page.click('[data-mode="all"]'); await sleep(200); }
  const l0 = await page.locator('.cue[data-ci="0"] .tk').allTextContents(), l1 = await page.locator('.cue[data-ci="1"] .tk').allTextContents();
  console.log("   line 1:", l0.join("|"), " line 2:", l1.join("|"));
  ok(l0[0] === "我wǒ" && l0[1] === "等děng", "grouping fixed: 我 + 等 (not 我等 'we')");
  ok(l1[0] === "了liǎo", "reading fixed: 了 liǎo");
  ok(await page.locator('.cue[data-ci="0"] .tk.tricky').count() === 3, "corrected words get a dotted underline");
  await page.locator('.cue[data-ci="0"] .tk').filter({ hasText: "好不" }).click(); await sleep(200);
  ok(/so very/.test(await page.locator("#sheet").innerText()), "the meaning in this song shows first in the popup");
  await page.mouse.click(380, 100); await sleep(100);
  ok(/检查过拼音和分词 ✓ · 改了 3 处/.test(await page.locator("#main").innerText()), "the song says it was checked, with how many fixes");
  await page.click("#lback"); await sleep(200);
  ok(/下次运行检查 1 首歌的拼音/.test(await page.locator("#main").innerText()) && !(await page.$("#lyrall")), "the list says how many songs the next run checks (no Do-all button)");
  // an answer with no fixes still marks the song checked
  await page.evaluate(h => applyPack({ zwpack: 1, id: "t-pf2", made: new Date().toISOString(), by: "t", pyfix: [{ rid: "f:Aq", h, fixes: [] }] }, "t"), req[1].h);
  ok(await page.evaluate(() => pyfBacklog().length) === 0, "no fixes needed → marked checked too");
  const more = await page.evaluate(() => { for (let i = 0; i < 35; i++) S.gen.listen.push({ id: "Z" + i, title: "z", kind: "link", url: "x", t: now() + i, type: "song", cues: [[1, "雨"]] }); const n = outboxRequests().filter(r => r.kind === "pyfix").length; S.gen.listen = S.gen.listen.filter(x => !/^Z/.test(x.id)); return n; });
  ok(more === 30, "at most 30 songs a run go to Claude: " + more);
  const ch = await page.evaluate(() => { const it = { id: "Ac", t: 1, type: "song", kind: "link", cues: [[1, "我等你"], [2, "别的"], [3, "我等你"]] }; it.pyf = { h: lyrHash(it), fixes: [{ l: 0, at: 0, w: "我等", split: [1, 1], py: "wǒ děng" }] }; return [lineToks(it, 0).map(t => t.s).join("|"), lineToks(it, 2).map(t => t.s).join("|")]; });
  ok(ch[0] === ch[1] && ch[1].startsWith("我|等"), "a fix carries over to the same line repeated (choruses fixed once): " + ch.join(" / "));
  const yg = await page.evaluate(() => sandhi([{ s: "一个" }, { s: "人" }], ["yīge", "rén"])[0]);
  ok(yg === "yíge", "一个 (dictionary yīge) → yíge: " + yg);
  // changing the lyrics asks again
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Aq"); it.cues[0][1] = "雨落下来"; it.u = now(); });
  ok(await page.evaluate(() => pyfBacklog().map(x => x.id).join()) === "Aq", "new lyrics → checked again");
  await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
