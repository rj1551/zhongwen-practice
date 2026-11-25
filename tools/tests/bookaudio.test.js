// 书的音频 · book audio made ahead (v101), with a fake Google Text-to-Speech (every synthesize answered with a test MP3:
// three tones with two pauses) and a fake R2 bucket (signatures checked, as in books2.test.js). Covers: the key in
// 进度 (saved with the other keys, so it syncs), the sample, the per-book switch making the place's chapter + the next 3
// (simplified text, the chosen voice, one request per paragraph), the timings (paragraph starts from MP3 frames,
// sentence starts at the pauses), a jump making that chapter first, the month's characters and the stop at the cap
// ("go on this month"), 听书 playing the audio file (🎧, speed, highlight and place following its time, ⏭ seeking,
// lock-screen info), a chapter without audio falling back to the device voice with a note, the next chapter after
// one ends, 听书 time, upload only on a tap (r.au lists it), download on another device, merge of r.au, and deleting
// the book for good taking its audio along.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const fs = require("fs"), path = require("path");
const { sigv4 } = require("./sigv4.js");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const shot = (pg, n) => process.env.TEST_OUT ? pg.screenshot({ path: path.join(process.env.TEST_OUT, n), fullPage: false }) : null;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const MP3 = fs.readFileSync(path.join(__dirname, "fixtures", "tone3.mp3")); // 1.0 s tone · 0.45 s pause · 1.5 s · 0.45 s · 0.8 s
const R2C = { account: "acct123", bucket: "zhongwen-audio", akid: "AKIDTEST", secret: "SECRETTEST" };
const R2S = { objs: new Map(), log: [], badSig: 0 };
const G = { reqs: [], fail: null, tooLong: 0 };
async function routes(ctx) {
  await ctx.route("https://texttospeech.googleapis.com/**", async route => {
    const rq = route.request(), H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
    if (rq.method() === "OPTIONS") return route.fulfill({ status: 204, headers: H });
    const key = rq.headers()["x-goog-api-key"];
    if (key !== "GOOD-KEY") return route.fulfill({ status: 400, headers: H, body: JSON.stringify({ error: { message: "API key not valid. Please pass a valid API key." } }) });
    if (/voices/.test(rq.url())) return route.fulfill({ status: 200, headers: H, body: JSON.stringify({ voices: [{ name: "cmn-CN-Chirp3-HD-Kore" }, { name: "cmn-CN-Chirp3-HD-Puck" }, { name: "cmn-CN-Wavenet-A" }] }) });
    const body = JSON.parse(rq.postData() || "{}"); G.reqs.push(body);
    if (G.fail) return route.fulfill({ status: G.fail, headers: H, body: JSON.stringify({ error: { message: "nope" } }) });
    if (G.tooLong && Array.from(body.input.text).length > G.tooLong) return route.fulfill({ status: 400, headers: H, body: JSON.stringify({ error: { message: 'This request contains sentences that are too long. Consider splitting up long sentences with sentence ending punctuation e.g. periods. Sentence starting with: "⟪他⧸ta" is too long.' } }) });
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ audioContent: MP3.toString("base64") }) });
  });
  await ctx.route(`https://${R2C.account}.r2.cloudflarestorage.com/**`, async route => {
    const rq = route.request(), m = rq.method(), url = rq.url(), u = new URL(url);
    const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "ETag, Content-Length" };
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: H });
    const h = rq.headers(), auth = h["authorization"] || "";
    const signedNames = (auth.match(/SignedHeaders=([^,]+)/) || [])[1] || "";
    const extra = {}; for (const n of signedNames.split(";")) if (!["host", "x-amz-date", "x-amz-content-sha256"].includes(n)) extra[n] = h[n];
    const d = h["x-amz-date"] || "", date = new Date(d.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/, "$1-$2-$3T$4:$5:$6Z"));
    const want = await sigv4({ method: m, url, headers: extra, payloadHash: h["x-amz-content-sha256"], akid: R2C.akid, secret: R2C.secret, date });
    R2S.log.push(m + " " + u.pathname + u.search);
    if (want.authorization !== auth) { R2S.badSig++; return route.fulfill({ status: 403, headers: H, body: "<Error><Code>SignatureDoesNotMatch</Code></Error>" }); }
    const key = decodeURIComponent(u.pathname.replace("/" + R2C.bucket + "/", ""));
    if (m === "PUT") { R2S.objs.set(key, { body: rq.postDataBuffer(), type: h["content-type"] }); return route.fulfill({ status: 200, headers: Object.assign({ etag: '"x"' }, H), body: "" }); }
    if (m === "DELETE") { R2S.objs.delete(key); return route.fulfill({ status: 204, headers: H }); }
    if (m === "GET" && u.searchParams.get("list-type") === "2") {
      const pre = u.searchParams.get("prefix") || "", items = [...R2S.objs.entries()].filter(([k]) => k.startsWith(pre));
      return route.fulfill({ status: 200, headers: Object.assign({ "content-type": "application/xml" }, H), body: `<?xml version="1.0"?><ListBucketResult>${items.map(([k, o]) => `<Contents><Key>${k}</Key><Size>${o.body.length}</Size></Contents>`).join("")}<IsTruncated>false</IsTruncated></ListBucketResult>` });
    }
    if (m === "GET") { const o = R2S.objs.get(key); if (!o) return route.fulfill({ status: 404, headers: H, body: "<Error>NoSuchKey</Error>" }); return route.fulfill({ status: 200, headers: Object.assign({ "content-type": o.type || "", "content-length": String(o.body.length) }, H), body: o.body }); }
    route.fulfill({ status: 400, headers: H, body: "bad" });
  });
}
const STATE = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
const PARA = "他在河边慢慢地走着。可是谁也没有注意到他！天已经快黑了。";
function makeBook() { const L = [], cn = "一二三四五六七八九十"; for (let c = 0; c < 10; c++) { L.push(`第${cn[c]}章　河边`); for (let p = 0; p < 3; p++) L.push("　　" + PARA); } return L.join("\n"); }
let browser;
async function dev(seedBook) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); await routes(ctx);
  await ctx.addInitScript(([st, pv]) => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); localStorage.setItem("zwlgf:prov", pv); } }, [STATE, JSON.stringify({ r2: R2C })]);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  return page;
}
(async () => {
  browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await dev();
  // ---- the key and the sample (进度) ----
  await page.evaluate(() => setView("me")); await page.waitForSelector("#gttscard");
  ok(/怎么拿钥匙/.test(await page.textContent("#gttscard")) && /Cloud Text-to-Speech API/.test(await page.textContent("#gttscard")), "进度 has a 书的音频 card with the steps to get a key");
  await page.fill("#gtkey", "BAD-KEY"); await page.dispatchEvent("#gtkey", "change");
  await page.click("#gtsample"); await page.waitForFunction(() => /不接受/.test(document.querySelector("#gttscard").textContent));
  ok(true, "a wrong key: the sample says Google didn't accept it");
  await page.fill("#gtkey", "GOOD-KEY"); await page.dispatchEvent("#gtkey", "change");
  ok(await page.evaluate(() => provGet().keys.gtts === "GOOD-KEY" && keysOf(provGet()).keys.gtts === "GOOD-KEY"), "the key is saved with the other keys (so it syncs in settings/keys.json)");
  await page.click("#gtlist"); await page.waitForFunction(() => !GTTS_UI.busy && !!GTTS_UI.voices);
  ok(await page.evaluate(() => [...document.querySelectorAll("#gtvoice option")].map(o => o.textContent).join() === "Aoede,Kore,Puck"), "全部声音 loads Google's Chirp 3 HD Mandarin voices only (the current one kept)");
  await page.selectOption("#gtvoice", "cmn-CN-Chirp3-HD-Kore");
  G.reqs = []; await page.click("#gtsample"); await page.waitForSelector("#gtaud");
  await page.evaluate(() => $("#gttscard").scrollIntoView()); await shot(page, "aud-key.png");
  ok(G.reqs.length === 1 && G.reqs[0].voice.name === "cmn-CN-Chirp3-HD-Kore" && G.reqs[0].voice.languageCode === "cmn-CN" && G.reqs[0].audioConfig.audioEncoding === "MP3", "试听: one request with the chosen voice, Mandarin, MP3; a player shows the sample");
  // ---- a book, the switch: the place's chapter + the next 3 ----
  await page.evaluate(() => setView("read")); await page.waitForSelector("#bkadd");
  await page.setInputFiles("#bkfile", { name: "河边.txt", mimeType: "text/plain", buffer: Buffer.from(makeBook(), "utf8") });
  await page.waitForSelector("[data-bkinfo]"); await page.click("[data-bkinfo]"); await page.waitForSelector("#audcard");
  ok(/这台设备有 0 \/ 10 章/.test(await page.textContent("#audcard")), "the book's ⋯ screen has a 书的音频 card: 0 of 10 chapters");
  G.reqs = []; await page.click("#audon");
  await page.waitForFunction(() => !AUDR.busy && (AUDL.get(READ.book) || []).length === 4, null, { timeout: 30000 });
  const made = await page.evaluate(() => AUDL.get(READ.book).map(h => [h.a, h.b]).sort((x, y) => x[0] - y[0]));
  ok(JSON.stringify(made) === "[[0,4],[4,8],[8,12],[12,16]]", "switched on at the start: chapters 1–4 made (the place's + the next 3), then it stops: " + JSON.stringify(made));
  ok(G.reqs.length === 16 && G.reqs.every(r => r.voice.name === "cmn-CN-Chirp3-HD-Kore") && G.reqs.some(r => r.input.text === PARA.trim()) && G.reqs.some(r => /^第一章/.test(r.input.text)), "one request per paragraph (headings too), the simplified text, the chosen voice (" + G.reqs.length + " requests)");
  const rec = await page.evaluate(async () => { const h = AUDL.get(READ.book).find(x => x.a === 4); const c = await adbGet("ch", h.k); return { ps: c.ps, ss: c.ss, d: c.d, z: c.z, type: c.blob.type }; });
  const one = rec.d / 4;
  ok(Math.abs(one - 4.25) < 0.1 && rec.ps.length === 4 && Math.abs(rec.ps[2][1] - 2 * one) < 0.01, `a chapter = its paragraphs' audio joined; paragraph starts from the MP3 frames (${rec.ps.map(x => x[1]).join(", ")} s)`);
  const p1 = rec.ss.filter(x => x[1] === 5).map(x => +(x[0] - rec.ps[1][1]).toFixed(2));
  ok(p1.length === 3 && Math.abs(p1[1] - 1.37) < 0.2 && Math.abs(p1[2] - 3.32) < 0.2, "sentence starts are found at the pauses in the audio (" + p1.join(", ") + " s; pauses end at 1.45 and 3.40)");
  ok(rec.type === "audio/mpeg" && await page.evaluate(() => audUse().n) > 300, "kept as audio/mpeg; this month's characters counted (" + await page.evaluate(() => audUse().n) + ")");
  ok(/这台设备有 4 \/ 10 章/.test(await page.textContent("#audcard")), "the card shows 4 of 10 chapters");
  await page.evaluate(() => $("#audcard").scrollIntoView()); await shot(page, "aud-card.png");
  // ---- long paragraphs go in pieces (v104: Chirp refuses requests over a few hundred bytes) ----
  const LONG = "他在河边慢慢地走着，风很大，天也很冷，可是他一点也不想回家，因为家里没有人等他。".repeat(4) + "最后他还是回去了。";
  const pc = await page.evaluate(t => audPieces(t).map(([a, b]) => Array.from(t).slice(a, b).join("")), LONG);
  ok(pc.length >= 2 && pc.every(x => Array.from(x).length <= 120) && pc.slice(0, -1).every(x => /[。，]$/.test(x)) && pc.join("") === LONG, "a long paragraph is sent in pieces of ≤ 120 characters, cut at sentence ends / commas (" + pc.map(x => Array.from(x).length).join(" + ") + ")");
  G.reqs = []; G.tooLong = 50;
  const said = await page.evaluate(async t => { const r = await audSayPara(t, audVoice()); return { st: r.st, n: sentCuts(t).length, d: mp3Info(r.buf).dur }; }, LONG);
  ok(G.reqs.every(r => Array.from(r.input.text).length <= 120) && G.reqs.filter((r, i) => Array.from(r.input.text).length <= 50).length >= 4, "a piece Google still calls too long is cut again and sent in smaller pieces (" + G.reqs.map(r => Array.from(r.input.text).length).join(",") + ")");
  ok(said.st.length === said.n && said.st.every((x, i) => i === 0 || x > said.st[i - 1]) && said.d > 4.25 * 2, "…and the pieces are joined, each sentence with its start (" + said.st.join(", ") + ")");
  G.tooLong = 0;
  // ---- a jump: that chapter first ----
  await page.click("#bkib"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  G.reqs = [];
  await page.evaluate(() => bkJump(BK.meta.chapters[7].p, null));
  await page.waitForFunction(() => !AUDR.busy && (AUDL.get(BK.id) || []).length === 7, null, { timeout: 30000 });
  ok(/^第八章/.test(G.reqs[0].input.text) && JSON.stringify(await page.evaluate(() => AUDL.get(BK.id).map(h => h.a).sort((x, y) => x - y))) === "[0,4,8,12,28,32,36]", "a jump to chapter 8: its audio is made first, then the ones after (8–10)");
  // ---- the cap ----
  await page.evaluate(() => { audUseSet({ m: dayKey().slice(0, 7), n: 899999, more: false }); BK.meta.awhole = true; });
  G.reqs = []; await page.evaluate(() => audKick());
  await page.waitForFunction(() => !AUDR.busy, null, { timeout: 10000 });
  ok(G.reqs.length === 0 && await page.evaluate(() => AUDR.err && AUDR.err.code === "cap"), "at 900,000 characters this month it stops before sending more");
  await page.evaluate(() => { READ = { book: BK.id, sub: "info" }; render(); }); await page.waitForSelector("#audmore");
  await page.click("#audmore");
  await page.waitForFunction(() => !AUDR.busy && (AUDL.get(READ.book) || []).length === 10, null, { timeout: 30000 });
  ok(true, "这个月继续 lets it go on (the whole book is now made: 10 chapters)");
  await page.evaluate(() => { BK.meta.awhole = false; });
  // ---- 听书 with the audio files ----
  await page.click("#bkib"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  await page.evaluate(async () => { bkJump(BK.meta.chapters[1].p + 1, null); render(); await audPreload(BK.id, BK.pos); });
  await page.waitForFunction(() => TAEL_REC && TAEL_REC.a === 4, null, { timeout: 5000 });
  await page.evaluate(() => setTtsPref({ rate: 1.2 }));
  await page.click("#bktts"); await page.waitForSelector("#ttsbar");
  await page.waitForFunction(() => TTS && TTS.mode === "file" && TAEL && !TAEL.paused && TAEL.currentTime > 0, null, { timeout: 5000 });
  ok(await page.evaluate(() => /🎧/.test($("#ttssrc").textContent) && Math.abs(TAEL.playbackRate - 1.2) < 0.01 && Math.abs(audStartOf(TAEL_REC, TTS.p, 0) - TAEL_REC.ps[1][1]) < 0.01), "🔊 plays the chapter's audio file (🎧 on the bar), at the chosen speed, from the place");
  await shot(page, "aud-bar.png");
  ok(await page.evaluate(() => navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.artist === BK.meta.title), "lock-screen info: the chapter and the book");
  await page.evaluate(() => { TAEL.currentTime = TAEL_REC.ps[2][1] + 1.6; TAEL.dispatchEvent(new Event("timeupdate")); });
  ok(await page.evaluate(() => TTS.p === TAEL_REC.ps[2][0] && TTS.s === 1 && $(".bk .ts.on") && $(".bk .ts.on").dataset.s === TTS.p + ":1" && BK.pos === TTS.p), "the highlight and the place follow the audio's time (2nd sentence of the next paragraph)");
  await page.click("#ttsnext");
  ok(await page.evaluate(() => TTS.s === 2 && Math.abs(TAEL.currentTime - audStartOf(TAEL_REC, TTS.p, 2)) < 0.3), "⏭ jumps the audio to the next sentence");
  await page.click("#ttsrate"); await page.evaluate(() => $("#ttsr").scrollTo({ left: 3 * TTS_TICK })); await page.waitForFunction(() => ttsPref().rate === 0.8, null, { timeout: 3000 });
  ok(await page.evaluate(() => Math.abs(TAEL.playbackRate - 0.8) < 0.01 && !TAEL.paused), "changing the speed changes the audio's speed without restarting it"); await page.click("#ttsrok");
  // the chapter ends → the next chapter's audio
  await page.evaluate(() => ttsFileEnded());
  await page.waitForFunction(() => TAEL_REC && TAEL_REC.a === 8 && !TAEL.paused, null, { timeout: 5000 });
  ok(await page.evaluate(() => TTS.p >= 8 && TTS.mode === "file"), "when a chapter's audio ends, the next chapter's plays");
  // time: listening to the file counts as 听书
  await page.evaluate(() => { CLOCK_OFF += 120e3; ttsPause(); });
  ok(await page.evaluate(() => TAEL.paused && TTS.pend >= 120), "pause stops the audio; the time counts as 听书");
  // a chapter without audio → the device voice, with a note
  await page.evaluate(async () => { const h = AUDL.get(BK.id).find(x => x.a === 12); await adbDel("ch", h.k); AUDL.delete(BK.id); await audList(BK.id); BK.meta.aon = false; });
  await page.evaluate(() => { TTS.p = 12; TTS.s = 0; BK.meta.aon = true; AUDR.stop = true; });
  await page.evaluate(() => { const o = ONLINE; ONLINE = false; ttsPlay(); ONLINE = o; });
  ok(await page.evaluate(() => TTS.mode === "voice" && /📱/.test($("#ttssrc").textContent) && TAEL.paused) && /这一章的音频还在准备/.test(await page.textContent("body")), "a chapter whose audio isn't made yet: the device voice reads it (📱) and a note says so");
  await page.evaluate(() => { ttsStop(); BK.meta.aon = false; AUDR.stop = true; });
  // ---- the cloud: only on a tap ----
  ok(![...R2S.objs.keys()].some(k => /audio\//.test(k)), "nothing is uploaded by itself");
  await page.evaluate(() => { READ = { book: BK.id, sub: "info" }; render(); }); await page.waitForSelector("#audup");
  ok(/上传 9 章/.test(await page.textContent("#audcard")), "the card offers ☁ 上传 9 章 (the chapters on this device)");
  await page.click("#audup"); await page.waitForFunction(() => !AUDR.up && (bookRec(READ.book).au || []).length === 9, null, { timeout: 20000 });
  const keys = [...R2S.objs.keys()].filter(k => /audio\//.test(k));
  ok(keys.length === 18 && keys.every(k => /^books\/[^/]+\/audio\/\d+-\d+-Kore\.(mp3|json)$/.test(k)) && R2S.badSig === 0, "upload: each chapter's audio + timings under books/<id>/audio/ (" + keys.length + " files)");
  const r = await page.evaluate(() => JSON.parse(JSON.stringify(bookRec(READ.book))));
  // ---- another device: download ----
  const p2 = await dev();
  // simpler: give device 2 the record and the text under the same id
  await p2.evaluate(async ([r, txt]) => {
    const old = (S.gen.books || [])[0]; const f = new File([txt], "河边2.txt", { type: "text/plain" });
    if (!BOOKS || !BOOKS.length) await bookImport(f);
    const m = BOOKS.find(b => b.id !== r.id) || BOOKS[0], tx = await bookTextGet(m.id);
    await bdbDo(["m", "t"], "readwrite", t => { t.objectStore("m").delete(m.id); t.objectStore("t").delete(m.id); m.id = r.id; t.objectStore("m").put(m, m.id); t.objectStore("t").put(Object.assign({}, tx, { id: r.id }), r.id); });
    BOOKS = null; await booksLoad(); S.gen.books = [r]; save();
  }, [r, makeBook()]);
  await p2.evaluate(id => { READ = { book: id, sub: "info" }; setView("read"); }, r.id);   await p2.waitForSelector("#auddown");
  ok(/下载 9 章/.test(await p2.textContent("#audcard")), "the other device's card offers ⬇ 下载 9 章 (from the synced list)");
  await p2.click("#auddown"); await p2.waitForFunction(id => !AUDR.down && (AUDL.get(id) || []).length === 9, r.id, { timeout: 20000 });
  ok(await p2.evaluate(async id => { const h = AUDL.get(id).find(x => x.a === 4); const c = await adbGet("ch", h.k); return c && c.blob.size > 1000 && c.ss.length === 10; }, r.id), "download: the chapters' audio and timings arrive on the other device");
  ok(await p2.evaluate(au => { const a = { id: "b", u: 1, au: au.slice(0, 3) }, b = { id: "b", u: 2, au: au.slice(2) }; return mergeGenItem(a, b).au.length === au.length; }, r.au), "merging two devices' records unites their cloud audio lists");
  // ---- deleting the book for good takes its audio along ----
  await page.evaluate(id => { const e = trashBook(bookRec(id)); purgeTrash(e); }, r.id);
  await page.waitForFunction(() => !(S.r2del || []).length && !R2.busy, null, { timeout: 20000 }).catch(() => {});
  ok(![...R2S.objs.keys()].some(k => /audio\//.test(k)), "deleted for good: its audio goes from the cloud too");
  ok(await page.evaluate(async id => (await adbKeys("ch", id + "|")).length === 0, r.id), "…and from this device");
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL", e); process.exit(1); });
