// v114: the word popup — a CC-CEDICT "variant of …" / "see …" entry also shows the meaning of the word it points to
// (梭标 → 梭镖 spear); a word with pinyin but no meaning (a re-chunked lyric) shows the dictionary words inside it
// straight away, with no 更多 button that would open nothing new. Serve docs/ on 8765 first, or use run-all.sh.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ viewport: { width: 390, height: 800 } });
  const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const pg = await ctx.newPage(); pg.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  try {
    await pg.goto(URL0); await pg.waitForFunction(() => !document.querySelector("#tabs").hidden);
    await pg.evaluate(() => loadCedict()); await pg.waitForFunction(() => !!CED, null, { timeout: 30000 });
    const v = await pg.evaluate(() => [cedFollow("variant of 梭鏢|梭镖"), cedFollow("see 基友"), cedFollow("spear"), lookup("梭标").gl]);
    ok(/→ 梭镖：spear/.test(v[0]) && /→ 基友：/.test(v[1]) && v[2] === "spear" && /spear/.test(v[3]), "variant / see entries get the meaning of the word they point to: " + JSON.stringify(v));
    const open = (tok, gl) => pg.evaluate(([tok, gl]) => { const t = document.createElement("span"); t.textContent = tok; document.body.append(t); openSheet({ id: "x", gl }, [[tok]], 0, 0, t); const sh = $("#sheet"); return { text: sh.textContent, more: !!$("#more", sh), hidden: $("#moreb", sh).hidden }; }, [tok, gl]);
    const a = await open("梭标", {});
    ok(/spear/.test(a.text), "梭标's popup says spear");
    const b = await open("重归于好", { "重归于好": ["chóngguīyúhǎo", ""] });
    ok(/每个部分/.test(b.text) && !b.more && !b.hidden && /归于/.test(b.text) && /to belong to/.test(b.text), "a lyric chunk with pinyin only: the parts are shown straight away (归于 to belong to…), no 更多 button: " + b.text.slice(0, 200));
    const seg = await pg.evaluate(() => [segmentText("研究生命的起源").join("/"), segmentText("结婚的和尚未结婚的").join("/"), segmentText("他从小学会了游泳").join("/"), segmentText("研究生命的起源", {}, new Set(["生命"])).join("/")]);
    ok(seg[0] === "研究/生命/的/起源" && seg[1] === "结婚/的/和/尚未/结婚/的" && seg[2] === "他/从小/学会/了/游泳" && !seg[3].includes("生命"), "chunking: the fewest words wins over the longest word from the left; a banned word isn't used: " + JSON.stringify(seg));
    // the popup follows the word when the page scrolls, and closes once the word is off screen
    const fl = await pg.evaluate(async () => {
      closeSheet(); const pad = document.createElement("div"); pad.style.height = "3000px"; document.body.append(pad);
      const t = document.createElement("span"); t.textContent = "研究"; t.style.cssText = "position:absolute;top:1200px;left:20px"; document.body.append(t);
      scrollTo(0, 1200 - 500); await new Promise(r => setTimeout(r, 50));
      openSheet({ id: "x", gl: {} }, [["研究"]], 0, 0, t); const sh = $("#sheet"), pm = sh.classList.contains("popm"), top0 = parseFloat(sh.style.top);
      scrollBy(0, 40); await new Promise(r => setTimeout(r, 50)); const top1 = parseFloat(sh.style.top);
      scrollTo(0, 2400); await new Promise(r => setTimeout(r, 50)); const gone = !$("#sheet");
      pad.remove(); t.remove(); scrollTo(0, 0); return { pm, moved: Math.round(top0 - top1), gone };
    });
    ok(fl.pm && fl.moved === 40 && fl.gone, "the card moves with the word on scroll (40 px) and closes when the word leaves the screen: " + JSON.stringify(fl));
    // lock-screen scrubber: position state + seekto
    const ms = await pg.evaluate(() => { const calls = []; const orig = navigator.mediaSession.setPositionState; navigator.mediaSession.setPositionState = x => calls.push(x); const hs = {}; const oh = navigator.mediaSession.setActionHandler.bind(navigator.mediaSession); navigator.mediaSession.setActionHandler = (k, f) => { hs[k] = f; };
      const el = { _msw: true, duration: 200, currentTime: 30, playbackRate: 1, addEventListener() {} }; msSeekable(el); hs.seekto && hs.seekto({ seekTime: 90 });
      navigator.mediaSession.setPositionState = orig; navigator.mediaSession.setActionHandler = oh; return { calls, cur: el.currentTime, has: !!hs.seekto }; });
    ok(ms.has && ms.cur === 90 && ms.calls.length >= 2 && ms.calls[0].duration === 200 && ms.calls[ms.calls.length - 1].position === 90, "lock screen: the position is told and seekto moves the audio: " + JSON.stringify(ms));
    const c = await open("唯心主义", {});
    ok(c.more && c.hidden && !/每个部分/.test(c.text), "a word with a meaning: as before (更多 for the characters)");
  } catch (e) { ok(false, "error " + e); }
  await br.close();
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); process.exit(fails ? 1 : 0);
})();
