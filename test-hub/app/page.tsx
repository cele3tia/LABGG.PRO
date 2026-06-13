'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RealTimeOnlineCounter from './components/RealTimeOnlineCounter';
import Leaderboard from './components/Leaderboard';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserStats } from './lib/recordService';

const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
  return 'text-zinc-400 bg-zinc-900 border-zinc-800';
};

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비', noTitle: '칭호 없음' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie', noTitle: 'No Title' }
};

const TRANSLATIONS = {
  ko: {
    title1: '당신의 피지컬을',
    title2: '숫자로 증명하세요.',
    desc: '전 세계 플레이어들과 실시간으로 순위를 경쟁해 보세요.',
    global: '글로벌',
    proceed: '테스트 시작 →',
    standard: '평균 기준',
    myBest: '나의 최고 기록',
    loginBtn: '로그인',
    profileBtn: '프로필 보기',
    lvl: 'Lv.',
    multiplayerTitle: 'MULTIPLAYER COMMAND CENTER',
    singleplayerTitle: 'SINGLEPLAYER TRAINING SUITE',
    modes: {
      normal: { name: '일반 매칭 (Casual Match)', desc: '레이팅 부담 없이 다른 유저들과 가볍게 피지컬 매치 진행' },
      ranked: { name: '경쟁 레이팅 (Ranked Match)', desc: '공식 티어와 랭킹 점수(MMR)가 반영되는 하드코어 진검승부' },
      custom: { name: '커스텀 매치 (Custom Lobby)', desc: '고유 코드를 생성하여 친구와 1:1 비공개 대전을 개설합니다' }
    },
    tests: {
      reaction: {
        name: 'Visual Reaction Test',
        label: 'VISUAL REACTION',
        desc: '화면의 색상이 변하는 찰나의 순간을 포착하여 당신의 반사 신경을 정밀하게 측정합니다.',
        stat: '200ms ~ 250ms',
      },
      cps: {
        name: 'Clicks Per Second',
        label: 'CLICK PER SECOND',
        desc: '제한 시간 동안 마우스를 얼마나 빠르게 연타할 수 있는지 피지컬 한계를 측정합니다.',
        stat: '6.0 ~ 7.0 CPS',
      }
    }
  },
  en: {
    title1: 'PROVE YOUR PHYSICAL',
    title2: 'LIMITS WITH NUMBERS.',
    desc: 'Compete for rankings with players worldwide in real-time.',
    global: 'GLOBAL',
    proceed: 'PROCEED TEST →',
    standard: 'Average Bench',
    myBest: 'MY BEST SCORE',
    loginBtn: 'SIGN IN',
    profileBtn: 'MY PROFILE',
    lvl: 'Lv.',
    multiplayerTitle: 'MULTIPLAYER COMMAND CENTER',
    singleplayerTitle: 'SINGLEPLAYER TRAINING SUITE',
    modes: {
      normal: { name: 'Casual Match', desc: 'Lightweight physical match against other clickers without rating risks.' },
      ranked: { name: 'Ranked Match', desc: 'Hardcore competition that directly affects your global rank and MMR rating.' },
      custom: { name: 'Custom Lobby', desc: 'Generate a unique server code to set up a private 1v1 battle with friends.' }
    },
    tests: {
      reaction: {
        name: 'Visual Reaction Test',
        label: 'VISUAL REACTION',
        desc: 'Measures how fast you react the exact moment the screen changes color.',
        stat: '200ms to 250ms',
      },
      cps: {
        name: 'Clicks Per Second',
        label: 'CLICK PER SECOND',
        desc: 'Measures your maximum clicking frequency within a specific time limit.',
        stat: '6.0 to 7.0 CPS',
      }
    }
  }
};

