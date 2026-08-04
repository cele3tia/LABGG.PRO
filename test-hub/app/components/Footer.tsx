"use client";

import Link from "next/link";
import { useLanguage } from "./providers";

export default function Footer() {
  const { lang } = useLanguage();

  return (
    <footer className="relative flex items-center justify-center px-6 py-4 bg-white dark:bg-[#0a0a0a] border-t border-gray-100 dark:border-gray-900 text-[11px] text-gray-400 transition-colors duration-300">
      
      <div className="flex items-center gap-4">
        <Link 
          href="/privacy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-black dark:hover:text-gray-200 transition-colors"
        >
          {lang === "ko" ? "개인정보처리방침" : "Privacy Policy"}
        </Link>
      </div>

      <a 
        href="mailto:labggpro@gmail.com"
        className="absolute right-6 hover:text-black dark:hover:text-gray-200 transition-colors tracking-tighter"
      >
        labggpro@gmail.com
      </a>

    </footer>
  );
}