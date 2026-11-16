// "新版本已下载 · New version ready": after a slow open shows the saved version, the late download offers a switch.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const fs = require("fs"), B = "http://localhost:8790/", F = "/home/claude/tests/site/index.html";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const mode = async m => (await fetch(B + "__mode/" + m)).text();
const line = pg => pg.evaluate(() => !!document.querySelector("#updline"));
const ready = pg => pg.waitForFunction(() => { const t = document.querySelector("#tabs"); return t && !t.hidden; }, null, { timeout: 20000 });
(async () => {
  const orig = fs.readFileSync(F, "utf8"); const cur = /const APP_VERSION = "([^"]+)"/.exec(orig)[1];
  const br = await chromium.launch(); const ctx = await br.newContext(); const pg = await ctx.newPage();
  try {
    await mode("ok"); await pg.goto(B); await pg.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 }).catch(() => {});
    await pg.reload(); await ready(pg); await pg.waitForTimeout(3000);
    ok(!(await line(pg)), "online, same version: no notice");
    // a new version on the server, slow connection
    const NEW = cur.replace(/·.*/, "· 12/31 23:59");
    fs.writeFileSync(F, orig.replace(`const APP_VERSION = "${cur}"`, `const APP_VERSION = "${NEW}"`));
    await mode("slow"); await pg.goto(B, { timeout: 30000 }); await ready(pg);
    ok(await pg.evaluate(() => APP_VERSION) === cur, "slow: opens the saved version");
    ok(!(await line(pg)), "slow: no notice before the new version has arrived");
    await pg.waitForFunction(() => !!document.querySelector("#updline"), null, { timeout: 15000 }).catch(() => {});
    ok(await line(pg), "slow: notice appears once the new version is saved");
    // not mid-card
    await pg.evaluate(() => startSession()); await pg.waitForTimeout(300);
    ok(await pg.evaluate(() => busyView()) && !(await line(pg)), "practice in progress: notice hidden");
    await pg.evaluate(() => { SESSION = null; setView("home"); }); await pg.waitForTimeout(200);
    ok(await line(pg), "back home: notice shows again");
    // ✕ hides it
    await pg.click("#upd-x"); await pg.evaluate(() => setView("me")); await pg.waitForTimeout(200);
    ok(!(await line(pg)), "✕: hidden for this version (other screens too)");
    await pg.evaluate(() => { UPD.hide = null; setView("home"); });
    // switch
    await mode("ok"); await Promise.all([pg.waitForNavigation({ timeout: 20000 }), pg.click("#upd-go")]); await ready(pg);
    ok(await pg.evaluate(() => APP_VERSION) === NEW, "切换 Switch: the new version is running");
    await pg.waitForTimeout(2500); ok(!(await line(pg)), "after switching: no notice");
    // an older saved page never offers a 'switch' backwards
    await pg.evaluate(async (old) => { const c = await caches.open((await caches.keys())[0]); const r = await c.match(location.href);
      await c.put(location.href, new Response((await r.text()).replace(/const APP_VERSION = "[^"]+"/, `const APP_VERSION = "${old}"`), { headers: { "Content-Type": "text/html" } })); }, cur.replace(/v(\d+)/, (m, n) => "v" + (n - 1)));
    await pg.evaluate(() => checkUpdate()); await pg.waitForTimeout(300);
    ok(!(await line(pg)), "older saved copy: no notice");
  } finally { fs.writeFileSync(F, orig); await mode("ok"); await br.close(); }
  console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
