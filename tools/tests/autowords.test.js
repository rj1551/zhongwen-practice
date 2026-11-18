// New words as cards (2026-11-16): the app picks new words (same pool as readings' newWords), asks the daily run for a
// sentence, then they alternate with saved words; first card = 新词 with no 记得/忘了; saving one keeps one card and its
// sentence; 我认识 drops it for good. Run against the 8765 server.
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage(); pg.on("pageerror", e => console.log("ERR", e.message));
  await pg.goto("http://localhost:8765/"); await pg.waitForFunction(() => !document.querySelector("#tabs").hidden);
  const r = await pg.evaluate(async () => {
    const T = now(), out = {};
    S.bank = { 难熬: { zh: "难熬", s: "那段日子真难熬。", py: "nán'áo", gl: "hard to endure", t: T - 5e6 }, 隐患: { zh: "隐患", s: "这里有安全隐患。", py: "yǐnhuàn", gl: "hidden danger", t: T - 4e6 } };
    out.added = autoTopUp();
    const auto = Object.keys(S.bank).filter(w => isAutoWord(S.bank[w]));
    out.autoN = auto.length; out.again = autoTopUp();
    const fresh = () => candidates("ctx").filter(x => x.t === "bank" && !S.items["B:" + x.id]).map(x => x.id);
    out.beforeSent = fresh().filter(w => auto.includes(w)).length;
    const rq = outboxRequests().filter(q => q.kind === "sentence");
    out.reqNew = rq.filter(q => q.new).length; out.reqSavedNew = rq.filter(q => q.new && !auto.includes(q.w)).length;
    const sents = {}; auto.forEach(w => sents[w] = { s: "大家都说" + w + "很重要。" }); applyAnswers({ sentences: sents }, { ws: 0, bad: 0 });
    const f1 = fresh(); out.order1 = f1.slice(0, 4).map(w => isAutoWord(S.bank[w]) ? "A" : "S").join("");
    // meet a saved word first → next time an auto word leads; meet an auto word → a saved word leads
    S.items["B:难熬"] = { t: "bank", h: [[Math.floor(T / 1000) - 100, 0, 100]], s: 3, lr: T - 1e5, due: T + 3 * 864e5, n: 1, ok: 1, d: 5 };
    out.order2 = fresh().slice(0, 2).map(w => isAutoWord(S.bank[w]) ? "A" : "S").join("");
    const a0 = auto[0]; S.items["B:" + a0] = { t: "bank", h: [[Math.floor(T / 1000) - 10, 0, 100]], s: 3, lr: T - 1e4, due: T + 3 * 864e5, n: 1, ok: 1, d: 5 };
    out.order3 = fresh().slice(0, 2).map(w => isAutoWord(S.bank[w]) ? "A" : "S").join("");
    delete S.items["B:" + a0];
    // the first card of an auto word
    const el = document.querySelector("#main"); el.innerHTML = ""; let res = null;
    renderBank(a0, el, x => res = x, () => {});
    out.label = el.querySelector(".label").textContent;
    el.querySelector("#rev").click();
    out.buttons = [...el.querySelectorAll("[data-k]")].map(b => b.textContent).join(" | ");
    out.noRemember = !/记得|忘了/.test(el.textContent);
    el.querySelector('[data-k="learn"]').click();
    out.learned = !!(S.items["B:" + a0] && S.items["B:" + a0].h) && res && res.ok;
    el.innerHTML = ""; renderBank(a0, el, () => {}, () => {}); out.reviewLabel = el.querySelector(".label").textContent;
    // 我认识
    const a1 = auto[1]; el.innerHTML = ""; renderBank(a1, el, () => {}, () => {}); el.querySelector("#rev").click(); el.querySelector('[data-k="know"]').click();
    out.knowGone = !S.bank[a1] && !!(S.gone || {})["bank:" + a1];
    autoTopUp(); out.knowNotBack = !S.bank[a1];
    // saving an auto word from a reading: one card, its sentence kept
    const a2 = auto[2], sBefore = S.bank[a2].s;
    S.gen.passages = [{ id: "Gtest", kind: "news", title: "t", paras: ["今天|" + a2 + "|很|好|。"], gl: {}, qs: [] }]; indexGen();
    openSheet(S.gen.passages[0], [S.gen.passages[0].paras[0].split("|")], 0, 1, null);
    const addb = document.querySelector("#addb"); out.popupLabel = addb.textContent; addb.click();
    out.savedKept = S.bank[a2].saved === true && S.bank[a2].s === sBefore && Object.keys(S.bank).filter(w => w === a2).length === 1;
    out.inSavedList = Object.values(S.bank).filter(b => !isAutoWord(b)).some(b => b.zh === a2);
    // merge keeps saved from either device
    const A = JSON.parse(JSON.stringify(S)), B = JSON.parse(JSON.stringify(S)); B.bank[a2].saved = false; delete B.bank[a2].saved; B.updatedAt = (A.updatedAt || 0) + 5;
    out.mergeSaved = mergeStates(A, B).bank[a2].saved === true;
    // the saved-word list in Progress shows only your own words
    out.listOwn = Object.values(S.bank).filter(b => !isAutoWord(b)).length;
    return out;
  });
  ok(r.added === 5 && r.autoN === 5 && r.again === 0, "keeps 5 picked words waiting (no more on a second call)");
  ok(r.beforeSent === 0, "a picked word can't come up before its sentence arrives");
  ok(r.reqNew === 5 && r.reqSavedNew === 0, "sentence requests: the 5 picked words, flagged new");
  ok(r.order1 === "ASAS", "alternates with saved words (nothing met yet: a picked word first) — got " + r.order1);
  ok(r.order2[0] === "A", "after meeting a saved word, a picked word leads");
  ok(r.order3[0] === "S", "after meeting a picked word, a saved word leads");
  ok(r.label === "新词 · New word" && r.noRemember, "first card: 新词 · New word, no 记得/忘了 (" + r.buttons + ")");
  ok(r.learned, "知道了: the word starts its reviews");
  ok(r.reviewLabel === "词汇 · Vocabulary", "later reviews: 词汇 · Vocabulary");
  ok(r.knowGone && r.knowNotBack, "我认识: dropped, and not picked again");
  ok(/加入复习/.test(r.popupLabel) && r.savedKept && r.inSavedList, "saving it from a reading: one card, sentence unchanged, now in your saved words");
  ok(r.mergeSaved, "merge keeps 'saved' from either device");
  await br.close();
  console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
