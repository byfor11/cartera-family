/* Cartera Family service worker: red primero (con límite de tiempo) y caché de respaldo para usarla sin conexión. */
const CACHE = 'cartera-family-v21-d20261125-d682b3-m9957d4';
const ASSETS = ['./', 'index.html', 'style.css', 'format.js', 'chart.js', 'crypto.js', 'app.js', 'market.js', 'gestion.js', 'manifest.webmanifest', 'fonts/inter-latin.woff2', 'fonts/jetbrains-mono-latin.woff2', 'data/portfolio.enc.json', 'data/market.enc.json', 'data/models.enc.json',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(req, { cache: 'no-store' }).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; });
    net.catch(() => {});
    try {
      return await Promise.race([net, new Promise((_, rej) => setTimeout(rej, 3500))]);
    } catch (err) {
      const hit = await cache.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      if (hit) return hit;
      return net.catch(() => new Response('Sin conexión', { status: 503 }));
    }
  })());
});
