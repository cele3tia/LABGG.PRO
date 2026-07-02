'use client';

import React, { useState, useEffect, useRef } from 'react';
import Counter from './Counter';

interface UpgradeItem {
  id: string;
  name: string;
  cost: number;
  pps?: number; 
  count: number;
  desc: string;
}

const TITLE_BUFFS: Record<string, { label: Record<'ko' | 'en', string>, multiplier: number, color: string }> = {
  dev: { label: { ko: '개발자', en: 'Developer' }, multiplier: 2.0, color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
  ai: { label: { ko: 'AI', en: 'AI' }, multiplier: 1.5, color: 'text-rose-500 border-rose-500/30 bg-rose-500/10' },
  godspeed: { label: { ko: '전광석화', en: 'Lightning' }, multiplier: 1.2, color: 'text-purple-500 border-purple-500/30 bg-purple-500/10' },
  fast: { label: { ko: '빠름', en: 'Swift' }, multiplier: 1.1, color: 'text-sky-500 border-sky-500/30 bg-sky-500/10' },
  newbie: { label: { ko: '뉴비', en: 'Newbie' }, multiplier: 1.05, color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
};

// 텍스트 렌더링용 범용 포매터
const formatNum = (num: number, isInteger = false) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return isInteger ? Math.floor(num).toString() : num.toFixed(1);
};

const DiamondIcon = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 7 12 22 22 7 12 2"></polygon>
    <polyline points="2 7 12 11 22 7"></polyline>
    <line x1="12" y1="22" x2="12" y2="11"></line>
  </svg>
);

