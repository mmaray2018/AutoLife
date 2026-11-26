/* AutoLife World — Service Worker Web Push & Notification Handler */
/* Imported into the Workbox-generated Service Worker via importScripts */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'AutoLife World',
    body: 'Você tem um lembrete preventivo de manutenção pendente.',
    url: '/',
    tag: 'autolife-reminder',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    } catch {
      const text = event.data.text();
      if (text) payload.body = text;
    }
  }

  const options = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || 'autolife-reminder',
    renotify: true,
    requireInteraction: false,
    data: {
      url: typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/',
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl).catch(() => client);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
