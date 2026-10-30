// Offline cache for the standalone (GitHub Pages) version.
const CACHE = "zwlgf-v7";
const FILES = ["./", "index.html", "data/words.json", "data/content.json", "data/cedict.txt", "manifest.json", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return; // fonts etc.: network only, page has fallbacks
  if (e.request.method !== "GET") return;
  // network-first so updates arrive when online; cache when offline.
  // no-cache: always ask GitHub whether the file changed (it otherwise lets browsers reuse it for 10 min).
  e.respondWith(fetch(e.request.url, { cache: "no-cache" }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
