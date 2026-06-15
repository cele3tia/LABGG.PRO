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

interface CompleteThemeSchema {
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
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
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
    multiplayerTitle: '멀티플레이어',
    singleplayerTitle: '싱글플레이어',
    multiplayerBadge: '핵심 전장',
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
    multiplayerTitle: 'MULTIPLAYER',
    singleplayerTitle: 'SINGLEPLAYER',
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

  const [activeMultiSlide, setActiveMultiSlide] = useState(0);
  const [activeSingleSlide, setActiveSingleSlide] = useState(0);

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

  useEffect(() => {
    const multiTimer = setTimeout(() => {
      setActiveMultiSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000);
    return () => clearTimeout(multiTimer);
  }, [activeMultiSlide]);

  useEffect(() => {
    const singleTimer = setTimeout(() => {
      setActiveSingleSlide((prev) => (prev === 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearTimeout(singleTimer);
  }, [activeSingleSlide]);

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

  // 💡 1. 엣지 글로우 제거 및 도트만 남긴 멀티플레이어 배열
  const MULTI_SUITE = [
    {
      id: 'casual',
      name: t.modes.normal.name,
      label: 'CASUAL MATCH',
      desc: t.modes.normal.desc,
      path: '/match/normal',
      activeColor: 'text-emerald-500 dark:text-emerald-400',
      activeBg: 'bg-emerald-500',
      btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      dotColor: theme === 'dark' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)'
    },
    {
      id: 'ranked',
      name: t.modes.ranked.name,
      label: 'COMPETITIVE RANKED',
      desc: t.modes.ranked.desc,
      path: '/match/ranked',
      activeColor: 'text-rose-500 dark:text-rose-400',
      activeBg: 'bg-rose-500',
      btnGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
      dotColor: theme === 'dark' ? 'rgba(244,63,94,0.15)' : 'rgba(244,63,94,0.08)'
    },
    {
      id: 'custom',
      name: t.modes.custom.name,
      label: 'PRIVATE CUSTOM',
      desc: t.modes.custom.desc,
      path: '/match/custom',
      activeColor: 'text-purple-500 dark:text-purple-400',
      activeBg: 'bg-purple-500',
      btnGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      dotColor: theme === 'dark' ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.08)'
    }
  ];

  // 💡 2. 엣지 글로우 제거 및 도트만 남긴 싱글플레이어 배열
  const SINGLE_SUITE = [
    {
      id: 'reaction',
      name: t.tests.reaction.name,
      label: t.tests.reaction.label,
      desc: t.tests.reaction.desc,
      stat: t.tests.reaction.stat,
      myScore: fbStats.reactionBest,
      path: '/reaction',
      activeColor: 'text-emerald-500 dark:text-emerald-400',
      activeBg: 'bg-emerald-500',
      btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      dotColor: theme === 'dark' ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)'
    },
    {
      id: 'cps',
      name: t.tests.cps.name,
      label: t.tests.cps.label,
      desc: t.tests.cps.desc,
      stat: t.tests.cps.stat,
      myScore: fbStats.cpsBest,
      path: '/cps',
      activeColor: 'text-cyan-500 dark:text-cyan-400',
      activeBg: 'bg-cyan-500',
      btnGlow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]',
      dotColor: theme === 'dark' ? 'rgba(34,211,238,0.15)' : 'rgba(34,211,238,0.08)'
    }
  ];

  const handleMultiPrev = () => setActiveMultiSlide((prev) => (prev === 0 ? MULTI_SUITE.length - 1 : prev - 1));
  const handleMultiNext = () => setActiveMultiSlide((prev) => (prev === MULTI_SUITE.length - 1 ? 0 : prev + 1));

  const handleSinglePrev = () => setActiveSingleSlide((prev) => (prev === 0 ? SINGLE_SUITE.length - 1 : prev - 1));
  const handleSingleNext = () => setActiveSingleSlide((prev) => (prev === SINGLE_SUITE.length - 1 ? 0 : prev + 1));

  // 💡 카드 기본 테두리(border)를 전체적으로 균일하게 복구
  const s: CompleteThemeSchema = {
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
    sliderCard: theme === 'dark' ? 'bg-[#0c0c0e]/80 border border-zinc-800/80 hover:border-zinc-700' : 'bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm',
    sliderTitle: theme === 'dark' ? 'text-white' : 'text-black',
    sliderMutedText: theme === 'dark' ? 'text-zinc-500 sm:border-zinc-900' : 'text-zinc-500 sm:border-zinc-200',
    sliderIndicatorIdle: theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300',
    sliderArrow: theme === 'dark' ? 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-500 hover:text-black shadow-sm',
    leaderboardBg: theme === 'dark' ? 'bg-[#08080a] border-zinc-900' : 'bg-white border-zinc-200 shadow-sm',
    gridLine: theme === 'dark' ? 'linear-gradient(to right, rgba(39,39,42,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.15) 1px, transparent 1px)' : 'linear-gradient(to right, rgba(212,212,216,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,212,216,0.2) 1px, transparent 1px)',
    footerBorder: theme === 'dark' ? 'border-zinc-900 text-zinc-600' : 'border-zinc-200 text-zinc-400'
  };

  return (
    <div className={`relative min-h-screen ${s.bg} font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight transition-colors duration-300`}>
      
      <div className="absolute inset-x-0 bottom-0 top-24 z-0 pointer-events-none select-none overflow-hidden">
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
          
          <div className="lg:col-span-7 flex flex-col justify-between gap-10">
            
            {/* 멀티플레이어 슬라이더 구역 */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2.5 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                <span>// {t.multiplayerTitle}</span>
                <span className="text-[8px] font-sans font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded tracking-normal scale-90 origin-left">{t.multiplayerBadge}</span>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl group/slider flex-1 min-h-[220px] flex flex-col">
                <div 
                  className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] flex-1"
                  style={{ transform: `translateX(-${activeMultiSlide * 100}%)` }}
                >
                  {MULTI_SUITE.map((mode) => (
                    <div key={mode.id} className="min-w-full p-0.5 flex flex-col">
                      <Link 
                        href={mode.path} 
                        className={`relative p-7 sm:p-9 rounded-[1.4rem] transition-all duration-300 flex-1 flex flex-col justify-between overflow-hidden hover:scale-[1.01] ${s.sliderCard}`}
                      >
                        {/* 💡 도트 패턴 유지 */}
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.85] mix-blend-normal" style={{ backgroundImage: `radial-gradient(${mode.dotColor} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />

                        <div className="space-y-2 pt-1 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className={`font-mono text-[10px] font-black tracking-widest uppercase ${mode.activeColor}`}>
                              {mode.label}
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-zinc-500/5 dark:bg-zinc-900 border border-zinc-500/10 dark:border-zinc-800 flex items-center justify-center hover:scale-105 transition-all">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={mode.activeColor}>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </div>
                          </div>

                          <h3 className={`text-2xl font-bold tracking-tight leading-tight ${s.sliderTitle}`}>{mode.name}</h3>
                          <p className={`text-xs font-medium max-w-md leading-relaxed line-clamp-3 ${s.textDesc}`}>
                            {mode.desc}
                          </p>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {MULTI_SUITE.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveMultiSlide(idx)}
                        className={`h-1 rounded-full transition-all duration-500 ${idx === activeMultiSlide ? `w-8 ${MULTI_SUITE[activeMultiSlide].activeBg} ${MULTI_SUITE[activeMultiSlide].btnGlow}` : `w-2.5 ${s.sliderIndicatorIdle}`}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-bold text-zinc-500">
                    0{activeMultiSlide + 1} / 0{MULTI_SUITE.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button onClick={handleMultiPrev} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button onClick={handleMultiNext} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 싱글플레이어 슬라이더 구역 */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                // {t.singleplayerTitle}
              </div>
              
              <div className="relative overflow-hidden rounded-2xl group/slider flex-1 min-h-[260px] flex flex-col">
                <div 
                  className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] flex-1"
                  style={{ transform: `translateX(-${activeSingleSlide * 100}%)` }}
                >
                  {SINGLE_SUITE.map((test) => (
                    <div key={test.id} className="min-w-full p-0.5 flex flex-col">
                      <Link 
                        href={test.path} 
                        className={`relative p-7 sm:p-9 rounded-[1.4rem] transition-all duration-300 flex-1 flex flex-col justify-between overflow-hidden hover:scale-[1.01] ${s.sliderCard}`}
                      >
                        {/* 💡 도트 패턴 유지 */}
                        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.85] mix-blend-normal" style={{ backgroundImage: `radial-gradient(${test.dotColor} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />

                        <div className="space-y-2 pt-0.5 relative z-10">
                          <div className="flex justify-between items-center">
                            <span className={`font-mono text-[10px] font-black tracking-widest uppercase ${test.activeColor}`}>
                              {test.label}
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-zinc-500/5 dark:bg-zinc-900 border border-zinc-500/10 dark:border-zinc-800 flex items-center justify-center hover:scale-105 transition-all">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={test.activeColor}>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                              </svg>
                            </div>
                          </div>

                          <h3 className={`text-2xl font-bold tracking-tight leading-tight ${s.sliderTitle}`}>{test.name}</h3>
                          <p className={`text-xs font-medium max-w-md leading-relaxed line-clamp-2 ${s.textDesc}`}>
                            {test.desc}
                          </p>
                        </div>

                        <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 border-t pt-5 font-mono text-xs relative z-10 ${s.sliderMutedText}`}>
                          <div className="space-y-0.5">
                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.standard}</span>
                            <span className={`${theme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'} font-black`}>{test.stat}</span>
                          </div>
                          <div className="space-y-0.5 sm:border-l sm:pl-6 border-zinc-500/10 dark:border-zinc-900/60">
                            <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.myBest}</span>
                            <span className={`font-black ${test.activeColor}`}>{test.myScore}</span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {SINGLE_SUITE.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setActiveSingleSlide(idx)}
                        className={`h-1 rounded-full transition-all duration-500 ${idx === activeSingleSlide ? `w-8 ${SINGLE_SUITE[activeSingleSlide].activeBg} ${SINGLE_SUITE[activeSingleSlide].btnGlow}` : `w-2.5 ${s.sliderIndicatorIdle}`}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-bold text-zinc-500">
                    0{activeSingleSlide + 1} / 0{SINGLE_SUITE.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button onClick={handleSinglePrev} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button onClick={handleSingleNext} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}>
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
  
          {/* 💡 구글 봇이 환장하는 신뢰도 링킹 존 */}
          <div className="flex items-center gap-4 text-zinc-500">
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
          </div>
          
          <div>LABGG.PRO © 2026</div>
        </footer>

    </div>
  );
}