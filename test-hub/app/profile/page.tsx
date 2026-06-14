'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, updateProfile, signOut, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// 💡 레벨별 필요 경험치 공식
const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

// 💡 10레벨 단위 뱃지 색상 반환 함수
const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'; 
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30'; 
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';     
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'; 
  return 'text-zinc-400 bg-zinc-900 border-zinc-800'; 
};

// 📊 [NEW] 경쟁전 누적 LP 기반 프로필 티어 변환 엔진
interface TierStructure {
  name: string;
  division: string;
  localLp: number;
  color: string;
}

const getTierFromLp = (totalLp: number): TierStructure => {
  if (totalLp < 0) totalLp = 0;
  
  const TIERS = [
    { name: 'IRON', color: 'text-zinc-500 border-zinc-800 bg-zinc-500/5' },
    { name: 'BRONZE', color: 'text-amber-700 border-amber-900 bg-amber-700/5' },
    { name: 'SILVER', color: 'text-slate-300 border-slate-700 bg-slate-300/5' },
    { name: 'GOLD', color: 'text-yellow-400 border-yellow-600/40 bg-yellow-400/5' },
    { name: 'PLATINUM', color: 'text-emerald-400 border-emerald-600/40 bg-emerald-400/5' },
    { name: 'DIAMOND', color: 'text-cyan-400 border-cyan-500/40 bg-cyan-400/5' },
  ];

  if (totalLp >= 1800) {
    return {
      name: 'MASTER',
      division: '',
      localLp: totalLp - 1800,
      color: 'text-purple-400 border-purple-500/40 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.15)] font-black'
    };
  }

  const tierIndex = Math.floor(totalLp / 300);
  const remainder = totalLp % 300;
  const divisionIndex = Math.floor(remainder / 100);
  const localLp = remainder % 100;
  const divisionMap = ['III', 'II', 'I'];
  
  return {
    name: TIERS[tierIndex].name,
    division: divisionMap[divisionIndex],
    localLp: localLp,
    color: TIERS[tierIndex].color
  };
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    loading: 'LOADING PHYSICAL PROFILE...',
    unauthorized: '프로필을 확인하려면 먼저 로그인해 주세요.',
    homeBtn: '홈으로 가기',
    lvl: 'Lv.',
    editBtn: '닉네임 변경',
    logoutBtn: '로그아웃', 
    saveBtn: '적용',
    cancelBtn: '취소',
    saving: '저장 중..',
    xpTitle: '레벨업 경험치 (Level Up XP)',
    statsTitle: 'HIGHEST METRICS',
    statReaction: 'VISUAL REACTION',
    statReactionDesc: '시각 반응 속도 최고 기록',
    statCps: 'CLICKS PER SECOND',
    statCpsDesc: '초당 클릭 속도 최고 기록',
    tierTitle: 'COMPETITIVE RANK RATING', // 티어 타이틀 추가
    collectionTitle: 'AVAILABLE TITLES COLLECTION',
    equipped: '장착중',
    equipBtn: '장착',
    unequipBtn: '장착 해제',
    activeBtn: 'Active',
    noTitle: '칭호 없음',
    title_dev: '개발자',
    desc_dev: 'LABGG 시스템 빌더 전용 마스터 칭호',
    title_ai: 'AI',
    desc_ai: '조건: 반속 150ms 이하 AND CPS 13 이상 (인간 초월)',
    title_godspeed: '전광석화',
    desc_godspeed: '조건: 반속 180ms 이하 OR CPS 10 이상',
    title_fast: '빠름',
    desc_fast: '조건: 반속 230ms 이하 OR CPS 7 이상',
    title_newbie: '뉴비',
    desc_newbie: '기본으로 지급되는 파릇파릇한 새내기 칭호'
  },
  en: {
    back: '← Back to Home',
    loading: 'LOADING PHYSICAL PROFILE...',
    unauthorized: 'Please sign in first to view your profile.',
    homeBtn: 'Go to Home',
    lvl: 'Lv.',
    editBtn: 'Edit Nickname',
    logoutBtn: 'Sign Out', 
    saveBtn: 'Apply',
    cancelBtn: 'Cancel',
    saving: 'Saving...',
    xpTitle: 'LEVEL UP XP',
    statsTitle: 'HIGHEST METRICS',
    statReaction: 'VISUAL REACTION',
    statReactionDesc: 'Personal best visual reaction time',
    statCps: 'CLICKS PER SECOND',
    statCpsDesc: 'Personal best clicks per second',
    tierTitle: 'COMPETITIVE RANK RATING',
    collectionTitle: 'AVAILABLE TITLES COLLECTION',
    equipped: 'Equipped',
    equipBtn: 'Equip',
    unequipBtn: 'Unequip',
    activeBtn: 'Active',
    noTitle: 'No Title',
    title_dev: 'Developer',
    desc_dev: 'Exclusive master title for LABGG core system builder',
    title_ai: 'AI',
    desc_ai: 'Req: Reaction ≤ 150ms AND CPS ≥ 13 (Beyond Human)',
    title_godspeed: 'Lightning',
    desc_godspeed: 'Req: Reaction ≤ 180ms OR CPS ≥ 10',
    title_fast: 'Swift',
    desc_fast: 'Req: Reaction ≤ 230ms OR CPS ≥ 7',
    title_newbie: 'Newbie',
    desc_newbie: 'A fresh new starter title granted to everyone'
  }
};

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [reactionBest, setReactionBest] = useState<number>(0);
  const [cpsBest, setCpsBest] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [rankedLp, setRankedLp] = useState<number>(300); // 💡 경쟁전 LP 상태 추가 (기본 300)
  const [currentTitleId, setCurrentTitleId] = useState<string>(''); 
  const [isDevFromDb, setIsDevFromDb] = useState<boolean>(false);
  
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || 'Anonymous');
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReactionBest(data.reactionBest || 0);
          setCpsBest(data.cpsBest || 0);
          setLevel(data.level || 1);
          setXp(data.xp || 0);
          setRankedLp(data.rankedLp !== undefined ? data.rankedLp : 300); // 💡 LP 필드 매핑
          setCurrentTitleId(data.currentTitle || ''); 
          setIsDevFromDb(data.isDev === true);
          if (data.displayName) setDisplayName(data.displayName);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const t = TRANSLATIONS[lang];

  const TITLES_LIST = [
    { id: 'dev', text: t.title_dev, desc: t.desc_dev, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    { id: 'ai', text: t.title_ai, desc: t.desc_ai, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
    { id: 'godspeed', text: t.title_godspeed, desc: t.desc_godspeed, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    { id: 'fast', text: t.title_fast, desc: t.desc_fast, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    { id: 'newbie', text: t.title_newbie, desc: t.desc_newbie, color: 'text-zinc-300 bg-zinc-900 border-zinc-800' }
  ];

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    setSaveLoading(true);
    try {
      await updateProfile(user, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (e) {
      console.error("로그아웃 실패:", e);
    }
  };

  const handleEquipToggle = async (titleId: string) => {
    if (!user) return;
    try {
      const nextTitle = currentTitleId === titleId ? '' : titleId;
      await updateDoc(doc(db, 'users', user.uid), { currentTitle: nextTitle });
      setCurrentTitleId(nextTitle);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="min-h-screen bg-black text-zinc-400 font-mono flex items-center justify-center text-xs tracking-widest uppercase">{t.loading}</div>;
  if (!user) return <div className="min-h-screen bg-black text-zinc-100 font-sans flex flex-col items-center justify-center p-6 text-center space-y-4"><p className="text-zinc-400 font-mono text-xs">UNAUTHORIZED ACCESS</p><Link href="/" className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white hover:bg-white hover:text-black transition-all">{t.homeBtn}</Link></div>;

  // 🎯 [요구사항 반영] 내 이메일이 leehyeon110919@gmail.com 이면 전용 개발자 칭호 강제 마스터 언락 권한 부여
  const isDevUser = isDevFromDb || user.email === 'leehyeon110919@gmail.com' || user.email === 'admin@lab.gg' || user.email?.includes('dev') || process.env.NODE_ENV === 'development';
  
  const hasAi = reactionBest > 0 && reactionBest <= 150 && cpsBest >= 13;
  const hasGodspeed = hasAi || (reactionBest > 0 && reactionBest <= 180) || cpsBest >= 10;
  const hasFast = hasGodspeed || (reactionBest > 0 && reactionBest <= 230) || cpsBest >= 7;

  const unlockedTitles: Record<string, boolean> = { dev: isDevUser, ai: hasAi, godspeed: hasGodspeed, fast: hasFast, newbie: true };
  const activeTitle = TITLES_LIST.find(t => t.id === currentTitleId);
  const nextXpNeeded = getNextXpForLevel(level);
  const xpPercentage = Math.min(100, Math.round((xp / nextXpNeeded) * 100));

  // 📈 내 현재 실시간 랭크 티어 계산용 객체
  const myTier = getTierFromLp(rankedLp);

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none">
      <div className="w-full max-w-4xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-400 hover:text-white transition-colors">{t.back}</Link>
        <span className="font-mono text-[10px] text-zinc-500 font-bold tracking-widest">LABGG PHYSICAL ID: {user.uid.slice(0,8)}</span>
      </div>

      <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col justify-center my-4 space-y-5">
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
            <div className="w-20 h-20 rounded-full border-2 border-zinc-800 p-1 bg-black shrink-0 overflow-hidden">
              <img src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="text-center sm:text-left space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                {isEditing ? (
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={15} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-0.5 text-sm font-bold text-white focus:outline-none" />
                ) : (
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{displayName}</h2>
                )}
                
                <span className={`font-mono text-xs font-black px-2 py-0.5 rounded border ${getLevelBadgeColor(level)}`}>
                  {t.lvl}{level}
                </span>

                {/* 📊 [NEW] 유저 메인 프로필에 실시간 연동 각인되는 미니멀 티어 뱃지 프레임 */}
                <span className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-md border tracking-wider uppercase ${myTier.color}`}>
                  {myTier.name} {myTier.division}
                </span>

                {activeTitle ? (
                  <span className={`text-xs font-sans font-bold px-3 py-1 rounded-md border tracking-wide uppercase ${activeTitle.color}`}>{activeTitle.text}</span>
                ) : (
                  <span className="text-xs font-sans font-bold px-3 py-1 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 tracking-wide">{t.noTitle}</span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-500">{user.email}</p>
            </div>
          </div>
          
          <div className="shrink-0 w-full sm:w-auto text-center sm:text-right">
            {isEditing ? (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button onClick={handleSaveProfile} disabled={saveLoading} className="px-4 py-1.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200">{saveLoading ? t.saving : t.saveBtn}</button>
                <button onClick={() => { setIsEditing(false); setDisplayName(user.displayName || 'Anonymous'); }} className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs">{t.cancelBtn}</button>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-zinc-950 border border-zinc-900 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all">{t.editBtn}</button>
                <button onClick={handleLogout} className="px-4 py-2 bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/10 font-bold rounded-xl text-xs transition-all">
                  {t.logoutBtn}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 레벨 레일 경험치 바 */}
        <div className="bg-zinc-950 border border-zinc-900 px-5 py-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-zinc-400 font-bold">{t.xpTitle}</span>
            <span className="text-zinc-200 font-black tracking-wide tabular-nums">{xp} <span className="text-zinc-600 font-normal">/</span> {nextXpNeeded} XP <span className="text-emerald-400 ml-1">({xpPercentage}%)</span></span>
          </div>
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden p-[2px] border border-zinc-900">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>

        {/* 📊 [NEW] 요구사항 반영: 프로필 하단에 탑재된 전술 경쟁전 랭킹 포인트 진척도 LP 바 장치 */}
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl space-y-3">
          <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-1.5 border-b border-zinc-900 uppercase">{t.tierTitle}</div>
          <div className="px-5 py-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl font-mono space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className={`font-black tracking-widest ${myTier.color}`}>{myTier.name} {myTier.division}</span>
              <span className="text-zinc-300 font-black tabular-nums">{myTier.name === 'MASTER' ? `${rankedLp} TOTAL LP` : `${myTier.localLp} / 100 LP`}</span>
            </div>
            {myTier.name !== 'MASTER' && (
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-zinc-100 h-full rounded-full transition-all duration-700" style={{ width: `${myTier.localLp}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* 개인 레코드 매트릭스 보드 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
          <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-1.5 border-b border-zinc-900 uppercase">{t.statsTitle}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex justify-between items-center px-5 py-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl font-mono">
              <div className="flex flex-col space-y-1">
                <span className="font-bold text-zinc-200 text-xs tracking-wider">{t.statReaction}</span>
                <span className="text-[11px] text-zinc-400 font-medium leading-none">{t.statReactionDesc}</span>
              </div>
              <span className="text-lg font-black text-zinc-200 tabular-nums">{reactionBest > 0 ? `${reactionBest}ms` : '---'}</span>
            </div>
            <div className="flex justify-between items-center px-5 py-4 bg-zinc-950/40 border border-zinc-900/60 rounded-xl font-mono">
              <div className="flex flex-col space-y-1">
                <span className="font-bold text-zinc-200 text-xs tracking-wider">{t.statCps}</span>
                <span className="text-[11px] text-zinc-400 font-medium leading-none">{t.statCpsDesc}</span>
              </div>
              <span className="text-lg font-black text-emerald-400 tabular-nums">{cpsBest > 0 ? `${cpsBest} CPS` : '---'}</span>
            </div>
          </div>
        </div>

        {/* 수집된 칭호 인벤토리 그리드 */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-3">
          <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-1.5 border-b border-zinc-900 uppercase">{t.collectionTitle}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TITLES_LIST.map((title) => {
              const isUnlocked = unlockedTitles[title.id];
              const isEquipped = currentTitleId === title.id;
              return (
                <div key={title.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isUnlocked ? 'bg-zinc-950 border-zinc-900 hover:border-zinc-800' : 'bg-zinc-950/10 border-zinc-950/20 opacity-20 select-none'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${title.color}`}>{title.text}</span>
                      {isEquipped && <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20">{t.equipped}</span>}
                    </div>
                    <p className="text-[11px] text-zinc-300 font-semibold">{title.desc}</p>
                  </div>
                  {isUnlocked && (
                    <button onClick={() => handleEquipToggle(title.id)} className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${isEquipped ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-white hover:text-black'}`}>{isEquipped ? t.unequipBtn : t.equipBtn}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="w-full max-w-4xl mx-auto text-center font-mono text-[10px] text-zinc-600 font-bold uppercase tracking-widest">LABGG CORE PROFILE ENGINE v3.5</div>
    </div>
  );
}