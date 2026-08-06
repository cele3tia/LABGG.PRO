"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "./providers";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { lang, toggleLang, t, user } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-900 sticky top-0 z-50 transition-colors duration-300">
      
      <style jsx global>{`
        @keyframes moonLineGlow {
          0%, 100% {
            stroke: currentColor;
            filter: drop-shadow(0 0 0px rgba(255, 255, 255, 0));
          }
          50% {
            stroke: #ffffff;
            filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 2px rgba(255, 255, 255, 1));
          }
        }
        .animate-moon-line-glow {
          animation: moonLineGlow 3s ease-in-out infinite;
        }
      `}</style>

      {/* 로고 텍스트 */}
      <Link 
        href="/" 
        className="text-lg font-bold tracking-tight text-black dark:text-gray-200 transition-opacity duration-200 hover:opacity-50 select-none cursor-pointer"
      >
        LABGG.PRO
      </Link>

      <div className="flex items-center gap-5 sm:gap-6">
        
        {/* 🚀 리더보드 (다국어 t.leaderboard 적용) */}
        <Link 
          href="/leaderboard" 
          className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          {t.leaderboard}
        </Link>

        {/* 언어 변경 버튼 */}
        <button
          onClick={toggleLang}
          className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          {lang === "ko" ? "KO" : "EN"}
        </button>

        {/* 디스코드 아이콘 */}
        <a 
          href="https://discord.gg/SxYwEx2xN8" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-black dark:hover:text-gray-200" 
          aria-label="Discord"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
          </svg>
        </a>

        {/* 인스타그램 아이콘 */}
        <a 
          href="https://www.instagram.com/labgg.pro/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-black dark:hover:text-gray-200" 
          aria-label="Instagram"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>

        {/* 로그인/프로필 */}
        {user ? (
          <Link href="/profile" className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-black dark:hover:text-gray-200">
            {t.profile}
          </Link>
        ) : (
          <Link href="/login" className="text-[10px] font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 transition-colors duration-200 hover:text-black dark:hover:text-gray-200">
            {t.login}
          </Link>
        )}

        {/* 테마 변경 버튼 */}
        <button
          onClick={toggleTheme}
          className="group relative flex items-center justify-center w-7 h-7 ml-4 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300 overflow-hidden"
          aria-label="Toggle Theme"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`absolute text-gray-500 dark:text-gray-400 group-hover:text-black dark:group-hover:text-gray-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 group-hover:rotate-45 group-hover:scale-110"
            }`}
          >
            <circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
          
          <svg
            xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`absolute text-gray-400 dark:text-gray-300 group-hover:text-black dark:group-hover:text-gray-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] animate-moon-line-glow ${
              isDark ? "opacity-100 rotate-0 scale-100 group-hover:-rotate-12 group-hover:scale-110" : "opacity-0 -rotate-90 scale-50"
            }`}
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        </button>

      </div>
    </header>
  );
}