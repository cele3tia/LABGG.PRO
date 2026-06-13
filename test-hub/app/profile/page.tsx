'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // 💡 라우팅용 내비게이터 임포트
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, updateProfile, signOut, User } from 'firebase/auth'; // 💡 signOut 임포트 완료
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'; 
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30'; 
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';     
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'; 
  return 'text-zinc-400 bg-zinc-900 border-zinc-800'; 
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    loading: 'LOADING PHYSICAL PROFILE...',
    unauthorized: '프로필을 확인하려면 먼저 로그인해 주세요.',
    homeBtn: '홈으로 가기',
    lvl: 'Lv.',
    editBtn: '닉네임 변경',
    logoutBtn: '로그아웃', // 💡 국문 레이블 추가
    saveBtn: '적용',
    cancelBtn: '취소',
    saving: '저장 중..',
    xpTitle: '레벨업 경험치 (Level Up XP)',
    statsTitle: 'HIGHEST METRICS',
    statReaction: 'VISUAL REACTION',
    statReactionDesc: '시각 반응 속도 최고 기록',
    statCps: 'CLICKS PER SECOND',
    statCpsDesc: '초당 클릭 속도 최고 기록',
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
    logoutBtn: 'Sign Out', // 💡 영문 레이블 추가
    saveBtn: 'Apply',
    cancelBtn: 'Cancel',
    saving: 'Saving...',
    xpTitle: 'LEVEL UP XP',
    statsTitle: 'HIGHEST METRICS',
    statReaction: 'VISUAL REACTION',
    statReactionDesc: 'Personal best visual reaction time',
    statCps: 'CLICKS PER SECOND',
    statCpsDesc: 'Personal best clicks per second',
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
  const router = useRouter(); // 💡 라우터 인스턴스 활성화
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [reactionBest, setReactionBest] = useState<number>(0);
  const [cpsBest, setCpsBest] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
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

  // 💡 [NEW] 파이어베이스 로그아웃 코어 제어 핸들러
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/'); // 로그아웃 성공 시 메인 홈 화면으로 다이렉트 이주
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

  const isDevUser = isDevFromDb || user.email === 'admin@lab.gg' || user.email?.includes('dev') || process.env.NODE_ENV === 'development';
  const hasAi = reactionBest > 0 && reactionBest <= 150 && cpsBest >= 13;
  const hasGodspeed = hasAi || (reactionBest > 0 && reactionBest <= 180) || cpsBest >= 10;
  const hasFast = hasGodspeed || (reactionBest > 0 && reactionBest <= 230) || cpsBest >= 7;

  // 💡 Record 타입을 부여해 하단 루프에서 무지성 @ts-ignore를 안 써도 타입 에러가 안 나게 대수술 완료
  const unlockedTitles: Record<string, boolean> = { dev: isDevUser, ai: hasAi, godspeed: hasGodspeed, fast: hasFast, newbie: true };
  const activeTitle = TITLES_LIST.find(t => t.id === currentTitleId);
  const nextXpNeeded = getNextXpForLevel(level);
  const xpPercentage = Math.min(100, Math.round((xp / nextXpNeeded) * 100));

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

                {activeTitle ? (
                  <span className={`text-xs font-sans font-bold px-3 py-1 rounded-md border tracking-wide uppercase ${activeTitle.color}`}>{activeTitle.text}</span>
                ) : (
                  <span className="text-xs font-sans font-bold px-3 py-1 rounded-md border border-zinc-800 bg-zinc-950 text-zinc-500 tracking-wide">{t.noTitle}</span>
                )}
              </div>
              <p className="text-xs font-mono text-zinc-500">{user.email}</p>
            </div>
          </div>
          
          {/* 🛠️ 버튼 레이아웃 제어 기지 */}
          <div className="shrink-0 w-full sm:w-auto text-center sm:text-right">
            {isEditing ? (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button onClick={handleSaveProfile} disabled={saveLoading} className="px-4 py-1.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200">{saveLoading ? t.saving : t.saveBtn}</button>
                <button onClick={() => { setIsEditing(false); setDisplayName(user.displayName || 'Anonymous'); }} className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs">{t.cancelBtn}</button>
              </div>
            ) : (
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-zinc-950 border border-zinc-900 text-zinc-300 hover:text-white font-bold rounded-xl text-xs transition-all">{t.editBtn}</button>
                {/* 🔴 [NEW] 게이밍 텍스처를 살린 모던 로그아웃 디바이스 버튼 장착 */}
                <button onClick={handleLogout} className="px-4 py-2 bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/10 font-bold rounded-xl text-xs transition-all">
                  {t.logoutBtn}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 px-5 py-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center font-mono text-xs">
            <span className="text-zinc-400 font-bold">{t.xpTitle}</span>
            <span className="text-zinc-200 font-black tracking-wide tabular-nums">{xp} <span className="text-zinc-600 font-normal">/</span> {nextXpNeeded} XP <span className="text-emerald-400 ml-1">({xpPercentage}%)</span></span>
          </div>
          <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden p-[2px] border border-zinc-900">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${xpPercentage}%` }} />
          </div>
        </div>

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
      <div className="w-full max-w-4xl mx-auto text-center font-mono text-[10px] text-zinc-600 font-bold uppercase tracking-widest">LABGG CORE PROFILE ENGINE v3.0</div>
    </div>
  );
}