export default function IdleGame({ lang, titleId }: { lang: 'ko' | 'en', titleId?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [bytes, setBytes] = useState<number>(0);
  const [diamonds, setDiamonds] = useState<number>(0); 
  
  const [basePps, setBasePps] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [cooldownProgress, setCooldownProgress] = useState<number>(0);
  const [diamondPop, setDiamondPop] = useState<boolean>(false); 

  const CLICK_COOLDOWN = 1000; 

  const [upgrades, setUpgrades] = useState<UpgradeItem[]>([
    { id: 'cpu', name: lang === 'ko' ? '오버클럭 CPU' : 'Overclocked CPU', cost: 15, pps: 0.2, count: 0, desc: lang === 'ko' ? '기본 연산 가속화 (+0.2 B/s)' : 'Speed (+0.2 B/s)' },
    { id: 'ram', name: lang === 'ko' ? '누수 방지 팩' : 'RAM Patcher', cost: 100, pps: 1.5, count: 0, desc: lang === 'ko' ? '자동 수집 효율 안정화 (+1.5 B/s)' : 'Efficiency (+1.5 B/s)' },
    { id: 'quantum', name: lang === 'ko' ? '양자 클러스터' : 'Quantum Cluster', cost: 1200, pps: 12, count: 0, desc: lang === 'ko' ? '시공간 채굴 (+12 B/s)' : 'Auto mining (+12 B/s)' },
  ]);

  const [diamondUpgrades, setDiamondUpgrades] = useState<UpgradeItem[]>([
    { id: 'autoclick', name: lang === 'ko' ? '오토 마이너' : 'Auto Miner', cost: 1, count: 0, desc: lang === 'ko' ? '초당 1회 자동 주입' : '1 Auto-inject/s' },
    { id: 'luck', name: lang === 'ko' ? '행운 알고리즘' : 'Luck Algorithm', cost: 2, count: 0, desc: lang === 'ko' ? '다이아 확률 증가 (+0.1%)' : 'Diamond chance (+0.1%)' },
    { id: 'power', name: lang === 'ko' ? '클릭 증폭기' : 'Click Amplifier', cost: 3, count: 0, desc: lang === 'ko' ? '획득량 대폭 증가 (+5 B)' : 'Yield boosted (+5 B)' },
  ]);

  const bytesRef = useRef(bytes);
  const diamondsRef = useRef(diamonds);
  const upgradesRef = useRef(upgrades);
  const diamondUpgradesRef = useRef(diamondUpgrades);

  useEffect(() => { bytesRef.current = bytes; }, [bytes]);
  useEffect(() => { diamondsRef.current = diamonds; }, [diamonds]);
  useEffect(() => { upgradesRef.current = upgrades; }, [upgrades]);
  useEffect(() => { diamondUpgradesRef.current = diamondUpgrades; }, [diamondUpgrades]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('idle-update', { 
      detail: { bytes, diamonds, pop: diamondPop } 
    }));
  }, [bytes, diamonds, diamondPop]);

  const autoClickCount = diamondUpgrades.find(u => u.id === 'autoclick')?.count || 0;
  const luckCount = diamondUpgrades.find(u => u.id === 'luck')?.count || 0;
  const powerCount = diamondUpgrades.find(u => u.id === 'power')?.count || 0;

  const activeBuff = titleId && TITLE_BUFFS[titleId] ? TITLE_BUFFS[titleId] : null;
  const buffMultiplier = activeBuff ? activeBuff.multiplier : 1.0;
  
  const effectivePps = basePps * buffMultiplier;
  const baseClickPower = 1 + (powerCount * 5);
  const effectiveClickPower = baseClickPower * buffMultiplier; 
  const diamondChance = 0.001 + (luckCount * 0.001); 

  useEffect(() => {
    const savedBytes = localStorage.getItem('labgg-idle-bytes');
    const savedDiamonds = localStorage.getItem('labgg-idle-diamonds');
    const savedUpgrades = localStorage.getItem('labgg-idle-upgrades');
    const savedDiamondUpgrades = localStorage.getItem('labgg-idle-dupgrades');
    
    if (savedBytes) setBytes(parseFloat(savedBytes));
    if (savedDiamonds) setDiamonds(parseInt(savedDiamonds, 10));

    if (savedUpgrades) {
      try {
        const parsed = JSON.parse(savedUpgrades);
        setUpgrades(parsed);
        const totalPps = parsed.reduce((acc: number, item: UpgradeItem) => acc + (item.pps! * item.count), 0);
        setBasePps(totalPps);
      } catch (e) {}
    }

    if (savedDiamondUpgrades) {
      try {
        setDiamondUpgrades(JSON.parse(savedDiamondUpgrades));
      } catch (e) {}
    }
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const saveTimer = setInterval(() => {
      localStorage.setItem('labgg-idle-bytes', bytesRef.current.toString());
      localStorage.setItem('labgg-idle-diamonds', diamondsRef.current.toString());
      localStorage.setItem('labgg-idle-upgrades', JSON.stringify(upgradesRef.current));
      localStorage.setItem('labgg-idle-dupgrades', JSON.stringify(diamondUpgradesRef.current));
    }, 1000);
    return () => clearInterval(saveTimer);
  }, [isLoaded]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (effectivePps > 0) {
        setBytes((prev) => prev + effectivePps / 10);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [effectivePps]);

  const triggerClick = (times: number) => {
    let earnedBytes = 0;
    let earnedDiamonds = 0;

    for (let i = 0; i < times; i++) {
      earnedBytes += effectiveClickPower;
      if (Math.random() < diamondChance) {
        earnedDiamonds += 1;
      }
    }

    if (earnedBytes > 0) setBytes(b => b + earnedBytes);
    if (earnedDiamonds > 0) {
      setDiamonds(d => d + earnedDiamonds);
      setDiamondPop(true);
      setTimeout(() => setDiamondPop(false), 500); 
    }
  };

  useEffect(() => {
    if (!isLoaded || autoClickCount === 0) return;
    const interval = setInterval(() => {
      triggerClick(autoClickCount);
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoaded, autoClickCount, effectiveClickPower, diamondChance]);

  useEffect(() => {
    if (lastClickTime === 0) return;
    const cooldownTimer = setInterval(() => {
      const elapsed = Date.now() - lastClickTime;
      if (elapsed >= CLICK_COOLDOWN) {
        setCooldownProgress(0);
        clearInterval(cooldownTimer);
      } else {
        setCooldownProgress(((CLICK_COOLDOWN - elapsed) / CLICK_COOLDOWN) * 100);
      }
    }, 30);
    return () => clearInterval(cooldownTimer);
  }, [lastClickTime]);

  const handleManualClick = () => {
    const now = Date.now();
    if (now - lastClickTime < CLICK_COOLDOWN) return;

    setLastClickTime(now);
    setCooldownProgress(100);
    triggerClick(1); 
  };

  const buyUpgrade = (id: string) => {
    const targetItem = upgrades.find(u => u.id === id);
    if (!targetItem || bytes < targetItem.cost) return;

    setBytes((prev) => prev - targetItem.cost);
    setUpgrades((prevUpgrades) =>
      prevUpgrades.map((item) => {
        if (item.id === id) {
          const nextCost = Math.floor(item.cost * 1.5);
          setBasePps((prevBasePps) => prevBasePps + item.pps!);
          return { ...item, count: item.count + 1, cost: nextCost };
        }
        return item;
      })
    );
  };

  const buyDiamondUpgrade = (id: string) => {
    const targetItem = diamondUpgrades.find(u => u.id === id);
    if (!targetItem || diamonds < targetItem.cost) return;

    setDiamonds((prev) => prev - targetItem.cost);
    setDiamondUpgrades((prevUpgrades) =>
      prevUpgrades.map((item) => {
        if (item.id === id) {
          const nextCost = Math.ceil(item.cost * 1.6); 
          return { ...item, count: item.count + 1, cost: nextCost };
        }
        return item;
      })
    );
  };

  const isClickDisabled = cooldownProgress > 0;

  // 💡 픽스: Counter 애니메이션을 깨지 않고 숫자만 굴리기 위해 값(Value)과 단위(Suffix)를 완벽하게 분리 계산!
  const getDisplayValue = (val: number) => {
    if (val >= 1000000) return parseFloat((val / 1000000).toFixed(2));
    if (val >= 1000) return parseFloat((val / 1000).toFixed(2));
    return Math.floor(val);
  };

  const getDisplaySuffix = (val: number) => {
    if (val >= 1000000) return 'M';
    if (val >= 1000) return 'K';
    return '';
  };

  const currentDisplayValue = getDisplayValue(bytes);
  const currentDisplaySuffix = getDisplaySuffix(bytes);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-10 select-none">
      
      {/* [좌측 패널] 광산 (메인 카운터 & 클릭) */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 bg-black/20 backdrop-blur-md border border-zinc-800/50 rounded-[24px] min-h-[500px]">
        
        {/* 💡 픽스: Counter는 순수 숫자만 받아서 굴리고, 단위(K/M)는 그 옆에 간지나게 붙도록 처리 */}
        <div className="mb-8 flex items-baseline justify-center gap-1.5 overflow-visible">
          <div className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tighter text-white tabular-nums leading-normal py-4">
             <Counter value={currentDisplayValue} />
          </div>
          
          {/* K, M 단위 표시 구역 */}
          {currentDisplaySuffix && (
            <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-cyan-400 tracking-tighter mr-2">
              {currentDisplaySuffix}
            </span>
          )}
          
          <span className="text-2xl font-black text-zinc-500 mb-2">B</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <div className="px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-400">
            PPS: <span className="text-white ml-1">+{formatNum(effectivePps)}/s</span>
          </div>
          <div className={`px-4 py-1.5 rounded-full border text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-300 ${diamondPop ? 'bg-cyan-500/20 border-cyan-400 text-white scale-110' : 'bg-cyan-950/30 border-cyan-900/50 text-cyan-500'}`}>
            <DiamondIcon className="w-3.5 h-3.5" />
            <span className="tabular-nums">{formatNum(diamonds, true)}</span>
          </div>
          {activeBuff && (
            <div className={`px-3 py-1.5 border rounded-full font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${activeBuff.color}`}>
              {activeBuff.label[lang]} 버프 (x{buffMultiplier})
            </div>
          )}
        </div>

        <button 
          disabled={isClickDisabled}
          onClick={handleManualClick}
          className={`relative overflow-hidden w-full max-w-sm px-8 py-5 border rounded-[20px] transition-all duration-200 ${
            isClickDisabled
              ? 'bg-zinc-900/50 border-zinc-800/50 text-zinc-600 cursor-not-allowed'
              : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800 hover:text-white hover:border-zinc-500 active:scale-[0.98]'
          }`}
        >
          {isClickDisabled && (
            <div 
              className="absolute left-0 top-0 bottom-0 bg-white/5 transition-all duration-300 ease-linear"
              style={{ width: `${cooldownProgress}%` }}
            />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center gap-1">
            <span className="font-mono text-sm font-black tracking-widest uppercase">
              {isClickDisabled ? 'CHARGING...' : 'MANUAL MINE'}
            </span>
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              +{formatNum(effectiveClickPower)} B / CLICK
            </span>
          </div>
        </button>
      </div>

      {/* [우측 패널] 상점 */}
      <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0">
        
        {/* 다이아 상점 */}
        <div className="bg-black/20 backdrop-blur-md border border-cyan-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DiamondIcon className="w-4 h-4" />
            <h3 className="font-mono text-xs font-black text-cyan-400 tracking-widest uppercase">Black Market</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {diamondUpgrades.map((item) => {
              const canAfford = diamonds >= item.cost;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-cyan-900/50 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-200">{item.name}</span>
                      <span className="font-mono text-[9px] font-bold text-cyan-500 bg-cyan-950/50 px-1.5 py-0.5 rounded">Lv.{item.count}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{item.desc}</span>
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => buyDiamondUpgrade(item.id)}
                    className={`shrink-0 px-3 py-1.5 font-mono text-xs font-black rounded-lg transition-colors flex items-center gap-1 ${
                      canAfford ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-900 hover:bg-cyan-900 hover:text-white' : 'bg-zinc-950 text-zinc-600 border border-zinc-900 cursor-not-allowed'
                    }`}
                  >
                    {formatNum(item.cost, true)} <DiamondIcon className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 바이트 상점 */}
        <div className="bg-black/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-mono text-xs font-black text-zinc-400 tracking-widest uppercase">Upgrades</h3>
          </div>
          <div className="flex flex-col gap-2.5">
            {upgrades.map((item) => {
              const canAfford = bytes >= item.cost;
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-200">{item.name}</span>
                      <span className="font-mono text-[9px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">Lv.{item.count}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{item.desc}</span>
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => buyUpgrade(item.id)}
                    className={`shrink-0 px-3 py-1.5 font-mono text-xs font-black rounded-lg transition-colors ${
                      canAfford ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 hover:text-white' : 'bg-zinc-950 text-zinc-600 border border-zinc-900 cursor-not-allowed'
                    }`}
                  >
                    {formatNum(item.cost)} B
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}