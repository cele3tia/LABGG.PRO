'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface UpgradeItem {
  id: string; name: string; cost: number; pps?: number; count: number; desc: string; type?: 'pps' | 'click';
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qd', 'Qid', 'Sd', 'St', 'Ot', 'Nt', 'Vg'];

export const formatNum = (num: number) => {
  if (num === 0 || isNaN(num)) return '0';
  if (num < 1000) return parseFloat(num.toFixed(2)).toString();
  const tier = Math.floor(Math.log10(Math.abs(num)) / 3);
  const safeTier = Math.min(tier, SUFFIXES.length - 1);
  const suffix = SUFFIXES[safeTier];
  const scaled = num / Math.pow(10, safeTier * 3);
  return `${parseFloat(scaled.toFixed(2))}${suffix}`;
};

export const getDisplayData = (val: number) => {
  if (isNaN(val) || val <= 0) return { num: 0, suffix: '' };
  if (val < 1000) return { num: parseFloat(val.toFixed(2)), suffix: '' };
  const tier = Math.floor(Math.log10(val) / 3);
  const safeTier = Math.min(tier, SUFFIXES.length - 1);
  const suffix = SUFFIXES[safeTier];
  const scaled = val / Math.pow(10, safeTier * 3);
  return { num: parseFloat(scaled.toFixed(2)), suffix };
};

