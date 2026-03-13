"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
} from "firebase/firestore";

import { db } from "@/firebase/firebase";
import type { Trip } from "@/firebase/trips";
import {
  listenTripDays,
  type TripDay,
  createTripDay,
  deleteTripDayWithPlans,
} from "@/firebase/days";
import {
  createPlan,
  deletePlan,
  listenPlansForDay,
  updatePlan,
  type Plan,
} from "@/firebase/plans";
import { useAuth } from "@/context/AuthContext";
import { addMemberToTrip } from "@/firebase/trips";
import {
  findUserByEmail,
  getUsersByUids,
  type AppUser,
} from "@/firebase/users";
import { sendTripRequest } from "@/firebase/requests";

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
  const [planItems, setPlanItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<AppUser[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberLoading, setMemberLoading] = useState(false);
  const [requestTargetUid, setRequestTargetUid] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [pendingSelectedDate, setPendingSelectedDate] = useState<string | null>(
    null,
  );
  const [showDayCarousel, setShowDayCarousel] = useState(true);
  const [dayHasPlans, setDayHasPlans] = useState<Record<string, boolean>>({});
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);

  const isOwner = useMemo(
    () => !!user && !!trip && user.uid === trip.ownerUid,
    [user, trip],
  );

  const selectedDay = useMemo(
    () => days.find((d) => d.id === selectedDayId) ?? null,
    [days, selectedDayId],
  );

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  useEffect(() => {
    async function fetchTrip() {
      const ref = doc(db, "trips", tripId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as {
          title?: string;
          country?: string;
          startDate?: string;
          endDate?: string;
          ownerUid: string;
          members?: string[];
          createdAt?: { toDate?: () => Date };
        };
        const tripData: Trip = {
          id: snap.id,
          title: data.title ?? "",
          country: data.country ?? "",
          startDate: data.startDate ?? "",
          endDate: data.endDate ?? "",
          ownerUid: data.ownerUid,
          members: data.members ?? [],
          createdAt: data.createdAt?.toDate?.(),
        };
        setTrip(tripData);

        const memberUids = Array.from(
          new Set<string>([tripData.ownerUid, ...(tripData.members ?? [])]),
        );

        if (!user) {
          // 비로그인 사용자는 Firestore rules 상 users 컬렉션 read 권한이 없으므로
          // 참여자 상세 정보는 조회하지 않습니다.
          setParticipants([]);
          return;
        }

        if (memberUids.length > 0) {
          const users = await getUsersByUids(memberUids);
          setParticipants(users);
          if (!requestTargetUid && users.length > 0) {
            setRequestTargetUid(users[0].uid);
          }
        }
      }
    }
    fetchTrip();
  }, [tripId, user, requestTargetUid]);

  useEffect(() => {
    const unsubscribe = listenTripDays(tripId, (d) => {
      setDays(d);

      if (pendingSelectedDate) {
        const match = d.find((day) => day.date === pendingSelectedDate);
        if (match) {
          setSelectedDayId(match.id);
          setPendingSelectedDate(null);
          return;
        }
      }

      // 각 날짜에 일정이 존재하는지 최소 1회만 확인
      (async () => {
        if (d.length === 0) return;

        const updates: Record<string, boolean> = {};

        await Promise.all(
          d.map(async (day) => {
            if (dayHasPlans[day.id] !== undefined) return;
            const plansRef = collection(
              db,
              "trips",
              tripId,
              "days",
              day.id,
              "plans",
            );
            const q = query(plansRef, limit(1));
            const snap = await getDocs(q);
            updates[day.id] = !snap.empty;
          }),
        );

        if (Object.keys(updates).length > 0) {
          setDayHasPlans((prev) => ({ ...prev, ...updates }));
        }
      })();
    });
    return () => unsubscribe();
  }, [tripId, selectedDayId, pendingSelectedDate, dayHasPlans]);

  useEffect(() => {
    if (!selectedDayId) {
      setPlans([]);
      return;
    }
    const unsubscribe = listenPlansForDay(tripId, selectedDayId, (p) => {
      setPlans(p);
      setDayHasPlans((prev) => ({
        ...prev,
        [selectedDayId]: p.length > 0,
      }));
    });
    return () => unsubscribe();
  }, [tripId, selectedDayId]);

  const resetPlanForm = () => {
    setSelectedPlanId(null);
    setPlanTitle("");
    setPlanStartTime("");
    setPlanEndTime("");
    setPlanMemo("");
    setPlanItems([""]);
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlanId(plan.id);
    setPlanTitle(plan.title);
    setPlanStartTime(plan.startTime ?? "");
    setPlanEndTime(plan.endTime ?? "");
    setPlanMemo(plan.memo ?? "");
    const items = plan.items ?? [];
    setPlanItems(items.length > 0 ? items : [""]);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !selectedDayId || !isOwner || !planTitle) return;

    setSaving(true);
    setError(null);

    const items = planItems.map((s) => s.trim()).filter((s) => s.length > 0);

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("일정을 저장하는 중 오류가 발생했어요.");
      }
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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("일정을 삭제하는 중 오류가 발생했어요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !isOwner || !newDayDate) return;

    const duplicate = days.some((d) => d.date === newDayDate);
    if (duplicate) {
      setError("같은 날짜가 이미 추가되어 있어요.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTripDay({
        tripId: trip.id,
        date: newDayDate,
      });
      setNewDayDate("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("날짜를 추가하는 중 오류가 발생했어요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDay = async () => {
    if (!trip || !isOwner || !selectedDayId) return;
    if (!confirm("선택한 날짜와 그 날짜의 모든 일정을 삭제할까요?")) return;

    setSaving(true);
    setError(null);
    try {
      await deleteTripDayWithPlans({
        tripId: trip.id,
        dayId: selectedDayId,
      });
      setSelectedDayId(null);
      resetPlanForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("날짜를 삭제하는 중 오류가 발생했어요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault();
    if (!trip || !isOwner) return false;
    const email = memberEmail.trim();
    if (!email) return false;

    setMemberLoading(true);
    setError(null);
    try {
      const existing = participants.find(
        (p) => p.email && p.email.toLowerCase() === email.toLowerCase(),
      );
      if (existing) {
        setError("이미 동행자로 추가된 이메일입니다.");
        return false;
      }

      const user = await findUserByEmail(email);
      if (!user) {
        setError("해당 이메일을 가진 사용자를 찾을 수 없어요.");
        return false;
      }

      await addMemberToTrip(trip.id, user.uid);
      setParticipants((prev) => [...prev, user]);
      if (!requestTargetUid) {
        setRequestTargetUid(user.uid);
      }
      setMemberEmail("");
      return true;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("동행자를 추가하는 중 오류가 발생했어요.");
      }
      return false;
    } finally {
      setMemberLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !requestTargetUid || !requestMessage.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await sendTripRequest({
        tripId: trip.id,
        toUid: requestTargetUid,
        title: "동행자 요청",
        message: requestMessage.trim(),
      });
      setRequestMessage("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("요청을 보내는 중 오류가 발생했어요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const calendarDays = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = new Date(`${trip.startDate}T00:00:00`);
    const end = new Date(`${trip.endDate}T00:00:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];

    const firstOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
    const startWeekday = firstOfMonth.getDay(); // 0(일)~6(토)
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startWeekday);

    const result: {
      date: string;
      inMonth: boolean;
      inRange: boolean;
      hasDay: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const dayStr = String(d.getDate()).padStart(2, "0");
      const iso = `${year}-${month}-${dayStr}`;
      const inMonth =
        d.getFullYear() === firstOfMonth.getFullYear() &&
        d.getMonth() === firstOfMonth.getMonth();
      const inRange = d >= start && d <= end;
      const dayForDate = days.find((day) => day.date === iso);
      const hasPlans =
        dayForDate && dayHasPlans[dayForDate.id] !== undefined
          ? dayHasPlans[dayForDate.id]
          : false;
      const isSelected = !!dayForDate && selectedDayId === dayForDate.id;

      result.push({
        date: iso,
        inMonth,
        inRange,
        hasDay: !!hasPlans,
        isSelected,
      });
    }
    return result;
  }, [trip, days, selectedDayId, dayHasPlans]);

  const daysWithVisiblePlans = useMemo(
    () => days.filter((day) => dayHasPlans[day.id]),
    [days, dayHasPlans],
  );

  const getDayLabel = (dateStr: string) => {
    if (!trip?.startDate) return "";
    const start = new Date(`${trip.startDate}T00:00:00`);
    const current = new Date(`${dateStr}T00:00:00`);
    const diffMs = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return `D${diffDays}일`;
    }
    return `${diffDays + 1}일차`;
  };

  const handleClickCalendarDay = async (dateStr: string) => {
    const existing = days.find((d) => d.date === dateStr);
    if (existing) {
      setSelectedDayId(existing.id);
      return;
    }
    if (isOwner) {
      setPendingSelectedDate(dateStr);
      setSaving(true);
      setError(null);
      try {
        await createTripDay({
          tripId,
          date: dateStr,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("날짜를 추가하는 중 오류가 발생했어요.");
        }
        setPendingSelectedDate(null);
      } finally {
        setSaving(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedDayId) return;
    resetPlanForm();
    setShowPlanForm(false);
    setShowScheduleModal(true);
  }, [selectedDayId]);

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
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {trip.title}
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                {trip.startDate} ~ {trip.endDate} · {trip.country}
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowAddMemberModal(true)}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                동행자 추가
              </button>
            )}
          </div>

          {participants.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-zinc-500">
              <span className="mr-1">with</span>
              {participants.map((p) => (
                <button
                  key={p.uid}
                  type="button"
                  onClick={() => {
                    setRequestTargetUid(p.uid);
                    setShowRequestModal(true);
                  }}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  <span className="font-medium">
                    {p.displayName || p.email || "알 수 없는 사용자"}
                  </span>
                  {p.uid === trip.ownerUid && (
                    <span className="ml-1 text-[10px] text-amber-500">
                      (호스트)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

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
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-zinc-500">
                  캘린더에서 날짜를 탭해 일정을 추가해 보세요
                </span>
                <button
                  type="button"
                  onClick={() => setShowDayCarousel((prev) => !prev)}
                  className="text-[10px] text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  {showDayCarousel ? "날짜 목록 숨기기" : "날짜 목록 보기"}
                </button>
              </div>
            )}
          </div>

          {calendarDays.length > 0 && (
            <div className="mb-3 rounded-2xl bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
              <p className="mb-2 text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                여행 캘린더
              </p>
              <div className="mb-1 grid grid-cols-7 gap-1 text-[10px] text-zinc-400">
                {["일", "월", "화", "수", "목", "금", "토"].map((label) => (
                  <span key={label} className="text-center">
                    {label}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayNumber = Number(day.date.slice(8, 10));
                  const baseClasses =
                    "flex aspect-square items-center justify-center rounded-full text-[11px]";
                  let stateClasses =
                    "text-zinc-400 dark:text-zinc-600 bg-transparent";

                  if (day.inRange) {
                    stateClasses =
                      "bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-50";
                  }
                  if (day.hasDay) {
                    stateClasses =
                      "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
                  }
                  if (day.isSelected) {
                    stateClasses =
                      "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-zinc-900";
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => handleClickCalendarDay(day.date)}
                      className={`${baseClasses} ${stateClasses}`}
                    >
                      {dayNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {days.length === 0 || daysWithVisiblePlans.length === 0 ? (
            <p className="text-xs text-zinc-500">아직 등록된 날짜가 없어요.</p>
          ) : (
            showDayCarousel && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
                {daysWithVisiblePlans.map((day) => (
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
                      {getDayLabel(day.date)}
                    </span>
                    <span className="block">{day.date}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {isOwner && (
            <>
              <details className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                <summary className="cursor-pointer list-none text-[10px] underline underline-offset-2">
                  고급 설정: 날짜를 직접 추가/삭제하기
                </summary>
                <div className="mt-2 space-y-2">
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
                  {selectedDayId && (
                    <button
                      type="button"
                      onClick={handleDeleteDay}
                      disabled={saving}
                      className="text-[10px] text-red-500 underline underline-offset-2"
                    >
                      선택한 날짜 삭제 (일정 포함)
                    </button>
                  )}
                </div>
              </details>
            </>
          )}
        </section>

        {selectedDayId && showScheduleModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900 relative">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      일정
                    </h2>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          resetPlanForm();
                          setShowPlanForm(true);
                        }}
                        className="rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        새 일정
                      </button>
                    )}
                  </div>
                  {selectedDay && (
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {selectedDay.date} · {getDayLabel(selectedDay.date)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="닫기"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setShowPlanForm(false);
                    resetPlanForm();
                    setSelectedDayId(null);
                  }}
                  className="absolute right-4 top-2 text-2xl text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
                >
                  ×
                </button>
              </div>

              {plans.length === 0 ? (
                isOwner ? (
                  <div className="mb-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => {
                        resetPlanForm();
                        setShowPlanForm(true);
                      }}
                      className="flex h-28 min-w-[220px] snap-start flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500 hover:border-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
                    >
                      <span className="mb-1 text-lg font-bold">+</span>
                      <span>새 일정 추가</span>
                    </button>
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-zinc-500">
                    선택한 날짜에 아직 일정이 없어요.
                  </p>
                )
              ) : (
                <div className="mb-3 flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory">
                  {plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        handleSelectPlan(plan);
                        setShowPlanForm(false);
                      }}
                      className={`flex h-28 min-w-[220px] snap-start flex-col justify-between rounded-2xl px-4 py-3 text-xs shadow-sm ${
                        selectedPlanId === plan.id
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-zinc-50 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{plan.title}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            selectedPlanId === plan.id
                              ? "text-zinc-200 dark:text-zinc-700"
                              : "text-zinc-500"
                          }`}
                        >
                          {plan.startTime || "시간 미정"} ~{" "}
                          {plan.endTime || "시간 미정"}
                        </p>
                      </div>
                      {plan.memo && (
                        <p
                          className={`line-clamp-2 text-[10px] ${
                            selectedPlanId === plan.id
                              ? "text-zinc-200/80 dark:text-zinc-700"
                              : "text-zinc-400"
                          }`}
                        >
                          {plan.memo}
                        </p>
                      )}
                    </button>
                  ))}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => {
                        resetPlanForm();
                        setShowPlanForm(true);
                      }}
                      className="flex h-28 min-w-[220px] snap-start flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-500 hover:border-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700"
                    >
                      <span className="mb-1 text-lg font-bold">+</span>
                      <span>새 일정 추가</span>
                    </button>
                  )}
                </div>
              )}

              {selectedPlan && !showPlanForm && (
                <div className="mb-3 rounded-2xl bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                  <p className="text-sm font-semibold">{selectedPlan.title}</p>

                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                        시간
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-300">
                        {selectedPlan.startTime || "시간 미정"} ~{" "}
                        {selectedPlan.endTime || "시간 미정"}
                      </p>
                    </div>

                    {selectedPlan.memo && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                          메모
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-zinc-500 dark:text-zinc-300">
                          {selectedPlan.memo}
                        </p>
                      </div>
                    )}

                    {selectedPlan.items && selectedPlan.items.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                          준비물
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {selectedPlan.items.map((item, idx) => (
                            <span
                              key={`${selectedPlan.id}-item-${idx}`}
                              className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => setShowPlanForm(true)}
                      className="mt-3 rounded-xl border border-zinc-300 px-3 py-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-700"
                    >
                      일정 수정하기
                    </button>
                  )}
                </div>
              )}

              {isOwner && showPlanForm && (
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
                    <div className="space-y-2">
                      {planItems.map((value, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => {
                              const next = [...planItems];
                              next[index] = e.target.value;
                              setPlanItems(next);
                            }}
                            placeholder="예: 여권"
                            className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                          />
                          {index === 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPlanItems((prev) => [...prev, ""])
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                            >
                              +
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setPlanItems((prev) => {
                                  const next = prev.filter(
                                    (_, i) => i !== index,
                                  );
                                  return next.length > 0 ? next : [""];
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-xs font-bold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
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
                    {!selectedPlanId && (
                      <button
                        type="button"
                        onClick={() => {
                          resetPlanForm();
                          setShowPlanForm(false);
                        }}
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
        {isOwner && showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                동행자 추가
              </h2>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                함께 여행을 계획할 친구의 이메일을 입력해 주세요.
              </p>

              <form
                onSubmit={async (e) => {
                  const ok = await handleAddMember(e);
                  if (ok) {
                    setShowAddMemberModal(false);
                  }
                }}
                className="mt-3 space-y-3 text-xs"
              >
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(evt) => setMemberEmail(evt.target.value)}
                  placeholder="동행자 이메일"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(false)}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={memberLoading}
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    동행자 추가
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {participants.length > 0 && showRequestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                동행자에게 요청 보내기
              </h2>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                선택한 동행자에게 간단한 메시지를 보내 보세요.
              </p>

              <form
                onSubmit={async (e) => {
                  await handleSendRequest(e);
                  if (!error) {
                    setShowRequestModal(false);
                    setRequestMessage("");
                  }
                }}
                className="mt-3 space-y-3 text-xs"
              >
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                    대상
                  </label>
                  <select
                    value={requestTargetUid ?? ""}
                    onChange={(evt) =>
                      setRequestTargetUid(evt.target.value || null)
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  >
                    {participants.map((p) => (
                      <option key={p.uid} value={p.uid}>
                        {p.displayName || p.email || p.uid}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-200">
                    메시지
                  </label>
                  <textarea
                    value={requestMessage}
                    onChange={(evt) => setRequestMessage(evt.target.value)}
                    rows={3}
                    placeholder="예: 화장실 휴지 좀 가져와 줄 수 있어?"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 outline-none ring-0 transition focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !requestMessage.trim()}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-emerald-600 disabled:opacity-60"
                  >
                    요청 보내기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
