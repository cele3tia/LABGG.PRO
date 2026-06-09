import { db, auth } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// 1. 유저 최고 기록 저장 함수
export const saveScore = async (type: 'reaction' | 'cps', score: number) => {
  const user = auth.currentUser;
  if (!user) return { success: false, message: '로그인이 필요합니다.' };

  const userRef = doc(db, 'users', user.uid);

  try {
    const docSnap = await getDoc(userRef);
    let shouldUpdate = false;
    const currentData = docSnap.exists() ? docSnap.data() : {};

    if (type === 'reaction') {
      // 반응 속도는 낮을수록(빠를수록) 최고 기록
      const prevBest = currentData.reactionBest ?? 99999;
      if (score < prevBest) shouldUpdate = true;
    } else if (type === 'cps') {
      // CPS는 높을수록 최고 기록
      const prevBest = currentData.cpsBest ?? 0;
      if (score > prevBest) shouldUpdate = true;
    }

    // 최고 기록 달성 시에만 DB 갱신
    if (shouldUpdate || !docSnap.exists()) {
      await setDoc(userRef, {
        displayName: user.displayName || 'Anonymous',
        email: user.email,
        photoURL: user.photoURL || '',
        [`${type}Best`]: score,
        updatedAt: serverTimestamp()
      }, { merge: true });
      return { success: true, isNewRecord: true };
    }

    return { success: true, isNewRecord: false };
  } catch (error) {
    console.error('DB 저장 에러:', error);
    return { success: false, error };
  }
};

// 2. 유저 최고 기록 불러오기 함수
export const getUserStats = async (uid: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('DB 로드 에러:', error);
    return null;
  }
};