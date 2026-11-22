// Books, release 2 (v87): the synced record (S.gen.books) and the cloud copy (R2 books/<id>.json). Two devices share
// a fake R2 bucket (every request's SigV4 signature checked, as in r2.test.js); their progress is merged with
// mergeStates, as sync does. Covers: upload after adding, the usage count including books/, the other device's shelf
// (☁ + 下载, or "not uploaded yet"), download and open at the synced place, the place travelling back, the same file
// added on the second device becoming that book's copy, rename both ways, a v86 book getting a record, delete → bin on
// both devices → deleted for good removes the cloud copy and the other device's copy, a damaged cloud file refused.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const { sigv4 } = require("./sigv4.js");
const URL0 = process.env.TEST_URL || "http://localhost:8765/";
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const R2C = { account: "acct123", bucket: "zhongwen-audio", akid: "AKIDTEST", secret: "SECRETTEST" };
const R2S = { objs: new Map(), log: [], badSig: 0 };
async function routeR2(ctx) {
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
let browser;
async function dev(r2) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }); await routeR2(ctx);
  await ctx.addInitScript(([st, pv]) => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); if (pv) localStorage.setItem("zwlgf:prov", pv); } }, [STATE, r2 ? JSON.stringify({ r2: R2C }) : null]);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  return page;
}
// "sync": merge one device's progress into the other's, as a GitHub sync does
const sync = async (from, to) => { const st = await from.evaluate(() => JSON.stringify(S)); await to.evaluate(st => { S = mergeStates(S, JSON.parse(st)); indexGen(); housekeep(); save(); if (VIEW === "read" && !READ) render(); }, st); };
function makeBook() {
  const S = ["老王", "他们", "邻居家的孩子", "这位医生"], V = ["在河边慢慢地走着", "把旧书搬进了仓库", "听见远处传来的钟声", "给家里打了一个电话"];
  let k = 0; const lines = [];
  for (let c = 1; c <= 6; c++) { lines.push(`第${"一二三四五六"[c - 1]}章　河边`); for (let p = 0; p < 12; p++) { let s = ""; for (let j = 0; j < 8; j++) s += S[(k++) % 4] + V[(k * 7) % 4] + "。"; lines.push("　　" + s); } }
  return lines.join("\n");
}
const shelf = pg => pg.evaluate(() => $$(".bkrow").map(r => r.textContent.replace(/\s+/g, " ").trim()));
(async () => {
  browser = await chromium.launch();
  const A = await dev(true), B = await dev(true);
  const book = makeBook();

  // ---- A adds a book: a record in progress, the text uploaded ----
  await A.evaluate(() => setView("read")); await A.waitForSelector("#bkadd");
  await A.setInputFiles("#bkfile", { name: "河边.txt", mimeType: "text/plain", buffer: Buffer.from(book, "utf8") });
  await A.waitForFunction(() => (S.gen.books || []).length === 1 && S.gen.books[0].r2, null, { timeout: 15000 });
  const rec = await A.evaluate(() => S.gen.books[0]);
  const obj = R2S.objs.get("books/" + rec.id + ".json"), body = obj && JSON.parse(obj.body.toString());
  ok(rec.title === "河边" && rec.chars > 1000 && rec.nch === 6 && !rec.r2want && rec.r2.key === "books/" + rec.id + ".json" && !("paras" in rec) && !("chapters" in rec), "adding a book makes a small record in progress (no text, no chapter list) and uploads the text: " + JSON.stringify(Object.keys(rec)));
  ok(body && body.paras.length === 78 && body.chapters.length === 6 && obj.type === "application/json" && R2S.badSig === 0, "the cloud copy is the extracted book (paragraphs + chapters), signed requests accepted");
  ok(await A.evaluate(() => /已上传到云端/.test($$(".toast").map(t => t.textContent).join())), "a toast says it was uploaded");
  const use = await A.evaluate(async () => { R2.usageAt = 0; return await r2UsageFresh(); });
  ok(use.n === 1 && use.bytes === obj.body.length && R2S.log.some(l => /prefix=books%2F/.test(l)), "the cloud usage counts the books folder too: " + JSON.stringify(use));
  const stLen = await A.evaluate(() => (localStorage.getItem("zwlgf:state:v1") || "").length);
  ok(stLen < 8000, "the progress entry stays small (" + stLen + " characters)");

  // ---- B: on the shelf with ☁, download, open at A's place ----
  await A.click("[data-bkgo]"); await A.waitForSelector("#bkc p");
  await A.evaluate(() => { bkSetPos(40); bkLeave(); });
  await sync(A, B);
  await B.evaluate(() => setView("read")); await B.waitForSelector(".bkrow");
  const sb = await shelf(B);
  ok(sb.length === 1 && /在云端/.test(sb[0]) && /下载 Download/.test(sb[0]) && /\d+%/.test(sb[0]), "the other device's shelf: the book, ☁ in the cloud, 下载 Download, A's place: " + sb[0]);
  await B.click("[data-bkgo]"); await B.waitForSelector("#bkc p", { timeout: 15000 });
  await B.waitForTimeout(200);
  const bo = await B.evaluate(() => ({ pos: BK.pos, top: +[...$("#bkc").children].find(x => x.getBoundingClientRect().bottom > bkBarH() + 4).dataset.pi, ch: BK.meta.chapters.length }));
  ok(bo.pos === 40 && bo.top === 40 && bo.ch === 6, "下载 downloads it and opens at the place read on the other device: " + JSON.stringify(bo));
  ok(await B.evaluate(async id => !!bookLocal(id) && !!(await bookTextGet(id)), rec.id), "the downloaded book is kept on this device (opens offline next time)");
  // B reads on; the place goes back to A
  await B.evaluate(() => { bkSetPos(60); bkLeave(); });
  await sync(B, A);
  await A.evaluate(() => setView("read")); await A.waitForSelector("[data-bkgo]"); await A.click("[data-bkgo]"); await A.waitForSelector("#bkc p");
  ok(await A.evaluate(() => BK.pos === 60), "A opens at the place B read to (the newer place wins)");
  await A.evaluate(() => bkLeave());
  // the place is put into progress when the app is put away, and not on every scroll
  const n0 = await B.evaluate(() => S.gen.books[0].pos.p);
  await B.click("[data-bkgo]"); await B.waitForSelector("#bkc p");
  await B.evaluate(() => { BK.synced = now(); bkSetPos(65); });
  ok(await B.evaluate(() => S.gen.books[0].pos.p === 60), "moving the place doesn't write progress every time (it was " + n0 + ")");
  await B.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); });
  ok(await B.evaluate(() => S.gen.books[0].pos.p === 65), "putting the app away writes the place into progress");
  await B.evaluate(() => bkLeave());

  // ---- rename on B → A ----
  await B.click("[data-bkinfo]"); await B.fill("#bkti", "河边的故事"); await B.click("#bktsave");
  await sync(B, A); await A.evaluate(() => render());
  ok(/河边的故事/.test((await shelf(A))[0]), "a rename on one device shows on the other");
  await B.click("#bkib");

  // ---- a device without cloud storage; a book not uploaded yet ----
  const C = await dev(false);
  await sync(A, C); await C.evaluate(() => setView("read")); await C.waitForSelector(".bkrow");
  const sc = await shelf(C);
  ok(/还没设置云端/.test(sc[0]) && await C.locator("[data-bkgo]").count() === 0, "a device without cloud storage says to set it up first (no download button): " + sc[0].slice(0, 60));
  await C.setInputFiles("#bkfile", { name: "另一本.txt", mimeType: "text/plain", buffer: Buffer.from(book.replace(/河边/g, "山上"), "utf8") });
  await C.waitForFunction(() => (S.gen.books || []).length === 2);
  await C.evaluate(() => setView("read")); await C.waitForSelector("[data-bkinfo]");
  const crec = await C.evaluate(() => S.gen.books.find(r => r.title === "另一本"));
  ok(crec.r2want && !crec.r2, "added on a device without cloud storage: waits to upload");
  await sync(C, A); await A.evaluate(() => render());
  const sa = await shelf(A);
  ok(sa.length === 2 && sa.some(x => /另一本/.test(x) && /还没上传/.test(x)), "the other device lists it as not uploaded yet, no button");
  // the same file added on A becomes that book's copy (same id, nothing uploaded twice)
  await A.setInputFiles("#bkfile", { name: "另一本.txt", mimeType: "text/plain", buffer: Buffer.from(book.replace(/河边/g, "山上"), "utf8") });
  await A.waitForFunction(id => !!bookLocal(id), crec.id);
  ok(await A.evaluate(id => S.gen.books.length === 2 && S.gen.books.filter(r => r.file === "另一本.txt").length === 1 && !!bookLocal(id), crec.id), "adding the same file on another device makes it that book's copy there (no second book)");
  await C.close();

  // ---- a v86 book (on the device, no record) gets a record and uploads ----
  await A.evaluate(async () => {
    const meta = { id: "bkold1", title: "旧书", file: "旧书.txt", added: now() - 86400000, bytes: 100, chars: 60, n: 2, chapters: [{ t: "第 1 部分", p: 0 }], trad: false, orig: false, pos: { p: 1, c: 30, t: now() - 3600000 }, lastT: 0 };
    await bdbDo(["m", "t"], "readwrite", t => { t.objectStore("t").put({ id: meta.id, paras: ["他在河边慢慢地走着。".repeat(3), "可是谁也没有注意到。".repeat(3)], simp: null }, meta.id); t.objectStore("m").put(meta, meta.id); });
    BOOKS = null; await bookReconcile(); render();
  });
  await A.waitForFunction(() => { const r = bookRec("bkold1"); return r && r.r2; }, null, { timeout: 15000 });
  ok(await A.evaluate(() => bookRec("bkold1").pos.p === 1) && R2S.objs.has("books/bkold1.json"), "a book added with v86 gets a record (keeping its place) and is uploaded");

  // ---- delete on A → bin on both → deleted for good: cloud copy and B's copy go ----
  await A.evaluate(() => setView("read")); await A.click(`[data-bkinfo="${rec.id}"]`); await A.click("#bkrm");
  await sync(A, B); await B.evaluate(() => setView("read"));
  ok(await B.evaluate(id => !bookRec(id) && (S.gen.trash || []).some(e => e.kind === "book") && !!bookLocal(id), rec.id), "deleted on A: off B's shelf too, in B's bin, B's copy kept while it's in the bin");
  ok(R2S.objs.has("books/" + rec.id + ".json"), "the cloud copy stays while it's in the bin");
  await A.evaluate(() => { const e = S.gen.trash.find(x => x.kind === "book"); purgeTrash(e); });
  for (let k = 0; k < 40 && R2S.objs.has("books/" + rec.id + ".json"); k++) await A.waitForTimeout(100);
  ok(!R2S.objs.has("books/" + rec.id + ".json"), "deleted for good: the cloud copy is removed");
  await sync(A, B); await B.waitForTimeout(300);
  ok(await B.evaluate(async id => !bookLocal(id) && !(await bookTextGet(id)) && !(S.gen.trash || []).some(e => e.kind === "book" && e.data.rec.id === id), rec.id), "and the other device's copy goes after its next sync");

  // ---- a damaged cloud file is refused ----
  const bad = await A.evaluate(() => S.gen.books.find(r => r.id === "bkold1"));
  R2S.objs.set("books/bkold1.json", { body: Buffer.from('{"paras":[1,2],"chapters":[]}'), type: "application/json" });
  await sync(A, B); await B.evaluate(() => { setView("read"); });
  await B.click(`[data-bkgo="${bad.id}"]`);
  await B.waitForFunction(() => $$(".toast").some(t => /not a book file/.test(t.textContent)));
  ok(await B.evaluate(() => !bookLocal("bkold1") && !READ), "a cloud file that isn't a book is refused (nothing stored, nothing opened)");
  ok(await B.evaluate(() => /book download/.test(localStorage.getItem("zwlgf:errlog") || "")), "and noted in the error log");
  const errA = await A.evaluate(() => localStorage.getItem("zwlgf:errlog"));
  ok(!errA || errA === "[]", "nothing in A's error log: " + errA);
  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED");
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
