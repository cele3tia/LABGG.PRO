'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RealTimeOnlineCounter from './components/RealTimeOnlineCounter';
import Leaderboard from './components/Leaderboard';
import { auth, db } from './lib/firebase'; // 💡 db 임포트 유지
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; // 💡 Firestore 내장 함수 유지
import { getUserStats } from './lib/recordService';

// 💡 10레벨 단위 뱃지 색상 테일윈드 클래스 반환 함수
const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'; // 40렙 이상: 신화 골드
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30'; // 30~39렙: 에픽 퍼플
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';     // 20~29렙: 레어 레디언트
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'; // 10~19렙: 고급 그린
  return 'text-zinc-400 bg-zinc-900 border-zinc-800'; // 1~9렙: 일반 회색
};

// 💡 칭호 국문/영문 다이내믹 매핑 가독성 텍스트
const TITLE_MAP = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비', noTitle: '칭호 없음' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie', noTitle: 'No Title' }
};

const TRANSLATIONS = {
  ko: {
    title1: '당신의 피지컬을',
    title2: '숫자로 증명하세요.',
    desc: '전 세계 플레이어들과 실시간으로 순위를 경쟁해 보세요.',
    totalHits: '누적 테스트 횟수',
    global: '글로벌',
    proceed: '테스트 시작 →',
    standard: '평균 기준',
    myBest: '나의 최고 기록',
    loginBtn: '로그인',
    profileBtn: '프로필 보기',
    lvl: 'Lv.',
    tests: {
      reaction: {
        name: '시각 반응 속도 테스트',
        label: 'VISUAL REACTION',
        desc: '화면 색상이 바뀌는 순간을 포착하여 클릭하는 속도를 측정합니다.',
        stat: '200ms ~ 250ms',
      },
      cps: {
        name: '초당 클릭 수(CPS) 측정',
        label: 'CLICK PER SECOND',
        desc: '제한 시간 동안 마우스를 얼마나 빠르게 클릭할 수 있는지 측정합니다.',
        stat: '6.0 ~ 7.0 CPS',
      }
    }
  },
  en: {
    title1: 'PROVE YOUR PHYSICAL',
    title2: 'LIMITS WITH NUMBERS.',
    desc: 'Compete for rankings with players worldwide in real-time.',
    totalHits: 'TOTAL LOGGED HITS',
    global: 'GLOBAL',
    proceed: 'PROCEED TEST →',
    standard: 'Average Bench',
    myBest: 'MY BEST SCORE',
    loginBtn: 'SIGN IN',
    profileBtn: 'MY PROFILE',
    lvl: 'Lv.',
    tests: {
      reaction: {
        name: 'Visual Reaction Test',
        label: 'VISUAL REACTION',
        desc: 'Measures how fast you click the moment the screen color changes.',
        stat: '200ms to 250ms',
      },
      cps: {
        name: 'Clicks Per Second (CPS)',
        label: 'CLICK PER SECOND',
        desc: 'Measures your maximum clicking frequency within a time limit.',
        stat: '6.0 to 7.0 CPS',
      }
    }
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [totalVisits, setTotalVisits] = useState<number | string>('...');
  const [systemCoreTime, setSystemCoreTime] = useState<string>('00:00:00');
  const [user, setUser] = useState<User | null>(null);

  // 💡 홈 화면용 유저 디비 정보 상태
  const [level, setLevel] = useState<number>(1);
  const [currentTitleId, setCurrentTitleId] = useState<string>('');
  const [dbDisplayName, setDbDisplayName] = useState<string>('');

  const [fbStats, setFbStats] = useState({
    reactionBest: '---',
    cpsBest: '---'
  });

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const timer = setInterval(() => {
      const now = new Date();
      setSystemCoreTime(now.toTimeString().split(' ')[0]);
    }, 1000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // 1. 기존 베스트 스탯 로드
        const data = await getUserStats(currentUser.uid);
        if (data) {
          setFbStats({
            reactionBest: data.reactionBest ? `${data.reactionBest}ms` : '---',
            cpsBest: data.cpsBest ? `${data.cpsBest} CPS` : '---'
          });
        }

        // 2. 실시간 레벨 및 장착 칭호 Firestore 연동 데이터 적재
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          setLevel(dbData.level || 1);
          setCurrentTitleId(dbData.currentTitle || '');
          setDbDisplayName(dbData.displayName || currentUser.displayName || 'Player');
        } else {
          setDbDisplayName(currentUser.displayName || 'Player');
        }
      } else {
        setFbStats({ reactionBest: '---', cpsBest: '---' });
        setDbDisplayName('');
        setCurrentTitleId('');
        setLevel(1);
      }
    });

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const handleLangChange = (newLang: 'ko' | 'en') => {
    setLang(newLang);
    localStorage.setItem('site-lang', newLang);
  };

  useEffect(() => {
    const syncWithDatabase = async () => {
      try {
        const res = await fetch('/api/visits', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setTotalVisits(data.totalVisits);
        }
      } catch (e) {
        console.error('DB 통신 실패');
      }
    };

    const fetchLatestDatabase = async () => {
      try {
        const res = await fetch('/api/visits');
        if (res.ok) {
          const data = await res.json();
          setTotalVisits(data.totalVisits);
        }
      } catch (e) {}
    };

    syncWithDatabase();
    const interval = setInterval(fetchLatestDatabase, 4000);
    return () => clearInterval(interval);
  }, []);

  const t = TRANSLATIONS[lang];

  const TEST_SUITE = [
    {
      id: 'reaction',
      name: t.tests.reaction.name,
      label: t.tests.reaction.label,
      desc: t.tests.reaction.desc,
      stat: t.tests.reaction.stat,
      myScore: fbStats.reactionBest,
      path: '/reaction',
    },
    {
      id: 'cps',
      name: t.tests.cps.name,
      label: t.tests.cps.label,
      desc: t.tests.cps.desc,
      stat: t.tests.cps.stat,
      myScore: fbStats.cpsBest,
      path: '/cps',
    }
  ];

  return (
    <div className="relative min-h-screen bg-[#000000] text-zinc-100 font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight">
      
      {/* 백그라운드 그리드 레이아웃 */}
      <div className="absolute inset-x-0 bottom-0 top-24 z-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.04),transparent_45%)]" />
        <div 
          className="absolute inset-0 opacity-100" 
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(39,39,42,0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(39,39,42,0.4) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* 상단 네비게이션 바 */}
      <nav className="relative z-20 w-full bg-black/95 border-b border-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6 flex justify-between items-center">
          
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shadow-[0_0_25px_rgba(255,255,255,0.02)] group-hover:border-zinc-400 transition-all duration-300">
              <span className="font-mono text-sm font-black text-white tracking-tighter">L</span>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-[8.5px] font-medium tracking-[0.5em] text-zinc-500 group-hover:text-zinc-400 transition-colors duration-300 uppercase">
                LABORATORY
              </span>
              <span className="text-2xl font-black tracking-[0.08em] text-zinc-400 group-hover:text-white transition-colors duration-300">
                LABGG<span className="text-white font-extrabold">.PRO</span>
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-5 font-mono text-[10px]">
            
            <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 rounded-md">
              <button 
                onClick={() => handleLangChange('ko')}
                className={`px-2 py-1 rounded font-bold transition-all ${lang === 'ko' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                KO
              </button>
              <button 
                onClick={() => handleLangChange('en')}
                className={`px-2 py-1 rounded font-bold transition-all ${lang === 'en' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}
              >
                EN
              </button>
            </div>

            <div className="flex items-center gap-3 border-l border-zinc-800 pl-5">
              {user ? (
                <Link 
                  href="/profile" 
                  className="flex items-center gap-3 bg-zinc-950/90 border border-zinc-900 hover:border-zinc-700 pl-3.5 pr-2.5 py-1.5 rounded-xl text-zinc-300 hover:text-white transition-all font-sans text-xs tracking-tight shadow-md"
                >
                  <div className="text-right flex flex-col justify-center -space-y-0.5">
                    <span className="font-black text-zinc-200 text-[11px] max-w-[80px] truncate leading-tight">{dbDisplayName}</span>
                    <span className="text-[9px] font-sans font-bold text-zinc-400 tracking-wide uppercase leading-none">
                      {/* @ts-ignore */}
                      {TITLE_MAP[lang][currentTitleId] || TITLE_MAP[lang]['noTitle']}
                    </span>
                  </div>

                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border tracking-wide transition-all ${getLevelBadgeColor(level)}`}>
                    {t.lvl}{level}
                  </span>
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="border border-zinc-800 px-3 py-1.5 rounded-md text-zinc-400 hover:text-white hover:border-zinc-500 transition-all font-bold"
                >
                  {t.loginBtn}
                </Link>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-2 text-zinc-500 border-l border-zinc-800 pl-5">
              <span className="tabular-nums text-zinc-400">{systemCoreTime}</span>
            </div>

            <div className="flex items-center gap-2.5 bg-zinc-950/40 border border-emerald-500/20 px-4 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-[11px] font-black text-emerald-400 tracking-tight flex items-center gap-1">
                <RealTimeOnlineCounter /> 
                <span className="opacity-40 text-[8.5px] font-sans font-bold tracking-widest ml-0.5">LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 pb-32">
        
        <div className="max-w-4xl mb-16 space-y-4">
          <h1 className="group/title inline-block cursor-default text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tighter text-zinc-300 transition-colors duration-300">
            <span className="group-hover/title:text-white transition-colors duration-300">
              {t.title1}
            </span>
            <br />
            <span className="text-zinc-600 block mt-1 group-hover/title:text-white transition-colors duration-300">
              {t.title2}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed font-light tracking-wide">
            {t.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* 테스트 뭉치 (좌측 카드 세션) */}
          <div className="lg:col-span-6 flex flex-col gap-5">
            {TEST_SUITE.map((test) => (
              <Link 
                href={test.path} 
                key={test.id}
                className="group relative flex flex-col justify-between bg-[#040404]/30 border border-zinc-900/80 p-8 rounded-2xl hover:border-zinc-500 hover:bg-[#070707]/60 shadow-lg transition-all duration-300 backdrop-blur-md overflow-hidden flex-1"
              >
                <div className="absolute top-0 right-0 w-24 h-24 border-t border-r border-zinc-900/30 group-hover:border-zinc-700/30 transition-colors pointer-events-none rounded-tr-2xl" />
                
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="font-mono text-[10px] font-black text-zinc-400 tracking-[0.15em] border-b border-zinc-900 pb-1 group-hover:text-zinc-300 transition-all">
                      {test.label}
                    </span>
                    <div className="w-8 h-8 rounded-lg border border-zinc-800 bg-zinc-950 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:text-black text-zinc-400 transition-colors">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </div>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-zinc-300 group-hover:text-white transition-all tracking-tight mb-3">
                    {test.name}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-zinc-400 font-light leading-relaxed max-w-md mb-8">
                    {test.desc}
                  </p>
                </div>

                {/* 🔥 [정밀 수정 구역]: 텍스트 겹침 방지 및 다이내믹 정렬 레이아웃 보정 */}
                <div className="border-t border-zinc-900 pt-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4 font-mono text-[10px]">
                  <div className="flex flex-col gap-1.5 text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-70">{t.standard}:</span> 
                      <span className="text-zinc-300 font-bold group-hover:text-zinc-200">{test.stat}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="opacity-70">{t.myBest}:</span> 
                      <span className="text-emerald-400 font-black tracking-wide bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                        {test.myScore}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-black text-zinc-400 opacity-40 group-hover:opacity-100 group-hover:text-zinc-300 group-hover:translate-x-1 transition-all tracking-widest self-end sm:self-center">
                    {t.proceed}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* 리더보드 (우측 세션) */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-[#040404]/30 border border-zinc-900/80 rounded-2xl p-8 shadow-lg backdrop-blur-md">
            <Leaderboard lang={lang} />
          </div>

        </div>

        {/* 하단 유저 방문자 지표 트래커 */}
        <div className="mt-12 bg-[#030303]/40 border border-zinc-900/80 p-5 rounded-2xl font-mono text-xs shadow-md max-w-sm">
          <div className="border-l border-zinc-800 pl-4">
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-wider mb-1">// {t.totalHits}</p>
            <p className="font-bold text-zinc-200 tabular-nums text-lg">
              {typeof totalVisits === 'number' ? totalVisits.toLocaleString() : totalVisits}
            </p>
          </div>
        </div>

      </main>

      {/* 푸터 영역 */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6 border-t border-zinc-900/80 flex justify-between items-center text-zinc-600 text-[9px] font-mono font-bold tracking-widest uppercase relative z-10">
        <div>LABGG METRICS ENGINE</div>
        <div className="text-zinc-500">LABGG.PRO © 2026</div>
      </footer>

    </div>
  );
}