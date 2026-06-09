'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResultContent() {
  const searchParams = useSearchParams();
  
  // URL에서 게임 종류(type)와 점수(score)를 읽어옵니다.
  // 예시: /result?type=cps&score=11.4
  const type = searchParams.get('type') || 'unknown';
  const score = searchParams.get('score') || '0';

  // 게임 타입별 스튜디오 감성의 메타데이터 매핑
  const meta: Record<string, { unit: string; name: string; desc: string }> = {
    reaction: {
      unit: 'ms',
      name: 'Visual Reaction Time',
      desc: Number(score) <= 160 
        ? "⚡ Elite reflex velocity. Your nerve conduction speed aligns with top-tier professional esports athletes."
        : "Standard physical processing speed verified. Fully stable telemetry latency."
    },
    cps: {
      unit: 'CPS',
      name: 'Clicks Per Second',
      desc: Number(score) >= 12 
        ? "⚡ Insane motor-skill frequency. Your muscle twitch capability exceeds standard hardware design limits."
        : "Consistent physical micro-actuation rate. Well-synchronized switch cycle."
    },
    unknown: { 
      unit: '', 
      name: 'Unknown Module', 
      desc: 'No diagnostic data retrieved.' 
    }
  };

  const current = meta[type] || meta.unknown;

  return (
    <div className="w-full max-w-md bg-[#0c0c0c] border border-zinc-900 rounded-3xl p-10 text-center space-y-10 shadow-2xl">
      
      {/* 결과 타이포그래피 영역 */}
      <div className="space-y-2">
        <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase block">
          Diagnostic Report // {current.name}
        </span>
        <h2 className="text-5xl font-black tracking-tight font-mono text-white">
          {score}
          <span className="text-lg text-zinc-500 ml-1 font-sans font-normal">
            {current.unit}
          </span>
        </h2>
      </div>

      {/* 팩트 기반 정밀 텍스트 분석 피드백 */}
      <div className="p-5 bg-zinc-950 border border-zinc-900 rounded-xl text-left">
        <p className="text-xs text-zinc-400 leading-relaxed font-light">
          {current.desc}
        </p>
      </div>

      {/* 유저 행동 제어 버튼 (경로에서 /test/ 제거완료) */}
      <div className="flex gap-4 pt-4">
        <Link 
          href={`/${type}`} 
          className="flex-1 text-center bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-xl border border-zinc-800 transition"
        >
          Retake Test
        </Link>
        <Link 
          href="/" 
          className="flex-1 text-center bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wider py-4 rounded-xl transition"
        >
          Dashboard
        </Link>
      </div>

    </div>
  );
}

export default function ResultPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5] flex flex-col">
      
      {/* 미니멀 헤더 로고 */}
      <header className="h-20 border-b border-zinc-900/60 flex items-center px-10 shrink-0">
        <Link href="/" className="font-black italic tracking-tighter text-base text-white">
          LAB<span className="text-zinc-600">.GG</span>
        </Link>
      </header>

      {/* 메인 뷰포트 센터링 */}
      <main className="flex-1 flex items-center justify-center p-6">
        {/* Next.js 정적 빌드 시 useSearchParams 에러를 막기 위한 무조건적인 필수 조치 */}
        <Suspense fallback={<div className="text-xs text-zinc-500 font-mono tracking-widest">COMPILING TELEMETRY...</div>}>
          <ResultContent />
        </Suspense>
      </main>

    </div>
  );
}