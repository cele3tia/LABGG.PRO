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
    result: '피지컬 분석 리포트',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: '기록 및 경험치 정산 중...',
    saveSuccess: '최고 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 글로벌 리더보드에 등록됩니다.',
    myBest: '내 최고 CPS:',
    settingCount: '테스트 시간:',
    progress: '실시간 분석기',
    sec: '초',
    finalClicks: '총 클릭 수',
    restartAll: '다시 도전하기',
    percentileTitle: '피지컬 백분위',
    rankTitle: '최종 등급'
  },
  en: {
    back: '← Back to Home',
    title: 'CPS Click Speed Test',
    desc: 'Click as fast as you can within the time limit!',
    waiting: 'Click anywhere to start.',
    clicking: 'CLICK NOW!!!',
    result: 'Physical Analysis Report',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: 'Saving score & XP...',
    saveSuccess: 'New Personal Best! 🏆',
    xpEarned: 'XP Earned! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to register your score on the leaderboard.',
    myBest: 'My Best CPS:',
    settingCount: 'Test Duration:',
    progress: 'Live Analyzer',
    sec: 's',
    finalClicks: 'Total Clicks',
    restartAll: 'Try Again',
    percentileTitle: 'Percentile',
    rankTitle: 'Final Rank'
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
  const [isBouncing, setIsBouncing] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const lastActionTimeRef = useRef<number>(0);

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

  const updateTimer = () => {
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    const currentLeft = Math.max(0, totalTime - elapsed);
    
    setTimeLeft(currentLeft);

    if (currentLeft > 0) {
      timerRef.current = requestAnimationFrame(updateTimer);
    } else {
      setGameState('all-done');
    }
  };

  const startCpsTest = () => {
    setGameState('clicking');
    setClickCount(1);
    startTimeRef.current = performance.now();
    timerRef.current = requestAnimationFrame(updateTimer);
  };

  const handleScreenMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // 💡 좌클릭(0)이 아니면 무조건 리턴해서 우클릭/휠클릭 꼼수 방지!
    if (e.button !== 0) return;
    
    // 매크로(오토마우스) 같은 스크립트 이벤트 방어
    if (e.nativeEvent && e.nativeEvent.isTrusted === false) return;

    if (gameState === 'waiting') {
      if (performance.now() - lastActionTimeRef.current < 400) return;
      startCpsTest();
    } else if (gameState === 'clicking') {
      setClickCount((prev) => prev + 1);
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 40);
    }
  };

  const resetEntireTest = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setClickCount(0);
    setTimeLeft(totalTime);
    setSaveStatus('');
    setXpNotice('');
    setGameState('waiting');
    lastActionTimeRef.current = performance.now();
  };

  useEffect(() => {
    if (gameState === 'all-done') {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      setTimeLeft(0);
      const finalCps = parseFloat((clickCount / totalTime).toFixed(2));
      saveFinalCpsAndProcessXp(finalCps);
      lastActionTimeRef.current = performance.now();
    }
  }, [gameState]);

  const elapsedTime = gameState === 'all-done' ? totalTime : (totalTime - timeLeft);
  const currentCps = clickCount > 0 && elapsedTime > 0
    ? (clickCount / elapsedTime).toFixed(2)
    : '0.00';

  const getAdvancedStats = (cps: number, currentLang: 'ko' | 'en') => {
    const num = parseFloat(cps.toString());
    if (num === 0) return { rank: '---', percent: '---', color: 'text-zinc-600', glow: '' };
    
    if (num < 4.0) {
      return { rank: currentLang === 'ko' ? '아이언 (Iron)' : 'Iron', percent: currentLang === 'ko' ? '상위 98%' : 'Top 98%', color: 'text-zinc-500', glow: '' };
    }
    if (num < 6.0) {
      return { rank: currentLang === 'ko' ? '브론즈 (Bronze)' : 'Bronze', percent: currentLang === 'ko' ? '상위 85%' : 'Top 85%', color: 'text-amber-700', glow: '' };
    }
    if (num < 7.5) {
      return { rank: currentLang === 'ko' ? '실버 (Silver)' : 'Silver', percent: currentLang === 'ko' ? '상위 70%' : 'Top 70%', color: 'text-zinc-400', glow: '' };
    }
    if (num < 9.0) {
      return { rank: currentLang === 'ko' ? '골드 (Gold)' : 'Gold', percent: currentLang === 'ko' ? '상위 50%' : 'Top 50%', color: 'text-yellow-500', glow: '' };
    }
    if (num < 10.5) {
      return { rank: currentLang === 'ko' ? '플래티넘 (Platinum)' : 'Platinum', percent: currentLang === 'ko' ? '상위 35%' : 'Top 35%', color: 'text-teal-400', glow: '' };
    }
    if (num < 12.0) {
      return { rank: currentLang === 'ko' ? '다이아몬드 (Diamond)' : 'Diamond', percent: currentLang === 'ko' ? '상위 18%' : 'Top 18%', color: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]' };
    }
    if (num < 13.5) {
      return { rank: currentLang === 'ko' ? '마스터 (Master)' : 'Master', percent: currentLang === 'ko' ? '상위 8%' : 'Top 8%', color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.2)]' };
    }
    if (num < 15.0) {
      return { rank: currentLang === 'ko' ? '그랜드마스터 (Grandmaster)' : 'Grandmaster', percent: currentLang === 'ko' ? '상위 3%' : 'Top 3%', color: 'text-purple-400', glow: 'shadow-[0_0_22px_rgba(192,132,252,0.25)]' };
    }
    if (num < 16.5) {
      return { rank: currentLang === 'ko' ? '챌린저 (Challenger)' : 'Challenger', percent: currentLang === 'ko' ? '상위 0.8%' : 'Top 0.8%', color: 'text-amber-400', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.35)]' };
    }
    if (num < 18.5) {
      return { rank: currentLang === 'ko' ? '이모탈 (Immortal)' : 'Immortal', percent: currentLang === 'ko' ? '상위 0.1%' : 'Top 0.1%', color: 'text-rose-500 font-extrabold', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.4)] border-rose-500/20' };
    }
    return { rank: currentLang === 'ko' ? '레전드 (Legend) 🔥' : 'Legend 🔥', percent: currentLang === 'ko' ? '상위 0.01%' : 'Top 0.01%', color: 'text-red-500 animate-pulse font-black', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.5)] border-red-500/40' };
  };

  const stats = getAdvancedStats(parseFloat(currentCps), lang);

  const bgColors = {
    waiting: 'bg-zinc-950 border-zinc-900',
    clicking: 'bg-emerald-950/10 border-emerald-500/40 shadow-[inset_0_0_40px_rgba(16,185,129,0.03)]',
    'all-done': 'bg-zinc-950 border-zinc-800'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none">
      
      {/* 상단 네비 바 */}
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
        
        {/* 타이틀 헤더 */}
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
                className={`w-12 h-8 rounded-lg font-mono text-xs font-black transition-all ${
                  totalTime === time ? 'bg-white text-black font-black' : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'
                }`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>

        {/* 🌊 타임 트랙 프로그레스 바 */}
        <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-xl flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{t.progress}:</span>
              <span className="text-white font-black text-sm tabular-nums">
                {timeLeft.toFixed(2)}<span className="text-xs text-zinc-500 font-normal"> / {totalTime}s</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">LIVE CPS: </span>
              <span className="text-emerald-400 font-black text-sm tabular-nums">{currentCps}</span>
            </div>
          </div>

          <div className="bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
              style={{ 
                width: `${(timeLeft / totalTime) * 100}%`,
                transition: gameState === 'clicking' ? 'none' : 'width 0.15s ease-out'
              }} 
            />
          </div>

          <div className="flex justify-between items-center text-[10px] pt-1 text-zinc-500">
            <div>STATUS: <span className={gameState === 'clicking' ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>{gameState.toUpperCase()}</span></div>
            <div>{t.finalClicks}: <span className="text-zinc-300 font-bold tabular-nums">{clickCount}</span></div>
          </div>
        </div>

        {/* ⚡ 클릭 보드 본체 */}
        <div 
          onMouseDown={handleScreenMouseDown}
          onContextMenu={(e) => e.preventDefault()} // 💡 우클릭 시 컨텍스트 메뉴(창) 뜨는 현상 완전 차단
          className={`h-[420px] rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-70 ${
            isBouncing ? 'scale-[0.97] border-emerald-400 bg-emerald-500/10' : 'active:scale-[0.985]'
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
              <p className={`text-8xl font-black text-emerald-400 tracking-tighter tabular-nums transition-transform duration-75 ${
                isBouncing ? 'scale-110 text-white' : 'scale-100'
              }`}>
                {clickCount}
              </p>
              <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-[0.25em]">{t.clicking}</p>
            </div>
          )}

          {gameState === 'all-done' && (
            <div className="space-y-5 w-full max-w-md animate-[fadeIn_0.3s_ease-out]">
              <div>
                <p className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">{t.result}</p>
                <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums">
                  {currentCps}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.cps}</span>
                </p>
              </div>

              <div className={`grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-left ${stats.glow} transition-all duration-500`}>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.rankTitle}</span>
                  <span className={`text-sm font-black tracking-tight ${stats.color}`}>{stats.rank}</span>
                </div>
                <div className="space-y-0.5 border-l border-zinc-800 pl-4">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.percentileTitle}</span>
                  <span className="text-sm font-black text-white tracking-tight">{stats.percent}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                {saveStatus && <p className="text-xs font-sans font-bold text-amber-400 bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/10 inline-block">{saveStatus}</p>}
                {xpNotice && <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block">{xpNotice}</p>}
              </div>

              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (performance.now() - lastActionTimeRef.current < 400) return;
                  resetEntireTest(); 
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="mt-1 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-all shadow-md active:scale-95"
              >
                {t.restartAll}
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}