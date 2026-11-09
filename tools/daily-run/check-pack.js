#!/usr/bin/env node
// Checks a pack before it goes into zhongwen-data/packs/. Uses the app's OWN checks (makeLadder / makeSen /
// makePassage, loaded from index.html), so a pack that passes here is a pack the app accepts, plus stricter
// quality checks the app doesn't make (duplicates, lengths, keys in the alternatives, caps).
//
//   node check-pack.js <pack.json> [--app <zhongwen-practice dir>] [--data <zhongwen-data dir>]
//   node check-pack.js --cleanup  [--data <zhongwen-data dir>]   → prints packs/ files safe to delete
//
// Exit code 0 = OK to commit; 1 = fix the problems listed (or drop those pieces) and run again.
// Never reads zhongwen-data/settings/.
const fs = require("fs"), path = require("path"), vm = require("vm");
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const APP = path.resolve(opt("--app", path.join(__dirname, "..", "..")));
const DATA = path.resolve(opt("--data", path.join(APP, "..", "zhongwen-data")));
const CAP = { ladder: 40, sen: 60, passages: 6, questions: 10, regrades: 30 }; // per run (agreed with the learner 2026-11-06)
const SENT_CAP = 100; // example sentences per run (the app's old daily limit)
const readJson = f => JSON.parse(fs.readFileSync(f, "utf8"));
const norm = s => String(s || "").replace(/[\s|\/\[\]，。！？、；：,.!?;:"“”'‘’（）()…—-]/g, "").toLowerCase();

if (args.includes("--cleanup")) {
  // a pack can go once it's recorded as applied in the progress (then every device has its content via sync) and
  // it's at least 3 days old
  const tryJson = f => { try { return readJson(f); } catch (e) { return {}; } };
  const ob = tryJson(path.join(DATA, "outbox.json")), st = tryJson(path.join(DATA, "progress", "state.json"));
  const done = new Set([...(ob.packsDone || []), ...(st.packsDone || [])]);
  const dir = path.join(DATA, "packs"); if (!fs.existsSync(dir)) process.exit(0);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
    let pk; try { pk = readJson(path.join(dir, f)); } catch (e) { continue; }
    const age = (Date.now() - Date.parse(pk.made || 0)) / 864e5;
    if (done.has(pk.id) && age >= 3) console.log(path.join("packs", f));
  }
  process.exit(0);
}

// ---- the app's own checks, loaded from index.html ----
const html = fs.readFileSync(path.join(APP, "index.html"), "utf8");
const grab = re => { const m = html.match(re); if (!m) throw new Error("couldn't find " + re + " in index.html"); return m[0]; };
const fnSrc = name => { const i = html.indexOf("\nfunction " + name + "("); if (i < 0) throw new Error("no " + name); const ends = ["\nfunction ", "\nasync function ", "\nconst ", "\nlet ", "\n/*"].map(t => html.indexOf(t, i + 10)).filter(j => j > 0); return html.slice(i, Math.min(...ends)); };
const ctx = {}; vm.createContext(ctx);
vm.runInContext([grab(/const PSG_KINDS = [^\n]*/), grab(/const toQs = [^\n]*/), fnSrc("makeLadder"), fnSrc("makeSen"), fnSrc("makePassage")].join("\n") + "\nthis.api = { makeLadder, makeSen, makePassage, PSG_KINDS };", ctx);
const { makeLadder, makeSen, makePassage, PSG_KINDS } = ctx.api;

// ---- what already exists (built-in content + generated content in the progress files; NOT settings/) ----
const content = readJson(path.join(APP, "data", "content.json"));
const have = { en: new Set(content.ladder.map(x => norm(x.en))), zh: new Set(content.ladder.map(x => norm(x.zh))), sen: new Set((content.sen || []).map(x => norm(x.s))), title: new Set() };
const prog = path.join(DATA, "progress");
if (fs.existsSync(prog)) for (const f of fs.readdirSync(prog).filter(f => f.startsWith("gen-"))) {
  const d = readJson(path.join(prog, f));
  for (const x of d.list || []) {
    if (d.kind === "ladder") { have.en.add(norm(x.en)); have.zh.add(norm(x.zh)); }
    if (d.kind === "sen") have.sen.add(norm(x.s));
    if (d.kind === "passages") have.title.add(norm(x.title));
  }
}
if (fs.existsSync(path.join(DATA, "packs"))) for (const f of fs.readdirSync(path.join(DATA, "packs")).filter(f => f.endsWith(".json"))) {
  try { const pk = readJson(path.join(DATA, "packs", f)); if (pk.id === undefined) continue;
    if (path.resolve(DATA, "packs", f) === path.resolve(args[0] || "")) continue;
    (pk.ladder || []).forEach(x => { have.en.add(norm(x.en)); have.zh.add(norm(x.zh)); }); (pk.sen || []).forEach(x => have.sen.add(norm(x.s))); (pk.passages || []).forEach(x => have.title.add(norm(x.title)));
  } catch (e) {}
}

// ---- check the pack ----
const file = args[0]; if (!file || file.startsWith("--")) { console.error("usage: node check-pack.js <pack.json> [--app dir] [--data dir]"); process.exit(2); }
const problems = [], warn = [];
let pk; try { pk = readJson(file); } catch (e) { console.error("not valid JSON: " + e.message); process.exit(1); }
if (pk.zwpack !== 1) problems.push('top level: "zwpack" must be 1');
if (typeof pk.id !== "string" || !/^[\w.-]{1,60}$/.test(pk.id)) problems.push('top level: "id" must be 1–60 letters, digits, "-", "_" or "."');
if (!pk.made || isNaN(Date.parse(pk.made))) problems.push('top level: "made" must be an ISO date-time');
const idUsed = fs.existsSync(path.join(DATA, "packs")) && fs.readdirSync(path.join(DATA, "packs")).some(f => { try { const o = readJson(path.join(DATA, "packs", f)); return o.id === pk.id && path.resolve(DATA, "packs", f) !== path.resolve(file); } catch (e) { return false; } });
if (idUsed) problems.push(`top level: a pack with id "${pk.id}" already exists in packs/`);
try { const ob = readJson(path.join(DATA, "outbox.json")); if ((ob.packsDone || []).includes(pk.id)) problems.push(`top level: id "${pk.id}" was already applied once; pick a new id`); } catch (e) {}
for (const k of Object.keys(CAP)) if ((pk[k] || []).length > CAP[k]) problems.push(`${k}: ${pk[k].length} pieces, the per-run cap is ${CAP[k]}`);
const seen = { en: new Set(), zh: new Set(), sen: new Set(), title: new Set() };
const has = (s, frag) => norm(s).includes(norm(frag));
(pk.ladder || []).forEach((x, i) => {
  const at = `ladder[${i}]` + (x && x.en ? ` "${String(x.en).slice(0, 50)}"` : "");
  if (!makeLadder(x, "t")) { problems.push(at + ": the app would reject it (needs en, zh with | chunks and exactly one [key], cx ≥ 3, bad ≥ 2)"); return; }
  const key = (x.zh.match(/\[([^\]]+)\]/) || [])[1] || "";
  if (!key.trim()) problems.push(at + ": empty [key]");
  if (/[a-z]/i.test(x.zh)) warn.push(at + ": Latin letters in zh");
  (x.alt || []).forEach(a => { if (!has(a, key)) problems.push(`${at}: alternative "${a}" doesn't contain the key 「${key}」`); });
  (x.cx || []).forEach(c => { if (norm(c) === norm(key)) problems.push(`${at}: a wrong filler (cx) equals the key`); });
  (x.bad || []).forEach(b => { if ([x.zh, ...(x.alt || [])].some(a => norm(a) === norm(b))) problems.push(`${at}: a "bad" sentence equals a correct answer`); });
  if (!x.why || String(x.why).length < 20) warn.push(at + ': "why" is very short');
  if (have.en.has(norm(x.en)) || seen.en.has(norm(x.en))) problems.push(at + ": same English as an existing drill");
  if (have.zh.has(norm(x.zh)) || seen.zh.has(norm(x.zh))) problems.push(at + ": same Chinese as an existing drill");
  seen.en.add(norm(x.en)); seen.zh.add(norm(x.zh));
});
(pk.sen || []).forEach((x, i) => {
  const at = `sen[${i}]` + (x && x.s ? ` "${String(x.s).replace(/[|\/]/g, "").slice(0, 20)}"` : "");
  if (!makeSen(x, "t")) { problems.push(at + ": the app would reject it (needs s with | chunks, q, exactly 4 opts)"); return; }
  const n = norm(x.s).length; if (n < 15 || n > 60) warn.push(`${at}: ${n} characters (aim for 20–40)`);
  if (new Set(x.opts.map(norm)).size !== 4) problems.push(at + ": options aren't all different");
  if (!Array.isArray(x.frames) || !x.frames.length) warn.push(at + ": no frames (key structures)");
  if (Array.isArray(x.ft) && x.ft.length === 4 && x.ft[0] !== null) problems.push(at + ': "ft" must start with null (the correct option)');
  if (have.sen.has(norm(x.s)) || seen.sen.has(norm(x.s))) problems.push(at + ": same sentence as an existing one");
  seen.sen.add(norm(x.s));
});
(pk.passages || []).forEach((x, i) => {
  const at = `passages[${i}]` + (x && x.title ? ` "${x.title}"` : "");
  if (!x || !PSG_KINDS.includes(x.kind)) problems.push(at + `: "kind" must be one of ${PSG_KINDS.join(", ")}`);
  const p = makePassage(x, x && x.kind, "t");
  if (!p) { problems.push(at + ": the app would reject it (needs paras with | tokens, ≥ 2 usable questions)"); return; }
  const n = p.paras.join("").replace(/[|\/\s]/g, "").length; if (n < 120 || n > 280) warn.push(`${at}: ${n} characters (aim for 140–220)`);
  if (p.qs.length !== 3) problems.push(`${at}: ${p.qs.length} questions, need exactly 3`);
  p.qs.forEach((q, j) => { if (q.opts.length !== 4) problems.push(`${at}: question ${j + 1} needs 4 options`); if (!q.ex) problems.push(`${at}: question ${j + 1} needs "why" (4 reasons)`); });
  if (!x.en) warn.push(at + ": no English translation");
  if (have.title.has(norm(x.title)) || seen.title.has(norm(x.title))) problems.push(at + ": same title as an existing passage");
  seen.title.add(norm(x.title));
});
// ---- answers to requests (4c) ----
let ob = {}; try { ob = readJson(path.join(DATA, "outbox.json")); } catch (e) {}
const reqs = new Map((ob.requests || []).map(r => [r.rid, r]));
// "held": requests (and hints) that tools/daily-run/inputs.js held back as suspicious, reported to the learner
const KNOWN_TOP = ["zwpack", "id", "made", "by", "ladder", "sen", "passages", "sentences", "questions", "regrades", "held", "lyrics"];
// "lyrics": Claude's analysis of a song's lyrics (requests kind "lyrics", rid y:<id>, h = hash of the lines)
if (pk.lyrics !== undefined) {
  const cap = ob.lyricsAll ? 100 : 5;
  if (!Array.isArray(pk.lyrics)) problems.push("lyrics: must be a list");
  else {
    if (pk.lyrics.length > cap) problems.push(`lyrics: at most ${cap} songs this run${ob.lyricsAll ? "" : " (5 a night unless the note says lyricsAll)"}`);
    const songs = new Map();
    try { for (const f of fs.readdirSync(path.join(DATA, "progress")).filter(f => f.startsWith("gen-listen-"))) for (const it of (readJson(path.join(DATA, "progress", f)).list || [])) songs.set(it.id, it); } catch (e) {}
    pk.lyrics.forEach((a, n) => {
      const at = `lyrics ${n + 1} ${a && a.rid}`, rq = a && reqs.get(a.rid);
      if (!rq || rq.kind !== "lyrics") return problems.push(at + ": rid must be a lyrics request in outbox.json");
      if (a.h !== rq.h) problems.push(at + `: "h" must be copied from the request (${rq.h})`);
      const it = songs.get(rq.id); if (!it) return problems.push(at + ": song not found in progress/");
      if (!Array.isArray(a.lines) || a.lines.length !== it.cues.length) return problems.push(at + `: needs exactly one entry per line (${it.cues.length})`);
      a.lines.forEach((L, i) => {
        const want = String(it.cues[i][1]);
        if (!L || !Array.isArray(L.w)) return problems.push(`${at} line ${i + 1}: needs "w"`);
        const got = L.w.map(x => Array.isArray(x) ? String(x[0]) : "").join("");
        if (got !== want) problems.push(`${at} line ${i + 1}: the words must spell the line exactly (spaces and punctuation as their own tokens): want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
        L.w.forEach((x, j) => { if (!Array.isArray(x) || x.length < 2 || x.length > 4 || typeof x[1] !== "string" || (x[2] != null && typeof x[2] !== "string") || (x[3] != null && x[3] !== 1)) problems.push(`${at} line ${i + 1} word ${j + 1}: [text, pinyin, gloss?, 1 if tricky?]`); });
        if (L.p != null && typeof L.p !== "string") problems.push(`${at} line ${i + 1}: "p" must be text`);
        if (L.en != null && typeof L.en !== "string") problems.push(`${at} line ${i + 1}: "en" must be text`);
      });
    });
  }
}
for (const k of Object.keys(pk)) if (!KNOWN_TOP.includes(k)) problems.push(`top level: unknown section "${k}"`);
if (pk.held !== undefined) {
  if (!Array.isArray(pk.held) || pk.held.length > 50) problems.push('held: must be a list of at most 50 {"rid", "why"}');
  else pk.held.forEach((h, i) => { if (!h || typeof h.rid !== "string" || h.rid.length > 90 || typeof h.why !== "string" || h.why.length > 200) problems.push(`held ${i + 1}: needs "rid" (≤ 90 characters) and "why" (≤ 200)`); });
}
// misread structures: at most 2 parsing sentences each per pack (otherwise they bunch up)
const pieces = z => String(z).split(/…|\.\.\./).map(norm).filter(Boolean);
const senHas = (x, z) => { const t = norm(String(x.s || "").replace(/[|\/]/g, "")); let pos = 0; for (const pc of pieces(z)) { const i = t.indexOf(pc, pos); if (i < 0) return false; pos = i + pc.length; } return pieces(z).length > 0; };
for (const z of (ob.hints || {}).misreadStructures || []) { const n = (pk.sen || []).filter(x => x && senHas(x, z)).length; if (n > 2) problems.push(`sen: ${n} sentences contain the misread structure 「${z}」; at most 2 per pack`); }
(pk.passages || []).forEach((x, i) => { if (x && x.rid && (reqs.get(x.rid) || {}).kind !== "passage") problems.push(`passages[${i}]: rid "${x.rid}" isn't a passage request in outbox.json`); });
if (pk.sentences !== undefined) {
  if (typeof pk.sentences !== "object" || Array.isArray(pk.sentences)) problems.push('sentences: must be an object { "word": "sentence" }');
  else {
    const ws = Object.keys(pk.sentences);
    if (ws.length > SENT_CAP) problems.push(`sentences: ${ws.length}, the per-run cap is ${SENT_CAP}`);
    for (const w of ws) {
      const v = pk.sentences[w], sx = typeof v === "string" ? v : v && v.s;
      if (!reqs.has("w:" + w)) warn.push(`sentences: 「${w}」 wasn't requested (it'll be ignored if the word already has a sentence)`);
      if (typeof sx !== "string" || !sx.includes(w)) problems.push(`sentences: the sentence for 「${w}」 must contain the word exactly as written`);
      else if (norm(sx).length < 6 || norm(sx).length > 40) warn.push(`sentences: 「${w}」 sentence is ${norm(sx).length} characters (aim for 10–25)`);
    }
  }
}
if (pk.questions !== undefined) {
  if (!Array.isArray(pk.questions)) problems.push("questions: must be an array");
  else {
    if (pk.questions.length > CAP.questions) problems.push(`questions: ${pk.questions.length}, the per-run cap is ${CAP.questions}`);
    pk.questions.forEach((a, i) => {
      const at = `questions[${i}]` + (a && a.rid ? ` ${a.rid}` : "");
      if (!a || !reqs.has(a.rid) || reqs.get(a.rid).kind !== "questions") { problems.push(at + ": rid must be a questions request in outbox.json"); return; }
      const checkQs = (qs, at) => {
        if (!Array.isArray(qs) || qs.length !== 3) problems.push(at + ": needs exactly 3 questions");
        (qs || []).forEach((q, j) => { if (!q || !Array.isArray(q.opts) || q.opts.length !== 4) problems.push(`${at}: question ${j + 1} needs 4 options`); if (!q || !Array.isArray(q.why) || q.why.length !== 4) problems.push(`${at}: question ${j + 1} needs "why" (4 reasons)`); });
      };
      const want = reqs.get(a.rid).sections;
      if (Array.isArray(want) && want.length > 1) { // long listening transcript: 3 questions per section, as "secs"
        if (!Array.isArray(a.secs) || a.secs.length !== want.length) problems.push(`${at}: the request has ${want.length} sections; answer "secs" with one {qs} per section`);
        else a.secs.forEach((x, k) => checkQs(x && x.qs, `${at} section ${k + 1}`));
      } else checkQs(a.qs, at);
    });
  }
}
if (pk.regrades !== undefined) {
  if (!Array.isArray(pk.regrades)) problems.push("regrades: must be an array");
  else {
    if (pk.regrades.length > CAP.regrades) problems.push(`regrades: ${pk.regrades.length}, the per-run cap is ${CAP.regrades}`);
    pk.regrades.forEach((a, i) => {
      const at = `regrades[${i}]` + (a && a.rid ? ` ${a.rid}` : "");
      if (!a || !reqs.has(a.rid) || !["regrade", "check"].includes(reqs.get(a.rid).kind)) { problems.push(at + ": rid must be a regrade or check request in outbox.json"); return; }
      if (!Number.isInteger(a.score) || a.score < 0 || a.score > 3) problems.push(at + ": score must be 0, 1, 2 or 3");
      if (!["ok", "wrong", "missing"].includes(a.chunk)) problems.push(at + ': chunk must be "ok", "wrong" or "missing"');
      if (!Array.isArray(a.notes)) problems.push(at + ": notes must be an array (can be empty)");
    });
  }
}
const counts = `${(pk.ladder || []).length} drills, ${(pk.sen || []).length} sentences, ${(pk.passages || []).length} passages` + (pk.sentences ? `, ${Object.keys(pk.sentences).length} example sentences` : "") + (pk.questions ? `, ${pk.questions.length} question sets` : "") + (pk.regrades ? `, ${pk.regrades.length} regrades` : "");
for (const w of warn) console.log("warning: " + w);
if (problems.length) { for (const p of problems) console.log("PROBLEM: " + p); console.log(`\n${problems.length} problem(s) in ${counts}. Fix or drop those pieces and check again.`); process.exit(1); }
console.log(`OK: ${counts}${warn.length ? ` (${warn.length} warning${warn.length > 1 ? "s" : ""})` : ""}`);
