import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase'; // 💡 본인의 firebase 위치에 맞게 수정 가능
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';

// 📊 영악한 핵을 잡기 위한 핵심 무기: 표준편차(들쭉날쭉함) 계산 함수
function getStandardDeviation(scores: number[]): number {
  const n = scores.length;
  if (n <= 1) return 0;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

// 홈/프로필 경험치 공식 동기화
const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

export async function POST(request: Request) {
  try {
    const { scores, totalRounds, uid, displayName, photoURL } = await request.json();

    // [필터 1] 기본적인 데이터 무결성 검사
    if (!scores || !Array.isArray(scores) || scores.length !== totalRounds) {
      return NextResponse.json({ error: '올바르지 않은 데이터 구조입니다.' }, { status: 400 });
    }

    const sum = scores.reduce((a, b) => a + b, 0);
    const avgScore = Math.round(sum / totalRounds);

    // [필터 2] 생물학적 최종 평균 하한선 컷
    if (avgScore < 100) {
      return NextResponse.json({ error: '인간의 한계를 넘어섰습니다. (핵 감지)' }, { status: 403 });
    }

    // [필터 3] 💡 영악한 난수 생성 핵 저격 (표준편차 검사)
    // 아무리 잘하는 사람도 5판을 하면 각 판마다 컨디션에 따라 최소 10ms~40ms씩 기록이 요동칩니다.
    // 핵 프로그램이 140~150ms 사이로 정밀하게 주입하더라도 숫자가 너무 촘촘하게 모여있으면 타겟이 됩니다.
    const stdDev = getStandardDeviation(scores);
    
    // 3판 이상 진행 시, 표준편차가 4ms 미만(소름 돋을 정도로 일정함)이면 100% 핵입니다.
    if (totalRounds >= 3 && stdDev < 4) {
      return NextResponse.json({ error: '일정한 패턴이 감지되었습니다. (매크로/봇 제한)' }, { status: 403 });
    }

    // [필터 4] 중복값 검사 (5판 중 기록이 완전히 똑같은 판이 너무 많을 때)
    const uniqueScores = new Set(scores);
    if (totalRounds >= 5 && uniqueScores.size <= 2) {
      return NextResponse.json({ error: '기록의 다양성이 부족합니다. (클릭 봇 제한)' }, { status: 403 });
    }

    // ----------------------------------------------------
    // 모든 보안 검증 통과 완료 ➡️ 안전하게 DB 트랜잭션 실행
    // ----------------------------------------------------
    const userDocRef = doc(db, 'users', uid);
    const earnedXp = Math.max(10, Math.floor(35000 / avgScore)) + (totalRounds * 10);

    const txResult = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(userDocRef);
      
      let currentLevel = 1;
      let currentXp = 0;
      let currentBest = 999999;
      const isNewUser = !docSnap.exists();

      if (!isNewUser) {
        const data = docSnap.data()!;
        currentLevel = data.level || 1;
        currentXp = data.xp || 0;
        currentBest = data.reactionBest || 999999;
      }

      currentXp += earnedXp;
      let isLeveledUp = false;
      while (currentXp >= getNextXpForLevel(currentLevel)) {
        currentXp -= getNextXpForLevel(currentLevel);
        currentLevel += 1;
        isLeveledUp = true;
      }

      const isNewBest = avgScore < currentBest;

      if (isNewUser) {
        transaction.set(userDocRef, {
          uid,
          displayName: displayName || 'Anonymous',
          photoURL: photoURL || '',
          reactionBest: avgScore,
          level: currentLevel,
          xp: currentXp,
          updatedAt: serverTimestamp()
        });
      } else {
        const updateData: any = {
          xp: currentXp,
          level: currentLevel,
          updatedAt: serverTimestamp()
        };
        if (isNewBest) {
          updateData.reactionBest = avgScore;
        }
        transaction.update(userDocRef, updateData);
      }

      return {
        isLeveledUp,
        currentLevel,
        isNewBest: isNewBest || isNewUser
      };
    });

    return NextResponse.json({
      success: true,
      earnedXp,
      ...txResult
    });

  } catch (error) {
    console.error('서버 보안 정산 처리 중 치명적 오류:', error);
    return NextResponse.json({ error: '서버 내부 정산 오류' }, { status: 500 });
  }
}