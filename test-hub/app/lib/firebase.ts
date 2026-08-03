import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBhK2KoetN91Fr7Pv5guvvRf2h0X_VcVCc",
  authDomain: "labgg-d6594.firebaseapp.com",
  databaseURL: "https://labgg-d6594-default-rtdb.firebaseio.com",
  projectId: "labgg-d6594",
  storageBucket: "labgg-d6594.firebasestorage.app",
  messagingSenderId: "278542037889",
  appId: "1:278542037889:web:d0e2656bb56f27455fee80",
  measurementId: "G-6Z6HP95H99"
};

// 중복 초기화 방지
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Analytics는 브라우저(Client) 환경에서만 실행되도록 안전하게 처리
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, googleProvider, analytics };