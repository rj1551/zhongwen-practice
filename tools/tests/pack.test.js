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


const drill = (en, zh) => ({ en, zh, alt: [], cx: ["甲", "乙", "丙"], bad: ["错句一", "错句二"], why: "because", tag: "chunk" });
const PACK = { zwpack: 1, id: "2026-11-07", made: "2026-11-07T08:40:00Z", by: "test",
  ladder: [drill("He finally arrived.", "他|[终于]|到了|。"), drill("It rained after all.", "结果|[还是]|下雨了|。"), { en: "broken", zh: "no brackets" }],
  sen: [{ s: "据|统计|，|出口|增长|6%|。", q: "What?", opts: ["a", "b", "c", "d"], frames: [["据…统计", "according to stats"]], ft: [null, 0, 0, null] }, { s: "截至|发稿|时|，|无人|伤亡|。", q: "What?", opts: ["a", "b", "c", "d"] }],
  passages: [{ kind: "news", title: "测试短文", paras: ["今天|天气|很|好|。", "我们|去|公园|。"], gl: {}, en: "Test.", qs: [{ q: "Q1", opts: ["a", "b", "c", "d"], why: ["1", "2", "3", "4"] }, { q: "Q2", opts: ["a", "b", "c", "d"] }] }] };
const putFile = (g, path, content) => { const map = Object.assign({}, g.trees[g.commits[g.ref].tree]); map[path] = g.blob(content); g.ref = g.mkCommit(g.mkTree(map), [g.ref], "add " + path); };
const genCounts = pg => pg.evaluate(() => ({ lad: S.gen.ladder.length, sen: S.gen.sen.length, psg: S.gen.passages.length, done: (S.packsDone || []).join(), log: (S.packLog || []).length, ladIds: S.gen.ladder.map(x => x.id).join() }));
(async () => {
  const browser = await chromium.launch();
  const g = makeGit();
  const A = await device(browser, g, stateWith({ L01: { t: "lad", n: 1, h: [[T, 5, 3]] } }), null);
  await connect(A.page); await sleep(1500); await A.page.evaluate(() => ghSyncNow());
  const ob = g.files()["outbox.json"] && JSON.parse(g.files()["outbox.json"]);
  ok(ob && ob.v === 1 && ob.target.mode === "ahead" && ob.target.days === 14 && ob.short && ob.hints && Array.isArray(ob.hints.forgottenWords), "outbox.json written: target 14 days, short " + (ob && JSON.stringify(ob.short)));
  const c0 = g.count(); await A.page.evaluate(() => ghSyncNow()); await A.page.evaluate(() => ghSyncNow());
  ok(g.count() === c0, "no new commits when nothing changed (outbox stable)");
  // a pack arrives in the repo
  putFile(g, "packs/2026-11-07.json", JSON.stringify(PACK));
  const before = await genCounts(A.page);
  await A.page.evaluate(() => ghSyncNow());
  const a1 = await genCounts(A.page);
  ok(a1.lad - before.lad === 2 && a1.sen - before.sen === 2 && a1.psg - before.psg === 1, "pack applied: +2 drills (1 malformed skipped), +2 sentences, +1 passage");
  ok(a1.done === "2026-11-07" && /K20261107-L0/.test(a1.ladIds), "recorded as done; ids made from the pack id");
  ok(await A.page.evaluate(() => S.packLog[0].bad === 1 && S.packLog[0].src === "repo"), "pack log notes 1 malformed piece");
  ok(await A.page.evaluate(() => LADDER.has("K20261107-L0") && SEN.has("K20261107-S0") && PSG.has("K20261107-P0")), "new pieces usable right away");
  await A.page.evaluate(() => { const el = document.createElement("div"); el.id = "dr"; document.body.prepend(el); renderLadder(LADDER.get("K20261107-L1"), 2, el, () => {}, () => {}); });
  ok(await A.page.$$eval("#dr .opt", x => x.length) === 4, "a pack drill renders as a card");
  await A.page.evaluate(() => ghSyncNow()); const a2 = await genCounts(A.page);
  ok(a2.lad === a1.lad && a2.log === 1, "syncing again doesn't apply it twice");
  // second device: gets the content through progress, doesn't re-apply
  const B = await device(browser, g, null, null); await connect(B.page); await sleep(1000);
  const b1 = await genCounts(B.page);
  ok(b1.lad === a2.lad && b1.sen === a2.sen && b1.psg === a2.psg && b1.log === 1, "device B: same content, pack applied once overall");
  // both devices meet a new pack before seeing each other's result → no duplicates after merging
  putFile(g, "packs/2026-11-08.json", JSON.stringify(Object.assign({}, PACK, { id: "2026-11-08" })));
  await Promise.all([A.page.evaluate(() => ghSyncNow()), B.page.evaluate(() => ghSyncNow())]);
  await A.page.evaluate(() => ghSyncNow()); await B.page.evaluate(() => ghSyncNow()); await A.page.evaluate(() => ghSyncNow());
  const a3 = await genCounts(A.page), b3 = await genCounts(B.page);
  ok(a3.lad === a2.lad + 2 && b3.lad === a3.lad && new Set(a3.ladIds.split(",")).size === a3.lad, "both applied the same pack: merged without duplicates (" + a3.lad + " drills on each)");
  // paste
  await A.page.evaluate(() => setView("me"));
  await A.page.evaluate(() => document.querySelectorAll("#packcard details").forEach(d => d.open = true));
  await A.page.fill("#pk-text", "hello"); await A.page.click("#pk-go");
  ok(/isn't a pack/.test(await A.page.$eval("#pk-msg", e => e.textContent)), "pasting junk: clear message");
  await A.page.fill("#pk-text", "Here you go:\n```json\n" + JSON.stringify(Object.assign({}, PACK, { id: "chat-1" })) + "\n```"); await A.page.click("#pk-go");
  ok(/\+2 造句/.test(await A.page.$eval("#pk-msg", e => e.textContent)), "pasted pack (with chat text around it) applied: " + await A.page.$eval("#pk-msg", e => e.textContent));
  await A.page.click("#packcard summary").catch(() => {}); 
  await A.page.evaluate(() => { document.querySelector("#packcard details").open = true; });
  await A.page.fill("#pk-text", JSON.stringify(Object.assign({}, PACK, { id: "chat-1" }))); await A.page.click("#pk-go");
  ok(/already added/.test(await A.page.$eval("#pk-msg", e => e.textContent)), "pasting the same pack again: already added");
  // the card + settings → outbox
  const card = await A.page.$eval("#packcard", e => e.textContent);
  ok(/Keep/.test(card) && /Auto/.test(card) && /Last delivery/.test(card), "stock card: keep N weeks, auto minutes, last delivery");
  await A.page.selectOption("#pk-ahead", "3"); await sleep(1500); await A.page.evaluate(() => ghSyncNow()); await sleep(500); await A.page.evaluate(() => SYNCQ);
  ok(JSON.parse(g.files()["outbox.json"]).target.days === 21, "keep 3 weeks → outbox target 21 days");
  await A.page.fill("#pk-from", "2026-11-25"); await A.page.$eval("#pk-from", e => e.dispatchEvent(new Event("change")));
  await A.page.fill("#pk-to", "2026-12-15"); await A.page.$eval("#pk-to", e => e.dispatchEvent(new Event("change")));
  await sleep(1500); await A.page.evaluate(() => ghSyncNow()); await sleep(500); await A.page.evaluate(() => SYNCQ);
  const ob2 = JSON.parse(g.files()["outbox.json"]);
  ok(ob2.target.mode === "trip" && ob2.target.days === 21, "trip dates → outbox trip mode, 21 days");
  const cardEl = await A.page.$("#packcard"); await cardEl.scrollIntoViewIfNeeded(); await cardEl.screenshot({ path: "packcard.png" });
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
