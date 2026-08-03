"use client";

import Header from "./components/Header";
import Footer from "./components/Footer";
import { useLanguage } from "./components/providers";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300">
      
      <Header />

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center">
        {/* 문구가 제거된 빈 캔버스 상태 */}
      </main>

      <Footer />

    </div>
  );
}