// v68: saving on this device and the error log (8765 server, clean copy of docs/).
// Unreadable saved progress is kept aside, never written over; a failed save shows a card; quiet failures are logged.
const PW = process.env.PLAYWRIGHT || "/home/claude/.npm-global/lib/node_modules/playwright";
const { chromium } = require(PW);
const B = process.env.SITE || "http://localhost:8765/";
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const LS = "zwlgf:state:v1", BAD = "zwlgf:state:unreadable";
const ready = pg => pg.waitForFunction(() => { const t = document.querySelector("#tabs"); return t && !t.hidden; }, null, { timeout: 20000 });
const labels = pg => pg.evaluate(() => [...document.querySelectorAll("#main .label")].map(e => e.textContent).join(" | "));
(async () => {
  const br = await chromium.launch();
  const fresh = async () => { const ctx = await br.newContext(); await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: B }); const pg = await ctx.newPage(); await pg.goto(B); await ready(pg); return { ctx, pg }; };
  try {
    // 0. normal: no store card, no error log
    { const { ctx, pg } = await fresh();
      await pg.evaluate(() => { S.placed = true; save(); render(); });
      ok(!/存不下|读不出来/.test(await labels(pg)), "normal: no storage card on home");
      await pg.evaluate(() => setView("me"));
      ok(!(await pg.$("#errcard")), "normal: no error log in Progress");
      await ctx.close(); }
    // 1. damaged progress: kept aside, card, copy, remove
    { const { ctx, pg } = await fresh();
      await pg.evaluate(([LS]) => localStorage.setItem(LS, '{"v":1,"items":{"L01":{"t":"lad"'), [LS]);
      await pg.reload(); await ready(pg);
      const st = await pg.evaluate(([LS, BAD]) => ({ bad: localStorage.getItem(BAD), hold: LOCAL_HOLD }), [LS, BAD]);
      ok(st.bad === '{"v":1,"items":{"L01":{"t":"lad"' && !st.hold, "damaged: the unreadable text is copied aside before anything is saved");
      await pg.evaluate(() => { S.placed = true; save(); render(); });
      ok(/进度读不出来/.test(await labels(pg)), "damaged: home card says so");
      ok(await pg.evaluate(([LS]) => { try { JSON.parse(localStorage.getItem(LS)); return true; } catch (e) { return false; } }, [LS]), "damaged: the app saves normally again (the copy is separate)");
      await pg.click("#bad-copy"); await pg.waitForTimeout(300);
      ok((await pg.evaluate(() => navigator.clipboard.readText())).startsWith('{"v":1,"items"'), "damaged: 复制 copies the original text");
      await pg.click("#bad-del"); ok(await pg.evaluate(([BAD]) => localStorage.getItem(BAD) !== null, [BAD]), "damaged: first tap on 删掉 only asks again");
      await pg.click("#bad-del"); await pg.waitForTimeout(200);
      ok(await pg.evaluate(([BAD]) => localStorage.getItem(BAD) === null, [BAD]) && !/读不出来/.test(await labels(pg)), "damaged: second tap removes the copy and the card");
      await pg.evaluate(() => setView("me"));
      ok(/load: unreadable progress/.test(await pg.$eval("#errcard", e => e.textContent)), "damaged: noted in the error log (even before the app finished loading)");
      await ctx.close(); }
    // 2. damaged again while an older copy is still kept: nothing is written over the current one
    { const { ctx, pg } = await fresh();
      await pg.evaluate(([LS, BAD]) => { localStorage.setItem(BAD, "OLDER"); localStorage.setItem(LS, "NEWER{"); }, [LS, BAD]);
      await pg.reload(); await ready(pg);
      await pg.evaluate(() => { S.placed = true; save(); });
      const st = await pg.evaluate(([LS, BAD]) => ({ ls: localStorage.getItem(LS), bad: localStorage.getItem(BAD), hold: LOCAL_HOLD }), [LS, BAD]);
      ok(st.hold && st.ls === "NEWER{" && st.bad === "OLDER", "older copy kept: saving waits, neither text is written over");
      await pg.evaluate(() => render());
      await pg.click("#bad-copy"); await pg.waitForTimeout(300);
      ok((await pg.evaluate(() => navigator.clipboard.readText())) === "NEWER{\n\n----- older unreadable copy -----\n\nOLDER", "older copy kept: 复制 copies both unreadable texts (current first)");
      await pg.click("#bad-del"); await pg.click("#bad-del"); await pg.waitForTimeout(200);
      const st2 = await pg.evaluate(([LS, BAD]) => ({ ok: (() => { try { return JSON.parse(localStorage.getItem(LS)).placed === true; } catch (e) { return false; } })(), bad: localStorage.getItem(BAD), hold: LOCAL_HOLD }), [LS, BAD]);
      ok(st2.ok && st2.bad === null && !st2.hold, "older copy kept: after 删掉 the app saves again (with what was practised meanwhile)");
      await ctx.close(); }
    // 3. storage full: toast once, home card while it lasts, gone after a save that works
    { const { ctx, pg } = await fresh();
      await pg.evaluate(([LS]) => { S.placed = true; save(); window.__full = true; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (window.__full && k === LS) throw new DOMException("quota", "QuotaExceededError"); return orig.call(this, k, v); }; }, [LS]);
      await pg.evaluate(() => { S.items.TEST = { t: "lad", n: 1 }; save(); });
      const t1 = await pg.evaluate(() => [...document.querySelectorAll(".toast")].map(e => e.textContent).join(" "));
      ok(/存不下了/.test(t1) && /copy a code before closing/.test(t1), "full: a toast says so (no sync: copy a code)");
      await pg.evaluate(() => { save(); save(); });
      const n = await pg.evaluate(() => [...document.querySelectorAll(".toast")].filter(e => /存不下/.test(e.textContent)).length);
      ok(n === 1, "full: the toast comes once, not on every save");
      await pg.evaluate(() => setView("home"));
      ok(/存不下了/.test(await labels(pg)), "full: home card while saving fails");
      await pg.evaluate(() => { window.__full = false; save(); });
      ok(!/存不下了/.test(await labels(pg)) && await pg.evaluate(([LS]) => !!JSON.parse(localStorage.getItem(LS)).items.TEST, [LS]), "full: card gone after a save that works, and the progress is saved");
      await pg.evaluate(() => setView("me"));
      ok(/save: storage full/.test(await pg.$eval("#errcard", e => e.textContent)), "full: noted in the error log");
      await ctx.close(); }
    // 4. error log: repeats counted, uncaught errors caught, last 30 kept, copy, clear
    { const { ctx, pg } = await fresh();
      await pg.evaluate(() => { noteErr("sync", { code: "network", message: "Failed to fetch" }); noteErr("sync", { code: "network", message: "Failed to fetch" }); noteErr("pack 2026-11-18-a", new Error("bad JSON")); });
      await pg.evaluate(() => { setTimeout(() => { throw new Error("boom"); }, 0); Promise.reject(new Error("late boom")); });
      await pg.waitForTimeout(300);
      await pg.evaluate(() => setView("me"));
      const t = await pg.$eval("#errcard", e => e.textContent);
      ok(/sync ×2: Failed to fetch \[network\]/.test(t), "log: the same error twice in a row is counted (×2)");
      ok(/pack 2026-11-18-a: bad JSON/.test(t) && /uncaught: boom/.test(t) && /uncaught \(promise\): late boom/.test(t), "log: noted errors and uncaught ones (also in promises) are listed");
      await pg.click("#err-copy"); await pg.waitForTimeout(300);
      const c = await pg.evaluate(() => navigator.clipboard.readText());
      ok(/zwlgf-v\d+ sync x2: Failed to fetch/.test(c) && /Mozilla/.test(c), "log: 复制 copies the entries with version and browser");
      await pg.evaluate(() => { for (let i = 0; i < 40; i++) noteErr("e" + i, "x"); });
      ok(await pg.evaluate(() => JSON.parse(localStorage.getItem("zwlgf:errlog")).length === 30 && errList()[29].w === "e39"), "log: keeps the last 30");
      await pg.evaluate(() => render()); await pg.click("#err-clear"); await pg.waitForTimeout(200);
      ok(!(await pg.$("#errcard")) && await pg.evaluate(() => localStorage.getItem("zwlgf:errlog") === null), "log: 清空 clears it");
      ok(await pg.evaluate(() => { localStorage.setItem("zwlgf:errlog", "not json"); ERRS = null; noteErr("x", null); return errList().length === 1; }), "log: a damaged log never breaks noting an error");
      await ctx.close(); }
  } catch (e) { console.log("ERROR", e); fails++; }
  await br.close(); console.log(fails ? fails + " FAILED" : "ALL PASSED"); process.exit(fails ? 1 : 0);
})();
