const CACHE_NAME = 'pomodoro-timer-cache-v4';

// Static assets to pre-cache
const STATIC_ASSETS = [
  '/',
  '/app',
  '/static/style.css',
  '/static/additional-styles.css',
  '/static/chatbot-styles.css',
  '/static/v2-styles.css',
  '/static/script.js',
  '/static/toast.js',
  '/static/circular-progress.js',
  '/static/goals.js',
  '/static/export.js',
  '/static/ambient-sound.js',
  '/static/user-profile.js',
  '/static/user-chat.js',
  '/static/app-init.js',
  '/static/auth.js',
  '/static/cloud-sync.js',
  '/static/firebase-config.js',
  '/static/theme-switcher.js',
  '/static/slideshow.js',
  '/static/chatbot.js',
  '/static/manifest.json',
  '/static/alarm.mp3',
  '/static/favicon.ico'
];

// Install: pre-cache static assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => console.warn('Cache addAll failed:', err))
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

// Fetch: smart strategy based on request type
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external API calls (Firebase, weather, streams, etc.)
  if (url.origin !== self.location.origin) {
    // Network-only for external requests
    return;
  }

  // For navigation requests (HTML pages): Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the fresh response
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For static assets (CSS, JS, images): Cache First
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request).then(response => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          });
        })
    );
    return;
  }

  // Default: Network First with cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notification support
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});