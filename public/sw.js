// Sub-Site Service Worker
// Cache-first strategy for app shell — enables offline use and Chrome PWA installability

const CACHE_NAME = 'subsite-v3';
const APP_SHELL = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/storage.js',
  '/js/charts.js',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Cloudflare Pages redirects /index.html → /; normalise here to avoid
  // the service worker ever returning a cached redirect for a navigation.
  let request = event.request;
  if (url.pathname === '/index.html') {
    url.pathname = '/';
    request = new Request(url.toString(), event.request);
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
