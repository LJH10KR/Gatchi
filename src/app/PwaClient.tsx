"use client";

import { useEffect } from "react";
import { getFcmToken, saveFcmToken } from "@/firebase/messaging";

export function PwaClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("service worker registration failed", err);
      }
    };

    register();
  }, []);

  useEffect(() => {
    const setupFcm = async () => {
      const token = await getFcmToken();
      if (!token) return;
      await saveFcmToken(token);
    };

    if (typeof window !== "undefined") {
      setupFcm();
    }
  }, []);

  return null;
}

