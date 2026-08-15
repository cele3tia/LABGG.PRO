"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./providers";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { lang, toggleLang, t, user } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; 
    } else {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.touchAction = "auto";
    };
  }, [isOpen]);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .linear-font {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }

        @keyframes moonLineGlow {
          0%, 100% { stroke: currentColor; filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0)); }
          50% { stroke: #ffffff; filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 2px rgba(255, 255, 255, 1)); }
        }
        .animate-moon-line-glow { animation: moonLineGlow 3s ease-in-out infinite; }
      `}</style>

      {/* 💻 메인 헤더 */}
      <header className="linear-font flex items-center justify-between px-6 h-14 bg-white/60 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-b border-black/[0.05] dark:border-white/[0.05] fixed inset-x-0 top-0 z-[10000] transition-colors duration-300">
        
        {/* 🚀 텍스트 굵기 한단계 다이어트 (font-semibold -> font-medium) */}
        <Link 
          href="/" 
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-[5px] -translate-x-[6px] md:-translate-x-[2px] group cursor-pointer select-none"
        >
          <img 
            src="/logo-mark-light.png" 
            alt="LABGG Logo" 
            className="w-7 h-7 object-contain dark:invert -translate-y-px"
          />
          <span className="text-lg font-medium tracking-tighter text-[#111] dark:text-white transition-opacity duration-300 group-hover:opacity-70">
            Labgg.pro
          </span>
        </Link>

        {/* 💻 우측 영역 */}
        <div className="flex items-center h-full">
          
          {/* 💻 데스크탑 전용 메뉴 */}
          <div className="hidden md:flex items-center gap-5 sm:gap-6">
            <Link href="/leaderboard" className="text-[11px] font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400 hover:text-[#111] dark:hover:text-gray-200 transition-colors cursor-pointer">
              {t.leaderboard}
            </Link>
            <button onClick={toggleLang} className="text-[11px] font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400 hover:text-[#111] dark:hover:text-gray-200 transition-colors cursor-pointer">
              {lang === "ko" ? "KO" : "EN"}
            </button>
            
            <a href="https://discord.gg/SxYwEx2xN8" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-[#111] dark:hover:text-gray-200">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
            </a>
            <a href="https://www.instagram.com/labgg.pro/" target="_blank" rel="noopener noreferrer" className="text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-[#111] dark:hover:text-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>

            {user ? (
              <Link href="/profile" className="text-[11px] font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-[#111] dark:hover:text-gray-200">
                {t.profile}
              </Link>
            ) : (
              <Link href="/login" className="text-[11px] font-medium tracking-widest uppercase text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-[#111] dark:hover:text-gray-200">
                {t.login}
              </Link>
            )}

            <button onClick={toggleTheme} className="group relative flex items-center justify-center w-7 h-7 ml-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-300 overflow-hidden">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`absolute text-[#111] dark:text-gray-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 group-hover:rotate-45 group-hover:scale-110"}`}>
                <circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`absolute text-gray-400 dark:text-gray-300 group-hover:text-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-moon-line-glow ${isDark ? "opacity-100 rotate-0 scale-100 group-hover:-rotate-12 group-hover:scale-110" : "opacity-0 -rotate-90 scale-50"}`}>
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
              </svg>
            </button>
          </div>

          {/* 📱 모바일 전용 영역 */}
          <div className="flex md:hidden items-center gap-3">
            {user ? (
              <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center justify-center px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[#111] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-200">
                {t.profile}
              </Link>
            ) : (
              <Link href="/login" onClick={() => setIsOpen(false)} className="flex items-center justify-center px-3.5 py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-[#111] dark:text-white text-[13px] font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-colors duration-200">
                {t.login}
              </Link>
            )}

            <button 
              className="relative w-8 h-8 flex items-center justify-center text-[#111] dark:text-white focus:outline-none -mr-1"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle Menu"
            >
              <div className="relative w-4 h-4">
                <span className={`absolute left-0 top-1/2 w-full h-[1px] bg-current origin-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "rotate-45" : "-translate-y-1"}`} />
                <span className={`absolute left-0 top-1/2 w-full h-[1px] bg-current origin-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "-rotate-45" : "translate-y-1"}`} />
              </div>
            </button>
          </div>

        </div>
      </header>

      {/* 🚀 라이트/다크 반투명 글래스 유지 (모바일 메뉴) */}
      <div 
        className={`linear-font md:hidden fixed inset-0 z-[9998] bg-white/40 dark:bg-[#0a0a0a]/70 backdrop-blur-lg pt-14 transform transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
      >
        <div className="flex flex-col flex-1 px-8 py-10 gap-12 overflow-y-auto pb-20">
          
          <div className={`flex flex-col gap-5 transition-all duration-500 delay-100 ease-out ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t.system || "System"}</span>
            <Link href="/leaderboard" onClick={() => setIsOpen(false)} className="text-2xl font-medium tracking-tight text-[#111] dark:text-white hover:opacity-70 transition-opacity">
              {t.leaderboard}
            </Link>
            <Link href={user ? "/profile" : "/login"} onClick={() => setIsOpen(false)} className="text-2xl font-medium tracking-tight text-[#111] dark:text-white hover:opacity-70 transition-opacity">
              {user ? t.profile : t.login}
            </Link>
          </div>

          <div className={`flex flex-col gap-5 transition-all duration-500 delay-150 ease-out ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{t.social || "Social"}</span>
            <a href="https://discord.gg/SxYwEx2xN8" target="_blank" rel="noopener noreferrer" className="text-2xl font-medium tracking-tight text-[#111] dark:text-white hover:opacity-70 transition-opacity">
              Discord
            </a>
            <a href="https://www.instagram.com/labgg.pro/" target="_blank" rel="noopener noreferrer" className="text-2xl font-medium tracking-tight text-[#111] dark:text-white hover:opacity-70 transition-opacity">
              Instagram
            </a>
          </div>

          <div className={`flex flex-col gap-5 transition-all duration-500 delay-200 ease-out ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 border-t border-black/[0.05] dark:border-white/[0.05] pt-8">{t.preferences || "Preferences"}</span>
            
            <button onClick={toggleLang} className="w-full flex items-center justify-between py-2 group focus:outline-none">
              <span className="text-lg font-medium tracking-tight text-[#111] dark:text-white group-hover:opacity-70 transition-opacity">{t.language || "Language"}</span>
              <span className="text-sm font-bold tracking-widest text-gray-400 group-hover:text-[#111] dark:group-hover:text-white transition-colors">
                {lang === "ko" ? "KO" : "EN"}
              </span>
            </button>

            <button onClick={toggleTheme} className="w-full flex items-center justify-between py-2 group focus:outline-none">
              <span className="text-lg font-medium tracking-tight text-[#111] dark:text-white group-hover:opacity-70 transition-opacity">{t.theme || "Theme"}</span>
              <span className="text-sm font-bold tracking-widest text-gray-400 group-hover:text-[#111] dark:group-hover:text-white transition-colors">
                {isDark ? (t.dark || "DARK") : (t.light || "LIGHT")}
              </span>
            </button>
          </div>
          
        </div>
      </div>
    </>
  );
}