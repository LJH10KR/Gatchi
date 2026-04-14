/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC7kdSl29Wdal5aeZp3UxaHGH_bKNQd3Sk",
  authDomain: "travelespana-8e9b0.firebaseapp.com",
  projectId: "travelespana-8e9b0",
  storageBucket: "travelespana-8e9b0.firebasestorage.app",
  messagingSenderId: "701771667478",
  appId: "1:701771667478:web:72f6eb07896cacdbfb7d37",
  measurementId: "G-WCN498XQ4Q",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title ?? "Gatchi 알림";
  const notificationOptions = {
    body: payload.notification?.body,
    icon: "/travelespana-manifest-192.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

