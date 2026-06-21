'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// 공용 컴포넌트 임포트
import MagicRings from './components/MagicRings'; 
import Leaderboard from './components/Leaderboard';
import BorderGlow from './components/BorderGlow';

// main/ 폴더로 분리한 부품들 불러오기
import HomeNav from './main/HomeNav'; 
import { TRANSLATIONS, themeStyles as s, getLevelBadgeColor } from './main/homeData'; 

// 파이어베이스 임포트
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getUserStats } from './lib/recordService';

export default function LandingPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('en'); 
  const [user, setUser] = useState<User | null>(null);

  const [level, setLevel] = useState<number>(1);
  const [dbDisplayName, setDbDisplayName] = useState<string>('');
  const [fbStats, setFbStats] = useState({ reactionBest: '---', cpsBest: '---', precisionBest: '---' });

  const [activeMultiSlide, setActiveMultiSlide] = useState(0);
  const [activeSingleSlide, setActiveSingleSlide] = useState(0);

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) {
      setTimeout(() => setLang(savedLang), 0);
    } else {
      setLang('en'); 
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const data = await getUserStats(currentUser.uid);
        if (data) {
          setFbStats({
            reactionBest: data.reactionBest ? `${data.reactionBest}ms` : '---',
            cpsBest: data.cpsBest ? `${data.cpsBest} CPS` : '---',
            precisionBest: data.precisionBest ? `± ${data.precisionBest}s` : '---'
          });
        }
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          setLevel(dbData.level || 1);
          setDbDisplayName(dbData.displayName || currentUser.displayName || 'Player');
        } else {
          setDbDisplayName(currentUser.displayName || 'Player');
        }
      } else {
        setFbStats({ reactionBest: '---', cpsBest: '---', precisionBest: '---' });
        setDbDisplayName('');
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
      setActiveSingleSlide((prev) => (prev === 2 ? 0 : prev + 1));
    }, 5000);
    return () => clearTimeout(singleTimer);
  }, [activeSingleSlide]);

  const handleLangChange = (newLang: 'ko' | 'en') => {
    setLang(newLang);
    localStorage.setItem('site-lang', newLang);
  };

  const t = TRANSLATIONS[lang];

  const MULTI_SUITE = [
    { id: 'casual', name: t.modes.normal.name, label: 'CASUAL MATCH', desc: t.modes.normal.desc, path: '/match/normal', activeColor: 'text-emerald-400', activeBg: 'bg-emerald-500', btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', dotColor: 'rgba(16,185,129,0.15)' },
    { id: 'ranked', name: t.modes.ranked.name, label: 'COMPETITIVE RANKED', desc: t.modes.ranked.desc, path: '/match/ranked', activeColor: 'text-rose-400', activeBg: 'bg-rose-500', btnGlow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]', dotColor: 'rgba(244,63,94,0.15)' },
    { id: 'custom', name: t.modes.custom.name, label: 'PRIVATE CUSTOM', desc: t.modes.custom.desc, path: '/match/custom', activeColor: 'text-purple-400', activeBg: 'bg-purple-500', btnGlow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]', dotColor: 'rgba(168,85,247,0.15)' }
  ];

  const SINGLE_SUITE = [
    { id: 'precision', name: t.tests.precision.name, label: t.tests.precision.label, desc: t.tests.precision.desc, stat: t.tests.precision.stat, myScore: fbStats.precisionBest, path: '/untitled', activeColor: 'text-violet-400', activeBg: 'bg-violet-500', btnGlow: 'shadow-[0_0_15px_rgba(139,92,246,0.2)]', dotColor: 'rgba(139,92,246,0.15)', isNew: true },
    { id: 'reaction', name: t.tests.reaction.name, label: t.tests.reaction.label, desc: t.tests.reaction.desc, stat: t.tests.reaction.stat, myScore: fbStats.reactionBest, path: '/reaction', activeColor: 'text-emerald-400', activeBg: 'bg-emerald-500', btnGlow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', dotColor: 'rgba(16,185,129,0.15)', isNew: false },
    { id: 'cps', name: t.tests.cps.name, label: t.tests.cps.label, desc: t.tests.cps.desc, stat: t.tests.cps.stat, myScore: fbStats.cpsBest, path: '/cps', activeColor: 'text-cyan-400', activeBg: 'bg-cyan-500', btnGlow: 'shadow-[0_0_15px_rgba(34,211,238,0.2)]', dotColor: 'rgba(34,211,238,0.15)', isNew: false }
  ];

  const handleMultiPrev = () => setActiveMultiSlide((prev) => (prev === 0 ? MULTI_SUITE.length - 1 : prev - 1));
  const handleMultiNext = () => setActiveMultiSlide((prev) => (prev === MULTI_SUITE.length - 1 ? 0 : prev + 1));
  const handleSinglePrev = () => setActiveSingleSlide((prev) => (prev === 0 ? SINGLE_SUITE.length - 1 : prev - 1));
  const handleSingleNext = () => setActiveSingleSlide((prev) => (prev === SINGLE_SUITE.length - 1 ? 0 : prev + 1));

  return (
    <div className={`relative min-h-screen ${s.bg} font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight`}>
      
      {/* 백그라운드 매직 링 */}
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-80">
        <MagicRings color="#d9b2ff" colorTwo="#9e38ff" ringCount={6} speed={1} attenuation={10} lineThickness={6} baseRadius={0.35} radiusStep={0.1} scaleRate={0.1} opacity={1} blur={5} noiseAmount={0.1} rotation={0} ringGap={1.5} fadeIn={0.7} fadeOut={0.5} followMouse={false} mouseInfluence={0.2} hoverScale={1.2} parallax={0.05} clickBurst={true} />
      </div>

      {/* 넷 그리드 배경 */}
      <div className="absolute inset-x-0 bottom-0 top-24 z-[1] pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: s.gridLine, backgroundSize: '40px 40px' }} />
      </div>

      {/* 상단 내비게이션 바 컴포넌트 */}
      <HomeNav 
        lang={lang} 
        onLangChange={handleLangChange} 
        user={user} 
        dbDisplayName={dbDisplayName} 
        level={level} 
        t={t} 
        s={s} 
        getLevelBadgeColor={getLevelBadgeColor} 
      />

      {/* 메인 무대 */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 pt-16 pb-32">
        
        {/* 히어로 타이틀 */}
        <div className="max-w-4xl mb-14">
          <h1 className="group/title inline-block cursor-default text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tighter mb-4">
            <span className="transition-colors">{t.title1}</span><br />
            <span className={`block mt-2 transition-colors ${s.title2}`}>{t.title2}</span>
          </h1>
          <p className="max-w-lg font-medium text-sm transition-colors text-zinc-400">{t.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          
          <div className="lg:col-span-7 flex flex-col justify-between gap-10">
            
            {/* 🕹️ 멀티플레이어 슬라이더 */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2.5 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse"></span>
                <span>{"// "}{t.multiplayerTitle}</span>
                <span className="text-[8px] font-sans font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded tracking-normal scale-90 origin-left">{t.multiplayerBadge}</span>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl group/slider flex-1 min-h-[220px] flex flex-col">
                <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] flex-1" style={{ transform: `translateX(-${activeMultiSlide * 100}%)` }}>
                  {MULTI_SUITE.map((mode) => (
                    <div key={mode.id} className="min-w-full px-1 py-1.5 flex flex-col">
                      <BorderGlow backgroundColor="#0c0c0e" glowColor="277 100 65" colors={['#9e38ff', '#ff007f', '#42fcff']} borderRadius={22} className="flex-1 flex flex-col group/glowcard">
                        {/* 💡 onClick을 심어서 경쟁전 시도하는 익명 게스트 차단 구현 */}
                        <Link 
                          href={mode.path} 
                          onClick={(e) => {
                            if (mode.id === 'ranked' && auth.currentUser?.isAnonymous) {
                              e.preventDefault(); // 페이지 이동을 전면 정지
                              alert(lang === 'ko' 
                                ? '🔒 게스트 모드에서는 경쟁전에 참여할 수 없습니다. 로그인해 주세요!' 
                                : '🔒 Guest accounts cannot play Ranked Match. Please Sign In!');
                            }
                          }}
                          className="relative p-7 sm:p-9 flex-1 flex flex-col justify-between transition-transform duration-300 group-hover/glowcard:scale-[1.01]"
                        >
                          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.85] mix-blend-normal" style={{ backgroundImage: `radial-gradient(${mode.dotColor} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />
                          <div className="space-y-2 pt-1 relative z-10">
                            <div className="flex justify-between items-center">
                              <span className={`font-mono text-[10px] font-black tracking-widest uppercase ${mode.activeColor}`}>{mode.label}</span>
                              <div className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all bg-zinc-500/5 border-zinc-500/10 group-hover/glowcard:scale-110 group-hover/glowcard:border-[#9e38ff]/30">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={mode.activeColor}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                              </div>
                            </div>
                            <h3 className={`text-2xl font-bold tracking-tight leading-tight ${s.sliderTitle}`}>{mode.name}</h3>
                            <p className={`text-xs font-medium max-w-md leading-relaxed line-clamp-3 ${s.textDesc}`}>{mode.desc}</p>
                          </div>
                        </Link>
                      </BorderGlow>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {MULTI_SUITE.map((_, idx) => (
                      <button key={idx} onClick={() => setActiveMultiSlide(idx)} className={`h-1 rounded-full transition-all duration-500 ${idx === activeMultiSlide ? `w-8 ${MULTI_SUITE[activeMultiSlide].activeBg} ${MULTI_SUITE[activeMultiSlide].btnGlow}` : `w-2.5 ${s.sliderIndicatorIdle}`}`} />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-bold text-zinc-500">0{activeMultiSlide + 1} / 0{MULTI_SUITE.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={handleMultiPrev} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                  <button onClick={handleMultiNext} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                </div>
              </div>
            </div>

            {/* 👤 싱글플레이어 슬라이더 */}
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className={`text-[9px] font-mono font-black tracking-[0.2em] px-1 uppercase flex items-center gap-2 ${s.sectionTitle}`}>
                <span className="w-1 h-1 rounded-full bg-zinc-400"></span>
                <span>{"// "}{t.singleplayerTitle}</span>
              </div>
              
              <div className="relative overflow-hidden rounded-2xl group/slider flex-1 min-h-[260px] flex flex-col">
                <div className="flex transition-transform duration-700 ease-[cubic-bezier(0.2,1,0.3,1)] flex-1" style={{ transform: `translateX(-${activeSingleSlide * 100}%)` }}>
                  {SINGLE_SUITE.map((test) => (
                    <div key={test.id} className="min-w-full px-1 py-1.5 flex flex-col">
                      <BorderGlow backgroundColor="#0c0c0e" glowColor="277 100 65" colors={['#9e38ff', '#ff007f', '#42fcff']} borderRadius={22} className="flex-1 flex flex-col group/glowcard">
                        <Link href={test.path} className="relative p-7 sm:p-9 flex-1 flex flex-col justify-between transition-transform duration-300 group-hover/glowcard:scale-[1.01]">
                          <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.85] mix-blend-normal" style={{ backgroundImage: `radial-gradient(${test.dotColor} 1px, transparent 1px)`, backgroundSize: '14px 14px' }} />
                          <div className="space-y-2 pt-0.5 relative z-10">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className={`font-mono text-[10px] font-black tracking-widest uppercase ${test.activeColor}`}>{test.label}</span>
                                {test.isNew && (
                                  <span className="text-[9px] font-sans font-black px-2 py-0.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded shadow-[0_0_15px_rgba(16,185,127,0.5)] tracking-wider animate-pulse flex items-center gap-1 uppercase">
                                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                                    NEW MODE
                                  </span>
                                )}
                              </div>
                              <div className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all bg-zinc-500/5 border-zinc-500/10 group-hover/glowcard:scale-110 group-hover/glowcard:border-[#9e38ff]/30">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={test.activeColor}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                              </div>
                            </div>
                            <h3 className={`text-2xl font-bold tracking-tight leading-tight ${s.sliderTitle}`}>{test.name}</h3>
                            <p className={`text-xs font-medium max-w-md leading-relaxed line-clamp-2 ${s.textDesc}`}>{test.desc}</p>
                          </div>
                          <div className={`flex flex-col sm:flex-row gap-4 sm:gap-6 border-t pt-5 font-mono text-xs relative z-10 ${s.sliderMutedText}`}>
                            <div className="space-y-0.5">
                              <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.standard}</span>
                              <span className="text-zinc-200 font-black">{test.stat}</span>
                            </div>
                            <div className="space-y-0.5 sm:border-l sm:pl-6 border-zinc-500/10 dark:border-zinc-900/60">
                              <span className="text-[9px] opacity-40 font-bold uppercase tracking-wider block">{t.myBest}</span>
                              <span className={`font-black ${test.activeColor}`}>{test.myScore}</span>
                            </div>
                          </div>
                        </Link>
                      </BorderGlow>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {SINGLE_SUITE.map((_, idx) => (
                      <button key={idx} onClick={() => setActiveSingleSlide(idx)} className={`h-1 rounded-full transition-all duration-500 ${idx === activeSingleSlide ? `w-8 ${SINGLE_SUITE[activeSingleSlide].activeBg} ${SINGLE_SUITE[activeSingleSlide].btnGlow}` : `w-2.5 ${s.sliderIndicatorIdle}`}`} />
                    ))}
                  </div>
                  <span className="font-mono text-[9px] font-bold text-zinc-500">0{activeSingleSlide + 1} / 0{SINGLE_SUITE.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={handleSinglePrev} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                  <button onClick={handleSingleNext} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${s.sliderArrow}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                </div>
              </div>
            </div>

          </div>

          {/* 🏆 리더보드 구역 */}
          <div className={`lg:col-span-5 border rounded-3xl p-6 sm:p-8 backdrop-blur-md h-full lg:min-h-[690px] ${s.leaderboardBg}`}>
            <Leaderboard lang={lang} />
          </div>

        </div>
      </main>

      {/* 📋 푸터 구역 */}
      <footer className={`w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-[9px] font-bold tracking-widest uppercase ${s.footerBorder}`}>
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 rounded-full bg-zinc-500"></div>
          LABGG ENGINE SYSTEM RUNTIME
        </div>
        <div className="flex items-center gap-4 text-zinc-500">
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">{t.terms}</Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">{t.privacy}</Link>
        </div>
        <div>LABGG.PRO © 2026</div>
      </footer>

    </div>
  );
}