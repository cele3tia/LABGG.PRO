'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface RankItem {
  id: string;
  displayName: string;
  photoURL?: string;
  score: number;
  timestamp: any;
}

type GameType = 'reaction' | 'cps';
type PeriodType = 'daily' | 'weekly' | 'all';

const TRANSLATIONS = {
  ko: {
    label: 'GLOBAL LEADERBOARD',
    reactionTab: 'Reaction',
    cpsTab: 'CPS Bench',
    daily: '24H',
    weekly: '1 WEEK',
    all: 'ALL-TIME',
    loading: '엔진 데이터 로드 중...',
    noData: '해당 시즌에 등록된 랭킹 기록이 없습니다.',
    ms: 'ms',
    cps: 'CPS'
  },
  en: {
    label: 'GLOBAL LEADERBOARD',
    reactionTab: 'Reaction',
    cpsTab: 'CPS Bench',
    daily: '24H',
    weekly: '1 WEEK',
    all: 'ALL-TIME',
    loading: 'LOADING DATA CORE...',
    noData: 'No rankings registered for this season.',
    ms: 'ms',
    cps: 'CPS'
  }
};

export default function Leaderboard({ lang }: { lang: 'ko' | 'en' }) {
  const [gameTab, setGameTab] = useState<GameType>('reaction');
  const [periodTab, setPeriodTab] = useState<PeriodType>('daily');
  
  const [leaderboardData, setLeaderboardData] = useState<Record<PeriodType, RankItem[]>>({
    daily: [],
    weekly: [],
    all: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const t = TRANSLATIONS[lang];

  const isReaction = gameTab === 'reaction';

  useEffect(() => {
    setLoading(true);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const usersRef = collection(db, 'users');
    const targetField = isReaction ? 'reactionBest' : 'cpsBest';
    const sortOrder = isReaction ? 'asc' : 'desc';

    const qAll = query(usersRef, orderBy(targetField, sortOrder), limit(100));

    const unsubscribe = onSnapshot(qAll, (snapshot) => {
      const allRanks: RankItem[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const score = data[targetField];
        
        if (score && score > 0) {
          allRanks.push({
            id: doc.id,
            displayName: data.displayName || 'Anonymous',
            photoURL: data.photoURL,
            score: score,
            timestamp: data.updatedAt?.toDate() || new Date()
          });
        }
      });

      const dailyRanks = allRanks.filter(item => item.timestamp >= oneDayAgo);
      const weeklyRanks = allRanks.filter(item => item.timestamp >= oneWeekAgo);

      setLeaderboardData({
        daily: dailyRanks,
        weekly: weeklyRanks,
        all: allRanks
      });
      setLoading(false);
    }, (error) => {
      console.error("리더보드 로드 실패:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameTab]);

  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      setPeriodTab((current) => {
        if (current === 'daily') return 'weekly';
        if (current === 'weekly') return 'all';
        return 'daily';
      });
    }, 4000); 
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  const handlePeriodClick = (period: PeriodType) => {
    setPeriodTab(period);
    startAutoPlay(); 
  };

  const currentList = leaderboardData[periodTab];
  const currentUnit = isReaction ? t.ms : t.cps;

  return (
    <div 
      className="flex flex-col h-full justify-between select-none"
      onMouseEnter={stopAutoPlay} 
      onMouseLeave={startAutoPlay}
    >
      
      <div className="flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-5 mb-5">
        <span className="font-mono text-[9px] font-black text-zinc-400 dark:text-zinc-500 tracking-[0.2em] uppercase block">
          // {t.label}
        </span>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-5 font-sans text-[15px] font-bold">
            <button 
              onClick={() => setGameTab('reaction')} 
              className={`pb-1 transition-all border-b-2 tracking-tight ${isReaction ? 'text-black dark:text-white border-black dark:border-white' : 'text-zinc-400 dark:text-zinc-600 border-transparent hover:text-zinc-600 dark:hover:text-zinc-400'}`}
            >
              {t.reactionTab}
            </button>
            <button 
              onClick={() => setGameTab('cps')} 
              className={`pb-1 transition-all border-b-2 tracking-tight ${!isReaction ? 'text-black dark:text-white border-black dark:border-white' : 'text-zinc-400 dark:text-zinc-600 border-transparent hover:text-zinc-600 dark:hover:text-zinc-400'}`}
            >
              {t.cpsTab}
            </button>
          </div>

          <div className="flex bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-900 p-1 rounded-full font-mono text-[9px]">
            {(['daily', 'weekly', 'all'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodClick(p)}
                className={`px-3 py-1.5 rounded-full font-black tracking-wider transition-all ${
                  periodTab === p ? 'bg-white dark:bg-zinc-800 text-black dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400'
                }`}
              >
                {t[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[560px] lg:max-h-[590px] pr-2 custom-scrollbar space-y-2.5 overflow-x-hidden">
        {loading ? (
          <div className="h-40 flex items-center justify-center font-mono text-[10px] text-zinc-400 dark:text-zinc-600 tracking-widest uppercase animate-pulse">
            {t.loading}
          </div>
        ) : currentList.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-xs text-zinc-500 font-medium py-10">
            {t.noData}
          </div>
        ) : (
          currentList.map((item, index) => {
            const rank = index + 1;
            const rankStr = String(rank).padStart(2, '0');
            
            let topSkin = {
              text: 'text-zinc-500',
              bg: 'bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900/30',
              scoreGlow: 'text-zinc-800 dark:text-zinc-300'
            };

            if (rank === 1) {
              topSkin = {
                text: 'text-orange-500 font-black',
                bg: 'bg-orange-50/50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.05)]',
                scoreGlow: 'text-orange-500 font-black drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
              };
            } else if (rank === 2) {
              topSkin = {
                text: 'text-zinc-500 dark:text-zinc-300 font-black',
                bg: 'bg-zinc-50 dark:bg-zinc-800/20 border-zinc-200 dark:border-zinc-700/50',
                scoreGlow: 'text-zinc-700 dark:text-zinc-300 font-bold'
              };
            } else if (rank === 3) {
              topSkin = {
                text: 'text-amber-600 font-black',
                bg: 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20',
                scoreGlow: 'text-amber-600 dark:text-amber-500 font-bold'
              };
            }

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${topSkin.bg} ${rank > 3 ? 'border-zinc-100 dark:border-zinc-800/40' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-[11px] text-center w-6 tracking-wider ${rank <= 3 ? topSkin.text : 'text-zinc-400 dark:text-zinc-600 font-bold'}`}>
                    {rankStr}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    {item.photoURL ? (
                      <img 
                        src={item.photoURL} 
                        alt={item.displayName} 
                        className={`w-5 h-5 rounded-md border object-cover ${rank === 1 ? 'border-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'border-zinc-200 dark:border-zinc-800'}`}
                      />
                    ) : (
                      <div className={`w-5 h-5 rounded-md font-mono text-[9px] font-black flex items-center justify-center uppercase ${rank === 1 ? 'bg-orange-500/20 border-orange-500/50 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}>
                        {item.displayName[0]}
                      </div>
                    )}

                    {/* 💡 1등 전용: 글씨 자체가 도트 네온으로 빛나는 LED 전광판 애니메이션 */}
                    {rank === 1 ? (
                      <div className="w-[100px] sm:w-[130px] overflow-hidden marquee-mask flex items-center pt-0.5">
                        <span className="animate-marquee font-mono text-[14px] font-black tracking-[0.2em] uppercase dot-matrix-led px-2">
                          {item.displayName}
                        </span>
                      </div>
                    ) : (
                      <span className={`text-[13px] tracking-tight ${rank <= 3 ? 'font-bold text-black dark:text-zinc-100' : 'font-semibold text-zinc-700 dark:text-zinc-400'}`}>
                        {item.displayName}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono flex items-baseline gap-1">
                  <span className={`text-sm tabular-nums ${rank <= 3 ? topSkin.scoreGlow : 'text-zinc-800 dark:text-zinc-400 font-bold'}`}>
                    {item.score}
                  </span>
                  <span className={`text-[9px] font-bold uppercase pb-[1px] ${rank === 1 ? 'text-orange-500/70' : 'text-zinc-400 dark:text-zinc-600'}`}>{currentUnit}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx global>{`
        /* 💡 글씨를 LED 도트 배열로 뚫어버리는 마법의 CSS */
        .dot-matrix-led {
          background-image: radial-gradient(circle, #ea580c 1px, transparent 1px);
          background-size: 2.5px 2.5px;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          /* 과하지 않게 적당히 쨍한 네온 글로우 */
          filter: drop-shadow(0 0 2px rgba(234, 88, 12, 0.8)) drop-shadow(0 0 6px rgba(234, 88, 12, 0.4));
        }
        .dark .dot-matrix-led {
          background-image: radial-gradient(circle, #f97316 1px, transparent 1px);
          filter: drop-shadow(0 0 2px rgba(249, 115, 22, 0.8)) drop-shadow(0 0 6px rgba(249, 115, 22, 0.4));
        }

        /* 전광판 (Marquee) 애니메이션 CSS */
        @keyframes marquee {
          0% { transform: translateX(130px); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 5s linear infinite;
        }
        
        /* 양끝을 흐리게 지워주는 그라데이션 마스크 */
        .marquee-mask {
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
          mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
        }

        /* 커스텀 스크롤바 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}