// Lyric feed (刷歌词, KTV instant mode, v74; scrolling v75): a run of lines scrolling with the song, lead-in dots, ↺ from a line,
// skip / back / pause, character popup (pauses; the reading in this line), taps outside only
// close, 点错了 un-marks, stumbles come back in another line and retire, sync merge, summary, Time card 写/歌,
// autoMins from card time only. Serve docs/ on 8765 first (see README).
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
function wav(n) {
  const len = 8000 * n, b = Buffer.alloc(44 + len);
  b.write("RIFF", 0); b.writeUInt32LE(36 + len, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(len, 40); b.fill(128, 44);
  return b.toString("base64");
}
const T0 = Date.now() - 60000;
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [
    { id: "Ka", title: "歌一", kind: "file", type: "song", fname: "a.wav", t: T0, dur: 30, cues: [[0.5, "作词：某某"], [1, "我还给你自由"], [4, "你说了一句话"], [7, "我们还在这里"], [10, "慢慢地走着"], [13, "最后一句歌词"]] },
    { id: "Kb", title: "歌二", kind: "file", type: "song", fname: "b.wav", t: T0 + 1, dur: 30, cues: [[2, "把心还给我吧"], [5, "天空下着大雨"], [8, "我等了很久很久"], [11, "一样的夜晚"]] },
    { id: "Kt", title: "说话", kind: "file", type: "talk", fname: "c.wav", t: T0 + 2, dur: 900, cues: [[1, "这不是歌"], [3, "不应该出现"]] },
  ] }, best: { combo: 0 } });
