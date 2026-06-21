'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Counter from '../components/Counter';
import MagicRings from '../components/MagicRings';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

type TestState = 'waiting' | 'clicking' | 'all-done';

interface SessionRecord {
  id: string;
  target: number;
  actual: number;
  diff: number;
  grade: string;
}

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

export default function PrecisionTimingTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<TestState>('waiting');
  const [myBestPrecision, setMyBestPrecision] = useState<number | string>('---');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [xpNotice, setXpNotice] = useState<string>('');

  // 코어 타이머 상태 데이터
  const [targetTime, setTargetTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [diffTime, setDiffTime] = useState<number>(0);
  
  // 통계 분석용 세션 로그 스택
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [totalAttempts, setTotalAttempts] = useState<number>(0);
  const [avgError, setAvgError] = useState<number>(0);

  const startTimeRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const touchAreaRef = useRef<HTMLButtonElement>(null);

  // 초기 셋업 및 데이터 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().precisionBest !== undefined) {
          setMyBestPrecision(`±${docSnap.data().precisionBest}s`);
        }
      }
    });

    generateNewTarget();
    return () => unsubscribe();
  }, []);

  // 통계 트래커 동기화 디렉터
  useEffect(() => {
    if (history.length === 0) return;
    setTotalAttempts(prev => prev + 1);
    const totalDiff = history.reduce((acc, curr) => acc + curr.diff, 0);
    setAvgError(parseFloat((totalDiff / history.length).toFixed(3)));
  }, [history]);

  const generateNewTarget = () => {
    const randomSec = (Math.random() * 4 + 2).toFixed(3);
    setTargetTime(parseFloat(randomSec));
  };

  // 파이어베이스 트랜잭션 보상 및 레벨 엔진
  const saveFinalPrecisionAndProcessXp = async (finalDiff: number, finalElapsed: number) => {
    const grade = finalDiff <= 0.05 ? 'PERFECT' : finalDiff <= 0.15 ? 'EXCELLENT' : finalDiff <= 0.35 ? 'GOOD' : 'POOR';
    const newLog: SessionRecord = { id: Date.now().toString(), target: targetTime, actual: finalElapsed, diff: finalDiff, grade };
    setHistory(prev => [newLog, ...prev].slice(0, 3));

    if (!auth.currentUser) return;

    setSaveStatus('기록 및 경험치 정산 중...');
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    let bonus = 10;
    if (finalDiff <= 0.05) bonus = 300;
    else if (finalDiff <= 0.15) bonus = 150;
    else if (finalDiff <= 0.35) bonus = 70;
    const earnedXp = Math.max(10, Math.floor((1 / (finalDiff + 0.01)) * 5) + bonus);

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(userDocRef);
        let currentLevel = 1, currentXp = 0, currentBest = 999;
        const isNewUser = !docSnap.exists();

        if (!isNewUser) {
          const data = docSnap.data()!;
          currentLevel = data.level || 1;
          currentXp = data.xp || 0;
          currentBest = data.precisionBest !== undefined ? data.precisionBest : 999;
        }

        currentXp += earnedXp;
        let isLeveledUp = false;
        while (currentXp >= getNextXpForLevel(currentLevel)) {
          currentXp -= getNextXpForLevel(currentLevel);
          currentLevel += 1;
          isLeveledUp = true;
        }

        const isNewBest = finalDiff < currentBest;

        if (isNewUser) {
          transaction.set(userDocRef, {
            uid, displayName: auth.currentUser?.displayName || 'Anonymous',
            photoURL: auth.currentUser?.photoURL || '', precisionBest: finalDiff,
            level: currentLevel, xp: currentXp, updatedAt: serverTimestamp()
          });
        } else {
          const updateData: any = { xp: currentXp, level: currentLevel, updatedAt: serverTimestamp() };
          if (isNewBest) updateData.precisionBest = finalDiff;
          transaction.update(userDocRef, updateData);
        }

        return { isLeveledUp, currentLevel, isNewBest: isNewBest || isNewUser };
      });

      if (txResult.isNewBest) {
        setMyBestPrecision(`±${finalDiff}s`);
        setSaveStatus('최고 기록 경신! 🏆');
      } else {
        setSaveStatus('');
      }
      setXpNotice(`경험치 획득! +${earnedXp} XP ${txResult.isLeveledUp ? `| LEVEL UP! 🎉 (Lv.${txResult.currentLevel})` : ''}`);
    } catch (error) {
      console.error('Precision 기록 저장 실패:', error);
      setSaveStatus('Error');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (gameState !== 'waiting') return;
    if (performance.now() - lastActionTimeRef.current < 400) return;

    setGameState('clicking');
    startTimeRef.current = performance.now();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (gameState !== 'clicking') return;

    const endTime = performance.now();
    const elapsed = parseFloat(((endTime - startTimeRef.current) / 1000).toFixed(3));
    const difference = parseFloat(Math.abs(elapsed - targetTime).toFixed(3));

    setElapsedTime(elapsed);
    setDiffTime(difference);
    setGameState('all-done');
    
    saveFinalPrecisionAndProcessXp(difference, elapsed);
    lastActionTimeRef.current = performance.now();
  };

  const resetEntireTest = () => {
    setElapsedTime(0);
    setDiffTime(0);
    setSaveStatus('');
    setXpNotice('');
    generateNewTarget();
    setGameState('waiting');
    lastActionTimeRef.current = performance.now();
  };

  const getAdvancedStats = (diff: number, currentState: TestState) => {
    if (currentState !== 'all-done') return { rank: '---', percent: '---', color: 'text-zinc-600', glow: '' };
    if (diff <= 0.02) return { rank: '레전드 (Legend) 🔥', percent: '상위 0.01%', color: 'text-red-500 animate-pulse font-black', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.4)] border-red-500/30' };
    if (diff <= 0.06) return { rank: '이모탈 (Immortal)', percent: '상위 0.1%', color: 'text-rose-500 font-extrabold', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)] border-rose-500/20' };
    if (diff <= 0.12) return { rank: '챌린저 (Challenger)', percent: '상위 1%', color: 'text-amber-400 font-bold', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.25)]' };
    if (diff <= 0.20) return { rank: '마스터 (Master)', percent: '상위 8%', color: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.2)]' };
    if (diff <= 0.35) return { rank: '다이아몬드 (Diamond)', percent: '상위 18%', color: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]' };
    if (diff <= 0.55) return { rank: '플래티넘 (Platinum)', percent: '상위 35%', color: 'text-teal-400', glow: '' };
    if (diff <= 0.80) return { rank: '골드 (Gold)', percent: '상위 50%', color: 'text-yellow-500', glow: '' };
    if (diff <= 1.20) return { rank: '실버 (Silver)', percent: '상위 70%', color: 'text-zinc-400', glow: '' };
    return { rank: '브론즈 (Bronze)', percent: '상위 90%', color: 'text-amber-700', glow: '' };
  };

  const stats = getAdvancedStats(diffTime, gameState);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden touch-none">
      
      {/* 🌪️ 1. 대각선 오리지널 보라색 매직 링 (홀드 시 4배속 회전 팽팽하게 활성화) */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-[800ms] flex items-center justify-center ${gameState === 'clicking' ? 'opacity-40 scale-100' : 'opacity-0 scale-110'}`}>
        <div className="w-[180vw] h-[180vh] transform -rotate-45 flex items-center justify-center">
          <MagicRings color="#9e38ff" colorTwo="#7928ca" ringCount={7} speed={gameState === 'clicking' ? 4 : 1} attenuation={12} lineThickness={2} />
        </div>
      </div>

      {/* 🗺️ 2. 상단 네비 바 (언어변경 완벽 제거) */}
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto relative z-10">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          ← 홈으로
        </Link>
        <div className="font-mono text-xs text-zinc-500 flex items-center gap-2">
          <span>내 최고 기록:</span>
          <span className="text-purple-400 font-black tracking-wide text-sm">
            {myBestPrecision}
          </span>
        </div>
      </div>

      {/* 🎮 3. 메인 콘솔 바디 영역 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-4 space-y-6 relative z-10">
        
        {/* 타이틀 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block mb-1">
              LABGG SENSORY ENGINE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">정밀 감각 타이밍 테스트</h1>
          </div>
        </div>

        {/* 🌊 실시간 감각 분석기 바 (CPS 스타일 완벽 이식) */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">실시간 감각 분석기:</span>
              <span className="text-white font-black text-sm tabular-nums">
                {gameState === 'all-done' ? targetTime.toFixed(3) : '???.???'}
                <span className="text-xs text-zinc-500 font-normal"> / 목표 시간</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">상태: </span>
              <span className={`font-black text-sm uppercase ${gameState === 'clicking' ? 'text-purple-500 animate-pulse' : 'text-emerald-400'}`}>
                {gameState === 'clicking' ? 'SENSING' : 'READY'}
              </span>
            </div>
          </div>
          <div className="bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-500 h-full shadow-[0_0_12px_rgba(158,56,255,0.5)] transition-all duration-500" 
              style={{ width: gameState === 'clicking' ? '100%' : '0%' }} 
            />
          </div>
        </div>

        {/* ⏱️ 카운터 렌더링 존 */}
        {/* 💡 홀딩 시 색상 변경 100% 차단 (계속 화이트 유지) & 우상단으로 부드럽고 정교하게 축소 이동 */}
        <div className="h-44 w-full relative flex items-center justify-center">
          <div 
            className={`absolute transition-all duration-[750ms] ease-[cubic-bezier(0.2,1,0.2,1)] flex flex-col origin-center z-40
              ${gameState === 'clicking'
                ? 'top-0 right-0 translate-x-0 translate-y-0 scale-[0.45] opacity-80 items-end'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100 items-center'
              }
            `}
          >
            <span className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.3em] mb-3 uppercase">
              {gameState === 'clicking' ? '// TARGET LOCKED' : 'TARGET TIME'}
            </span>
            <Counter
              value={gameState === 'all-done' ? elapsedTime : targetTime}
              places={[10, 1, '.', 0.1, 0.01, 0.001]}
              fontSize={96}
              padding={0}
              gap={4}
              textColor={gameState === 'all-done' ? (diffTime <= 0.1 ? '#10b981' : 'white') : 'white'} // 💡 클릭 중 색상 변화 완전 삭제
              fontWeight={800} // 선명하고 묵직한 폰트 웨이트 고정
              gradientFrom="black"
              gradientTo="transparent"
            />
          </div>
        </div>

        {/* ⚡ 액션 제어 패널 (CPS 전형 레이아웃 퓨전) */}
        <div className="w-full max-w-xl mx-auto">
          {gameState === 'all-done' ? (
            <div className="space-y-5 w-full max-w-md mx-auto animate-[fadeIn_0.3s_ease-out] text-center">
              <div>
                <p className="text-xs font-mono font-bold text-purple-400 uppercase tracking-widest">피지컬 분석 리포트</p>
                <p className="text-6xl font-black text-white tracking-tighter mt-1 tabular-nums">
                  ±{diffTime.toFixed(3)}<span className="text-xl font-bold ml-1 text-zinc-600">오차 범위</span>
                </p>
              </div>

              {/* CPS 커스텀 스탯 대시보드 리포트 */}
              <div className={`grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-left ${stats.glow} transition-all duration-500`}>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">최종 등급</span>
                  <span className={`text-sm font-black tracking-tight ${stats.color}`}>{stats.rank}</span>
                </div>
                <div className="space-y-0.5 border-l border-zinc-800 pl-4">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">피지컬 백분위</span>
                  <span className="text-sm font-black text-white tracking-tight">{stats.percent}</span>
                </div>
              </div>

              {/* 파이어베이스 트랜잭션 보상 알림 프레임 */}
              <div className="flex flex-col items-center gap-1.5 min-h-[32px]">
                {saveStatus && <p className="text-xs font-sans font-bold text-amber-400 bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/10 inline-block">{saveStatus}</p>}
                {xpNotice && <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block">{xpNotice}</p>}
              </div>

              <button 
                onClick={resetEntireTest}
                className="w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-xs font-black uppercase tracking-[0.25em] rounded-2xl hover:bg-white hover:text-black transition-all active:scale-95 shadow-md"
              >
                다시 도전하기
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-4 text-center">
              
              {/* 💡 촌스러운 사각형 찢어짐 완전 삭제, 부드러운 타원(Pill)을 완벽 고수하며 스케일 업(1.04)과 보라색 글로우 장착 */}
              <button
                ref={touchAreaRef}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className={`w-full font-mono text-xs font-black tracking-[0.25em] uppercase select-none touch-none border rounded-full transition-all duration-[600ms] ease-[cubic-bezier(0.2,1,0.2,1)] flex flex-col items-center justify-center relative overflow-hidden
                  ${gameState === 'clicking'
                    ? 'bg-zinc-950 border-purple-500 text-purple-400 py-10 scale-[1.04] shadow-[0_0_50px_rgba(158,56,255,0.25)]'
                    : 'bg-zinc-950 border-zinc-900 text-zinc-400 py-7 hover:text-white hover:border-zinc-700'
                  }
                `}
              >
                <span>{gameState === 'clicking' ? 'RELEASE NOW' : 'PRESS & HOLD BY FEEL'}</span>
                {gameState === 'clicking' && (
                  <span className="text-[9px] text-purple-400/60 tracking-widest block mt-2 font-black animate-pulse">FOCUS AND SENSE TIME</span>
                )}
              </button>

              {gameState === 'waiting' && (
                <div className="space-y-2 mt-2">
                  <p className="text-sm font-bold text-zinc-500 animate-pulse">테스트를 시작하려면 아래 버튼을 꾹 누르세요.</p>
                  {!user && <p className="text-[10px] font-sans text-zinc-600 font-bold tracking-tight max-w-[290px] mx-auto leading-relaxed">💡 로그인 후 완료하시면 글로벌 리더보드에 등록됩니다.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 미니멀 세션 히스토리 디스플레이 */}
        {history.length > 0 && gameState === 'waiting' && (
          <div className="mt-6 w-full max-w-xs mx-auto flex flex-col items-center gap-2 animate-in fade-in duration-500">
            <span className="text-[9px] font-mono font-bold text-zinc-600 tracking-widest uppercase border-b border-zinc-900 pb-1.5 w-full text-center">SESSION HISTORY LOG</span>
            <div className="w-full space-y-1.5 font-mono text-[10px]">
              {history.map((h, idx) => (
                <div key={h.id} className="flex justify-between text-zinc-500 px-1">
                  <span>LOG_0{history.length - idx}</span>
                  <span className={`font-bold ${h.grade === 'PERFECT' ? 'text-emerald-400' : 'text-zinc-400'}`}>오차: ±{h.diff.toFixed(3)}s</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 시스템 라인 푸터 고정 */}
      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-4 flex justify-between items-center font-mono text-[9px] text-zinc-600 uppercase tracking-widest relative z-10">
        <div>LABGG SENSORY INDEX</div>
        <div>v2.0.6 RUNTIME SYSTEM</div>
      </div>

    </div>
  );
}