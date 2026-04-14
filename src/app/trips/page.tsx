"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { signOutUser } from "@/firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { createTrip, deleteTrip, listenAllTrips, type Trip } from "@/firebase/trips";

export default function TripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const handleSignOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await signOutUser();
      router.replace("/login");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("로그아웃 중 오류가 발생했어요.");
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
      setShowCreateTrip(false);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("여행 생성 중 오류가 발생했어요.");
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
      if (err instanceof Error) setError(err.message);
      else setError("여행 삭제 중 오류가 발생했어요.");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="h-8 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  const userInitial = (user.displayName ?? user.email ?? "U").charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen items-start justify-center bg-white px-0 py-0 font-sans dark:bg-zinc-900">
      <main className="relative w-full max-w-md bg-white px-4 pb-20 pt-6 dark:bg-zinc-900">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Gatchi</h1>
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
                  disabled={loading}
                  className="mt-1 block w-full rounded-lg px-2 py-1 text-left text-[11px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="border-t border-zinc-200 pt-5 dark:border-zinc-700">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">나의 여행들</h2>
            <button
              type="button"
              onClick={() => setShowCreateTrip((prev) => !prev)}
              className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
            >
              {showCreateTrip ? "여행 추가 닫기" : "새 여행 추가"}
            </button>
          </div>

          {showCreateTrip && (
            <form onSubmit={handleCreateTrip} className="mb-4 space-y-3">
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

          {error && <p className="mb-3 text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="mt-2">
            {trips.length === 0 ? (
              <p className="text-xs text-zinc-500">
                아직 등록된 여행이 없어요. 첫 여행을 추가해 보세요.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
                {trips.map((trip) => {
                  const isOwner = trip.ownerUid === user.uid;
                  return (
                    <div key={trip.id} className="snap-start">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="flex h-32 min-w-[220px] flex-col justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-800 shadow-sm transition hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="line-clamp-2 text-sm font-semibold">{trip.title}</span>
                            {isOwner && <span className="ml-1 text-[10px] text-amber-500">✨</span>}
                          </div>
                          <p className="mt-1 text-[11px] text-zinc-500">
                            {trip.startDate} ~ {trip.endDate}
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-400">{trip.country}</p>
                        </div>
                        <p className="text-[10px] text-zinc-500">상세 일정을 보려면 탭하세요</p>
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
