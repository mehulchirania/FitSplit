// firebase-messaging-sw.js
// Background FCM message handler for FitSplit PWA.
// This file is served from the root (/firebase-messaging-sw.js) by Next.js public/ folder.
// IMPORTANT: Keep Firebase SDK versions in sync with package.json.

importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js");

// These values are public (they're already in the HTML bundle via NEXT_PUBLIC_ vars).
// We duplicate them here because service workers cannot access process.env or Next.js config.
const firebaseConfig = {
  apiKey: "AIzaSyAi7mmLdZNVURG7yGc5I63YbblMYw7Vewg",
  authDomain: "fitsplit-29215.firebaseapp.com",
  projectId: "fitsplit-29215",
  storageBucket: "fitsplit-29215.firebasestorage.app",
  messagingSenderId: "766523780087",
  appId: "1:766523780087:web:e825b99ed4a88d30c79cf2"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle messages that arrive when the page is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "FitSplit";
  const body  = payload.notification?.body  ?? "";
  const icon  = payload.notification?.icon  ?? "/apple-touch-icon.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/favicon-32x32.png",
    data: payload.data ?? {}
  });
});

// Clicking a notification opens / focuses the FitSplit tab.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/member";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
