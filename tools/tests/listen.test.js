// Listening + reader fixes (2026-11-07): word popup closes on an outside tap; transcript size, 简/繁 both ways,
// pinyin, word lookup + saving from lyrics, no sideways scrolling; LRCLIB length match + order; fix timing;
// tap along; ~20-minute sections; deleting that sticks across devices + Recently deleted.
// Serve docs/ on 8765 first (see README).
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const URL0 = "http://localhost:8765/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const lrc = "[00:01.00]我看着你的头发\n[00:03.00]干净的面条里面\n[00:05.00]后来我们发现了";
// a silent 8 kHz mono WAV of n seconds
function wav(n) {
  const len = 8000 * n, b = Buffer.alloc(44 + len);
  b.write("RIFF", 0); b.writeUInt32LE(36 + len, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(len, 40); b.fill(128, 44);
  return b.toString("base64");
}
const T0 = Date.now() - 60000;
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [
    { id: "Atest", title: "测试歌", kind: "link", url: "https://example.com", t: T0, cues: [[1, "我看着你的头发"], [3, "干净的面条里面"], [5, "后来我们发现了"]] },
    { id: "Atrad", title: "青花瓷", kind: "link", url: "https://example.com", t: T0 + 1, cues: [[1, "素胚勾勒出青花筆鋒濃轉淡"], [3, "瓶身描繪的牡丹一如妳初妝"]] },
    { id: "Afile", title: "有文件", kind: "file", fname: "x.wav", t: T0 + 2, dur: 60, cues: [[1, "第一句"], [3, "第二句"], [5, "第三句"], [40, "第四句很远"]] },
    { id: "Atap", title: "打拍子", kind: "file", fname: "y.wav", t: T0 + 3, dur: 60, cues: [[null, "一"], [null, "二"], [null, "三"]] },
  ] }, best: { combo: 0 } });
