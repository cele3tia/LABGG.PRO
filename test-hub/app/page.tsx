'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RealTimeOnlineCounter from './components/RealTimeOnlineCounter';
import Leaderboard from './components/Leaderboard';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserStats } from './lib/recordService';

type ThemeMode = 'dark' | 'light';

interface ThemeStyles {
  bg: string;
  nav: string;
  logoText: string;
  themeBtn: string;
  profileBox: string;
  profileName: string;
  liveCounter: string;
  title1: string;
  title2: string;
  desc: string;
  textDesc: string;
  sectionTitle: string;
  masterBox: string;
  card: string;
  cardCasual: string;
  cardRanked: string;
  cardCustom: string;
  cardMainText: string;
  cardRankedMainText: string;
  cardCustomMainText: string;
  cardSubText: string;
  sliderCard: string;
  sliderTitle: string;
  sliderMutedText: string;
  sliderIndicatorIdle: string;
  sliderArrow: string;
  leaderboardBg: string;
  gridLine: string;
  footerBorder: string;
}

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
    multiplayerBadge: '핵심 교전',
    modes: {
      normal: { name: '일반 매칭 (Casual Match)', desc: '레이팅 부담 없이 다른 유저들과 가볍게 피지컬 매치 진행' },
      ranked: { name: '경쟁 레이팅 (Ranked Match)', desc: '공식 티어와 랭킹 점수가 반영되는 하드코어 진검승부' },
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
    multiplayerBadge: 'CORE ARENA',
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
  const [theme, setTheme] = useState<ThemeMode>('dark'); 
  const [user, setUser] = useState<User | null>(null);

  const [level, setLevel] = useState<number>(1);
  const [currentTitleId, setCurrentTitleId] = useState<string>('');
  const [dbDisplayName, setDbDisplayName] = useState<string>('');
  const [fbStats, setFbStats] = useState({ reactionBest: '---', cpsBest: '---' });

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const savedTheme = localStorage.getItem('site-theme') as ThemeMode;
    if (savedTheme) setTheme(savedTheme);

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

    return () => unsubscribe();
  }, []);

  const handleLangChange = (newLang: 'ko' | 'en') => {
    setLang(newLang);
    localStorage.setItem('site-lang', newLang);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('site-theme', nextTheme);
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
      glow: theme === 'dark' ? 'shadow-[0_0_50px_rgba(16,185,129,0.03)]' : 'shadow-[0_4px_30px_rgba(16,185,129,0.01)]',
      border: theme === 'dark' ? 'border-zinc-800/80' : 'border-zinc-200',
      activeColor: 'text-emerald-500 dark:text-emerald-400',
      activeBg: 'bg-emerald-500',
      btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]'
    },
    {
      id: 'cps',
      name: t.tests.cps.name,
      label: t.tests.cps.label,
      desc: t.tests.cps.desc,
      stat: t.tests.cps.stat,
      myScore: fbStats.cpsBest,
      path: '/cps',
      glow: theme === 'dark' ? 'shadow-[0_0_50px_rgba(34,211,238,0.04)]' : 'shadow-[0_4px_30px_rgba(34,211,238,0.01)]',
      border: theme === 'dark' ? 'border-zinc-800/80' : 'border-zinc-200',
      activeColor: 'text-cyan-500 dark:text-cyan-400',
      activeBg: 'bg-cyan-500',
      btnGlow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]'
    }
  ];

  const handlePrev = () => setActiveSlide((prev) => (prev === 0 ? TEST_SUITE.length - 1 : prev - 1));
  const handleNext = () => setActiveSlide((prev) => (prev === TEST_SUITE.length - 1 ? 0 : prev + 1));

  const s: ThemeStyles = {
    bg: theme === 'dark' ? 'bg-[#000000] text-[#e4e4e7]' : 'bg-[#f5f6f9] text-[#1c1917]',
    nav: theme === 'dark' ? 'bg-[#000000] border-zinc-900' : 'bg-[#ffffff] border-zinc-200/80 shadow-sm',
    logoText: theme === 'dark' ? 'text-white' : 'text-black',
    themeBtn: theme === 'dark' ? 'text-zinc-500 hover:text-zinc-200 border-zinc-900 bg-zinc-950' : 'text-zinc-500 hover:text-black border-zinc-200 bg-white shadow-sm',
    profileBox: theme === 'dark' ? 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-600 hover:text-black shadow-sm',
    profileName: theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800',
    liveCounter: theme === 'dark' ? 'bg-emerald-950/10 border-emerald-950' : 'bg-emerald-500/[0.03] border-emerald-200 shadow-sm',
    title1: theme === 'dark' ? 'text-white' : 'text-black',
    title2: theme === 'dark' ? 'text-zinc-800 group-hover/title:text-zinc-600' : 'text-zinc-300 group-hover/title:text-zinc-500',
    desc: theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500 font-medium',
    textDesc: theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500 font-medium',
    sectionTitle: theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400',
    
    // 🛠️ 마스터 박스 둥근 모서리 및 패딩 규격화
    masterBox: theme === 'dark' ? 'bg-[#050507] border-zinc-900 p-6 rounded-3xl' : 'bg-white border-zinc-200/70 p-6 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)]',
    
    // 🛠️ 내부 카드 완벽한 픽셀 규격 통일 (p-5 및 rounded-xl 고정)
    card: theme === 'dark' ? 'bg-[#0c0c0e] border-zinc-800/60 hover:border-zinc-700' : 'bg-[#fafafa] border-zinc-200 hover:border-zinc-300 shadow-sm',
    cardCasual: 'hover:bg-emerald-500/[0.005]',
    cardRanked: 'hover:bg-rose-500/[0.005]',
    cardCustom: 'hover:bg-purple-500/[0.005]',
    
    // 🛠️ 내부 카드 텍스트 사이즈 완벽 통일 (text-[15px])
    cardMainText: theme === 'dark' ? 'text-zinc-100 group-hover/btn:text-white' : 'text-zinc-900 group-hover/btn:text-black',
    cardRankedMainText: theme === 'dark' ? 'text-zinc-100 group-hover/btn:text-white' : 'text-zinc-900 group-hover/btn:text-black',
    cardCustomMainText: theme === 'dark' ? 'text-zinc-100 group-hover/btn:text-white' : 'text-zinc-900 group-hover/btn:text-black',
    cardSubText: theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500 font-medium',
    
    sliderCard: theme === 'dark' ? 'bg-[#050507] border-zinc-900' : 'bg-white border-zinc-200/80 shadow-sm',
    sliderTitle: theme === 'dark' ? 'text-white' : 'text-black',
    sliderMutedText: theme === 'dark' ? 'text-zinc-500 sm:border-zinc-900' : 'text-zinc-500 sm:border-zinc-200',
    sliderIndicatorIdle: theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300',
    sliderArrow: theme === 'dark' ? 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-black shadow-sm',
    leaderboardBg: theme === 'dark' ? 'bg-[#050507] border-zinc-900' : 'bg-white border-zinc-200/90 shadow-sm',
    gridLine: theme === 'dark' ? 'linear-gradient(to right, rgba(39,39,42,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.15) 1px, transparent 1px)' : 'linear-gradient(to right, rgba(212,212,216,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,212,216,0.2) 1px, transparent 1px)',
    footerBorder: theme === 'dark' ? 'border-zinc-900 text-zinc-600' : 'border-zinc-200 text-zinc-400'
  };

  return (
    <div className={`relative min-h-screen ${s.bg} font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight transition-colors duration-300`}>
      
      <div className="absolute inset-x-0 bottom-0 top-24 z-0 pointer-events-none select-none overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-1000 ${TEST_SUITE[activeSlide].id === 'reaction' ? 'bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.005),transparent_50%)]' : 'bg-[radial-gradient(circle_at_30%_30%,rgba(34,211,238,0.005),transparent_50%)]'}`} />
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: s.gridLine, backgroundSize: '40px 40px' }} />
      </div>

      <nav className={`relative z-50 w-full ${s.nav} border-b transition-colors duration-300`}>
        <div className="w-full px-6 sm:px-10 lg:px-12 py-4 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
          
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 font-mono text-xs font-bold">
            <Link href="/" className={`text-base font-sans tracking-tight font-black transition-colors ${s.logoText}`}>
              LABGG.PRO
            </Link>
            <div className="w-[1px] h-3 bg-zinc-800/30 dark:bg-zinc-800/50 hidden md:block" />
            
            <div className="flex items-center bg-zinc-500/5 dark:bg-zinc-950 border border-zinc-500/10 dark:border-zinc-900 rounded-lg px-2.5 py-1 text-[10px] font-bold gap-2">
              <button 
                onClick={() => handleLangChange('ko')} 
                className={`transition-colors ${lang === 'ko' ? (theme === 'dark' ? 'text-white font-black' : 'text-black font-black') : 'text-zinc-500'}`}
              >
                KR
              </button>
              <span className="opacity-20 text-zinc-500">|</span>
              <button 
                onClick={() => handleLangChange('en')} 
                className={`transition-colors ${lang === 'en' ? (theme === 'dark' ? 'text-white font-black' : 'text-black font-black') : 'text-zinc-500'}`}
              >
                EN
              </button>
            </div>

            <button 
              onClick={toggleTheme}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${s.themeBtn}`}
            >
              {theme === 'dark' ? 'LIGHT MODE' : 'DARK MODE'}
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            {user ? (
              <Link href="/profile" className={`flex items-center gap-2.5 border pl-3 pr-2 py-1 rounded-md transition-all font-sans text-[11px] tracking-tight ${s.profileBox}`}>
                <span className={`font-black tracking-tight ${s.profileName}`}>{dbDisplayName}</span>
                <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded transition-all ${getLevelBadgeColor(level)}`}>{t.lvl}{level}</span>
              </Link>
            ) : (
              <Link href="/login" className={`border px-3.5 py-1 rounded-md transition-all font-bold ${s.profileBox}`}>{t.loginBtn}</Link>
            )}

            <div className={`flex items-center gap-2 border px-3 py-1 rounded-md transition-colors ${s.liveCounter}`}>
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-emerald-400"></span>
              </span>
              <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 tracking-tight flex items-center gap-1">
                <RealTimeOnlineCounter /> 
                <span className="text-[8px] font-sans font-black tracking-widest text-emerald-500/40 ml-0.5">LIVE</span>
              </div>
            </div>
          </div>

        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 pb-32">
        
        <div className="max-w-4xl mb-12">
          <h1 className="group/title inline-block cursor-default text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tighter mb-4 transition-colors duration-300">
            <span className={`transition-colors duration-300 ${s.title1}`}>
              {t.title1}
            </span>
            <br />
            <span className={`block mt-2 transition-colors duration-300 ${s.title2}`}>
              {t.title2}
            </span>
          </h1>
          <p className={`max-w-lg font-medium text-sm transition-colors ${s.desc}`}>{t.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            
            <div className="space-y-3">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2.5 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                <span>// {t.multiplayerTitle}</span>
                <span className="text-[8px] font-sans font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded tracking-normal scale-90 origin-left">{t.multiplayerBadge}</span>
              </div>
              
              {/* 🛠️ 마스터 외곽 박스 적용 및 내부 카드 규격(p-5, rounded-xl) 완벽 통일 */}
              <div className={`flex flex-col gap-3 border ${s.masterBox}`}>
                
                {/* 일반 매칭 */}
                <Link 
                  href="/match/normal"
                  className={`group/btn relative w-full border p-5 rounded-xl transition-all text-left flex justify-between items-center ${s.card} ${s.cardCasual}`}
                >
                  <div className="max-w-[85%]">
                    <span className={`text-[15px] font-bold transition-colors block mb-1 ${s.cardMainText}`}>
                      {t.modes.normal.name}
                    </span>
                    <span className={`text-xs block leading-normal ${s.cardSubText}`}>
                      {t.modes.normal.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 group-hover/btn:text-black dark:group-hover/btn:text-white tracking-wider uppercase transition-colors">
                    Casual
                  </div>
                </Link>

                {/* 경쟁 레이팅 */}
                <Link 
                  href="/match/ranked"
                  className={`group/btn relative w-full border p-5 rounded-xl transition-all text-left flex justify-between items-center ${s.card} ${s.cardRanked}`}
                >
                  <div className="max-w-[85%]">
                    <span className={`text-[15px] font-bold transition-colors block mb-1 ${s.cardRankedMainText}`}>
                      {t.modes.ranked.name}
                    </span>
                    <span className={`text-xs block leading-normal ${s.cardSubText}`}>
                      {t.modes.ranked.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-rose-500/40 group-hover/btn:text-rose-500 tracking-widest uppercase transition-colors">
                    Ranked
                  </div>
                </Link>

                {/* 커스텀 매치 */}
                <Link 
                  href="/match/custom"
                  className={`group/btn relative w-full border p-5 rounded-xl transition-all text-left flex justify-between items-center ${s.card} ${s.cardCustom}`}
                >
                  <div className="max-w-[85%]">
                    <span className={`text-[15px] font-bold transition-colors block mb-1 ${s.cardCustomMainText}`}>
                      {t.modes.custom.name}
                    </span>
                    <span className={`text-xs block leading-normal ${s.cardSubText}`}>
                      {t.modes.custom.desc}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] font-black text-zinc-400 dark:text-zinc-600 group-hover/btn:text-black dark:group-hover/btn:text-white tracking-wider uppercase transition-colors">
                    Custom
                  </div>
                </Link>

              </div>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                // {t.singleplayerTitle}
              </div>
              
              <div className="relative overflow-hidden rounded-3xl group/slider flex-1 min-h-[300px] border dark:border-zinc-900 flex flex-col">
                <div 
                  className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] flex-1"
                  style={{ transform: `translateX(-${activeSlide * 100}%)` }}
                >
                  {TEST_SUITE.map((test) => (
                    <div key={test.id} className="min-w-full p-0.5 flex flex-col">
                      <div className={`relative p-7 sm:p-9 flex-1 flex flex-col justify-between rounded-[1.4rem] ${s.sliderCard}`}>
                        
                        <div className="space-y-2.5 pt-0.5">
                          <div className="flex justify-between items-center">
                            <span className={`font-mono text-[10px] font-black tracking-widest uppercase ${test.activeColor}`}>
                              {test.label}
                            </span>
                            <Link href={test.path} className="w-8 h-8 rounded-lg bg-zinc-500/5 dark:bg-zinc-900 border border-zinc-500/10 dark:border-zinc-800 flex items-center justify-center hover:scale-105 transition-all">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={test.activeColor}>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </Link>
                          </div>

                          <h3 className={`text-2xl font-bold tracking-tight leading-tight ${s.sliderTitle}`}>{test.name}</h3>
                          <p className={`text-xs font-medium max-w-md leading-relaxed line-clamp-3 ${s.textDesc}`}>
                            {test.desc}
                          </p>
                        </div>

                        <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 border-t pt-5 font-mono text-xs ${s.sliderMutedText}`}>
                          <div className="space-y-0.5">
                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.standard}</span>
                            <span className={`${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'} font-black`}>{test.stat}</span>
                          </div>
                          <div className="space-y-0.5 sm:border-l sm:pl-6 border-zinc-500/10 dark:border-zinc-900/60">
                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.myBest}</span>
                            <span className={`font-black ${test.activeColor}`}>{test.myScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {TEST_SUITE.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-1 rounded-full transition-all duration-500 ${idx === activeSlide ? `w-8 ${TEST_SUITE[activeSlide].activeBg} ${TEST_SUITE[activeSlide].btnGlow}` : `w-2.5 ${s.sliderIndicatorIdle}`}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-bold text-zinc-500">
                    0{activeSlide + 1} / 0{TEST_SUITE.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button onClick={handlePrev} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button onClick={handleNext} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className={`lg:col-span-5 border rounded-3xl p-6 sm:p-8 backdrop-blur-md h-full lg:min-h-[690px] transition-colors duration-300 ${s.leaderboardBg}`}>
            <Leaderboard lang={lang} />
          </div>

        </div>
      </main>

      <footer className={`w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[9px] font-bold tracking-widest uppercase transition-colors ${s.footerBorder}`}>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
          LABGG ENGINE SYSTEM RUNTIME
        </div>
        <div>LABGG.PRO © 2026</div>
      </footer>

    </div>
  );
}