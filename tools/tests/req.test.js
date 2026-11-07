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

const { execFileSync } = require("child_process"), fs = require("fs"), path = require("path");
(async () => {
  const browser = await chromium.launch();
  const g = makeGit();
  const T0 = Math.floor(Date.now() / 1000) - 600;
  const st0 = JSON.parse(stateWith({ L01: { t: "lad", n: 1, h: [[T0, 5, 3, "a"]] } }, { 测试词: { zh: "测试词", t: Date.now(), needS: true }, 有句子: { zh: "有句子", s: "这里有句子。", t: 1 } }));
  st0.gen.mine = [{ id: "M1", grp: "G1", part: 0, np: 1, title: "我的文章", paras: ["今天|天气|很好|。"], tags: [] }];
  st0.gen.listen = [{ id: "A1", title: "播客", kind: "link", url: "https://example.com", cues: [[null, "大家好，今天聊聊高铁。"], [null, "高铁很方便。"]] }];
  st0.gen.sen = [{ id: "GSx", s: "截至|发稿|时|，|无人|伤亡|。", q: "?", opts: ["a", "b", "c", "d"], frames: [["截至发稿时", "as of press time"]], ft: [null, 0, 0, 0] },
                 { id: "GSy", s: "截至|发稿|时|，|仍|在|调查|。", q: "?", opts: ["a", "b", "c", "d"] }, { id: "GSz", s: "据|统计|，|出口|增长|。", q: "?", opts: ["a", "b", "c", "d"] }];
  st0.items["F:截至发稿时"] = { t: "frag", n: 1, ok: 0, p: "截至发稿时", g: "as of press time", src: "GSx", due: Date.now() + 2 * 864e5, h: [[T0, 0, 0]] };
  const A = await device(browser, g, JSON.stringify(st0), null);
  await connect(A.page); await sleep(1500);
  const pg = A.page;
  // frag hold-back
  const fresh = await pg.evaluate(() => candidates("sen").filter(c => !c.due && !c.re).map(c => c.id));
  ok(!fresh.includes("GSy") && fresh.includes("GSz"), "a new sentence containing a structure under review is held back (fresh: " + fresh.filter(x => x.startsWith("GS")).join(",") + ")");
  ok(await pg.evaluate(() => { const r = fragSentence(S.items["F:截至发稿时"]); return r && r.id !== "GSx" && senHas(r, "截至发稿时") && heldSentences().has(r.id); }), "…and kept for that structure's review");
  // requests from the UI
  await pg.evaluate(() => { READ = { grp: "G1" }; setView("read"); });
  await pg.click("#askq"); ok(await pg.evaluate(() => reqWaiting("q:mine:M1")) && /Asked Claude for questions/.test(await pg.evaluate(() => document.body.innerText)), "own text: Ask Claude for questions → waiting, shown as asked");
  await pg.evaluate(() => addReq({ rid: "q:listen:A1", kind: "questions", target: "listen", id: "A1" }));
  const at = await pg.evaluate(() => { const el = document.createElement("div"); document.body.prepend(el); const b = askClaudeButton("L01", "我本来想去，结果下雨了。", "Gemini flash-lite-latest", 3); el.append(b); b.click(); return { txt: b.textContent, at: S.req.find(x => x.kind === "regrade").at }; });
  ok(/Asked/.test(at.txt) && at.at === T0, "Ask Claude: request made for that answer (time " + at.at + "), button says asked");
  await pg.evaluate(() => overrideLast("L01", 2, { raw: "我本来想去，结果下雨了。", by: "Gemini", was: 3 })); // you overrode before Claude answered
  await pg.evaluate(() => setView("me")); await pg.click("#packcard details:nth-of-type(1) summary").catch(() => {});
  await pg.evaluate(() => { document.querySelectorAll("#packcard details").forEach(d => d.open = true); });
  await pg.selectOption("#pk-g1", "news"); await pg.fill("#pk-topic", "高铁"); await pg.click("#pk-more");
  await pg.selectOption("#pk-read", "1"); await sleep(300);
  await pg.evaluate(() => { document.querySelector('[data-genre="book"]').click(); });
  await sleep(1500); await pg.evaluate(() => ghSyncNow()); await sleep(1800); await pg.evaluate(() => SYNCQ); await pg.evaluate(() => ghSyncNow());
  const ob = JSON.parse(g.files()["outbox.json"]);
  const kinds = ob.requests.map(r => r.kind).sort().join(",");
  ok(kinds === "passage,questions,questions,regrade,sentence", "outbox lists every request: " + kinds);
  ok(ob.requests.find(r => r.kind === "passage").genre === "news" && ob.requests.find(r => r.kind === "passage").topic === "高铁", "passage request carries genre + topic");
  ok(ob.requests.find(r => r.kind === "regrade").en && ob.requests.find(r => r.kind === "regrade").ref.length, "regrade request carries the drill");
  ok(ob.reading.perDay === 1 && JSON.stringify(ob.reading.genres) === '["xhs","news","travel"]', "reading settings in the note: " + JSON.stringify(ob.reading));
  ok(!JSON.stringify(ob).includes("高铁很方便"), "transcript not copied into the note (the run reads it from progress)");
  await pg.evaluate(() => setView("home"));
  ok(/waiting for an example sentence/.test(await pg.evaluate(() => document.body.innerText)) && /Waiting for Claude/i.test(await pg.evaluate(() => document.body.innerText)), "home: waiting card");
  await pg.screenshot({ path: "req-home.png" });
  // a pack answering everything; checked with the real check script first
  const rid = r => ob.requests.find(x => x.kind === r).rid;
  const q3 = [1, 2, 3].map(i => ({ q: "Q" + i, opts: ["a", "b", "c", "d"], why: ["1", "2", "3", "4"] }));
  const pack = { zwpack: 1, id: "2026-11-08", made: new Date().toISOString(), by: "test",
    sentences: { 测试词: { s: "这是一个测试词的例句。", py: "cèshìcí", gl: "test word" }, 有句子: "有句子也不该被覆盖。" },
    questions: [{ rid: "q:mine:M1", qs: q3, gl: { 天气: ["tiānqì", "weather"] }, en: "The weather is good today.", paras: ["今天|天气|很|好|。"] }, { rid: "q:listen:A1", qs: q3, gl: {} }],
    regrades: [{ rid: rid("regrade"), score: 1, chunk: "ok", fixed: "我本来想去，结果下起雨来了。", notes: ["note"] }],
    passages: [{ rid: rid("passage"), kind: "news", title: "高铁新线", paras: ["新|高铁|开通|。", "旅客|增加|。"], gl: {}, en: "x", qs: q3 }] };
  const dd = fs.mkdtempSync("/tmp/zwd-"); fs.mkdirSync(path.join(dd, "progress")); fs.mkdirSync(path.join(dd, "packs"));
  const f = g.files(); for (const p in f) if (!p.startsWith("settings/")) { fs.mkdirSync(path.join(dd, path.dirname(p)), { recursive: true }); fs.writeFileSync(path.join(dd, p), f[p]); }
  fs.writeFileSync(path.join(dd, "packs", "new.json"), JSON.stringify(pack));
  let out = ""; try { out = execFileSync("node", ["/home/claude/zhongwen-practice/tools/daily-run/check-pack.js", path.join(dd, "packs", "new.json"), "--data", dd, "--app", "/home/claude/zhongwen-practice"]).toString(); } catch (e) { out = e.stdout.toString(); }
  ok(/^OK/m.test(out), "check-pack accepts the answer pack: " + out.trim().split("\n").pop());
  const bad = JSON.parse(JSON.stringify(pack)); bad.sentences.测试词 = "没有那个词。"; bad.regrades[0].score = 5; bad.questions[0].rid = "q:mine:NOPE";
  bad.sen = [1, 2, 3].map(i => ({ s: "截至|发稿|时|，|第" + i + "|次|。", q: "?", opts: ["a", "b", "c", "d" + i] }));
  fs.writeFileSync(path.join(dd, "packs", "bad.json"), JSON.stringify(bad));
  try { execFileSync("node", ["/home/claude/zhongwen-practice/tools/daily-run/check-pack.js", path.join(dd, "packs", "bad.json"), "--data", dd, "--app", "/home/claude/zhongwen-practice"]); out = "passed"; } catch (e) { out = e.stdout.toString(); }
  ok(/must contain the word/.test(out) && /score must be/.test(out) && /rid must be a questions request/.test(out) && /at most 2 per pack/.test(out), "check-pack rejects a bad sentence, score, rid and 3 sentences on one structure");
  putFile(g, "packs/2026-11-08.json", JSON.stringify(pack));
  await pg.evaluate(() => ghSyncNow());
  const r = await pg.evaluate(() => ({ s: S.bank.测试词.s, sAI: S.bank.测试词.sAI, keep: S.bank.有句子.s, mq: S.gen.mine[0].qs.length, men: S.gen.mine[0].en, lq: S.gen.listen[0].qs.length, req: (S.req || []).length,
    e4: JSON.stringify(S.items.L01.h.find(e => e[0] === S.items.L01.h[0][0])[4]), graded: (S.graded || [])[0] && [S.graded[0].by, S.graded[0].was, S.graded[0].score].join(), fb: (S.offfb || []).some(x => x.by === "Claude"),
    psg: S.gen.passages.some(p => p.title === "高铁新线") }));
  ok(r.s === "这是一个测试词的例句。" && r.sAI && r.keep === "这里有句子。", "example sentence applied; a word that already had one kept it");
  ok(r.mq === 3 && r.men && r.lq === 3, "questions applied to the own text and the transcript");
  ok(r.e4 === '[1,"ok"]', "Claude's grade replaced your earlier override in the log: " + r.e4);
  ok(r.graded === "Claude,3,1" && r.fb, "results card entry (Gemini 3 → Claude 1) + feedback card for the problem the model missed");
  ok(r.psg && r.req === 0, "requested passage arrived; no requests left");
  await pg.evaluate(() => setView("home"));
  const home = await pg.evaluate(() => document.body.innerText);
  ok(/Claude disagrees/.test(home) && !/Waiting for Claude/i.test(home), "home: Claude's regrade shown (disagrees), waiting card gone");
  await pg.screenshot({ path: "req-results.png" });
  await sleep(1800); await pg.evaluate(() => ghSyncNow()); await sleep(1800); await pg.evaluate(() => SYNCQ); await pg.evaluate(() => ghSyncNow());
  ok(JSON.parse(g.files()["outbox.json"]).requests.length === 0, "the note to Claude no longer lists them");
  const B = await device(browser, g, null, null); await connect(B.page); await sleep(1000);
  ok(await B.page.evaluate(() => (S.req || []).length === 0 && S.packLog.length === 1 && S.bank.测试词.s === "这是一个测试词的例句。"), "device B: same results, nothing applied twice");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
