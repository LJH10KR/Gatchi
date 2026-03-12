import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "./firebase";

export type Trip = {
  id: string;
  title: string;
  country: string;
  startDate: string;
  endDate: string;
  ownerUid: string;
  createdAt?: Date;
};

export function listenAllTrips(callback: (trips: Trip[]) => void): Unsubscribe {
  const ref = collection(db, "trips");
  const q = query(ref, orderBy("startDate", "asc"));

  return onSnapshot(q, (snapshot) => {
    const trips: Trip[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        title: data.title ?? "",
        country: data.country ?? "",
        startDate: data.startDate ?? "",
        endDate: data.endDate ?? "",
        ownerUid: data.ownerUid,
        createdAt: data.createdAt?.toDate?.(),
      };
    });
    callback(trips);
  });
}

export function listenUserTrips(
  uid: string,
  callback: (trips: Trip[]) => void,
): Unsubscribe {
  const ref = collection(db, "trips");
  const q = query(
    ref,
    where("ownerUid", "==", uid),
    orderBy("startDate", "asc"),
  );

  return onSnapshot(q, (snapshot) => {
    const trips: Trip[] = snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as any;
      return {
        id: docSnap.id,
        title: data.title ?? "",
        country: data.country ?? "",
        startDate: data.startDate ?? "",
        endDate: data.endDate ?? "",
        ownerUid: data.ownerUid,
        createdAt: data.createdAt?.toDate?.(),
      };
    });
    callback(trips);
  });
}

export async function createTrip(params: {
  ownerUid: string;
  title: string;
  country: string;
  startDate: string;
  endDate: string;
}) {
  const ref = collection(db, "trips");
  await addDoc(ref, {
    ...params,
    createdAt: serverTimestamp(),
  });
}

export async function deleteTrip(tripId: string) {
  const ref = doc(db, "trips", tripId);
  await deleteDoc(ref);
}

export async function renameTrip(tripId: string, title: string) {
  const ref = doc(db, "trips", tripId);
  await updateDoc(ref, { title });
}

