// O-PLUS TV · service worker: abre sin conexión, pero con internet siempre carga la versión más nueva.
const V = "oplus-v2";
const SHELL = ["./", "index.html", "admin.html", "firebase-config.js", "manifest.webmanifest", "admin.webmanifest",
  "favicon-64.png", "favicon-192.png", "icon-512.png", "apple-touch-icon.png"];
const CDN = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|www\.gstatic\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url), same = u.origin === location.origin;
  if (!same && !CDN.test(u.hostname)) return;                 // streams, Firestore y guías: directo a la red
  if (same && /\.(m3u8|ts|xml)(\?|$)/i.test(u.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(V);
    if (same) {                                                // red primero (máx. 4 s); si falla, la copia guardada
      try {
        const res = await Promise.race([fetch(r), new Promise((_, j) => setTimeout(j, 4000))]);
        if (res.ok) c.put(r, res.clone());
        return res;
      } catch {
        return (await c.match(r, { ignoreSearch: true })) || (r.mode === "navigate" ? await c.match("index.html") : Response.error());
      }
    }
    const hit = await c.match(r);                              // librerías externas: copia primero y se actualiza sola
    const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  })());
});
