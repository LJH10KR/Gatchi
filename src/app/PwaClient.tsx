"use client";

import { useEffect } from "react";
import {
  getFcmToken,
  saveFcmToken,
  subscribeToForegroundMessages,
} from "@/firebase/messaging";

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    subscribeToForegroundMessages((payload) => {
      const title = payload?.notification?.title ?? "travelespana 알림";
      const body = payload?.notification?.body ?? "";

      // 심플한 브라우저 내 토스트
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.left = "50%";
      div.style.top = "16px";
      div.style.transform = "translateX(-50%)";
      div.style.zIndex = "9999";
      div.style.background = "#0f172a";
      div.style.color = "white";
      div.style.padding = "10px 14px";
      div.style.borderRadius = "999px";
      div.style.fontSize = "12px";
      div.style.boxShadow = "0 10px 20px rgba(0,0,0,0.2)";
      div.style.maxWidth = "90%";
      div.style.textAlign = "center";
      div.textContent = body ? `${title} · ${body}` : title;

      document.body.appendChild(div);

      setTimeout(() => {
        div.style.transition = "opacity 0.3s ease";
        div.style.opacity = "0";
        setTimeout(() => {
          div.remove();
        }, 300);
      }, 4000);
    });
  }, []);

  return null;
}

