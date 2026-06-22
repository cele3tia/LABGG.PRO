'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface RankItem {
  id: string;
  displayName: string;
  photoURL?: string;
  score: number;
  timestamp: Date;
  titleId?: string;
}

type CategoryType = 'reaction' | 'cps' | 'time';

interface TranslationLang {
  label: string;
  reactTab: string;
  cpsTab: string;
  timeTab: string;
  loading: string;
  noData: string;
  unitTime: string;
  unitCps: string;
  unitReact: string;
}

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비', noTitle: '' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie', noTitle: '' }
};

const TRANSLATIONS: Record<'ko' | 'en', TranslationLang> = {
  ko: {
    label: 'HALL OF FAME',
    reactTab: 'REACT',
    cpsTab: 'CPS',
    timeTab: 'TIME',
    loading: '엔진 데이터 로드 중...',
    noData: '아직 등록된 랭킹 기록이 없습니다.',
    unitTime: 's',
    unitCps: ' CPS',
    unitReact: 'ms'
  },
  en: {
    label: 'HALL OF FAME',
    reactTab: 'REACT',
    cpsTab: 'CPS',
    timeTab: 'TIME',
    loading: 'LOADING DATA CORE...',
    noData: 'No rankings registered yet.',
    unitTime: 's',
    unitCps: ' CPS',
    unitReact: 'ms'
  }
};

