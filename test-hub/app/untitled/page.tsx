'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Counter from '../components/Counter';
import MagicRings from '../components/MagicRings';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

type TestState = 'waiting' | 'clicking' | 'round-result' | 'all-done';

interface RoundRecord {
  round: number;
  target: number;
  actual: number;
  diff: number;
}

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    title: '정밀 감각 타이밍 테스트',
    desc: '목표 시간이 주어지면 버튼을 누르고, 오직 감각만으로 시간을 추적해 손을 떼세요.',
    myBest: '내 최고 평균 오차:',
    progress: '실시간 감각 분석기',
    status: '상태',
    statusWaiting: '대기 중',
    statusClicking: '측정 중...',
    statusRoundResult: '분석 완료',
    targetTime: '목표 시간',
    yourTime: '나의 기록',
    targetHidden: '// 목표 시간 은폐됨',
    result: '최종 분석 결과', 
    errorGap: '오차 범위',
    avgErrorGap: '평균 오차 범위',
    rankTitle: '최종 등급',
    percentileTitle: '피지컬 백분위',
    saving: '기록 및 정산 중...',
    saveSuccess: '최고 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 글로벌 리더보드에 등록됩니다.',
    restartAll: '처음부터 다시하기',
    nextPhase: '다음 페이지 진행', 
    showFinalResult: '최종 결과 확인', 
    holdToStart: '버튼을 꾹 누르세요',
    releaseNow: '지금 손을 떼세요!',
    focusSense: '감각에 집중하세요',
    sec: '초',
    round: 'PHASE',
    target: 'TARGET', 
    record: 'ACTUAL',
    lowDetail: '낮은 디테일'
  },
  en: {
    back: '← HOME',
    title: 'Precision Timing Test',
    desc: 'Memorize the target time, hold the button, and release it using only your internal sense of time.',
    myBest: 'MY BEST AVG ERROR:',
    progress: 'LIVE SENSORY ANALYZER',
    status: 'STATUS',
    statusWaiting: 'READY',
    statusClicking: 'SENSING...',
    statusRoundResult: 'ANALYZED',
    targetTime: 'TARGET TIME',
    yourTime: 'YOUR TIME',
    targetHidden: '// TARGET HIDDEN',
    result: 'FINAL ANALYSIS REPORT',
    errorGap: 'ERROR GAP',
    avgErrorGap: 'AVG ERROR GAP',
    rankTitle: 'FINAL RANK',
    percentileTitle: 'PERCENTILE',
    saving: 'SYNCING SCORES...',
    saveSuccess: 'NEW RECORD! 🏆',
    xpEarned: 'XP +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to register your score on the leaderboard.',
    restartAll: 'TRY AGAIN',
    nextPhase: 'ENGAGE NEXT PHASE',
    showFinalResult: 'VIEW FINAL REPORT',
    holdToStart: 'PRESS & HOLD BY FEEL',
    releaseNow: 'RELEASE NOW!',
    focusSense: 'FOCUS ON TIME',
    sec: 's',
    round: 'PHASE',
    target: 'TARGET', 
    record: 'ACTUAL',
    lowDetail: 'Low Detail'
  }
};

