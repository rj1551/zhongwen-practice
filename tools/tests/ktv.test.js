// Lyric feed (刷歌词, KTV instant mode, v74): cards of one line, song from 1.5 s before the line (silence first when
// the line starts earlier), runs of 2–4 lines, character popup with the reading in this line, taps outside only
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

  // ---- 2. opening: the button, tabs hidden, a line without pinyin, the song from 1.5 s before ----
  await page.click('#tabs button[data-tab="listen"]'); await page.waitForSelector("#kfopen");
  ok(/刷歌词/.test(await page.textContent("#kfopen")), "听 has a 刷歌词 · Lyric feed button");
  // first run: song Ka from line 4 (starts at 10 s → audio from 8.5 s)
  await page.evaluate(() => { const o = kfPickRun; window.__pick = [{ id: "Ka", i: 4, n: 2 }, { id: "Ka", i: 1, n: 2 }, { id: "Kb", i: 1, n: 3 }]; kfPickRun = () => { const p = window.__pick.shift(); if (!p) return o(); const it = S.gen.listen.find(x => x.id === p.id); return { it, lines: Array.from({ length: p.n }, (_, k) => p.i + k), why: null }; }; });
  await page.click("#kfopen"); await page.waitForSelector("#kfline");
  ok(await page.locator("#tabs").isHidden(), "the tabs are hidden while the feed is open (■ stops it)");
  ok(await page.textContent("#kfline") === "慢慢地走着" && await page.locator("#kfline rt").count() === 0, "the card shows one line, large, no pinyin");
  await page.waitForFunction(() => KF.aud && !KF.aud.paused && KF.aud.currentTime > 0, null, { timeout: 5000 });
  const t1 = await page.evaluate(() => KF.aud.currentTime);
  ok(t1 >= 8.4 && t1 < 9.6, "the song plays from ~1.5 s before the line (line at 10 s): " + t1.toFixed(2));
  await page.waitForFunction(() => KF.aud.paused, null, { timeout: 8000 });
  const t2 = await page.evaluate(() => KF.aud.currentTime);
  ok(t2 >= 12.9 && t2 < 13.6, "and stops at the line's end (next line at 13 s): " + t2.toFixed(2));
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-card.png" });
  ok(/1\/2/.test(await page.textContent(".kfsong")) && /歌一/.test(await page.textContent(".kfsong")), "the song's name and place in the run show at the top");

  // ---- 3. next (Space), a line early in the song: silence first ----
  await page.keyboard.press("Space"); await page.waitForFunction(() => $("#kfline") && $("#kfline").textContent === "最后一句歌词");
  ok(true, "Space goes to the next line of the run");
  await page.keyboard.press("ArrowDown"); await page.waitForFunction(() => $("#kfline") && $("#kfline").textContent === "我还给你自由");
  ok(await page.evaluate(() => KF.run.it.id === "Ka" && KF.ri === 0), "↓ also goes on; after a run's last line a new run starts");
  const t3 = await page.evaluate(async () => { await new Promise(r => setTimeout(r, 200)); return [KF.aud.paused, KF.aud.currentTime]; });
  ok(t3[0] === true && t3[1] < 0.05, "a line 1 s into the song: silence first (nothing playing 0.2 s in): " + JSON.stringify(t3));
  await page.waitForFunction(() => !KF.aud.paused, null, { timeout: 3000 });
  ok(await page.evaluate(() => KF.aud.currentTime < 0.6), "then the song from the start, so the lead-in is still 1.5 s");

  // ---- 4. tapping a character ----
  const huan = page.locator('.kfc', { hasText: "还" });
  await huan.click(); await page.waitForSelector("#kfpop");
  const pop = await page.textContent("#kfpop");
  ok(/还/.test(await page.textContent("#kfpop .kch")) && /huán/.test(await page.textContent("#kfpop .kpy")), "the popup shows that character large with its reading in this line: " + (await page.textContent("#kfpop .kpy")));
  ok(/还给/.test(await page.textContent("#kfpop .kwd")) && /huángěi/.test(await page.textContent("#kfpop .kwd")), "the word it belongs to is underneath, small: " + (await page.textContent("#kfpop .kwd")).trim());
  await page.screenshot({ path: (process.env.KTV_SHOTS || process.env.TEST_OUT || "/tmp") + "/ktv-popup.png" });
  ok(/加入复习/.test(pop) && /点错了/.test(pop), "with 加入复习 Add to review and 点错了 · Mis-tap");
  ok(await page.evaluate(() => kfState().ev.length === 1 && kfState().ev[0].k === "还|huán" && kfState().ev[0].s === "Ka" && kfState().ev[0].l === 1), "the stumble is recorded on character + reading (还|huán)");
  ok(await huan.locator("rt").textContent() === "huán", "the tapped character keeps its pinyin above it");
  await page.locator('.kfc', { hasText: "自" }).click(); await sleep(150);
  ok(await page.locator("#kfpop").count() === 0 && await page.evaluate(() => kfState().ev.length === 1) && await page.locator('.kfc.x').count() === 1, "with the popup open, tapping another character only closes it (nothing else selected)");
  await huan.click(); await page.waitForSelector("#kfpop");
  ok(await page.evaluate(() => kfState().ev.length === 1 && KF.looked === 1), "tapping the same character again reopens the popup without a second stumble");
  await huan.click(); await sleep(150);
  ok(await page.locator("#kfpop").count() === 0, "tapping it again while open just closes the popup");
  await page.locator('.kfc', { hasText: "你" }).click(); await page.waitForSelector("#kfpop");
  await page.click("#kfmis"); await sleep(100);
  ok(await page.locator("#kfpop").count() === 0 && await page.evaluate(() => kfState().ev.filter(e => !e.x).length === 1 && kfState().ev.some(e => e.x && e.k.startsWith("你"))) && await page.locator('.kfc.x').count() === 1, "点错了 un-marks it (kept flagged, so the mis-tap also syncs)");
  await huan.click(); await page.waitForSelector("#kfpop"); await page.click("#kfadd"); await sleep(100);
  const bk = await page.evaluate(() => S.bank["还给"]);
  ok(bk && bk.py === "huángěi" && bk.src === "A:Ka" && bk.s === "我还给你自由", "加入复习 saves the word with this line as its sentence: " + JSON.stringify(bk && { py: bk.py, s: bk.s, src: bk.src }));
  await page.locator("#kfnext").click(); await page.waitForFunction(() => $("#kfline") && $("#kfline").textContent === "你说了一句话");
  ok(true, "下一句 Next button works");

  // ---- 5. swipe up ----
  const swipe = async () => page.evaluate(() => { const el = $("#kfbody"), mk = y => new Touch({ identifier: 1, target: el, clientX: 200, clientY: y }); el.dispatchEvent(new TouchEvent("touchstart", { touches: [mk(600)], changedTouches: [mk(600)], bubbles: true })); el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [mk(400)], bubbles: true })); });
  const before = await page.textContent("#kfline"); await swipe(); await page.waitForFunction(b => $("#kfline") && $("#kfline").textContent !== b, before);
  ok(await page.evaluate(() => KF.run.it.id === "Kb" && KF.run.lines[KF.ri] === 1), "swiping up goes to the next card (here: a run from another song)");

  // ---- 6. runs: consecutive lines, 2–4, then another song ----
  const runs = await page.evaluate(() => { const out = []; KF.lastLine = null; for (let k = 0; k < 40; k++) { KF.run = kfPickRun(); out.push([KF.run.it.id, KF.run.lines]); } return out; });
  const consec = runs.every(([, l]) => l.length >= 1 && l.length <= 4 && l.every((x, j) => j === 0 || x === l[j - 1] + 1));
  const alt = runs.every(([id], k) => k === 0 || id !== runs[k - 1][0] || runs[k].why);
  ok(consec && runs.filter(([, l]) => l.length >= 2).length >= 30, "runs are 1–4 consecutive lines (mostly 2–4): " + runs.slice(0, 6).map(([id, l]) => id + ":" + l.join(",")).join(" "));
  ok(alt, "a run is followed by a run from another song");

  // ---- 7. a stumble comes back in another line with the same reading, and retires ----
  const back = await page.evaluate(() => {
    const e = kfState().ev.find(x => x.k === "还|huán"); e.t = now() - 10 * MIN; KF.lastLine = null; KF.run = null;
    let hit = 0, other = 0; for (let k = 0; k < 40; k++) { const r = kfPickRun(); if (r.why === "还|huán") { if (r.it.id === "Kb" && r.lines[0] === 0) hit++; else other++; } }
    return [hit, other];
  });
  ok(back[0] >= 12 && back[1] === 0, "a due stumble (还|huán) comes back in a different line with 还 huán (把心还给我吧), never the same line: " + back.join("/"));
  ok(await page.evaluate(() => !kfChars(S.gen.listen[0], 3).some(c => kfKey(c) === "还|huán")), "(我们还在这里 has 还 hái, so it isn't used for it)");
  const retire = await page.evaluate(() => {
    const it = S.gen.listen.find(x => x.id === "Kb"); const r = [];
    for (let k = 0; k < 2; k++) { KF.cur = { it, i: 0 }; KF.tapped = new Map(); kfFinishCard(); r.push(kfStumbles().filter(g => g.k === "还|huán").length); kfState().ok["还|huán"] = kfState().ok["还|huán"].map(t => t - 1000); }
    return r;
  });
  ok(retire[0] === 1 && retire[1] === 0, "seen again untapped in another line twice → retired: " + retire.join(","));
  const same = await page.evaluate(() => { const it = S.gen.listen[0], k = kfKey(kfChars(it, 4).find(c => c.s === "着")); kfState().ev.push({ t: now() - 5000, k, s: "Ka", l: 4, w: "着" }); KF.cur = { it, i: 4 }; KF.tapped = new Map(); kfFinishCard(); return (kfState().ok[k] || []).length; });
  ok(same === 0, "seeing the same line again doesn't count as reading it (memory of the line)");

  // ---- 8. merge (sync) ----
  const mg = await page.evaluate(() => {
    const a = { ev: [{ t: 1, k: "还|huán", s: "Ka", l: 1, w: "还给" }, { t: 2, k: "了|le", s: "Ka", l: 2, w: "了" }], ok: { "还|huán": [5] }, ln: { "Ka:1": [10, 2] }, sg: { Ka: [3, 10] } };
    const b = { ev: [{ t: 2, k: "了|le", s: "Ka", l: 2, w: "了", x: 1 }, { t: 3, k: "雨|yǔ", s: "Kb", l: 1, w: "雨" }], ok: { "还|huán": [7] }, ln: { "Ka:1": [20, 1], "Kb:1": [4, 1] }, sg: { Ka: [1, 30] } };
    const m = kfMerge(a, b), m2 = mergeStates(Object.assign(freshState(), { ktv: a, updatedAt: 1 }), Object.assign(freshState(), { ktv: b, updatedAt: 2 })).ktv;
    return { n: m.ev.length, x: m.ev.find(e => e.k === "了|le").x, ok: m.ok["还|huán"].join(","), ln: m.ln["Ka:1"].join(","), sg: m.sg.Ka.join(","), same: JSON.stringify(m) === JSON.stringify(m2) };
  });
  ok(mg.n === 3 && mg.x === 1 && mg.ok === "5,7" && mg.ln === "20,2" && mg.sg === "3,30" && mg.same, "stumbles merge between devices: union, a mis-tap on either side wins, line/song memory by max: " + JSON.stringify(mg));

  // ---- 9. mute ----
  await page.evaluate(() => { KF.run = null; render(); }); await page.waitForSelector("#kfline");
  await page.click("#kfmute"); await sleep(150);
  ok(await page.evaluate(() => localStorage.getItem("zwlgf:kfmute") === "1" && KF.aud.paused) && /静音/.test(await page.textContent("#kfmute")) && await page.locator("#kfre").isHidden(), "🔇 mutes (remembered on this device), no replay button");
  await page.keyboard.press("Space"); await sleep(400);
  ok(await page.evaluate(() => KF.aud.paused), "muted cards stay silent");
  await page.click("#kfmute"); await page.waitForFunction(() => !KF.aud.paused, null, { timeout: 4000 });
  ok(true, "unmuting plays the line again");

  // ---- 10. traditional ----
  await page.evaluate(async () => { setCuePref({ tr: true }); await loadZhc(); KF.run = { it: S.gen.listen.find(x => x.id === "Kb"), lines: [1], why: null }; KF.ri = 0; KF.cur = null; render(); });
  await page.waitForSelector("#kfline");
  const trd = await page.textContent("#kfline");
  await page.locator('.kfc').nth(3).click(); await page.waitForSelector("#kfpop"); await page.mouse.click(200, 120); await sleep(100);
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
