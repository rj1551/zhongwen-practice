// v69: the script lock (Content-Security-Policy with the fingerprint of the page's own script, tools/csp.py).
// The app runs with no violations; code smuggled into the page doesn't run; what the app needs still works; a stale
// fingerprint stops the app (so the tests catch a build that forgot csp.py). 8765 server + its own server on 8792.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const B = process.env.SITE || "http://localhost:8765/";
const REPO = path.resolve(__dirname, "../..");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const ready = (pg, ms = 15000) => pg.waitForFunction(() => { const t = document.querySelector("#tabs"); return t && !t.hidden; }, null, { timeout: ms }).then(() => true, () => false);
(async () => {
  const br = await chromium.launch();
  try {
    const ctx = await br.newContext(); const pg = await ctx.newPage();
    await ctx.route("https://api.github.com/**", r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    await pg.addInitScript(() => { window.__v = []; document.addEventListener("securitypolicyviolation", e => window.__v.push(e.violatedDirective + " " + (e.blockedURI || e.sample || ""))); });
    await pg.goto(B);
    ok(await ready(pg), "the app starts under the lock");
    ok(/script-src 'sha256-/.test(await pg.$eval('meta[http-equiv="Content-Security-Policy"]', m => m.content)), "the built page carries the policy with a fingerprint");
    ok(await pg.$eval("#fontcss", l => l.getAttribute("onload") === null), "font link has no inline handler (switched in the script)");
    for (const v of ["read", "listen", "me", "home"]) { await pg.evaluate(v => setView(v), v); await pg.waitForTimeout(400); }
    await pg.evaluate(() => { S.placed = true; startSession(); }); await pg.waitForTimeout(500);
    await pg.evaluate(() => { SESSION = null; setView("home"); });
    const v0 = await pg.evaluate(() => window.__v.slice());
    ok(!v0.length, `normal use (every tab, a session): no violations ${v0.length ? JSON.stringify(v0) : ""}`);
    // what the app needs: https requests (GitHub etc.), audio from a file on the device (blob:)
    ok(await pg.evaluate(() => fetch("https://api.github.com/x").then(r => r.ok, () => false)), "https requests (GitHub, Gemini, R2, LRCLIB…) still allowed");
    ok(await pg.evaluate(async () => { const a = document.createElement("audio"); a.src = URL.createObjectURL(new Blob([new Uint8Array(10)], { type: "audio/mpeg" })); await new Promise(r => setTimeout(r, 300)); return !window.__v.some(x => /media/.test(x)); }), "audio from a file on the device (blob:) allowed");
    // smuggled code, as if some outside text (lyrics, a pack, a model reply) reached the page unescaped
    await pg.evaluate(() => {
      document.body.insertAdjacentHTML("beforeend", '<img src="x:" onerror="window.__pwn1=1"><svg><a id="jsl" href="javascript:window.__pwn2=1"><text>x</text></a></svg>');
      const s = document.createElement("script"); s.textContent = "window.__pwn3 = 1"; document.body.append(s);
      const e = document.createElement("script"); e.src = "https://evil.example/steal.js"; document.body.append(e);
      document.body.insertAdjacentHTML("beforeend", '<iframe src="https://evil.example/"></iframe><object data="https://evil.example/x"></object>');
    });
    await pg.evaluate(() => { const a = document.getElementById("jsl"); a.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await pg.waitForTimeout(800);
    const pw = await pg.evaluate(() => [window.__pwn1, window.__pwn2, window.__pwn3]);
    ok(!pw[0], "an injected onerror= handler doesn't run");
    ok(!pw[1], "an injected javascript: link doesn't run");
    ok(!pw[2], "an injected <script> doesn't run");
    const v1 = await pg.evaluate(() => window.__v.slice());
    ok(v1.some(x => /script-src/.test(x) && /evil\.example/.test(x)), "a script from another site is refused");
    ok(v1.some(x => /frame-src/.test(x)) && v1.some(x => /object-src/.test(x)), "frames and plugin objects are refused");
    // (Playwright's own evaluate() is exempt from the policy, so eval is checked in the policy text: without
    // 'unsafe-eval' browsers refuse eval / new Function / setTimeout("…") from the page.)
    const pol = await pg.$eval('meta[http-equiv="Content-Security-Policy"]', m => m.content), ss = (pol.match(/script-src ([^;]*)/) || [])[1] || "";
    ok(!/unsafe-eval|unsafe-inline|\*|https:|'self'/.test(ss) && /^'sha256-[A-Za-z0-9+/=]+'$/.test(ss.trim()), `scripts: only the fingerprint, no eval, no inline, no other sites (${ss})`);
    ok(await pg.evaluate(() => typeof S === "object" && typeof render === "function") && await ready(pg, 2000), "the app itself keeps working after the attempts");
    ok(!errs.filter(e => !/Content Security Policy|Refused to|net::ERR|Failed to load resource/.test(e)).length, `no other page errors ${JSON.stringify(errs.filter(e => !/Content Security Policy|Refused to|net::ERR|Failed to load resource/.test(e)))}`);
    await ctx.close();
    // a stale fingerprint (script changed after the build, csp.py not run again) stops the app; csp.py fixes it
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zw-csp-"));
    fs.copyFileSync(path.join(REPO, "docs/index.html"), path.join(dir, "index.html"));
    for (const f of ["manifest.json", "sw.js"]) fs.copyFileSync(path.join(REPO, "docs", f), path.join(dir, f));
    fs.mkdirSync(path.join(dir, "data")); for (const f of ["words.json", "content.json"]) fs.copyFileSync(path.join(REPO, "docs/data", f), path.join(dir, "data", f));
    const idx = path.join(dir, "index.html");
    fs.writeFileSync(idx, fs.readFileSync(idx, "utf8").replace("const DAY_START_MIN = 3 * 60 + 38;", "const DAY_START_MIN = 3 * 60 + 39;"));
    const srv = http.createServer((q, r) => { let p = q.url.split("?")[0]; if (p.endsWith("/")) p += "index.html"; fs.readFile(path.join(dir, p), (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader("Content-Type", p.endsWith(".html") ? "text/html" : p.endsWith(".js") ? "text/javascript" : "application/json"); r.end(b); }); }).listen(8792);
    const c2 = await br.newContext(); const p2 = await c2.newPage();
    await p2.goto("http://localhost:8792/");
    ok(!(await ready(p2, 4000)) && await p2.evaluate(() => typeof S === "undefined"), "stale fingerprint: the app doesn't start (the build must run csp.py)");
    execFileSync("python3", [path.join(REPO, "tools/csp.py"), idx]);
    await p2.goto("http://localhost:8792/");
    ok(await ready(p2) && await p2.evaluate(() => DAY_START_MIN === 219), "after csp.py: the changed script runs");
    await c2.close(); srv.close(); fs.rmSync(dir, { recursive: true, force: true });
    // the build refuses markup with inline handlers, which the lock would silently block
    const bad = path.join(os.tmpdir(), "zw-csp-bad.html");
    fs.writeFileSync(bad, '<!doctype html><html><head><meta charset="utf-8"></head><body><button onclick="go()">x</button><script>1</script></body></html>');
    let refused = false; try { execFileSync("python3", [path.join(REPO, "tools/csp.py"), bad], { stdio: "pipe" }); } catch (e) { refused = /inline event handler/.test(String(e.stderr)); }
    ok(refused, "csp.py refuses a page with an inline onclick= (instead of shipping a button that silently does nothing)");
    fs.rmSync(bad, { force: true });
  } catch (e) { console.log("ERROR", e); fails++; }
  await br.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
