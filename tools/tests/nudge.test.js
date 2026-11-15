// The 备份 Backup reminder: never shown when GitHub sync is set up (not even before sync connects); still shown without it.
const { chromium } = require("/home/claude/.npm-global/lib/node_modules/playwright");
const B="http://localhost:8790/"; let fails=0; const ok=(c,m)=>{console.log((c?"PASS ":"FAIL ")+m); if(!c)fails++;};
(async()=>{
  const br=await chromium.launch();
  for (const withGh of [true,false]) {
    const ctx=await br.newContext(); const pg=await ctx.newPage();
    await ctx.route("https://api.github.com/**", r=>{}); // GitHub never answers: home is drawn before sync connects
    await pg.goto(B); await pg.waitForFunction(()=>!document.querySelector("#tabs").hidden);
    // an old export and practice since, like the learner's phone
    await pg.evaluate(withGh=>{ S.lastExport=Date.now()-15*864e5; S.updatedAt=Date.now(); S.items["L01"]=S.items["L01"]||{t:"lad",h:[[Math.floor(Date.now()/1000)-86400,2,3]]}; save();
      if(withGh) localStorage.setItem("zwlgf:gh",JSON.stringify({token:"x",repo:"a/b",branch:"main"})); }, withGh);
    await pg.waitForTimeout(3000); await pg.reload(); await pg.waitForFunction(()=>!document.querySelector("#tabs").hidden);
    const seen=[]; for(let i=0;i<10;i++){ seen.push(await pg.evaluate(()=>[...document.querySelectorAll("#main .label")].some(e=>e.textContent.includes("备份 · Backup")))); await pg.waitForTimeout(200);}
    if(withGh) ok(!seen.some(Boolean),"GitHub sync set up: no backup reminder, not even before sync connects");
    else ok(seen.every(Boolean),"no GitHub sync: the backup reminder still shows");
    await ctx.close();
  }
  await br.close(); console.log(fails?fails+" FAILED":"ALL PASSED"); process.exit(fails?1:0);
})();
