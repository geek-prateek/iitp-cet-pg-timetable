// IIT Patna Timetable - Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCyzGm22sstzNeLLx5aGeiV1ZsAWYWhoXg",
  authDomain: "iitp-timetable.firebaseapp.com",
  projectId: "iitp-timetable",
  storageBucket: "iitp-timetable.firebasestorage.app",
  messagingSenderId: "731679222233",
  appId: "1:731679222233:web:44223a8b0c0d690a2291c8"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const title = payload.notification?.title || payload.data?.title || '📢 IIT Patna Announcement';
  const body = payload.notification?.body || payload.data?.body || payload.data?.message || 'New announcement available.';

  const basePath = self.location.pathname.replace(/\/[^\/]*$/, '/');
  const iconUrl = new URL('assets/iitp-seal.png', self.location.origin + basePath).href;
  const badgeUrl = new URL('assets/app-icon.svg', self.location.origin + basePath).href;
  const targetUrl = payload.data?.url || (self.location.origin + basePath);

  const options = {
    body,
    icon: iconUrl,
    badge: badgeUrl,
    tag: 'iitp-announcement',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      url: targetUrl
    }
  };

  return self.registration.showNotification(title, options);
});

// Handle notification click to open / focus app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const basePath = self.location.pathname.replace(/\/[^\/]*$/, '/');
  const targetUrl = event.notification.data?.url || (self.location.origin + basePath);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
