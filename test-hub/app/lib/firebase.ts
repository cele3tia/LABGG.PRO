import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore"; 
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCP1RiSW0BhvMSvupYqBmt6pUf170uhImU",
  authDomain: "labggpro-18cf7.firebaseapp.com",
  projectId: "labggpro-18cf7",
  storageBucket: "labggpro-18cf7.firebasestorage.app",
  messagingSenderId: "408054975357",
  appId: "1:408054975357:web:c20f6cfe974506460b5a14",
  measurementId: "G-5ZY52W31V5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// 🚀 데이터베이스 이름 (default)에 맞게 완벽 세팅 완료!
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

let analytics: any;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) { analytics = getAnalytics(app); }
  });
}

export { app, auth, db, googleProvider, analytics };