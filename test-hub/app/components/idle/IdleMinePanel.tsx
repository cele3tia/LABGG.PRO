'use client';

import React, { useState } from 'react';
import Counter from '../Counter'; 
import { formatNum, getDisplayData, DiamondIcon } from './useIdleEngine';

// 💡 픽스: IntrinsicAttributes 에러를 해결하기 위해 lang: string 타입을 명시적으로 추가!
export default function IdleMinePanel({ engine, lang }: { engine: any, lang: string }) {
  const { bytes, diamonds, effectivePps, effectiveClickPower, isOverclocked, overclockCooldown, setIsOverclocked, setOverclockCooldown, setBytes, setDiamonds } = engine;
  const { num, suffix } = getDisplayData(bytes);
  
  const [clickEffects, setClickEffects] = useState<{ id: number, x: number, y: number, val: string }[]>([]);
  const [isShaking, setIsShaking] = useState(false);

  const handleManualClick = (e: React.MouseEvent) => {
    const now = Date.now();
    setBytes((b: number) => b + effectiveClickPower);
    
    // 다이아 드랍 확률 (0.1%)
    if (Math.random() < 0.001) setDiamonds((d: number) => d + 1);

    const id = now;
    setClickEffects(prev => [...prev, { id, x: e.clientX, y: e.clientY, val: `+${formatNum(effectiveClickPower)}` }]);
    setTimeout(() => setClickEffects(prev => prev.filter(eff => eff.id !== id)), 800);

    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 50);
  };

  return (
    <div className={`flex-1 flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-xl border-2 rounded-[32px] min-h-[600px] shadow-2xl relative overflow-hidden transition-all duration-300 ${isShaking ? 'translate-y-1' : ''} ${isOverclocked ? 'border-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.3)]' : 'border-zinc-800'}`}>
      
      {/* 플로팅 텍스트 애니메이션 */}
      {clickEffects.map(eff => (
        <span key={eff.id} className="fixed z-[100] pointer-events-none font-mono font-black text-white animate-float-up text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ left: eff.x - 20, top: eff.y - 40 }}>
          {eff.val}
        </span>
      ))}

      <style jsx global>{`
        @keyframes float-up {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
        .animate-float-up { animation: float-up 0.8s ease-out forwards; }
      `}</style>

      <div className="mb-12 text-center select-none">
        <div className="flex items-baseline justify-center gap-3">
          <div className={`text-7xl sm:text-8xl font-black font-mono tracking-tighter tabular-nums transition-colors ${isOverclocked ? 'text-rose-400' : 'text-white'}`}>
            <Counter value={num} />
          </div>
          {suffix && <span className="text-5xl font-black text-cyan-400 font-mono">{suffix}</span>}
          <span className="text-2xl font-bold text-zinc-600 ml-1">B</span>
        </div>
        <div className="mt-4 flex justify-center gap-4">
          <div className="px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-400">
            PPS: +{formatNum(effectivePps)}
          </div>
          <div className="px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-800 text-xs font-mono font-bold text-cyan-400 flex items-center gap-2">
            <DiamondIcon /> {formatNum(diamonds)}
          </div>
        </div>
      </div>

      <button 
        onClick={handleManualClick}
        className={`group relative w-full max-w-md py-10 rounded-[40px] border-4 transition-all duration-150 active:scale-95 shadow-2xl select-none ${isOverclocked ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_30px_rgba(244,63,94,0.4)]' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-500'}`}
      >
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-2xl font-black tracking-[0.2em] uppercase">
            {isOverclocked ? (lang === 'ko' ? '초오버클럭 가동' : 'MEGA CHARGE') : (lang === 'ko' ? '코어 주입' : 'CORE INJECT')}
          </span>
          <span className="text-sm font-bold opacity-60 mt-2">+{formatNum(effectiveClickPower)} PER CLICK</span>
        </div>
      </button>

      {/* 오버클럭 스킬 버튼 */}
      <button 
        disabled={overclockCooldown > 0}
        onClick={() => { setIsOverclocked(true); setOverclockCooldown(180); setTimeout(() => setIsOverclocked(false), 15000); }}
        className={`absolute bottom-8 right-8 w-20 h-20 rounded-full border-2 flex items-center justify-center transition-all ${overclockCooldown > 0 ? 'bg-zinc-950 border-zinc-800 text-zinc-700' : 'bg-rose-950/40 border-rose-500 text-rose-500 animate-pulse hover:scale-110'}`}
      >
        <div className="flex flex-col items-center select-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          {overclockCooldown > 0 && <span className="text-[10px] mt-1 font-black">{overclockCooldown}s</span>}
        </div>
      </button>
    </div>
  );
}