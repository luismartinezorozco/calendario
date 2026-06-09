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

En cuanto Vercel publique ese pequeño archivo `sw.js`, ¡la magia ocurrirá! La próxima vez que entres a la aplicación desde tu teléfono, el Service Worker se instalará de fondo. Después de eso, **podrás activar el Modo Avión en tu celular, abrir la página y el diseño cargará inmediatamente**.

Si notas algún detalle extraño durante las pruebas sin conexión, avísame e iteramos sobre él.
