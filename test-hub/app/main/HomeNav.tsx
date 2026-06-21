// app/main/HomeNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
// 💡 한 단계 위의 공용 컴포넌트 폴더를 참조
import RealTimeOnlineCounter from '../components/RealTimeOnlineCounter'; 

export default function HomeNav({ lang, onLangChange, user, dbDisplayName, level, t, s, getLevelBadgeColor }: any) {
  return (
    <nav className={`relative z-50 w-full ${s.nav} border-b`}>
      <div className="w-full px-5 sm:px-10 lg:px-12 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
        
        <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-6 font-mono text-xs font-bold">
          <Link href="/" className={`text-base font-sans tracking-tight font-black transition-colors ${s.logoText}`}>
            LABGG.PRO
          </Link>
          <div className="w-[1px] h-3 bg-zinc-800/50 hidden md:block" />
          
          <div className="relative flex items-center bg-zinc-900/40 border border-zinc-800/60 rounded-full p-[3px] text-[10px] font-mono font-bold select-none backdrop-blur-md w-[72px] h-[28px]">
            <div className={`absolute top-[3px] bottom-[3px] left-[3px] w-[32px] bg-gradient-to-r from-[#9e38ff] to-[#7928ca] shadow-[0_0_10px_rgba(158,56,255,0.4)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.2,1.4)] ${lang === 'en' ? 'transform translate-x-[32px]' : ''}`} />
            <button onClick={() => onLangChange('ko')} className={`relative z-10 w-[32px] h-full flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${lang === 'ko' ? 'text-white font-black' : 'text-zinc-500 hover:text-zinc-300'}`}>KR</button>
            <button onClick={() => onLangChange('en')} className={`relative z-10 w-[32px] h-full flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${lang === 'en' ? 'text-white font-black' : 'text-zinc-500 hover:text-zinc-300'}`}>EN</button>
          </div>
        </div>

        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 sm:gap-4 font-mono text-[10px]">
          <Link href="/socials" className="text-zinc-500 hover:text-[#9e38ff] transition-all duration-300 transform hover:scale-125 hover:rotate-6 active:scale-90 flex items-center justify-center p-1" aria-label="Instagram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
          </Link>

          {user ? (
            <Link href="/profile" className={`flex items-center gap-2.5 border pl-3 pr-2 py-1 rounded-full transition-all font-sans text-[11px] tracking-tight ${s.profileBox}`}>
              <span className={`font-black tracking-tight ${s.profileName}`}>{dbDisplayName}</span>
              <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full transition-all ${getLevelBadgeColor(level)}`}>{t.lvl}{level}</span>
            </Link>
          ) : (
            <Link href="/login" className="relative inline-flex items-center justify-center font-sans text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full text-zinc-400 border border-zinc-800 bg-zinc-950/30 overflow-hidden transition-all duration-300 hover:text-white hover:border-[#9e38ff] hover:shadow-[0_0_15px_rgba(158,56,255,0.3)] active:scale-95 group/loginbtn">
              <span className="absolute inset-0 z-0 bg-gradient-to-r from-[#9e38ff]/10 to-[#7928ca]/10 transform translate-y-full group-hover/loginbtn:translate-y-0 transition-transform duration-300" />
              <span className="relative z-10 flex items-center gap-1.5">
                {t.loginBtn}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="transform transition-transform duration-300 group-hover/loginbtn:translate-x-1"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </span>
            </Link>
          )}

          <div className="group/live relative flex items-center gap-2 border border-emerald-500/30 bg-[#020617]/50 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-400/50 hover:-translate-y-[1px] transition-all duration-300 cursor-default">
            <span className="absolute inset-0 rounded-full bg-emerald-500/5 opacity-0 group-hover/live:opacity-100 transition-opacity duration-300"></span>
            <span className="relative flex h-1.5 w-1.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80 duration-1000"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_8px_#34d399]"></span>
            </span>
            <div className="relative z-10 text-[10px] font-mono font-black text-emerald-400 flex items-center gap-1.5">
              <RealTimeOnlineCounter /> 
              <span className="text-[8px] tracking-[0.2em] text-emerald-500/60 animate-pulse">LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}