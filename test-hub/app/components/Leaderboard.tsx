'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

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
    label: 'GLOBAL RANKING',
    reactionTab: '시각 반응 속도',
    cpsTab: 'CPS 측정',
    daily: '하루',
    weekly: '1주일',
    all: '전체',
    loading: '데이터 로드 중...',
    noData: '해당 기간에 등록된 랭킹이 없습니다.',
    ms: 'ms',
    cps: 'CPS'
  },
  en: {
    label: 'GLOBAL RANKING',
    reactionTab: 'Reaction',
    cpsTab: 'CPS Bench',
    daily: '24H',
    weekly: '1 WEEK',
    all: 'ALL-TIME',
    loading: 'LOADING...',
    noData: 'No rankings for this period.',
    ms: 'ms',
    cps: 'CPS'
  }
};

export default function Leaderboard({ lang }: { lang: 'ko' | 'en' }) {
  const [gameTab, setGameTab] = useState<GameType>('reaction'); // 반응속도 vs CPS 고정 탭
  const [periodTab, setPeriodTab] = useState<PeriodType>('daily'); // 하루 vs 1주일 vs 전체 (3초 로테이션)
  
  const [leaderboardData, setLeaderboardData] = useState<Record<PeriodType, RankItem[]>>({
    daily: [],
    weekly: [],
    all: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const t = TRANSLATIONS[lang];

  // 1. 파이어베이스 데이터 실시간 연동 및 기간 필터링
  useEffect(() => {
    setLoading(true);

    // 기준 시간 계산 (하루 전, 1주일 전)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const usersRef = collection(db, 'users');
    const targetField = gameTab === 'reaction' ? 'reactionBest' : 'cpsBest';
    const sortOrder = gameTab === 'reaction' ? 'asc' : 'desc'; // 반응속도는 낮을수록, CPS는 높을수록 1등

    // 기본 전체 쿼리
    const qAll = query(usersRef, orderBy(targetField, sortOrder), limit(100));

    // 실시간 동기화
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
            timestamp: data.updatedAt?.toDate() || new Date() // 기록 저장 시간 (없으면 현재시간 대치)
          });
        }
      });

      // 자바스크립트 단에서 시간 기준으로 daily, weekly, all 나누기 (인덱스 중복 에러 방지 및 속도 향상)
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
  }, [gameTab]); // 종목이 바뀔 때마다 파이어베이스 쿼리를 새로 짭니다.

  // 2. 3초마다 기간(하루 -> 1주일 -> 전체) 자동 전환 기능
  const startAutoPlay = () => {
    stopAutoPlay();
    autoPlayTimerRef.current = setInterval(() => {
      setPeriodTab((current) => {
        if (current === 'daily') return 'weekly';
        if (current === 'weekly') return 'all';
        return 'daily';
      });
    }, 3000); // 정확히 3초(3000ms) 셋팅
  };

  const stopAutoPlay = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
    }
  };

  useEffect(() => {
    startAutoPlay();
    return () => stopAutoPlay();
  }, []);

  // 유저가 하단 기간 탭을 직접 클릭했을 때 대처
  const handlePeriodClick = (period: PeriodType) => {
    setPeriodTab(period);
    startAutoPlay(); // 타이머 초기화 후 재시작
  };

  const currentList = leaderboardData[periodTab];
  const currentUnit = gameTab === 'reaction' ? t.ms : t.cps;

  return (
    <div className="flex flex-col h-full min-h-[460px]">
      
      {/* 1층: 글로벌 랭킹 라벨 및 대분류 게임 탭 (고정) */}
      <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
        <div>
          <span className="font-mono text-[10px] font-black text-zinc-600 tracking-[0.15em] uppercase block mb-1">
            {t.label}
          </span>
          <div className="flex gap-2 font-sans text-sm font-bold">
            <button 
              onClick={() => setGameTab('reaction')} 
              className={`pb-1 transition-colors ${gameTab === 'reaction' ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {t.reactionTab}
            </button>
            <span className="text-zinc-800">|</span>
            <button 
              onClick={() => setGameTab('cps')} 
              className={`pb-1 transition-colors ${gameTab === 'cps' ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {t.cpsTab}
            </button>
          </div>
        </div>

        {/* 3초마다 알아서 돌아가는 기간 컨트롤러 (수동 클릭도 가능) */}
        <div className="flex bg-zinc-950 border border-zinc-900 p-0.5 rounded-lg font-mono text-[9px]">
          {(['daily', 'weekly', 'all'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodClick(p)}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                periodTab === p ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {t[p]}
            </button>
          ))}
        </div>
      </div>

      {/* 2층: 100등까지 스크롤되는 데이터 리스트 영역 */}
      <div className="flex-1 overflow-y-auto max-h-[360px] pr-2 custom-scrollbar space-y-2">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-[11px] text-zinc-600">
            {t.loading}
          </div>
        ) : currentList.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-light py-10">
            {t.noData}
          </div>
        ) : (
          currentList.map((item, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const rankColor = rank === 1 ? 'text-amber-400' : rank === 2 ? 'text-zinc-300' : rank === 3 ? 'text-amber-600' : 'text-zinc-600';

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  isTop3 
                    ? 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-700' 
                    : 'bg-transparent border-transparent hover:bg-zinc-950/20 hover:border-zinc-900/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-mono text-xs font-black w-5 text-center ${rankColor}`}>
                    {String(rank).padStart(2, '0')}
                  </span>
                  
                  <div className="flex items-center gap-2.5">
                    {item.photoURL ? (
                      <img 
                        src={item.photoURL} 
                        alt={item.displayName} 
                        className="w-5 h-5 rounded border border-zinc-900 object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-zinc-900 font-mono text-[9px] font-bold flex items-center justify-center text-zinc-500">
                        {item.displayName[0].toUpperCase()}
                      </div>
                    )}
                    <span className={`text-xs ${isTop3 ? 'font-bold text-zinc-200' : 'font-medium text-zinc-400'}`}>
                      {item.displayName}
                    </span>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="text-xs font-black text-emerald-400">
                    {item.score}
                  </span>
                  <span className="text-[9px] text-zinc-600 font-bold ml-1">{currentUnit}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #18181b;
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
      `}</style>
    </div>
  );
}