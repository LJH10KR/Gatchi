"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/firebase/firebase";
import type { Trip } from "@/firebase/trips";
import { listenTripDays, type TripDay, createTripDay } from "@/firebase/days";
import {
  createPlan,
  deletePlan,
  listenPlansForDay,
  updatePlan,
  type Plan,
} from "@/firebase/plans";
import { useAuth } from "@/context/AuthContext";

export default function TripDetailPage() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<TripDay[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [newDayDate, setNewDayDate] = useState("");

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planTitle, setPlanTitle] = useState("");
  const [planStartTime, setPlanStartTime] = useState("");
  const [planEndTime, setPlanEndTime] = useState("");
  const [planMemo, setPlanMemo] = useState("");
  const [planItemsText, setPlanItemsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = useMemo(
    () => !!user && !!trip && user.uid === trip.ownerUid,
    [user, trip],
  );

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

  const resetPlanForm = () => {
    setSelectedPlanId(null);
    setPlanTitle("");
    setPlanStartTime("");
    setPlanEndTime("");
    setPlanMemo("");
    setPlanItemsText("");
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setPlanTitle(plan.title);
    setPlanStartTime(plan.startTime ?? "");
    setPlanEndTime(plan.endTime ?? "");
    setPlanMemo(plan.memo ?? "");
    setPlanItemsText((plan.items ?? []).join(", "));
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !selectedDayId || !isOwner || !planTitle) return;

    setSaving(true);
    setError(null);

    const items =
      planItemsText.trim().length === 0
        ? []
        : planItemsText.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      if (selectedPlanId) {
        await updatePlan(trip.id, selectedDayId, selectedPlanId, {
          title: planTitle,
          startTime: planStartTime || undefined,
          endTime: planEndTime || undefined,
          memo: planMemo || undefined,
          items,
        });
      } else {
        await createPlan({
          tripId: trip.id,
          dayId: selectedDayId,
          title: planTitle,
          startTime: planStartTime || undefined,
          endTime: planEndTime || undefined,
          memo: planMemo || undefined,
          items,
        });
      }
      resetPlanForm();
    } catch (err: any) {
      setError(err?.message ?? "일정을 저장하는 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!trip || !selectedDayId || !selectedPlanId || !isOwner) return;
    if (!confirm("이 일정을 삭제할까요?")) return;
    setSaving(true);
    setError(null);
    try {
      await deletePlan(trip.id, selectedDayId, selectedPlanId);
      resetPlanForm();
    } catch (err: any) {
      setError(err?.message ?? "일정을 삭제하는 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !isOwner || !newDayDate) return;
    setSaving(true);
    setError(null);
    try {
      await createTripDay({
        tripId: trip.id,
        date: newDayDate,
        dayIndex: days.length + 1,
      });
      setNewDayDate("");
    } catch (err: any) {
      setError(err?.message ?? "날짜를 추가하는 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

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
          {!isOwner && (
            <p className="mt-1 text-[11px] text-zinc-400">
              이 여행은 다른 사용자의 여행이에요. 읽기만 가능합니다.
            </p>
          )}
        </header>

        {error && (
          <p className="mb-3 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}

        <section className="mb-5 border-b border-zinc-200 pb-4 dark:border-zinc-700">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              날짜 선택
            </h2>
            {isOwner && (
              <span className="text-[10px] text-zinc-500">
                여행 기간 안의 날짜를 추가해 보세요
              </span>
            )}
          </div>
          {days.length === 0 ? (
            <p className="text-xs text-zinc-500">
              아직 등록된 날짜가 없어요.
            </p>
          ) : (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
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

          {isOwner && (
            <form
              onSubmit={handleAddDay}
              className="flex items-center gap-2 text-xs"
            >
              <input
                type="date"
                value={newDayDate}
                onChange={(e) => setNewDayDate(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                날짜 추가
              </button>
            </form>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              일정
            </h2>
            {selectedDayId && isOwner && (
              <span className="text-[10px] text-zinc-500">
                카드를 탭하면 수정할 수 있어요
              </span>
            )}
          </div>

          {plans.length === 0 ? (
            <p className="mb-3 text-xs text-zinc-500">
              선택한 날짜에 아직 일정이 없어요.
            </p>
          ) : (
            <div className="mb-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  className={`flex h-28 min-w-[220px] snap-start flex-col justify-between rounded-2xl px-4 py-3 text-xs text-zinc-800 shadow-sm dark:text-zinc-100 ${
                    selectedPlanId === plan.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-50 dark:bg-zinc-800"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">{plan.title}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {plan.startTime || "시간 미정"} ~{" "}
                      {plan.endTime || "시간 미정"}
                    </p>
                  </div>
                  {plan.memo && (
                    <p className="line-clamp-2 text-[10px] text-zinc-400">
                      {plan.memo}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}

          {isOwner && selectedDayId && (
            <form onSubmit={handleSavePlan} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  일정 제목
                </label>
                <input
                  type="text"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="예: 사그라다 파밀리아 투어"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={planStartTime}
                    onChange={(e) => setPlanStartTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={planEndTime}
                    onChange={(e) => setPlanEndTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  메모
                </label>
                <textarea
                  value={planMemo}
                  onChange={(e) => setPlanMemo(e.target.value)}
                  rows={3}
                  placeholder="준비물, 이동 수단, 티켓 정보 등을 적어 두세요."
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                  준비물 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={planItemsText}
                  onChange={(e) => setPlanItemsText(e.target.value)}
                  placeholder="여권, 카메라, 선크림"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="submit"
                  disabled={saving || !planTitle}
                  className="flex-1 rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {saving
                    ? "저장 중..."
                    : selectedPlanId
                      ? "일정 수정 저장"
                      : "새 일정 추가"}
                </button>
                {selectedPlanId && (
                  <button
                    type="button"
                    onClick={handleDeletePlan}
                    disabled={saving}
                    className="rounded-xl border border-red-200 px-3 py-2 text-[11px] font-medium text-red-500 transition hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    일정 삭제
                  </button>
                )}
              </div>
              {selectedPlanId && (
                <button
                  type="button"
                  onClick={resetPlanForm}
                  className="mt-1 text-[10px] text-zinc-500 underline underline-offset-2"
                >
                  새 일정 추가 모드로 전환
                </button>
              )}
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

