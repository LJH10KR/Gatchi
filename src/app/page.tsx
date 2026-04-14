"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  listenAllTrips,
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
  const [newCountry, setNewCountry] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = listenAllTrips((data) => {
      setTrips(data);
    });

    return () => unsubscribe();
  }, []);

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("로그인 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Google 로그인 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutUser();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("로그아웃 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle || !newCountry || !newStartDate || !newEndDate) return;
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
      setNewCountry("");
      setNewStartDate("");
      setNewEndDate("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("여행 생성 중 오류가 발생했어요.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!confirm("이 여행을 삭제할까요?")) return;
    setError(null);
    try {
      await deleteTrip(id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("여행 삭제 중 오류가 발생했어요.");
      }
    }
  };

  const userInitial = (user?.displayName ?? user?.email ?? "U")
    .charAt(0)
    .toUpperCase();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-start justify-center bg-white px-0 py-0 font-sans dark:bg-zinc-900">
        <main className="relative w-full max-w-md bg-white px-4 py-6 dark:bg-zinc-900">
          {/* 로그인 후와 동일한 위치: 우측 상단 아바타 자리 */}
          <div className="absolute right-4 top-4">
            <div
              className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700"
              aria-hidden
            />
          </div>

          <header className="mb-6 text-center">
            <div className="mx-auto h-8 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
          </header>

          {/* 로그인 폼 영역 스켈레톤 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 w-14 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-xl bg-zinc-300 dark:bg-zinc-600" />
            <div className="flex justify-start">
              <div className="h-3 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="h-10 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800" />
          </div>

          <section className="mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-700">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="h-4 w-24 shrink-0 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 max-w-[min(220px,55%)] flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="home-skeleton-card flex h-32 min-w-[220px] snap-start flex-col justify-between rounded-2xl bg-zinc-50 px-4 py-3 shadow-sm dark:bg-zinc-800"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-4 flex-1 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                      <div className="h-3 w-4 shrink-0 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                    </div>
                    <div className="h-3 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-3 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                  </div>
                  <div className="h-3 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-white px-0 py-0 font-sans dark:bg-zinc-900">
      <main className="relative w-full max-w-md bg-white px-4 py-6 dark:bg-zinc-900">
        {user && (
          <div className="absolute right-4 top-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {userInitial}
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white p-3 text-xs shadow-lg ring-1 ring-zinc-200 dark:bg-zinc-800 dark:ring-zinc-700">
                  <p className="mb-2 truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {user.email ?? "이메일 없음"}
                  </p>
                  <Link
                    href="/settings"
                    className="block rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    onClick={() => setShowUserMenu(false)}
                  >
                    사용자 설정
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={loading || authLoading}
                    className="mt-1 block w-full rounded-lg px-2 py-1 text-left text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Gatchi
          </h1>
          {/* <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            스페인 여행 플래너 · 로그인하고 나만의 여행을 만들어 보세요.
          </p> */}
        </header>

        {!user && (
          <>
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
                  autoComplete={
                    isLoginMode ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-400"
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {error}
                </p>
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
          </>
        )}

        <section className="mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-700">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              나의 여행들
            </h2>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-500">
                  내 여행은 ✨ 표시가 붙어요
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateTrip((prev) => !prev)}
                  className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                >
                  {showCreateTrip ? "여행 추가 닫기" : "새 여행 추가"}
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-500">
                로그인 없이도 다른 사람의 여행을 구경할 수 있어요
              </span>
            )}
          </div>

          {user && showCreateTrip && (
            <form onSubmit={handleCreateTrip} className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="여행 이름 (예: 스페인 봄 여행)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <input
                type="text"
                placeholder="국가 (예: Spain)"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
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
          )}

          <div className="mt-2">
            {trips.length === 0 ? (
              <p className="text-xs text-zinc-500">
                아직 등록된 여행이 없어요. 로그인 후 첫 여행을 추가해 보세요.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
                {trips.map((trip) => {
                  const isOwner = user && trip.ownerUid === user.uid;
                  return (
                    <div key={trip.id} className="snap-start">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="flex h-32 min-w-[220px] flex-col justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="line-clamp-2 text-sm font-semibold">
                              {trip.title}
                            </span>
                            {isOwner && (
                              <span className="ml-1 text-[10px] text-amber-500">
                                ✨
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {trip.startDate} ~ {trip.endDate}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-400">
                            {trip.country}
                          </p>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          상세 일정을 보려면 탭하세요
                        </p>
                      </Link>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="mt-1 w-full text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
                        >
                          이 여행 삭제
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
