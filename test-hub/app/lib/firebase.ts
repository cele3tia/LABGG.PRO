import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth'; // 👈 GoogleAuthProvider 추가!
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 서버사이드 중복 초기화 방지
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// 👈 로그인 페이지에서 에러 뿜던 googleProvider를 여기서 정확히 만들어 export 해줌!
export const googleProvider = new GoogleAuthProvider(); 

// 구글 로그인 시 매번 계정을 새로 선택할 수 있게 팝업 옵션 강제 설정 (선택사항이지만 넣어두면 편함)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});