/* SONORA Service Worker — Phase A
   Cache-first static assets; network-first for music manifests. */
const CACHE = 'sonora-v2';
const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './css/fixes.css',
  './css/eq.css',
  './js/data.js',
  './js/covers.js',
  './js/eq.js',
  './js/id3.js',
  './js/app.js',
  './js/deeplink.js',
  './js/radio.js',
  './js/share.js',
  './js/foryou.js',
  './js/seo.js',
  './js/phase-a.js',
  './manifest.webmanifest',
  './robots.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  const path = url.pathname;
  const networkFirst =
    path.endsWith('/audio/manifest.json') ||
    path.endsWith('/audio/radio-feed.json');

  if (networkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
          return r;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Audio: network preferred, no aggressive cache of large binaries
  if (path.includes('/audio/') && path.endsWith('.mp3')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((r) => {
        if (
          r.ok &&
          (path.endsWith('.css') ||
            path.endsWith('.js') ||
            path.endsWith('.html') ||
            path.endsWith('.webmanifest'))
        ) {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(event.request, clone));
        }
        return r;
      });
    })
  );
});
