'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MagicRings from '../components/MagicRings'; 

export default function SocialsPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);
    
    // 🎬 페이지 진입 시 부드러운 솟아오름 애니메이션 트리거
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const t = {
    ko: {
      title: 'CONNECT WITH US',
      desc: 'LABGG.PRO의 최신 업데이트와 피지컬 챌린지 소식을 가장 먼저 만나보세요.',
      back: '← 메인 화면으로',
      instaDesc: '공식 인스타그램 채널 리다이렉트',
    },
    en: {
      title: 'CONNECT WITH US',
      desc: 'Be the first to catch the latest updates and physical challenge news from LABGG.PRO.',
      back: '← Back to Home',
      instaDesc: 'Redirect to Official Instagram',
    }
  }[lang];

  return (
    <div className="relative min-h-screen bg-black text-[#e4e4e7] font-sans antialiased selection:bg-white selection:text-black overflow-hidden tracking-tight flex flex-col justify-between">
      
      {/* ✨ 보라색 매직링 배경 ✨ */}
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-60">
        <MagicRings
          color="#d9b2ff"
          colorTwo="#9e38ff"
          ringCount={6}
          speed={1.2}
          attenuation={8}
          lineThickness={4}
          baseRadius={0.4}
          radiusStep={0.08}
          scaleRate={0.08}
          opacity={1}
          blur={6}
          noiseAmount={0.05}
          rotation={45}
          ringGap={1.4}
          clickBurst={false}
        />
      </div>

      {/* 테크니컬 모눈종이 그리드 */}
      <div className="absolute inset-0 z-[1] pointer-events-none select-none opacity-40" 
           style={{ backgroundImage: 'linear-gradient(to right, rgba(39,39,42,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* 상단 뒤로가기 바 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6">
        <Link href="/" className="text-xs font-mono font-black text-zinc-500 hover:text-white transition-colors tracking-widest uppercase">
          {t.back}
        </Link>
      </header>

      {/* 메인 빌드 구역 */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 max-w-3xl mx-auto text-center pb-24">
        
        {/* 헤더 텍스트 애니메이션 */}
        <div className={`transition-all duration-1000 transform space-y-4 ${isMounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-white font-sans bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
            {t.title}
          </h1>
          <p className="text-sm font-medium text-zinc-500 max-w-md mx-auto leading-relaxed">
            {t.desc}
          </p>
        </div>

        {/* 🎬 인스타그램 프리미엄 카드 (푸터 및 불빛 제거 버전) 🎬 */}
        <div className={`w-full mt-12 transition-all duration-1000 delay-200 transform ${isMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
          <a 
            href="https://www.instagram.com/labgg.pro" // 💡 LABGG 인스타 링크 연동 완료!
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block w-full p-[1px] rounded-3xl bg-zinc-900 overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(158,56,255,0.25)]"
          >
            {/* Hover 시 뒤에서 회전하는 네온 그라데이션 광원 테두리 */}
            <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#ff007f] via-[#9e38ff] to-[#42fcff] animate-spin" style={{ animationDuration: '4s' }} />

            {/* 카드 본체 내부 */}
            <div className="relative z-10 bg-[#070709]/95 backdrop-blur-3xl rounded-[23px] p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              
              <div className="flex items-center gap-6">
                {/* 인스타 아이콘 무브먼트 스케일 */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] flex items-center justify-center text-white shadow-lg shadow-purple-900/20 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <span className="font-mono text-[10px] font-black text-[#9e38ff] tracking-widest uppercase block">
                    INSTAGRAM CHANNEL
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    @LABGG.PRO
                  </h2>
                  <p className="text-xs font-medium text-zinc-500">
                    {t.instaDesc}
                  </p>
                </div>
              </div>

              {/* 오른쪽 진입 화살표 버튼 (안정적 메시지 제거하고 버튼만 깔끔하게 정렬) */}
              <div className="flex flex-col items-end justify-center font-mono text-zinc-600">
                <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center bg-zinc-950 text-zinc-400 transition-all duration-300 group-hover:border-[#9e38ff] group-hover:text-white group-hover:translate-x-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>

            </div>
          </a>
        </div>

      </main>

      {/* 💡 푸터 구역 빈 공간으로 깔끔하게 마감 (기존 footer 태그 삭제) */}
      <div className="w-full py-3" />

    </div>
  );
}