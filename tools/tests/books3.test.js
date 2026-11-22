// Books, release 3 (v88): reading stats. First-time forward reading at a reading pace counts for 读书速度 and the
// Time card; skimming, long stops, jumps and re-reading don't count for speed; lookups per 1,000 new characters;
// read ranges + sittings in the synced record, united on merge; shown in 进度 and on the book's ⋯ screen (not while
// reading); the Time card's 书 segment. Also: chapters of a book added before v88 are found again on opening
// (numbered "1. 标题" lines). The app's clock is moved with CLOCK_OFF instead of waiting.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const STATE = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
function makeBook() { // 10 chapters × 20 paragraphs of 100 characters
  const lines = []; const cn = "一二三四五六七八九十";
  for (let c = 0; c < 10; c++) { lines.push(`第${cn[c]}章　小镇`); for (let p = 0; p < 20; p++) lines.push("　　" + "他在河边慢慢地走着，可是谁也没有注意到。".repeat(5)); }
  return lines.join("\n");
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(st => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); } }, STATE);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(() => setView("read")); await page.waitForSelector("#bkadd");
  await page.setInputFiles("#bkfile", { name: "小镇.txt", mimeType: "text/plain", buffer: Buffer.from(makeBook(), "utf8") });
  await page.waitForSelector("[data-bkgo]"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  const per = await page.evaluate(() => BK.offs[2] - BK.offs[1]);
  ok(per === 100, "test book: 100 characters a paragraph");
  // reading: move the place forward, the app's clock moving with it (CLOCK_OFF)
  const step = (p, sec, jump) => page.evaluate(([p, sec, jump]) => { CLOCK_OFF += sec * 1000; bkSetPos(p, jump); }, [p, sec, jump]);
  await page.evaluate(() => { BK.lastAt = { p: 1, t: now() }; BK.pos = 1; });
  for (let p = 2; p <= 21; p++) await step(p, 30); // 20 paragraphs, 100 characters each, 30 s each = 200 chars/min
  let st = await page.evaluate(() => ({ s: BK.sit.s, c: BK.sit.c, rd: JSON.stringify(BK.rd), pend: BK.pend }));
  ok(st.c === 2000 && Math.abs(st.s - 600) < 1 && st.rd === "[[1,21]]" && Math.abs(st.pend - 600) < 1, "reading forward at a reading pace: 2,000 new characters in 10 min, paragraphs 1–20 read: " + JSON.stringify(st));
  // skimming: 50 paragraphs in 2 s → not read, not counted
  await step(71, 2);
  st = await page.evaluate(() => ({ s: BK.sit.s, c: BK.sit.c, rd: JSON.stringify(BK.rd) }));
  ok(st.c === 2000 && st.rd === "[[1,21]]", "flicking past 50 paragraphs in 2 s is skimming: not read, not counted");
  // a long stop: 3 paragraphs in 40 min → read, but the time isn't counted
  await step(74, 2400);
  st = await page.evaluate(() => ({ s: BK.sit.s, c: BK.sit.c, rd: JSON.stringify(BK.rd), pend: BK.pend }));
  ok(Math.abs(st.s - 600) < 1 && st.c === 2000 && st.rd === "[[1,21],[71,74]]" && Math.abs(st.pend - 600) < 1, "3 paragraphs over 40 min (put down): read, but the time doesn't count: " + JSON.stringify(st));
  // a jump (目录) and back: nothing counted
  await page.evaluate(() => { CLOCK_OFF += 5000; bkSetPos(5, true); });
  ok(await page.evaluate(() => BK.sit.c === 2000), "a jump doesn't count as reading");
  // re-reading 5 → 15 (already read): time for the Time card, not for speed
  for (let p = 6; p <= 15; p++) await step(p, 20);
  st = await page.evaluate(() => ({ s: BK.sit.s, c: BK.sit.c, pend: BK.pend }));
  ok(Math.abs(st.s - 600) < 1 && st.c === 2000 && Math.abs(st.pend - 800) < 1, "re-reading text already read: counted as time spent, not for speed: " + JSON.stringify(st));
  // lookups: two different words tapped, one twice
  await page.evaluate(() => bkSetPos(15, true)); await page.evaluate(() => render()); await page.waitForSelector("#bkc .tk");
  await page.waitForFunction(() => !!CED, null, { timeout: 30000 }); await page.evaluate(() => render());
  const words = await page.evaluate(() => [...new Set($$("#bkc .tk").map(t => t.textContent))].slice(0, 2));
  for (const w of [words[0], words[1], words[0]]) { await page.locator("#bkc .tk", { hasText: new RegExp("^" + w + "$") }).first().click(); await page.keyboard.press("Escape"); }
  ok(await page.evaluate(() => BK.sit.k.size === 2), "lookups: distinct words tapped (" + words.join(", ") + ", one of them twice) = 2");
  ok(await page.evaluate(() => !(bookRec(BK.id).st || []).length), "nothing written to progress while reading on (only every 2 min, on leaving, or when the app is put away)");
  // leave: the sitting, the ranges and the day's book time go into progress
  await page.evaluate(() => bkLeave()); await page.waitForSelector(".bkrow");
  const rec = await page.evaluate(() => S.gen.books[0]);
  const today = await page.evaluate(() => daySplit(S.log[dayKey()]));
  ok(rec.st.length === 1 && rec.st[0].c === 2000 && rec.st[0].s === 600 && rec.st[0].k === 2 && JSON.stringify(rec.rd) === "[[1,21],[71,74]]", "leaving the book writes the sitting (10 min, 2,000 new characters, 2 lookups) and the read ranges into the synced record: " + JSON.stringify({ st: rec.st, rd: rec.rd }));
  ok(Math.abs(today.bk - 800) <= 2 && today.due === 0 && today.extra === 0, "the day's log has 书 book time (" + today.bk + " s), not card time");
  ok(await page.evaluate(() => { const r = bookStats(S.gen.books[0]); return r.cpm === 200 && r.look === 1; }), "book speed 200 字/分, lookups 1 per 1,000 characters");
  // shown: ⋯ screen and 进度, not while reading
  await page.click("[data-bkinfo]"); await page.waitForSelector("#bkrm");
  const info = await page.textContent("#main");
  ok(/读书速度 Book speed 200 字\/分/.test(info) && /查词 Lookups 1 \/ 千字/.test(info) && /2,000 新字/.test(info), "the book's ⋯ screen shows its speed, lookups and reading: " + (info.match(/读书速度[^删]*/) || [""])[0].slice(0, 120));
  await page.click("#bkib"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  ok(!/读书速度|字\/分/.test(await page.textContent("#main")), "nothing about speed while reading");
  await page.evaluate(() => bkLeave());
  await page.evaluate(() => setView("me")); await page.waitForSelector("#bookstats");
  const card = await page.textContent("#bookstats");
  ok(/读书 · Books/.test(card) && /小镇/.test(card) && /200 字\/分/.test(card), "进度 has a 读书 · Books card with the book's speed");
  const tc = await page.textContent("#timecard");
  ok(/书 Books/.test(tc) && /书 Books 13 min/.test(tc), "the Time card has a 书 Books segment (13 min): " + (tc.match(/阅读 Reading[^写]*/) || [""])[0]);
  // the app put away: time while hidden isn't counted, and what was read is written
  await page.evaluate(() => setView("read")); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  await page.evaluate(() => bkSetPos(30, true)); // unread text
  const p0 = await page.evaluate(() => BK.pos);
  for (let p = p0 + 1; p <= p0 + 5; p++) await step(p, 30);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); CLOCK_OFF += 3600e3; Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  const hid = await page.evaluate(() => ({ st: S.gen.books[0].st.length, last: S.gen.books[0].st.slice(-1)[0] }));
  ok(hid.st === 2 && hid.last.s === 150, "putting the app away writes the sitting so far (" + JSON.stringify(hid.last) + ")");
  await step(p0 + 6, 30);
  ok(await page.evaluate(() => Math.abs(BK.sit.s - 180) < 1), "an hour away isn't counted: the clock starts again on return");
  await page.evaluate(() => bkLeave());
  // merge: reading on two devices adds up
  const mg = await page.evaluate(() => {
    const r = S.gen.books[0], a = JSON.parse(JSON.stringify(S)), b = JSON.parse(JSON.stringify(S));
    const rb = b.gen.books[0]; rb.rd = rgAdd(rb.rd, 100, 120); rb.st = rb.st.concat([{ t: now() + 5, s: 300, c: 1000, k: 4 }]); rb.u = (rb.u || 0) + 10;
    const ra = a.gen.books[0]; ra.rd = rgAdd(ra.rd, 150, 160); ra.st = ra.st.concat([{ t: now() + 9, s: 60, c: 200, k: 0 }]);
    const m = mergeStates(a, b).gen.books[0];
    return { rd: JSON.stringify(m.rd), n: m.st.length };
  });
  ok(/\[100,120\]/.test(mg.rd) && /\[150,160\]/.test(mg.rd) && /\[1,21\]/.test(mg.rd), "read ranges from both devices are united: " + mg.rd);
  ok(mg.n === 4, "sittings from both devices are kept (2 + one more on each) (" + mg.n + ")");
  ok(await page.evaluate(() => JSON.stringify(rgAdd([[1, 5], [8, 10]], 4, 9)) === "[[1,10]]" && JSON.stringify(rgAdd([[1, 5]], 7, 9)) === "[[1,5],[7,9]]" && rgFresh([[1, 5]], 0, 10, Array.from({ length: 12 }, (_, i) => i * 10)) === 60), "range helpers: overlapping ranges join; new characters exclude what was read");

  // ---- a book added before v88: its chapters are found again when it's opened ----
  await page.evaluate(async () => {
    const body = "他在河边慢慢地走着，可是谁也没有注意到。".repeat(20), paras = ["三体", "1. 疯狂年代", body, body, "2．寂静的春天", body, body, "3. 红岸之一", body, body];
    const meta = { id: "bkold", title: "三体", file: "三体.txt", added: now(), bytes: 1, chars: paras.join("").length, n: paras.length, chapters: [{ t: "第 1 部分", p: 0 }], trad: false, orig: false, pos: { p: 0, t: 0 }, lastT: 0 };
    await bdbDo(["m", "t"], "readwrite", t => { t.objectStore("t").put({ id: "bkold", paras, simp: null }, "bkold"); t.objectStore("m").put(meta, "bkold"); });
    BOOKS = null; await bookReconcile(); setView("read");
  });
  await page.click('[data-bkgo="bkold"]'); await page.waitForSelector("#bkc p");
  const ch = await page.evaluate(async () => { const m = (await bdbDo("m", "readonly", (t, set) => { const r = t.objectStore("m").get("bkold"); r.onsuccess = () => set(r.result); })); return { t: BK.meta.chapters.map(c => c.t), cv: m.cv, h: $$("#bkc p.bkh").length, nch: bookRec("bkold").nch }; });
  ok(JSON.stringify(ch.t) === JSON.stringify(["开头 · Beginning", "1. 疯狂年代", "2．寂静的春天", "3. 红岸之一"]) && ch.cv === 2 && ch.h === 3 && ch.nch === 4, "a book added before v88 gets its 1. / 2． chapters on opening (saved): " + JSON.stringify(ch));
  const err = await page.evaluate(() => localStorage.getItem("zwlgf:errlog"));
  ok(!err || err === "[]", "nothing in the error log: " + err);
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
