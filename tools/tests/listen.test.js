// Word popup closes on an outside tap; listening transcript size + 简/繁 toggle; LRCLIB length match + order.
// Serve docs/ on 8765 first (see README).
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const URL0 = "http://localhost:8765/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const lrc = "[00:01.00]我看着你的头发\n[00:03.00]干净的面条里面\n[00:05.00]后来我们发现了";
const st = JSON.stringify({ v: 1, updatedAt: Date.now(), placed: true, skills: null, items: {}, recent: {}, log: {}, bank: {}, reads: {},
  gen: { ladder: [], passages: [], sen: [], mine: [], listen: [{ id: "Atest", title: "测试歌", kind: "link", url: "https://example.com", t: Date.now(), cues: [[1, "我看着你的头发"], [3, "干净的面条里面"], [5, "后来我们发现了"]] }] }, best: { combo: 0 } });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", 1); localStorage.setItem("zwlgf:state:v1", s); } }, st);
  const lr = [
    { trackName: "A", artistName: "x", duration: 238, syncedLyrics: lrc },
    { trackName: "B", artistName: "x", duration: 234, plainLyrics: "x" },
    { trackName: "C", artistName: "x", duration: 236, plainLyrics: "x" },
    { trackName: "D", artistName: "x", duration: 235, syncedLyrics: lrc },
    { trackName: "E", artistName: "x", duration: 235, plainLyrics: "x" },
    { trackName: "F", artistName: "x", duration: 258, syncedLyrics: lrc },
  ];
  await ctx.route("https://lrclib.net/**", r => r.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "content-type": "application/json" }, body: JSON.stringify(lr) }));
  const page = await ctx.newPage();
  page.on("pageerror", e => { console.log("PAGE ERROR", e.message); fails++; });
  await page.goto(URL0); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);

  // ---- 1. popup closes on an outside tap (reader) ----
  await page.click('#tabs button[data-tab="read"]'); await sleep(300);
  await page.locator(".pitem").first().click(); await sleep(400);
  const tks = page.locator("#rd p .tk");
  await tks.nth(0).click(); await sleep(150);
  ok(await page.locator("#sheet").count() === 1, "tapping a word opens the popup");
  await page.locator("#sheet .w").click(); await sleep(100);
  ok(await page.locator("#sheet").count() === 1, "tapping inside the popup keeps it open");
  const w1 = await page.locator("#sheet .w").textContent();
  await tks.nth(3).click(); await sleep(150);
  const w2 = await page.locator("#sheet .w").textContent();
  ok(await page.locator("#sheet").count() === 1 && w1 !== w2, "tapping another word switches to that word");
  await page.mouse.click(380, 70); await sleep(150);
  ok(await page.locator("#sheet").count() === 0, "tapping outside closes the popup");
  ok(await page.locator("#rd").count() === 1, "…and the reading stays open");
  await tks.nth(0).click(); await sleep(150); await page.click("#sheet #cls"); await sleep(100);
  ok(await page.locator("#sheet").count() === 0, "× still closes it");

  // ---- 2. listening item: size, 简/繁, spacing ----
  await page.click('#tabs button[data-tab="listen"]'); await sleep(300);
  await page.locator("[data-l]").first().click(); await sleep(300);
  await page.click('[data-mode="all"]'); await sleep(100);
  ok(await page.locator("#lcuectl").isVisible(), "size + 简/繁 controls show with the text");
  const fs = () => page.locator(".cues .cue").first().evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  ok(await fs() === 25, "transcript text is 25px by default (was 19)");
  await page.click('[data-fs="1"]'); ok(await fs() === 28, "字 + makes it bigger");
  await page.click('[data-fs="1"]'); await page.click('[data-fs="1"]'); ok(await fs() === 32, "stops at the largest size");
  await page.click('[data-fs="-1"]'); await page.click('[data-fs="-1"]'); ok(await fs() === 25, "字 − makes it smaller");
  await page.click('[data-scr="t"]'); await page.waitForFunction(() => S2T); await sleep(100);
  const tr = await page.locator(".cues .cue").allTextContents();
  console.log("   traditional:", tr.join(" / "));
  ok(tr[0] === "我看著你的頭髮" && tr[1] === "乾淨的麵條裡面" && tr[2] === "後來我們發現了", "繁體 converts by phrase (頭髮 乾淨 麵條 裡面 後來 發現)");
  await page.reload(); await page.waitForFunction(() => !document.querySelector("#tabs").hidden);
  await page.click('#tabs button[data-tab="listen"]'); await sleep(300); await page.locator("[data-l]").first().click(); await sleep(300); await page.click('[data-mode="all"]'); await sleep(400);
  ok((await page.locator(".cues .cue").first().textContent()) === "我看著你的頭髮", "繁體 is remembered on this device after a reload");
  await page.click('[data-scr="s"]'); await sleep(100);
  ok((await page.locator(".cues .cue").first().textContent()) === "我看着你的头发", "简体 switches back");
  const gap = await page.evaluate(() => { const a = document.querySelector("#lcues").getBoundingClientRect(), b = document.querySelector("#ldone").getBoundingClientRect(); return b.top - a.bottom; });
  ok(gap >= 25, "space between the text and 听完了: " + gap.toFixed(0) + "px");

  // ---- 3. LRCLIB: within 1 s, closest first ----
  await page.click("#ltredit"); await sleep(200);
  await page.evaluate(() => { LST.edit.dur = 235.4; });
  await page.fill("#lrq", "测试"); await page.click("#lrgo"); await page.waitForSelector("[data-lr]");
  const rows = await page.locator("[data-lr]").allTextContents();
  const names = rows.map(r => r.trim()[0]);
  console.log("   order:", names.join(" "), "| matching:", rows.filter(r => r.includes("对得上")).map(r => r.trim()[0]).join(" "));
  ok(names.join("") === "DEBCAF", "closest first, timed before untimed at the same length");
  ok(rows.filter(r => r.includes("对得上")).map(r => r.trim()[0]).join("") === "DEBC", "only 3:54–3:56 marked as matching a 3:55 file");
  await page.locator("[data-lr]").first().click(); await sleep(150);
  ok((await page.inputValue("#ltr")).includes("[00:01.00]"), "choosing the top result fills its timed lyrics");

  await browser.close();
  console.log(fails ? `${fails} FAILED` : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
