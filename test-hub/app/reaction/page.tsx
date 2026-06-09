'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

type TestState = 'waiting' | 'ready' | 'click' | 'result' | 'foul' | 'all-done';
type TotalCountType = 3 | 5 | 7 | 10;

// 💡 홈/프로필 스펙과 완벽하게 일치하는 경험치 계수 공식
const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    title: '시각 반응 속도 테스트',
    desc: '붉은 화면이 초록색으로 변하는 순간 가장 빠르게 클릭하세요.',
    waiting: '시작하려면 화면을 클릭하세요.',
    ready: 'ready...',
    click: 'CLICK!!!',
    foul: '부정출발! 초록색이 된 후에 눌러야 합니다. (화면을 눌러 이번 회차 재시도)',
    result: '이번 회차 기록',
    ms: 'ms',
    retry: '다음 회차 진행 (화면 클릭)',
    saving: '평균 기록 및 경험치 정산 중...',
    saveSuccess: '최고 평균 기록 경신! 🏆',
    xpEarned: '경험치 획득! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 로그인 후 완료하시면 레벨업 및 글로벌 리더보드에 등록됩니다.',
    myBest: '내 최고 평균 기록:',
    settingCount: '테스트 총 횟수:',
    progress: 'Progress',
    historyTable: 'HISTORY TABLE',
    round: 'ROUND',
    record: 'SCORE',
    finalAvg: '최종 평균 속도',
    restartAll: '처음부터 다시 하기'
  },
  en: {
    back: '← Back to Home',
    title: 'Visual Reaction Test',
    desc: 'Click as fast as you can the moment the screen turns green.',
    waiting: 'Click anywhere to start.',
    ready: 'Ready...',
    click: 'CLICK NOW!!!',
    foul: 'Too fast! You clicked before green. (Click to retry this round)',
    result: 'Round Score',
    ms: 'ms',
    retry: 'Next Round (Click Screen)',
    saving: 'Saving average score & XP...',
    saveSuccess: 'New Personal Best! 🏆',
    xpEarned: 'XP Earned! +',
    levelUp: 'LEVEL UP! 🎉',
    loginAlert: '💡 Sign in to level up and register your score on the leaderboard.',
    myBest: 'My Best Avg:',
    settingCount: 'Total Rounds:',
    progress: 'Progress',
    historyTable: 'HISTORY TABLE',
    round: 'ROUND',
    record: 'SCORE',
    finalAvg: 'Final Avg Speed',
    restartAll: 'Restart Test'
  }
};

