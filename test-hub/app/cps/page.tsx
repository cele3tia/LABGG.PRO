'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Counter from '../components/Counter';
import MagicRings from '../components/MagicRings';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

type TestState = 'waiting' | 'clicking' | 'foul' | 'all-done';
type TotalTimeType = 3 | 5 | 7 | 10;

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
}

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    title: 'CPS 클릭 속도 테스트',
    desc: '제한 시간 동안 화면을 최대한 빠르게 연타하세요!',
    waiting: '시작하려면 화면을 클릭하세요.',
    clicking: '더 빠르게 연타하세요!!!',
    result: '피지컬 분석 결과',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: '기록 및 경험치 정산 중...',
    saveSuccess: '최고 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 글로벌 리더보드에 등록됩니다.',
    myBest: '내 최고 CPS:',
    settingCount: '테스트 시간:',
    progress: '진행 상황',
    sec: '초',
    finalClicks: '총 클릭 수',
    restartAll: '처음부터 다시 하기',
    percentileTitle: '피지컬 백분위',
    rankTitle: '최종 등급',
    macroAlert: '🚨 비정상적인 클릭 패턴(매크로/오토마우스)이 감지되어 테스트가 강제 종료되었습니다.'
  },
  en: {
    back: '← Back to Home',
    title: 'CPS Click Speed Test',
    desc: 'Click the board as fast as you can within the time limit!',
    waiting: 'Click anywhere to start.',
    clicking: 'CLICK FASTER!!!',
    result: 'Analysis Report',
    cps: 'CPS',
    clicks: 'Clicks',
    saving: 'Saving score & XP...',
    saveSuccess: 'New Personal Best! 🏆',
    xpEarned: 'XP +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to register your score on the leaderboard.',
    myBest: 'My Best CPS:',
    settingCount: 'Test Duration:',
    progress: 'Progress',
    sec: 's',
    finalClicks: 'Total Clicks',
    restartAll: 'Restart Test',
    percentileTitle: 'Percentile',
    rankTitle: 'Final Rank',
    macroAlert: '🚨 Abnormal click pattern (Macro) detected. Test terminated.'
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

  // 💡 광클 스킵 방지용 쿨타임 상태 (결과창이 뜨자마자 눌리는 걸 방지)
  const [canRestart, setCanRestart] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);
  const lastClickStampRef = useRef<number>(0); 
  
  const lastIntervalRef = useRef<number>(0);
  const exactIntervalCountRef = useRef<number>(0);

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
    } catch (error) { setSaveStatus('Error'); }
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
    lastClickStampRef.current = performance.now();
    lastIntervalRef.current = 0;
    exactIntervalCountRef.current = 0;
    setCanRestart(false); // 테스트 시작 시 리셋 버튼 잠금
    timerRef.current = requestAnimationFrame(updateTimer);
  };

  const triggerFoul = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setGameState('foul');
  };

  const resetEntireTest = () => {
    if (timerRef.current) cancelAnimationFrame(timerRef.current);
    setClickCount(0);
    setTimeLeft(totalTime);
    setSaveStatus('');
    setXpNotice('');
    setGameState('waiting');
    setCanRestart(false);
    lastActionTimeRef.current = performance.now();
    lastClickStampRef.current = 0;
    lastIntervalRef.current = 0;
    exactIntervalCountRef.current = 0;
  };

  const handleScreenMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    
    const now = performance.now();

    if (gameState === 'foul') {
      // 💡 파울 상태일 때도 쿨타임(1.2초) 적용
      if (!canRestart) return; 
      resetEntireTest();
      return;
    }
    
    if (e.nativeEvent && e.nativeEvent.isTrusted === false) {
      triggerFoul();
      return;
    }

    if (gameState === 'waiting') {
      if (now - lastActionTimeRef.current < 400) return;
      startCpsTest();
    } else if (gameState === 'clicking') {
      const interval = now - lastClickStampRef.current;
      
      if (interval > 0 && interval < 20) {
        triggerFoul();
        return;
      }

      if (lastIntervalRef.current > 0) {
        const intervalDiff = Math.abs(interval - lastIntervalRef.current);
        if (intervalDiff <= 1) { 
          exactIntervalCountRef.current += 1;
          if (exactIntervalCountRef.current >= 3) {
            triggerFoul();
            return;
          }
        } else {
          exactIntervalCountRef.current = 0;
        }
      }

      lastIntervalRef.current = interval;
      lastClickStampRef.current = now;
      
      setClickCount((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (gameState === 'all-done') {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      setTimeLeft(0);
      const finalCps = parseFloat((clickCount / totalTime).toFixed(2));
      saveFinalCpsAndProcessXp(finalCps);

      // 💡 결과창이 뜨면 1.2초 동안 버튼을 클릭 불가능하게 잠금
      setCanRestart(false);
      const lockTimer = setTimeout(() => setCanRestart(true), 1200);
      return () => clearTimeout(lockTimer);
      
    } else if (gameState === 'foul') {
      // 💡 매크로 경고창이 떠도 1.2초 동안은 실수로 스킵 못하게 잠금
      setCanRestart(false);
      const lockTimer = setTimeout(() => setCanRestart(true), 1200);
      return () => clearTimeout(lockTimer);
    }
  }, [gameState]);

  const elapsedTime = gameState === 'all-done' ? totalTime : (totalTime - timeLeft);
  const currentCps = clickCount > 0 && elapsedTime > 0 ? (clickCount / elapsedTime).toFixed(2) : '0.00';

  const getAdvancedStats = (cps: number, currentLang: 'ko' | 'en') => {
    const num = parseFloat(cps.toString());
    if (num === 0) return { rank: '---', percent: '---', color: 'text-zinc-600', glow: '' };
    
    if (num < 4.0) return { rank: currentLang === 'ko' ? '아이언 (Iron)' : 'Iron', percent: currentLang === 'ko' ? '상위 98%' : 'Top 98%', color: 'text-zinc-500', glow: '' };
    if (num < 6.0) return { rank: currentLang === 'ko' ? '브론즈 (Bronze)' : 'Bronze', percent: currentLang === 'ko' ? '상위 85%' : 'Top 85%', color: 'text-amber-700', glow: '' };
    if (num < 7.5) return { rank: currentLang === 'ko' ? '실버 (Silver)' : 'Silver', percent: currentLang === 'ko' ? '상위 70%' : 'Top 70%', color: 'text-zinc-400', glow: '' };
    if (num < 9.0) return { rank: currentLang === 'ko' ? '골드 (Gold)' : 'Gold', percent: currentLang === 'ko' ? '상위 50%' : 'Top 50%', color: 'text-yellow-500', glow: '' };
    if (num < 10.5) return { rank: currentLang === 'ko' ? '플래티넘 (Platinum)' : 'Platinum', percent: currentLang === 'ko' ? '상위 35%' : 'Top 35%', color: 'text-teal-400', glow: '' };
    if (num < 12.0) return { rank: currentLang === 'ko' ? '다이아몬드 (Diamond)' : 'Diamond', percent: currentLang === 'ko' ? '상위 18%' : 'Top 18%', color: 'text-sky-400', glow: '' };
    if (num < 13.5) return { rank: currentLang === 'ko' ? '마스터 (Master)' : 'Master', percent: currentLang === 'ko' ? '상위 8%' : 'Top 8%', color: 'text-indigo-400', glow: '' };
    if (num < 15.0) return { rank: currentLang === 'ko' ? '그랜드마스터 (Grandmaster)' : 'Grandmaster', percent: currentLang === 'ko' ? '상위 3%' : 'Top 3%', color: 'text-purple-400', glow: '' };
    if (num < 16.5) return { rank: currentLang === 'ko' ? '챌린저 (Challenger)' : 'Challenger', percent: currentLang === 'ko' ? '상위 0.8%' : 'Top 0.8%', color: 'text-amber-400', glow: '' };
    if (num < 18.5) return { rank: currentLang === 'ko' ? '이모탈 (Immortal)' : 'Immortal', percent: currentLang === 'ko' ? '상위 0.1%' : 'Top 0.1%', color: 'text-rose-500 font-extrabold', glow: '' };
    return { rank: currentLang === 'ko' ? '레전드 (Legend) 🔥' : 'Legend 🔥', percent: currentLang === 'ko' ? '상위 0.01%' : 'Top 0.01%', color: 'text-red-500 animate-pulse font-black', glow: '' };
  };

  const stats = getAdvancedStats(parseFloat(currentCps), lang);

  const bgClasses = {
    waiting: 'bg-zinc-950 border-zinc-900',
    clicking: 'bg-zinc-900 border-zinc-700',
    foul: 'bg-red-950/80 border-red-900',
    'all-done': 'bg-zinc-950 border-zinc-800'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      {/* 🌪 매직링 */}
      <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-700 flex items-center justify-center ${gameState === 'clicking' ? 'opacity-30 scale-100' : 'opacity-0 scale-110'}`}>
        <div className="w-[180vw] h-[180vh] transform -rotate-12 flex items-center justify-center">
          <MagicRings 
            color="#38bdf8" 
            colorTwo="#7dd3fc" 
            ringCount={5} 
            speed={gameState === 'clicking' ? 3 : 0.5} 
            attenuation={12} 
            lineThickness={2} 
            clickBurst={false} 
            followMouse={false} 
          />
        </div>
      </div>

      {/* 상단 네비 바 */}
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto relative z-10">
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

      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-4 space-y-5 relative z-10">
        
        {/* 타이틀 및 세팅 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block mb-1">
              LABGG PHYSICAL ENGINE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.title}</h1>
            <p className="text-xs text-zinc-500 max-w-md mt-1 leading-relaxed">{t.desc}</p>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
            <span className="text-[10px] font-mono text-zinc-500 px-2.5 font-bold">{t.settingCount}</span>
            {([3, 5, 7, 10] as TotalTimeType[]).map((time) => (
              <button
                key={time}
                disabled={gameState === 'clicking' || gameState === 'foul'}
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

        {/* 진행 상황 바 */}
        <div className="bg-zinc-950 border border-zinc-900 px-4 py-3 rounded-xl flex items-center justify-between font-mono text-xs gap-4">
          <div className="flex items-center gap-2 min-w-[110px]">
            <span className="text-zinc-500 font-bold">{t.progress}:</span>
            <span className="text-white font-black text-sm tabular-nums">
              {timeLeft.toFixed(2)} <span className="text-zinc-700 font-normal">/</span> {totalTime}s
            </span>
          </div>
          <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${gameState === 'foul' ? 'bg-red-500' : 'bg-sky-400'}`} style={{ width: `${(timeLeft / totalTime) * 100}%`, transition: gameState === 'clicking' ? 'none' : 'width 0.15s ease-out' }} />
          </div>
          <div className="min-w-[100px] text-right">
            <span className="text-zinc-400 font-bold">LIVE: <span className={`${gameState === 'foul' ? 'text-red-400' : 'text-sky-400'} font-black text-sm`}>{currentCps}</span></span>
          </div>
        </div>

        {/* ⚡ 메인 클릭 보드 */}
        <div 
          onMouseDown={handleScreenMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: 'none' }}
          className={`h-[420px] rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-75 select-none ${
            gameState === 'clicking' ? 'active:scale-[0.99]' : 'active:scale-[0.995]'
          } ${bgClasses[gameState]}`}
        >
          {gameState === 'waiting' && (
            <div className="space-y-2">
              <p className="text-lg font-bold text-zinc-300">{t.waiting}</p>
              {!user && <p className="text-xs text-zinc-600 font-medium">{t.loginAlert}</p>}
            </div>
          )}

          {gameState === 'clicking' && (
            <div className="space-y-4 pointer-events-none">
              <div className="flex justify-center">
                <Counter
                  value={clickCount}
                  places={[100, 10, 1]}
                  fontSize={160}
                  padding={0} 
                  gap={4}
                  textColor="#FFFFFF" 
                  fontWeight={900} 
                />
              </div>
              <p className="text-[11px] font-mono font-black text-sky-400 uppercase tracking-[0.4em]">{t.clicking}</p>
            </div>
          )}

          {gameState === 'foul' && (
            <div className="space-y-4 relative z-10 animate-[fadeIn_0.2s_ease-out]">
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-2 animate-pulse">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
              </div>
              <p className="text-xl font-black text-red-500 tracking-widest uppercase">TEST TERMINATED</p>
              <p className="text-[11px] text-red-400/80 font-bold max-w-[260px] mx-auto leading-relaxed">{t.macroAlert}</p>
              
              {/* 💡 파울 쿨타임 버튼 연동 */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!canRestart) return;
                  resetEntireTest(); 
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`mt-6 px-6 py-2.5 bg-red-950 border border-red-900 rounded-xl text-xs font-bold transition-all ${
                  canRestart ? 'text-red-300 hover:bg-red-900 hover:text-white cursor-pointer active:scale-95' : 'text-red-900 opacity-50 cursor-not-allowed'
                }`}
              >
                {t.restartAll}
              </button>
            </div>
          )}

          {gameState === 'all-done' && (
            <div className="space-y-5 w-full max-w-md animate-[fadeIn_0.3s_ease-out]">
              <div>
                <p className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">{t.result}</p>
                <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums">
                  {currentCps}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.cps}</span>
                </p>
              </div>

              <div className={`grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl font-mono text-left transition-all duration-500`}>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.rankTitle}</span>
                  <span className={`text-sm font-black tracking-tight ${stats.color}`}>{stats.rank}</span>
                </div>
                <div className="space-y-0.5 border-l border-zinc-800 pl-4">
                  <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.percentileTitle}</span>
                  <span className="text-sm font-black text-white tracking-tight">{stats.percent}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 h-6">
                {saveStatus && <p className="text-xs font-sans font-bold text-amber-400 bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/10 inline-block">{saveStatus}</p>}
                {xpNotice && <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block">{xpNotice}</p>}
              </div>

              {/* 💡 광클 스킵 방지 쿨타임 버튼 연동 */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (!canRestart) return;
                  resetEntireTest(); 
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className={`mt-1 px-5 py-2.5 border rounded-xl text-xs font-bold transition-all w-full ${
                  canRestart ? 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-white hover:text-black cursor-pointer active:scale-95' : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-600 opacity-50 cursor-not-allowed'
                }`}
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