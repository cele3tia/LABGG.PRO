'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

type TestState = 'waiting' | 'clicking' | 'all-done';
type TotalTimeType = 3 | 5 | 7 | 10;

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    title: 'CPS 클릭 속도 테스트',
    desc: '제한 시간 동안 화면을 최대한 빠르게 클릭하세요!',
    waiting: '테스트를 시작하려면 화면을 클릭하세요.',
    clicking: '연타하세요!!!',
    result: '최종 CPS 기록',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: '평균 기록 및 경험치 정산 중...',
    saveSuccess: '최고 CPS 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 레벨업 및 글로벌 리더보드에 등록됩니다.',
    myBest: '내 최고 CPS:',
    settingCount: '테스트 시간:',
    progress: '실시간 분석기',
    historyTable: 'REAL-TIME CLICK GRAPH (CPS TREND)',
    sec: '초',
    finalClicks: '총 클릭 횟수',
    restartAll: '처음부터 다시 하기'
  },
  en: {
    back: '← Back to Home',
    title: 'CPS Click Speed Test',
    desc: 'Click as fast as you can within the time limit!',
    waiting: 'Click anywhere to start.',
    clicking: 'CLICK NOW!!!',
    result: 'Final CPS Score',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: 'Saving score & XP...',
    saveSuccess: 'New Personal Best! 🏆',
    xpEarned: 'XP Earned! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to level up and register your score on the leaderboard.',
    myBest: 'My Best CPS:',
    settingCount: 'Test Duration:',
    progress: 'Live Analyzer',
    historyTable: 'REAL-TIME CLICK GRAPH (CPS TREND)',
    sec: 's',
    finalClicks: 'Total Clicks',
    restartAll: 'Restart Test'
  }
};

