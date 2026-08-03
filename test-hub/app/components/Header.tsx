"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 렌더링 에러 방지
  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) return null; // 깜빡임 방지

  return (
    // 다크 모드일 때 배경을 검은색으로 변경 (dark:bg-[#0a0a0a])
    <header className="flex items-center justify-between px-8 py-5 bg-white dark:bg-[#0a0a0a] border-b border-gray-100 dark:border-gray-900 sticky top-0 z-50 transition-colors duration-300">
      
      <div className="text-xl font-bold tracking-tight text-black dark:text-white select-none cursor-pointer">
        LABGG.PRO
      </div>

      <button
        onClick={toggleTheme}
        className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300 overflow-hidden"
        aria-label="Toggle Theme"
      >
        {/* 해 아이콘 (Light Mode) */}
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`absolute text-gray-700 dark:text-gray-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 group-hover:rotate-45 group-hover:scale-110"
          }`}
        >
          <circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>
        </svg>

        {/* 달 아이콘 (Dark Mode) */}
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`absolute text-gray-700 dark:text-gray-200 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isDark ? "opacity-100 rotate-0 scale-100 group-hover:-rotate-12 group-hover:scale-110" : "opacity-0 -rotate-90 scale-50"
          }`}
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
        </svg>
      </button>
    </header>
  );
}