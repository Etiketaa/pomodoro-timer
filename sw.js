const CACHE_NAME = 'pomodoro-timer-cache-v1';
const urlsToCache = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  '/static/images/pomo-1.png',
  '/static/images/pomo-2.png',
  '/static/alarm.mp3'
];

// Evento de instalación: se dispara cuando el navegador instala el SW
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: se dispara cada vez que la página pide un recurso (CSS, JS, imagen, etc.)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el recurso está en la caché, lo devuelve desde ahí
        if (response) {
          return response;
        }
        // Si no, lo pide a la red
        return fetch(event.request);
      })
  );
});

// Evento de activación: se dispara cuando el SW se activa
// Se usa para limpiar cachés antiguas
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de mensaje: se dispara cuando la página envía un mensaje al SW
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  }
});