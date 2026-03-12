"use client";

import { useState } from "react";

import {
  signInWithEmailPassword,
  signInWithGoogle,
  signOutUser,
  signUpWithEmailAndPassword,
} from "@/firebase/auth";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        await signInWithEmailPassword(email, password);
      } else {
        await signUpWithEmailAndPassword(email, password);
      }
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err?.message ?? "로그인 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message ?? "Google 로그인 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutUser();
    } catch (err: any) {
      setError(err?.message ?? "로그아웃 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            travelespana
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            스페인 여행 플래너 · 먼저 로그인부터 시작해요.
          </p>
        </header>

        {user && (
          <div className="mb-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <p className="font-medium">현재 로그인 계정</p>
            <p className="truncate text-xs text-zinc-500">
              {user.email ?? "이메일 없음"}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
              이메일
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-100">
              비밀번호
            </label>
            <input
              type="password"
              required
              autoComplete={isLoginMode ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading
              ? "처리 중..."
              : isLoginMode
                ? "이메일로 로그인"
                : "이메일로 계정 만들기"}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => setIsLoginMode((prev) => !prev)}
            className="text-xs font-medium text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
          >
            {isLoginMode
              ? "계정이 없다면? 가입하기"
              : "이미 계정이 있다면? 로그인하기"}
          </button>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading || authLoading}
              className="text-xs font-medium text-zinc-700 underline underline-offset-2 dark:text-zinc-300"
            >
              로그아웃
            </button>
          )}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
          >
            Google 계정으로 계속하기
          </button>
        </div>
      </main>
    </div>
  );
}
