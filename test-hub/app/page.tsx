"use client";

import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { challenges } from "@/app/lib/challenges";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--c-bg)", color: "var(--c-text1)" }}>
      
      {/* 🚀 극강의 미니멀리즘 + Inter 폰트 전체 강제 적용 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        /* 페이지 전체에 Inter 폰트 및 선명한 렌더링 강제 이식 */
        html, body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }

        /* 🚀 배경색 및 텍스트 톤 다운 (완전 흑/백 탈피, 은은한 고급 그레이) */
        :root, [data-theme="light"] {
          --c-bg: #f9f9f9; /* 완전 흰색에서 눈이 편안한 은은한 밝은 회색으로 */
          --c-border: #eaeaea; 
          --c-text1: #111111; /* 완전 검정보다 살짝 부드러운 다크 그레이 텍스트 */
          --c-text2: #666666; 
          --c-text3: #a0a0a0;
          --c-accent: #3B82F6; 
        }
        .dark, [data-theme="dark"] {
          --c-bg: #0a0a0a; /* 완전 검정에서 헤더와 완벽히 이어지는 프리미엄 다크 그레이로 */
          --c-border: #1a1a1a; 
          --c-text1: #f3f3f3; /* 완전 흰색보다 눈부심이 적은 오프 화이트 텍스트 */
          --c-text2: #888888; 
          --c-text3: #444444;
          --c-accent: #FF5500; 
        }
      `}} />

      <Header />

      {/* 메인 영역: 중앙 정렬 & 좁은 폭(max-w-3xl)으로 텍스트 집중도 극대화 */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-12 flex flex-col justify-center py-20">
        
        {/* 타이틀: font-bold 로 세련되게 다이어트 */}
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-3" style={{ color: "var(--c-text1)" }}>
            Select Challenge.
          </h1>
          <p className="font-mono text-sm tracking-widest uppercase" style={{ color: "var(--c-text3)" }}>
            benchmark your physical limits
          </p>
        </div>

        {/* 리스트: Linear 스타일의 얇은 선 & 섬세한 호버 액션 */}
        <div className="flex flex-col border-t" style={{ borderColor: "var(--c-border)" }}>
          {challenges.map((chal, idx) => (
            <button
              key={chal.id}
              onClick={() => router.push(`/${chal.id}`)}
              className="group flex items-center justify-between py-6 sm:py-8 border-b transition-all duration-300 focus:outline-none hover:bg-black/5 dark:hover:bg-white/[0.02] px-4 -mx-4 rounded-xl"
              style={{ borderColor: "var(--c-border)" }}
            >
              <div className="flex items-baseline gap-6 sm:gap-8 transition-transform duration-300 group-hover:translate-x-2">
                {/* 인덱스 (모노스페이스) */}
                <span className="font-mono text-xs sm:text-sm transition-colors duration-300" style={{ color: "var(--c-text3)" }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                
                {/* 챌린지 이름: font-medium 으로 얇고 시크하게 */}
                <h2 className="text-xl sm:text-3xl font-medium tracking-tight uppercase transition-colors duration-300 group-hover:text-[var(--c-accent)]" style={{ color: "var(--c-text2)" }}>
                  {chal.name}
                </h2>
              </div>

              {/* 호버 시 나타나는 화살표 (Linear 특유의 스윽 밀려들어오는 애니메이션) */}
              <div className="overflow-hidden flex items-center justify-center w-8">
                <ArrowRight 
                  className="w-5 h-5 sm:w-6 sm:h-6 opacity-0 -translate-x-4 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0" 
                  style={{ color: "var(--c-accent)" }} 
                />
              </div>
            </button>
          ))}
        </div>

      </main>

      <Footer />
    </div>
  );
}