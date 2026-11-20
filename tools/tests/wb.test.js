// Social-media reading (微博·抖音, kind wb, v77): makePassage keeps style + slang; a pack's wb post lands as a
// passage with the genre chip and the thread styling; slang in the word popup from the passage's glossary; the genre
// setting and scheduled reading know wb; slangTargets retires a term after 3 posts unsaved; the nightly run's
// inputs.js passes the genre and the slang hints, check-pack.js checks wb posts. Serve docs/ on 8765 first.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const fs = require("fs"), os = require("os"), path = require("path"), { execFileSync } = require("child_process");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const Q = (q, a) => ({ q, opts: [a, "wrong one", "wrong two", "wrong three"], why: ["right: 夯爆了", "no", "no", "no"] });
const post = (extra) => Object.assign({ kind: "wb", style: "weibo", title: "加班到十点",
  paras: ["今天|加班|到|十点|，|老板|还|说|明天|早|点|来|，|我|真|没招|了|😭|谁|懂|啊|！|下班|路上|饿|得|不行|，|只|想|吃|一碗|热|面|。",
    "芒果不加冰|：|这|种|老板|夯爆了|的|反面|，|建议|直接|跑路|，|别|犹豫|了|。",
    "回复|@|芒果不加冰|：|笑死|，|你|这|条|评论|活人感|拉满|，|我|已经|截图|发|给|同事|了|。",
    "小鹿今天不加班|：|楼上|说|得|对|，|我|上个月|刚|跑路|，|现在|每天|六点|下班|，|夯爆了|！"],
  gl: { "没招": ["méi zhāo", "out of ideas, helpless (我真没招了 = I give up)"], "夯爆了": ["hāng bào le", "awesome, top tier (夯 = top rank in a tier list)"], "活人感": ["huó rén gǎn", "feels like a real, unpolished person"], "跑路": ["pǎo lù", "quit and get out"] },
  en: "Worked overtime till ten…", slang: ["没招", "夯爆了", "活人感"],
  qs: [Q("What does the first commenter suggest?", "Quit the job"), Q("What does 活人感拉满 say about the comment?", "It sounds very real and human"), Q("How does the last commenter feel now?", "Very happy with the new job")] }, extra || {});

