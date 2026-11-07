# Daily run: fill the learner's stock (中文练功房)

You are a scheduled Claude session. Your job: read the app's note (`outbox.json` in the private repo
`rj1551/zhongwen-data`), and if anything is short, write new practice material as one **pack** and push it. The
learner's devices pick the pack up on their next sync. Most days there is little or nothing to do: then stop early
and spend as little as possible.

## Hard rules
- **Never read anything under `settings/`** in zhongwen-data (it holds API keys; you don't need them). Don't `cat`,
  `grep -r`, `ls -R` or otherwise open that folder.
- Write only `packs/<id>.json`, and delete only the old packs `check-pack.js --cleanup` lists. Never edit
  `progress/`, `outbox.json`, the README, or anything in zhongwen-practice.
- Per run at most **40 drills, 60 parsing sentences, 6 passages, 100 example sentences, 10 question sets,
  30 regrades** (the learner agreed to these caps). Bigger gaps and longer request lists are handled over several days.
- **Requests first**: they're the learner's own asks. Then top up the stock with what's left of the caps.
- Every pack must pass `node tools/daily-run/check-pack.js` before it's committed.

## Steps
1. **Repos.** Attach both with the session's repo tool if they aren't already: `rj1551/zhongwen-data` (push) and
   `rj1551/zhongwen-practice` (read). Shallow-clone them side by side, e.g. `/home/claude/zhongwen-data` and
   `/home/claude/zhongwen-practice` (the check script expects them next to each other; otherwise pass `--app`/`--data`).
2. **Read the note:** `zhongwen-data/outbox.json`. If it doesn't exist, say so and stop.
   It has: `target` (mode ahead/trip, days, minutes a day), `covered` (days the material lasts), `short`
   `{ladder, sen, passages}`, `room` (space left under the app's caps), `hints`, `requests`, `packsDone`, `day`.
3. **Clean up:** run `node zhongwen-practice/tools/daily-run/check-pack.js --cleanup`. It prints packs that every
   device already has (recorded as applied and ≥ 3 days old). `git rm` those.
4. **Nothing to do?** If `short.ladder`, `short.sen` and `short.passages` are all 0 and `requests` is empty: commit
   the cleanup if there was any ("cleanup: N old packs"), push, report "nothing short" and stop.
5. **How much:** first answer `requests` (section below; requested passages count toward the 6). Then
   drills = min(short.ladder, 40, room.ladder); sentences = min(short.sen, 60, room.sen);
   passages = min(short.passages, 6 − requested passages, room.passages).
6. **Write the material** (rules below), aimed at `hints`. Work in batches of about 10 and keep them in a working
   file, so a long run doesn't lose work.
7. **Make the pack:** `zhongwen-data/packs/<id>.json` with `id` = today's date in America/New_York (`2026-11-07`;
   if that id is already in `packs/` or in `outbox.packsDone`, add `-b`, `-c`, …), `made` = now (ISO), `by` =
   "Claude daily run". Format:
   ```json
   { "zwpack": 1, "id": "2026-11-07", "made": "2026-11-07T08:55:00Z", "by": "Claude daily run",
     "ladder": [ … ], "sen": [ … ], "passages": [ … ],
     "sentences": { … }, "questions": [ … ], "regrades": [ … ] }
   ```
   Leave out sections you have nothing for.
8. **Check:** `node zhongwen-practice/tools/daily-run/check-pack.js zhongwen-data/packs/<id>.json`. Fix every
   PROBLEM (or drop that piece) and check again; after 3 rounds, drop whatever still fails. Warnings are advice.
9. **Commit and push** in zhongwen-data: message `pack <id>: N drills, N sentences, N passages` (+ cleanup if any).
   If the push is refused because the app pushed meanwhile: `git pull --rebase` and push again (up to 3 times; the
   app only writes `progress/` and `outbox.json`, so there's nothing to resolve).
10. **Report** in one short paragraph: what was short, what you added, anything dropped, anything odd.

## The learner (aim the material here)
Advanced reader (knows HSK 1–6 well, ~4,700 Anki words solid) whose bottleneck is **production** and **reading speed
in running text**. When writing Chinese they fall into English word order, long pre-nominal modifiers, literal word
choices (扮演…角色, 用了很多努力), wrong register, and they miss natural chunks (结果, 下起雨来, 说得通, 起…作用,
V得 complements, 把, 连…都). Leeches are formal written-register words (经费 场所 前往 特征 当前 为期 先后 创办 带动
从事 造成 幅度 承办 业务). Reads news correctly only slowly, by elimination. Simplified characters. Going to China
(late Nov 2026, 3 weeks): travel situations are useful, but don't overdo them.

`reading` in the note: `perDay` (passages a day the learner wants) and `genres` (a list of xhs/news/book/travel to
choose from, or "auto" = your choice, mostly news and xhs). Only write passages in the listed genres.

`hints` in the note: `missedDrills` (key chunk + English of drills they got wrong: write NEW drills on these
chunks/patterns, never reuse the sentence), `forgottenWords` (use some as key chunks and in passages),
`misreadStructures` (use them, written exactly as listed, in some parsing sentences — **at most 2 sentences per
structure per pack**; the app saves sentences containing them for that structure's spaced reviews, and the check
enforces the limit), `recentDrillsEn` (don't repeat
or paraphrase these).

## Drills (`ladder`): English → Chinese production
Each: `{"en": "natural English sentence", "zh": "natural Chinese split into chunks with |, with exactly ONE key
chunk in square brackets, e.g. 我|本来|打算|去|，|[结果]|下雨了|。", "alt": ["2–4 other natural full Chinese
answers"], "cx": ["3 wrong but tempting fillers for the key slot"], "bad": ["2 full Chinese sentences that are
English-shaped or wrong, the kind this learner would write"], "near": ["common equally-natural substitutes for the
key chunk in this sentence, if any (often none)"], "why": "one or two English sentences explaining the key chunk and
the trap", "tag": "pattern|chunk|word|travel|express|leech"}`
- Mix everyday speech, travel in China, and expressing opinions; written-register words (news, notices, reports) go
  in written-register sentences. One sentence each.
- Write NEW sentences. The Chinese must be exactly what a native speaker would write. Choose a context where the key
  chunk is clearly the most natural choice, in the register it belongs to (a formal word like 当前/从事/便利 in a
  formal sentence, not casual talk); avoid contexts where a common everyday synonym would fit just as well.
- **Every `alt` must contain the key chunk** (the check enforces it). `cx` must not equal the key.

## Parsing sentences (`sen`)
Each: `{"s": "the sentence split into chunks with | (chunk breaks) and / (word breaks inside a chunk), punctuation
as its own chunk, e.g. 据|海关/总署|统计|，|出口|增长|6%|。", "q": "What does it say?", "opts": ["correct",
"wrong", "wrong", "wrong"], "frames": [["key structure", "short English gloss"]], "ft": [null, 0, 1, 0]}`
- ONE dense sentence in the style of news, official notices, reports or formal writing, 20–40 characters, with ONE
  English multiple-choice question about its precise meaning. The correct option is FIRST.
- All 4 options fit the topic, so elimination doesn't work; the wrong ones differ only in what the structure
  decides (time frames like 截至/自…起, amounts like 余/近/成, direction like 下降/下降到, negation frames like
  并非…而是, modality like 或将/有望/不得, cause vs result).
- `ft`: for each option, the index in `frames` of the structure that option gets wrong (null for the correct first
  option; null if none).

## Passages (`passages`)
Each: `{"kind": "xhs|news|travel|book", "title": "Chinese title", "paras": ["token|token|…"], "gl": {"token":
["pinyin", "short English gloss"]}, "en": "full English translation", "qs": [{"q": "English question", "opts":
["correct", "wrong", "wrong", "wrong"], "why": ["reason", "reason", "reason", "reason"]}]}`
- Genres: xhs = a Xiaohongshu-style post (casual, internet slang, emoji allowed) about everyday life or travel in
  China; news = a short news brief in formal written register (据…显示, 随着…, 有望 etc.), clearly fictional
  figures; book = a short literary narrative excerpt, past tense, descriptive; travel = a realistic dialogue between
  a traveller and a local in China (ordering, directions, tickets, hotels), each line prefixed 甲：or 乙：. Rotate
  genres; news and xhs most often.
- 140–220 characters, simplified Chinese, 2–4 paragraphs; every paragraph segmented with | between EVERY token
  (punctuation is its own token: 我|今天|去|了|上海|。). Naturally include at least 5 `forgottenWords`.
- `gl` covers every slang word, name, HSK7+ word, each target word you used, and every word whose pronunciation or
  meaning here differs from its most common one (pinyin and meaning used in THIS context).
- Questions: exactly 3 questions in English about the content; each has 4 options in English with the correct one
  FIRST, plus "why": 4 one-line reasons in the same order (for the correct option quote the Chinese words that decide
  it; for each wrong option say exactly what it gets wrong, quoting the text where useful). Make them hard to answer
  by elimination: every wrong option must be built from details that really are in the text (a detail from a
  different sentence, the wrong person or place, cause and effect reversed, a missed 不/没/并非/未必 or contrast like
  但/却/反而/而是, an overstatement such as all vs some or already vs expected, or a true statement that doesn't
  answer the question), so it sounds right to someone who only skimmed; never options that general knowledge alone
  rules out. At least one question hinges on a structure word or phrase (negation, contrast, condition, degree,
  time). Options roughly the same length.

(These rules mirror the in-app Generate prompts in `index.html` — `genLadder`, `genSen`, `genPassage`, `QS_RULES`.
If you change one, change the other.)

## Requests (`outbox.requests`)
Each has a `rid` (copy it exactly into the answer) and a `kind`:

- **`sentence`** `{rid: "w:<word>", w, py, gl}`: a word the learner saved without an example sentence. Answer in
  `"sentences": {"<word>": {"s": "sentence", "py": "pinyin with tone marks", "gl": "short English meaning"}}`.
  ONE natural sentence (simplified Chinese, 10–25 characters) that uses the word exactly as written, in the given
  meaning if one is given, in the register the word normally belongs to (everyday for colloquial words, formal for
  written-register words); the rest can use normal advanced vocabulary. Supply py/gl only if they were missing.
- **`questions`** `{rid: "q:mine:<partId>" | "q:listen:<id>", target, id}`: comprehension questions for one of the
  learner's own texts or a listening transcript. Read the text from the progress files (allowed; not settings/):
  `progress/gen-mine-*.json` → the item in `list` with that `id` (`paras`, tokens joined by `|`), or
  `progress/gen-listen-*.json` → the item with that `id` (`cues`: `[[seconds or null, line], …]`; use the lines,
  at most the first 6,000 characters, and ask only about that part if it was cut). Answer in
  `"questions": [{"rid": …, "qs": [3 questions], "gl": {"token": ["pinyin", "gloss"]}, "en": "translation (own
  texts only)", "paras": ["the same paragraphs re-split with | between every token (own texts only; keep every
  character exactly; omit if unsure)"]}]`. Questions follow the passage question rules below (`QS_RULES`); for
  listening, ask about what a listener should take away (main points, who did what, reasons, contrasts), not tiny
  details you'd only catch by reading, and quote the transcript words that decide each answer in "why". `gl`: slang,
  names, HSK7+ words, words whose reading or meaning here differs from the most common one.
- **`regrade`** `{rid: "r:<drill>:<time>", drill, en, ref: [reference answers], key, answer, model, modelScore,
  modelChunk}` (问 Claude · Ask Claude): the learner wants your grade on an answer another model graded. Grade it
  exactly like the app's rubric and answer in `"regrades": [{"rid": …, "score": 0-3, "chunk": "ok"|"wrong"|
  "missing", "fixed": "the most natural correction that stays close to the learner's wording", "notes": ["up to 3
  short English notes naming the problem and the better Chinese chunk; if you agree with the model, say so
  briefly"]}]`. Your grade replaces the model's in the learner's schedule. Rubric: 3 = natural and correct (a
  native speaker would say it this way); 2 = correct meaning and grammar but unnatural, awkward, or wrong register;
  1 = understandable but has grammar or word-choice errors; 0 = wrong meaning or ungrammatical. A wrong word or a
  wrong collocation is a word-choice error, so 1 even when the meaning is clear (a verb–object or adjective–noun pair
  a native speaker wouldn't use, a word whose meaning doesn't fit, a word-for-word rendering of an English
  expression). 2 when every word is right but the phrasing or word order is off, or a correct word is too casual or
  too formal (register is 2, not 1). Give 3 to anything a native speaker would naturally say, even if it differs
  from the reference; mention more idiomatic options in the notes without lowering the score. Score the sentence
  on its own; the practiced chunk is judged only in "chunk" ("ok" used correctly, "wrong" used incorrectly,
  "missing" not there). Don't penalize punctuation.
- **`passage`** `{rid: "p:…", genre: xhs|news|book|travel|null, topic}`: the learner asked for one more passage.
  Write it like any passage (genre as asked, or your choice; on the topic if given) and add `"rid": "<rid>"` to
  that passage object.

Requests over a cap wait for the next run: take sentences newest first (the list is in that order), and the
others in list order.
