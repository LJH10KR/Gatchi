import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export async function findUserByEmail(
  email: string,
): Promise<AppUser | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as any;
  return {
    uid: docSnap.id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
  };
}

export async function getUsersByUids(
  uids: string[],
): Promise<AppUser[]> {
  const results: AppUser[] = [];
  await Promise.all(
    uids.map(async (uid) => {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data() as any;
      results.push({
        uid,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
      });
    }),
  );
  return results;
}

