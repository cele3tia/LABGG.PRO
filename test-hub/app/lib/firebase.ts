import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const DB_URL = "https://labgg-d6594-default-rtdb.firebaseio.com/";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: DB_URL
};

// 🎯 빌드 워커 기싸움 방지용 조건식 완전 개조
const hasRealKeys = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let app;

if (hasRealKeys) {
  // 실제 환경변수 키가 가 수급되었을 때 구동되는 핵심 엔진
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} else {
  // 💡 Vercel 빌드 타임 등 키가 안 보일 때 컴파일러 튕김을 막는 철통 방어선 더미 세션
  app = getApps().length > 0 ? getApp() : initializeApp({ 
    apiKey: "dummy-key-for-vercel-build-safety", 
    authDomain: "dummy-labgg.firebaseapp.com", 
    projectId: "labgg-d6594",
    databaseURL: DB_URL
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app, DB_URL); 
const googleProvider = new GoogleAuthProvider(); 

export { auth, db, database, googleProvider };