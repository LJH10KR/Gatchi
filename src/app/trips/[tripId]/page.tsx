"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/firebase/firebase";
import type { Trip } from "@/firebase/trips";
import { listenTripDays, type TripDay } from "@/firebase/days";
import { listenPlansForDay, type Plan } from "@/firebase/plans";

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    async function fetchTrip() {
      const ref = doc(db, "trips", tripId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as any;
        setTrip({
          id: snap.id,
          title: data.title ?? "",
          country: data.country ?? "",
          startDate: data.startDate ?? "",
          endDate: data.endDate ?? "",
          ownerUid: data.ownerUid,
          createdAt: data.createdAt?.toDate?.(),
        });
      }
    }
    fetchTrip();
  }, [tripId]);

  useEffect(() => {
    const unsubscribe = listenTripDays(tripId, (d) => {
      setDays(d);
      if (!selectedDayId && d.length > 0) {
        setSelectedDayId(d[0].id);
      }
    });
    return () => unsubscribe();
  }, [tripId, selectedDayId]);

  useEffect(() => {
    if (!selectedDayId) {
      setPlans([]);
      return;
    }
    const unsubscribe = listenPlansForDay(tripId, selectedDayId, (p) => {
      setPlans(p);
    });
    return () => unsubscribe();
  }, [tripId, selectedDayId]);

  if (!trip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
        <p className="text-sm text-zinc-500">여행 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg dark:bg-zinc-900">
        <header className="mb-4">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {trip.title}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {trip.startDate} ~ {trip.endDate} · {trip.country}
          </p>
        </header>

        <section className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            날짜 선택
          </h2>
          {days.length === 0 ? (
            <p className="text-xs text-zinc-500">
              아직 등록된 날짜가 없어요. 이후에 날짜/일정을 추가하는 UI를 연결할게요.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
              {days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`min-w-[80px] rounded-xl px-3 py-2 text-xs ${
                    selectedDayId === day.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  <span className="block text-[10px] text-zinc-400">
                    {day.dayIndex}일차
                  </span>
                  <span className="block">{day.date}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            일정
          </h2>
          {plans.length === 0 ? (
            <p className="text-xs text-zinc-500">
              선택한 날짜에 아직 일정이 없어요. 이후에 일정 추가/편집 UI를 연결할게요.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex h-28 min-w-[220px] snap-start flex-col justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-xs text-zinc-800 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <div>
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {plan.startTime} ~ {plan.endTime}
                    </p>
                  </div>
                  {plan.memo && (
                    <p className="line-clamp-2 text-[10px] text-zinc-400">
                      {plan.memo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

