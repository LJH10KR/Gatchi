"use client";

import { useEffect, useState } from "react";

import {
  signInWithEmailPassword,
  signInWithGoogle,
  signOutUser,
  signUpWithEmailAndPassword,
} from "@/firebase/auth";
import { useAuth } from "@/context/AuthContext";
import {
  createTrip,
  deleteTrip,
  listenUserTrips,
  type Trip,
} from "@/firebase/trips";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newCountry, setNewCountry] = useState("Spain");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  useEffect(() => {
    if (!user) {
      setTrips([]);
      return;
    }

    const unsubscribe = listenUserTrips(user.uid, (data) => {
      setTrips(data);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle || !newStartDate || !newEndDate) return;
    setLoading(true);
    setError(null);
    try {
      await createTrip({
        ownerUid: user.uid,
        title: newTitle,
        country: newCountry,
        startDate: newStartDate,
        endDate: newEndDate,
      });
      setNewTitle("");
      setNewStartDate("");
      setNewEndDate("");
    } catch (err: any) {
      setError(err?.message ?? "여행 생성 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm("이 여행을 삭제할까요?")) return;
    setError(null);
    try {
      await deleteTrip(id);
    } catch (err: any) {
      setError(err?.message ?? "여행 삭제 중 오류가 발생했어요.");
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
            스페인 여행 플래너 · 로그인하고 나만의 여행을 만들어 보세요.
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

        {user && (
          <section className="mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-700">
            <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              나의 여행들
            </h2>

            <form onSubmit={handleCreateTrip} className="space-y-3">
              <input
                type="text"
                placeholder="여행 이름 (예: 스페인 봄 여행)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading || authLoading}
                className="w-full rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              >
                새 여행 추가
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {authLoading ? (
                <p className="text-xs text-zinc-500">여행을 불러오는 중...</p>
              ) : trips.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  아직 등록된 여행이 없어요. 위에서 첫 여행을 추가해 보세요.
                </p>
              ) : (
                trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{trip.title}</span>
                      <span className="text-[11px] text-zinc-500">
                        {trip.startDate} ~ {trip.endDate}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="text-[11px] text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
