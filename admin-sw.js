// Admin Panel Service Worker
const CACHE_NAME = 'admin-panel-v2';
const ADMIN_ROUTES = ['/admin-login', '/admin-dashboard', '/admin'];

// Assets to precache
const PRECACHE_ASSETS = [
  '/admin.html',
  '/admin-manifest.json',
  '/vite.svg'
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  console.log('[Admin SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Admin SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    }).catch((err) => {
      console.error('[Admin SW] Precache failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Admin SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('admin-panel-') && cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[Admin SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first strategy for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests and API calls to different domains
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Check if this is an admin route or static asset
  const isAdminRoute = ADMIN_ROUTES.some((route) => url.pathname.startsWith(route));
  const isStaticAsset = /\.(js|css|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/.test(url.pathname);
  const isAPICall = url.pathname.includes('/api/') || url.pathname.includes('.json');

  // Strategy for different request types
  if (isAPICall) {
    // Network-first for API calls
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset || isAdminRoute) {
    // Cache-first for static assets and admin routes
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for everything else
    event.respondWith(networkFirst(request));
  }
});

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Admin SW] Network request failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Cache-first strategy
async function cacheFirst(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[Admin SW] Cache and network failed:', request.url);
    // Return a fallback response for offline scenarios
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});
