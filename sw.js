/* Service worker del dashboard gerencial: siempre la versión más reciente con señal;
   sin señal, la última copia guardada. */
const CACHE = 'dashboard-supervision-v1';
const ARCHIVOS = ['./', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(ARCHIVOS.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const pagina = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  const clave = url.origin + url.pathname;
  if (pagina) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const red = await Promise.race([fetch(new Request(clave, { cache: 'no-cache' })), new Promise((_, rej) => setTimeout(() => rej(new Error('lento')), 4000))]);
        if (red && red.ok) { c.put(clave, red.clone()); return red; }
        throw new Error('sin respuesta');
      } catch (err) { return (await c.match(clave)) || (await c.match('./')) || Response.error(); }
    })());
    return;
  }
  e.respondWith(caches.open(CACHE).then(async c => {
    const enCache = await c.match(req, { ignoreSearch: true });
    const red = fetch(new Request(clave, { cache: 'no-cache' })).then(r => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (enCache) { e.waitUntil(red); return enCache; }
    return (await red) || Response.error();
  }));
});
