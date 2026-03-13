"use client";

import { useNotificationToggle } from "@/hooks/useNotificationToggle";

export default function SettingsPage() {
  const { enabled, status, error, toggle } = useNotificationToggle();
  const loading = status === "loading";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            설정
          </h1>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            여행 알림을 켜거나 끌 수 있어요.
          </p>
        </header>

        <section className="mb-4 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-50">
                알림 받기
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                여행 일정 변경, 동행자 요청 등의 알림을 브라우저로 받아요.
              </p>
            </div>

            <button
              type="button"
              onClick={toggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                enabled
                  ? "bg-emerald-500"
                  : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                  enabled ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">
              {error}
            </p>
          )}

          {loading && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              설정을 저장하는 중이에요...
            </p>
          )}

          {!loading && !error && (
            <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
              브라우저에서 알림을 차단한 상태라면, 사이트 설정에서 먼저
              알림을 허용해 주세요.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

