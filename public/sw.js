/**
 * Service worker de CobrosApp.
 *
 * Su único trabajo es recibir los avisos que manda el servidor y mostrarlos.
 * No cachea nada: la app necesita la red para leer los datos, y un caché a
 * medias daría cifras viejas sin avisar, que es peor que un error claro.
 */

const ICON = '/icons/icon-192.png';

// Tomar el control sin esperar a que se cierren las pestañas viejas.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Mis cobros', body: '', url: '/' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Push sin cuerpo válido: mostramos el aviso genérico.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: ICON,
      badge: ICON,
      lang: 'es-MX',
      data: { url: payload.url || '/' },
      // Un aviso por servicio y ciclo; el tag evita apilar duplicados.
      tag: payload.url || 'cobros',
      renotify: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Si la app ya está abierta, la enfocamos en vez de abrir otra pestaña.
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
