/* SONORA Service Worker — cache-first for static assets on GitHub Pages */
const CACHE = 'sonora-v1';
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './css/fixes.css',
  './css/eq.css',
  './js/data.js',
  './js/eq.js',
  './js/id3.js',
  './js/app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first for manifest.json (music list can change)
  if (url.pathname.endsWith('/audio/manifest.json')) {
    event.respondWith(
      fetch(event.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(event.request, clone));
        return r;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(r => {
        if (r.ok && (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.html'))) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return r;
      });
    })
  );
});
