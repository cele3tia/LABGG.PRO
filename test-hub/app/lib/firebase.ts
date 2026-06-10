import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 💡 데이터 안정성 확보를 위한 초기화 밸런싱 검증
let app;

if (typeof window !== 'undefined' || firebaseConfig.apiKey) {
  // 1. 실제 브라우저 환경이거나 진짜 API Key가 존재할 때 (정상 서비스 레이어)
  if (!firebaseConfig.apiKey && typeof window !== 'undefined') {
    console.error("🚨 [LABGG ENGINE] Firebase API Key가 비어있습니다! Vercel 환경변수를 확인하세요.");
  }
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} else {
  // 2. Next.js 빌드 타임 엔진 스케일링 전용 (더미 레이어)
  app = initializeApp({ 
    apiKey: "dummy-key-for-build", 
    authDomain: "dummy.firebaseapp.com", 
    projectId: "dummy-project" 
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };