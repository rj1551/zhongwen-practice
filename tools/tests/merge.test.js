// Merge fixes (2026-11-09): songs / texts merge by group of fields (a rename on one device and a timing fix on the
// other both survive); settings merge key by key (an offline session elsewhere no longer undoes a settings change);
// the "do all lyrics" choice and its undo sync by time; answers still merge as a union. Serve docs/ on 8765.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), page = await (await b.newContext()).newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto("http://localhost:8765/"); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await page.evaluate(async () => {
    const out = {}, sleep = ms => new Promise(z => setTimeout(z, ms));
    S.gen.listen.push({ id: "Am", title: "旧名", kind: "file", t: now() - 1e5, u: now() - 1e5, type: "song", cues: [[1, "一"], [3, "二"]] });
    S.settings = setSettings({ goal: 15 }); save();
    const A = JSON.parse(JSON.stringify(S)), B = JSON.parse(JSON.stringify(S));
    // device A (phone, offline): rename + lots of practice later; device B (computer): timing fix + goal change earlier
    await sleep(20); const itB = B.gen.listen.find(x => x.id === "Am"); S = B; itB.fix = { 1: { t: 3.4, c: true } }; touch(itB, "timing"); S.settings = setSettings({ goal: 30 }); B.updatedAt = now();
    await sleep(20);
    const itA = A.gen.listen.find(x => x.id === "Am"); S = A; itA.title = "新名"; touch(itA, "title"); A.updatedAt = now() + 5000; // A saved last
    const m = mergeStates(A, B), m2 = mergeStates(B, A), mi = m.gen.listen.find(x => x.id === "Am"), mi2 = m2.gen.listen.find(x => x.id === "Am");
    out.item = [mi.title, mi.fix && mi.fix[1].t, mi2.title, mi2.fix && mi2.fix[1].t];
    out.goal = [m.settings.goal, m2.settings.goal];
    // the same group edited on both: the later edit wins
    const C = JSON.parse(JSON.stringify(m)), D = JSON.parse(JSON.stringify(m));
    S = C; C.gen.listen.find(x => x.id === "Am").title = "C 名"; touch(C.gen.listen.find(x => x.id === "Am"), "title"); await sleep(20);
    S = D; D.gen.listen.find(x => x.id === "Am").title = "D 名"; touch(D.gen.listen.find(x => x.id === "Am"), "title");
    out.same = [mergeStates(C, D).gen.listen.find(x => x.id === "Am").title, mergeStates(D, C).gen.listen.find(x => x.id === "Am").title];
    // reset timing (a delete) on one side carries over
    const E = JSON.parse(JSON.stringify(m)); S = E; LST = { tundo: [] }; resetTiming(E.gen.listen.find(x => x.id === "Am"));
    out.reset = !mergeStates(m, E).gen.listen.find(x => x.id === "Am").fix;
    // old copies without stamps: whole item from the one changed last (as before)
    const P = { id: "Ao", title: "p", u: 5, x: 1 }, Q = { id: "Ao", title: "q", u: 9 };
    out.old = mergeGenItem(P, Q).title;
    // do all lyrics: on, then undo on the other device → off everywhere
    const F = JSON.parse(JSON.stringify(m)), G = JSON.parse(JSON.stringify(m));
    F.lyrAll = { on: true, t: now() }; G.lyrAll = { on: false, t: now() + 1000 };
    out.lyr = [mergeStates(F, G).lyrAll.on, mergeStates(G, F).lyrAll.on];
    // answers still a union: same card answered differently on both
    const H = JSON.parse(JSON.stringify(m)), I = JSON.parse(JSON.stringify(m)), t0 = Math.round(now() / 1000);
    H.items.X = { t: "lad", n: 1, ok: 1, h: [[t0, 5, [3, "ok"]]] }; I.items.X = { t: "lad", n: 1, ok: 0, h: [[t0 + 1800, 5, [0, "missing"]]] };
    out.ans = mergeStates(H, I).items.X.h.length;
    S = m;
    return out;
  });
  ok(r.item[0] === "新名" && r.item[1] === 3.4 && r.item[2] === "新名" && r.item[3] === 3.4, "rename on one device + timing fix on the other: both kept (either way round): " + r.item.join(" "));
  ok(r.goal[0] === 30 && r.goal[1] === 30, "a goal changed on the computer survives a later offline session on the phone");
  ok(r.same[0] === "D 名" && r.same[1] === "D 名", "the same thing changed on both: the later change wins");
  ok(r.reset, "resetting the timing on one device carries over");
  ok(r.old === "q", "copies from before the change: whole item from the one changed last, as before");
  ok(!r.lyr[0] && !r.lyr[1], "'do all lyrics' undone on the other device: undone everywhere");
  ok(r.ans === 2, "the same card answered on both devices: both answers kept");
  await b.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
