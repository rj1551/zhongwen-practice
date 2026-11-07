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

const GEM = "https://generativelanguage.googleapis.com/v1beta/openai", GROQ = "https://api.groq.com/openai/v1";
const PROV = JSON.stringify({ base: GROQ, key: "groq-k", model: "qwen/qwen3.8-27b", keys: { [GEM]: "gem-k", [GROQ]: "groq-k" }, models: { [GROQ]: "qwen/qwen3.8-27b" }, use: true });

// mode per service: "ok" | "busy" | "daily" | "minute" | "gone" | "hang" | "down"; score given to every answer
const M = { gem: "ok", groq: "ok", score: 3, log: [], real: { gem: "gemini-3.5-flash-lite", groq: "qwen/qwen3.8-27b" } };
async function routeAI(ctx) {
  const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "content-type": "application/json" };
  for (const [id, base] of [["gem", GEM], ["groq", GROQ]]) await ctx.route(base + "/**", async route => {
    const rq = route.request(); if (rq.method() === "OPTIONS") return route.fulfill({ status: 204, headers: H });
    const body = JSON.parse(rq.postData() || "{}"), prompt = (body.messages || []).map(m => m.content).join("\n");
    const batch = /JSON array/.test(prompt), n = batch ? (prompt.match(/^\d+\. English:/gm) || []).length : 1;
    M.log.push({ id, model: body.model, batch, n, t: Date.now() });
    const mode = M[id];
    if (mode === "down") return route.abort("internetdisconnected");
    if (mode === "hang") { await sleep(20000); return route.abort("timedout").catch(() => {}); }
    if (mode === "busy") return route.fulfill({ status: 503, headers: H, body: "{}" });
    if (mode === "daily") return route.fulfill({ status: 429, headers: H, body: JSON.stringify({ error: { message: "Quota exceeded", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }) });
    if (mode === "minute") return route.fulfill({ status: 429, headers: Object.assign({ "retry-after": "20" }, H), body: JSON.stringify({ error: { message: "PerMinute quota" } }) });
    if (mode === "gone" || (mode === "aliasgone" && body.model === "gemini-flash-lite-latest")) return route.fulfill({ status: 404, headers: H, body: JSON.stringify({ error: { message: "models/x is not found" } }) });
    const one = i => ({ i, score: M.score, chunk: "ok", fixed: "改好的句子", notes: ["note from " + id] });
    const content = JSON.stringify(batch ? Array.from({ length: n }, (_, k) => one(k + 1)) : one(1));
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ model: M.real[id], choices: [{ message: { content } }] }) });
  });
}

