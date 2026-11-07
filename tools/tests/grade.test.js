// Step 3: grading chain (Gemini → Groq → self-grade) and automatic grading of waiting answers. Mocked providers.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const GEM = "https://generativelanguage.googleapis.com/v1beta/openai", GROQ = "https://api.groq.com/openai/v1";
const PROV = JSON.stringify({ base: GROQ, key: "groq-k", model: "qwen/qwen3.8-27b", keys: { [GEM]: "gem-k", [GROQ]: "groq-k" }, models: { [GROQ]: "qwen/qwen3.8-27b" }, use: true });

// mode per service: "ok" | "busy" | "daily" | "minute" | "gone" | "hang" | "down"; score given to every answer
const M = { gem: "ok", groq: "ok", score: 2, log: [] };
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
    route.fulfill({ status: 200, headers: H, body: JSON.stringify({ choices: [{ message: { content } }] }) });
  });
}
async function device(browser, extra) {
  const ctx = await browser.newContext(); await routeAI(ctx);
  await ctx.addInitScript(([pv, ex]) => { if (!localStorage.getItem("seeded")) { localStorage.clear(); localStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:prov", pv);
    localStorage.setItem("zwlgf:state:v1", JSON.stringify(Object.assign({ v: 1, updatedAt: Date.now(), placed: true, items: {}, recent: {}, log: {}, bank: {}, reads: {}, gen: { ladder: [], passages: [], sen: [], mine: [], listen: [] }, best: { combo: 0 } }, ex || {}))); } }, [PROV, extra]);
  const page = await ctx.newPage(); page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  return { ctx, page };
}
// type an answer into a typed drill (rung 5) and wait for the outcome
async function answer(pg, text, id = "L01") {
  await pg.evaluate(id => { const el = document.createElement("div"); el.id = "tdrill"; document.querySelector("#tdrill")?.remove(); document.body.prepend(el); window.__res = null; renderLadder(LADDER.get(id), 5, el, r => { window.__res = r; }, () => {}); }, id);
  await pg.fill("#tdrill #ans", text); await pg.click("#tdrill #check");
  await pg.waitForFunction(() => window.__res || document.querySelector("#tdrill [data-s]"), null, { timeout: 25000 });
  return pg.evaluate(() => ({ graded: !!window.__res, text: document.querySelector("#tdrill").innerText, self: !!document.querySelector("#tdrill [data-s]") }));
}
const lastBy = () => M.log[M.log.length - 1];

