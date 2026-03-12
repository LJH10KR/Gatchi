import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC7kdSl29Wdal5aeZp3UxaHGH_bKNQd3Sk",
  authDomain: "travelespana-8e9b0.firebaseapp.com",
  projectId: "travelespana-8e9b0",
  storageBucket: "travelespana-8e9b0.firebasestorage.app",
  messagingSenderId: "701771667478",
  appId: "1:701771667478:web:72f6eb07896cacdbfb7d37",
  measurementId: "G-WCN498XQ4Q"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;