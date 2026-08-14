"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-300" style={{ background: "var(--c-bg)", color: "var(--c-text1)" }}>
      
      {/* 헤더/푸터가 깨지지 않도록 기본 테마 변수만 유지 */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root, [data-theme="light"] {
          --c-bg: #f9fafb; --c-panel-bright: #ffffff; --c-panel-muted: #f3f4f6; --c-border: #e5e7eb;
          --c-text1: #111827; --c-text2: #6b7280; --c-text3: #9ca3af;
          --c-accent: #3B82F6; --c-accent-dim: rgba(59, 130, 246, 0.15); --c-accent-fg: #ffffff; 
        }
        .dark, [data-theme="dark"] {
          --c-bg: oklch(0.10 0.006 30); --c-panel-bright: oklch(0.17 0.015 35); --c-panel-muted: oklch(0.13 0.01 30); --c-border: oklch(0.26 0.012 30);
          --c-text1: oklch(0.97 0 0); --c-text2: oklch(0.62 0.01 30); --c-text3: oklch(0.42 0.01 30);
          --c-accent: #FF5500; --c-accent-dim: rgba(255, 85, 0, 0.25); --c-accent-fg: #000000; 
        }
      `}} />

      {/* 상단 헤더 */}
      <Header />

      {/* 텅 빈 메인 화면 */}
      <main className="flex-1 w-full max-w-[1500px] mx-auto px-4 md:px-12 flex flex-col items-center justify-center">
      </main>

      {/* 하단 푸터 */}
      <Footer />
      
    </div>
  );
}
