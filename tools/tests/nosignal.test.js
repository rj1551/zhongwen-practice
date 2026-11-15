const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const B="http://localhost:8790/"; let fails=0; const ok=(c,m)=>{console.log((c?"PASS ":"FAIL ")+m); if(!c)fails++;};
(async()=>{
  const br=await chromium.launch(); const ctx=await br.newContext(); const pg=await ctx.newPage();
  await pg.goto(B); await pg.waitForFunction(()=>navigator.serviceWorker.controller||null,null,{timeout:20000}).catch(()=>{});
  await pg.reload(); await pg.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:20000});
  await pg.waitForFunction(()=>!document.querySelector("#tabs").hidden,null,{timeout:20000});
  ok(true,"online: app loads, service worker in control");
  // 1. no signal: requests hang instead of failing
  await (await fetch(B+"__mode/hang")).text();
  let t=Date.now(); await pg.goto(B,{waitUntil:"commit",timeout:30000}).catch(e=>console.log("goto:",e.message.split("\n")[0]));
  const loaded=await pg.waitForFunction(()=>{const t=document.querySelector("#tabs");return t&&!t.hidden;},null,{timeout:15000}).then(()=>true,()=>false);
  ok(loaded,`no signal (requests hang): app opens from the offline copy (${((Date.now()-t)/1000).toFixed(1)} s)`);
  // 3. online again: a new version arrives on the next open (network first when the network answers)
  await (await fetch(B+"__mode/ok")).text();
  const fs=require("fs"); const f="/home/claude/tests/site/index.html"; const orig=fs.readFileSync(f,"utf8");
  fs.writeFileSync(f, orig.replace("<title>中文练功房</title>","<title>中文练功房 NEWVER</title>"));
  await pg.goto(B); ok((await pg.title()).includes("NEWVER"),"online: a new version is used straight away");
  // 4. a late answer (after the 3 s wait) still refreshes the saved copy
  fs.writeFileSync(f, orig.replace("<title>中文练功房</title>","<title>中文练功房 LATEVER</title>"));
  await (await fetch(B+"__mode/slow")).text();
  await pg.goto(B,{timeout:30000}); ok(!(await pg.title()).includes("LATEVER"),"slow network: opens from the saved copy without waiting");
  await pg.waitForTimeout(6000); await (await fetch(B+"__mode/ok")).text();
  const hasLate=await pg.evaluate(async()=>{const r=await caches.match("./",{ignoreSearch:true})||await caches.match("index.html");return (await r.text()).includes("LATEVER");});
  ok(hasLate,"slow network: the late answer is saved for next time");
  fs.writeFileSync(f, orig);
  // 2. plain offline (requests fail at once)
  await (await fetch(B+"__mode/ok")).text(); await ctx.setOffline(true);
  t=Date.now(); await pg.goto(B).catch(()=>{});
  const l2=await pg.waitForFunction(()=>{const t=document.querySelector("#tabs");return t&&!t.hidden;},null,{timeout:15000}).then(()=>true,()=>false);
  ok(l2,`offline: app opens (${((Date.now()-t)/1000).toFixed(1)} s)`);
  await ctx.setOffline(false);
  await br.close(); console.log(fails?fails+" FAILED":"ALL PASSED"); process.exit(fails?1:0);
})();
