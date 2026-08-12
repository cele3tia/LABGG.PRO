import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 🚀 GoogleAuthProvider 불러오기
import { getFirestore } from "firebase/firestore"; // 🚀 1. Firestore 불러오기 추가
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Next.js 핫 리로드 중복 초기화 방지
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// 🚀 2. Firestore 초기화 및 db 변수 생성
const db = getFirestore(app);

// 🚀 구글 로그인 제공자 추가
const googleProvider = new GoogleAuthProvider();

let analytics: any;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// 🚀 3. 내보내기(export)에 db 포함시켜서 다른 파일에서 에러 안 나게 처리
export { app, auth, db, googleProvider, analytics };