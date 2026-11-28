// Claude's pinyin check (2026-11-09): songs ask for it with the pinyin the app shows; answers are corrections only
// (position + 1–4 characters + reading / grouping / meaning); the app applies them; 一/不 tone changes on the device.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
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
  // (v117) a word an older check made with pinyin only (重归于好): the next run is asked for its meaning
  const g = await page.evaluate(() => { const it = { id: "Ag", title: "别", kind: "link", url: "x", t: 5, type: "song", cues: [[1, "就别重归于好"], [2, "美夢醒了"]] }; it.pyf = { h: lyrHash(it), fixes: [{ l: 0, at: 2, w: "重归于好", split: [4], py: "chóngguīyúhǎo" }, { l: 1, at: 0, w: "美夢", py: "měimèng" }, { l: 0, at: 1, w: "别", py: "bié" }] }; S.gen.listen.push(it);
    const rq = outboxRequests().filter(r => r.kind === "pygl"); return { rq, h: it.pyf.h }; });
  ok(g.rq.length === 1 && g.rq[0].rid === "g:Ag" && JSON.stringify(g.rq[0].words) === JSON.stringify([{ l: 0, at: 2, w: "重归于好" }, { l: 1, at: 0, w: "美夢" }]), "a word made by the check with no meaning, not in the dictionary, is asked about (one-character fixes aren't): " + JSON.stringify(g.rq));
  const ga = await page.evaluate(h => { const res = applyPack({ zwpack: 1, id: "t-pg", made: new Date().toISOString(), by: "t", pygl: [{ rid: "g:Ag", h, words: [{ l: 0, at: 2, w: "重归于好", gl: "to be reconciled" }, { l: 1, at: 0, w: "美夢", gl: "" }] }] }, "t");
    const it = S.gen.listen.find(x => x.id === "Ag"); return { pg: res.pg, f: it.pyf.fixes.map(f => [f.gl || "", f.glOk || 0]), left: outboxRequests().filter(r => r.kind === "pygl").length, sum: packSummary(res), lg: lyrGl(it)["重归于好"] }; }, g.h);
  ok(ga.pg === 1 && ga.f[0][0] === "to be reconciled" && ga.f[1][1] === 1 && ga.left === 0 && /补上了意思/.test(ga.sum) && ga.lg[1] === "to be reconciled", "the answer fills the meaning (\"\" = the dictionary has it), the request goes, the song's popup gets it: " + JSON.stringify(ga));
  // a new check's one-word fix with no meaning (only allowed for dictionary words) isn't asked about again
  const gn = await page.evaluate(() => { const it = { id: "Ah", title: "h", kind: "link", url: "x", t: 4, type: "song", cues: [[1, "我们不知道"]] }; S.gen.listen.push(it);
    applyPack({ zwpack: 1, id: "t-pf3", made: new Date().toISOString(), by: "t", pyfix: [{ rid: "f:Ah", h: lyrHash(it), fixes: [{ l: 0, at: 2, w: "不知道", py: "bù zhīdào" }] }] }, "t");
    const r = [it.pyf.fixes[0].glOk, outboxRequests().filter(r => r.rid === "g:Ah").length]; S.gen.listen = S.gen.listen.filter(x => x.id !== "Ah" && x.id !== "Ag"); return r; });
  ok(gn[0] === 1 && gn[1] === 0, "a new check's word without a meaning is taken as a dictionary word (the pack check enforces it): " + JSON.stringify(gn));
  // the pack check: a made word missing from data/cedict.txt needs "gl"; pygl answers must match their request
  {
    const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
    const dd = fs.mkdtempSync("/tmp/zwd-pg-"); fs.mkdirSync(path.join(dd, "progress")); fs.mkdirSync(path.join(dd, "packs"));
    const song = { id: "S1", type: "song", cues: [[1, "就别重归于好"], [2, "夢想醒了"]] };
    fs.writeFileSync(path.join(dd, "progress", "gen-listen-0.json"), JSON.stringify({ list: [song] }));
    fs.writeFileSync(path.join(dd, "outbox.json"), JSON.stringify({ v: 1, requests: [{ rid: "f:S1", kind: "pyfix", id: "S1", h: "abc" }, { rid: "g:S1", kind: "pygl", id: "S1", h: "abc", words: [{ l: 0, at: 2, w: "重归于好" }, { l: 1, at: 0, w: "夢想" }] }] }));
    const run = (name, pk) => { fs.writeFileSync(path.join(dd, "packs", name), JSON.stringify(Object.assign({ zwpack: 1, id: name, made: new Date().toISOString(), by: "t" }, pk))); try { return "OK " + execFileSync("node", [path.resolve(__dirname, "../daily-run/check-pack.js"), path.join(dd, "packs", name), "--data", dd, "--app", path.resolve(__dirname, "../..")], { stdio: "pipe" }).toString(); } catch (e) { return "BAD " + (e.stdout || "") + (e.stderr || ""); } };
    const a = run("a.json", { pyfix: [{ rid: "f:S1", h: "abc", fixes: [{ l: 0, at: 2, w: "重归于好", split: [4], py: "chóngguīyúhǎo" }] }] });
    const b2 = run("b.json", { pyfix: [{ rid: "f:S1", h: "abc", fixes: [{ l: 0, at: 2, w: "重归于好", split: [4], py: "chóngguīyúhǎo", gl: "to be reconciled" }, { l: 1, at: 0, w: "夢想", py: "měimèng" }] }] });
    const c = run("c.json", { pygl: [{ rid: "g:S1", h: "abc", words: [{ l: 0, at: 2, w: "重归于好", gl: "" }, { l: 1, at: 0, w: "夢想", gl: "" }] }] });
    const d = run("d.json", { pygl: [{ rid: "g:S1", h: "abc", words: [{ l: 0, at: 2, w: "重归于好", gl: "to be reconciled" }, { l: 1, at: 0, w: "夢想", gl: "" }] }] });
    ok(/^BAD/.test(a) && /isn't in the dictionary/.test(a), "check-pack refuses 重归于好 made into a word without a meaning");
    ok(/^OK/.test(b2), "…accepts it with one; 夢想 (traditional, in the dictionary as 梦想) needs none: " + b2.trim().split("\n").pop());
    ok(/^BAD/.test(c) && /can't be empty/.test(c) && !/夢想 isn't/.test(c), "pygl: an empty meaning only for a dictionary word");
    ok(/^OK/.test(d), "pygl: a proper answer passes: " + d.trim().split("\n").pop());
    fs.writeFileSync(path.join(dd, "outbox.json"), JSON.stringify({ v: 1, requests: [{ rid: "g:S1", kind: "pygl", id: "S1", h: "abc", words: [{ l: 0, at: 2, w: "重归于好" }, { l: 1, at: 9, w: "夢想" }] }] }));
    const out = path.join(dd, "in.json"); execFileSync("node", [path.resolve(__dirname, "../daily-run/inputs.js"), "--data", dd, "--out", out], { stdio: "pipe" });
    const inp = JSON.parse(fs.readFileSync(out, "utf8")), tx = (inp.texts || {})["g:S1"];
    ok(tx && tx.words.length === 1 && tx.words[0].w === "重归于好" && tx.words[0].line === "就别重归于好", "inputs.js passes the request with its line, dropping a word that isn't at its spot: " + JSON.stringify(tx));
  }
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
