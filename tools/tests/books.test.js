// Books, first release (v86): .txt import (UTF-8, GB18030), chapters / parts, traditional shown as simplified with
// 原文, the shelf, scrolling and page reading with a bookmark that survives reopening, word popup + saving, 目录 jumps
// with ↩ back, search (button and Ctrl+F; simplified and traditional queries), Aa size / layout, rename, delete via the bin (v87).
// Serve docs/ on 8765 first (see README), or use run-all.sh.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const fs = require("fs"), path = require("path");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
const OUT = process.env.TEST_OUT || "/tmp";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
// a made-up simplified book: 12 chapters of ~2,600 characters; 灯塔 appears in chapters 3 and 9 only
function makeBook() {
  let seed = 3; const rnd = n => { seed = (seed * 16807) % 2147483647; return seed % n; };
  const S = ["老王", "他们", "邻居家的孩子", "这位医生", "我的朋友", "那个司机", "学校的门卫"];
  const V = ["在河边慢慢地走着", "把旧书搬进了仓库", "一直说自己不累", "听见远处传来的钟声", "决定明天早上再出发", "对着窗外发了一会儿呆", "给家里打了一个电话"];
  const T = ["。", "，可是谁也没有注意到。", "，好像什么都没发生过。", "，然后转身回家了。"];
  const lines = ["书名：河边的小镇", "作者：某某", ""];
  const cn = "一二三四五六七八九十";
  for (let c = 1; c <= 12; c++) {
    lines.push("", c <= 10 ? `第${cn[c - 1]}章　平常的一天` : `第十${cn[c - 11]}章　平常的一天`, "");
    for (let p = 0; p < 14; p++) {
      let s = ""; for (let k = 0; k < 8; k++) s += S[rnd(S.length)] + V[rnd(V.length)] + T[rnd(T.length)];
      if ((c === 3 || c === 9) && p === 7) s += "海边的灯塔整夜都亮着。";
      lines.push("　　" + s);
    }
  }
  lines.push("　　" + "很长的一段".repeat(10) + Array(40).fill("他走了很久才停下来。").join("")); // one long line → split at sentence ends
  return lines.join("\n");
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true });
  const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const book = makeBook();

  // ---- parsing ----
  const pr = await page.evaluate(t => { const r = bookParse(t); return { n: r.paras.length, ch: r.chapters.map(c => c.t), h: r.chapters.every(c => c.h || c.p === 0), long: Math.max(...r.paras.map(x => Array.from(x).length)), last: r.paras.slice(-3).map(x => x.slice(-3)) }; }, book);
  ok(pr.ch.length === 13 && pr.ch[0] === "开头 · Beginning" && pr.ch[1] === "第一章　平常的一天" && pr.ch[12] === "第十二章　平常的一天", "chapters found from 第…章 lines (+ the opening lines as 开头): " + pr.ch.length);
  ok(pr.long <= 900, "a very long line is split into pieces (longest " + pr.long + " characters)");
  const parts = await page.evaluate(() => { const r = bookParse(Array(30).fill("　　" + "他走了很久才停下来。".repeat(40)).join("\n")); return r.chapters.map(c => c.t + "@" + c.p).join(" "); });
  ok(/^第 1 部分@0 第 2 部分@\d+ 第 3 部分/.test(parts), "no headings → numbered parts of ~5,000 characters: " + parts);
  ok(await page.evaluate(() => bookDecode(new TextEncoder().encode("﻿你好").buffer) === "你好"), "UTF-8 (with a BOM) decodes");
  // numbered chapter lines (v88; the learner's 三体 file): "1. 疯狂年代", "2．寂静的春天" (full-width dot)
  const num = await page.evaluate(() => {
    const body = "他在河边慢慢地走着，可是谁也没有注意到。".repeat(30);
    const t = ["三体", "作者：某某", "1. 疯狂年代", body, "抹了口红，也穿上了高跟鞋。", "2．寂静的春天", "两年以后，大兴安岭。" + body, "3. 红岸之一", body, "４．科学边界", body].join("\n");
    const list = ["开头的一段。" + body, "他列了三件事：", "1．买菜", "2．做饭", "3．洗碗", body, "1. 只有一个编号的标题", body].join("\n");
    return { a: bookParse(t).chapters.map(c => c.t), b: bookParse(list).chapters.map(c => c.t) };
  });
  ok(JSON.stringify(num.a) === JSON.stringify(["开头 · Beginning", "1. 疯狂年代", "2．寂静的春天", "3. 红岸之一", "４．科学边界"]), "numbered chapter lines (1. / 2． / full-width digits) are found when they run 1, 2, 3…: " + num.a.join(" | "));
  ok(num.b.every(t => /部分/.test(t)), "a short numbered list inside the text isn't taken for chapters: " + num.b.join(" | "));
  // forgiving numbered lines (v89): a bare "4．", end punctuation on a short title, a non-breaking space, a skipped
  // number, a named heading line just before a numbered one, a list "1. 2. 3." inside a chapter
  const fz = await page.evaluate(() => {
    const body = "他在河边慢慢地走着，可是谁也没有注意到。".repeat(30), L = ["书名"];
    for (let i = 1; i <= 3; i++) L.push(i + "．标题" + i, body);
    L.push("4．", "后来的事情。" + body);            // bare number
    L.push("5．后来。", body);                        // short title ending in 。
    L.push("6. 标题六", body);                    // non-breaking space
    L.push("七．看不清的标题", body);                  // garbled number (skipped)
    L.push("前言", "【一份文件】短短几行。", "8. 标题八", body); // named heading just before
    L.push("9．标题九", "他列了三件事：", "1．买菜", "2．做饭", "3．洗碗", body); // a list inside chapter 9
    L.push("10．标题十", body);
    return bookChapters(L).map(c => c.t);
  });
  ok(["4．", "5．后来。", "6. 标题六", "8. 标题八", "9．标题九", "10．标题十"].every(t => fz.includes(t)), "forgiving numbered chapters: bare number, short title with 。, odd space, after a skipped number and after a heading-like line: " + fz.join(" | "));
  ok(!fz.some(t => /买菜|做饭|洗碗/.test(t)), "a numbered list inside a chapter still isn't taken for chapters");
  // runs never overlap (v92): a long numbered list inside a chapter (each item ≥ 300 characters, like a report quoted in
  // the text) is dropped; a book in two parts that each start again at 1 keeps both
  const ov = await page.evaluate(() => {
    const body = "他在河边慢慢地走着，可是谁也没有注意到。".repeat(30), L = ["书名"];
    for (let i = 1; i <= 13; i++) L.push(i + ". 标题" + i, body);
    for (const x of ["1、第一项", "1、第一项的下面", "2、第二项", "3、第三项", "3、另一份的第三项", "4、第四项"]) L.push(x, body);
    L.push("14. 标题14", body, "15. 标题15", body);
    const P = ["书名"];
    for (let i = 1; i <= 5; i++) P.push(i + "．上部" + i, body);
    for (let i = 1; i <= 4; i++) P.push(i + "．下部" + i, body);
    return { a: bookChapters(L).map(c => c.t), b: bookChapters(P).map(c => c.t) };
  });
  ok(!ov.a.some(t => /项/.test(t)) && ov.a.includes("13. 标题13") && ov.a.includes("14. 标题14") && ov.a.includes("15. 标题15"), "a long numbered list inside a chapter isn't taken for chapters; the chapters around it are: " + ov.a.slice(-4).join(" | "));
  ok(ov.b.filter(t => /上部/.test(t)).length === 5 && ov.b.filter(t => /下部/.test(t)).length === 4, "a book in two parts, each starting again at 1, keeps both: " + ov.b.slice(1).join(" | "));

  // ---- the shelf and adding ----
  await page.click('#tabs button[data-tab="read"]'); await page.waitForSelector("#bkadd");
  ok(/添加书/.test(await page.textContent("#bkadd")) && /书架/.test(await page.textContent("#main")), "阅读 has a 书架 · Books shelf with + 添加书");
  await page.setInputFiles("#bkfile", { name: "河边的小镇.txt", mimeType: "text/plain", buffer: Buffer.from(book, "utf8") });
  await page.waitForSelector("[data-bkgo]");
  ok(await page.evaluate(() => $$(".toast").some(t => /已添加《河边的小镇》· 28 千字 · 13 章/.test(t.textContent))), "a toast says what was added: title, size, chapters");
  const row = await page.textContent(".bkrow");
  ok(/河边的小镇/.test(row) && /开始 Start/.test(row) && /还没开始/.test(row), "the book is on the shelf: title from the file name, 开始 Start");
  await page.setInputFiles("#bkfile", { name: "河边的小镇.txt", mimeType: "text/plain", buffer: Buffer.from(book, "utf8") });
  await page.waitForFunction(() => [...document.querySelectorAll(".toast")].some(t => /已经在书架上/.test(t.textContent)));
  ok(await page.locator(".bkrow").count() === 1, "the same file again is refused (already on the shelf)");
  await page.setInputFiles("#bkfile", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("This is an English file.\nNothing Chinese in it at all.\n".repeat(50)) });
  await page.waitForFunction(() => [...document.querySelectorAll(".toast")].some(t => /不是中文/.test(t.textContent)));
  ok(await page.locator(".bkrow").count() === 1, "a file that isn't Chinese is refused");
  await page.screenshot({ path: OUT + "/books-shelf.png" });

  // ---- reading (scroll) ----
  await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  ok(await page.locator("#tabs").isHidden(), "the tabs are hidden while a book is open");
  const first = await page.evaluate(() => ({ n: $$("#bkc p").length, h: $$("#bkc p.bkh").length, t: $("#bkc p").textContent, ca: BK.ca, cb: BK.cb, nchunks: BK.chunks.length }));
  ok(first.t === "书名：河边的小镇" && first.h >= 1 && first.ca === 0 && first.cb === 1 && first.nchunks >= 6, "opens at the start; chapter titles set apart; only a few chunks drawn: " + JSON.stringify(first));
  await page.waitForFunction(() => !!CED, null, { timeout: 30000 });
  await page.waitForFunction(() => $$("#bkc .tk").some(t => t.textContent === "仓库"));
  const tk = page.locator("#bkc .tk", { hasText: /^仓库$/ }).first();
  await tk.click(); await page.waitForSelector("#sheet");
  ok(/仓库/.test(await page.textContent("#sheet .w")) && /cāng/.test(await page.textContent("#sheet")), "tapping a word opens the usual popup (仓库 cāngkù)");
  await page.click("#addb");
  const bank = await page.evaluate(() => S.bank["仓库"]);
  ok(bank && /^book:bk/.test(bank.src) && bank.s.includes("仓库") && bank.s.length < 60, "加入复习 saves the word with its sentence from the book: " + (bank && bank.s));
  // scroll far: more chunks come in, the oldest go, the place follows
  for (let k = 0; k < 30; k++) { await page.mouse.wheel(0, 1600); await page.waitForTimeout(60); }
  await page.waitForTimeout(300);
  const sc = await page.evaluate(() => ({ ca: BK.ca, cb: BK.cb, pos: BK.pos, drawn: $$("#bkc p").length, top: (() => { const top = bkBarH() + 4; return +[...$("#bkc").children].find(x => x.getBoundingClientRect().bottom > top).dataset.pi; })() }));
  ok(sc.cb - sc.ca <= 4 && sc.cb >= 3 && sc.pos === sc.top && sc.pos > 40, "scrolling on draws later chunks and drops early ones; the bookmark is the paragraph at the top: " + JSON.stringify(sc));
  await page.waitForTimeout(1000); // the place is saved ~0.8 s after scrolling stops
  await page.click("#bkback"); await page.waitForSelector(".bkrow");
  const row2 = await page.textContent(".bkrow");
  ok(/继续 Continue/.test(row2) && /\d+%/.test(row2) && /第.+章/.test(row2), "back on the shelf: 继续, the share read and the chapter: " + row2.replace(/\s+/g, " ").trim());
  // reload the page: the place comes back from the device's store
  await page.reload(); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.click('#tabs button[data-tab="read"]'); await page.waitForSelector("[data-bkgo]"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  await page.waitForTimeout(200);
  const back = await page.evaluate(() => { const top = bkBarH() + 4; return { pos: BK.pos, top: +[...$("#bkc").children].find(x => x.getBoundingClientRect().bottom > top).dataset.pi }; });
  ok(back.pos === sc.pos && back.top === sc.pos, "reopened after a reload, it starts at the same paragraph: " + JSON.stringify(back));

  // ---- 目录 and ↩ ----
  await page.click("#bktoc"); await page.waitForSelector(".bktoc");
  ok(await page.locator(".bktoc button").count() === 13 && await page.locator(".bktoc button.on").count() === 1, "目录 lists the chapters, the current one marked");
  await page.click('[data-bkch="11"]'); await page.waitForSelector("#bkc p");
  await page.waitForTimeout(200);
  const j = await page.evaluate(() => ({ pos: BK.pos, ch: BK.meta.chapters[11].p, back: BK.back, top: (() => { const top = bkBarH() + 4; return +[...$("#bkc").children].find(x => x.getBoundingClientRect().bottom > top).dataset.pi; })() }));
  ok(j.pos === j.ch && j.top === j.ch && j.back === sc.pos && await page.locator("#bkret").count() === 1, "a chapter jump lands on its title, with ↩ 回到刚才: " + JSON.stringify(j));
  await page.click("#bkret"); await page.waitForTimeout(200);
  ok(await page.evaluate(p => BK.pos === p && !$("#bkret"), sc.pos), "↩ goes back to where you were");

  // ---- search ----
  await page.keyboard.press("Control+f"); await page.waitForSelector("#bkq");
  await page.fill("#bkq", "灯塔"); await page.press("#bkq", "Enter"); await page.waitForSelector("[data-bkr]");
  const res = await page.evaluate(() => [...$$("[data-bkr]")].map(b => b.textContent));
  ok(res.length === 2 && res.every(x => /灯塔/.test(x)) && /第三章/.test(res[0]) && /第九章/.test(res[1]), "Ctrl+F opens search; 灯塔 found twice, with chapter and snippet");
  await page.click('[data-bkr="1"]'); await page.waitForSelector("#bkc .tk.hit");
  const hv = await page.evaluate(() => { const r = $("#bkc .tk.hit").getBoundingClientRect(); return { y: r.top, ok: r.top > bkBarH() && r.bottom < innerHeight, n: $("#bkfn").textContent }; });
  ok(hv.ok && hv.n === "2/2", "the hit is highlighted on screen, with ‹ 2/2 › in the search bar: " + JSON.stringify(hv));
  await page.click("#bkfx"); await page.waitForTimeout(200);
  ok(await page.evaluate(() => $("#bkfn").textContent === "1/2" && BK.hit.p === BK.find.res[0].p && !!$("#bkc .tk.hit")), "› goes on to the next hit (round to the first)");
  await page.click("#bkfc");
  ok(await page.evaluate(() => !$("#bkfb") && !$("#bkc .tk.hit")), "✕ closes the search bar and the highlight");
  await page.click("#bkfind"); await page.fill("#bkq", "不存在的词"); await page.click("#bkqgo");
  ok(/没找到/.test(await page.textContent("#bkres")), "a search with no match says so");
  await page.click("#bkfb0"); await page.waitForSelector("#bkc p");

  // ---- Aa: size, pages ----
  const fs0 = await page.evaluate(() => parseFloat(getComputedStyle($("#bk")).fontSize));
  await page.click("#bkaa"); await page.waitForSelector("#aapop.bkaa");
  await page.click('[data-bfs="1"]');
  const fs1 = await page.evaluate(() => parseFloat(getComputedStyle($("#bk")).fontSize));
  ok(fs1 > fs0 && await page.locator("#aapop.bkaa").count() === 1, `字 + makes the text bigger (${fs0} → ${fs1} px) and the menu stays open`);
  const posA = await page.evaluate(() => BK.pos);
  await page.click('[data-bmode="page"]'); await page.waitForSelector("#bkpi p");
  await page.mouse.click(200, 700); // a tap outside closes the menu
  const pg = await page.evaluate(() => ({ lock: document.documentElement.classList.contains("bklock"), pages: BK.pages, pg: BK.pg, pos: BK.pos, sw: document.documentElement.scrollWidth, menu: !!$("#aapop") }));
  ok(pg.lock && pg.pages > 1 && pg.pos === posA && pg.sw <= 390 && !pg.menu, "翻页 Pages: the page doesn't scroll, the chunk is laid out in pages, same place, nothing sticks out sideways: " + JSON.stringify(pg));
  await page.screenshot({ path: OUT + "/books-page.png" });
  const pbar = await page.evaluate(() => [$(".bkpb").getBoundingClientRect().bottom, $("#bknext").getBoundingClientRect().bottom, innerHeight]);
  ok(pbar[0] <= pbar[2] && pbar[1] <= pbar[2], "(v113) the ‹ › bar sits wholly on screen, not cut off at the bottom: " + JSON.stringify(pbar));
  const vis = async () => page.evaluate(() => { const w = $("#bkpw").getBoundingClientRect(); return $$("#bkpi .tk").filter(t => { const r = t.getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1 && r.width > 0; }).length; });
  ok(await vis() > 30, "the current page shows text");
  const p0 = await page.evaluate(() => [BK.pc, BK.pg]);
  await page.click("#bknext"); await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight"); await page.waitForTimeout(300);
  const p1 = await page.evaluate(() => [BK.pc, BK.pg, BK.pos]);
  ok((p1[0] > p0[0] || p1[1] === p0[1] + 2) && await vis() > 30, "› and → turn pages: " + JSON.stringify([p0, p1]));
  // swipe left = next page
  const sw0 = await page.evaluate(() => [BK.pc, BK.pg]);
  await page.evaluate(() => { const el = $("#bkpw"), r = el.getBoundingClientRect(); const mk = (type, x) => { const t = new Touch({ identifier: 1, target: el, clientX: x, clientY: r.top + 100 }); el.dispatchEvent(new TouchEvent(type, { touches: type === "touchend" ? [] : [t], changedTouches: [t], bubbles: true })); }; mk("touchstart", 300); mk("touchend", 120); });
  await page.waitForTimeout(300);
  const sw1 = await page.evaluate(() => [BK.pc, BK.pg]);
  ok(sw1[0] > sw0[0] || sw1[1] === sw0[1] + 1, "a swipe left turns the page: " + JSON.stringify([sw0, sw1]));
  // turn into the next chunk and back
  const c0 = await page.evaluate(() => BK.pc);
  for (let k = 0; k < 40 && await page.evaluate(c => BK.pc === c, c0); k++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(30); }
  const c1 = await page.evaluate(() => [BK.pc, BK.pg]);
  await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(300);
  const c2 = await page.evaluate(() => [BK.pc, BK.pg, BK.pages]);
  ok(c1[0] === c0 + 1 && c1[1] === 0 && c2[0] === c0 && c2[1] === c2[2] - 1, "past a chunk's last page comes the next chunk; ← goes back to the last page of the previous one: " + JSON.stringify([c0, c1, c2]));
  // the bookmark in pages: reopening lands on the same page
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1200);
  const here = await page.evaluate(() => [BK.pc, BK.pg, BK.pos]);
  await page.click("#bkback"); await page.waitForSelector("[data-bkgo]"); await page.click("[data-bkgo]"); await page.waitForSelector("#bkpi p"); await page.waitForTimeout(200);
  const again = await page.evaluate(() => [BK.pc, BK.pg, BK.pos]);
  ok(JSON.stringify(here) === JSON.stringify(again), "reopening in pages lands on the same page: " + JSON.stringify([here, again]));
  // search in pages: the page with the hit
  await page.click("#bkfind"); await page.fill("#bkq", "灯塔"); await page.press("#bkq", "Enter"); await page.click('[data-bkr="0"]'); await page.waitForSelector("#bkpi .tk.hit");
  ok(await page.evaluate(() => { const w = $("#bkpw").getBoundingClientRect(), r = $("#bkpi .tk.hit").getBoundingClientRect(); return r.left >= w.left - 1 && r.right <= w.right + 1; }), "a search hit opens the page it's on");
  await page.click("#bkfc");
  // the end of the book
  await page.click("#bktoc"); await page.click('[data-bkch="12"]'); await page.waitForSelector("#bkpi p");
  for (let k = 0; k < 60 && !(await page.evaluate(() => $("#bknext").disabled)); k++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(20); }
  ok(await page.evaluate(() => $("#bknext").disabled && BK.pos === BK.paras.length - 1 && /100%/.test($("#bkpct").textContent)), "the last page: › is off, 100%");
  await page.waitForTimeout(1000);
  await page.click("#bkaa"); await page.click('[data-bmode="scroll"]'); await page.mouse.click(200, 700);
  await page.click("#bkback"); await page.waitForSelector(".bkrow");
  ok(/读完了/.test(await page.textContent(".bkrow")), "a finished book says 读完了 · Finished on the shelf");

  // ---- a traditional book in GB18030 ----
  await page.setInputFiles("#bkfile", { name: "小鎮的冬天.txt", mimeType: "text/plain", buffer: fs.readFileSync(path.join(__dirname, "fixtures/book-trad-gb18030.txt")) });
  await page.waitForFunction(() => $$(".bkrow").length === 2);
  const tm = await page.evaluate(() => BOOKS.find(b => /小鎮/.test(b.title)));
  ok(tm && tm.trad && tm.chapters.length === 4 && tm.chapters[1].s === "第一章 雪夜", "GB18030 decodes; traditional detected; chapter titles kept with a simplified copy: " + JSON.stringify(tm && tm.chapters.map(c => c.s || c.t)));
  await page.click(`[data-bkgo="${tm.id}"]`); await page.waitForSelector("#bkc p");
  const sTxt = await page.textContent("#bkc");
  ok(/邻居家的孩子/.test(sTxt) && !/鄰居/.test(sTxt), "shown in simplified by default");
  await page.click("#bkaa"); await page.click('[data-borig="1"]'); await page.mouse.click(200, 700);
  const oTxt = await page.textContent("#bkc");
  ok(/鄰居家的孩子/.test(oTxt) && await page.evaluate(() => BOOKS.find(b => b.trad).orig === true), "原文 shows the original traditional text (remembered for this book)");
  const tk2 = page.locator("#bkc .tk", { hasText: /^鄰居$/ }).first();
  await tk2.click(); await page.waitForSelector("#sheet");
  ok(/邻居/.test(await page.textContent("#sheet .w")), "a tapped traditional word is looked up as its simplified form");
  await page.keyboard.press("Escape");
  await page.click("#bkfind"); await page.fill("#bkq", "燈塔"); await page.press("#bkq", "Enter"); await page.waitForSelector("[data-bkr]");
  const t1 = await page.locator("[data-bkr]").count();
  await page.fill("#bkq", "灯塔"); await page.press("#bkq", "Enter"); await page.waitForSelector("[data-bkr]");
  const t2 = await page.locator("[data-bkr]").count();
  ok(t1 === 2 && t2 === 2 && (await page.locator("[data-bkr]").allTextContents()).every(x => /燈塔/.test(x)), "search finds 燈塔 (chapter title + text) typed either way, shown in the script you're reading");
  await page.click("#bkfb0"); await page.click("#bkback");

  // ---- rename and remove ----
  await page.click(`[data-bkinfo="${tm.id}"]`); await page.waitForSelector("#bkti");
  await page.fill("#bkti", "冬天"); await page.click("#bktsave"); await page.waitForFunction(() => BOOKS.some(b => b.title === "冬天"));
  await page.click("#bkib"); await page.waitForSelector(".bkrow");
  ok(/冬天/.test(await page.textContent("#main")) && await page.evaluate(id => bookRec(id).title === "冬天" && bookRec(id).uf.title > 0, tm.id), "改名 renames the book on the shelf (and in the synced record)");
  await page.click(`[data-bkinfo="${tm.id}"]`); await page.waitForSelector("#bkrm");
  await page.click("#bkrm"); await page.waitForFunction(() => $$(".bkrow").length === 1);
  const del = await page.evaluate(async id => ({ rec: !!bookRec(id), bin: (S.gen.trash || []).filter(e => e.kind === "book").length, gone: !!S.gone["book:" + id], local: !!(await bookTextGet(id)) }), tm.id);
  ok(!del.rec && del.bin === 1 && del.gone && del.local && /最近删除/.test(await page.evaluate(() => $$(".toast").map(t => t.textContent).join())), "删除 puts the book in 最近删除 (off the shelf, the text still on this device for a restore): " + JSON.stringify(del));
  await page.evaluate(() => { const e = S.gen.trash.find(x => x.kind === "book"); restoreTrash(e); render(); });
  await page.waitForFunction(() => $$(".bkrow").length === 2);
  ok(true, "restoring from the bin brings it back on the shelf");
  await page.click(`[data-bkinfo="${tm.id}"]`); await page.click("#bkrm"); await page.waitForFunction(() => $$(".bkrow").length === 1);
  await page.evaluate(() => setView("me")); await page.waitForSelector("#trashcard");
  ok(/📚/.test(await page.textContent("#trashcard")) && /书 Book/.test(await page.textContent("#trashcard")), "the bin lists it as 📚 书 Book");
  await page.click("[data-trx]"); await page.click("[data-trx]");
  await page.waitForFunction(async id => !(await bookTextGet(id)), tm.id);
  const left = await page.evaluate(async id => [(S.gen.books || []).length, BOOKS.length, await bookTextGet(id)], tm.id);
  ok(left[0] === 1 && left[1] === 1 && left[2] === null && !!(await page.evaluate(() => S.bank["仓库"])), "deleted for good from the bin: the device's copy goes too; saved words stay");
  await page.evaluate(() => setView("read"));

  // ---- nothing in the error log, nothing in the progress entry ----
  const misc = await page.evaluate(() => ({ err: localStorage.getItem("zwlgf:errlog"), big: (localStorage.getItem("zwlgf:state:v1") || "").length }));
  ok(!misc.err || misc.err === "[]", "nothing in the error log: " + misc.err);
  ok(misc.big < 20000, "the book text isn't in the progress entry (" + misc.big + " characters)");
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