(async () => {
  // ---- 1. the nightly run's side: inputs.js and check-pack.js on a temp data folder ----
  const DR = path.resolve(__dirname, "../daily-run"), dir = fs.mkdtempSync(path.join(os.tmpdir(), "zw-wb-"));
  fs.mkdirSync(path.join(dir, "packs")); fs.mkdirSync(path.join(dir, "progress"));
  fs.writeFileSync(path.join(dir, "outbox.json"), JSON.stringify({ day: "2026-11-20", target: { mode: "ahead", days: 14, mins: 10 }, short: { passages: 2 }, room: { passages: 40 },
    reading: { perDay: 1, genres: ["wb", "news"] }, hints: { slangActive: ["活人感"], slangRetired: ["绝绝子"], slangSaved: ["夯爆了"] }, requests: [{ rid: "p:1", kind: "passage", genre: "wb", topic: "加班" }] }));
  execFileSync("node", [path.join(DR, "inputs.js"), "--data", dir, "--out", path.join(dir, "in.json")]);
  const inp = JSON.parse(fs.readFileSync(path.join(dir, "in.json"), "utf8"));
  ok(inp.outbox.reading.genres.join() === "wb,news" && inp.outbox.requests[0].genre === "wb", "inputs.js: wb passes as a genre (setting and passage request)");
  ok(inp.outbox.hints.slangActive.join() === "活人感" && inp.outbox.hints.slangRetired.join() === "绝绝子" && inp.outbox.hints.slangSaved.join() === "夯爆了", "inputs.js: the three slang hints pass through");
  const pack = (extra) => { const f = path.join(dir, "pk.json"); fs.writeFileSync(f, JSON.stringify(Object.assign({ zwpack: 1, id: "2026-11-20", made: "2026-11-20T08:40:00Z" }, extra))); let out = ""; try { out = execFileSync("node", [path.join(DR, "check-pack.js"), f, "--data", dir], { encoding: "utf8" }); } catch (e) { out = String(e.stdout); } return out; };
  const good = pack({ passages: [post({ rid: "p:1" })] });
  ok(/^OK:/m.test(good), "check-pack: a good wb post passes (" + good.trim().split("\n").pop() + ")");
  const bad = pack({ passages: [
    post({ title: "a", style: undefined }),
    post({ title: "b", style: "douyin" }),
    post({ title: "c", slang: ["没招", "不存在"] }),
    post({ title: "d", slang: ["跑路", "笑死"] }),
    post({ title: "e", paras: ["绝绝子|，|今天|加班|到|十点|。", "芒果|：|没招|了|。"], slang: ["绝绝子"], gl: { "绝绝子": ["jué jué zǐ", "amazing"] } })] });
  ok(/style": "weibo" or "douyin"/.test(bad), "check-pack: wb without a style is refused");
  ok(/douyin: the first paragraph must be the video line/.test(bad), "check-pack: a Douyin post must start with the 【视频：…】 line");
  ok(/slang "不存在" isn't in the text/.test(bad), "check-pack: a slang term that isn't in the text is refused");
  ok(/slang "笑死" has no gl entry/.test(bad), "check-pack: a slang term without a gloss is refused");
  ok(/slang "绝绝子" is retired/.test(bad) && /at least 2 replies/.test(bad), "check-pack: a retired term (hints.slangRetired) and a post without a thread are refused");
  ok(/at most 2 wb/.test(bad), "check-pack: at most 2 wb posts a pack");
  const rb = fs.readFileSync(path.join(DR, "RUNBOOK.md"), "utf8");
  ok(/Only with the web search/.test(rb) && /never copy real\s+posts/.test(rb) && /at most 3/.test(rb), "RUNBOOK: wb only with the slang search (≤ 3 searches), everything invented");

  // ---- 2. the app ----
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => typeof applyPack === "function" && !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(pk => { const r = applyPack(pk, "test"); const p = S.gen.passages.find(x => x.reg === "wb"); return { r, p: p && { sty: p.sty, slang: p.slang, reg: p.reg } }; }, { zwpack: 1, id: "2026-11-20", made: "x", passages: [post({ style: "weibo" }), post({ title: "抖音那条", style: "douyin", slang: ["夯爆了", "假词"], paras: ["【视频|：|小猫|第一次|看到|雪|】", "芒果|：|夯爆了|！", "鹿|：|活人感|。"] })] });
  ok(r.r.psg === 2 && r.p.reg === "wb" && r.p.sty === "weibo" && r.p.slang.join() === "没招,夯爆了,活人感", "a pack's wb post becomes a passage with its style and slang: " + JSON.stringify(r.p));
  ok(await page.evaluate(() => S.gen.passages.find(x => x.title === "抖音那条").slang.join() === "夯爆了"), "slang not in the text is dropped by the app too");
  // the reader: chip, thread styling, slang in the popup
  await page.click('#tabs button[data-tab="read"]');
  const item = page.locator(".pitem", { hasText: "加班到十点" });
  await item.waitFor();
  ok(/微博·抖音/.test(await item.textContent()), "the reading list shows the 微博·抖音 genre chip");
  await item.click(); await page.waitForSelector("#rd");
  ok(await page.evaluate(() => $("#rd").classList.contains("wb") && $("#rd").classList.contains("weibo") && getComputedStyle($$("#rd p")[1]).borderLeftWidth === "3px" && getComputedStyle($$("#rd p")[0]).borderLeftWidth === "0px"), "the post reads as a post with its replies set off as a thread");
  await page.evaluate(() => loadCedict());
  await page.locator("#rd .tk", { hasText: "夯爆了" }).first().click(); await page.waitForSelector("#sheet");
  const sh = await page.textContent("#sheet");
  ok(/hāng bào le/.test(sh) && /top tier/.test(sh) && /加入复习/.test(sh), "tapping the slang shows the post's own gloss, with 加入复习: " + sh.replace(/\s+/g, " ").slice(0, 90));
  await page.screenshot({ path: (process.env.WB_SHOTS || process.env.TEST_OUT || "/tmp") + "/wb-reader.png" });
  // the genre setting and scheduled reading
  await page.evaluate(() => { closeSheet(); S.settings = setSettings({ reading: Object.assign({}, (S.settings || {}).reading, { genres: ["wb"] }) }); });
  ok(await page.evaluate(() => (schedPassage() || {}).reg === "wb"), "with the genre setting on 微博·抖音, today's passage is a wb post");
  await page.evaluate(() => { S.settings = setSettings({ reading: Object.assign({}, (S.settings || {}).reading, { genres: null }) }); });
  await page.click('#tabs button[data-tab="me"]');
  ok(await page.locator('[data-genre="wb"]').count() === 1 && /微博·抖音/.test(await page.locator('[data-genre="wb"]').locator("xpath=..").textContent()), "Progress → 体裁 Genres has 微博·抖音");
  // ---- 3. retiring slang ----
  const st = await page.evaluate(() => {
    const mk = (title, slang) => { const p = makePassage({ title, paras: ["今天|" + slang.join("|，|") + "|。", "甲|：|好|。", "乙|：|对|。"], qs: [{ q: "a", opts: ["1", "2", "3", "4"] }, { q: "b", opts: ["1", "2", "3", "4"] }], slang, style: "weibo" }, "wb", "T" + title); S.gen.passages.push(p); };
    mk("r1", ["绝绝子", "破防"]); mk("r2", ["绝绝子"]); mk("r3", ["绝绝子", "破防"]); mk("r4", ["破防", "上头"]); mk("r5", ["上头"]);
    S.bank["破防"] = { zh: "破防", s: "", py: "pò fáng", gl: "", t: now(), src: "R" };
    const sl = slangTargets(), h = genHints();
    return { sl, h: [h.slangActive, h.slangRetired, h.slangSaved] };
  });
  ok(st.sl.retired.join() === "绝绝子" && st.sl.active.includes("夯爆了"), "a term in 3 posts and never saved is retired (绝绝子); one in 2 (夯爆了) isn't yet: " + st.sl.retired.join(","));
  ok(st.sl.saved.includes("破防") && !st.sl.active.includes("破防"), "a saved term isn't retired (破防, in 3 posts but saved)");
  ok(st.sl.active[0] === "上头" && st.sl.active.includes("活人感") && st.sl.active.includes("没招"), "terms met 1–2 times stay active, newest first: " + st.sl.active.join(","));
  ok(JSON.stringify(st.h) === JSON.stringify([st.sl.active, st.sl.retired, st.sl.saved]), "the note's hints carry the three lists");
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