export default function LandingPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [systemCoreTime, setSystemCoreTime] = useState<string>('00:00:00');
  const [user, setUser] = useState<User | null>(null);

  const [level, setLevel] = useState<number>(1);
  const [currentTitleId, setCurrentTitleId] = useState<string>('');
  const [dbDisplayName, setDbDisplayName] = useState<string>('');
  const [fbStats, setFbStats] = useState({ reactionBest: '---', cpsBest: '---' });

  const [activeSlide, setActiveSlide] = useState(0);

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
        const data = await getUserStats(currentUser.uid);
        if (data) {
          setFbStats({
            reactionBest: data.reactionBest ? `${data.reactionBest}ms` : '---',
            cpsBest: data.cpsBest ? `${data.cpsBest} CPS` : '---'
          });
        }
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
      glow: 'shadow-[0_0_40px_rgba(16,185,129,0.06)]',
      border: 'border-emerald-500/20',
      activeColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500',
      btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]'
    },
    {
      id: 'cps',
      name: t.tests.cps.name,
      label: t.tests.cps.label,
      desc: t.tests.cps.desc,
      stat: t.tests.cps.stat,
      myScore: fbStats.cpsBest,
      path: '/cps',
      glow: 'shadow-[0_0_40px_rgba(34,211,238,0.06)]',
      border: 'border-cyan-500/20',
      activeColor: 'text-cyan-400',
      activeBg: 'bg-cyan-500',
      btnGlow: 'shadow-[0_0_15px_rgba(34,211,238,0.4)]'
    }
  ];

  const handlePrev = () => setActiveSlide((prev) => (prev === 0 ? TEST_SUITE.length - 1 : prev - 1));
  const handleNext = () => setActiveSlide((prev) => (prev === TEST_SUITE.length - 1 ? 0 : prev + 1));

  return (
    <div className="relative min-h-screen bg-[#000000] text-zinc-100 font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight">
      
      {/* 백그라운드 그리드 */}
      <div className="absolute inset-x-0 bottom-0 top-24 z-0 pointer-events-none select-none overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-1000 ${TEST_SUITE[activeSlide].id === 'reaction' ? 'bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.03),transparent_50%)]' : 'bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.03),transparent_50%)]'}`} />
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: 'linear-gradient(to right, rgba(39,39,42,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* 네비게이션 */}
      <nav className="relative z-50 w-full bg-black/80 border-b border-zinc-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-400 transition-all duration-300">
              <span className="font-mono text-base font-black text-white tracking-tighter">L</span>
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-[9px] font-bold tracking-[0.4em] text-zinc-500 uppercase">LABORATORY</span>
              <span className="text-2xl font-black tracking-[0.05em] text-zinc-300 group-hover:text-white transition-colors">LABGG<span className="text-white font-extrabold">.PRO</span></span>
            </div>
          </div>
          
          <div className="flex items-center gap-5 font-mono text-[10px]">
            <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg">
              <button onClick={() => handleLangChange('ko')} className={`px-2.5 py-1.5 rounded-md font-bold transition-all ${lang === 'ko' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}>KO</button>
              <button onClick={() => handleLangChange('en')} className={`px-2.5 py-1.5 rounded-md font-bold transition-all ${lang === 'en' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-400'}`}>EN</button>
            </div>

            <div className="flex items-center gap-3 border-l border-zinc-800 pl-5">
              {user ? (
                <Link href="/profile" className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 pl-3.5 pr-2.5 py-1.5 rounded-xl text-zinc-300 hover:text-white transition-all font-sans text-xs tracking-tight shadow-md">
                  <div className="text-right flex flex-col justify-center -space-y-0.5">
                    <span className="font-black text-zinc-200 text-[11px] max-w-[80px] truncate leading-tight">{dbDisplayName}</span>
                    <span className="text-[9px] font-sans font-bold text-zinc-400 tracking-wide uppercase leading-none">
                      {TITLE_MAP[lang][currentTitleId] || TITLE_MAP[lang]['noTitle']}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-md border tracking-wide transition-all ${getLevelBadgeColor(level)}`}>{t.lvl}{level}</span>
                </Link>
              ) : (
                <Link href="/login" className="border border-zinc-800 bg-zinc-950 px-4 py-2 rounded-lg text-zinc-300 hover:text-white hover:border-zinc-500 transition-all font-bold">{t.loginBtn}</Link>
              )}
            </div>

            {/* 🛠️ [모던 최적화] 실시간 접속자 카운터 레이아웃 튜닝 구역 */}
            <div className="flex items-center gap-2.5 bg-emerald-950/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl shadow-[inset_0_0_12px_rgba(16,185,129,0.02),0_0_15px_rgba(16,185,129,0.04)] transition-colors hover:border-emerald-500/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
              </span>
              <div className="text-[11px] font-black text-emerald-400 tracking-tight flex items-center gap-1.5">
                <RealTimeOnlineCounter /> 
                <span className="text-[8.5px] font-sans font-extrabold tracking-widest text-emerald-500/60 ml-0.5">LIVE</span>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 pb-32">
        
        <div className="max-w-4xl mb-12">
          <h1 className="group/title inline-block cursor-default text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tighter mb-4 transition-colors duration-300">
            <span className="text-white group-hover/title:text-zinc-200 transition-colors duration-300">
              {t.title1}
            </span>
            <br />
            <span className="text-zinc-600 block mt-2 group-hover/title:text-white transition-colors duration-300">
              {t.title2}
            </span>
          </h1>
          <p className="text-zinc-400 max-w-lg font-medium">{t.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* 🎮 좌측 주력 코어 영역 */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            {/* ⚔️ 멀티플레이어 커맨드 로비 센터 */}
            <div className="space-y-3.5">
              <div className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.25em] px-1 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                // {t.multiplayerTitle}
              </div>
              <div className="flex flex-col gap-3">
                
                {/* 1. 일반 매칭 카드 (에메랄드 악센트) */}
                <Link 
                  href="/match/normal"
                  className="group/btn relative bg-zinc-950/70 border border-zinc-900 p-5 rounded-2xl hover:border-emerald-500/30 hover:bg-emerald-950/5 hover:shadow-[0_0_20px_rgba(16,185,129,0.03)] transition-all text-left flex justify-between items-center"
                >
                  <div className="max-w-[85%]">
                    <span className="text-sm font-black text-zinc-200 group-hover/btn:text-emerald-400 transition-colors block mb-1">
                      {t.modes.normal.name}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium block leading-normal">
                      {t.modes.normal.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-zinc-700 group-hover/btn:text-emerald-500/50 tracking-wider uppercase transition-colors">
                    Casual
                  </div>
                </Link>

                {/* 2. 경쟁 레이팅 카드 (시그니처 매운맛 네온 로즈 골드 이펙트) */}
                <Link 
                  href="/match/ranked"
                  className="group/btn relative bg-zinc-950/70 border border-zinc-900 p-6 rounded-2xl hover:border-rose-500/40 hover:bg-rose-950/10 hover:shadow-[0_0_30px_rgba(244,63,94,0.06)] transition-all text-left flex justify-between items-center"
                >
                  <div className="max-w-[85%]">
                    <span className="text-base font-black text-zinc-100 group-hover/btn:text-rose-400 transition-colors block mb-1">
                      {t.modes.ranked.name}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium block leading-normal">
                      {t.modes.ranked.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-rose-600/30 group-hover/btn:text-rose-500 tracking-widest uppercase transition-colors animate-pulse">
                    Ranked
                  </div>
                </Link>

                {/* 3. 커스텀 매치 방 생성 카드 (퍼플 악센트) */}
                <Link 
                  href="/match/custom"
                  className="group/btn relative bg-zinc-950/70 border border-zinc-900 p-5 rounded-2xl hover:border-purple-500/30 hover:bg-purple-950/5 hover:shadow-[0_0_20px_rgba(168,85,247,0.03)] transition-all text-left flex justify-between items-center"
                >
                  <div className="max-w-[85%]">
                    <span className="text-sm font-black text-zinc-200 group-hover/btn:text-purple-400 transition-colors block mb-1">
                      {t.modes.custom.name}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium block leading-normal">
                      {t.modes.custom.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-zinc-700 group-hover/btn:text-purple-500/50 tracking-wider uppercase transition-colors">
                    Custom
                  </div>
                </Link>

              </div>
            </div>

            {/* 🎡 싱글플레이어 개인 훈련 스위트 */}
            <div className="space-y-3.5">
              <div className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.25em] px-1 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                // {t.singleplayerTitle}
              </div>
              
              <div className="relative overflow-hidden rounded-3xl group/slider">
                <div 
                  className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)]"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {TEST_SUITE.map((test) => (
                    <div key={test.id} className="min-w-full p-1">
                      <Link 
                        href={test.path} 
                        className={`block relative bg-zinc-950/80 border p-8 sm:p-10 rounded-[2rem] transition-all duration-500 ${test.glow} ${test.border} hover:bg-zinc-900/60 min-h-[320px] flex flex-col justify-between`}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-6">
                            <span className={`font-mono text-[11px] font-black tracking-[0.25em] uppercase ${test.activeColor}`}>
                              {test.label}
                            </span>
                            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:scale-110 group-hover:bg-zinc-800 transition-all">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={test.activeColor}>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </div>
                          </div>

                          <h3 className="text-3xl font-black text-white tracking-tight mb-4 leading-tight">{test.name}</h3>
                          <p className="text-zinc-400 text-sm font-medium max-w-[90%] sm:max-w-md mb-6 leading-relaxed line-clamp-2">
                            {test.desc}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 border-t border-zinc-900 pt-6 font-mono">
                          <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">{t.standard}</span>
                            <span className="text-zinc-200 text-base font-black">{test.stat}</span>
                          </div>
                          <div className="space-y-1 sm:border-l sm:border-zinc-900 sm:pl-8">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block">{t.myBest}</span>
                            <span className={`text-base font-black ${test.activeColor}`}>{test.myScore}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* 슬라이드 화살표 및 인디케이터 바 */}
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-4">
                  <div className="flex gap-2.5">
                    {TEST_SUITE.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === activeSlide ? `w-10 ${TEST_SUITE[activeSlide].activeBg} ${TEST_SUITE[activeSlide].btnGlow}` : 'w-3 bg-zinc-800 hover:bg-zinc-700'}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[10px] font-bold text-zinc-600 tracking-wider">
                    0{activeSlide + 1} / 0{TEST_SUITE.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button onClick={handlePrev} className="w-9 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-all active:scale-95">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button onClick={handleNext} className="w-9 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-900 transition-all active:scale-95">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 🏆 우측 글로벌 실시간 리더보드 세션 */}
          <div className="lg:col-span-5 bg-zinc-950/60 border border-zinc-900 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md h-full lg:min-h-[735px]">
            <Leaderboard lang={lang} />
          </div>

        </div>
      </main>

      {/* 푸터 */}
      <footer className="relative z-50 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-8 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-zinc-600 font-mono text-[10px] font-bold tracking-widest uppercase">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
          LABGG PHYSICAL CORE ENGINE v1.2
        </div>
        <div>LABGG.PRO © 2026</div>
      </footer>

    </div>
  );
}