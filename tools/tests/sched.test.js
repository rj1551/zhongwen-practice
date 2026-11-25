// v72: scheduled reading. On a day a passage is due (阅读量 setting), today's set = cards, then the passage; the ✓
// waits for it, or for "今天不读 · No reading today". 8765 server (clean copy of docs/).
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
const B = process.env.SITE || "http://localhost:8765/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const ready = pg => pg.waitForFunction(() => { const t = document.querySelector("#tabs"); return t && !t.hidden; }, null, { timeout: 20000 });
const label = pg => pg.evaluate(() => { const l = document.querySelector("#main .label"); return l ? l.textContent : ""; });
const done = pg => pg.evaluate(() => daySplit(S.log[dayKey()]).done);
// a fresh learner whose cards for today are all done: no reviews due, no new items allowed today
const setup = (pg, per, extra) => pg.evaluate(([per, extra]) => {
  S.placed = true; S.settings = Object.assign(S.settings || {}, { oneTap: true, reading: { perDay: per } }); S.nb = { d: dayKey(), allow: 0 };
  S.gen.fw = [{ id: "FWB01", q: "你周末一般怎么过？", t: now(), builtin: true, a: { t: now(), raw: "在家", g: { score: 3, fixed: "", nat: "", notes: [], chunk: "", by: "x" }, seen: 1 } }]; // today's free writing done (fw.test.js)
  save();
}, [per, extra]);
async function readThrough(pg) { // in the reader: done → answer every question → finish card
  await pg.click("#done");
  for (let i = 0; i < 10; i++) {
    if (await pg.$("#sr-next")) return true;
    const o = await pg.$("#main .opt"); if (!o) return false;
    await o.click(); await pg.waitForTimeout(80);
    const nb = await pg.$("#cc .btn.wide"); if (nb) await nb.click();
    await pg.waitForTimeout(80);
  }
  return !!(await pg.$("#sr-next"));
}
(async () => {
  const br = await chromium.launch();
  const fresh = async () => { const ctx = await br.newContext(); const pg = await ctx.newPage(); await pg.goto(B); await ready(pg); return { ctx, pg }; };
  try {
    // 1. due (1 every 2 days, nothing read): after the cards the passage card comes; reading it gives the ✓
    { const { ctx, pg } = await fresh();
      await setup(pg, 0.5);
      ok(await pg.evaluate(() => schedReadLeft() === 1 && !!schedPassage()), "1 every 2 days, nothing read yet: one passage due today");
      await pg.evaluate(() => startSession());
      ok(/今天的阅读/.test(await label(pg)), "practice: today's passage comes once the cards are done");
      ok(await pg.evaluate(() => daySplit(S.log[dayKey()]).cd && !daySplit(S.log[dayKey()]).done), "reaching it marks the cards done, but no ✓ yet");
      ok(!(await pg.$("#dnote")), "no \"everything for today is done\" line before the passage");
      const pid = await pg.evaluate(() => SESSION.q[SESSION.i].id);
      await pg.click("#sr-go");
      ok(!!(await pg.$("#rd")) && !!(await pg.$("#quit")), "开始读: the full reader opens inside practice (word taps work there)");
      await pg.click("#rd .tk"); ok(!!(await pg.$("#sheet")), "tapping a word in it opens the dictionary popup");
      ok(await pg.waitForFunction(() => !!CED, null, { timeout: 30000 }).then(() => true, () => false), "the full dictionary gets loaded in today's reading (v100: it used to stay 'still loading')");
      await pg.evaluate(() => closeSheet());
      ok(await readThrough(pg), "done → questions → finished card");
      const r = await pg.evaluate(pid => S.reads[pid], pid);
      ok(r && r.cpm > 0 && !r.half && await pg.evaluate(t => dayKey(t) === dayKey(), r.t), "first read recorded with its speed");
      await pg.click("#sr-next"); await pg.waitForTimeout(200);
      ok(await done(pg) && !!(await pg.$("#dnote")), "继续: the ✓ and \"今天该做的都做完了\" come after the passage");
      ok(await pg.evaluate(() => VIEW === "session" && SESSION.q[SESSION.i] && SESSION.q[SESSION.i].t !== "sr"), "practice goes on after it (extra cards)");
      // the rhythm: read today → not due tomorrow; due again the day after
      ok(await pg.evaluate(() => { const k = CLOCK_OFF; CLOCK_OFF = k + DAY; const a = schedReadLeft(); CLOCK_OFF = k + 2 * DAY; const b = schedReadLeft(); CLOCK_OFF = k; return a === 0 && b === 1; }), "1 every 2 days: not due the next day, due the day after");
      await ctx.close(); }
    // 2. 今天不读: ✓ without reading; nothing carries over
    { const { ctx, pg } = await fresh();
      await setup(pg, 1);
      await pg.evaluate(() => startSession());
      await pg.click("#sr-skip"); await pg.waitForTimeout(200);
      ok(await done(pg) && await pg.evaluate(() => schedReadLeft() === 0 && daySplit(S.log[dayKey()]).nr), "今天不读 · No reading today: the ✓ comes, nothing more due today");
      ok(await pg.evaluate(() => { const k = CLOCK_OFF; CLOCK_OFF = k + DAY; const a = schedReadLeft(); CLOCK_OFF = k; return a === 1; }), "1 a day: tomorrow one passage again (a skipped one doesn't add up)");
      await ctx.close(); }
    // 3. 2 a day: two passages after the cards
    { const { ctx, pg } = await fresh();
      await setup(pg, 2);
      const q = await pg.evaluate(() => { startSession(); return SESSION.q.map(c => c.t); });
      ok(q[0] === "sr" && q[1] === "sr" && q[2] === "div", "2 a day: two passages, then the ✓ " + JSON.stringify(q.slice(0, 4)));
      await ctx.close(); }
    // 4. which passage: newest from the packs first, the genre setting decides among them
    { const { ctx, pg } = await fresh();
      const r = await pg.evaluate(() => {
        const mk = (id, reg) => ({ id, title: "T" + id, reg, gen: true, paras: ["这是一个测试段落。"], qs: [{ q: "?", opts: ["a", "b"] }], en: "" });
        PSG.set("g1", mk("g1", "news")); PSG.set("g2", mk("g2", "xhs")); // g2 is the newer one
        const a = schedPassage().id;
        S.settings = S.settings || {}; S.settings.reading = { perDay: 1, genres: ["news"] }; const b = schedPassage().id;
        PSG.delete("g1"); PSG.delete("g2"); return [a, b];
      });
      ok(r[0] === "g2" && r[1] === "g1", "newest pack passage first; with 新闻 chosen, the news one " + JSON.stringify(r));
      ok(await pg.evaluate(() => { const mine = { id: "m1", title: "mine", reg: "xhs", mine: true, paras: ["我的"], qs: [] }; PSG.set("m1", mine); const keep = [...PSG.keys()].filter(k => k !== "m1" && !S.reads[k]); keep.forEach(k => S.reads[k] = { t: 1, cpm: 80 }); const x = schedPassage(); PSG.delete("m1"); keep.forEach(k => delete S.reads[k]); return x === null; }), "own texts never become today's passage");
      await ctx.close(); }
    // 5. left halfway: home says why there's no ✓; resumed read doesn't count toward speed
    { const { ctx, pg } = await fresh();
      await setup(pg, 1);
      await pg.evaluate(() => startSession());
      const pid = await pg.evaluate(() => SESSION.q[SESSION.i].id);
      await pg.click("#sr-go"); await pg.click("#quit"); await pg.evaluate(() => setView("home"));
      ok(await pg.evaluate(() => READ === null), "■ in the middle of the passage: the reader is let go");
      ok(/今天还有/.test(await pg.evaluate(() => document.querySelector("#main").textContent)) && !(await done(pg)), "home: \"still to do today\" card, no ✓ yet");
      await pg.click("#sr-home"); await pg.click("#sr-go");
      await readThrough(pg);
      const r = await pg.evaluate(pid => S.reads[pid], pid);
      ok(r && r.half === true, "the resumed read is marked and doesn't count toward reading speed");
      await pg.click("#sr-next"); ok(await done(pg), "…and still completes the day");
      await ctx.close(); }
    // 6. read in 阅读 instead, after the cards: that completes the day; home skip too
    { const { ctx, pg } = await fresh();
      await setup(pg, 1);
      await pg.evaluate(() => startSession()); await pg.click("#quit");
      const pid = await pg.evaluate(() => schedPassage().id);
      await pg.evaluate(pid => { READ = { pid, timer: makeTimer(), looked: new Set(), spaced: false, re: false }; setView("read"); }, pid);
      await pg.click("#done");
      for (let i = 0; i < 10 && !(await pg.$("#list")); i++) { const o = await pg.$("#main .opt"); if (!o) break; await o.click(); await pg.waitForTimeout(60); const nb = await pg.$("#cc .btn.wide"); if (nb) await nb.click(); await pg.waitForTimeout(60); }
      ok(await done(pg), "a first read in 阅读 after today's cards gives the ✓");
      await ctx.close(); }
    { const { ctx, pg } = await fresh();
      await setup(pg, 1);
      await pg.evaluate(() => startSession()); await pg.click("#quit"); await pg.evaluate(() => setView("home"));
      await pg.click("#sr-homeskip"); await pg.waitForTimeout(150);
      ok(await done(pg) && !(await pg.$("#sr-home")), "home: 今天不读 gives the ✓ and the card goes");
      await ctx.close(); }
    // 7. nothing unread → nothing due, the ✓ as before; forecast unaffected; flags merge across devices
    { const { ctx, pg } = await fresh();
      await setup(pg, 1);
      const r = await pg.evaluate(() => {
        for (const id of PSG.keys()) if (!S.reads[id]) S.reads[id] = { t: 1, cpm: 80 };
        startSession(); return SESSION.q[0] && SESSION.q[0].t;
      });
      await pg.waitForTimeout(100);
      ok(r === "div" && await done(pg), "no unread passage: nothing waits, the ✓ comes as before");
      ok(await pg.evaluate(() => { const n = Object.keys(S.reads).length; const f = forecast(3, 10); return f && f.days >= 0 && Object.keys(S.reads).length === n; }), "stock forecast runs and doesn't count simulated passages");
      ok(await pg.evaluate(() => { const a = { by: { A: { n: 1, cd: 1 } } }, b = { by: { B: { n: 1, nr: 1 } } }, m = daySplit(mergeLogDay(a, b)), m2 = daySplit(mergeLogDay({ by: { A: { n: 1 } } }, a)); return m.cd && m.nr && m2.cd; }), "the cards-done / no-reading flags merge across devices");
      await ctx.close(); }
  } catch (e) { console.log("ERROR", e); fails++; }
  await br.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