export default function CpsTestPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  
  const [gameState, setGameState] = useState<TestState>('waiting');
  const [myBestCps, setMyBestCps] = useState<number | string>('---');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [xpNotice, setXpNotice] = useState<string>('');

  const [totalTime, setTotalTime] = useState<TotalTimeType>(5);
  const [timeLeft, setTimeLeft] = useState<number>(5);
  const [clickCount, setClickCount] = useState<number>(0);
  const [cpsHistory, setCpsHistory] = useState<number[]>([]);
  const [isBouncing, setIsBouncing] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const clicksInCurrentSec = useRef<number>(0);
  const lastSecRef = useRef<number>(0);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().cpsBest) {
          setMyBestCps(docSnap.data().cpsBest);
        }
      }
    });

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      unsubscribe();
    };
  }, []);

  const saveFinalCpsAndProcessXp = async (finalCps: number) => {
    if (!auth.currentUser) return;

    setSaveStatus(t.saving);
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const earnedXp = Math.floor(finalCps * 20) + (totalTime * 15);

    try {
      const txResult = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(userDocRef);
        let currentLevel = 1, currentXp = 0, currentBest = 0;
        const isNewUser = !docSnap.exists();

        if (!isNewUser) {
          const data = docSnap.data()!;
          currentLevel = data.level || 1;
          currentXp = data.xp || 0;
          currentBest = data.cpsBest || 0;
        }

        currentXp += earnedXp;
        let isLeveledUp = false;
        while (currentXp >= getNextXpForLevel(currentLevel)) {
          currentXp -= getNextXpForLevel(currentLevel);
          currentLevel += 1;
          isLeveledUp = true;
        }

        const isNewBest = finalCps > currentBest;

        if (isNewUser) {
          transaction.set(userDocRef, {
            uid, displayName: auth.currentUser?.displayName || 'Anonymous',
            photoURL: auth.currentUser?.photoURL || '', cpsBest: finalCps,
            level: currentLevel, xp: currentXp, updatedAt: serverTimestamp()
          });
        } else {
          const updateData: any = { xp: currentXp, level: currentLevel, updatedAt: serverTimestamp() };
          if (isNewBest) updateData.cpsBest = finalCps;
          transaction.update(userDocRef, updateData);
        }

        return { isLeveledUp, currentLevel, isNewBest: isNewBest || isNewUser };
      });

      if (txResult.isNewBest) {
        setMyBestCps(finalCps);
        setSaveStatus(t.saveSuccess);
      } else {
        setSaveStatus('');
      }
      setXpNotice(`${t.xpEarned}${earnedXp} XP ${txResult.isLeveledUp ? `| ${t.levelUp} (Lv.${txResult.currentLevel})` : ''}`);
    } catch (error) {
      console.error('CPS 기록 저장 실패:', error);
      setSaveStatus('Error');
    }
  };

  // 60fps 기반의 부드러운 애니메이션 타이머 루프
  const updateTimer = () => {
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    const currentLeft = Math.max(0, totalTime - elapsed);
    
    setTimeLeft(currentLeft);

    // 1초 단위 경과 체크하여 실시간 그래프 데이터 누적
    const currentSecFloor = Math.floor(elapsed);
    if (currentSecFloor > lastSecRef.current && currentSecFloor <= totalTime) {
      setCpsHistory((prev) => [...prev, clicksInCurrentSec.current]);
      clicksInCurrentSec.current = 0;
      lastSecRef.current = currentSecFloor;
    }

    if (currentLeft > 0) {
      timerRef.current = requestAnimationFrame(updateTimer);
    } else {
      setGameState('all-done');
    }
  };

  const startCpsTest = () => {
    setGameState('clicking');
    setClickCount(1);
    clicksInCurrentSec.current = 1;
    lastSecRef.current = 0;
    startTimeRef.current = performance.now();
    timerRef.current = requestAnimationFrame(updateTimer);
  };

  useEffect(() => {
    if (gameState === 'all-done') {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      const finalCps = parseFloat((clickCount / totalTime).toFixed(2));
      saveFinalCpsAndProcessXp(finalCps);
    }
  }, [gameState]);

  const handleScreenMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.nativeEvent && e.nativeEvent.isTrusted === false) return;

    if (gameState === 'waiting') {
      startCpsTest();
    } else if (gameState === 'clicking') {
      setClickCount((prev) => prev + 1);
      clicksInCurrentSec.current += 1;
      
      // 클릭 시 고퀄리티 숫자 팝업 애니메이션 트리거
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 50);
    }
  };

  const resetEntireTest = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setClickCount(0);
    clicksInCurrentSec.current = 0;
    setTimeLeft(totalTime);
    setCpsHistory([]);
    setSaveStatus('');
    setXpNotice('');
    setGameState('waiting');
  };

  // 실시간 현재 CPS 계산
  const elapsedTime = totalTime - timeLeft;
  const currentCps = clickCount > 0 && elapsedTime > 0
    ? (clickCount / elapsedTime).toFixed(2)
    : '0.00';

  // 실시간 속도에 따른 랭크 평가 (우측 바 채우기용)
  const getPaceRank = (cps: number) => {
    const num = parseFloat(cps.toString());
    if (num === 0) return { text: 'WAITING', color: 'text-zinc-600' };
    if (num < 5) return { text: 'SLOW Turtle 🐢', color: 'text-zinc-400' };
    if (num < 8) return { text: 'NORMAL Human 👤', color: 'text-emerald-500' };
    if (num < 12) return { text: 'FAST Cheetah ⚡', color: 'text-amber-400' };
    return { text: 'GOD CLICKER 🔥', color: 'text-red-500 animate-pulse' };
  };

  const paceRank = getPaceRank(parseFloat(currentCps));

  const bgColors = {
    waiting: 'bg-zinc-950 border-zinc-900',
    clicking: 'bg-emerald-950/20 border-emerald-500/40 shadow-[inset_0_0_30px_rgba(16,185,129,0.05)]',
    'all-done': 'bg-zinc-950 border-zinc-800'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none">
      
      {/* 상단 네비게이션 헤더 */}
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <div className="font-mono text-xs text-zinc-500 flex items-center gap-2">
          <span>{t.myBest}</span>
          <span className="text-emerald-400 font-black tracking-wide text-sm">
            {myBestCps}{typeof myBestCps === 'number' ? ` ${t.cps}` : ''}
          </span>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-4 space-y-5">
        
        {/* 타이틀 및 세팅 바 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block mb-1">
              LABGG PHYSICAL ENGINE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.title}</h1>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
            <span className="text-[10px] font-mono text-zinc-500 px-2.5 font-bold">{t.settingCount}</span>
            {([3, 5, 7, 10] as TotalTimeType[]).map((time) => (
              <button
                key={time}
                disabled={gameState === 'clicking'}
                onClick={(e) => { e.stopPropagation(); setTotalTime(time); setTimeLeft(time); resetEntireTest(); }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-10 h-8 rounded-lg font-mono text-xs font-black transition-all ${
                  totalTime === time ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'
                }`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>

        {/* 🛠️ 실시간 하단 바 대개조 (시간 바 부드럽게 무빙 + 양옆 정보 최적화) */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{t.progress}:</span>
              <span className="text-white font-black text-sm tabular-nums">
                {timeLeft.toFixed(2)}<span className="text-xs text-zinc-500 font-normal"> / {totalTime}s</span>
              </span>
            </div>
            
            {/* 실시간 랭킹 시스템 매핑 채우기 */}
            <div className="text-right">
              <span className="text-zinc-500">PACE RANK: </span>
              <span className={`font-black tracking-wide text-sm ${paceRank.color}`}>{paceRank.text}</span>
            </div>
          </div>

          {/* 🌊 초부드러운 무빙 타임 프로그레스 바 (에메랄드 색상 통일) */}
          <div className="bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
              style={{ 
                width: `${(timeLeft / totalTime) * 100}%`,
                transition: gameState === 'clicking' ? 'none' : 'width 0.2s ease-out' // 게임 중엔 하드웨어 가속 다이렉트 렌더링
              }} 
            />
          </div>

          {/* 실시간 CPS 및 누적 정보 바 */}
          <div className="flex justify-between items-center text-[11px] pt-1 border-t border-zinc-900 text-zinc-400">
            <div>
              LIVE CPS: <span className="text-emerald-400 font-black text-sm tabular-nums">{currentCps}</span>
            </div>
            <div>
              TOTAL CLICKS: <span className="text-white font-black text-sm tabular-nums">{clickCount}</span>
            </div>
          </div>
        </div>

        {/* ⚡ 클릭 판정 코어 패널 (고퀄리티 액티브 스케일 애니메이션 탑재) */}
        <div 
          onMouseDown={handleScreenMouseDown}
          className={`h-[420px] rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-70 ${
            isBouncing ? 'scale-[0.98] border-emerald-400 bg-emerald-500/10' : 'active:scale-[0.985]'
          } ${bgColors[gameState]}`}
        >
          {gameState === 'waiting' && (
            <div className="space-y-2">
              <p className="text-lg font-bold text-zinc-300 animate-pulse">{t.waiting}</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">{t.desc}</p>
              {!user && <p className="text-xs text-zinc-600 font-medium pt-2">{t.loginAlert}</p>}
            </div>
          )}

          {gameState === 'clicking' && (
            <div className="space-y-2 pointer-events-none">
              <p className={`text-7xl font-black text-emerald-400 tracking-tighter tabular-nums transition-transform duration-75 ${
                isBouncing ? 'scale-110 text-white' : 'scale-100'
              }`}>
                {clickCount}
              </p>
              <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-[0.2em]">{t.clicking}</p>
            </div>
          )}

          {gameState === 'all-done' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">{t.result}</p>
                <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums animate-bounce">
                  {(clickCount / totalTime).toFixed(2)}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.cps}</span>
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-1">{t.finalClicks}: {clickCount} Clicks</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                {saveStatus && <p className="text-xs font-sans font-bold text-amber-400 bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/10 inline-block">{saveStatus}</p>}
                {xpNotice && <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block">{xpNotice}</p>}
              </div>

              <button 
                onClick={(e) => { e.stopPropagation(); resetEntireTest(); }}
                onMouseDown={(e) => e.stopPropagation()}
                className="mt-1 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-all shadow-lg"
              >
                {t.restartAll}
              </button>
            </div>
          )}
        </div>

        {/* 실시간 클릭 속도 그래프 보드 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
          <div className="text-[10px] font-mono font-black text-zinc-500 tracking-wider mb-4 pb-2 border-b border-zinc-900 uppercase">
            {t.historyTable}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: totalTime }).map((_, idx) => {
              const secNum = idx + 1;
              const secScore = cpsHistory[idx];
              const isRecorded = secScore !== undefined;
              const isCurrent = gameState === 'clicking' && Math.floor(totalTime - timeLeft) === idx;
              
              return (
                <div 
                  key={secNum}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl border font-mono text-xs transition-all ${
                    isCurrent ? 'bg-zinc-900 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] scale-[1.02]' : 'bg-zinc-950/40 border-zinc-900/60'
                  }`}
                >
                  <span className="font-bold text-zinc-600 text-[10px]">{secNum}{t.sec}</span>
                  <span className={`font-black tracking-tight text-sm ${isRecorded ? 'text-emerald-400' : 'text-zinc-800'}`}>
                    {isRecorded ? `${secScore} Clicks` : '---'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}