import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // 💡 1. 여기에 GoogleAuthProvider 추가
import { getFirestore } from 'firebase/firestore';

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
const googleProvider = new GoogleAuthProvider(); // 💡 2. 구글 로그인 공급자 인스턴스 생성

// 💡 3. 맨 아래 export에 googleProvider를 추가해서 외부에서 쓸 수 있게 차트를 열어줍니다.
export { auth, db, googleProvider };