export default function Leaderboard({ lang }: { lang: 'ko' | 'en' }) {
  const [category, setCategory] = useState<CategoryType>('reaction');
  const [leaderboardData, setLeaderboardData] = useState<RankItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const t = TRANSLATIONS[lang];

  const handleCategoryChange = (cat: CategoryType) => {
    if (category === cat) return;
    setCategory(cat);
    setLoading(true);
  };

  useEffect(() => {
    const usersRef = collection(db, 'users');
    
    let targetField = '';
    let sortOrder: 'asc' | 'desc' = 'asc';

    if (category === 'reaction') {
      targetField = 'reactionBest';
      sortOrder = 'asc'; 
    } else if (category === 'cps') {
      targetField = 'cpsBest';
      sortOrder = 'desc'; 
    } else if (category === 'time') {
      targetField = 'precisionBest';
      sortOrder = 'asc'; 
    }

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
      
      setLeaderboardData(allRanks);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [category]); 

  const formatScore = (score: number) => {
    if (category === 'reaction') return `${score}${t.unitReact}`;
    if (category === 'cps') return `${score.toFixed(2)}${t.unitCps}`;
    if (category === 'time') return `±${score.toFixed(3)}${t.unitTime}`;
    return score;
  };

  const getTabStyle = (tab: CategoryType) => {
    if (category !== tab) return 'text-zinc-600 hover:text-zinc-400 bg-transparent border-transparent';
    
    if (tab === 'reaction') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
    if (tab === 'cps') return 'bg-sky-500/10 border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.1)]';
    return 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
  };

  return (
    <div className="flex flex-col w-full select-none">
      
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 px-1 shrink-0">
        <span className="font-mono text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">
          {`// `}{t.label} 
        </span>
        <div className="font-mono text-[9px] font-bold text-zinc-500 tracking-widest border border-zinc-800 bg-zinc-900/30 px-2.5 py-1 rounded-md">
          ALL-TIME RANKING
        </div>
      </div>
        
      {/* 탭 영역 */}
      <div className="flex bg-black/40 p-1.5 rounded-2xl w-full border border-white/[0.03] mb-5 shadow-inner shrink-0">
        <button 
          onClick={() => handleCategoryChange('reaction')} 
          className={`flex-1 py-2 text-[11px] font-mono font-black tracking-wider uppercase rounded-xl transition-all duration-300 border ${getTabStyle('reaction')}`}
        >
          {t.reactTab}
        </button>
        <button 
          onClick={() => handleCategoryChange('cps')} 
          className={`flex-1 py-2 text-[11px] font-mono font-black tracking-wider uppercase rounded-xl transition-all duration-300 border ${getTabStyle('cps')}`}
        >
          {t.cpsTab}
        </button>
        <button 
          onClick={() => handleCategoryChange('time')} 
          className={`flex-1 py-2 text-[11px] font-mono font-black tracking-wider uppercase rounded-xl transition-all duration-300 border ${getTabStyle('time')}`}
        >
          {t.timeTab}
        </button>
      </div>

      {/* 리스트 및 상태 화면 영역 */}
      {loading ? (
        <div className="h-[494px] flex items-center justify-center font-mono text-[10px] tracking-widest uppercase animate-pulse text-zinc-600">
          {t.loading}
        </div>
      ) : leaderboardData.length === 0 ? (
        <div className="h-[494px] flex items-center justify-center text-xs text-zinc-600 font-medium font-mono uppercase tracking-widest">
          {t.noData}
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[494px] pr-1 custom-scrollbar flex flex-col gap-2.5">
          {leaderboardData.map((item, index) => {
            const rank = index + 1;
            const rankStr = String(rank).padStart(2, '0');
            const displayTitle = item.titleId && TITLE_MAP[lang][item.titleId] ? TITLE_MAP[lang][item.titleId] : null;
            
            let topSkin = {
              text: 'text-zinc-600 font-bold',
              bg: 'bg-zinc-900/30 border border-zinc-800/40 hover:bg-zinc-900/60 hover:border-zinc-700/50',
              scoreGlow: 'text-zinc-400 font-bold',
              titleColor: 'text-zinc-600 border-zinc-800/50 bg-zinc-900/30',
              imgBorder: 'border-zinc-800'
            };

            if (rank === 1) {
              topSkin = {
                text: 'text-[#f59e0b] font-black',
                bg: 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.03)]',
                scoreGlow: 'text-[#f59e0b] font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
                titleColor: 'text-[#f59e0b]/90 border-[#f59e0b]/30 bg-[#f59e0b]/10',
                imgBorder: 'border-[#f59e0b]/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
              };
            } else if (rank === 2) {
              topSkin = {
                text: 'text-zinc-400 font-black',
                bg: 'bg-gradient-to-r from-zinc-500/5 to-transparent border border-zinc-700/20',
                scoreGlow: 'text-zinc-200 font-black drop-shadow-[0_0_5px_rgba(228,228,231,0.2)]',
                titleColor: 'text-zinc-300 border-zinc-600/50 bg-zinc-700/20',
                imgBorder: 'border-zinc-600/40'
              };
            } else if (rank === 3) {
              topSkin = {
                text: 'text-orange-500 font-black',
                bg: 'bg-gradient-to-r from-orange-500/5 to-transparent border border-orange-500/15',
                scoreGlow: 'text-orange-500 font-black drop-shadow-[0_0_5px_rgba(249,115,22,0.2)]',
                titleColor: 'text-orange-500/80 border-orange-500/30 bg-orange-500/10',
                imgBorder: 'border-orange-500/40'
              };
            }

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 border shrink-0 ${topSkin.bg}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-[12px] text-center w-6 tracking-wider ${topSkin.text}`}>
                    {rankStr}
                  </span>
                  
                  <div className="flex items-center gap-3">
                    {item.photoURL ? (
                      <Image 
                        src={item.photoURL} 
                        alt={item.displayName} 
                        width={32} 
                        height={32}
                        unoptimized
                        className={`rounded-xl object-cover border w-8 h-8 shrink-0 ${topSkin.imgBorder}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-lg font-mono text-[10px] font-black flex items-center justify-center uppercase shrink-0 ${rank === 1 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-zinc-900/30 border border-zinc-800/20 text-zinc-700'}`}>
                        {item.displayName[0]}
                      </div>
                    )}

                    <div className="flex flex-col justify-center">
                      <span className={`text-[13px] tracking-tight ${rank <= 3 ? 'font-black text-white' : 'font-bold text-zinc-300'}`}>
                        {item.displayName}
                      </span>
                      
                      {displayTitle && (
                        <div className="mt-0.5">
                          <span className={`inline-block px-1.5 py-[2px] text-[8px] font-mono font-black uppercase tracking-widest rounded border ${topSkin.titleColor}`}>
                            {displayTitle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono flex items-baseline gap-1 pr-2">
                  <span className={`text-[14px] tabular-nums tracking-tighter ${topSkin.scoreGlow}`}>
                    {formatScore(item.score)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* 💡 픽스: 흰색 테두리 흔적도 없이 박멸하는 크로스 브라우저 다크 스크롤바 정밀 스타일셋 */}
      <style jsx global>{`
        /* 파이어폭스 전용 다크 스크롤 패치 */
        .custom-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: #27272a transparent !important;
        }

        /* 크롬, 사파리, 최신 엣지용 럭셔리 스크롤 패치 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px !important;
          height: 5px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #1f1f23 !important;
          border-radius: 20px !important;
          border: none !important;
          transition: background-color 0.2s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #3f3f46 !important;
        }
      `}</style>
    </div>
  );
}