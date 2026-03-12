import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
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
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        tripId,
        date: data.date ?? "",
        dayIndex: data.dayIndex ?? index + 1,
      };
    });
    callback(days);
  });
}

export async function createTripDay(params: {
  tripId: string;
  date: string;
  dayIndex: number;
}) {
  const ref = collection(db, "trips", params.tripId, "days");
  await addDoc(ref, {
    date: params.date,
    dayIndex: params.dayIndex,
  });
}