export default function ReactionTestPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  
  const [gameState, setGameState] = useState<TestState>('waiting');
  const [resultTime, setResultTime] = useState<number | null>(null);
  const [myBestScore, setMyBestScore] = useState<number | string>('---');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [xpNotice, setXpNotice] = useState<string>('');

  const [totalRounds, setTotalRounds] = useState<TotalCountType>(3);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [scoreHistory, setScoreHistory] = useState<number[]>([]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists() && docSnap.data().reactionBest) {
          setMyBestScore(docSnap.data().reactionBest);
        }
      }
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, []);

  // 💡 시각 반응 속도 전용 정산 및 연쇄 레벨업 처리 엔진
  const saveFinalAverageAndProcessXp = async (avgScore: number) => {
    if (!auth.currentUser) return;
    setSaveStatus(t.saving);

    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    // 반속 전용 경험치 공식: (35000 / 평균ms) + (총 라운드 * 10) | 최소 10 XP 보장
    const earnedXp = Math.max(10, Math.floor(35000 / avgScore)) + (totalRounds * 10);

    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const currentBest = data.reactionBest || 999999; // 기존 기록 없으면 무한대 설정

        let currentLevel = data.level || 1;
        let currentXp = data.xp || 0;

        // 경험치 획득 및 누적 연쇄 레벨업 검증 알고리즘
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
        // 반응속도는 낮을수록 신기록 🏆
        if (avgScore < currentBest) {
          updateData.reactionBest = avgScore;
          setMyBestScore(avgScore);
          statusText = t.saveSuccess;
        }

        await updateDoc(userDocRef, updateData);
        
        setXpNotice(`${t.xpEarned}${earnedXp} XP ${isLeveledUp ? `| ${t.levelUp} (Lv.${currentLevel})` : ''}`);
        setSaveStatus(statusText);

      } else {
        // 도큐먼트가 존재하지 않는 신규 유저 초기 스케일링
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
          reactionBest: avgScore,
          level: currentLevel,
          xp: currentXp,
          updatedAt: serverTimestamp()
        });

        setMyBestScore(avgScore);
        setXpNotice(`${t.xpEarned}${earnedXp} XP`);
        setSaveStatus(t.saveSuccess);
      }
    } catch (error) {
      console.error('반응속도 및 XP 저장 실패:', error);
    }
  };

  const handleScreenClick = () => {
    if (gameState === 'waiting' || gameState === 'result' || gameState === 'foul') {
      if (gameState === 'result' && scoreHistory.length >= totalRounds) {
        setGameState('all-done');
        const sum = scoreHistory.reduce((a, b) => a + b, 0);
        const finalAvg = Math.round(sum / totalRounds);
        saveFinalAverageAndProcessXp(finalAvg);
        return;
      }

      setGameState('ready');
      setSaveStatus('');
      setXpNotice('');
      
      const randomDelay = Math.floor(Math.random() * 2000) + 2000;
      
      timeoutRef.current = setTimeout(() => {
        setGameState('click');
        startTimeRef.current = performance.now();
      }, randomDelay);

    } else if (gameState === 'ready') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setGameState('foul');

    } else if (gameState === 'click') {
      const endTime = performance.now();
      const reactionMs = Math.round(endTime - startTimeRef.current);
      
      setResultTime(reactionMs);
      const newHistory = [...scoreHistory, reactionMs];
      setScoreHistory(newHistory);
      
      setGameState('result');
      
      if (newHistory.length < totalRounds) {
        setCurrentRound(newHistory.length + 1);
      }
    }
  };

  const resetEntireTest = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setScoreHistory([]);
    setCurrentRound(1);
    setResultTime(null);
    setSaveStatus('');
    setXpNotice('');
    setGameState('waiting');
  };

  const bgColors = {
    waiting: 'bg-zinc-950 border-zinc-900',
    ready: 'bg-red-600 border-red-500',
    click: 'bg-emerald-500 border-emerald-400',
    foul: 'bg-amber-600 border-amber-500',
    result: 'bg-zinc-900 border-zinc-800',
    'all-done': 'bg-zinc-950 border-zinc-800'
  };

  const currentAvg = scoreHistory.length > 0 
    ? Math.round(scoreHistory.reduce((a, b) => a + b, 0) / scoreHistory.length)
    : 0;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none">
      
      <div className="flex justify-between items-center w-full max-w-5xl mx-auto">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <div className="font-mono text-xs text-zinc-500 flex items-center gap-2">
          <span>{t.myBest}</span>
          <span className="text-emerald-400 font-black tracking-wide text-sm">
            {myBestScore}{typeof myBestScore === 'number' ? t.ms : ''}
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
            <span className="text-[10px] font-mono text-zinc-500 px-2.5 font-bold">{t.settingCount}</span>
            {([3, 5, 7, 10] as TotalCountType[]).map((count) => (
              <button
                key={count}
                disabled={scoreHistory.length > 0 && gameState !== 'all-done'}
                onClick={() => { setTotalRounds(count); resetEntireTest(); }}
                className={`w-8 h-8 rounded-lg font-mono text-xs font-black transition-all ${
                  totalRounds === count 
                    ? 'bg-white text-black font-black' 
                    : 'text-zinc-500 hover:text-zinc-300 disabled:opacity-30'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 px-4 py-3 rounded-xl flex items-center justify-between font-mono text-xs gap-4">
          <div className="flex items-center gap-2 min-w-[110px]">
            <span className="text-zinc-500 font-bold">{t.progress}:</span>
            <span className="text-white font-black text-sm">
              {scoreHistory.length} <span className="text-zinc-700 font-normal">/</span> {totalRounds}
            </span>
          </div>

          <div className="flex-1 bg-zinc-900 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${(scoreHistory.length / totalRounds) * 100}%` }}
            />
          </div>

          <div className="min-w-[90px] text-right">
            <span className="text-zinc-400 font-bold">Avg: <span className="text-emerald-400 font-black text-sm">{currentAvg}ms</span></span>
          </div>
        </div>

        <div 
          onClick={handleScreenClick}
          className={`h-[420px] rounded-2xl border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-150 active:scale-[0.995] select-none ${bgColors[gameState]}`}
        >
          {gameState === 'waiting' && (
            <div className="space-y-2">
              <p className="text-lg font-bold text-zinc-300">{t.waiting}</p>
              {!user && <p className="text-xs text-zinc-600 font-medium">{t.loginAlert}</p>}
            </div>
          )}

          {gameState === 'ready' && (
            <p className="text-4xl font-mono font-black text-white uppercase tracking-widest">{t.ready}</p>
          )}

          {gameState === 'click' && (
            <p className="text-5xl font-black text-black scale-105 tracking-tighter">{t.click}</p>
          )}

          {gameState === 'foul' && (
            <p className="text-sm font-bold text-white max-w-sm leading-relaxed">{t.foul}</p>
          )}

          {gameState === 'result' && (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-mono font-bold text-zinc-500 uppercase tracking-wider">{t.result} ({scoreHistory.length}/{totalRounds})</p>
                <p className="text-6xl font-black text-emerald-400 tracking-tighter mt-1 tabular-nums">
                  {resultTime}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.ms}</span>
                </p>
              </div>
              <p className="text-xs text-zinc-400 font-bold pt-1 animate-pulse">{t.retry}</p>
            </div>
          )}

          {gameState === 'all-done' && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">{t.finalAvg}</p>
                <p className="text-7xl font-black text-white tracking-tighter mt-1 tabular-nums">
                  {currentAvg}<span className="text-2xl font-bold ml-1 text-zinc-600">{t.ms}</span>
                </p>
              </div>

              {/* 스코어보드 및 경험치 누적 알림창 스택 레이아웃 */}
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

              <button 
                onClick={(e) => { e.stopPropagation(); resetEntireTest(); }}
                className="mt-1 px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-200 hover:bg-white hover:text-black transition-all"
              >
                {t.restartAll}
              </button>
            </div>
          )}
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-5">
          <div className="text-[10px] font-mono font-black text-zinc-500 tracking-wider mb-4 pb-2 border-b border-zinc-900 uppercase">
            {t.historyTable}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: totalRounds }).map((_, idx) => {
              const roundNum = idx + 1;
              const hasScore = scoreHistory[roundNum - 1] !== undefined;
              
              return (
                <div 
                  key={roundNum}
                  className={`flex justify-between items-center px-4 py-3 rounded-xl border font-mono text-xs transition-colors ${
                    currentRound === roundNum && gameState === 'ready'
                      ? 'bg-zinc-900 border-zinc-700'
                      : 'bg-zinc-950/40 border-zinc-900/60'
                  }`}
                >
                  <span className="font-bold text-zinc-600 text-[10px]">#{String(roundNum).padStart(2, '0')}</span>
                  <span className={`font-black tracking-tight text-sm ${hasScore ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {hasScore ? `${scoreHistory[roundNum - 1]}ms` : '---'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <div className="w-full max-w-5xl mx-auto text-center font-mono text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
        LABGG METRICS ENGINE v3.0
      </div>

    </div>
  );
}