export default function useIdleEngine(lang: 'ko' | 'en', titleId?: string) {
  // 💡 픽스: 환생 시 초기화용 기본 데이터 배열을 명시적으로 선언!
  const defaultClickUpgrades: UpgradeItem[] = [
    { id: 'c1', name: lang === 'ko' ? '기계식 스위치' : 'Mechanical Switch', cost: 10, count: 0, desc: lang === 'ko' ? '클릭 당 획득량 +1' : '+1 Byte per Click' },
    { id: 'c2', name: lang === 'ko' ? '신경 링크' : 'Neural Link', cost: 500, count: 0, desc: lang === 'ko' ? '클릭 당 획득량 +15' : '+15 Bytes per Click' },
    { id: 'c3', name: lang === 'ko' ? '매크로 엔진' : 'Macro Engine', cost: 15000, count: 0, desc: lang === 'ko' ? '클릭 당 획득량 +250' : '+250 Bytes per Click' },
    { id: 'c4', name: lang === 'ko' ? '차원 압축기' : 'Dimensional Press', cost: 800000, count: 0, desc: lang === 'ko' ? '클릭 당 획득량 +12K' : '+12K Bytes per Click' },
    { id: 'c5', name: lang === 'ko' ? '신의 손가락' : 'Hand of God', cost: 50000000, count: 0, desc: lang === 'ko' ? '클릭 당 획득량 +1.5M' : '+1.5M Bytes per Click' },
  ];

  const defaultCoreUpgrades: UpgradeItem[] = [
    { id: 'mouse', name: lang === 'ko' ? '매크로 마우스' : 'Macro Mouse', cost: 50, pps: 0, count: 0, desc: lang === 'ko' ? '초당 1회 자동 클릭' : '1 Auto-Click/s' },
    { id: 'cpu', name: lang === 'ko' ? '오버클럭 CPU' : 'Overclocked CPU', cost: 250, pps: 2, count: 0, desc: '+2 B/s' },
    { id: 'ram', name: lang === 'ko' ? '누수 방지 팩' : 'RAM Patcher', cost: 3000, pps: 25, count: 0, desc: '+25 B/s' },
    { id: 'gpu', name: lang === 'ko' ? '병렬 GPU 채굴기' : 'GPU Rig', cost: 45000, pps: 300, count: 0, desc: '+300 B/s' },
    { id: 'server', name: lang === 'ko' ? '지하 서버 팜' : 'Server Farm', cost: 800000, pps: 4200, count: 0, desc: '+4.2K B/s' },
    { id: 'quantum', name: lang === 'ko' ? '양자 클러스터' : 'Quantum Core', cost: 20000000, pps: 90000, count: 0, desc: '+90K B/s' },
    { id: 'ai', name: lang === 'ko' ? '특이점 AI' : 'Singularity AI', cost: 500000000, pps: 1800000, count: 0, desc: '+1.8M B/s' },
    { id: 'dyson', name: lang === 'ko' ? '다이슨 스피어' : 'Dyson Sphere', cost: 15000000000, pps: 45000000, count: 0, desc: '+45M B/s' },
    { id: 'matrix', name: lang === 'ko' ? '매트릭스' : 'The Matrix', cost: 800000000000, pps: 1200000000, count: 0, desc: '+1.2B B/s' },
    { id: 'multiverse', name: lang === 'ko' ? '다중우주 장치' : 'Multiverse Rig', cost: 40000000000000, pps: 85000000000, count: 0, desc: '+85B B/s' },
    { id: 'omni', name: lang === 'ko' ? '옴니버스 코어' : 'Omniverse Core', cost: 10000000000000000, pps: 1000000000000000, count: 0, desc: '+1Qa B/s' },
  ];

  const [isLoaded, setIsLoaded] = useState(false);
  const [bytes, setBytes] = useState<number>(0);
  const [diamonds, setDiamonds] = useState<number>(0); 
  const [qubits, setQubits] = useState<number>(0); 
  const [artifacts, setArtifacts] = useState({ common: 0, rare: 0, epic: 0, legendary: 0 });

  const [isOverclocked, setIsOverclocked] = useState(false);
  const [overclockCooldown, setOverclockCooldown] = useState(0); 

  // 💡 초기화용 데이터를 useState에 주입
  const [clickUpgrades, setClickUpgrades] = useState<UpgradeItem[]>(defaultClickUpgrades);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(defaultCoreUpgrades);

  const [diamondUpgrades, setDiamondUpgrades] = useState<UpgradeItem[]>([
    { id: 'click_power', name: lang === 'ko' ? '클릭 증폭기' : 'Click Boost', cost: 1, count: 0, desc: lang === 'ko' ? '기본 클릭 +10 B' : 'Base Click +10 B' },
    { id: 'luck', name: lang === 'ko' ? '행운 알고리즘' : 'Luck Algorithm', cost: 5, count: 0, desc: lang === 'ko' ? '다이아 확률 +0.05%' : 'Diamond Chance +0.05%' },
    { id: 'pps_boost', name: lang === 'ko' ? '코어 오버드라이브' : 'Overdrive', cost: 20, count: 0, desc: lang === 'ko' ? '총 생산량 +10%' : 'Total PPS +10%' },
  ]);

  const bytesRef = useRef(bytes);
  const artifactsRef = useRef(artifacts);
  const upgradesRef = useRef(upgrades);

  useEffect(() => { bytesRef.current = bytes; }, [bytes]);
  useEffect(() => { artifactsRef.current = artifacts; }, [artifacts]);
  useEffect(() => { upgradesRef.current = upgrades; }, [upgrades]);

  // 💡 배율 연산
  const qubitMult = 1 + (qubits * 5.0);
  const overclockMult = isOverclocked ? 10.0 : 1.0;
  const artMult = 1 + (artifacts.common * 0.01) + (artifacts.rare * 0.05) + (artifacts.epic * 0.2) + (artifacts.legendary * 1.5);
  const diaPpsMult = 1 + (diamondUpgrades.find(u => u.id === 'pps_boost')?.count || 0) * 0.1;
  
  const totalMult = qubitMult * overclockMult * artMult * diaPpsMult;

  // 💡 클릭 파워 연산
  const clickUpgradePower = clickUpgrades.reduce((acc, u) => {
    const powerMap: Record<string, number> = { c1: 1, c2: 15, c3: 250, c4: 12000, c5: 1500000 };
    return acc + (powerMap[u.id] * u.count);
  }, 1);

  const diaClickPower = (diamondUpgrades.find(u => u.id === 'click_power')?.count || 0) * 10;
  const effectiveClickPower = (clickUpgradePower + diaClickPower) * totalMult;
  const effectivePps = upgrades.reduce((acc, u) => acc + (u.pps || 0) * u.count, 0) * totalMult;

  const singularityReq = 1000000000000000 * Math.pow(50, qubits);

  // 세이브/로드
  useEffect(() => {
    const load = (key: string) => localStorage.getItem('labgg-v2-' + key);
    if (load('bytes')) setBytes(parseFloat(load('bytes')!));
    if (load('diamonds')) setDiamonds(parseInt(load('diamonds')!));
    if (load('qubits')) setQubits(parseInt(load('qubits')!));
    if (load('artifacts')) setArtifacts(JSON.parse(load('artifacts')!));
    if (load('upgrades')) {
      const saved = JSON.parse(load('upgrades')!);
      setUpgrades(prev => prev.map(d => {
        const s = saved.find((x: any) => x.id === d.id);
        return s ? { ...d, count: s.count, cost: Math.floor(d.cost * Math.pow(1.8, s.count)) } : d;
      }));
    }
    if (load('click-upgrades')) {
      const saved = JSON.parse(load('click-upgrades')!);
      setClickUpgrades(prev => prev.map(d => {
        const s = saved.find((x: any) => x.id === d.id);
        return s ? { ...d, count: s.count, cost: Math.floor(d.cost * Math.pow(2.2, s.count)) } : d;
      }));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const save = () => {
      const saveTo = (key: string, val: any) => localStorage.setItem('labgg-v2-' + key, typeof val === 'string' ? val : JSON.stringify(val));
      saveTo('bytes', bytesRef.current.toString());
      saveTo('diamonds', diamonds.toString());
      saveTo('qubits', qubits.toString());
      saveTo('artifacts', artifactsRef.current);
      saveTo('upgrades', upgrades);
      saveTo('click-upgrades', clickUpgrades);
    };
    const t = setInterval(save, 1000);
    window.addEventListener('beforeunload', save);
    return () => { clearInterval(t); window.removeEventListener('beforeunload', save); };
  }, [isLoaded, upgrades, clickUpgrades, diamonds, qubits]);

  // 생산 루프
  useEffect(() => {
    const t = setInterval(() => { if (effectivePps > 0) setBytes(b => b + (effectivePps / 10)); }, 100);
    return () => clearInterval(t);
  }, [effectivePps]);

  const buyUpgrade = (id: string, type: 'pps' | 'click') => {
    if (type === 'pps') {
      const item = upgrades.find(u => u.id === id);
      if (!item || bytes < item.cost) return;
      setBytes(b => b - item.cost);
      setUpgrades(prev => prev.map(u => u.id === id ? { ...u, count: u.count + 1, cost: Math.floor(u.cost * 1.8) } : u));
    } else {
      const item = clickUpgrades.find(u => u.id === id);
      if (!item || bytes < item.cost) return;
      setBytes(b => b - item.cost);
      setClickUpgrades(prev => prev.map(u => u.id === id ? { ...u, count: u.count + 1, cost: Math.floor(u.cost * 2.2) } : u));
    }
  };

  const drawGacha = () => {
    if (diamonds < 10) return null;
    setDiamonds(d => d - 10);
    const r = Math.random();
    let rarity = 'common';
    if (r < 0.01) rarity = 'legendary';
    else if (r < 0.1) rarity = 'epic';
    else if (r < 0.3) rarity = 'rare';

    setArtifacts(prev => {
      const next = { ...prev, [rarity]: prev[rarity as keyof typeof prev] + 1 };
      artifactsRef.current = next; 
      return next;
    });
    return rarity;
  };

  return {
    bytes, diamonds, qubits, artifacts, upgrades, clickUpgrades, diamondUpgrades,
    effectivePps, effectiveClickPower, overclockCooldown, isOverclocked, singularityReq,
    buyUpgrade, drawGacha, setBytes, setDiamonds, setIsOverclocked, setOverclockCooldown,
    triggerSingularity: () => {
      if (bytes < singularityReq) return;
      setQubits(q => q + 1); 
      setBytes(0); 
      // 💡 픽스: 환생 시 정의된 기본 배열로 완벽하게 리셋됨!
      setUpgrades(defaultCoreUpgrades); 
      setClickUpgrades(defaultClickUpgrades);
    }
  };
}

export const DiamondIcon = ({ className = "w-4 h-4 text-cyan-400" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 2 7 12 22 22 7 12 2" />
    <polyline points="2 7 12 11 22 7" />
    <line x1="12" y1="22" x2="12" y2="11" />
  </svg>
);