'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, updateProfile, signOut, User } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'; 

// 💡 분리된 컴포넌트 & 로직 임포트
import { RANKED_UNLOCK_LEVEL, TWO_WEEKS_MS, getNextXpForLevel, getTierFromLp, TRANSLATIONS, getTitlesList } from './utils';
import ProfileHeader from './components/ProfileHeader';
import { InfoTab, CompTab, TitleTab } from './components/TabViews';
import FriendsPanel from './friends';

type TabType = 'info' | 'comp' | 'title' | 'friends';

export default function ProfilePage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  
  // 데이터 상태
  const [reactionBest, setReactionBest] = useState<number>(0);
  const [cpsBest, setCpsBest] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [rankedLp, setRankedLp] = useState<number>(300);
  const [currentTitleId, setCurrentTitleId] = useState<string>(''); 
  const [isDevFromDb, setIsDevFromDb] = useState<boolean>(false);
  
  // 수정 상태
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [canEditName, setCanEditName] = useState<boolean>(true);
  const [daysLeftToEdit, setDaysLeftToEdit] = useState<number>(0);

  const isDevUser = isDevFromDb || user?.email === 'leehyeon110919@gmail.com' || user?.email === 'admin@lab.gg' || user?.email?.includes('dev') || process.env.NODE_ENV === 'development';

  const generateUniqueNickname = async (baseName: string) => {
    let cleanName = (baseName || "Player").replace(/\s+/g, '');
    let initialName = cleanName.substring(0, 10);
    const initialQ = query(collection(db, 'users'), where('displayName', '==', initialName));
    const initialSnap = await getDocs(initialQ);
    if (initialSnap.empty) return initialName;

    if (cleanName.length > 6) cleanName = cleanName.substring(0, 6);
    let isUnique = false;
    let finalName = cleanName;

    while (!isUnique) {
      const randomTag = Math.floor(1000 + Math.random() * 9000);
      finalName = `${cleanName}${randomTag}`.substring(0, 10);
      const q = query(collection(db, 'users'), where('displayName', '==', finalName));
      if ((await getDocs(q)).empty) isUnique = true;
    }
    return finalName;
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReactionBest(data.reactionBest || 0); setCpsBest(data.cpsBest || 0);
          setLevel(data.level || 1); setXp(data.xp || 0); setRankedLp(data.rankedLp ?? 300);
          setCurrentTitleId(data.currentTitle || ''); setIsDevFromDb(data.isDev === true);
          setDisplayName(data.displayName || currentUser.displayName || 'Player');

          const lastChange = data.lastNicknameChange || 0;
          if (Date.now() - lastChange < TWO_WEEKS_MS) {
            setCanEditName(false);
            setDaysLeftToEdit(Math.ceil((TWO_WEEKS_MS - (Date.now() - lastChange)) / (1000 * 60 * 60 * 24))); 
          } else setCanEditName(true);
        } else {
          const uniqueName = await generateUniqueNickname(currentUser.displayName || 'Player');
          await setDoc(userDocRef, { displayName: uniqueName, level: 1, xp: 0, rankedLp: 300, createdAt: Date.now(), lastNicknameChange: 0 });
          await updateProfile(currentUser, { displayName: uniqueName });
          setDisplayName(uniqueName); setCanEditName(true); 
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const t = TRANSLATIONS[lang];
  const TITLES_LIST = getTitlesList(t);

  const handleSaveProfile = async () => {
    const newName = displayName.trim();
    if (!user || !newName) return;
    if (newName.length > 10) return alert(lang === 'ko' ? "닉네임은 최대 10글자까지만 가능합니다." : "Max 10 characters.");
    
    setSaveLoading(true);
    try {
      const q = query(collection(db, 'users'), where('displayName', '==', newName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty && querySnapshot.docs[0].id !== user.uid) {
        setSaveLoading(false);
        return alert(lang === 'ko' ? "이미 사용 중인 닉네임입니다." : "Nickname already taken.");
      }

      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName, lastNicknameChange: Date.now() });
      setIsEditing(false);
      
      if (!isDevUser) { setCanEditName(false); setDaysLeftToEdit(14); }
      alert(lang === 'ko' ? "닉네임이 변경되었습니다!" : "Nickname updated!");
    } catch (e) { console.error(e); } 
    finally { setSaveLoading(false); }
  };

  const handleLogout = async () => { await signOut(auth); router.push('/'); };
  const handleEquipToggle = async (titleId: string) => {
    if (!user) return;
    const nextTitle = currentTitleId === titleId ? '' : titleId;
    await updateDoc(doc(db, 'users', user.uid), { currentTitle: nextTitle });
    setCurrentTitleId(nextTitle);
  };

  if (loading) return <div className="min-h-screen bg-black text-zinc-400 font-mono flex items-center justify-center text-xs tracking-widest">{t.loading}</div>;
  if (!user) return <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center space-y-4"><p className="text-zinc-400 font-mono text-xs">UNAUTHORIZED ACCESS</p><Link href="/" className="px-4 py-2 bg-zinc-900 rounded-xl text-xs font-bold text-white hover:bg-white hover:text-black transition-all">{t.homeBtn}</Link></div>;

  const hasAi = reactionBest > 0 && reactionBest <= 150 && cpsBest >= 13;
  const hasGodspeed = hasAi || (reactionBest > 0 && reactionBest <= 180) || cpsBest >= 10;
  const hasFast = hasGodspeed || (reactionBest > 0 && reactionBest <= 230) || cpsBest >= 7;

  const unlockedTitles: Record<string, boolean> = { dev: isDevUser, ai: hasAi, godspeed: hasGodspeed, fast: hasFast, newbie: true };
  const activeTitle = TITLES_LIST.find((t: any) => t.id === currentTitleId);
  const nextXpNeeded = getNextXpForLevel(level);
  const xpPercentage = Math.min(100, Math.round((xp / nextXpNeeded) * 100));

  const isRankedUnlocked = level >= RANKED_UNLOCK_LEVEL;
  const myTier = isRankedUnlocked ? getTierFromLp(rankedLp) : { name: t.unranked, division: '', localLp: 0, color: 'text-zinc-500 border-zinc-800 bg-zinc-500/5', xpBoost: 0 };

  const TABS: { id: TabType; label: string; locked?: boolean }[] = [
    { id: 'info', label: t.tab_info }, { id: 'comp', label: t.tab_comp, locked: !isRankedUnlocked },
    { id: 'title', label: t.tab_title }, { id: 'friends', label: t.tab_friends },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans antialiased flex flex-col select-none overflow-x-hidden">
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <nav className="sticky top-0 z-50 w-full bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-900/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group w-20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transform group-hover:-translate-x-1 transition-transform"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span className="text-[10px] font-mono font-bold tracking-widest uppercase mt-[1px] hidden sm:block">Back</span>
          </Link>
          <div className="flex-1 flex justify-center items-center gap-6 sm:gap-10 h-full">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative h-full text-[10px] sm:text-[11px] font-mono font-bold tracking-widest uppercase transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
                {tab.label}
                {tab.locked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-40"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.3)]" />}
              </button>
            ))}
          </div>
          <div className="w-20 text-right text-[9px] font-mono font-bold text-zinc-700 tracking-widest uppercase hidden sm:block">UID: {user?.uid.slice(0,5)}</div>
        </div>
      </nav>

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col space-y-6 p-4 sm:p-8 mt-4">
        
        <ProfileHeader 
          user={user} displayName={displayName} setDisplayName={setDisplayName} 
          isEditing={isEditing} setIsEditing={setIsEditing} saveLoading={saveLoading} 
          handleSaveProfile={handleSaveProfile} handleLogout={handleLogout} 
          level={level} myTier={myTier} activeTitle={activeTitle} 
          canEditName={canEditName} daysLeftToEdit={daysLeftToEdit} isDevUser={isDevUser} t={t} lang={lang}
        />

        <div className="w-full min-h-[300px]">
          {activeTab === 'info' && <InfoTab t={t} xp={xp} nextXpNeeded={nextXpNeeded} xpPercentage={xpPercentage} activeTitle={activeTitle} myTier={myTier} reactionBest={reactionBest} cpsBest={cpsBest} />}
          {activeTab === 'comp' && <CompTab t={t} isRankedUnlocked={isRankedUnlocked} myTier={myTier} rankedLp={rankedLp} />}
          {activeTab === 'title' && <TitleTab t={t} titlesList={TITLES_LIST} unlockedTitles={unlockedTitles} currentTitleId={currentTitleId} handleEquipToggle={handleEquipToggle} />}
          {activeTab === 'friends' && <FriendsPanel lang={lang} />}
        </div>

      </div>
    </div>
  );
}