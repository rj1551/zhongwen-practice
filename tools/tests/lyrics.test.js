// Claude's lyric analysis (2026-11-08): songs ask for it (derived requests, 5 a night or all), answers are checked
// and stored per lyrics version, then drive word splitting, sung pinyin, tricky underlines and 解释 Notes.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [
    { id: "Ay", title: "像风一样", kind: "link", url: "https://example.com", t: Date.now(), type: "song", cues: [[1, "我等的模样好不具象"], [3, "你竟然能做到带走阳光"], [5, "雨落下来了"]] },
    { id: "Az", title: "老歌", kind: "link", url: "https://example.com", t: Date.now() - 5000, type: "song", cues: [[1, "濃轉淡"]] },
    { id: "At", title: "播客", kind: "link", url: "https://example.com", t: Date.now(), type: "talk", cues: [[1, "今天聊聊"]] },
  ] }, best: { combo: 0 } });
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); localStorage.setItem("zwlgf:cuepref", JSON.stringify({ py: true })); } }, st);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  ok(await page.evaluate(() => outboxRequests().filter(r => r.kind === "lyrics").length) === 0, "lyric analysis requests are off by default (Claude declines to reproduce lyrics)");
  await page.evaluate(() => { LYR_REQUESTS = true; });
  const req = await page.evaluate(() => outboxRequests().filter(r => r.kind === "lyrics"));
  ok(req.length === 2 && req[0].rid === "y:Ay" && req[1].rid === "y:Az" && /^[a-z0-9]+$/.test(req[0].h), "every song without an analysis is asked for (newest first, not talk): " + req.map(r => r.rid).join(" "));
  const pk = { zwpack: 1, id: "t-ly", made: new Date().toISOString(), by: "test", lyrics: [{ rid: "y:Ay", h: req[0].h, lines: [
    { w: [["我", "wǒ"], ["等", "děng"], ["的", "de"], ["模样", "múyàng"], ["好不", "hǎobù", "so very (好不 + adj)", 1], ["具象", "jùxiàng", "concrete, tangible"]], p: "我等的那个样子一点也不清楚", en: "What I'm waiting for has no clear shape" },
    { w: [["你", "nǐ"], ["竟然", "jìngrán"], ["能", "néng"], ["做到", "zuòdào"], ["带走", "dàizǒu"], ["阳光", "yángguāng"]], en: "You actually managed to take the sunlight away" },
    { w: [["雨", "yǔ"], ["落", "luò", "", 1], ["下来", "xiàlái"], ["了", "le"], ["X", "x"]], en: "The rain is falling" } ] },
    { rid: "y:Az", h: "stale", lines: [{ w: [["濃轉淡", "nóngzhuǎndàn"]], en: "x" }] }] };
  const r = await page.evaluate(p => { const res = applyPack(p, "test"); const it = S.gen.listen.find(x => x.id === "Ay"); return { ly: res.ly, ok: lyrOk(it), nullLine: it.lyr.lines[2] === null, stale: !S.gen.listen.find(x => x.id === "Az").lyr, sum: packSummary(res), left: outboxRequests().filter(r => r.kind === "lyrics").map(r => r.rid) }; }, pk);
  ok(r.ly === 1 && r.ok && r.stale, "the answer is stored for its lyrics version; one for lyrics that changed since is ignored");
  ok(r.nullLine, "a line whose words don't spell it exactly falls back to the dictionary (not stored)");
  ok(r.left.join() === "y:Az", "answered songs drop out of the requests");
  ok(/1 首歌词分析好了/.test(r.sum), "the delivery message says so");
  await page.click('#tabs button[data-tab="listen"]'); await sleep(300); await page.click('[data-l="Ay"]'); await sleep(400);
  if (await page.locator("#lcues").isHidden()) { await page.click('[data-mode="all"]'); await sleep(200); }
  const tk = await page.locator('.cue[data-ci="0"] .tk').allTextContents();
  ok(tk.join("|") === "我wǒ|等děng|的de|模样múyàng|好不hǎobù|具象jùxiàng", "Claude's word split and pinyin as sung are used (我 + 等, not 我等): " + tk.join("|"));
  ok(await page.locator('.cue[data-ci="0"] .tk.tricky').count() === 1, "tricky readings / literary words are underlined");
  await page.locator('.cue[data-ci="0"] .tk').nth(4).click(); await sleep(200);
  ok(/so very/.test(await page.locator("#sheet").innerText()), "the popup shows Claude's meaning for this song first");
  await page.mouse.click(380, 100); await sleep(100);
  ok(await page.locator(".lyrn").count() === 0, "解释 is off by default");
  await page.click("#lex"); await sleep(150);
  const notes = await page.locator(".lyrn").allInnerTexts();
  ok(notes.length === 2 && /一点也不清楚/.test(notes[0]) && /no clear shape/.test(notes[0]) && !/一点/.test(notes[1]), "解释 Notes: paraphrase where given, English under each analysed line");
  ok(/分析过歌词 ✓/.test(await page.locator(".card").nth(1).innerText()), "the item says it's been analysed");
  await page.click("#lback"); await sleep(200);
  ok(/还要分析 1 首/.test(await page.locator("#main").innerText()), "the list shows how many songs are waiting");
  await page.click("#lyrall"); await sleep(200);
  ok(await page.evaluate(() => (computeOutbox(), OUTBOX.lyricsAll === true)), "Do all in the next run puts lyricsAll in the note");
  ok(/Run now/.test(await page.locator("#main").innerText()), "…and says how to start the run right away");
  await page.evaluate(() => { S.gen.listen.find(x => x.id === "Az").type = "talk"; computeOutbox(); });
  ok(await page.evaluate(() => !OUTBOX.lyricsAll && !lyrAllOn()), "the flag clears itself once nothing is waiting");
  await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
