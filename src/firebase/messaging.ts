"use client";

import { getToken, onMessage, type Messaging } from "firebase/messaging";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db, messagingPromise } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

export async function getFcmToken(): Promise<string | null> {
  if (!VAPID_KEY) {
    console.warn("NEXT_PUBLIC_FCM_VAPID_KEY is not set.");
    return null;
  }

  const messaging = await messagingPromise;
  if (!messaging) {
    console.warn("Firebase messaging is not supported in this browser.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging as Messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    return token ?? null;
  } catch (err) {
    console.error("Failed to get FCM token", err);
    return null;
  }
}

export async function saveFcmToken(token: string) {
  const user = auth.currentUser;
  if (!user) return;

  const tokensCol = collection(db, "users", user.uid, "notificationTokens");
  const tokenDoc = doc(tokensCol, token);

  await setDoc(
    tokenDoc,
    {
      token,
      createdAt: serverTimestamp(),
      platform: "web",
    },
    { merge: true },
  );
}

export function subscribeToForegroundMessages(
  handler: (payload: any) => void,
) {
  messagingPromise.then((messaging) => {
    if (!messaging) return;
    onMessage(messaging as Messaging, handler);
  });
}

