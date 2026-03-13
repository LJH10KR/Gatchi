"use client";

import {
  deleteToken,
  getToken,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db, messagingPromise } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

/**
 * 브라우저 알림 권한이 이미 granted 인 상태라고 가정하고
 * FCM 토큰만 발급합니다. 권한 요청은 호출 측에서 수행해야 합니다.
 */
export async function getFcmToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!VAPID_KEY) {
    console.warn("NEXT_PUBLIC_FCM_VAPID_KEY is not set.");
    return null;
  }

  if (!("Notification" in window)) {
    console.warn("Notifications are not supported in this browser.");
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  const messaging = await messagingPromise;
  if (!messaging) {
    console.warn("Firebase messaging is not supported in this browser.");
    return null;
  }

  try {
    const token = await getToken(messaging as Messaging, {
      vapidKey: VAPID_KEY,
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

export async function deleteFcmToken(token: string) {
  const user = auth.currentUser;
  if (!user) return;

  const tokensCol = collection(db, "users", user.uid, "notificationTokens");
  const tokenDoc = doc(tokensCol, token);

  await setDoc(
    tokenDoc,
    {
      token,
      deletedAt: serverTimestamp(),
    },
    { merge: true },
  );

  const messaging = await messagingPromise;
  if (messaging) {
    try {
      await deleteToken(messaging as Messaging);
    } catch (err) {
      console.error("Failed to delete FCM token", err);
    }
  }
}

/**
 * 토글 ON 시 호출하는 헬퍼:
 * - 권한 확인/요청
 * - FCM 토큰 발급 및 저장
 * - 최종적으로 저장된 토큰을 리턴
 */
export async function ensureFcmSubscription(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  let permission = Notification.permission;

  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    return null;
  }

  const token = await getFcmToken();
  if (!token) return null;

  await saveFcmToken(token);
  return token;
}

export function subscribeToForegroundMessages(
  handler: (payload: import("firebase/messaging").MessagePayload) => void,
) {
  messagingPromise.then((messaging) => {
    if (!messaging) return;
    onMessage(messaging as Messaging, handler);
  });
}

