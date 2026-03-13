"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  ensureFcmSubscription,
  // deleteFcmToken, // 토큰 문자열을 알고 있을 때 실제 삭제에 활용 가능
} from "@/firebase/messaging";
import {
  getNotificationsEnabled,
  setNotificationsEnabled,
} from "@/firebase/users";

type Status = "idle" | "loading" | "error";

export function useNotificationToggle() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // 최초 로드 시 서버에 저장된 설정을 불러옵니다.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        setStatus("loading");
        const initial = await getNotificationsEnabled(user.uid);
        if (!cancelled) {
          setEnabled(initial);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setError("알림 설정을 불러오는 중 오류가 발생했어요.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggle = async () => {
    if (!user) {
      setError("로그인 후에만 알림을 설정할 수 있어요.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      if (!enabled) {
        // 토글을 켜는 경우: 권한 확인/요청 + FCM 구독 + 서버 설정 ON
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "denied") {
            setStatus("idle");
            setError(
              "브라우저에서 알림이 차단된 상태예요. 브라우저 사이트 설정에서 먼저 허용으로 바꿔 주세요.",
            );
            return;
          }
        }

        const token = await ensureFcmSubscription();
        if (!token) {
          setStatus("idle");
          setError("알림 권한을 허용하지 않아 구독에 실패했어요.");
          return;
        }

        await setNotificationsEnabled(user.uid, true);
        setEnabled(true);
      } else {
        // 토글을 끄는 경우: 서버 설정 OFF
        // (원한다면 Firestore 의 notificationTokens 를 정리하는 로직을 별도 함수로 둘 수 있습니다.)
        await setNotificationsEnabled(user.uid, false);
        setEnabled(false);
      }

      setStatus("idle");
    } catch {
      setStatus("error");
      setError("알림 설정을 변경하는 중 오류가 발생했어요.");
    }
  };

  return {
    enabled,
    status,
    error,
    toggle,
  };
}

