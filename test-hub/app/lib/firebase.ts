import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database'; // 💡 Realtime Database 임포트 추가

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app;

if (typeof window !== 'undefined' || firebaseConfig.apiKey) {
  if (!firebaseConfig.apiKey && typeof window !== 'undefined') {
    console.error("🚨 [LABGG ENGINE] Firebase API Key가 비어있습니다! Vercel 환경변수를 확인하세요.");
  }
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} else {
  app = initializeApp({ 
    apiKey: "dummy-key-for-build", 
    authDomain: "dummy.firebaseapp.com", 
    projectId: "dummy-project" 
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app); // 💡 형님 엔진에 Realtime Database 인스턴스 적재
const googleProvider = new GoogleAuthProvider(); 

// 💡 database까지 포함해서 바깥으로 짱짱하게 내보냅니다!
export { auth, db, database, googleProvider };