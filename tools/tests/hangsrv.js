// Static server for docs/ that can be told to hang (accept the request, never answer), like a phone with no signal.
const http=require("http"),fs=require("fs"),path=require("path");
const root=process.argv[2], port=+process.argv[3]; let mode="ok"; let hung=[];
const types={".html":"text/html",".js":"text/javascript",".json":"application/json",".txt":"text/plain",".png":"image/png"};
http.createServer((q,r)=>{
  if(q.url==="/__mode/hang"){mode="hang";return r.end("hang");} if(q.url==="/__mode/slow"){mode="slow";hung.forEach(x=>x.destroy());hung=[];return r.end("slow");} if(q.url==="/__mode/ok"){mode="ok";hung.forEach(x=>x.destroy());hung=[];return r.end("ok");}
  if(mode==="hang"){hung.push(r);return;} // never respond (until the signal comes back: then the connection drops)
  let p=decodeURIComponent(q.url.split("?")[0]); if(p.endsWith("/"))p+="index.html";
  const f=path.join(root,p); const go=()=>fs.readFile(f,(e,b)=>{ if(e){r.statusCode=404;return r.end();} r.setHeader("Content-Type",types[path.extname(f)]||"application/octet-stream"); r.end(b);}); if(mode==="slow") setTimeout(go,5000); else go();
}).listen(port);
