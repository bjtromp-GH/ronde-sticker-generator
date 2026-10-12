const CACHE_NAME = 'sticker-a4-v2';

const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/stickers.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-touch-icon.png'
];

// Install: Cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up previous caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore non-http(s) or cross-origin extension requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // 1. Navigation requests (HTML pages) -> Network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html').then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // 2. stickers.json -> Stale-while-revalidate for instantaneous offline startup
  if (url.pathname === '/stickers.json') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then((networkRes) => {
          if (networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        }).catch(() => null);

        return cached || (await networkPromise);
      })
    );
    return;
  }

  // 3. Static assets, fonts, thumbnails, and PDFs -> Cache first, then network fallback
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/thumbnails/') ||
    url.pathname.startsWith('/PDFs/') ||
    url.pathname.startsWith('/standard_fonts/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.pfb') ||
    url.pathname.endsWith('.pdf');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          // If offline and asset is not in cache, return fallback if available
          return cached || new Response('Offline asset unavailable', { status: 503 });
        }
      })
    );
    return;
  }

  // 4. Default -> Fetch with cache fallback
  event.respondWith(
    fetch(request)
      .then((networkRes) => {
        if (networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkRes;
      })
      .catch(() => caches.match(request))
  );
});

// Background message handler for bulk caching and cache stats
self.addEventListener('message', async (event) => {
  if (!event.data) return;

  const { type, urls } = event.data;

  if (type === 'CACHE_STICKERS' && Array.isArray(urls)) {
    const cache = await caches.open(CACHE_NAME);
    let completed = 0;
    const total = urls.length;

    for (const rawUrl of urls) {
      try {
        const url = encodeURI(rawUrl).replace(/#/g, '%23').replace(/\+/g, '%2B');
        const existing = await cache.match(url);
        if (!existing) {
          const res = await fetch(url);
          if (res.ok) {
            await cache.put(url, res);
          }
        }
      } catch (e) {
        // Continue with next
      }
      completed++;
      if (completed % 5 === 0 || completed === total) {
        if (event.source) {
          event.source.postMessage({
            type: 'CACHE_PROGRESS',
            completed,
            total,
          });
        }
      }
    }
  }

  if (type === 'CHECK_CACHE_STATUS') {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    let pdfCount = 0;
    let thumbCount = 0;

    for (const req of requests) {
      const url = req.url;
      if (url.includes('/PDFs/')) pdfCount++;
      if (url.includes('/thumbnails/')) thumbCount++;
    }

    if (event.source) {
      event.source.postMessage({
        type: 'CACHE_STATUS_RESULT',
        pdfCount,
        thumbCount,
        totalCached: requests.length,
      });
    }
  }
});
