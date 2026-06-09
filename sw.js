const CACHE_NAME = 'calendario-offline-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Guardamos el "esqueleto" visual en el teléfono
            return cache.addAll(['/', '/index.html']);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        // Intentar obtener de internet primero, si falla (sin wifi), usar la copia local
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