(async () => {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const lr = [
    { trackName: "A", artistName: "x", duration: 238, syncedLyrics: lrc },
    { trackName: "B", artistName: "x", duration: 234, plainLyrics: "x" },
    { trackName: "C", artistName: "x", duration: 236, plainLyrics: "x" },
    { trackName: "D", artistName: "x", duration: 235, syncedLyrics: lrc },
    { trackName: "E", artistName: "x", duration: 235, plainLyrics: "x" },
    { trackName: "F", artistName: "x", duration: 258, syncedLyrics: lrc },
  ];
  await ctx.route("https://lrclib.net/**", r => r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: JSON.stringify(lr) }));
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(async w => { const b = new Blob([Uint8Array.from(atob(w), c => c.charCodeAt(0))], { type: "audio/wav" }); await audioPut("Afile", b); await audioPut("Atap", b); }, wav(60));
  const aa = async () => { if (!(await page.$("#aapop"))) { await page.click("#laa"); await sleep(120); } };
  const openItem = async id => { await page.click('#tabs button[data-tab="listen"]'); await sleep(250); await page.click(`[data-l="${id}"]`); await sleep(400); };

  // ---- 1. popup closes on an outside tap (reader) ----
  await page.click('#tabs button[data-tab="read"]'); await sleep(300);
  await page.locator(".pitem").first().click(); await sleep(400);
  const tks = page.locator("#rd p .tk");
  await tks.nth(0).click(); await sleep(150);
  ok(await page.locator("#sheet").count() === 1, "tapping a word opens the popup");
  await page.locator("#sheet .w").first().click(); await sleep(100);
  ok(await page.locator("#sheet").count() === 1, "tapping inside the popup keeps it open");
  const w1 = await page.locator("#sheet .w").first().textContent();
  await tks.nth(3).click(); await sleep(150);
  ok(await page.locator("#sheet").count() === 1 && w1 !== await page.locator("#sheet .w").first().textContent(), "tapping another word switches to that word");
  await page.mouse.click(380, 70); await sleep(150);
  ok(await page.locator("#sheet").count() === 0, "tapping outside closes the popup");

  // ---- 2. transcript: size, 简/繁 both ways, pinyin, lookups, no sideways scroll ----
  await openItem("Atest"); await page.click('[data-mode="all"]'); await sleep(100);
  const fs = () => page.locator(".cues .cue").first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  ok(await fs() === 25, "transcript text 25px by default");
  await aa(); await page.click('[data-fs="1"]'); ok(await fs() === 28, "字 + makes it bigger");
  await aa(); await page.click('[data-fs="-1"]'); ok(await fs() === 25, "字 − makes it smaller");
  const lines = () => page.locator(".cues .cue").allTextContents();
  await aa(); await page.click('[data-scr="t"]'); await page.waitForFunction(() => ZHC); await sleep(100);
  const tr = await lines(); console.log("   s→t:", tr.join(" / "));
  ok(tr[0] === "我看著你的頭髮" && tr[1] === "乾淨的麵條裡面" && tr[2] === "後來我們發現了", "繁體: simplified lyrics shown traditional, by phrase");
  await openItem("Atrad"); await page.click('[data-mode="all"]'); await sleep(200);
  ok((await lines())[0] === "素胚勾勒出青花筆鋒濃轉淡", "繁體 on a traditional file: the file's own characters");
  await aa(); await page.click('[data-scr="s"]'); await sleep(150);
  const simp = await lines(); console.log("   t→s:", simp.join(" / "));
  ok(simp[0] === "素胚勾勒出青花笔锋浓转淡" && simp[1] === "瓶身描绘的牡丹一如妳初妆", "简体 on a traditional file converts it (濃轉淡 → 浓转淡)");
  await aa(); await page.click("#lpy"); await sleep(150);
  const rt = await page.locator(".cues rt").allTextContents(); console.log("   pinyin:", rt.slice(0, 6).join(" "));
  ok(rt.length >= 4 && rt.some(x => /zhuǎn|nóng/.test(x)), "拼音 shows pinyin over the words");
  ok(await page.locator(".cues .tk").filter({ hasText: "妳" }).locator("rt").textContent() === "nǐ", "妳 gets pinyin (looked up as 你)");
  await aa(); await page.click("#lpy"); await sleep(100); ok(await page.locator(".cues rt").count() === 0, "拼音 off again");
  const tk = page.locator(".cues .tk").filter({ hasText: "牡丹" });
  await tk.click(); await sleep(200);
  ok(await page.locator("#sheet").count() === 1 && (await page.locator("#sheet .w").first().textContent()) === "牡丹", "tapping a word in the lyrics opens the dictionary (simplified headword)");
  await page.click("#sheet #addb"); await sleep(150);
  const b = await page.evaluate(() => S.bank["牡丹"]);
  ok(b && b.s === "瓶身描绘的牡丹一如妳初妆" && b.src === "A:Atrad", "…and saves it with its lyric line (simplified) as the sentence");
  // sideways: make a long unbroken line and check nothing scrolls horizontally
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Atest"); it.cues[0][1] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789我看着你的头发".repeat(2); });
  await openItem("Atest"); await page.click('[data-mode="all"]'); await sleep(150);
  const sw = await page.evaluate(() => { const c = $("#lcues"); return [c.scrollWidth, c.clientWidth, document.documentElement.scrollWidth, window.innerWidth]; });
  ok(sw[0] <= sw[1] + 1 && sw[2] <= sw[3] + 1, "no sideways scrolling in the transcript or the page: " + sw.join(" "));
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Atest"); it.cues[0][1] = "我看着你的头发"; save(); });

  // ---- 3. LRCLIB: within 1 s, closest first ----
  await page.click("#ltredit"); await sleep(200);
  await page.evaluate(() => { LST.edit.dur = 235.4; });
  await page.fill("#lrq", "测试"); await page.click("#lrgo"); await page.waitForSelector("[data-lr]");
  const rows = await page.locator("[data-lr]").allTextContents(), names = rows.map(r => r.trim()[0]);
  ok(names.join("") === "DEBCAF", "LRCLIB: closest first, timed before untimed at the same length");
  ok(rows.filter(r => r.includes("对得上")).map(r => r.trim()[0]).join("") === "DEBC", "LRCLIB: only 3:54–3:56 match a 3:55 file");
  await page.click("#ltrcancel");

  // ---- 4. player bar + Aa menu + fix timing line by line ----
  await openItem("Afile"); await page.waitForSelector("#lpp");
  ok(await page.evaluate(() => LST.mode) === "follow" && await page.locator("#ltype").textContent() === "🎵 歌 Song", "a 1-minute timed file is guessed a song and opens in Follow");
  const geo = await page.evaluate(() => { const b = $("#lbar").getBoundingClientRect(), t = $("#tabs").getBoundingClientRect(), c = $("#lcues").getBoundingClientRect(); return [Math.round(b.bottom), Math.round(t.top), Math.round(c.bottom), Math.round(b.top)]; });
  ok(Math.abs(geo[0] - geo[1]) <= 1 && geo[2] <= geo[3], "player bar sits right above the tabs and the lyrics box ends above it: " + geo.join(" "));
  ok(await page.locator("#llostb").count() === 0, "songs: no 'lost it' button in the bar");
  await page.click("#lrate"); ok(await page.evaluate(() => AUD.playbackRate) === 1.25, "speed chip cycles (1 → 1.25)");
  await page.click("#lrate"); await page.click("#lrate"); await page.click("#lrate"); ok(await page.evaluate(() => AUD.playbackRate) === 1, "…and round again to 1");
  await page.evaluate(() => { AUD.currentTime = 20; }); await page.click("#lb5"); ok(Math.abs(await page.evaluate(() => AUD.currentTime) - 15) < 0.1, "⟲5 in the bar");
  await page.click("#laa"); await sleep(120); ok(await page.locator("#aapop [data-scr]").count() === 2 && await page.locator("#aapop [data-lag]").count() === 2, "Aa opens one small menu: script, pinyin, size, tap delay");
  await page.click('#aapop [data-lag="0.05"]'); ok(await page.evaluate(() => tapLag()) === 0.35, "tap delay +0.05 (default 0.3)"); await page.click('#aapop [data-lag="-0.05"]');
  await page.mouse.click(200, 400); await sleep(100); ok(await page.locator("#aapop").count() === 0, "a tap outside closes the Aa menu");
  await page.click("#lfix"); await sleep(150);
  ok(await page.locator("#ltime .tpanel").count() === 1, "⏱ puts the timing tools in the player bar (not over the lyrics)");
  const stat = () => page.locator("#tstat").textContent();
  ok(/暂停中/.test(await stat()), "paused, nothing selected: the bar says a tap selects and 早/晚 move the whole song");
  await page.evaluate(() => { AUD.currentTime = 10; return AUD.play(); }); await sleep(300);
  ok(/播放中.*后面的跟着挪/.test(await stat()), "playing: the bar says a tap sets that line and later lines follow");
  await page.locator('.cues .cue[data-ci="2"]').click(); await sleep(100);
  let v = await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); return [cueT(it, 0), cueT(it, 1), cueT(it, 2), cueT(it, 3), JSON.stringify(it.fix)]; });
  ok(v[0] === 1 && v[1] === 3 && Math.abs(v[2] - 10) < 0.4 && Math.abs(v[3] - (40 + v[2] - 5)) < 0.01, "tap line 3 while playing: it moves, line 4 follows by the same amount, lines 1–2 stay: " + v.slice(0, 4).map(x => x.toFixed(2)).join(" "));
  ok(/第 3 句 →.*后面 1 句跟着/.test(await stat()), "…and the bar says exactly that: " + (await stat()).slice(0, 40));
  ok(await page.locator('.cues .cue.fixed').count() === 1 && await page.locator("#sheet").count() === 0, "the line gets ✓; tapping a word while fixing doesn't open the dictionary");
  await page.evaluate(() => AUD.pause()); await sleep(200);
  await page.locator('.cues .cue[data-ci="1"]').click(); await sleep(100);
  ok(await page.locator('.cues .cue.sel').count() === 1 && /已选第 2 句/.test(await stat()), "paused: tapping a line selects it (and says so)");
  await page.click('[data-tn="0.1"]'); await sleep(100);
  v = await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); return [cueT(it, 1), cueT(it, 2)]; });
  ok(Math.abs(v[0] - 3.1) < 0.01 && Math.abs(v[1] - 10) < 0.4, "晚 0.1 moves the selected line; it stops at the next line you set: " + v.join(" "));
  await page.click("#tcarry"); await sleep(50); ok(/挪这一句/.test(await stat()), "后面跟着 off: the bar says only this line moves");
  await page.locator('.cues .cue[data-ci="0"]').click(); await page.click('[data-tn="-0.1"]'); await sleep(100);
  v = await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); return [cueT(it, 0), cueT(it, 1)]; });
  ok(Math.abs(v[0] - 0.9) < 0.01 && Math.abs(v[1] - 3.1) < 0.01, "carry off: only that line moves");
  await page.locator('.cues .cue[data-ci="0"]').click(); await sleep(50);
  ok(await page.locator('.cues .cue.sel').count() === 0, "tapping the selected line again unselects it");
  await page.locator('.cues .cue[data-ci="1"]').click(); await page.click("#tunsel"); await sleep(50);
  ok(await page.locator('.cues .cue.sel').count() === 0, "✕ 不选 unselects too");
  await page.click('[data-tn="0.1"]'); await sleep(50);
  ok(Math.abs(await page.evaluate(() => S.gen.listen.find(x => x.id === "Afile").tm.b) - 0.1) < 0.001 && /整首/.test(await stat()), "nothing selected: 早/晚 move the whole song (and say so)");
  await page.click("#tundo"); ok(await page.evaluate(() => !S.gen.listen.find(x => x.id === "Afile").tm || !S.gen.listen.find(x => x.id === "Afile").tm.b), "撤销 undoes the last change");
  await page.click("#treset"); ok(await page.evaluate(() => !S.gen.listen.find(x => x.id === "Afile").fix), "重置 goes back to the file's times");
  await page.click("#tundo"); ok(await page.evaluate(() => Object.keys(S.gen.listen.find(x => x.id === "Afile").fix || {}).length) === 3, "…and 撤销 brings your fixes back");
  await page.locator('.cues .cue[data-ci="0"]').click(); await page.click("#tre"); await sleep(400);
  ok(await page.evaluate(() => !AUD.paused && AUD.currentTime < 1), "↻ plays the selected line from 1 s before");
  await sleep(3200); ok(await page.evaluate(() => AUD.paused && AUD.currentTime >= 3.1 && AUD.currentTime < 3.6), "…and stops when the next line starts");
  ok(await page.evaluate(() => { AUD.currentTime = 11; syncCue(S.gen.listen.find(x => x.id === "Afile")); return $(".cue.now").dataset.ci; }) === "2", "follow uses the fixed timing");
  await page.click("#tdone"); await sleep(100); ok(await page.locator("#ltime .tpanel").count() === 0, "好了 closes the timing tools");
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); delete it.fix; delete it.tm; it.type = "talk"; it.u = now(); save(); });
  await openItem("Afile"); await page.waitForSelector("#lpp");
  ok(await page.locator("#llostb").count() === 1 && await page.evaluate(() => LST.mode) === "hide", "talk: 'lost it' in the bar, text starts hidden");
  await page.click("#llostb"); ok(await page.evaluate(() => LST.lost.length) === 1, "…and it counts");
  await page.click("#ltype"); ok(await page.evaluate(() => S.gen.listen.find(x => x.id === "Afile").type) === "song", "the 🎵/🎙 chip switches the type");
  await page.evaluate(() => { LST.mode = "follow"; renderListenItem($("#main"), S.gen.listen.find(x => x.id === "Afile")); });
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); it.cues = Array.from({ length: 30 }, (_, i) => [i * 2, "第" + i + "句"]); delete it.tm; it.u = now(); LST.fix = false; renderListenItem($("#main"), it); $("#lcues").hidden = false; AUD.currentTime = 30.5; LAST_CUE = -1; syncCue(it); });
  await sleep(900);
  const pos = await page.evaluate(() => { const box = $("#lcues"), now = $(".cue.now"); return Math.round((now.getBoundingClientRect().top - box.getBoundingClientRect().top) / now.offsetHeight); });
  ok(pos === 1, "follow puts the playing line second from the top (row " + pos + ")");
  await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Afile"); it.cues = [[1, "第一句"], [3, "第二句"], [5, "第三句"], [40, "第四句很远"]]; save(); });

  // ---- 5. tap along ----
  await openItem("Atap"); await page.waitForSelector("#lpp");
  await page.click("#ltapgo"); await sleep(150);
  await page.click("#tapgo"); await page.waitForFunction(() => AUD && !AUD.paused, null, { timeout: 5000 });
  await sleep(300);
  for (let k = 0; k < 2; k++) { await page.click("#tapgo"); await sleep(400); }
  ok((await page.evaluate(() => S.gen.listen.find(x => x.id === "Atap").tap.length)) === 2, "each tap stamps one line (kept on the item)");
  await page.click("#tapundo"); await sleep(200);
  ok((await page.evaluate(() => S.gen.listen.find(x => x.id === "Atap").tap.length)) === 1, "撤销 removes the last tap");
  await page.evaluate(() => { if (AUD.paused) AUD.play(); }); await sleep(300);
  await page.click("#tapgo"); await sleep(400); await page.click("#tapgo"); await sleep(300);
  const tapped = await page.evaluate(() => { const it = S.gen.listen.find(x => x.id === "Atap"); return { cues: it.cues.map(c => c[0]), tap: it.tap, timed: isTimed(it), mode: LST.mode }; });
  ok(tapped.timed && !tapped.tap && tapped.cues.every((x, i) => i === 0 || x > tapped.cues[i - 1]) && tapped.mode === "follow", "after the last line it's timed and follows: " + tapped.cues.join(", "));
  await page.evaluate(() => AUD.pause());

  // ---- 6. ~20-minute sections ----
  const sec = await page.evaluate(() => {
    const line = "这是一句很普通的话，用来凑字数。"; // 15 characters
    const untimed = { id: "Along", kind: "file", t: now(), cues: Array.from({ length: 800 }, () => [null, line]) }; // 12,000 characters
    const timed = { id: "Atimed", kind: "file", t: now(), dur: 3000, cues: Array.from({ length: 300 }, (_, i) => [i * 10, line]) };
    S.gen.listen.push(untimed, timed); save();
    addReq({ rid: "q:listen:Atimed", kind: "questions", target: "listen", id: "Atimed" });
    const req = outboxRequests().find(r => r.rid === "q:listen:Atimed");
    const q3 = k => [0, 1, 2].map(j => ({ q: `s${k} q${j}`, opts: ["a", "b", "c", "d"], why: ["1", "2", "3", "4"] }));
    const r = { qs: 0, bad: 0, rg: 0, ck: 0 }; applyAnswers({ questions: [{ rid: "q:listen:Atimed", secs: [{ qs: q3(0) }, { qs: q3(1) }, { qs: q3(2) }] }] }, r);
    LST = { id: "Atimed", fromT: 1300, maxT: 1500, lost: [] };
    const heard = listenQuizList(timed).map(q => q.q);
    LST = { id: "Atimed", lost: [] }; const all = listenQuizList(timed).length;
    return { u: listenSections(untimed), t: listenSections(timed), req: req.sections, nq: timed.qs.length, secs: timed.secs, heard, all };
  });
  ok(JSON.stringify(sec.u) === "[[0,313],[313,626],[626,800]]", "untimed 12,800 characters (16 a line, punctuation not counted) → 3 sections of ~5,000: " + JSON.stringify(sec.u));
  ok(JSON.stringify(sec.t) === "[[0,120],[120,240],[240,300]]", "timed 50 minutes → 0–20, 20–40, 40–50 min: " + JSON.stringify(sec.t));
  ok(JSON.stringify(sec.req) === JSON.stringify(sec.t), "the request to Claude carries the sections");
  ok(sec.nq === 9 && sec.secs && sec.secs.length === 3, "an answer with 3 questions per section is applied (9 questions)");
  ok(sec.heard.length === 3 && sec.heard.every(q => q.startsWith("s1")), "listened 21:40–25:00 → only that section's questions: " + sec.heard.join(", "));
  ok(sec.all === 9, "nothing played (or a link) → all the questions");

  // ---- 7. deleting sticks; Recently deleted ----
  const del = await page.evaluate(() => {
    S.bank["测试"] = { zh: "测试", s: "测试一下", py: "cèshì", gl: "test", t: now() - 5000 }; S.items["B:测试"] = { t: "bank", n: 1 }; save();
    const other = JSON.parse(JSON.stringify(S)); // the other device, before the deletes
    const it = S.gen.listen.find(x => x.id === "Atest");
    trashListen(it); removeFromBank("测试");
    const m1 = mergeStates(S, other), m2 = mergeStates(other, S);
    const res = {
      gone1: !m1.gen.listen.some(x => x.id === "Atest") && !m1.bank["测试"] && !m1.items["B:测试"],
      gone2: !m2.gen.listen.some(x => x.id === "Atest") && !m2.bank["测试"],
      binBoth: m2.gen.trash.length === 2,
    };
    const later = JSON.parse(JSON.stringify(other)); later.gen.listen.find(x => x.id === "Atest").u = now() + 1000; // changed on the other device after the delete
    res.keptChanged = mergeStates(S, later).gen.listen.some(x => x.id === "Atest");
    S = mergeStates(S, other); save();
    return res;
  });
  ok(del.gone1 && del.gone2, "a delete on one device sticks after syncing with the other (either way round)");
  ok(del.binBoth, "the bin syncs too");
  ok(del.keptChanged, "…but an item changed on the other device after the delete is kept");
  await page.click('#tabs button[data-tab="me"]'); await sleep(300);
  ok(await page.locator("#trashcard [data-trr]").count() === 2, "Progress → 最近删除 lists both");
  await page.locator("#trashcard [data-trr]").first().click(); await sleep(200);
  const back = await page.evaluate(() => [!!S.bank["测试"] || S.gen.listen.some(x => x.id === "Atest"), S.gen.trash.length]);
  ok(back[0] && back[1] === 1, "恢复 restores it");
  const x = page.locator("#trashcard [data-trx]").first(); await x.click(); await sleep(100);
  ok(await page.evaluate(() => S.gen.trash.length) === 1, "永久删除 needs a second tap");
  await page.locator("#trashcard [data-trx]").first().click(); await sleep(200);
  ok(await page.evaluate(() => S.gen.trash.length) === 0 && await page.locator("#trashcard").count() === 0, "…then it's gone and the bin card disappears");
  const purge = await page.evaluate(async () => {
    const it = S.gen.listen.find(x => x.id === "Afile"); it.r2 = { key: "audio/Afile.wav", size: 1 };
    const other = JSON.parse(JSON.stringify(S));
    trashListen(it); const e = S.gen.trash[0]; const had = !!(await audioGet("Afile"));
    purgeTrash(e); const nowHas = !!(await audioGet("Afile"));
    const m = mergeStates(other, S);
    return { had, nowHas, r2: S.r2del.includes("audio/Afile.wav"), noBack: !m.gen.listen.some(x => x.id === "Afile") && !m.gen.trash.length };
  });
  ok(purge.had && !purge.nowHas && purge.r2, "audio stays while in the bin; deleting for good removes it here and in the cloud");
  ok(purge.noBack, "an emptied bin entry doesn't come back from the other device");
  await page.evaluate(() => { trashListen(S.gen.listen.find(x => x.id === "Atrad")); S.gen.trash[0].t = now() - 31 * 864e5; housekeep(); });
  ok(await page.evaluate(() => S.gen.trash.length) === 0, "bin entries go by themselves after 30 days");
  const cap = await page.evaluate(() => { for (let i = 0; i < 305; i++) trashAdd("word", "w" + i, { b: { zh: "w" + i, t: now() } }); const n = S.gen.trash.length, newest = S.gen.trash.some(e => e.title === "w304"), oldest = S.gen.trash.some(e => e.title === "w0"); return [n, newest, oldest]; });
  await page.evaluate(() => render()); await sleep(200);
  const hgt = await page.evaluate(() => [$("#trashcard").offsetHeight, innerHeight]);
  ok(hgt[0] < hgt[1] * 0.8, "300 entries: the bin card stays short and scrolls inside (" + hgt[0] + "px)");
  await page.evaluate(() => { S.gen.trash.slice().forEach(e => purgeTrash(e, true)); save(); render(); });
  ok(cap[0] === 300 && cap[1] && !cap[2], "the bin keeps at most 300; the oldest go for good first: " + cap.join(" "));
  await page.evaluate(() => { S.gen.mine.push({ id: "Mx1p0", grp: "Mx1", part: 0, np: 1, title: "测试文章", mine: true, reg: "mine", t: now() - 1000, paras: ["你好"], gl: {}, en: "" }); indexGen(); save(); });
  const mine = await page.evaluate(() => { const other = JSON.parse(JSON.stringify(S)); trashMine([S.gen.mine.find(p => p.id === "Mx1p0")]); S = mergeStates(S, other); indexGen(); return [S.gen.mine.some(p => p.id === "Mx1p0"), PSG.has("Mx1p0")]; });
  ok(!mine[0] && !mine[1], "a deleted own text stays deleted after syncing (the test-reading case)");

  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
