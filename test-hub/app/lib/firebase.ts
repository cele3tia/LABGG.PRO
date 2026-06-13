import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; 
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// 데이터베이스 주소를 변수로 아예 고정해버리자!
const DB_URL = "https://labgg-d6594-default-rtdb.firebaseio.com/";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: DB_URL // 👈 정상 설정
};

let app;

if (typeof window !== 'undefined' || firebaseConfig.apiKey) {
  if (!firebaseConfig.apiKey && typeof window !== 'undefined') {
    console.error("🚨 [LABGG ENGINE] Firebase API Key가 비어있습니다! Vercel 환경변수를 확인하세요.");
  }
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
} else {
  // 💡 [원인 발견!] 이 더미 설정에도 databaseURL을 넣어줘야 SSR 때 경고가 안 떠!
  app = initializeApp({ 
    apiKey: "dummy-key-for-build", 
    authDomain: "dummy.firebaseapp.com", 
    projectId: "dummy-project",
    databaseURL: DB_URL // 👈 여기에 추가!
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

// 💡 [가장 확실한 쐐기] getDatabase 함수에 URL을 직접 두 번째 인자로 꽂아버리기!
const database = getDatabase(app, DB_URL); 

const googleProvider = new GoogleAuthProvider(); 

export { auth, db, database, googleProvider };