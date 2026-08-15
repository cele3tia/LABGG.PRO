"use client";

import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { challenges } from "@/app/lib/challenges";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors duration-300 relative" 
      style={{ 
        backgroundColor: "var(--c-bg)", 
        color: "var(--c-text1)",
        // 은은한 도트 패턴 배경
        backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }}
    >
      
      {/* 🚀 글로벌 스타일 & 등장 애니메이션 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        html, body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }

        :root, [data-theme="light"] {
          --c-bg: #fcfcfc; 
          --c-border: rgba(0, 0, 0, 0.08); 
          --c-dot: rgba(0, 0, 0, 0.06); 
          --c-text1: #111111; 
          --c-text2: #555555; 
          --c-text3: #999999;
          --c-accent: #3B82F6; 
        }
        .dark, [data-theme="dark"] {
          --c-bg: #0a0a0a; 
          --c-border: rgba(255, 255, 255, 0.08); 
          --c-dot: rgba(255, 255, 255, 0.04); 
          --c-text1: #f3f3f3; 
          --c-text2: #aaaaaa; 
          --c-text3: #666666;
          --c-accent: #FF5500; 
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
      `}} />

      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-12 flex flex-col justify-center pt-24 pb-32">
        <div className="mb-10 sm:mb-12 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <h1 className="text-[2.5rem] sm:text-[3.25rem] font-bold tracking-[-0.04em] leading-tight mb-3" style={{ color: "var(--c-text1)" }}>
            Select Challenge.
          </h1>
          <p className="font-mono text-xs tracking-[0.15em] uppercase" style={{ color: "var(--c-text3)" }}>
            benchmark your physical limits
          </p>
        </div>

        <div className="flex flex-col relative">
          <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: "var(--c-border)" }} />

          {challenges.map((chal, idx) => (
            <button
              key={chal.id}
              onClick={() => router.push(`/${chal.id}`)}
              className="group relative flex items-center justify-between w-full py-5 sm:py-6 focus:outline-none animate-fade-in-up text-left"
              style={{ animationDelay: `${(idx + 1) * 70}ms` }}
            >
              <div className="absolute bottom-0 left-0 w-full h-[1px] transition-opacity duration-300 group-hover:opacity-0" style={{ background: "var(--c-border)" }} />

              <div className="absolute inset-x-[-1rem] sm:inset-x-[-1.5rem] inset-y-0 bg-black/[0.03] dark:bg-white/[0.04] rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] -z-10" />

              <div className="flex items-center gap-5 sm:gap-6 relative z-10 transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5">
                <span className="font-mono text-xs sm:text-sm font-semibold transition-colors duration-300 group-hover:text-[#111] dark:group-hover:text-white" style={{ color: "var(--c-text3)" }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.02em] uppercase transition-colors duration-300" style={{ color: "var(--c-text1)" }}>
                  {chal.name}
                </h2>
              </div>

              <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-transparent bg-transparent group-hover:bg-white dark:group-hover:bg-[#1a1a1a] group-hover:border-black/5 dark:group-hover:border-white/5 group-hover:shadow-sm transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] overflow-hidden">
                <ArrowRight 
                  className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 -translate-x-5 transition-all duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-hover:translate-x-0" 
                  style={{ color: "var(--c-text1)" }} 
                />
              </div>
            </button>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-white/60 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-t border-black/[0.05] dark:border-white/[0.05] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}