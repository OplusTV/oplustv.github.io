// O-PLUS TV · service worker: la app abre rápido y sin conexión (el video siempre va por red).
const V = "oplus-v1";
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
    const c = await caches.open(V), hit = await c.match(r, { ignoreSearch: same });
    const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }                // muestra al instante y actualiza en segundo plano
    return (await net) || (r.mode === "navigate" ? await c.match("index.html") : Response.error());
  })());
});
