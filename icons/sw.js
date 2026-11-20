/* Service worker — Weather or not (PWA)
 * Stratégies :
 *  - Coquille de l'app (HTML, manifest, icônes) : précache, puis "network-first" pour index.html
 *    afin de récupérer les mises à jour quand le réseau est disponible.
 *  - Bibliothèques CDN (Tailwind, Chart.js, Leaflet, MapLibre, Font Awesome, Google Fonts) :
 *    "stale-while-revalidate" — l'app démarre hors ligne une fois ces fichiers mis en cache.
 *  - API météo (Open-Meteo, marine, géocodage, RainViewer, Nominatim) : "network-first"
 *    avec repli sur la dernière réponse en cache si le réseau est absent.
 *  - Tuiles de carte : "cache-first" avec plafond d'entrées (les tuiles changent peu).
 * Pour forcer une mise à jour chez les utilisateurs : incrémenter VERSION.
 */
const VERSION = 'v1.2.0';
const SHELL_CACHE = 'shell-' + VERSION;
const LIB_CACHE = 'libs-' + VERSION;
const API_CACHE = 'api-v1';
const TILE_CACHE = 'tiles-v1';
const TILE_MAX = 600;
const API_MAX = 80;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

const LIB_HOSTS = [
  'cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com',
  'fonts.googleapis.com', 'fonts.gstatic.com'
];
const API_HOSTS = [
  'api.open-meteo.com', 'marine-api.open-meteo.com', 'geocoding-api.open-meteo.com',
  'api.rainviewer.com', 'nominatim.openstreetmap.org', 'mesonet.agron.iastate.edu'
];
const TILE_HOSTS = [
  'tile.openstreetmap.org', 'tile.opentopomap.org',
  'data.geopf.fr', 'tiles.openseamap.org', 'tiles.opensnowmap.org', 'tilecache.rainviewer.com'
];
const matchHost = (host, list) => list.some(h => host === h || host.endsWith('.' + h));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const keep = [SHELL_CACHE, LIB_CACHE, API_CACHE, TILE_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }
}

async function networkFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(req, res.clone());
      if (max) trimCache(cacheName, max);
    }
    return res;
  } catch (e) {
    const cached = await cache.match(req, { ignoreVary: true });
    if (cached) return cached;
    throw e;
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || network;
}

async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(req, res.clone());
    trimCache(cacheName, max);
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigation (ouverture de l'app) : réseau d'abord, sinon index.html en cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        caches.open(SHELL_CACHE).then(c => c.put('./index.html', res.clone()));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, SHELL_CACHE));
    return;
  }
  if (matchHost(url.hostname, API_HOSTS)) {
    event.respondWith(networkFirst(req, API_CACHE, API_MAX));
    return;
  }
  if (matchHost(url.hostname, LIB_HOSTS)) {
    event.respondWith(staleWhileRevalidate(req, LIB_CACHE));
    return;
  }
  if (matchHost(url.hostname, TILE_HOSTS)) {
    event.respondWith(cacheFirst(req, TILE_CACHE, TILE_MAX));
    return;
  }
  // Autres requêtes : comportement réseau par défaut
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