const putFile = (g, path, content) => { const map = Object.assign({}, g.trees[g.commits[g.ref].tree]); map[path] = g.blob(content); g.ref = g.mkCommit(g.mkTree(map), [g.ref], "add " + path); };
async function answer(pg, text, id) {
  await pg.evaluate(id => { document.querySelector("#tdrill")?.remove(); const el = document.createElement("div"); el.id = "tdrill"; document.body.prepend(el); window.__res = null; renderLadder(LADDER.get(id), 5, el, r => { window.__res = r; }, () => {}); }, id);
  await pg.fill("#tdrill #ans", text); await pg.click("#tdrill #check");
  await pg.waitForFunction(() => window.__res, null, { timeout: 25000 });
}
(async () => {
  const browser = await chromium.launch();
  const g = makeGit();
  const ctx = await browser.newContext(); await routeGit(ctx, g); await routeAI(ctx);
  await ctx.addInitScript(([st, pv]) => { if (!localStorage.getItem("seeded")) { localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", st); localStorage.setItem("zwlgf:prov", pv); } }, [stateWith({}), PROV]);
  const pg = await ctx.newPage(); pg.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await pg.goto(URL0); await pg.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await connect(pg); await sleep(1000);
  const ids = ["L01", "L02", "L03", "L05", "L06", "L09", "L10", "L11", "L12", "L16", "L18", "L20"];
  for (const [i, id] of ids.entries()) { M.score = i < 6 ? 3 : 2; await answer(pg, "测试答案" + i, id); await sleep(1100); }
  const mg = await pg.evaluate(() => S.mg.map(x => [x.id, x.by, x.real, x.score].join("|")));
  ok(mg.length === 12 && mg[0] === "L01|Gemini flash-lite-latest|gemini-3.5-flash-lite|3", "every model grade recorded, with the model behind the alias: " + mg[0]);
  // ask Claude on one → not in the sample
  await pg.evaluate(() => { const b = askClaudeButton("L20", "测试答案11", "Gemini flash-lite-latest", 2); b.click(); });
  await sleep(1800); await pg.evaluate(() => ghSyncNow()); await sleep(1800); await pg.evaluate(() => SYNCQ); await pg.evaluate(() => ghSyncNow());
  const ob = JSON.parse(g.files()["outbox.json"]), checks = ob.requests.filter(r => r.kind === "check");
  ok(checks.length === 10 && !checks.some(c => c.drill === "L20") && checks.every(c => c.en && c.ref.length && c.answer && c.model), "note: 10 checks picked from 12 (the asked one left out), each with the drill + answer");
  ok(ob.requests.some(r => r.kind === "regrade" && r.drill === "L20"), "…and the 问 Claude one is a regrade request");
  // Claude's checks: 4 agree, 3 one point off, 3 big flips
  const plan = checks.map((c, i) => ({ c, score: i < 4 ? c.modelScore : i < 7 ? Math.max(0, c.modelScore - 1) : (c.modelScore >= 2 ? 0 : 3) }));
  const isBig = p => (p.score >= 2) !== (p.c.modelScore >= 2) || Math.abs(p.score - p.c.modelScore) >= 2;
  const big = plan.filter(isBig), nChanged = plan.filter(p => p.score !== p.c.modelScore).length;
  const nSame = plan.filter(p => p.score === p.c.modelScore).length, nPf = plan.filter(p => (p.score >= 2) === (p.c.modelScore >= 2)).length;
  const pack = { zwpack: 1, id: "chk-1", made: new Date().toISOString(), by: "test", regrades: plan.map(p => ({ rid: p.c.rid, score: p.score, chunk: "ok", fixed: "改好的", notes: ["n"] })) };
  putFile(g, "packs/chk-1.json", JSON.stringify(pack));
  await pg.evaluate(() => ghSyncNow());
  const r = await pg.evaluate(() => ({ ag: (S.agree["Gemini flash-lite-latest"] || []).length, cs: S.ckSum, done: (S.mgDone || []).length, graded: (S.graded || []).filter(x => x.check).length, fb: (S.offfb || []).filter(x => x.k.startsWith("c:")).length }));
  ok(r.ag === 10 && r.done === 10, "10 checks recorded for Gemini");
  ok(r.cs.n === 10 && r.cs.changed === nChanged && r.cs.big === big.length, `note counts: checked 10, changed ${nChanged}, big ${big.length} (` + JSON.stringify(r.cs) + ")");
  ok(r.graded === big.length, "the big disagreements are on the results card (" + r.graded + ")");
  const passedBig = big.filter(p => p.c.modelScore >= 2).length;
  ok(r.fb === passedBig, "feedback cards for big ones the model had passed (" + r.fb + "/" + passedBig + ")");
  const e4 = await pg.evaluate(p => p.map(x => { const k = x.c.rid.slice(2), m = S.mg.find(y => y.k === k), e = S.items[m.id].h.find(e => Math.abs(e[0] - m.at) <= 5); const v = e[4] || e[2]; return Array.isArray(v) ? v[0] : v; }), plan);
  console.log("INFO log vs Claude:", JSON.stringify(e4), JSON.stringify(plan.map(p => p.score)));
  ok(JSON.stringify(e4.map(Number)) === JSON.stringify(plan.map(p => p.score)), "the schedule follows Claude for every check (log grades = Claude's)");
  await pg.evaluate(() => setView("home"));
  const home = await pg.evaluate(() => document.body.innerText);
  ok(/checked 10 of Gemini flash-lite-latest's grades and changed ${nChanged}/.test(home) || new RegExp("changed " + nChanged).test(home), "home: brief note 'Claude checked 10 … changed N'");
  await pg.screenshot({ path: "check-home.png" });
  await pg.evaluate(() => setView("me"));
  const card = await pg.$eval("#provcard", e => e.textContent);
  ok(new RegExp("same score\\s*" + nSame + "/10").test(card) && new RegExp("same pass/fail\\s*" + nPf + "/10").test(card), `Another AI card: agreement line (same score ${nSame}/10, pass/fail ${nPf}/10)`);
  ok(await pg.evaluate(() => !S.nudge), "no nudge yet (fewer than 30 checks)");
  // low agreement over 30 → nudge
  await pg.evaluate(() => { const a = S.agree["Gemini flash-lite-latest"]; for (let i = 0; i < 20; i++) a.push([Date.now() - 1000 + i, 3, i < 4 ? 0 : 3]); save(); });
  await pg.evaluate(() => { S.mg.push({ k: "L30:1", id: "L30", at: 1, raw: "x", by: "Gemini flash-lite-latest", real: "gemini-3.5-flash-lite", score: 3, chunk: "ok", t: Date.now() }); applyCheck({ rid: "c:L30:1", score: 0, chunk: "ok", notes: [] }, { bad: 0, ck: 0 }); save(); setView("home"); });
  const nd = await pg.evaluate(() => S.nudge);
  ok(nd && nd.kind === "low" && nd.pct < 80, "agreement below 80% over the last 30 → nudge (" + (nd && nd.pct) + "%)");
  ok(/Time to re-compare/i.test(await pg.evaluate(() => document.body.innerText)), "home shows the nudge");
  await pg.click("#nudge-ok"); ok(await pg.evaluate(() => S.nudge.seen), "Got it dismisses it");
  // the model behind the alias changes
  M.real.gem = "gemini-3.7-flash-lite"; M.score = 3; await answer(pg, "新模型的答案", "L40");
  const nd2 = await pg.evaluate(() => S.nudge);
  ok(nd2 && nd2.kind === "model" && nd2.from === "gemini-3.5-flash-lite" && nd2.to === "gemini-3.7-flash-lite" && !nd2.seen, "model behind the alias changed → nudge (" + nd2.from + " → " + nd2.to + ")");
  // no checks when there are no recent grades
  await pg.evaluate(() => { S.mg.forEach(x => x.t -= 3 * 864e5); save(); });
  ok(await pg.evaluate(() => checkRequests().length === 0), "no recent grades → no checks in the note (the run can stop early)");
  // second device
  await pg.evaluate(() => ghSyncNow());
  const B = await device(browser, g, null, null); await connect(B.page); await sleep(800);
  ok(await B.page.evaluate(() => (S.agree["Gemini flash-lite-latest"] || []).length === 31 && S.mgDone.length >= 10 && S.packLog.length === 1), "device B: same agreement record, pack applied once");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
