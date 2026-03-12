import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function sendTripRequest(params: {
  tripId: string;
  toUid: string;
  title?: string;
  message: string;
}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("로그인이 필요합니다.");
  }

  const ref = collection(db, "trips", params.tripId, "requests");
  await addDoc(ref, {
    fromUid: user.uid,
    toUid: params.toUid,
    title: params.title ?? "",
    message: params.message,
    createdAt: serverTimestamp(),
  });
}