export default function PrecisionTimingTestPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);

  const [gameState, setGameState] = useState<TestState>('waiting');
  const [myBestPrecision, setMyBestPrecision] = useState<number | string>('---');
  
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [xpNotice, setXpNotice] = useState<string>('');

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundHistory, setRoundHistory] = useState<RoundRecord[]>([]);

  const [targetTime, setTargetTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [currentDiff, setCurrentDiff] = useState<number>(0); 
  const [avgDiff, setAvgDiff] = useState<number>(0);

  const [lowDetail, setLowDetail] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const lastActionTimeRef = useRef<number>(0);

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const savedLowDetail = localStorage.getItem('low-detail') === 'true';
    setLowDetail(savedLowDetail);

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

  const toggleLowDetail = () => {
    setLowDetail(prev => {
      localStorage.setItem('low-detail', String(!prev));
      return !prev;
    });
  };

  const generateNewTarget = () => {
    const randomSec = (Math.random() * 4 + 2).toFixed(3);
    setTargetTime(parseFloat(randomSec));
  };

  const saveFinalPrecisionAndProcessXp = async (finalAvgDiff: number) => {
    if (!auth.currentUser) return;
    setSaveStatus(t.saving);
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    let bonus = 30;
    if (finalAvgDiff <= 0.05) bonus = 500;
    else if (finalAvgDiff <= 0.15) bonus = 250;
    else if (finalAvgDiff <= 0.35) bonus = 120;
    const earnedXp = Math.max(30, Math.floor((1 / (finalAvgDiff + 0.01)) * 8) + bonus);

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

        const isNewBest = finalAvgDiff < currentBest;

        if (isNewUser) {
          transaction.set(userDocRef, {
            uid, displayName: auth.currentUser?.displayName || 'Anonymous',
            photoURL: auth.currentUser?.photoURL || '', precisionBest: finalAvgDiff,
            level: currentLevel, xp: currentXp, updatedAt: serverTimestamp()
          });
        } else {
          const updateData: any = { xp: currentXp, level: currentLevel, updatedAt: serverTimestamp() };
          if (isNewBest) updateData.precisionBest = finalAvgDiff;
          transaction.update(userDocRef, updateData);
        }

        return { isLeveledUp, currentLevel, isNewBest: isNewBest || isNewUser };
      });

      if (txResult.isNewBest) {
        setMyBestPrecision(`±${finalAvgDiff}s`);
        setSaveStatus(t.saveSuccess);
      } else {
        setSaveStatus('');
      }
      setXpNotice(`${t.xpEarned}${earnedXp} XP ${txResult.isLeveledUp ? `| ${t.levelUp} (Lv.${txResult.currentLevel})` : ''}`);
    } catch (error) {
      setSaveStatus('Error');
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (performance.now() - lastActionTimeRef.current < 400) return;
    if (gameState !== 'waiting') return;
    
    setGameState('clicking');
    startTimeRef.current = performance.now();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (gameState !== 'clicking') return;

    const endTime = performance.now();
    const elapsed = parseFloat(((endTime - startTimeRef.current) / 1000).toFixed(3));
    const difference = parseFloat(Math.abs(elapsed - targetTime).toFixed(3));

    const newRecord: RoundRecord = {
      round: currentRound,
      target: targetTime,
      actual: elapsed,
      diff: difference
    };

    const updatedHistory = [...roundHistory, newRecord];
    setRoundHistory(updatedHistory);
    setElapsedTime(elapsed);
    setCurrentDiff(difference);

    setGameState('round-result');
  };

  const handleNextPhaseOrFinish = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    lastActionTimeRef.current = performance.now();

    if (roundHistory.length >= 3) {
      const totalDiff = roundHistory.reduce((acc, curr) => acc + curr.diff, 0);
      const finalAvg = parseFloat((totalDiff / 3).toFixed(3));
      setAvgDiff(finalAvg);
      setGameState('all-done');
      saveFinalPrecisionAndProcessXp(finalAvg);
    } else {
      setCurrentRound(prev => prev + 1);
      generateNewTarget();
      setGameState('waiting');
    }
  };

  const resetEntireTest = (e: React.MouseEvent) => {
    e.stopPropagation();
    lastActionTimeRef.current = performance.now();
    setCurrentRound(1);
    setRoundHistory([]);
    setElapsedTime(0);
    setCurrentDiff(0);
    setAvgDiff(0);
    setSaveStatus('');
    setXpNotice('');
    generateNewTarget();
    setGameState('waiting');
  };

  const getAdvancedStats = (diff: number, currentState: TestState) => {
    if (currentState !== 'all-done') return { rank: '---', percent: '---', color: 'text-zinc-600', glow: '' };
    if (diff <= 0.03) return { rank: lang === 'ko' ? '레전드 🔥' : 'Legend 🔥', percent: 'Top 0.01%', color: 'text-red-500 animate-pulse font-black', glow: 'shadow-[0_0_40px_rgba(239,68,68,0.4)] border-red-500/30' };
    if (diff <= 0.08) return { rank: lang === 'ko' ? '이모탈' : 'Immortal', percent: 'Top 0.1%', color: 'text-rose-500 font-extrabold', glow: 'shadow-[0_0_30px_rgba(244,63,94,0.3)] border-rose-500/20' };
    if (diff <= 0.15) return { rank: lang === 'ko' ? '챌린저' : 'Challenger', percent: 'Top 1%', color: 'text-amber-400 font-bold', glow: 'shadow-[0_0_25px_rgba(251,191,36,0.25)]' };
    if (diff <= 0.25) return { rank: lang === 'ko' ? '마스터' : 'Master', percent: 'Top 8%', color: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.2)]' };
    if (diff <= 0.40) return { rank: lang === 'ko' ? '다이아몬드' : 'Diamond', percent: 'Top 18%', color: 'text-sky-400', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.15)]' };
    if (diff <= 0.60) return { rank: lang === 'ko' ? '플래티넘' : 'Platinum', percent: 'Top 35%', color: 'text-teal-400', glow: '' };
    if (diff <= 0.85) return { rank: lang === 'ko' ? '골드' : 'Gold', percent: 'Top 50%', color: 'text-yellow-500', glow: '' };
    if (diff <= 1.30) return { rank: lang === 'ko' ? '실버' : 'Silver', percent: 'Top 70%', color: 'text-zinc-400', glow: '' };
    return { rank: lang === 'ko' ? '브론즈' : 'Bronze', percent: 'Top 90%', color: 'text-amber-700', glow: '' };
  };

  const t = TRANSLATIONS[lang];
  const stats = getAdvancedStats(avgDiff, gameState);

  const currentRawDiffNum = parseFloat((elapsedTime - targetTime).toFixed(3));
  const currentRawDiffStr = currentRawDiffNum > 0 ? `+${currentRawDiffNum.toFixed(3)}` : currentRawDiffNum.toFixed(3);

  const completedRounds = roundHistory.length;
  const getProgressWidth = () => {
    return `${(completedRounds / 3) * 100}%`;
  };

  const getMorphPanelClasses = () => {
    const base = "fixed left-1/2 -translate-x-1/2 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] border flex flex-col items-center antialiased";
    const shadowClass = lowDetail ? "" : "shadow-2xl";
    
    if (gameState === 'waiting') {
      return `${base} ${shadowClass} top-[calc(100vh-280px)] w-full max-w-sm h-24 rounded-2xl bg-zinc-950 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900/60 cursor-pointer z-30 py-8 justify-center mb-8 sm:mb-12`;
    }
    if (gameState === 'clicking') {
      const insetGlow = lowDetail ? "" : "shadow-[inset_0_0_100px_rgba(158,56,255,0.35)]";
      return `${base} ${shadowClass} ${insetGlow} top-0 w-screen max-w-full h-screen rounded-none bg-[#140727]/40 border-purple-500/40 text-purple-300 pb-32 justify-end z-30`;
    }
    if (gameState === 'round-result') {
      const boxGlow = lowDetail ? "" : "shadow-[0_0_40px_rgba(158,56,255,0.25),inset_0_0_30px_rgba(158,56,255,0.2)]";
      return `${base} ${shadowClass} ${boxGlow} top-[45vh] -translate-y-1/2 w-full max-w-sm h-[380px] rounded-3xl bg-[#140727]/95 border-purple-500/40 p-6 justify-center z-50`;
    }
    return "hidden";
  };

  const isClickableState = gameState === 'waiting' || gameState === 'clicking';

  return (
    <div 
      className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col p-6 sm:p-10 select-none relative overflow-hidden"
      onContextMenu={(e) => e.preventDefault()} 
    >
      
      {/* 🌪 빽그라운드 매직링 (낮은 디테일 모드가 OFF일 때만 렌더링) */}
      {!lowDetail && (
        <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-700 flex items-center justify-center ${gameState === 'clicking' ? 'opacity-30 scale-100' : 'opacity-0 scale-110'}`}>
          <div className="w-[180vw] h-[180vh] transform -rotate-45 flex items-center justify-center">
            <MagicRings color="#9e38ff" colorTwo="#7928ca" ringCount={6} speed={gameState === 'clicking' ? 4 : 1} attenuation={12} lineThickness={2} clickBurst={false} followMouse={false} />
          </div>
        </div>
      )}

      {/* 상단 네비 바 */}
      <nav className="flex justify-between items-center w-full max-w-5xl mx-auto relative z-40 shrink-0">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <div className="font-mono text-xs text-zinc-500 flex items-center gap-2">
          <span>{t.myBest}</span>
          <span className="text-purple-400 font-black tracking-wide text-sm">
            {myBestPrecision}
          </span>
        </div>
      </nav>

      {/* 메인 컨테이너 */}
      <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-start mt-8 relative z-10">
        
        <header className="flex flex-col gap-1 shrink-0">
          <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block">
            LABGG PHYSICAL ENGINE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.title}</h1>
          <p className="text-xs text-zinc-500 max-w-md mt-1 leading-relaxed">{t.desc}</p>
        </header>

        {/* 상태창 바 */}
        <section aria-label="Status Bar" className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex flex-col gap-3 font-mono text-xs mt-6 shrink-0 shadow-lg relative z-40">
          <div className="flex items-center justify-between font-bold">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">{t.progress}:</span>
              <div className="flex items-baseline gap-1.5 text-white font-black text-sm">
                <span className="text-purple-400 tracking-widest">{t.round}</span>
                <span className="tabular-nums tracking-widest">
                  {completedRounds}
                  <span className="text-zinc-600 font-normal mx-1">/</span>
                  3
                </span>
              </div>
            </div>
            <div className="text-right flex items-center gap-2">
              <span className="text-zinc-600 hidden sm:inline">{t.status}</span>
              <span className={`font-black text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-md ${gameState === 'clicking' ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}>
                {gameState === 'clicking' ? t.statusClicking : gameState === 'round-result' ? t.statusRoundResult : gameState === 'all-done' ? 'DONE' : t.statusWaiting}
              </span>
            </div>
          </div>
          <div className="bg-zinc-900 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-purple-500 h-full shadow-[0_0_15px_rgba(158,56,255,0.6)] transition-all duration-1000 ease-in-out" 
              style={{ width: getProgressWidth() }} 
            />
          </div>
        </section>

        {/* 낮은 디테일 버튼 */}
        <div className="w-full flex justify-end mt-4 relative z-40">
          <button 
            onClick={toggleLowDetail}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-2 ${lowDetail ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-[0_0_10px_rgba(158,56,255,0.2)]' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
          >
            {t.lowDetail}
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${lowDetail ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {lowDetail ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {/* 인터랙션 레이아웃 무대 */}
        <section aria-label="Interaction Stage" className="w-full flex-1 relative flex flex-col items-center justify-between pt-4 pb-4 min-h-[400px]">
          
          <div className="w-full relative flex items-center justify-center flex-1">
            
            {/* 카운터 숫자 */}
            <div className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] absolute flex flex-col items-center z-40 antialiased
                ${gameState === 'clicking' || gameState === 'round-result'
                  ? 'opacity-0 scale-50 pointer-events-none'
                  : 'top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100 origin-center'
                }
                ${gameState === 'all-done' ? 'hidden' : 'flex'}
              `}
            >
              <span className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.3em] mb-2 uppercase">
                {t.targetTime}
              </span>
              <Counter
                value={targetTime}
                places={[10, 1, '.', 0.1, 0.01, 0.001]}
                fontSize={100}
                padding={10} 
                gap={4}
                textColor="white"
                fontWeight={800} 
              />
            </div>

            {/* 📊 최종 종합 결과 리포트 대시보드 */}
            {gameState === 'all-done' && (
              <article className="w-full max-w-md mx-auto absolute top-[5%] left-1/2 -translate-x-1/2 animate-[fadeIn_0.3s_ease-out] text-center z-40 flex flex-col gap-6 antialiased">
                <div>
                  <p className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">{t.result}</p>
                  <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums">
                    ±{avgDiff.toFixed(3)}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.sec}</span>
                  </p>
                </div>

                <div className="bg-[#09090b] border border-zinc-900 rounded-2xl p-4 space-y-2 font-mono text-[11px] text-zinc-400 text-left">
                  {roundHistory.map((rh) => {
                    const rDiff = parseFloat((rh.actual - rh.target).toFixed(3));
                    return (
                      <div key={rh.round} className="flex justify-between border-b border-zinc-900/80 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-zinc-600 font-bold">PHASE 0{rh.round}</span>
                        <span>{t.target}: {rh.target.toFixed(3)}s</span>
                        <span>{t.record}: {rh.actual.toFixed(3)}s</span>
                        <span className={`font-bold ${rh.diff <= 0.1 ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          {rDiff > 0 ? `+${rDiff.toFixed(3)}` : rDiff.toFixed(3)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className={`grid grid-cols-2 gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl font-mono text-left ${lowDetail ? '' : stats.glow} transition-all duration-500`}>
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.rankTitle}</span>
                    <span className={`text-sm font-black tracking-tight ${stats.color}`}>{stats.rank}</span>
                  </div>
                  <div className="space-y-0.5 border-l border-zinc-800 pl-4">
                    <span className="text-[10px] font-bold text-zinc-500 block uppercase tracking-wider">{t.percentileTitle}</span>
                    <span className="text-sm font-black text-white tracking-tight">{stats.percent}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1.5 h-6">
                  {saveStatus && <p className="text-xs font-sans font-bold text-amber-400 uppercase">{saveStatus}</p>}
                  {xpNotice && <p className="text-xs font-mono font-bold text-emerald-400 uppercase animate-pulse">{xpNotice}</p>}
                </div>

                {!user && (
                  <p className="text-[10px] font-sans text-zinc-500 font-bold tracking-tight text-center max-w-[280px] mx-auto leading-relaxed mt-2 animate-pulse">
                    {t.loginAlert}
                  </p>
                )}

                <button 
                  onClick={resetEntireTest}
                  className="w-full py-5 bg-white text-black font-mono text-sm font-black uppercase tracking-[0.25em] rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)] mt-2"
                >
                  {t.restartAll}
                </button>
              </article>
            )}
          </div>

          {/* 마스터 모핑 컨트롤 패널 */}
          <div className="w-full max-w-sm mt-auto relative h-24 flex items-end justify-center">
            {gameState !== 'all-done' && (
              <div
                onPointerDown={isClickableState ? handlePointerDown : undefined}
                onPointerUp={gameState === 'clicking' ? handlePointerUp : undefined}
                onPointerLeave={gameState === 'clicking' ? handlePointerUp : undefined}
                onContextMenu={(e) => e.preventDefault()} 
                className={getMorphPanelClasses()}
                style={{ WebkitTouchCallout: 'none' }} 
              >
                {/* A. 대기 상태 내부 텍스트 */}
                {gameState === 'waiting' && (
                  <>
                    <span className="relative z-10 font-mono text-sm font-black tracking-[0.25em] uppercase text-zinc-300 pointer-events-none">
                      {t.holdToStart}
                    </span>
                    {/* 💡 픽스: 로그인 경고 문구를 홀드 버튼 내부 엉덩이에 완벽하게 부착! */}
                    {!user && (
                      <span className="absolute top-[110%] left-1/2 -translate-x-1/2 text-[10px] font-sans text-zinc-500 font-bold tracking-tight text-center w-[280px] leading-relaxed pointer-events-none animate-pulse">
                        {t.loginAlert}
                      </span>
                    )}
                  </>
                )}

                {/* B. 누르고 있을 때 내부 텍스트 */}
                {gameState === 'clicking' && (
                  <div className="flex flex-col items-center gap-2 pointer-events-none text-center">
                    <span className="relative z-10 font-mono text-sm font-black tracking-[0.25em] uppercase text-purple-300">
                      {t.releaseNow}
                    </span>
                    <span className="text-[10px] text-purple-400/80 tracking-widest block mt-2 font-bold animate-pulse">
                      {t.focusSense}
                    </span>
                  </div>
                )}

                {/* C. 중간 오차 분석 결과 패널 */}
                {gameState === 'round-result' && (
                  <div className="w-full flex flex-col items-center justify-center p-2 antialiased animate-[fadeIn_0.4s_ease-out]">
                    <span className="text-[10px] font-mono font-bold text-purple-400/60 tracking-[0.3em] uppercase mb-1">
                      PHASE 0{currentRound} {t.statusRoundResult}
                    </span>
                    
                    <div className={`text-6xl font-mono font-black tracking-tighter my-4 ${currentDiff <= 0.05 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-white'}`}>
                      {currentRawDiffNum === 0 ? '0.000' : currentRawDiffStr}<span className="text-3xl text-purple-400/40 ml-1">s</span>
                    </div>

                    <div className="flex items-center justify-center gap-6 font-mono text-[10px] text-purple-300/80 bg-[#1f0d3d]/30 w-full py-4 rounded-xl border border-purple-500/20 mt-2 mb-6 shadow-inner">
                      <div className="flex flex-col items-center">
                        <span className="text-purple-400/50 mb-0.5">{t.targetTime}</span>
                        <span className="text-white font-bold text-sm">{targetTime.toFixed(3)}s</span>
                      </div>
                      <div className="w-[1px] h-8 bg-purple-500/20" />
                      <div className="flex flex-col items-center">
                        <span className="text-purple-400/50 mb-0.5">{t.yourTime}</span>
                        <span className={`font-bold text-sm ${currentDiff <= 0.05 ? 'text-emerald-400' : 'text-white'}`}>{elapsedTime.toFixed(3)}s</span>
                      </div>
                    </div>

                    <button
                      onClick={handleNextPhaseOrFinish}
                      className={`w-full py-4 bg-white text-black font-mono text-sm font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all active:scale-95 ${lowDetail ? '' : 'shadow-[0_0_25px_rgba(255,255,255,0.2)]'}`}
                    >
                      {roundHistory.length >= 3 ? t.showFinalResult : t.nextPhase}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </section>
      </main>
      
    </div>
  );
}