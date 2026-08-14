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
      
      {/* 극강의 미니멀리즘을 위한 테마 (순수 블랙/화이트와 아주 얇은 경계선) */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root, [data-theme="light"] {
          --c-bg: #ffffff; --c-border: #eaeaea; 
          --c-text1: #000000; --c-text2: #666666; --c-text3: #a0a0a0;
          --c-accent: #3B82F6; 
        }
        .dark, [data-theme="dark"] {
          --c-bg: #000000; --c-border: #1a1a1a; 
          --c-text1: #ffffff; --c-text2: #888888; --c-text3: #444444;
          --c-accent: #FF5500; 
        }
      `}} />

      <Header />

      {/* 메인 영역: 중앙 정렬 & 좁은 폭(max-w-3xl)으로 텍스트 집중도 극대화 */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 sm:px-12 flex flex-col justify-center py-20">
        
        {/* 타이틀: Monkeytype 스타일의 정갈하고 묵직한 텍스트 */}
        <div className="mb-16">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-3" style={{ color: "var(--c-text1)" }}>
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
              className="group flex items-center justify-between py-6 sm:py-8 border-b transition-all duration-300 focus:outline-none"
              style={{ borderColor: "var(--c-border)" }}
            >
              <div className="flex items-baseline gap-6 sm:gap-8 transition-transform duration-300 group-hover:translate-x-2">
                {/* 인덱스 (모노스페이스) */}
                <span className="font-mono text-xs sm:text-sm transition-colors duration-300" style={{ color: "var(--c-text3)" }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                
                {/* 챌린지 이름 */}
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight uppercase transition-colors duration-300 group-hover:text-[var(--c-accent)]" style={{ color: "var(--c-text2)" }}>
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