import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";

export type AppUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  notificationsEnabled?: boolean;
};

export async function findUserByEmail(
  email: string,
): Promise<AppUser | null> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  const data = docSnap.data() as {
    email?: string;
    displayName?: string;
    notificationsEnabled?: boolean;
  };
  return {
    uid: docSnap.id,
    email: data.email ?? null,
    displayName: data.displayName ?? null,
    notificationsEnabled: data.notificationsEnabled,
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
      const data = snap.data() as {
        email?: string;
        displayName?: string;
        notificationsEnabled?: boolean;
      };
      results.push({
        uid,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        notificationsEnabled: data.notificationsEnabled,
      });
    }),
  );
  return results;
}

export async function setNotificationsEnabled(
  uid: string,
  enabled: boolean,
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    { notificationsEnabled: enabled },
    { merge: true },
  );
}

export async function getNotificationsEnabled(uid: string): Promise<boolean> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const data = snap.data() as {
    notificationsEnabled?: boolean;
  };
  return !!data.notificationsEnabled;
}