(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(async w => { const b = new Blob([Uint8Array.from(atob(w), c => c.charCodeAt(0))], { type: "audio/wav" }); await audioPut("Ka", b); await audioPut("Kb", b); await loadCedict(); }, wav(30));

  // ---- 1. reading per character ----
  const sp = await page.evaluate(() => [splitPy(Array.from("还给"), "huángěi"), splitPy(Array.from("一样"), "yíyàng"), splitPy(Array.from("孩子"), "háizi"), splitPy(Array.from("慢慢地"), "mànmàndì")].map(x => x.join(" ")));
  ok(sp[0] === "huán gěi" && sp[1] === "yí yàng" && sp[2] === "hái zi" && sp[3] === "màn màn dì", "a word's pinyin splits per character, keeping the line's tones: " + sp.join(" | "));
  const ch = await page.evaluate(() => kfChars(S.gen.listen[0], 1).map(c => c.s + (c.py ? "|" + c.py : "")).join(" "));
  ok(/还\|huán/.test(ch) && /给\|gěi/.test(ch), "in 我还给你自由, 还 reads huán (from the word 还给): " + ch);
  ok(await page.evaluate(() => kfSpecial(kfChars(S.gen.listen[0], 1).find(c => c.s === "还")) && !kfSpecial(kfChars(S.gen.listen[0], 3).find(c => c.s === "还"))), "还 huán counts as a lyric reading, 还 hái doesn't");
  ok(await page.evaluate(() => !kfLineOk(S.gen.listen[0], 0) && kfLineOk(S.gen.listen[0], 1) && kfSongs().length === 2), "credit lines are skipped; only songs (not talks) are in the feed");

  // ---- 2. opening: several lines, the song from 1.5 s before the run, lead-in dots, lines scroll by themselves ----
  await page.click('#tabs button[data-tab="listen"]'); await page.waitForSelector("#kfopen");
  ok(/刷歌词/.test(await page.textContent("#kfopen")), "听 has a 刷歌词 · Lyric feed button");
  // runs: Ka lines 1–5 (1 s, 4 s, 7 s, 10 s, 13 s), then Kb lines 0–3
  await page.evaluate(() => { const o = kfPickRun; window.__pick = [{ id: "Ka", i: 1, n: 5 }, { id: "Kb", i: 0, n: 4 }]; kfPickRun = () => { const p = window.__pick.shift(); if (!p) return o(); const it = S.gen.listen.find(x => x.id === p.id); return { it, lines: Array.from({ length: p.n }, (_, k) => p.i + k), why: null }; }; });
  await page.click("#kfopen"); await page.waitForSelector("#kfcol .kfl.cur");
  ok(await page.locator("#tabs").isHidden(), "the tabs are hidden while the feed is open (■ stops it)");
  const lines = await page.$$eval("#kfcol .kfl", els => els.map(e => [e.className, e.querySelector(".kft").textContent]));
  ok(lines.length === 5 && lines[0][0].includes("cur") && lines[0][1] === "我还给你自由" && lines[1][0].includes("next") && lines[2][0].includes("next") && lines[3][0].includes("later"), "the run's lines are all on screen: current large, the next two below, the rest dimmer: " + lines.map(l => l[0].replace("kfl ", "") + ":" + l[1]).join(" "));
  ok(await page.locator("#kfcol .kpyl").count() === 0, "no pinyin on the lines");
  await page.waitForFunction(() => !$("#kfdots").hidden && $$("#kfdots i:not(.off)").length >= 1, null, { timeout: 2000 });
  const d0 = await page.evaluate(() => [$$("#kfdots i:not(.off)").length, KF.state, $("#kfdots").parentNode.classList.contains("cur")]);
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-lead.png" });
  ok(d0[1] === "lead" && d0[0] >= 1 && d0[2], "lead-in: dots above the current line before the words start: " + JSON.stringify(d0));
  ok(await page.evaluate(() => KF.aud.paused && KF.aud.currentTime < 0.05), "a run starting 1 s into the song: silence first");
  await page.waitForFunction(() => KF.state === "play", null, { timeout: 3000 });
  ok(await page.evaluate(() => $("#kfdots").hidden && !KF.aud.paused && KF.aud.currentTime >= 0.9 && KF.aud.currentTime < 1.6), "the dots go when the words start (song at ~1 s, playing)");
  const y0 = await page.evaluate(() => $("#kfcol").style.transform);
  await page.waitForFunction(() => KF.li === 1, null, { timeout: 5000 });
  const a1 = await page.evaluate(() => [KF.aud.currentTime, KF.aud.paused, $(".kfl.cur .kft").textContent, $(".kfl.prev .kft").textContent, $("#kfcol").style.transform]);
  ok(a1[0] >= 3.95 && a1[0] < 4.4 && !a1[1] && a1[2] === "你说了一句话" && a1[3] === "我还给你自由", "at the next line's time it becomes current by itself, the song still playing (no button): " + a1.slice(0, 4).join(" | "));
  ok(a1[4] !== y0, "the lines scroll up (" + y0 + " → " + a1[4] + ")");
  ok(/2\/5/.test(await page.textContent("#kfpos")) && /歌一/.test(await page.textContent(".kfsong")), "the song's name and the place in the run show at the top");
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-card.png" });

  // ---- 3. tapping a character pauses; closing goes on from 1.5 s before the line ----
  const huan = page.locator('.kfl[data-j="0"] .kfc', { hasText: "还" });
  await huan.click(); await page.waitForSelector("#kfpop");
  ok(await page.evaluate(() => KF.aud.paused && KF.state === "pause"), "tapping a character pauses the song");
  ok(/还/.test(await page.textContent("#kfpop .kch")) && /huán/.test(await page.textContent("#kfpop .kpy")), "the popup shows that character large with its reading in its line: " + (await page.textContent("#kfpop .kpy")));
  ok(/还给/.test(await page.textContent("#kfpop .kwd")) && /huángěi/.test(await page.textContent("#kfpop .kwd")), "the word it belongs to is underneath, small: " + (await page.textContent("#kfpop .kwd")).trim());
  const pop = await page.textContent("#kfpop");
  ok(/加入复习/.test(pop) && /点错了/.test(pop), "with 加入复习 Add to review and 点错了 · Mis-tap");
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-popup.png" });
  ok(await page.evaluate(() => kfState().ev.length === 1 && kfState().ev[0].k === "还|huán" && kfState().ev[0].s === "Ka" && kfState().ev[0].l === 1), "the stumble is recorded on character + reading (还|huán), in the line it was in");
  ok(await huan.locator(".kpyl").textContent() === "huán", "the tapped character keeps its pinyin above it");
  const sz = await page.evaluate(() => { const c = $('.kfl[data-j="0"] .kfc.kx'), o = [...$$('.kfl[data-j="0"] .kfc')].find(x => !x.classList.contains("x")); return [getComputedStyle(c).fontSize, getComputedStyle(o).fontSize, c.getBoundingClientRect().height, o.getBoundingClientRect().height]; });
  ok(sz[0] === sz[1] && Math.abs(sz[2] - sz[3]) < 1, "…as a label: the character keeps the line's size and height (" + sz.join(", ") + ")");
  await page.locator('.kfl[data-j="1"] .kfc').first().click(); await sleep(150);
  ok(await page.locator("#kfpop").count() === 0 && await page.evaluate(() => kfState().ev.length === 1) && await page.locator('.kfc.kx').count() === 1, "with the popup open, tapping another character only closes it (nothing else selected)");
  await page.waitForFunction(() => !KF.aud.paused, null, { timeout: 3000 });
  const r1 = await page.evaluate(() => [KF.li, KF.aud.currentTime]);
  ok(r1[0] === 1 && r1[1] >= 2.4 && r1[1] < 3.2, "…and the song goes on from 1.5 s before the line it was on (line at 4 s): " + r1[1].toFixed(2));
  await huan.click(); await page.waitForSelector("#kfpop");
  ok(await page.evaluate(() => kfState().ev.length === 1 && KF.looked === 1), "tapping the same character again reopens the popup without a second stumble");
  await huan.click(); await sleep(150);
  ok(await page.locator("#kfpop").count() === 0, "tapping it again while open just closes the popup");
  await page.locator('.kfl[data-j="0"] .kfc', { hasText: "你" }).click(); await page.waitForSelector("#kfpop");
  await page.click("#kfmis"); await sleep(100);
  ok(await page.locator("#kfpop").count() === 0 && await page.evaluate(() => kfState().ev.filter(e => !e.x).length === 1 && kfState().ev.some(e => e.x && e.k.startsWith("你"))) && await page.locator('.kfc.kx').count() === 1, "点错了 un-marks it (kept flagged, so the mis-tap also syncs)");
  await huan.click(); await page.waitForSelector("#kfpop"); await page.click("#kfadd"); await sleep(100);
  const bk = await page.evaluate(() => S.bank["还给"]);
  ok(bk && bk.py === "huángěi" && bk.src === "A:Ka" && bk.s === "我还给你自由", "加入复习 saves the word with its line as the sentence: " + JSON.stringify(bk && { py: bk.py, s: bk.s, src: bk.src }));

  // ---- 4. restart from a line, skip, back, pause ----
  await page.click('.kfl[data-j="3"] .kfre');
  await page.waitForFunction(() => KF.li === 3 && !KF.aud.paused, null, { timeout: 3000 });
  const r2 = await page.evaluate(() => [KF.aud.currentTime, KF.state, $(".kfl.cur .kft").textContent]);
  ok(r2[0] >= 8.4 && r2[0] < 9.3 && r2[1] === "lead" && r2[2] === "慢慢地走着", "↺ on a line starts from it: 1.5 s before (line at 10 s), with the lead-in: " + r2[0].toFixed(2));
  ok(await page.evaluate(() => getComputedStyle($(".kfl.cur .kfre")).visibility === "hidden" && getComputedStyle($(".kfl.prev .kfre")).visibility !== "hidden"), "every line but the current one has its ↺");
  await page.keyboard.press("ArrowUp"); await page.waitForFunction(() => KF.li === 2 && !KF.aud.paused, null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.aud.currentTime >= 5.4 && KF.aud.currentTime < 6.3), "↑ goes back a line (with the lead-in)");
  await page.keyboard.press("ArrowDown"); await page.waitForFunction(() => KF.li === 3 && !KF.aud.paused, null, { timeout: 3000 });
  ok(true, "↓ skips to the next line");
  const swipe = async (from, to) => page.evaluate(([a, b]) => { const el = $("#kfview"), mk = y => new Touch({ identifier: 1, target: el, clientX: 200, clientY: y }); el.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(a)], changedTouches: [mk(a)], bubbles: true })); el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(b)], bubbles: true })); }, [from, to]);
  await swipe(600, 400); await page.waitForFunction(() => KF.li === 4, null, { timeout: 3000 });
  await swipe(400, 600); await page.waitForFunction(() => KF.li === 3, null, { timeout: 3000 });
  ok(true, "swiping up skips a line, swiping down goes back");
  await page.keyboard.press("Space"); await sleep(150);
  ok(await page.evaluate(() => KF.aud.paused && KF.state === "pause") && await page.locator("#kfpz").isVisible(), "Space pauses (⏸ 已暂停 shows)");
  await page.click("#kfview", { position: { x: 30, y: 20 } }); await page.waitForFunction(() => !KF.aud.paused, null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.li === 3 && KF.aud.currentTime < 9.3) && await page.locator("#kfpz").isHidden(), "a tap on an empty spot goes on, from 1.5 s before the line");
  await page.click("#kfview", { position: { x: 30, y: 20 } }); await sleep(100);
  ok(await page.evaluate(() => KF.state === "pause"), "…and a tap on an empty spot pauses too");

  // ---- 5. end of the run → the next song, with its own lead-in ----
  const cards0 = await page.evaluate(() => KF.cards);
  await page.click('.kfl[data-j="4"] .kfre'); await page.waitForFunction(() => KF.li === 4, null, { timeout: 3000 });
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => KF.run && KF.run.it.id === "Kb" && $(".kfl.cur") && $(".kfl.cur .kft").textContent === "把心还给我吧", null, { timeout: 4000 });
  ok(/歌二/.test(await page.textContent(".kfsong")) && await page.locator("#kfcol .kfl").count() === 4, "after the run's last line the next song's run follows by itself");
  ok(await page.evaluate(c => KF.cards > c, cards0), "lines that went by are counted");
  await page.waitForFunction(() => KF.state === "play", null, { timeout: 4000 });
  ok(await page.evaluate(() => KF.aud.currentTime >= 1.9 && KF.aud.currentTime < 2.6), "…from 1.5 s before its first line (line at 2 s)");

  // ---- 5b. changing songs: ⏭ / swipe left / →, ⏮ / swipe right / ← (one run back) ----
  const sg0 = await page.evaluate(() => (kfState().sg.Kb || [0])[0]);
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => KF.run.it.id === "Ka" && $(".kfl.cur .kft") && $(".kfl.cur .kft").textContent === "我还给你自由", null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.li === 0 && KF.run.lines.join() === "1,2,3,4,5"), "← goes back to the run just left (same song, same lines), from its first line");
  ok(await page.evaluate(s => (kfState().sg.Kb || [0])[0] === s + 1, sg0), "the song you left counts as played");
  ok(await page.locator("#kfsp").isDisabled(), "at the first run of the sitting ⏮ is greyed out");
  await page.keyboard.press("ArrowLeft"); await sleep(200);
  ok(await page.evaluate(() => KF.run.it.id === "Ka" && KF.li === 0), "← again does nothing (says 没有上一首)");
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => KF.run.it.id === "Kb", null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.run.lines.join() === "0,1,2,3" && KF.hi === 1 && KF.hist.length === 2), "→ after ← goes forward to the same song B again (not a new one)");
  for (let k = 0; k < 3; k++) { await page.keyboard.press("ArrowLeft"); await page.waitForFunction(() => KF.run.it.id === "Ka"); await page.keyboard.press("ArrowRight"); await page.waitForFunction(() => KF.run.it.id === "Kb"); }
  ok(await page.evaluate(() => KF.hist.length === 2 && KF.run.lines.join() === "0,1,2,3"), "back and forth a few times stays between the same two songs");
  await page.click("#kfsn");
  await page.waitForFunction(() => KF.hist.length === 3 && KF.state !== "gap", null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.run.it.id === "Ka" && KF.hi === 2) && await page.locator("#kfsp").isEnabled(), "⏭ past the newest picks a new song, and ⏮ can come back");
  const hswipe = async (a, b) => page.evaluate(([x0, x1]) => { const el = $("#kfview"), mk = x => new Touch({ identifier: 2, target: el, clientX: x, clientY: 300 }); el.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(x0)], changedTouches: [mk(x0)], bubbles: true })); el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(x1)], bubbles: true })); }, [a, b]);
  await hswipe(300, 100); await page.waitForFunction(() => KF.run.it.id === "Kb" && KF.hist.length === 4, null, { timeout: 3000 });
  ok(true, "swiping left goes to the next song");
  await hswipe(100, 300); await page.waitForFunction(() => KF.run.it.id === "Ka" && KF.hi === 2, null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.li === 0), "swiping right goes back to the previous one");
  await hswipe(300, 100); await page.waitForFunction(() => KF.run.it.id === "Kb" && KF.hi === 3, null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.hist.length === 4), "swiping left again goes forward to it, not to a new song");

  // ---- 6. runs: 4–8 consecutive lines, then another song ----
  const runs = await page.evaluate(() => { const out = []; KF.lastLine = null; const keep = KF.run; for (let k = 0; k < 40; k++) { KF.run = kfPickRun(); out.push([KF.run.it.id, KF.run.lines]); } KF.run = keep; return out; });
  const consec = runs.every(([, l]) => l.length >= 1 && l.length <= 8 && l.every((x, j) => j === 0 || x === l[j - 1] + 1));
  const alt = runs.every(([id], k) => k === 0 || id !== runs[k - 1][0]);
  ok(consec && runs.every(([id, l]) => l.length >= 4 || l[l.length - 1] === (id === "Ka" ? 5 : 3)), "runs are 4–8 consecutive lines (fewer only at a song's end): " + runs.slice(0, 6).map(([id, l]) => id + ":" + l.join(",")).join(" "));
  ok(alt, "a run is followed by a run from another song");
  await page.keyboard.press("Space");

  // ---- 7. a stumble comes back in another line with the same reading, and retires ----
  const back = await page.evaluate(() => {
    const e = kfState().ev.find(x => x.k === "还|huán"); e.t = now() - 10 * MIN; delete kfState().ok["还|huán"]; KF.lastLine = null; const keep = KF.run;
    let hit = 0, other = 0; for (let k = 0; k < 40; k++) { const r = kfPickRun(); if (r.why === "还|huán") { if (r.it.id === "Kb" && r.lines[0] === 0) hit++; else other++; } }
    KF.run = keep; return [hit, other];
  });
  ok(back[0] >= 12 && back[1] === 0, "a due stumble (还|huán) comes back in a different line with 还 huán (把心还给我吧), never the same line: " + back.join("/"));
  ok(await page.evaluate(() => !kfChars(S.gen.listen[0], 3).some(c => kfKey(c) === "还|huán")), "(我们还在这里 has 还 hái, so it isn't used for it)");
  const retire = await page.evaluate(() => {
    const keep = KF.run; KF.run = { it: S.gen.listen.find(x => x.id === "Kb"), lines: [0] }; KF.tapped = new Map(); const r = [];
    for (let k = 0; k < 2; k++) { kfLineDone(0); r.push(kfStumbles().filter(g => g.k === "还|huán").length); kfState().ok["还|huán"] = kfState().ok["还|huán"].map(t => t - 1000); }
    KF.run = keep; return r;
  });
  ok(retire[0] === 1 && retire[1] === 0, "seen again untapped in another line twice → retired: " + retire.join(","));
  const same = await page.evaluate(() => { const it = S.gen.listen[0], k = kfKey(kfChars(it, 4).find(c => c.s === "着")); kfState().ev.push({ t: now() - 5000, k, s: "Ka", l: 4, w: "着" }); const keep = KF.run; KF.run = { it, lines: [4] }; kfLineDone(0); KF.run = keep; return (kfState().ok[k] || []).length; });
  ok(same === 0, "seeing the same line again doesn't count as reading it (memory of the line)");

  // ---- 8. merge (sync) ----
  const mg = await page.evaluate(() => {
    const a = { ev: [{ t: 1, k: "还|huán", s: "Ka", l: 1, w: "还给" }, { t: 2, k: "了|le", s: "Ka", l: 2, w: "了" }], ok: { "还|huán": [5] }, ln: { "Ka:1": [10, 2] }, sg: { Ka: [3, 10] } };
    const b = { ev: [{ t: 2, k: "了|le", s: "Ka", l: 2, w: "了", x: 1 }, { t: 3, k: "雨|yǔ", s: "Kb", l: 1, w: "雨" }], ok: { "还|huán": [7] }, ln: { "Ka:1": [20, 1], "Kb:1": [4, 1] }, sg: { Ka: [1, 30] } };
    const m = kfMerge(a, b), m2 = mergeStates(Object.assign(freshState(), { ktv: a, updatedAt: 1 }), Object.assign(freshState(), { ktv: b, updatedAt: 2 })).ktv;
    return { n: m.ev.length, x: m.ev.find(e => e.k === "了|le").x, ok: m.ok["还|huán"].join(","), ln: m.ln["Ka:1"].join(","), sg: m.sg.Ka.join(","), same: JSON.stringify(m) === JSON.stringify(m2) };
  });
  ok(mg.n === 3 && mg.x === 1 && mg.ok === "5,7" && mg.ln === "20,2" && mg.sg === "3,30" && mg.same, "stumbles merge between devices: union, a mis-tap on either side wins, line/song memory by max: " + JSON.stringify(mg));

  // ---- 9. mute: silent, but the lines still move at the song's timing ----
  await page.click("#kfmute"); await page.waitForSelector("#kfcol .kfl.cur");
  ok(await page.evaluate(() => localStorage.getItem("zwlgf:kfmute") === "1") && /静音/.test(await page.textContent("#kfmute")), "🔇 mutes (remembered on this device)");
  await page.evaluate(() => kfStartAt(0));
  await page.waitForFunction(() => KF.li === 1, null, { timeout: 6000 });
  ok(await page.evaluate(() => KF.aud.paused && !KF.useAud), "muted, the lines still scroll by themselves at the song's timing, silently");
  await page.click("#kfmute"); await page.waitForFunction(() => !KF.aud.paused, null, { timeout: 4000 });
  ok(true, "unmuting plays again (from 1.5 s before the current line)");

  // ---- 10. traditional ----
  await page.evaluate(async () => { setCuePref({ tr: true }); await loadZhc(); KF.run = { it: S.gen.listen.find(x => x.id === "Kb"), lines: [1], why: null }; KF.li = 0; KF.tapped = new Map(); render(); });
  await page.waitForSelector("#kfcol .kfl.cur");
  const trd = await page.textContent(".kfl.cur .kft");
  await page.locator('.kfl.cur .kfc').nth(3).click(); await page.waitForSelector("#kfpop"); await page.mouse.click(200, 120); await sleep(100);
  ok(/雨/.test(trd) && /著|着/.test(trd) && await page.evaluate(() => kfState().ev.slice(-1)[0].k.startsWith("着|")), "with 繁 on, the line shows traditional characters but stumbles are kept under the simplified one: " + trd);
  await page.evaluate(() => setCuePref({ tr: false }));

  // ---- 11. stop: summary, time, Time card, autoMins ----
  await page.evaluate(() => { KF.acc = 30000; });
  await page.click("#kfquit"); await page.waitForSelector("#kfsumt");
  const sum = await page.textContent("#kfsumt");
  ok(/^\d+ 行 · \d+ 个字查了拼音$/.test(sum.trim()), "■ shows a one-line summary: " + sum);
  ok(await page.locator("#tabs").isVisible(), "the tabs come back on the summary");
  const tm = await page.evaluate(() => { const d = S.log[dayKey()], sp = daySplit(d); return { kt: sp.kt, due: sp.due, n: d.n, sec: d.sec }; });
  ok(tm.kt >= 30 && tm.due === 0 && tm.n === 0 && tm.sec >= tm.kt, "feed time is logged as kt (in the day's total, not card time, not an answer): " + JSON.stringify(tm));
  await page.click("#kfback"); await page.waitForSelector("#kfopen");
  ok(true, "回到听力 Back returns to the 听 list");
  const am = await page.evaluate(() => {
    const dv = devId(); for (let i = 1; i <= 3; i++) S.log[dayKey(now() - i * DAY)] = logTotals({ by: { [dv]: { n: 10, ok: 9, due: 1200, extra: 600, rd: 1200, fw: 600, kt: 1800 } } });
    return [autoMins(), cardMinsPerDay()];
  });
  ok(am[0] === 30, "autoMins counts card time only (30 min a day of cards; reading, writing and the feed left out): " + am[0]);
  await page.click('#tabs button[data-tab="me"]'); await page.waitForSelector("#timecard");
  const tc = await page.textContent("#timecard");
  ok(/写 Writing/.test(tc) && /歌 KTV/.test(tc) && /写作 Writing 30 min/.test(tc) && /lyric feed\) 1 h 3\d min/.test(tc), "the Time card has 写 Writing and 歌 KTV segments and totals");
  ok(await page.evaluate(() => [...$$("#timecard .tcol")].slice(-4, -1).every(c => c.children.length === 5)), "each of those days' bars has five parts (set, extra, writing, reading, KTV)");
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-time.png" });

  // ---- 12. empty: no timed songs ----
  await page.evaluate(() => { S.gen.listen = S.gen.listen.filter(x => x.type !== "song"); });
  await page.click('#tabs button[data-tab="listen"]'); await sleep(300);
  ok(await page.locator("#kfopen").count() === 0, "no timed songs → no 刷歌词 button");

  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
