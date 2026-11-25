// Offline cache for the standalone (GitHub Pages) version.
// Two stores (v68): CACHE holds the app and is renewed with every release; DATA holds the big files that almost
// never change (the 7 MB dictionary, the 简/繁 table) and is renewed only when DATA's number is bumped. Before v68
// every release downloaded those ~7.3 MB again. Bump DATA only when cedict.txt or zhconv.txt changes.
const CACHE = "zwlgf-v106";
const DATA = "zwlgf-data-1";
const BIG = ["data/cedict.txt", "data/zhconv.txt"];
const FILES = ["./", "index.html", "data/words.json", "data/content.json", "data/slang.json", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png"];
const isBig = url => BIG.some(f => new URL(f, self.registration.scope).href === url.split(/[?#]/)[0]);
const storeFor = url => isBig(url) ? DATA : CACHE;
// fill DATA: a file already in DATA stays; one still in an old app store (pre-v68 layout, zwlgf-vNN) is copied over
// instead of downloaded again; anything else is downloaded
async function fillData() {
  const d = await caches.open(DATA);
  const old = (await caches.keys()).filter(k => /^zwlgf-v\d+$/.test(k));
  for (const f of BIG) {
    if (await d.match(f)) continue;
    let r = null;
    for (const k of old) { r = await (await caches.open(k)).match(f); if (r) break; }
    if (r) await d.put(f, r); else await d.add(f);
  }
}
self.addEventListener("install", e => { e.waitUntil(Promise.all([caches.open(CACHE).then(c => c.addAll(FILES)), fillData()]).then(() => self.skipWaiting())); });
// Tell open pages a newer page may be saved; the page compares versions and offers 切换 · Switch (index.html checkUpdate).
const tellPages = () => self.clients.matchAll({ type: "window" }).then(cs => cs.forEach(c => c.postMessage({ type: "page-saved" })));
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== DATA).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(tellPages)); });
// Network-first so updates arrive when online, but never wait more than NET_WAIT for it when there's a saved copy:
// with no signal a phone often leaves requests hanging instead of failing, and the app used to stay blank (2026-11-14).
// A late network answer still refreshes the saved copy for next time.
const NET_WAIT = 3000;
let slowUntil = 0; // after one request times out, the rest of this page load (its data files) uses the saved copy straight away; opening the app always tries the network
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // fonts etc.: network only, page has fallbacks
  if (e.request.method !== "GET") return;
  // no-cache: always ask GitHub whether the file changed (it otherwise lets browsers reuse it for 10 min).
  const net = fetch(e.request.url, { cache: "no-cache" }).then(r => {
    slowUntil = 0;
    if (r.ok) { const copy = r.clone(); return caches.open(storeFor(e.request.url)).then(c => c.put(e.request, copy)).then(() => { if (e.request.mode === "navigate") tellPages(); return r; }, () => r); }
    return r;
  });
  e.waitUntil(net.then(() => {}, () => {})); // keep the worker alive until a late answer is saved
  e.respondWith(caches.match(e.request, { ignoreSearch: true })
    .then(r => r || (e.request.mode === "navigate" ? caches.match("index.html") : null))
    .then(saved => {
      if (!saved) return net.catch(() => caches.match("index.html")); // nothing saved yet: wait for the network
      if (self.navigator.onLine === false || (e.request.mode !== "navigate" && Date.now() < slowUntil)) return saved;
      return Promise.race([net.catch(() => saved), new Promise(res => setTimeout(() => { slowUntil = Date.now() + 20000; res(saved); }, NET_WAIT))]);
    }));
});
