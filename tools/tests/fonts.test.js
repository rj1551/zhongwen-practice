// v111: Google Fonts kept for offline by the service worker (store zwlgf-fonts-1, kept across releases). The font
// hosts are faked with a route. Own server on 8792; needs ./build.sh first.
const PW = process.env.PLAYWRIGHT || "playwright";
const { chromium } = require(PW);
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../..");
const site = fs.mkdtempSync(path.join(os.tmpdir(), "zw-fonts-"));
execSync(`cp -r "${REPO}/docs/." "${site}/"`);
const idx = path.join(site, "index.html");
fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace(' && location.protocol === "https:") {', ") {"));
execSync(`python3 "${REPO}/tools/csp.py" "${idx}"`);
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain", ".png": "image/png" };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split("?")[0]); if (p.endsWith("/")) p += "index.html"; fs.readFile(path.join(site, p), (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream"); r.setHeader("Cache-Control", "no-store"); r.end(b); }); }).listen(8792);
const B = "http://localhost:8792/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const CSS = "@font-face{font-family:'Noto Serif SC';src:url(https://fonts.gstatic.com/s/notoserifsc/v1/test.woff2) format('woff2');}";
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext(); let fontHits = 0, fileHits = 0;
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => { fontHits++; const u = route.request().url(); if (/gstatic/.test(u)) fileHits++; route.fulfill(/googleapis/.test(u) ? { status: 200, contentType: "text/css", headers: { "access-control-allow-origin": "*" }, body: CSS } : { status: 200, contentType: "font/woff2", headers: { "access-control-allow-origin": "*" }, body: Buffer.from("wOF2fake") }); });
  const pg = await ctx.newPage();
  try {
    await pg.goto(B); await pg.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
    await pg.reload(); await pg.waitForFunction(() => !document.querySelector("#tabs").hidden);
    const css = await pg.evaluate(() => document.querySelector("#fontcss").href);
    await pg.evaluate(async h => { await fetch(h, { mode: "no-cors" }); await fetch("https://fonts.gstatic.com/s/notoserifsc/v1/test.woff2", { mode: "cors" }); }, css);
    await pg.waitForFunction(() => caches.keys().then(k => k.includes("zwlgf-fonts-1")), null, { timeout: 10000 }).catch(() => {});
    const k = await pg.evaluate(() => caches.keys());
    ok(k.includes("zwlgf-fonts-1"), "online: the fonts are saved in their own store (" + k.join(", ") + ")");
    await ctx.setOffline(true); const h0 = fileHits;
    const off = await pg.evaluate(async h => { try { const a = await fetch(h, { mode: "no-cors" }); const b = await fetch("https://fonts.gstatic.com/s/notoserifsc/v1/test.woff2", { mode: "cors" }); return [a.type === "opaque" || a.ok, b.ok]; } catch (e) { return [false, false, String(e)]; } }, css);
    ok(off[0] && off[1] && fileHits === h0, "offline: the font list and the font file come from the saved copy (the file isn't asked for again) " + JSON.stringify(off));
    await ctx.setOffline(false);
  } catch (e) { ok(false, "error " + e); }
  await br.close(); srv.close();
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED"); process.exit(fails ? 1 : 0);
})();
