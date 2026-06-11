'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

type TestState = 'waiting' | 'clicking' | 'result';
type TargetTimeType = 3 | 5 | 7 | 10;

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

// 📊 클릭 주기 데이터의 표준편차를 구하는 함수
const calculateStdDev = (intervals: number[]): number => {
  if (intervals.length === 0) return 0;
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
  return Math.sqrt(variance);
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    title: '초당 클릭 수 (CPS) 테스트',
    desc: '제한 시간 동안 마우스를 최대한 빠르게 클릭하여 피지컬을 측정하세요.',
    waiting: '측정을 시작하려면 화면을 클릭하세요!',
    clicking: '누르세요!!! 더 빠르게!!!',
    result: '최종 측정 결과',
    cps: 'CPS',
    clicks: 'Clicks',
    retry: '다시 도전하기 (화면 클릭)',
    saving: 'CPS 기록 및 경험치 반영 중...',
    saveSuccess: '최고 CPS 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 레벨업 및 글로벌 리더보드에 등록됩니다.',
    myBest: '내 최고 CPS 기록:',
    settingTime: '제한 시간 설정:',
    progress: 'Time Left',
    historyTable: 'CLICK METRICS TABLE',
    totalClicks: 'TOTAL CLICKS',
    avgCps: 'AVG CPS',
    restartAll: '처음부터 다시 하기'
  },
  en: {
    back: '← Back to Home',
    title: 'Clicks Per Second (CPS) Test',
    desc: 'Click the screen as fast as you can within the time limit to test your speed.',
    waiting: 'Click anywhere to start the test!',
    clicking: 'CLICK!!! FASTER!!!',
    result: 'Final Result',
    cps: 'CPS',
    clicks: 'Clicks',
    retry: 'Test Again (Click Screen)',
    saving: 'Saving CPS record & XP...',
    saveSuccess: 'New Personal Best! 🏆',
    xpEarned: 'XP Earned! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to level up and register your score on the leaderboard.',
    myBest: 'My Best CPS:',
    settingTime: 'Time Limit Setup:',
    progress: 'Time Left',
    historyTable: 'CLICK METRICS TABLE',
    totalClicks: 'TOTAL CLICKS',
    avgCps: 'AVG CPS',
    restartAll: 'Restart Test'
  }
};

