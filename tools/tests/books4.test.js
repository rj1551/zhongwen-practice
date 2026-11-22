// Books, release 4 (v89): .epub. The epubs are made here (zip written by hand, deflate from Node's zlib; text made
// up). Covers: EPUB 3 (nav) with chapters by file and by #anchor, both stored and deflated entries, ruby (rt) and
// images left out, <br> lines, whitespace between Chinese characters removed, title from the book; EPUB 2 (NCX only)
// in traditional characters (shown in simplified); no table of contents → the headings; copy-protected (DRM) refused
// while font obfuscation is fine; a broken file; the cloud copy keeps the format; an epub's chapters are never
// recomputed by the .txt rules.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const zlib = require("zlib");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return b => { let c = -1; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }; })();
function zip(files) { // [[name, text, stored?]]
  const locals = [], cents = []; let off = 0;
  for (const [name, text, stored] of files) {
    const data = Buffer.from(text, "utf8"), comp = stored ? data : zlib.deflateRawSync(data), nb = Buffer.from(name, "utf8"), crc = CRC(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x800, 6); lh.writeUInt16LE(stored ? 0 : 8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x800, 8); ch.writeUInt16LE(stored ? 0 : 8, 10); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nb, comp); cents.push(ch, nb); off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(cents), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}
const CONTAINER = `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`;
const body = n => Array.from({ length: n }, (_, i) => `<p>　　他在河边\n      慢慢地走着，可是谁也没有注意到。第${i + 1}段。</p>`).join("\n");
const xhtml = (inner, title = "x") => `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${title}</title><style>p{margin:0}</style></head><body>${inner}</body></html>`;
function epub3() {
  const opf = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>河边的小镇</dc:title><dc:creator>某某</dc:creator></metadata>
    <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c0" href="text/cover.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="css" href="s.css" media-type="text/css"/><item id="img" href="img/a.jpg" media-type="image/jpeg"/></manifest>
    <spine><itemref idref="c0"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>`;
  const nav = xhtml(`<nav epub:type="toc"><ol><li><a href="text/ch1.xhtml">第一章 雪夜</a></li><li><a href="text/ch2.xhtml">第二章 灯塔</a><ol><li><a href="text/ch2.xhtml#s2">第三章 归来</a></li></ol></li></ol></nav>`);
  return zip([["mimetype", "application/epub+zip", true], ["META-INF/container.xml", CONTAINER], ["OEBPS/content.opf", opf], ["OEBPS/nav.xhtml", nav],
    ["OEBPS/text/cover.xhtml", xhtml(`<div><img src="../img/a.jpg" alt="封面图"/></div><p>河边的小镇</p>`)],
    ["OEBPS/text/ch1.xhtml", xhtml(`<h2>第一章 雪夜</h2>${body(6)}<p><ruby>重<rt>chóng</rt></ruby>新开始。</p><p>第一行<br/>第二行</p>`), true],
    ["OEBPS/text/ch2.xhtml", xhtml(`<h2>第二章 灯塔</h2>${body(5)}<h2 id="s2">第三章 归来</h2>${body(4)}<div><span>海边的灯塔整夜都亮着。</span></div>`)],
    ["OEBPS/s.css", "p{}"]]);
}
function epub2trad(encryption) {
  const opf = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>小鎮的冬天</dc:title></metadata>
    <manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="a" href="a.html" media-type="application/xhtml+xml"/><item id="b" href="b.html" media-type="application/xhtml+xml"/><item id="f" href="f.otf" media-type="font/otf"/></manifest>
    <spine toc="ncx"><itemref idref="a"/><itemref idref="b"/></spine></package>`;
  const ncx = `<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap><navPoint id="n1"><navLabel><text>第一章 雪夜</text></navLabel><content src="a.html"/></navPoint><navPoint id="n2"><navLabel><text>第二章 歸來</text></navLabel><content src="b.html"/></navPoint></navMap></ncx>`;
  const tb = n => Array.from({ length: n }, () => `<p>鄰居家的孩子在河邊慢慢地走著，可是誰也沒有注意到。</p>`).join("");
  const files = [["mimetype", "application/epub+zip", true], ["META-INF/container.xml", CONTAINER], ["OEBPS/content.opf", opf], ["OEBPS/toc.ncx", ncx], ["OEBPS/a.html", xhtml(`<h1>第一章 雪夜</h1>${tb(8)}`)], ["OEBPS/b.html", xhtml(`<h1>第二章 歸來</h1>${tb(8)}`)], ["OEBPS/f.otf", "font"]];
  if (encryption) files.push(["META-INF/encryption.xml", `<?xml version="1.0"?><encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container" xmlns:enc="http://www.w3.org/2001/04/xmlenc#"><enc:EncryptedData><enc:EncryptionMethod Algorithm="${encryption === "font" ? "http://www.idpf.org/2008/embedding" : "http://www.w3.org/2001/04/xmlenc#aes128-cbc"}"/><enc:CipherData><enc:CipherReference URI="${encryption === "font" ? "OEBPS/f.otf" : "OEBPS/a.html"}"/></enc:CipherData></enc:EncryptedData></encryption>`]);
  return zip(files);
}
function epubNoToc() {
  const opf = `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>没有目录</dc:title></metadata><manifest><item id="a" href="a.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="a"/></spine></package>`;
  return zip([["mimetype", "application/epub+zip", true], ["META-INF/container.xml", CONTAINER], ["OEBPS/content.opf", opf], ["OEBPS/a.xhtml", xhtml(`<h3>上篇</h3>${body(5)}<h3>下篇</h3>${body(5)}`)]]);
}
const STATE = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(st => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); } }, STATE);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.evaluate(() => setView("read")); await page.waitForSelector("#bkadd");
  ok(/\.epub/.test(await page.getAttribute("#bkfile", "accept")), "the file picker takes .epub");
  const toastHas = re => page.waitForFunction(src => $$(".toast").some(t => new RegExp(src).test(t.textContent)), re.source, { timeout: 8000 }).then(() => true, () => false);
  const books = () => page.evaluate(() => (S.gen.books || []).length);

  // ---- EPUB 3 ----
  await page.setInputFiles("#bkfile", { name: "book3.epub", mimeType: "application/epub+zip", buffer: epub3() });
  await page.waitForFunction(() => (S.gen.books || []).length === 1, null, { timeout: 10000 });
  const m = await page.evaluate(async () => { const m = BOOKS[0], tx = await bookTextGet(m.id); return { m, paras: tx.paras }; });
  ok(m.m.title === "河边的小镇" && m.m.fmt === "epub", "title from the book's own metadata (not the file name); format remembered: " + m.m.title);
  const ch = m.m.chapters.map(c => c.t + "@" + m.paras[c.p]);
  ok(JSON.stringify(m.m.chapters.map(c => c.t)) === JSON.stringify(["开头 · Beginning", "第一章 雪夜", "第二章 灯塔", "第三章 归来"]) && ch.slice(1).every(x => { const [t, p] = x.split("@"); return t === p; }), "chapters from the table of contents land on their headings, including one at an #anchor inside a file: " + ch.join(" | "));
  ok(m.m.chapters.slice(1).every(c => c.h), "TOC chapters that start on a short heading line are shown as headings");
  ok(m.paras.includes("他在河边慢慢地走着，可是谁也没有注意到。第1段。"), "a paragraph's line breaks and indentation inside the file are tidied away (no stray spaces between Chinese characters)");
  ok(m.paras.includes("重新开始。") && !m.paras.some(x => /chóng/.test(x)), "ruby annotations (rt) are left out of the text");
  ok(m.paras.includes("第一行") && m.paras.includes("第二行"), "<br> splits lines into paragraphs");
  ok(!m.paras.some(x => /封面图|p\{\}/.test(x)) && m.paras.includes("海边的灯塔整夜都亮着。"), "images and styles are left out; text in a div/span is kept");
  await page.click("[data-bkgo]"); await page.waitForSelector("#bkc p");
  ok(await page.evaluate(() => $$("#bkc p.bkh").length === 3), "the reader shows the three chapter titles as headings");
  await page.click("#bktoc"); await page.click('[data-bkch="3"]'); await page.waitForSelector("#bkc p");
  ok(await page.evaluate(() => { const h = $$("#bkc p.bkh").find(x => x.textContent === "第三章 归来"), r = h && h.getBoundingClientRect(); return r && r.top >= 0 && r.bottom <= innerHeight; }), "目录 jumps to the chapter that starts at an anchor (its heading is on screen)");
  await page.evaluate(() => bkLeave());
  // the cloud copy keeps the format; an epub isn't re-split by the .txt rules
  const blob = await page.evaluate(async () => JSON.parse(await (await bookBlob(BOOKS[0].id)).text()));
  ok(blob.fmt === "epub" && blob.chapters.length === 4, "the cloud copy carries the format and the book's own chapters");
  ok(await page.evaluate(async () => { const m = BOOKS[0]; m.cv = 1; BK = null; await bookOpen(m.id); return BK.meta.chapters.length === 4 && BK.meta.chapters[3].t === "第三章 归来"; }), "an epub's chapters are never recomputed by the .txt rules (even with an older chapter version)");

  // ---- EPUB 2, NCX only, traditional ----
  await page.setInputFiles("#bkfile", { name: "trad.epub", mimeType: "application/epub+zip", buffer: epub2trad() });
  await page.waitForFunction(() => (S.gen.books || []).length === 2, null, { timeout: 10000 });
  const t2 = await page.evaluate(() => BOOKS.find(b => b.title === "小鎮的冬天"));
  ok(t2 && t2.trad && JSON.stringify(t2.chapters.map(c => c.s || c.t)) === JSON.stringify(["第一章 雪夜", "第二章 归来"]), "EPUB 2 (NCX) chapters; traditional detected, titles also kept in simplified");
  await page.click(`[data-bkgo="${t2.id}"]`); await page.waitForSelector("#bkc p");
  ok(/邻居家的孩子/.test(await page.textContent("#bkc")), "shown in simplified by default");
  await page.evaluate(() => bkLeave());

  // ---- no table of contents: the headings ----
  await page.setInputFiles("#bkfile", { name: "notoc.epub", mimeType: "application/epub+zip", buffer: epubNoToc() });
  await page.waitForFunction(() => (S.gen.books || []).length === 3, null, { timeout: 10000 });
  ok(await page.evaluate(() => JSON.stringify(BOOKS.find(b => b.title === "没有目录").chapters.map(c => c.t)) === JSON.stringify(["上篇", "下篇"])), "no table of contents: the book's headings become the chapters");

  // ---- copy-protected, font obfuscation, broken ----
  await page.setInputFiles("#bkfile", { name: "drm.epub", mimeType: "application/epub+zip", buffer: epub2trad("drm") });
  ok(await toastHas(/版权保护（DRM）/) && await books() === 3, "a copy-protected (DRM) epub is refused with a message");
  await page.setInputFiles("#bkfile", { name: "font.epub", mimeType: "application/epub+zip", buffer: epub2trad("font") });
  ok(await toastHas(/已经在书架上|已添加/), "an epub whose only 'encryption' is font hiding opens fine");
  await page.setInputFiles("#bkfile", { name: "broken.epub", mimeType: "application/epub+zip", buffer: Buffer.from("this is not a zip file at all".repeat(10)) });
  ok(await toastHas(/读不出来/) && /book read/.test(await page.evaluate(() => localStorage.getItem("zwlgf:errlog") || "")), "a broken file says it couldn't be read (and is noted in the error log)");
  await page.setInputFiles("#bkfile", { name: "book.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  ok(await toastHas(/Calibre/), "a PDF is refused, pointing to converting it to epub");
  await page.screenshot({ path: (process.env.TEST_OUT || "/tmp") + "/books-epub-shelf.png" });
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
