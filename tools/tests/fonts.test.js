// v112: the app's own fonts (data/fonts) are saved with the app by the service worker (DATA store, kept across
// releases), so they're there offline from the first start — no Google Fonts. Own server on 8792; needs ./build.sh.
const PW = process.env.PLAYWRIGHT || "playwright";
const { chromium } = require(PW);
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../..");
const site = fs.mkdtempSync(path.join(os.tmpdir(), "zw-fonts-"));
execSync(`cp -r "${REPO}/docs/." "${site}/"`);
const idx = path.join(site, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(' && location.protocol === "https:") {', ") {"));
execSync(`python3 "${REPO}/tools/csp.py" "${idx}"`);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".png": "image/png", ".woff": "font/woff" };
const hits = {};
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; hits[p] = (hits[p] || 0) + 1; fs.readFile(path.join(site, p), (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream"); r.setHeader("Cache-Control", "no-store"); r.end(b); }); }).listen(8792);
const B = "http://localhost:8792/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(); let outside = 0;
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => { outside++; route.abort(); });
  const pg = await ctx.newPage();
  try {
    await pg.goto(B); await pg.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
    await pg.waitForFunction(() => caches.open("zwlgf-data-1").then(c => c.match("data/fonts/NotoSerifSC-500.woff")).then(r => !!r), null, { timeout: 30000 }).catch(() => {});
    ok(await pg.evaluate(async () => { const c = await caches.open("zwlgf-data-1"); return !!(await c.match("data/fonts/NotoSerifSC-500.woff")) && !!(await c.match("data/fonts/NotoSerifSC-700.woff")) && !!(await c.match("data/fonts/Figtree.woff")); }), "installing the app saves its fonts (in the store that's kept across releases)");
    // straight into airplane mode, a cold start
    await ctx.setOffline(true);
    await pg.reload(); await pg.waitForFunction(() => !document.querySelector("#tabs").hidden, null, { timeout: 20000 });
    const f = await pg.evaluate(async () => { await document.fonts.load('500 20px "Noto Serif SC"', "练功房"); await document.fonts.load('700 20px "Noto Serif SC"', "练"); await document.fonts.load('16px "Figtree"', "Ab"); return [document.fonts.check('500 20px "Noto Serif SC"', "练功房"), document.fonts.check('700 20px "Noto Serif SC"', "练"), document.fonts.check('16px "Figtree"', "Ab"), [...document.fonts].filter(x => x.status === "loaded").map(x => x.family + " " + x.weight)]; });
    ok(f[0] && f[1] && f[2], "offline from a cold start: Noto Serif SC (500, 700) and Figtree load from the saved copy " + JSON.stringify(f[3]));
    ok(outside === 0, "no Google Fonts requests at all");
    await ctx.setOffline(false);
  } catch (e) { ok(false, "error " + e); }
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); process.exit(fails ? 1 : 0);
})();