export default function CpsTestPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  
  const [gameState, setGameState] = useState<TestState>('waiting');
  const [clickCount, setClickCount] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(3);
  const [targetTime, setTargetTime] = useState<TargetTimeType>(3);
  
  const [myBestCps, setMyBestCps] = useState<number | string>('---');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [xpNotice, setXpNotice] = useState<string>('');

  const resultStartTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 🛡️ 매크로 패턴 정밀 분석용 레퍼런스
  const lastClickTimeRef = useRef<number>(0);
  const clickIntervalsRef = useRef<number[]>([]);

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
      if (timerRef.current) clearInterval(timerRef.current);
      unsubscribe();
    };
  }, []);

  const saveCpsRecordAndProcessXp = async (finalCps: number) => {
    if (!auth.currentUser) return;
    setSaveStatus(t.saving);

    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const earnedXp = Math.floor(finalCps * 12) + (targetTime * 3);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentBest = data.cpsBest || 0;
        let currentLevel = data.level || 1;
        let currentXp = data.xp || 0;

        currentXp += earnedXp;

        let isLeveledUp = false;
        while (currentXp >= getNextXpForLevel(currentLevel)) {
          currentXp -= getNextXpForLevel(currentLevel);
          currentLevel += 1;
          isLeveledUp = true;
        }

        const updateData: any = {
          xp: currentXp,
          level: currentLevel,
          updatedAt: serverTimestamp()
        };

        let statusText = '';
        if (finalCps > currentBest) {
          updateData.cpsBest = finalCps;
          setMyBestCps(finalCps);
          statusText = t.saveSuccess;
        }

        await updateDoc(userDocRef, updateData);
        setXpNotice(`${t.xpEarned}${earnedXp} XP ${isLeveledUp ? `| ${t.levelUp} (Lv.${currentLevel})` : ''}`);
        setSaveStatus(statusText);

      } else {
        let currentLevel = 1;
        let currentXp = earnedXp;

        while (currentXp >= getNextXpForLevel(currentLevel)) {
          currentXp -= getNextXpForLevel(currentLevel);
          currentLevel += 1;
        }

        await setDoc(userDocRef, {
          uid: uid,
          displayName: auth.currentUser.displayName || 'Anonymous',
          photoURL: auth.currentUser.photoURL || '',
          cpsBest: finalCps,
          level: currentLevel,
          xp: currentXp,
          updatedAt: serverTimestamp()
        });

        setMyBestCps(finalCps);
        setXpNotice(`${t.xpEarned}${earnedXp} XP`);
        setSaveStatus(t.saveSuccess);
      }
    } catch (error) {
      console.error('CPS 및 XP 서버 저장 오류:', error);
    }
  };

  // 🖱️ 매크로 우회 방지를 위해 마우스가 눌리는 React 이벤트 객체 수신
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = performance.now();

    // 🛡️ 1차 방어선: 스크립트 강제 클릭 차단 (이벤트 조작 감지)
    if (e.nativeEvent && e.nativeEvent.isTrusted === false) {
      triggerMacroDetection();
      return;
    }

    if (gameState === 'waiting') {
      setGameState('clicking');
      setClickCount(1);
      setTimeLeft(targetTime);
      setSaveStatus('');
      setXpNotice('');

      lastClickTimeRef.current = now;
      clickIntervalsRef.current = [];

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, targetTime - elapsed);
        
        setTimeLeft(Number(remaining.toFixed(1)));

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setGameState('result');
          resultStartTimeRef.current = Date.now();
        }
      }, 100);

    } else if (gameState === 'clicking') {
      if (timeLeft > 0) {
        
        // 🛡️ 2차 방어선: 클릭 주기 통계학적 정밀 검증
        const interval = now - lastClickTimeRef.current;
        lastClickTimeRef.current = now;

        // 최근 8개의 클릭 시간 간격을 추적
        const updatedIntervals = [...clickIntervalsRef.current, interval].slice(-8);
        clickIntervalsRef.current = updatedIntervals;

        if (updatedIntervals.length >= 6) {
          const stdDev = calculateStdDev(updatedIntervals);
          
          // 브라우저 딜레이 흔들림을 감안하더라도 표준편차가 4.5ms 미만이면 인간이 아님 (기계 확정)
          if (stdDev < 4.5) {
            triggerMacroDetection();
            return;
          }
        }

        setClickCount((prev) => prev + 1);
      }
    } else if (gameState === 'result') {
      if (Date.now() - resultStartTimeRef.current < 500) {
        return;
      }
      resetEntireTest();
    }
  };

  // ❌ 매크로 적발 시 상태 폭파 헬퍼 함수
  const triggerMacroDetection = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setClickCount(0);
    setTimeLeft(targetTime);
    setGameState('waiting');
    setSaveStatus('❌ 정밀 기계식 패턴이 감지되어 무효 처리되었습니다.');
    clickIntervalsRef.current = [];
    lastClickTimeRef.current = 0;
  };

  const resetEntireTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setClickCount(0);
    setTimeLeft(targetTime);
    setSaveStatus('');
    setXpNotice('');
    setGameState('waiting');
    lastClickTimeRef.current = 0;
    clickIntervalsRef.current = [];
  };

  useEffect(() => {
    if (gameState === 'result') {
      const finalCpsCalculated = Number((clickCount / targetTime).toFixed(1));
      saveCpsRecordAndProcessXp(finalCpsCalculated);
    }
  }, [gameState]);

  const currentCps = gameState === 'clicking'
    ? targetTime - timeLeft > 0 ? Number((clickCount / (targetTime - timeLeft)).toFixed(1)) : 0
    : gameState === 'result' ? Number((clickCount / targetTime).toFixed(1)) : 0;

  const bgColors = {
    waiting: 'bg-zinc-950 border-zinc-900',
    clicking: 'bg-zinc-900 border-emerald-500/30',
    result: 'bg-zinc-950 border-zinc-850'
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none">
      
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
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block mb-1">
              LABGG PHYSICAL ENGINE
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.title}</h1>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-900 p-1 rounded-xl">
            <span className="text-[10px] font-mono text-zinc-500 px-2.5 font-bold">{t.settingTime}</span>
            {([3, 5, 7, 10] as TargetTimeType[]).map((time) => (
              <button
                key={time}
                disabled={gameState === 'clicking'}
                onClick={() => { setTargetTime(time); setTimeLeft(time); setClickCount(0); setGameState('waiting'); }}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-black transition-all ${
                  targetTime === time 
                    ? 'bg-white text-black font-black' 
                    : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'
                }`}
              >
                {time}s
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 px-4 py-3 rounded-xl flex items-center justify-between font-mono text-xs gap-4">
          <div className="flex items-center gap-2 min-w-[130px]">
            <span className="text-zinc-500 font-bold">{t.progress}:</span>
            <span className="text-white font-black text-sm tabular-nums">
              {timeLeft.toFixed(1)} <span className="text-zinc-700 font-normal">/</span> {targetTime}s
            </span>
          </div>

          <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-100"
              style={{ width: `${(timeLeft / targetTime) * 100}%` }}
            />
          </div>

          <div className="min-w-[110px] text-right">
            <span className="text-zinc-400 font-bold">Live: <span className="text-emerald-400 font-black text-sm tabular-nums">{currentCps}{t.cps}</span></span>
          </div>
        </div>

        {/* 대형 마우스 타격 감지판 */}
        <div 
          onMouseDown={handleScreenClick}
          className={`h-[420px] rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-75 active:scale-[0.995] select-none ${bgColors[gameState]}`}
        >
          {gameState === 'waiting' && (
            <div className="space-y-2">
              <p className="text-lg font-bold text-zinc-300">{t.waiting}</p>
              {!user && <p className="text-xs text-zinc-600 font-medium">{t.loginAlert}</p>}
            </div>
          )}

          {gameState === 'clicking' && (
            <div className="space-y-2">
              <p className="text-5xl sm:text-7xl font-black text-white tracking-tighter tabular-nums">{clickCount}</p>
              <p className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">{t.clicking}</p>
            </div>
          )}

          {gameState === 'result' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">{t.result}</p>
                <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums">
                  {currentCps}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.cps}</span>
                </p>
              </div>
              
              <div className="flex flex-col items-center gap-2">
                {saveStatus && (
                  <p className="text-xs font-sans font-bold text-amber-400 bg-black/40 px-4 py-1.5 rounded-full border border-amber-500/10 inline-block">
                    {saveStatus}
                  </p>
                )}
                {xpNotice && (
                  <p className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 inline-block">
                    {xpNotice}
                  </p>
                )}
              </div>
              
              <p className="text-xs text-zinc-400 font-bold pt-1 animate-pulse">{t.retry}</p>
            </div>
          )}
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
          <div className="text-[10px] font-mono font-black text-zinc-500 tracking-wider mb-4 pb-2 border-b border-zinc-900 uppercase">
            {t.historyTable}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center px-5 py-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl font-mono">
              <span className="font-bold text-zinc-500 text-xs tracking-wider">{t.totalClicks}</span>
              <span className="text-xl font-black text-zinc-200 tabular-nums">
                {clickCount} <span className="text-xs text-zinc-600 font-bold">{t.clicks}</span>
              </span>
            </div>

            <div className="flex justify-between items-center px-5 py-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl font-mono">
              <span className="font-bold text-zinc-500 text-xs tracking-wider">{t.avgCps}</span>
              <span className="text-xl font-black text-emerald-400 tabular-nums">
                {currentCps} <span className="text-xs text-zinc-600 font-bold">{t.cps}</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="w-full max-w-5xl mx-auto text-center font-mono text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
        LABGG METRICS ENGINE v3.0
      </div>

    </div>
  );
}