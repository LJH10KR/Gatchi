import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "./firebase";

export type Plan = {
  id: string;
  tripId: string;
  dayId: string;
  title: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  memo?: string;
  items?: string[];
  order: number;
};

export function listenPlansForDay(
  tripId: string,
  dayId: string,
  callback: (plans: Plan[]) => void,
): Unsubscribe {
  const ref = collection(db, "trips", tripId, "days", dayId, "plans");
  const q = query(ref, orderBy("order", "asc"));

  return onSnapshot(q, (snapshot) => {
    const plans: Plan[] = snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        tripId,
        dayId,
        title: data.title ?? "",
        startTime: data.startTime,
        endTime: data.endTime,
        memo: data.memo,
        items: data.items ?? [],
        order: data.order ?? index,
      };
    });
    callback(plans);
  });
}

export async function createPlan(params: {
  tripId: string;
  dayId: string;
  title: string;
  startTime?: string;
  endTime?: string;
  memo?: string;
  items?: string[];
  order?: number;
}) {
  const ref = collection(db, "trips", params.tripId, "days", params.dayId, "plans");
  await addDoc(ref, {
    title: params.title,
    startTime: params.startTime ?? null,
    endTime: params.endTime ?? null,
    memo: params.memo ?? "",
    items: params.items ?? [],
    order: params.order ?? Date.now(),
  });
}

export async function updatePlan(
  tripId: string,
  dayId: string,
  planId: string,
  data: Partial<Omit<Plan, "id" | "tripId" | "dayId">>,
) {
  const ref = doc(db, "trips", tripId, "days", dayId, "plans", planId);
  await updateDoc(ref, data as any);
}

export async function deletePlan(tripId: string, dayId: string, planId: string) {
  const ref = doc(db, "trips", tripId, "days", dayId, "plans", planId);
  await deleteDoc(ref);
}

