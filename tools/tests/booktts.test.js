// 听书 · reading a book aloud (v95), with a fake speech engine and a fake screen wake lock: 🔊 starts at the place,
// one sentence at a time, highlighted; the place follows the voice; pause / play / ⏮ ⏭; the speed ruler (0.5–1.5×,
// 0.1 steps); the voice picker in Aa; 🔒 ignores taps until held; a word tap pauses; 目录 jumps take the voice along;
// the page follows only if you were following; pages mode turns pages; the screen is kept on only while it reads;
// the phone stopping it while away → paused at the same sentence; heard text isn't read (no book speed), the time
// is 听书 (log field lb) in the Time card; the end of the book.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const shot = (pg, n) => process.env.TEST_OUT ? pg.screenshot({ path: require("path").join(process.env.TEST_OUT, n) }) : null;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const STATE = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
const SENT = ["他在河边慢慢地走着。", "可是谁也没有注意到！", "天已经黑了吗？", "风从山上吹下来；", "“我们回家吧。”他说。"];
const SPOKEN = [...SENT.slice(0, 4), "“我们回家吧。”", "他说。"]; // a closing quote ends its sentence
function makeBook() { // 6 chapters × 12 paragraphs, five sentences each
  const lines = [], cn = "一二三四五六";
  for (let c = 0; c < 6; c++) { lines.push(`第${cn[c]}章　河边`); for (let p = 0; p < 12; p++) lines.push("　　" + SENT.join("")); }
  return lines.join("\n");
}
const FAKE = () => {
  window.__said = []; window.__dur = 40; window.__wl = { req: 0, held: 0 };
  let cur = null, timer = null;
  const voices = [{ name: "婷婷", lang: "zh-CN", voiceURI: "tingting", localService: true }, { name: "美嘉", lang: "zh-HK", voiceURI: "meijia", localService: true }, { name: "Online 晓晓", lang: "zh-CN", voiceURI: "xiaoxiao", localService: false }, { name: "Samantha", lang: "en-US", voiceURI: "sam", localService: true }];
  window.__voices = voices;
  class U { constructor(t) { this.text = t; this.rate = 1; this.voice = null; this.lang = ""; } }
  const ss = {
    get speaking() { return !!cur; }, get pending() { return false; },
    getVoices: () => window.__voices.slice(),
    speak(u) { cur = u; window.__said.push({ text: u.text, rate: u.rate, voice: u.voice && u.voice.voiceURI, lang: u.lang }); timer = setTimeout(() => { if (cur === u) { cur = null; u.onend && u.onend({}); } }, window.__dur); },
    cancel() { clearTimeout(timer); const u = cur; cur = null; if (u && u.onerror) u.onerror({ error: "interrupted" }); },
    pause() {}, resume() {}, addEventListener() {}, removeEventListener() {},
    __kill() { clearTimeout(timer); cur = null; } // the phone stopping it (no event)
  };
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: ss });
  window.SpeechSynthesisUtterance = U;
  Object.defineProperty(navigator, "audioSession", { configurable: true, value: { type: "auto" } });
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl.req++; window.__wl.held++; const l = { released: false, _f: [], addEventListener(k, f) { this._f.push(f); }, async release() { if (!this.released) { this.released = true; window.__wl.held--; } } }; return l; } } });
};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: false });
  await ctx.addInitScript(st => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); } }, STATE);
  await ctx.addInitScript(FAKE);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(() => setView("read")); await page.waitForSelector("#bkadd");
  await page.setInputFiles("#bkfile", { name: "河边.txt", mimeType: "text/plain", buffer: Buffer.from(makeBook(), "utf8") });
  await page.waitForSelector("[data-bkgo]"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  await page.waitForFunction(() => !!CED, null, { timeout: 30000 }); await page.evaluate(() => { BK.toks = []; BK.sents = []; render(); });
  ok(await page.isVisible("#bktts"), "the book's top bar has 🔊");
  ok(await page.evaluate(() => bkSents(1).length === 6 && ttsText(1, 4) === "“我们回家吧。”" && ttsText(1, 5) === "他说。"), "a paragraph splits into its sentences (a closing quote stays with its sentence): " + await page.evaluate(() => JSON.stringify(bkSents(1).map((x, i) => ttsText(1, i)))));
  // start at the place: paragraph 3
  await page.evaluate(() => { BK.lastAt = { p: 3, t: now() }; BK.pos = 3; render(); });
  const rd0 = await page.evaluate(() => JSON.stringify(BK.rd));
  await page.evaluate(() => { window.__dur = 100000; }); // hold the first sentence
  await page.click("#bktts"); await page.waitForSelector("#ttsbar");
  let said = await page.evaluate(() => window.__said);
  ok(said.length === 1 && said[0].text === SENT[0] && said[0].lang === "zh-CN" && said[0].voice === "tingting" && said[0].rate === 1, "🔊 reads from the place, first sentence, zh-CN voice on the device, 1.0×: " + JSON.stringify(said[0]));
  await shot(page, "tts-bar.png");
  ok(await page.evaluate(() => { const e = $(".bk .ts.on"); return e && e.dataset.s === "3:0" && e.textContent === "他在河边慢慢地走着。"; }), "the sentence being read is highlighted");
  ok(await page.evaluate(() => window.__wl.held === 1), "the screen is kept on while it reads");
  ok(await page.evaluate(() => navigator.audioSession.type === "playback" && !!TTS_KEEP && TTS_KEEP.loop), "while it reads the page's sound is in playback mode (plays with the silent switch on), with a silent loop as backup");
  ok(await page.evaluate(() => { const b = $("#ttsbar").getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.bottom > innerHeight - 140; }), "the player bar sits at the bottom of the screen");
  // the chain: sentences one after another, into the next paragraphs; the place follows
  await page.evaluate(() => { window.__dur = 15; speechSynthesis.__kill(); TTS.utt.onend(); });
  await page.waitForFunction(() => TTS && TTS.p >= 5, null, { timeout: 10000 });
  await page.evaluate(() => ttsPause());
  said = await page.evaluate(() => window.__said.map(x => x.text));
  ok(said.slice(0, 7).join("|") === [...SPOKEN, SENT[0]].join("|"), "it reads on sentence by sentence and into the next paragraph: " + said.slice(0, 7).join(" | "));
  const pos = await page.evaluate(() => ({ pos: BK.pos, tp: TTS.p, mp: BK.meta.pos.p }));
  ok(pos.pos === pos.tp && pos.mp === pos.tp, "the place follows the voice (paragraph " + pos.tp + ")");
  ok(await page.evaluate(() => window.__wl.held === 0), "paused: the screen may turn off again");
  ok(await page.evaluate(() => navigator.audioSession.type === "auto" && TTS_KEEP.paused), "paused: the sound mode goes back to what it was, the silent loop stops");
  ok(await page.evaluate(rd0 => JSON.stringify(BK.rd) === rd0 && !(BK.sit && BK.sit.c), rd0), "heard text isn't counted as read (no new characters, no book speed)");
  // pause holds; play picks up the same sentence
  const n0 = await page.evaluate(() => window.__said.length); await page.waitForTimeout(150);
  ok(await page.evaluate(n0 => window.__said.length === n0, n0), "paused: nothing more is said");
  const at = await page.evaluate(() => [TTS.p, TTS.s]);
  await page.evaluate(() => { window.__dur = 100000; }); await page.click("#ttsplay");
  ok(await page.evaluate(at => { const l = window.__said[window.__said.length - 1]; return TTS.playing && l.text === ttsText(at[0], at[1]); }, at), "▶ goes on with the same sentence");
  // ⏭ ⏮ by sentence, across a paragraph
  await page.evaluate(() => { TTS.s = 5; ttsSpeak(); });
  await page.click("#ttsnext");
  let t = await page.evaluate(() => [TTS.p, TTS.s, window.__said[window.__said.length - 1].text]);
  ok(t[0] === at[0] + 1 && t[1] === 0 && t[2] === SENT[0], "⏭ next sentence (into the next paragraph)");
  await page.click("#ttsprev");
  t = await page.evaluate(() => [TTS.p, TTS.s, window.__said[window.__said.length - 1].text]);
  ok(t[0] === at[0] && t[1] === 5 && t[2] === SPOKEN[5], "⏮ previous sentence (back into the paragraph before)");
  // the speed ruler
  await page.click("#ttsrate"); await page.waitForSelector("#ttsrp");
  const ticks = await page.evaluate(() => $$("#ttsr .ttst").length + " " + $$("#ttsr .ttst.big b").map(b => b.textContent).join(","));
  ok(ticks === "11 0.5×,1.0×,1.5×", "speed ruler: 11 ticks, 0.5× to 1.5× (labels at 0.5, 1.0, 1.5): " + ticks);
  ok(await page.textContent("#ttsrv") === "1.0×", "it opens at the current speed, 1.0×");
  await page.evaluate(() => $("#ttsr").scrollTo({ left: 8 * TTS_TICK })); // swipe to 1.3
  await page.waitForFunction(() => ttsPref().rate === 1.3, null, { timeout: 3000 });
  await shot(page, "tts-rate.png");
  ok(await page.textContent("#ttsrv") === "1.3×" && await page.textContent("#ttsrate") === "1.3×", "swiping the ruler to 1.3× shows it big and on the bar");
  await page.waitForFunction(() => window.__said[window.__said.length - 1].rate === 1.3, null, { timeout: 3000 });
  ok(true, "the sentence starts again at 1.3×");
  await page.click("[data-rs='1']"); await page.click("[data-rs='1']"); await page.click("[data-rs='1']");
  await page.waitForFunction(() => ttsPref().rate === 1.5, null, { timeout: 3000 });
  ok(await page.textContent("#ttsrv") === "1.5×", "+ stops at 1.5×");
  await page.click("#ttsr1"); await page.waitForFunction(() => ttsPref().rate === 1, null, { timeout: 3000 });
  ok(true, "1.0× button goes back to normal speed");
  await page.click("#ttsrok"); ok(!(await page.$("#ttsrp")), "好 Done closes the ruler");
  // voice picker in Aa
  await page.click("#bkaa"); await page.waitForSelector("#ttsvsel");
  const opts = await page.evaluate(() => [...$("#ttsvsel").options].map(o => o.textContent));
  ok(opts.length === 3 && !opts.some(o => /Samantha/.test(o)) && opts.some(o => /联网 online/.test(o)), "Aa: a voice picker with the device's Chinese voices only, online ones marked: " + opts.join(" / "));
  await page.selectOption("#ttsvsel", "xiaoxiao");
  ok(await page.evaluate(() => ttsPref().voice === "xiaoxiao" && window.__said[window.__said.length - 1].voice === "xiaoxiao"), "picking a voice uses it at once and remembers it on this device");
  await page.click("#bkaa");
  // a word tap pauses
  await page.evaluate(() => { const e = $(".bk .ts.on .tk"); e.scrollIntoView({ block: "center" }); });
  await page.click(".bk .ts.on .tk"); await page.waitForSelector("#sheet");
  ok(await page.evaluate(() => !TTS.playing), "tapping a word while it reads pauses it and opens the popup");
  await page.keyboard.press("Escape");
  // 🔒
  await page.click("#ttsplay"); await page.click("#ttslock"); await page.waitForSelector("#ttslk");
  await shot(page, "tts-lock.png");
  const p1 = await page.evaluate(() => TTS.playing);
  await page.mouse.click(195, 400); await page.mouse.click(195, 790);
  ok(p1 && await page.evaluate(() => TTS.playing && !$("#sheet")), "🔒: taps on the text and the bar do nothing");
  const ub = await page.locator("#ttsunl").boundingBox();
  await page.mouse.move(ub.x + ub.width / 2, ub.y + ub.height / 2); await page.mouse.down(); await page.waitForTimeout(400); await page.mouse.up();
  ok(!!(await page.$("#ttslk")), "a short press doesn't unlock");
  await page.mouse.down(); await page.waitForTimeout(1400); await page.mouse.up();
  ok(!(await page.$("#ttslk")), "holding 🔒 for a moment unlocks");
  // 目录 jump: the voice goes there
  await page.evaluate(() => bkJump(BK.meta.chapters[3].p, null));
  t =await page.evaluate(() => [TTS.p, BK.meta.chapters[3].p, BK.pos]);
  ok(t[0] >= t[1] && t[0] <= t[1] + 1 && t[2] === t[0], "a 目录 jump takes the voice to that chapter (its heading first): " + JSON.stringify(t));
  // not following: scrolled far away, the page stays put
  await page.evaluate(() => { TTS.s = 0; ttsSpeak(); });
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(100);
  const y0 = await page.evaluate(() => scrollY);
  await page.click("#ttsnext"); await page.waitForTimeout(200);
  ok(await page.evaluate(y0 => Math.abs(scrollY - y0) < 5, y0), "scrolled away from the voice: the page doesn't jump back");
  await page.evaluate(() => { const e = $(".bk .ts.on"); e.scrollIntoView({ block: "center" }); }); await page.waitForTimeout(100);
  for (let i = 0; i < 18; i++) await page.click("#ttsnext");
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const r = $(".bk .ts.on").getBoundingClientRect(); return r.top >= bkBarH() && r.bottom <= innerHeight - ttsBarH(); }), "following along: the page scrolls to keep the sentence in view");
  // the phone stops it while away → paused at the same sentence
  t = await page.evaluate(() => [TTS.p, TTS.s]);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); speechSynthesis.__kill(); Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  ok(await page.evaluate(t => !TTS.playing && TTS.p === t[0] && TTS.s === t[1] && $("#ttsplay").getAttribute("aria-label").includes("Play"), t), "the phone stopped it while away: shown as paused at the same sentence");
  // time: 5 min of listening → 听书, not 书
  await page.click("#ttsplay");
  await page.evaluate(() => { CLOCK_OFF += 300e3; ttsPause(); });
  await page.click("#ttsx"); ok(!(await page.$("#ttsbar")), "✕ closes the player");
  let today = await page.evaluate(() => daySplit(S.log[dayKey()]));
  ok(today.lb >= 300 && today.lb < 330 && today.bk < 5, "5 minutes of listening are logged as 听书 (" + today.lb + " s), not book reading (" + today.bk + " s)");
  ok(await page.evaluate(() => { const r = bookRec(BK.id); return !(r.st || []).some(e => e.c > 0); }), "no book-speed sitting from listening");
  // after closing, reading by scrolling counts as usual again
  const before = await page.evaluate(() => BK.pos);
  await page.evaluate(() => { CLOCK_OFF += 30e3; bkSetPos(BK.pos + 1); });
  ok(await page.evaluate(b => BK.pos === b + 1, before), "player closed: scrolling moves the place again");
  // pages mode: the page turns with the voice
  await page.evaluate(() => { setBookPref({ mode: "page" }); render(); }); await page.waitForSelector("#bkpi p");
  await page.evaluate(() => { window.__dur = 100000; }); await page.click("#bktts"); await page.waitForSelector("#ttsbar");
  ok(await page.evaluate(() => { const b = $("#ttsbar").getBoundingClientRect(), pw = $("#bkpw").getBoundingClientRect(); return pw.bottom <= b.top + 1 && b.bottom <= innerHeight + 1; }), "pages: the page is laid out above the player bar");
  await shot(page, "tts-pages.png");
  const pg0 = await page.evaluate(() => [BK.pc, BK.pg]);
  for (let i = 0; i < 40; i++) await page.click("#ttsnext");
  const pg1 = await page.evaluate(() => [BK.pc, BK.pg, (() => { const r = $(".bk .ts.on").getClientRects()[0]; return ttsPageOf(r) === BK.pg; })()]);
  ok((pg1[0] !== pg0[0] || pg1[1] !== pg0[1]) && pg1[2], "pages: the page turns to keep the sentence on screen: " + JSON.stringify([pg0, pg1]));
  // the end of the book
  await page.evaluate(() => { window.__dur = 10; TTS.p = BK.paras.length - 1; TTS.s = 3; ttsSpeak(); });
  await page.waitForFunction(() => !TTS.playing, null, { timeout: 5000 });
  ok(await page.evaluate(() => TTS.p === BK.paras.length - 1 && /最后/.test(document.body.textContent)), "at the end of the book it stops, saying so");
  // leaving the book stops it
  await page.evaluate(() => bkLeave());
  ok(await page.evaluate(() => TTS === null && window.__wl.held === 0), "leaving the book closes the player");
  // the Time card
  await page.evaluate(() => setView("me")); await page.waitForSelector("#timecard");
  const tc = await page.textContent("#timecard");
  ok(/听书 Listening to books/.test(tc) && /听书 Listening to books 5 min/.test(tc), "the Time card has a 听书 segment (5 min): " + (tc.match(/阅读 Reading[^写]*/) || [""])[0]);
  // no Chinese voice on the device: the Aa menu says how to add one
  await page.evaluate(() => { window.__voices = window.__voices.filter(v => !/^zh/.test(v.lang)); setView("read"); });
  await page.click("[data-bkgo]"); await page.waitForSelector("#bk"); await page.click("#bkaa");
  ok(/没找到中文语音/.test(await page.textContent("#aapop")), "no Chinese voice: Aa says how to add one");
  await page.click("#bkaa");
  const n1 = await page.evaluate(() => window.__said.length);
  await page.click("#bktts"); await page.waitForSelector(".ttsnv", { timeout: 5000 });
  ok(await page.evaluate(n1 => window.__said.length === n1 && !TTS && !$("#ttsbar"), n1) && /Windows/.test(await page.textContent(".ttsnv")) && /Mac/.test(await page.textContent(".ttsnv")), "no Chinese voice: 🔊 doesn't read with another language's voice; it says how to add a Chinese voice (Windows / Mac / iPhone)");
  await page.click("#ttsnvok"); ok(!(await page.$(".ttsnv")), "好 closes the note");
  // a voice list that arrives a moment late is waited for; zh_CN spelling counts
  await page.evaluate(() => { window.__voices = [{ name: "Ting", lang: "zh_CN", voiceURI: "t2", localService: true }]; });
  ok(await page.evaluate(() => ttsVoices().length === 1), "a voice given as zh_CN counts as Chinese");
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL", e); process.exit(1); });
