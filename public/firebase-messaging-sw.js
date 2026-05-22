importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "AIzaSyB8zCvS5ghU_ynW0h4_lv7Gy_kpznhglt0",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "btsuper-d8521.firebaseapp.com",
  projectId:         self.FIREBASE_PROJECT_ID         || "btsuper-d8521",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "btsuper-d8521.firebasestorage.app",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID|| "931735521781",
  appId:             self.FIREBASE_APP_ID             || "1:931735521781:web:6a4cb9aed46c88b79478bc",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'BeachPró', {
    body:  body  || '',
    icon:  icon  || '/icon.png',
    badge: '/icon.png',
    data:  payload.data || {},
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
