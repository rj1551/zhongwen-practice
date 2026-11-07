const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const crypto = require("crypto");
const { sigv4 } = require("./sigv4.js");
const URL0 = "http://localhost:8765/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
// ---------- fake GitHub ----------
function makeGit(opts = {}) {
  const g = { blobs: {}, trees: {}, commits: {}, ref: null, tokens: new Set(["good"]), private: opts.private !== false,
    log: [], down: false, patchDelay: 0, conflicts: 0 };
  const sha = s => crypto.createHash("sha1").update(s).digest("hex");
  g.blob = c => { const s = sha("b" + c); g.blobs[s] = c; return s; };
  g.mkTree = map => { const s = sha("t" + JSON.stringify(Object.entries(map).sort())); g.trees[s] = map; return s; };
  g.mkCommit = (tree, parents, msg) => { const s = sha("c" + tree + parents.join() + msg + Math.random()); g.commits[s] = { tree, parents, msg }; return s; };
  if (!opts.empty) { const t = g.mkTree({ "README.md": g.blob("# zhongwen-data") }); g.ref = g.mkCommit(t, [], "init"); }
  g.files = () => { if (!g.ref) return {}; const m = g.trees[g.commits[g.ref].tree], o = {}; for (const p in m) o[p] = g.blobs[m[p]]; return o; };
  g.count = () => { let n = 0, c = g.ref; while (c) { n++; c = g.commits[c].parents[0]; } return n; };
  return g;
}
async function routeGit(ctx, g) {
  await ctx.route("https://api.github.com/**", async route => {
    const rq = route.request(), u = new URL(rq.url()), m = rq.method();
    const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
    if (m === "OPTIONS") return route.fulfill({ status: 204, headers: H });
    if (g.down) return route.abort("internetdisconnected");
    const send = (status, body) => route.fulfill({ status, headers: H, body: JSON.stringify(body) });
    g.log.push(m + " " + u.pathname);
    const tok = (rq.headers()["authorization"] || "").replace("Bearer ", "");
    if (!g.tokens.has(tok)) return send(401, { message: "Bad credentials" });
    const p = u.pathname.replace(/^\/repos\/rj1551\/zhongwen-data/, "");
    if (!u.pathname.startsWith("/repos/rj1551/zhongwen-data")) return send(404, { message: "Not Found" });
    const body = rq.postData() ? JSON.parse(rq.postData()) : null;
    if (p === "" && m === "GET") return send(200, { private: g.private, default_branch: "main" });
    if (p === "/git/ref/heads/main") return g.ref ? send(200, { object: { sha: g.ref } }) : send(409, { message: "Git Repository is empty." });
    let r;
    if ((r = p.match(/^\/git\/commits\/(\w+)$/))) return send(200, { sha: r[1], tree: { sha: g.commits[r[1]].tree } });
    if ((r = p.match(/^\/git\/trees\/(\w+)$/))) return send(200, { sha: r[1], tree: Object.entries(g.trees[r[1]]).map(([path, sha]) => ({ path, sha, type: "blob" })) });
    if ((r = p.match(/^\/git\/blobs\/(\w+)$/))) return send(200, { content: Buffer.from(g.blobs[r[1]]).toString("base64").replace(/(.{60})/g, "$1\n") });
    if (p === "/git/trees" && m === "POST") {
      if (!g.ref) return send(409, { message: "Git Repository is empty." });
      const map = Object.assign({}, g.trees[body.base_tree]); for (const e of body.tree) map[e.path] = g.blob(e.content);
      const s = g.mkTree(map); return send(201, { sha: s, tree: Object.entries(map).map(([path, sha]) => ({ path, sha, type: "blob" })) });
    }
    if (p === "/git/commits" && m === "POST") return send(201, { sha: g.mkCommit(body.tree, body.parents, body.message) });
    if (p === "/git/refs/heads/main" && m === "PATCH") {
      if (g.patchDelay) await sleep(g.patchDelay);
      if (g.commits[body.sha].parents[0] !== g.ref) { g.conflicts++; return send(422, { message: "Update is not a fast forward" }); }
      g.ref = body.sha; return send(200, { object: { sha: g.ref } });
    }
    if (p === "/contents/README.md" && m === "PUT") {
      const t = g.mkTree({ "README.md": g.blob(Buffer.from(body.content, "base64").toString()) }); g.ref = g.mkCommit(t, g.ref ? [g.ref] : [], body.message); return send(201, {});
    }
    return send(404, { message: "Not Found " + p });
  });
}
const T = Math.floor(Date.now() / 1000);
function stateWith(items, bank) { return JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items, recent: {}, log: {}, bank: bank || {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } }); }
async function device(browser, g, state, prov) {
  const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh) test" });
  await routeGit(ctx, g);
  await ctx.addInitScript(([st, pv]) => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); if (st) localStorage.setItem("zwlgf:state:v1", st); if (pv) localStorage.setItem("zwlgf:prov", pv); } }, [state, prov]);
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  return { ctx, page };
}
const connect = async (pg, tok) => {
  await pg.evaluate(() => setView("me"));
  await pg.fill("#ghtok", tok || "good"); await pg.click("#ghgo");
  await pg.waitForFunction(() => !GH.connecting && !GH.busy && !GH.manual, null, { timeout: 15000 }); await pg.evaluate(() => SYNCQ);
};
const items = pg => pg.evaluate(() => Object.keys(S.items).sort().join(","));
const addItem = (pg, id) => pg.evaluate(([id, T]) => { S.items[id] = { t: "lad", n: 1, h: [[T, 5, 3]] }; save(); }, [id, T]);
const syncNow = async pg => { await pg.evaluate(() => ghSyncNow()); };
const repoItems = g => { const f = g.files(), ids = []; for (const p in f) if (p.startsWith("progress/items-")) ids.push(...Object.keys(JSON.parse(f[p]).items)); return ids.sort().join(","); };


