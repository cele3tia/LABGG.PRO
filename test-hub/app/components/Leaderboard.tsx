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
    reactionTab: '시각 반응 속도',
    cpsTab: 'CPS 측정',
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

  // 💡 선택한 탭 테마 컬러 동적 매핑
  const isReaction = gameTab === 'reaction';
  const theme = {
    text: isReaction ? 'text-emerald-400' : 'text-cyan-400',
    bg: isReaction ? 'bg-emerald-500' : 'bg-cyan-500',
    border: isReaction ? 'border-emerald-500/20' : 'border-cyan-500/20',
    tabBorder: isReaction ? 'border-emerald-400' : 'border-cyan-400',
    hoverBg: isReaction ? 'hover:bg-emerald-950/10' : 'hover:bg-cyan-950/10'
  };

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
    }, 3000);
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
    <div className="flex flex-col h-full justify-between">
      
      {/* 1. 상단 컨트롤 바 헤더 헤드 */}
      <div className="flex justify-between items-end border-b border-zinc-900 pb-5 mb-5">
        <div className="space-y-2">
          <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase block">
            // {t.label}
          </span>
          <div className="flex items-center gap-4 font-sans text-sm font-black">
            <button 
              onClick={() => setGameTab('reaction')} 
              className={`pb-1 transition-all border-b-2 tracking-tight ${isReaction ? `text-white ${theme.tabBorder}` : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
            >
              {t.reactionTab}
            </button>
            <button 
              onClick={() => setGameTab('cps')} 
              className={`pb-1 transition-all border-b-2 tracking-tight ${!isReaction ? `text-white ${theme.tabBorder}` : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
            >
              {t.cpsTab}
            </button>
          </div>
        </div>

        {/* 하이테크 피봇 세션 기간 컨트롤 패널 */}
        <div className="flex bg-zinc-950 border border-zinc-900 p-0.5 rounded-lg font-mono text-[9px]">
          {(['daily', 'weekly', 'all'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodClick(p)}
              className={`px-3 py-1.5 rounded-md font-black transition-all ${
                periodTab === p ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {t[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 2. 스크롤 데이터 리스트 메인 바 (홈 화면 우측 공간을 꽉 채우도록 max-h 가변 최적화) */}
      <div className="flex-1 overflow-y-auto max-h-[560px] lg:max-h-[590px] pr-1.5 custom-scrollbar space-y-2">
        {loading ? (
          <div className="h-40 flex items-center justify-center font-mono text-[11px] text-zinc-600 tracking-widest uppercase animate-pulse">
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
            
            // 명예의 전당 TOP 3 조건별 커스텀 모듈 스킨 분기
            let topSkin = {
              text: 'text-zinc-500',
              bg: 'bg-transparent border-transparent hover:bg-zinc-900/30',
              scoreGlow: ''
            };

            if (rank === 1) {
              topSkin = {
                text: 'text-amber-400 font-black',
                bg: 'bg-amber-500/5 border-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.02)]',
                scoreGlow: 'text-amber-400 font-black'
              };
            } else if (rank === 2) {
              topSkin = {
                text: 'text-zinc-300 font-black',
                bg: 'bg-zinc-800/10 border-zinc-800/60',
                scoreGlow: 'text-zinc-300 font-bold'
              };
            } else if (rank === 3) {
              topSkin = {
                text: 'text-amber-600 font-black',
                bg: 'bg-amber-700/5 border-amber-700/10',
                scoreGlow: 'text-amber-600 font-bold'
              };
            }

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${topSkin.bg} ${rank > 3 ? theme.border + ' ' + theme.hoverBg : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* 등수 플래그 */}
                  <span className={`font-mono text-xs text-center w-6 tracking-wide ${rank <= 3 ? topSkin.text : 'text-zinc-600'}`}>
                    {rankStr}
                  </span>
                  
                  {/* 프로필 이미지 노드 */}
                  <div className="flex items-center gap-3">
                    {item.photoURL ? (
                      <img 
                        src={item.photoURL} 
                        alt={item.displayName} 
                        className="w-5 h-5 rounded-md border border-zinc-900 object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-[9px] font-black flex items-center justify-center text-zinc-500 uppercase">
                        {item.displayName[0]}
                      </div>
                    )}
                    <span className={`text-xs tracking-tight ${rank <= 3 ? 'font-bold text-zinc-200' : 'font-medium text-zinc-400'}`}>
                      {item.displayName}
                    </span>
                  </div>
                </div>

                {/* 최종 점수 피드백 보드 */}
                <div className="text-right font-mono">
                  <span className={`text-xs tabular-nums ${rank <= 3 ? topSkin.scoreGlow : theme.text + ' font-bold'}`}>
                    {item.score}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-bold ml-1 uppercase">{currentUnit}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 모던 스크롤바 인젝션 */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
      `}</style>
    </div>
  );
}