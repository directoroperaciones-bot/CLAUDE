// Itinerarios de Caminos: guarda cada itinerario abierto para poder verlo sin internet.
// Con conexión siempre trae la versión más reciente; sin conexión (o si tarda demasiado) muestra la guardada.
const CACHE = 'caminos-itinerarios';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== 'GET' || url.origin !== location.origin) return;
  const guardada = () => caches.match(url.pathname).then(m => m || caches.match(r));
  const red = fetch(r).then(res => {
    if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(url.pathname, copia)); }
    return res;
  });
  e.respondWith(new Promise(listo => {
    let hecho = false;
    const dar = res => { if (!hecho && res) { hecho = true; listo(res); } };
    const t = setTimeout(() => guardada().then(dar), 6000);
    red.then(res => { clearTimeout(t); dar(res); })
      .catch(() => guardada().then(m => dar(m || Response.error())));
  }));
});
