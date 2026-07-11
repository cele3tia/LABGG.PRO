'use client';

import React, { useState } from 'react';
import { formatNum, DiamondIcon } from './useIdleEngine';

export default function IdleShopPanel({ engine }: { engine: any }) {
  const [tab, setTab] = useState<'core' | 'click' | 'market'>('core');
  const [gachaResult, setGachaResult] = useState<string | null>(null);
  const { bytes, diamonds, upgrades, clickUpgrades, diamondUpgrades, artifacts, buyUpgrade, drawGacha } = engine;

  const handleGacha = () => {
    const res = drawGacha();
    if (res) {
      setGachaResult(res);
      setTimeout(() => setGachaResult(null), 2000);
    }
  };

  return (
    <div className="w-full lg:w-[480px] flex flex-col shrink-0 bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl">
      
      {/* 💡 탭 네비게이션 */}
      <div className="flex bg-zinc-900/50 p-2 gap-1">
        {(['core', 'click', 'market'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 rounded-2xl font-mono text-[10px] font-black uppercase transition-all ${tab === t ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-6 flex flex-col gap-4 h-[600px] overflow-y-auto custom-scrollbar">
        
        {/* 💡 코어/클릭 공통 렌더러 */}
        {(tab === 'core' || tab === 'click') && (tab === 'core' ? upgrades : clickUpgrades).map((item: any) => {
          const canAfford = bytes >= item.cost;
          const prog = Math.min(100, (bytes / item.cost) * 100);
          return (
            <div key={item.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-600 transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-200">{item.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">Lv.{item.count}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">{item.desc}</p>
                </div>
              </div>
              <button 
                disabled={!canAfford}
                onClick={() => buyUpgrade(item.id, tab === 'core' ? 'pps' : 'click')}
                className={`relative w-full py-3 rounded-xl font-mono text-xs font-black overflow-hidden border transition-all ${canAfford ? 'bg-white text-black border-white hover:bg-zinc-200' : 'bg-zinc-950 text-zinc-700 border-zinc-900'}`}
              >
                <div className="absolute left-0 top-0 bottom-0 bg-cyan-500/10" style={{ width: `${prog}%` }} />
                <div className="relative z-10 flex justify-between px-4">
                  <span>{canAfford ? 'UPGRADE' : `${prog.toFixed(0)}%`}</span>
                  <span>{formatNum(item.cost)} B</span>
                </div>
              </button>
            </div>
          );
        })}

        {/* 💡 블랙마켓 + 가챠 */}
        {tab === 'market' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Common</span>
                <span className="text-2xl font-black text-white">{artifacts.common}</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-900/20 border border-blue-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase">Rare</span>
                <span className="text-2xl font-black text-blue-400">{artifacts.rare}</span>
              </div>
              <div className="p-4 rounded-2xl bg-purple-900/20 border border-purple-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-purple-400 uppercase">Epic</span>
                <span className="text-2xl font-black text-purple-400">{artifacts.epic}</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-900/20 border border-amber-800 flex flex-col items-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Legendary</span>
                <span className="text-2xl font-black text-amber-400">{artifacts.legendary}</span>
              </div>
            </div>

            <div className="relative p-8 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-950 border-2 border-zinc-700 text-center">
              {gachaResult && (
                <div className="absolute inset-0 z-50 bg-black rounded-3xl flex items-center justify-center animate-card-flip">
                  <span className={`text-2xl font-black uppercase ${gachaResult === 'legendary' ? 'text-amber-400' : gachaResult === 'epic' ? 'text-purple-400' : 'text-white'}`}>
                    {gachaResult}!
                  </span>
                </div>
              )}
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Artifact Portal</h3>
              <p className="text-[10px] text-zinc-500 mb-6">Unleash permanent global multipliers</p>
              <button 
                onClick={handleGacha}
                disabled={diamonds < 10}
                className={`w-full py-4 rounded-2xl font-mono font-black transition-all ${diamonds >= 10 ? 'bg-cyan-500 text-black shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-105' : 'bg-zinc-900 text-zinc-700'}`}
              >
                EXTRACT (10 <DiamondIcon className="inline mb-1" />)
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes card-flip {
          0% { transform: scale(0) rotateY(0); opacity: 0; }
          50% { transform: scale(1.1) rotateY(180deg); opacity: 1; }
          100% { transform: scale(1) rotateY(360deg); opacity: 0; }
        }
        .animate-card-flip { animation: card-flip 1.5s ease-in-out forwards; }
      `}</style>
    </div>
  );
}