(async () => {
  const browser = await chromium.launch();
  const A = await device(browser); const pg = A.page;
  // 1. Gemini first
  M.log = []; let r = await answer(pg, "我本来想去，可是下雨了。");
  ok(r.graded && lastBy().id === "gem" && lastBy().model === "gemini-flash-lite-latest", "Gemini Flash-Lite (alias) grades first");
  ok(/Disagree with Gemini flash-lite-latest/.test(r.text), "override names the model that graded: " + (r.text.match(/Disagree with [^?]+/) || [""])[0]);
  // 2. Gemini busy → Groq, and Gemini skipped for the next answer
  M.gem = "busy"; M.log = []; r = await answer(pg, "我本来打算去的。");
  ok(r.graded && M.log.map(x => x.id).join() === "gem,groq", "Gemini busy → Groq graded it: " + M.log.map(x => x.id).join());
  ok(/Disagree with Qwen3.8-27b/.test(r.text), "override names Qwen");
  M.gem = "ok"; M.log = []; await answer(pg, "我本来要去。");
  ok(M.log.map(x => x.id).join() === "groq", "right after, Gemini is skipped for a bit: " + M.log.map(x => x.id).join());
  await pg.evaluate(() => localStorage.removeItem("zwlgf:provstate"));
  // 3. daily limit → Gemini off until midnight Pacific; card says so
  M.gem = "daily"; M.log = []; await answer(pg, "本来想去的。");
  const day = await pg.evaluate(() => pstGet().day.gem);
  const hrs = (day - Date.now()) / 3600000;
  ok(day && hrs > 0 && hrs <= 24.1, "daily limit: Gemini off until next midnight Pacific (" + hrs.toFixed(1) + " h from now)");
  M.gem = "ok"; M.log = []; await answer(pg, "本来去。");
  ok(M.log.map(x => x.id).join() === "groq", "daily limit: no Gemini requests until reset");
  await pg.evaluate(() => setView("me"));
  ok(/free quota is used up/.test(await pg.$eval("#provcard", e => e.textContent)), "Another AI card shows the quota note");
  await pg.screenshot({ path: "/home/claude/tests/order-card.png", clip: await pg.$eval("#provcard", e => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y + scrollY, width: b.width, height: 330 }; }) }).catch(() => {});
  await pg.evaluate(() => { localStorage.removeItem("zwlgf:provstate"); setView("home"); });
  // 4. per-minute 429 → only skipped briefly, not for the day
  M.gem = "minute"; await answer(pg, "本来是去。");
  ok(await pg.evaluate(() => !pstGet().day.gem && pstGet().skip.gem > Date.now()), "per-minute limit: skipped briefly, not for the day");
  await pg.evaluate(() => localStorage.removeItem("zwlgf:provstate"));
  // 5. alias retired → pinned model, said once
  M.gem = "aliasgone"; M.log = []; r = await answer(pg, "本来想去。");
  ok(r.graded && M.log.map(x => x.model).join() === "gemini-flash-lite-latest,qwen/qwen3.8-27b", "alias gone → Groq graded this one");
  M.gem = "ok"; M.log = []; await answer(pg, "本来要。");
  ok(lastBy().id === "gem" && lastBy().model === "gemini-3.5-flash-lite", "next answer uses gemini-3.5-flash-lite");
  await pg.evaluate(() => localStorage.removeItem("zwlgf:provstate"));
  // 6. slow → next after 15 s
  M.gem = "hang"; M.log = []; const t0 = Date.now(); r = await answer(pg, "我本来打算。");
  const secs = (Date.now() - t0) / 1000;
  ok(r.graded && M.log.map(x => x.id).join() === "gem,groq" && secs > 14 && secs < 19, "Gemini slow → Groq after ~15 s (" + secs.toFixed(1) + " s)");
  M.gem = "ok"; await pg.evaluate(() => localStorage.removeItem("zwlgf:provstate"));
  // 7. switching Gemini off in the grading order
  await pg.evaluate(() => { const p = provGet(); p.grade = { gem: false, groq: true }; provSet(p); });
  M.log = []; await answer(pg, "我本来。"); ok(M.log.map(x => x.id).join() === "groq", "Gemini switched off → Groq only");
  await pg.evaluate(() => { const p = provGet(); p.grade = { gem: true, groq: true }; provSet(p); });
  // 8. both unavailable → self-grade, kept for later
  M.gem = "down"; M.groq = "down"; const key = await pg.evaluate(() => ladParts(LADDER.get("L01")).key);
  r = await answer(pg, "两个都不行的时候写的" + key + "。");
  ok(!r.graded && r.self && /graded automatically later/.test(r.text), "both down → self-grade, says it'll be graded later");
  await pg.click("#tdrill [data-s='3']");
  ok(await pg.evaluate(() => (S.offw || []).some(x => x.raw.startsWith("两个都不行的时候写的") && x.self === 3)), "kept in the waiting list");
  await pg.evaluate(() => localStorage.removeItem("zwlgf:provstate"));
  await A.ctx.close();

  // 9. a big waiting batch: graded automatically, paced, feedback cards only for problems, resumes after closing
  const T = Date.now() - 3600000, ids = ["L01", "L02", "L03", "L05", "L06", "L09", "L10", "L11", "L12", "L16", "L18", "L20"];
  const offw = ids.map((id, i) => ({ k: id + ":" + (T + i), id, rung: 5, raw: "离线写的" + i, self: i % 3 === 0 ? 3 : 0, t: T + i }));
  const items = {}; ids.forEach((id, i) => items[id] = { t: "lad", n: 1, h: [[Math.round((T + i) / 1000), 5, i % 3 === 0 ? 3 : 0, "s"]] });
  const pending = [{ k: "L30:" + T, id: "L30", rung: 5, raw: "旧版本排队的", t: T, self: 2, pl: false }];
  items.L30 = { t: "lad", n: 1, h: [[Math.round(T / 1000), 5, 2, "s"]] };
  M.gem = "ok"; M.groq = "ok"; M.score = 2; M.log = [];
  const B = await device(browser, { offw, items, pending });
  await sleep(4500); // starts ~3 s after opening
  const firstBatch = M.log.filter(x => x.batch);
  ok(firstBatch.length === 1 && firstBatch[0].n === 5, "first batch: 5 answers in one request");
  ok(await B.page.evaluate(() => S.offw.length) === 13 - 5, "older-version queue joined the same list; 5 graded so far (" + await B.page.evaluate(() => S.offw.length) + " left)");
  ok(await B.page.evaluate(() => /正在批改|Grading/.test(document.body.innerText)), "home shows grading progress");
  // close in the middle (waiting for the next batch), reopen
  const ctxB = B.ctx; await B.page.close(); await sleep(1000);
  const p2 = await ctxB.newPage(); p2.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await p2.goto("http://localhost:8765/"); await p2.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await p2.waitForFunction(() => !(S.offw || []).length && !AUTO, null, { timeout: 40000 });
  const bl = M.log.filter(x => x.batch);
  ok(bl.reduce((a, x) => a + x.n, 0) === 13, "after reopening, the rest were graded; every answer graded exactly once (" + bl.map(x => x.n).join("+") + ")");
  const gaps = bl.slice(1).map((x, i) => x.t - bl[i].t).filter(g => g < 3000);
  ok(bl.length >= 3 && gaps.length <= 1, "batches paced (gaps: " + bl.slice(1).map((x, i) => ((x.t - bl[i].t) / 1000).toFixed(1)).join(", ") + " s; one short gap allowed at the reopen)");
  const st = await p2.evaluate(() => ({ fb: (S.offfb || []).length, by: (S.offfb || [])[0] && S.offfb[0].by, regraded: Object.values(S.items).filter(it => it.h && it.h.some(e => e[4])).length, sum: S.offwSummary, done: (S.offwDone || []).length }));
  ok(st.fb === 13 && st.by && /flash-lite/.test(st.by), "score 2 → feedback cards, marked with the model (" + st.fb + ", by " + st.by + ")");
  ok(st.regraded === 13, "every answer's log entry regraded (schedule corrected): " + st.regraded);
  ok(st.sum && st.sum.n === 13 && st.sum.raised >= 1, "summary counts the run (graded " + (st.sum && st.sum.n) + ", raised " + (st.sum && st.sum.raised) + ")");
  ok(/Graded/.test(await p2.evaluate(() => document.body.innerText)), "home shows the summary card");
  await p2.screenshot({ path: "/home/claude/tests/auto-summary.png" });
  await p2.click("#offw-ok"); ok(await p2.evaluate(() => !S.offwSummary), "Got it clears the summary");
  // the feedback card in practice names the model
  const fbText = await p2.evaluate(() => { const el = document.createElement("div"); document.body.prepend(el); renderOfflineFb(S.offfb[0].k, el, () => {}); return el.innerText; });
  ok(/flash-lite-latest found something to fix/.test(fbText) && /Written earlier/i.test(fbText), "feedback card says which model found it");
  // 10. score 3 + chunk ok → no card
  M.score = 3; await p2.evaluate(() => { S.offw = [{ k: "L40:1", id: "L40", rung: 5, raw: "很好", self: 3, t: Date.now() - 1000 }]; save(); autoCheck(); });
  await p2.waitForFunction(() => !(S.offw || []).length && !AUTO, null, { timeout: 15000 });
  ok(await p2.evaluate(() => !S.offfb.some(x => x.k === "L40:1")), "a fine answer → no feedback card");
  // 11. failure mid-run → stops, no loop
  M.gem = "down"; M.groq = "down"; M.log = [];
  await p2.evaluate(() => { S.offw = [{ k: "L41:1", id: "L41", rung: 5, raw: "x", self: 0, t: Date.now() }]; save(); localStorage.removeItem("zwlgf:provstate"); autoCheck(); });
  await sleep(10000);
  ok(M.log.length <= 2 && await p2.evaluate(() => S.offw.length === 1), "both down: one try each, answer still waiting (" + M.log.length + " requests in 10 s)");
  console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
