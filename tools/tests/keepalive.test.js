
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const crypto = require("crypto"), http = require("http");
const sleep = ms => new Promise(r => setTimeout(r, ms));
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

const g = makeGit();
http.createServer((rq, res) => {
  let data = ""; rq.on("data", c => data += c); rq.on("end", () => {
    const H = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "content-type": "application/json" };
    const send = (st, b) => { res.writeHead(st, H); res.end(JSON.stringify(b)); };
    const m = rq.method, u = new URL(rq.url, "http://x");
    if (m === "OPTIONS") { res.writeHead(204, H); return res.end(); }
    g.log.push(m + " " + u.pathname);
    const p = u.pathname.replace(/^\/repos\/rj1551\/zhongwen-data/, ""), body = data ? JSON.parse(data) : null; let r;
    if (p === "" && m === "GET") return send(200, { private: true, default_branch: "main" });
    if (p === "/git/ref/heads/main") return send(200, { object: { sha: g.ref } });
    if ((r = p.match(/^\/git\/commits\/(\w+)$/))) return send(200, { sha: r[1], tree: { sha: g.commits[r[1]].tree } });
    if ((r = p.match(/^\/git\/trees\/(\w+)$/))) return send(200, { sha: r[1], tree: Object.entries(g.trees[r[1]]).map(([path, sha]) => ({ path, sha, type: "blob" })) });
    if ((r = p.match(/^\/git\/blobs\/(\w+)$/))) return send(200, { content: Buffer.from(g.blobs[r[1]]).toString("base64") });
    if (p === "/git/trees" && m === "POST") { const map = Object.assign({}, g.trees[body.base_tree]); for (const e of body.tree) map[e.path] = g.blob(e.content); const s = g.mkTree(map); return send(201, { sha: s, tree: Object.entries(map).map(([path, sha]) => ({ path, sha, type: "blob" })) }); }
    if (p === "/git/commits" && m === "POST") return send(201, { sha: g.mkCommit(body.tree, body.parents, body.message) });
    if (p === "/git/refs/heads/main" && m === "PATCH") { if (g.commits[body.sha].parents[0] !== g.ref) return send(422, {}); g.ref = body.sha; return send(200, {}); }
    send(404, {});
  });
}).listen(8766);
(async () => {
  const items = () => { const f = g.files(), ids = []; for (const p in f) if (p.startsWith("progress/items-")) ids.push(...Object.keys(JSON.parse(f[p]).items)); return ids.sort().join(","); };
  const b = await chromium.launch(); const ctx = await b.newContext();
  await ctx.addInitScript(() => { if (!localStorage.getItem("zwlgf:gh")) localStorage.setItem("zwlgf:gh", JSON.stringify({ token: "good", repo: "rj1551/zhongwen-data", branch: "main" })); });
  const T = Math.floor(Date.now() / 1000);
  for (const [id, wait] of [["L60", 4500], ["L61", 300]]) {
    const pg = await ctx.newPage(); await pg.goto("http://localhost:8765/site2/".replace("site2/", "") + "x/".replace("x/", ""));
    await pg.goto("http://localhost:8767/"); await pg.waitForFunction(() => GH.lastOk > 0, null, { timeout: 15000 }); await pg.evaluate(() => SYNCQ);
    await pg.evaluate(([id, T]) => { S.items[id] = { t: "lad", n: 1, h: [[T, 5, 3]] }; save(); }, [id, T]);
    await sleep(wait); const n0 = g.log.length;
    await pg.close(); await sleep(1500);
    console.log(`closed the tab ${wait / 1000} s after an answer → ${items().includes(id) ? "IN THE REPO" : "not in the repo yet"} · requests after close: ${g.log.slice(n0).join(", ") || "none"}`);
  }
  await b.close(); process.exit(0);
})();
