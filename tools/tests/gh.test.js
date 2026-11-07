// GitHub sync tests against a fake GitHub (in-memory git with fast-forward checks), two browser "devices".
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const crypto = require("crypto");
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

(async () => {
  const browser = await chromium.launch();
  // ---- 1. first device into a repo with only a README ----
  let g = makeGit();
  const A = await device(browser, g, stateWith({ L01: { t: "lad", n: 1, h: [[T - 900, 5, 3]] }, N01: { t: "sen", n: 1, due: 5 } }, { 怠慢: { w: "怠慢", t: 1 } }),
    JSON.stringify({ base: "https://api.groq.com/openai/v1", key: "groq-KEY", model: "qwen/qwen3.8-27b", use: true, keys: { "https://generativelanguage.googleapis.com/v1beta/openai": "gem-KEY" }, models: {} }));
  await connect(A.page);
  let f = g.files();
  ok(Object.keys(f).some(p => p === "progress/state.json"), "A: progress/state.json written");
  ok(repoItems(g) === "L01,N01", "A: items in repo = " + repoItems(g));
  ok(JSON.parse(JSON.parse(f["progress/state.json"]) && f["progress/state.json"]).bank["怠慢"], "A: saved word in state.json");
  const kf = f["settings/keys.json"] && JSON.parse(f["settings/keys.json"]);
  ok(kf && kf.prov.keys["https://api.groq.com/openai/v1"] === "groq-KEY" && kf.prov.keys["https://generativelanguage.googleapis.com/v1beta/openai"] === "gem-KEY", "A: keys file uploaded");
  ok(g.count() === 2, "A: one commit for the whole first sync (commits " + g.count() + ")");
  ok(!JSON.stringify(f).includes('"token"') && !f["progress/state.json"].includes("good"), "token not in any file");
  ok(await A.page.$eval("#ghcard", e => /已同步/.test(e.textContent)), "A: card says synced");
  await A.page.screenshot({ path: "/home/claude/tests/ghcard-A.png", fullPage: false });
  const exp = await A.page.evaluate(() => JSON.stringify(S)); ok(!exp.includes("groq-KEY") && !exp.includes("good"), "keys/token not in progress (so not in codes)");

  // ---- 2. second device, fresh, different local work ----
  const B = await device(browser, g, stateWith({ L02: { t: "lad", n: 1, h: [[T - 800, 5, 2]] } }), null);
  await connect(B.page);
  ok(await items(B.page) === "L01,L02,N01", "B: has A's items merged with its own: " + await items(B.page));
  ok(repoItems(g) === "L01,L02,N01", "repo has the union: " + repoItems(g));
  const bp = await B.page.evaluate(() => provGet());
  ok(bp.key === "groq-KEY" && bp.model === "qwen/qwen3.8-27b" && bp.use === true && bp.keys["https://generativelanguage.googleapis.com/v1beta/openai"] === "gem-KEY", "B: AI keys filled in from the repo");
  ok(await B.page.$eval("#pvkey", e => e.value) === "groq-KEY", "B: Another AI card shows the key");
  await sleep(5000); await B.page.evaluate(() => SYNCQ); await A.page.evaluate(() => SYNCQ);
  const commitsAfterB = g.count();

  // ---- 3. automatic write ~15 s after an answer; A picks it up on Sync now ----
  await addItem(B.page, "L03");
  await sleep(8000); ok(g.count() === commitsAfterB, "B: nothing written 8 s after the answer");
  await sleep(9500); ok(repoItems(g).includes("L03"), "B: written ~15 s after the answer");
  await syncNow(A.page); ok((await items(A.page)).includes("L03"), "A: Sync now brings in B's answer");

  // ---- 4. leaving the app writes at once ----
  await addItem(A.page, "L04");
  await A.page.evaluate(() => { Object.defineProperty(document, "hidden", { value: true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); });
  await sleep(2500); ok(repoItems(g).includes("L04"), "A: putting the app away writes right away");
  await A.page.evaluate(() => { Object.defineProperty(document, "hidden", { value: false, configurable: true }); });

  // ---- 5. both devices write at the same moment ----
  await addItem(A.page, "L05"); await addItem(B.page, "L06");
  g.patchDelay = 600; const c0 = g.conflicts;
  await Promise.all([syncNow(A.page), syncNow(B.page)]);
  g.patchDelay = 0;
  ok(g.conflicts > c0, "simultaneous write: GitHub refused one (" + (g.conflicts - c0) + " conflict)");
  ok(repoItems(g).includes("L05") && repoItems(g).includes("L06"), "simultaneous write: repo has both answers: " + repoItems(g));
  await syncNow(A.page); await syncNow(B.page);
  ok(await items(A.page) === await items(B.page), "both devices end with the same items: " + await items(A.page));

  // ---- 6. offline: answers wait, go up on reconnect ----
  g.down = true; await A.ctx.setOffline(true);
  await addItem(A.page, "L07"); await A.page.evaluate(() => ghSyncNow());
  ok(!repoItems(g).includes("L07"), "offline: nothing reaches the repo");
  ok(await A.page.evaluate(() => { setView("me"); return /离线中|Offline/.test(document.querySelector("#ghcard").textContent); }), "offline: card says it will sync when back online");
  g.down = false; await A.ctx.setOffline(false);
  await sleep(4000); await A.page.evaluate(() => SYNCQ);
  ok(repoItems(g).includes("L07"), "back online: the waiting answer was written");

  // ---- 7. reload reads ----
  await addItem(A.page, "L08"); await syncNow(A.page);
  await B.page.reload(); await B.page.waitForFunction(() => !document.querySelector("#tabs").hidden); await sleep(2500); await B.page.evaluate(() => SYNCQ);
  ok((await items(B.page)).includes("L08"), "B: a refresh reads the repo");

  // ---- 8. key changed on B reaches A ----
  await B.page.evaluate(() => setView("me"));
  await B.page.click('[data-pv="https://generativelanguage.googleapis.com/v1beta/openai"]');
  await B.page.fill("#pvkey", "gem-NEW"); await B.page.$eval("#pvkey", e => e.dispatchEvent(new Event("change")));
  await sleep(4500); await B.page.evaluate(() => SYNCQ);
  ok(JSON.parse(g.files()["settings/keys.json"]).prov.keys["https://generativelanguage.googleapis.com/v1beta/openai"] === "gem-NEW", "B: changed key uploaded");
  await syncNow(A.page);
  const ap = await A.page.evaluate(() => provGet());
  ok(ap.keys["https://generativelanguage.googleapis.com/v1beta/openai"] === "gem-NEW" || (ap.base.includes("generativelanguage") && ap.key === "gem-NEW"), "A: picked up the new Gemini key");
  const n8 = g.count(); await syncNow(A.page); await syncNow(B.page);
  ok(g.count() === n8, "no empty commits when nothing changed");

  // ---- 9. token revoked: practice continues, home card, no loop ----
  g.tokens.delete("good");
  await addItem(A.page, "L09"); await syncNow(A.page);
  const n9 = g.log.length; await sleep(20000);
  ok(g.log.length - n9 <= 2, "revoked token: no retry loop (" + (g.log.length - n9) + " requests in 20 s)");
  ok(await A.page.evaluate(() => { setView("home"); return !!document.querySelector("#gh-fix"); }), "revoked token: home card says sync stopped");
  ok(await A.page.evaluate(() => !!S.items.L09 && JSON.parse(localStorage.getItem("zwlgf:state:v1")).items.L09), "revoked token: answer kept on the device");
  await A.page.screenshot({ path: "/home/claude/tests/gh-home-stopped.png" });
  g.tokens.add("good2");
  await A.page.click("#gh-fix"); await A.page.click("#ghtoken"); await connect(A.page, "good2");
  ok(repoItems(g).includes("L09") && !(await A.page.evaluate(() => !!document.querySelector("#gh-fix"))), "new token: sync resumes, waiting answer written");

  // ---- 10. connect errors ----
  const g2 = makeGit({ private: false }); const C = await device(browser, g2, null, null);
  await C.page.evaluate(() => setView("me")); await C.page.fill("#ghtok", "good"); await C.page.click("#ghgo");
  await C.page.waitForFunction(() => !GH.connecting);
  ok(/public/.test(await C.page.$eval("#ghcard", e => e.textContent)) && !Object.keys(g2.files()).some(p => p.startsWith("progress")), "public repo refused, nothing written");
  await C.page.fill("#ghtok", "wrong"); await C.page.click("#ghgo"); await C.page.waitForFunction(() => !GH.connecting);
  ok(/refused the token/.test(await C.page.$eval("#ghcard", e => e.textContent)), "bad token: clear message");
  // ---- 11. a truly empty repo ----
  const g3 = makeGit({ empty: true }); const D = await device(browser, g3, stateWith({ L01: { t: "lad", n: 1, h: [[T, 5, 3]] } }), null);
  await connect(D.page); await sleep(500); await D.page.evaluate(() => SYNCQ);
  ok(repoItems(g3) === "L01", "empty repo: first commit made, progress written: " + repoItems(g3));
  // ---- 12. disconnect ----
  await D.page.evaluate(() => setView("me")); await D.page.click("#ghoff"); await D.page.click("#ghoff");
  ok(await D.page.evaluate(() => !localStorage.getItem("zwlgf:gh") && !!S.items.L01 && !!document.querySelector("#ghtok")), "disconnect: token forgotten, progress kept");
  // ---- 13. leaving the app with a prepared commit sends one request (real tab-close checked in keepalive.test.js) ----
  const g4 = makeGit(); const E = await device(browser, g4, stateWith({ L01: { t: "lad", n: 1, h: [[T, 5, 3]] } }), null);
  await connect(E.page);
  await addItem(E.page, "L50"); await sleep(2500);
  ok(g4.log.slice(-2).join() === "POST /repos/rj1551/zhongwen-data/git/trees,POST /repos/rj1551/zhongwen-data/git/commits", "commit prepared ~1.5 s after the answer");
  const req0 = g4.log.length;
  await E.page.evaluate(() => dispatchEvent(new PageTransitionEvent("pagehide"))); await sleep(800);
  ok(repoItems(g4).includes("L50") && g4.log.slice(req0).join() === "PATCH /repos/rj1551/zhongwen-data/git/refs/heads/main", "leaving: one request, answer in the repo");
  await sleep(16000); ok(g4.log.length - req0 <= 2, "no duplicate write afterwards (" + (g4.log.length - req0) + " requests)");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
