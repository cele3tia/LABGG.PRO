'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image'; // 💡 <img> 태그 에러 방지를 위해 Next.js Image 컴포넌트 임포트
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface RankItem {
  id: string;
  displayName: string;
  photoURL?: string;
  score: number;
  timestamp: Date; // 💡 any 타입을 Date 타입으로 정확하게 변경
  titleId?: string;
}

type GameType = 'reaction' | 'cps';
type PeriodType = 'daily' | 'weekly' | 'all';

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비', noTitle: '' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie', noTitle: '' }
};

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

  // 💡 탭 전환 시 setLoading(true)을 동기적으로 부르기 위한 전용 핸들러 함수 배치
  const handleGameTabChange = (tab: GameType) => {
    setGameTab(tab);
    setLoading(true);
  };

  useEffect(() => {
    // setLoading(true); // 💡 [에러 수정] Cascading Render 유발하는 동기 호출 제거
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
            timestamp: data.updatedAt?.toDate() || new Date(),
            titleId: data.currentTitle || '' 
          });
        }
      });
      const dailyRanks = allRanks.filter(item => item.timestamp >= oneDayAgo);
      const weeklyRanks = allRanks.filter(item => item.timestamp >= oneWeekAgo);
      setLeaderboardData({ daily: dailyRanks, weekly: weeklyRanks, all: allRanks });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [gameTab, isReaction]); // 💡 isReaction 의존성 배열에 추가 완료

  // 💡 autoplay 제어 함수들을 useCallback으로 감싸 무한 트리거 현상 방지
  const stopAutoPlay = useCallback(() => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
  }, []);

  const startAutoPlay = useCallback(() => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      setPeriodTab((current) => {
        if (current === 'daily') return 'weekly';
        if (current === 'weekly') return 'all';
        return 'daily';
      });
    }, 4000); 
  }, [stopAutoPlay]);

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, [startAutoPlay, stopAutoPlay]); // 💡 startAutoPlay, stopAutoPlay 의존성 주입 완료

  const handlePeriodClick = (period: PeriodType) => {
    setPeriodTab(period);
    startAutoPlay(); 
  };

  const currentList = leaderboardData[periodTab];
  const currentUnit = isReaction ? t.ms : t.cps;

  return (
    <div className="flex flex-col h-full justify-between select-none" onMouseEnter={stopAutoPlay} onMouseLeave={startAutoPlay}>
      
      <div className="flex flex-col gap-4 border-b border-zinc-900 pb-5 mb-5">
        <span className="font-mono text-[9px] font-black text-zinc-500 tracking-[0.2em] uppercase block">
          {`// `}{t.label} {/* 💡 [에러 수정] textnode 내부 슬래시 코드 이스케이프 통과 완료 */}
        </span>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-5 font-sans text-[15px] font-bold">
            <button onClick={() => handleGameTabChange('reaction')} className={`pb-1 transition-all border-b-2 tracking-tight ${isReaction ? 'text-white border-white' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}>
              {t.reactionTab}
            </button>
            <button onClick={() => handleGameTabChange('cps')} className={`pb-1 transition-all border-b-2 tracking-tight ${!isReaction ? 'text-white border-white' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}>
              {t.cpsTab}
            </button>
          </div>

          <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-full font-mono text-[9px] w-full sm:w-auto justify-between sm:justify-start">
            {(['daily', 'weekly', 'all'] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePeriodClick(p)}
                className={`px-3 py-1.5 rounded-full font-black tracking-wider transition-all ${
                  periodTab === p ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'
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
          <div className="h-40 flex items-center justify-center font-mono text-[10px] tracking-widest uppercase animate-pulse text-zinc-600">
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
            const displayTitle = item.titleId && TITLE_MAP[lang][item.titleId] ? TITLE_MAP[lang][item.titleId] : null;
            
            let topSkin = {
              text: 'text-zinc-500',
              bg: 'bg-transparent border-transparent hover:bg-zinc-900/30',
              scoreGlow: 'text-zinc-300',
              titleColor: 'text-zinc-600'
            };

            if (rank === 1) {
              topSkin = {
                text: 'text-amber-500 font-black',
                bg: 'bg-amber-500/5 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.03)]',
                scoreGlow: 'text-amber-500 font-black',
                titleColor: 'text-amber-500/80 border-amber-500/30 bg-amber-500/10'
              };
            } else if (rank === 2) {
              topSkin = {
                text: 'text-zinc-400 font-black',
                bg: 'bg-zinc-500/10 border border-zinc-700/50',
                scoreGlow: 'text-zinc-200 font-bold',
                titleColor: 'text-zinc-400 border-zinc-600 bg-zinc-700/30'
              };
            } else if (rank === 3) {
              topSkin = {
                text: 'text-orange-500 font-black',
                bg: 'bg-orange-500/5 border border-orange-500/20',
                scoreGlow: 'text-orange-500 font-bold',
                titleColor: 'text-orange-500/80 border-orange-500/30 bg-orange-500/10'
              };
            }

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 ${topSkin.bg} ${rank > 3 ? 'border-zinc-900 border' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-[11px] text-center w-6 tracking-wider ${rank <= 3 ? topSkin.text : 'text-zinc-600 font-bold'}`}>
                    {rankStr}
                  </span>
                  
                  <div className="flex items-center gap-3.5">
                    {item.photoURL ? (
                      /* 💡 [에러 수정] Next.js Image 컴포넌트 최적화 구조 변경 및 unoptimized 처리 */
                      <Image 
                        src={item.photoURL} 
                        alt={item.displayName} 
                        width={32}
                        height={32}
                        unoptimized
                        className={`rounded-md border object-cover ${rank === 1 ? 'border-amber-400/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'border-zinc-800'}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-md font-mono text-[11px] font-black flex items-center justify-center uppercase ${rank === 1 ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-zinc-900 border border-zinc-800 text-zinc-500'}`}>
                        {item.displayName[0]}
                      </div>
                    )}

                    <div className="flex flex-col justify-center">
                      <span className={`text-[13px] tracking-tight ${rank <= 3 ? 'font-bold text-white' : 'font-semibold text-zinc-300'}`}>
                        {item.displayName}
                      </span>
                      
                      {displayTitle && (
                        <div className="mt-0.5">
                          <span className={`inline-block px-1.5 py-[1px] text-[9px] font-mono font-black uppercase tracking-widest rounded border ${rank <= 3 ? topSkin.titleColor : 'text-zinc-500 border-zinc-800 bg-zinc-900/50'}`}>
                            {displayTitle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono flex items-baseline gap-1 pr-2">
                  <span className={`text-[15px] tabular-nums ${rank <= 3 ? topSkin.scoreGlow : 'text-zinc-400 font-bold'}`}>
                    {item.score}
                  </span>
                  <span className={`text-[9px] font-bold uppercase pb-[1px] ${rank === 1 ? 'text-amber-500/70' : 'text-zinc-600'}`}>{currentUnit}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}