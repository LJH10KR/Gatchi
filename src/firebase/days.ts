import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
  writeBatch,
} from "firebase/firestore";

import { db } from "./firebase";

export type TripDay = {
  id: string;
  tripId: string;
  date: string; // YYYY-MM-DD
  dayIndex: number;
};

export function listenTripDays(
  tripId: string,
  callback: (days: TripDay[]) => void,
): Unsubscribe {
  const ref = collection(db, "trips", tripId, "days");
  const q = query(ref, orderBy("date", "asc"));

  return onSnapshot(q, (snapshot) => {
    const days: TripDay[] = snapshot.docs.map((docSnap, index) => {
      const data = docSnap.data() as {
        date?: string;
      };
      return {
        id: docSnap.id,
        tripId,
        date: data.date ?? "",
        dayIndex: index + 1,
      };
    });
    callback(days);
  });
}

export async function createTripDay(params: {
  tripId: string;
  date: string;
}) {
  const ref = collection(db, "trips", params.tripId, "days");
  await addDoc(ref, {
    date: params.date,
  });
}

export async function deleteTripDayWithPlans(params: {
  tripId: string;
  dayId: string;
}) {
  const dayRef = doc(db, "trips", params.tripId, "days", params.dayId);
  const plansRef = collection(dayRef, "plans");
  const snapshot = await getDocs(plansRef);

  const batch = writeBatch(db);
  snapshot.forEach((planDoc) => {
    batch.delete(planDoc.ref);
  });
  batch.delete(dayRef);

  await batch.commit();
}