// ---- fake R2 (S3 API) that checks every request's signature ----
const R2C = { account: "acct123", bucket: "zhongwen-audio", akid: "AKIDTEST", secret: "SECRETTEST" };
const R2S = { objs: new Map(), log: [], badSig: 0, failPut: 0, deny: false };
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
    if (want.authorization !== auth || R2S.deny) { R2S.badSig++; return route.fulfill({ status: 403, headers: H, body: "<Error><Code>SignatureDoesNotMatch</Code></Error>" }); }
    const key = decodeURIComponent(u.pathname.replace("/" + R2C.bucket + "/", ""));
    if (m === "PUT") { if (R2S.failPut > 0) { R2S.failPut--; return route.fulfill({ status: 500, headers: H, body: "<Error>InternalError</Error>" }); } R2S.objs.set(key, { body: rq.postDataBuffer(), type: h["content-type"] }); return route.fulfill({ status: 200, headers: Object.assign({ etag: '"x"' }, H), body: "" }); }
    if (m === "DELETE") { R2S.objs.delete(key); return route.fulfill({ status: 204, headers: H }); }
    if (m === "GET" && u.searchParams.get("list-type") === "2") {
      const items = [...R2S.objs.entries()].filter(([k]) => k.startsWith("audio/"));
      return route.fulfill({ status: 200, headers: Object.assign({ "content-type": "application/xml" }, H), body: `<?xml version="1.0"?><ListBucketResult>${items.map(([k, o]) => `<Contents><Key>${k}</Key><Size>${o.body.length}</Size></Contents>`).join("")}<IsTruncated>false</IsTruncated></ListBucketResult>` });
    }
    if (m === "GET") { const o = R2S.objs.get(key); if (!o) return route.fulfill({ status: 404, headers: H, body: "<Error>NoSuchKey</Error>" }); return route.fulfill({ status: 200, headers: Object.assign({ "content-type": o.type, "content-length": String(o.body.length) }, H), body: o.body }); }
    route.fulfill({ status: 400, headers: H, body: "bad" });
  });
}
async function dev(g, state) {
  const ctx = await browser.newContext(); await routeGit(ctx, g); await routeR2(ctx);
  await ctx.addInitScript(st => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); if (st) localStorage.setItem("zwlgf:state:v1", st); } }, state);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  return { ctx, page };
}
const MP3 = Buffer.concat([Buffer.from("ID3"), crypto.randomBytes(300000)]);
async function addAudio(pg, title) {
  await pg.evaluate(() => { stopAudio(); LST = null; setView("listen"); }); await pg.click("#ladd");
  await pg.setInputFiles("#lf", { name: title + ".mp3", mimeType: "audio/mpeg", buffer: MP3 });
  await sleep(300); await pg.fill("#lt", title).catch(() => {});
  await pg.click("#lsave");
  await pg.waitForFunction(() => LST && LST.id, null, { timeout: 10000 });
  return pg.evaluate(() => LST.id);
}
let browser;
(async () => {
  browser = await chromium.launch();
  const g = makeGit();
  const A = await dev(g, stateWith({}));
  await connect(A.page); await sleep(800);
  // set up cloud audio
  await A.page.evaluate(() => setView("me"));
  await A.page.fill("#r2acct", R2C.account); await A.page.fill("#r2bkt", R2C.bucket); await A.page.fill("#r2ak", R2C.akid); await A.page.fill("#r2sk", R2C.secret);
  await A.page.click("#r2save"); await A.page.waitForFunction(() => /Used/.test(document.querySelector("#r2st").textContent) || /refused|reach/.test(document.querySelector("#r2st").textContent), null, { timeout: 8000 });
  ok(/Used: 0\.1 MB|Used: 0 MB|Used:/.test(await A.page.$eval("#r2st", e => e.textContent)) && R2S.badSig === 0, "settings card: Save & test lists the bucket (signed request accepted): " + await A.page.$eval("#r2st", e => e.textContent.trim()));
  // add a file → upload with a progress bar
  await A.page.evaluate(() => { window.__maxUp = 0; setInterval(() => { for (const k in R2.up) window.__maxUp = Math.max(window.__maxUp, R2.up[k] + 0.0001); }, 5); });
  const id1 = await addAudio(A.page, "播客一");
  await A.page.waitForFunction(id => { const it = S.gen.listen.find(x => x.id === id); return it && it.r2; }, id1, { timeout: 15000 });
  const it1 = await A.page.evaluate(id => S.gen.listen.find(x => x.id === id), id1);
  const obj = R2S.objs.get(it1.r2.key);
  ok(obj && Buffer.compare(obj.body, MP3) === 0 && obj.type === "audio/mpeg", "upload: the file's exact bytes are in R2 at " + it1.r2.key);
  ok(await A.page.evaluate(() => window.__maxUp > 0), "upload showed a progress bar");
  ok(!it1.r2want && it1.r2.size === MP3.length, "item records the cloud copy (size " + it1.r2.size + ")");
  ok(/In the cloud/.test(await A.page.$eval("#r2item", e => e.textContent)), "item page: 'In the cloud' + Remove button");
  ok(R2S.badSig === 0, "every R2 request so far was correctly signed (" + R2S.log.length + " requests)");
  // a failed upload waits and retries
  R2S.failPut = 1; const id2 = await addAudio(A.page, "播客二");
  await sleep(1500);
  await A.page.waitForFunction(id => S.gen.listen.find(x => x.id === id).r2, id2, { timeout: 15000 });
  const puts2 = R2S.log.filter(l => l.startsWith("PUT") && l.includes(id2)).length;
  ok(puts2 >= 2 && R2S.failPut === 0, "upload failed once (server error), was kept, retried and uploaded (" + puts2 + " attempts)");

  await A.page.evaluate(() => ghSyncNow()); await sleep(500); await A.page.evaluate(() => ghSyncNow());
  // second device: only the GitHub token; R2 keys come through sync
  const B = await dev(g, null); await connect(B.page); await sleep(1000);
  ok(await B.page.evaluate(() => !!r2Cfg() && r2Cfg().bucket === "zhongwen-audio"), "device B: R2 settings arrived through the keys file");
  await B.page.evaluate(() => setView("listen")); await sleep(800);
  ok(/Download all audio \(2, 0\.6 MB\)/.test(await B.page.evaluate(() => document.body.innerText)), "device B: 'Download all audio (2, 0.6 MB)'");
  await B.page.screenshot({ path: "r2-list.png" });
  // open one: it downloads with a bar, then plays from this device
  await B.page.evaluate(() => { window.__maxDown = 0; setInterval(() => { for (const k in R2.down) window.__maxDown = Math.max(window.__maxDown, R2.down[k] + 0.0001); }, 2); });
  await B.page.evaluate(id => { LST = { id, mode: "hide", lost: [] }; render(); }, id1);
  await B.page.waitForFunction(id => AUD_ID === id, id1, { timeout: 10000 });
  ok(await B.page.evaluate(async id => { const b = await audioGet(id); return b && b.size; }, id1) === MP3.length, "device B: opening the item downloaded it and it plays from this device");
  ok(await B.page.evaluate(() => window.__maxDown > 0), "download showed a progress bar");
  await B.page.evaluate(() => { stopAudio(); LST = null; setView("listen"); }); await sleep(600);
  await B.page.click("#r2dl");
  for (let i = 0; i < 60 && !(await B.page.evaluate(async id => !!(await audioGet(id)) && !R2_DL, id2)); i++) await sleep(250);
  ok(await B.page.evaluate(async id => !!(await audioGet(id)), id2), "Download all: the other file is on device B too");
  await sleep(500); ok(/Everything in the cloud is on this device/.test(await B.page.evaluate(() => document.body.innerText)), "list then says everything is on this device");
  // remove from cloud on A (after listening) → gone in R2, kept on A; B sees it
  await A.page.evaluate(id => { LST = { id, review: true, lost: [], looked: new Set(), quiz: false }; setView("listen"); }, id1);
  await A.page.click("#r2rmdone"); await sleep(800);
  ok(!R2S.objs.has(it1.r2.key) && await A.page.evaluate(async id => !!(await audioGet(id)) && S.gen.listen.find(x => x.id === id).r2gone, id1), "end of review → Remove from cloud: deleted from R2, still on this device");
  await A.page.evaluate(() => ghSyncNow()); await sleep(400); await B.page.evaluate(() => ghSyncNow());
  ok(await B.page.evaluate(id => { const it = S.gen.listen.find(x => x.id === id); return it.r2gone && !it.r2; }, id1), "device B learns it was removed (the item's newer version wins in the merge)");
  // delete an item → its audio leaves the cloud too (after the undo window)
  const key2 = await A.page.evaluate(id => S.gen.listen.find(x => x.id === id).r2.key, id2);
  await A.page.evaluate(id => { LST = { id, mode: "hide", lost: [] }; setView("listen"); }, id2); await sleep(300);
  await A.page.click("#ldel"); await sleep(3000);
  ok(R2S.objs.has(key2), "deleted item: still in the cloud during the undo window");
  await sleep(4000);
  ok(!R2S.objs.has(key2), "…then deleted from the cloud too");
  // delete while R2 is unreachable → retried later
  const id3 = await addAudio(A.page, "播客三"); await A.page.waitForFunction(id => S.gen.listen.find(x => x.id === id).r2, id3, { timeout: 10000 });
  const key3 = await A.page.evaluate(id => S.gen.listen.find(x => x.id === id).r2.key, id3);
  R2S.deny = true; await A.page.click("#ldel"); await sleep(7000);
  ok(R2S.objs.has(key3) && await A.page.evaluate(k => (S.r2del || []).includes(k), key3), "R2 refusing: the delete waits in a list");
  R2S.deny = false; await A.page.evaluate(() => r2Kick()); await sleep(800);
  ok(!R2S.objs.has(key3) && await A.page.evaluate(() => !(S.r2del || []).length), "…and goes through on the next try");
  // wrong key → clear message
  await A.page.evaluate(() => setView("me")); await A.page.fill("#r2sk", "WRONG"); await A.page.click("#r2save"); await sleep(1500);
  ok(/refused the key/.test(await A.page.$eval("#r2st", e => e.textContent)), "wrong secret → 'R2 refused the key'");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
