// v68: two offline stores. The app store (CACHE) is renewed every release; the big files (dictionary, 简/繁 table)
// live in DATA and are downloaded again only when DATA's number changes. Upgrading from the old one-store layout
// copies them over instead of downloading. Own server on 8791 (counts requests); needs ./build.sh first.
const PW = process.env.PLAYWRIGHT || "playwright";
const { chromium } = require(PW);
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../..");
const site = fs.mkdtempSync(path.join(os.tmpdir(), "zw-cache-"));
execSync(`cp -r "${REPO}/docs/." "${site}/"`);
// the service worker only registers on https: drop that check for the local server
const idx = path.join(site, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(' && location.protocol === "https:") {', ") {"));
execSync(`python3 "${REPO}/tools/csp.py" "${idx}"`); // patched script → fresh script-lock fingerprint
const NEW_SW = fs.readFileSync(path.join(site, "sw.js"), "utf8");
const CUR = /const CACHE = "zwlgf-v(\d+)"/.exec(NEW_SW)[1], V = n => "zwlgf-v" + n, NOW = V(CUR), NEXT = V(+CUR + 1), NEXT2 = V(+CUR + 2);
const DATA = /const DATA = "([^"]+)"/.exec(NEW_SW)[1], DATA2 = DATA.replace(/\d+$/, n => +n + 1);
const OLD_SW = fs.readFileSync(path.join(__dirname, "fixtures/sw-v67.js"), "utf8"); // v67 (commit 6c92580): one store, dictionary inside
const hits = {}; const count = f => hits[f] || 0;
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".png": "image/png" };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html";
  hits[p] = (hits[p] || 0) + 1;
  fs.readFile(path.join(site, p), (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream"); r.setHeader("Cache-Control", "no-store"); r.end(b); });
}).listen(8791);
const B = "http://localhost:8791/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const keys = pg => pg.evaluate(() => caches.keys());
async function release(pg, sw, want) {
  fs.writeFileSync(path.join(site, "sw.js"), sw);
  await pg.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r && r.update()));
  for (let i = 0; i < 100; i++) { const k = await keys(pg); if (want.every(x => k.includes(x)) && k.length === want.length) return k; await pg.waitForTimeout(200); }
  return keys(pg);
}
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(); const pg = await ctx.newPage();
  try {
    // 1. a device on v67 (one store with the dictionary in it)
    fs.writeFileSync(path.join(site, "sw.js"), OLD_SW);
    await pg.goto(B); await pg.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
    for (let i = 0; i < 100 && !(await keys(pg)).includes("zwlgf-v67"); i++) await pg.waitForTimeout(200);
    const hadOld = await pg.evaluate(async () => !!(await (await caches.open("zwlgf-v67")).match("data/cedict.txt")));
    ok(hadOld, "v67 device: dictionary saved in the app store");
    // 2. upgrade to v68: dictionary copied into DATA, not downloaded again
    const before = count("/data/cedict.txt"), beforeZ = count("/data/zhconv.txt");
    let k = await release(pg, NEW_SW, [NOW, DATA]);
    ok(k.length === 2 && k.includes(NOW) && k.includes(DATA), `upgrade: stores are now ${JSON.stringify(k)}`);
    ok(count("/data/cedict.txt") === before && count("/data/zhconv.txt") === beforeZ, `upgrade: dictionary and 简/繁 table not downloaded again (${count("/data/cedict.txt") - before} requests)`);
    const sizes = await pg.evaluate(async (DATA) => { const c = await caches.open(DATA); return Promise.all(["data/cedict.txt", "data/zhconv.txt"].map(async f => { const r = await c.match(f); return r ? (await r.blob()).size : 0; })); }, DATA);
    ok(sizes[0] > 5e6 && sizes[1] > 1e5, `upgrade: both big files are in DATA (${sizes.join(", ")} bytes)`);
    const inApp = await pg.evaluate(async (n) => !!(await (await caches.open(n)).match("data/cedict.txt")), NOW);
    ok(!inApp, "upgrade: the app store no longer holds the dictionary");
    // 3. an ordinary next release: app store renewed, DATA kept, no big download
    const b2 = count("/data/cedict.txt"), i2 = count("/index.html");
    k = await release(pg, NEW_SW.replace(`"${NOW}"`, `"${NEXT}"`), [NEXT, DATA]);
    ok(k.includes(NEXT) && !k.includes(NOW) && k.includes(DATA), `next release: ${JSON.stringify(k)}`);
    ok(count("/data/cedict.txt") === b2 && count("/index.html") > i2, "next release: the app is downloaded, the dictionary isn't");
    // 4. offline: the dictionary is served from DATA
    await ctx.setOffline(true);
    const off = await pg.evaluate(() => fetch("data/cedict.txt").then(r => r.text()).then(t => t.length, () => -1));
    ok(off > 5e6, `offline: the dictionary still loads (${off} characters)`);
    await ctx.setOffline(false);
    // 5. the dictionary changed (DATA bumped): downloaded once, old DATA removed
    const b3 = count("/data/cedict.txt");
    k = await release(pg, NEW_SW.replace(`"${NOW}"`, `"${NEXT2}"`).replace(`"${DATA}"`, `"${DATA2}"`), [NEXT2, DATA2]);
    ok(k.includes(DATA2) && !k.includes(DATA), `DATA bumped: ${JSON.stringify(k)}`);
    ok(count("/data/cedict.txt") === b3 + 1, `DATA bumped: dictionary downloaded once (${count("/data/cedict.txt") - b3})`);
    // 6. the page's own fetch of the dictionary refreshes DATA, not the app store
    await pg.evaluate(() => fetch("data/cedict.txt").then(r => r.text()));
    await pg.waitForTimeout(500);
    const where = await pg.evaluate(async ([a, d]) => ({ app: !!(await (await caches.open(a)).match("data/cedict.txt")), data: !!(await (await caches.open(d)).match("data/cedict.txt")) }), [NEXT2, DATA2]);
    ok(!where.app && where.data, "a fresh copy fetched by the page goes to DATA");
  } catch (e) { console.log("ERROR", e); fails++; }
  await br.close(); srv.close(); fs.rmSync(site, { recursive: true, force: true });
  console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
