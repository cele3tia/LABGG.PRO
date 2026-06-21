'use client';

/* ==========================================
   [START: IMPORTS_AND_TYPES]
   ========================================== */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db, googleProvider } from '../lib/firebase';
import { onAuthStateChanged, updateProfile, signOut, User, linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore'; 

// 분리된 컴포넌트 & 로직 임포트
import { RANKED_UNLOCK_LEVEL, TWO_WEEKS_MS, getNextXpForLevel, getTierFromLp, TRANSLATIONS, getTitlesList } from './utils';
import ProfileHeader from './components/ProfileHeader';
import { InfoTab, CompTab, TitleTab } from './components/TabViews';
import FriendsPanel from './friends';

type TabType = 'info' | 'comp' | 'title' | 'friends';
/* ==========================================
   [END: IMPORTS_AND_TYPES]
   ========================================== */

export default function ProfilePage() {
  /* ==========================================
     [START: STATE_AND_ROUTER]
     ========================================== */
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
  
  // 수정 및 연동 시스템 모달 컨트롤 상태
  const [displayName, setDisplayName] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [canEditName, setCanEditName] = useState<boolean>(true);
  const [daysLeftToEdit, setDaysLeftToEdit] = useState<number>(0);

  // 인-UI UI 모달 상태
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [linkError, setError] = useState<string>('');
  const [linkSuccess, setLinkSuccess] = useState<boolean>(false);
  /* ==========================================
     [END: STATE_AND_ROUTER]
     ========================================== */

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

  /* ==========================================
     [START: INITIAL_EFFECTS]
     ========================================== */
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
  /* ==========================================
     [END: INITIAL_EFFECTS]
     ========================================== */

  const t = TRANSLATIONS[lang];
  const TITLES_LIST = getTitlesList(t);

  /* ==========================================
     [START: LOCAL_DYNAMIC_TEXT_MAP]
     ========================================== */
  // 💡 모달 및 배너의 완벽한 한영 연동을 위한 로컬 독립 딕셔너리 구축
  const uiText = {
    ko: {
      bannerTitle: '게스트 계정 보호 활성화됨',
      bannerDesc: '지금 구글 계정과 연동하시면 로그아웃해도 현재 레벨, XP, 기록 보드가 안전하게 정식 영구 저장됩니다.',
      bannerBtn: '구글 계정 연동하기',
      modalTitle: '데이터 영구 삭제 경고',
      modalDesc: '현재 게스트 계정입니다. 지금 계정 연동 없이 로그아웃하시면 공들여 쌓아온 모든 전적, 레벨, 누적 경험치가 시스템 DB에서 즉시 완전 삭제되며 영구 복구가 불가능합니다.',
      modalSuccess: '🎉 계정 연동 성공! 회원 승격 정산 중...',
      modalLinkBtn: '🚀 구글 계정 연동하고 기록 지키기',
      modalLogoutBtn: '그냥 로그아웃 (기록 폭파)',
      modalCancelBtn: '취소하고 플레이로 돌아가기'
    },
    en: {
      bannerTitle: 'GUEST ACCOUNT PROTECTION ACTIVE',
      bannerDesc: 'Link your Google account now to permanently secure your current level, XP, and record boards.',
      bannerBtn: 'Link Google Account',
      modalTitle: 'PERMANENT DATA LOSS WARNING',
      modalDesc: 'You are currently using a Guest Account. Logging out without linking will instantly and permanently erase all your stats, levels, and accumulated XP from the server database.',
      modalSuccess: '🎉 Account Linked Successfully! Upgrading profile...',
      modalLinkBtn: '🚀 Link Google Account & Secure Data',
      modalLogoutBtn: 'Discard & Log Out Anyway',
      modalCancelBtn: 'Cancel & Return to Profile'
    }
  }[lang];
  /* ==========================================
     [END: LOCAL_DYNAMIC_TEXT_MAP]
     ========================================== */

  /* ==========================================
     [START: ACTION_HANDLERS]
     ========================================== */
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

  const handleLinkAccount = async () => {
    if (!auth.currentUser) return;
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      
      setLinkSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/credential-already-in-use') {
        setError(lang === 'ko' ? '이 구글 계정은 이미 등록된 회원입니다. 다른 구글 계정을 선택해 주세요.' : 'This Google account is already linked to another user.');
      } else {
        setError(err.message);
      }
    }
  };

  const handleLogout = async () => { 
    if (user?.isAnonymous) {
      setShowLinkModal(true); 
      return;
    }
    executeActualSignOut();
  };

  const executeActualSignOut = async () => {
    await signOut(auth); 
    router.push('/'); 
  };

  const handleEquipToggle = async (titleId: string) => {
    if (!user) return;
    const nextTitle = currentTitleId === titleId ? '' : titleId;
    await updateDoc(doc(db, 'users', user.uid), { currentTitle: nextTitle });
    setCurrentTitleId(nextTitle);
  };
  /* ==========================================
     [END: ACTION_HANDLERS]
     ========================================== */

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
    <div className="min-h-screen bg-[#030303] text-zinc-100 font-sans antialiased flex flex-col select-none overflow-x-hidden relative">
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* 💡 [모던 패치 1] 게스트 연동 상단 인-UI 하이테크 플랫 배너 (한영 연동 완료) */}
      {user?.isAnonymous && (
        <div className="w-full bg-zinc-950/40 border-b border-white/[0.06] p-4 relative z-50">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center md:text-left">
              <p className="text-[10px] font-mono font-black text-purple-400 tracking-[0.15em] uppercase flex items-center justify-center md:justify-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                {uiText.bannerTitle}
              </p>
              <p className="text-xs text-zinc-500 max-w-2xl font-medium">{uiText.bannerDesc}</p>
            </div>
            <button 
              onClick={handleLinkAccount}
              className="px-4 py-2 bg-zinc-100 hover:bg-white text-black text-xs font-black tracking-widest uppercase rounded-xl transition-all whitespace-nowrap active:scale-95 shadow-lg"
            >
              {uiText.bannerBtn}
            </button>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 w-full bg-[#030303]/70 backdrop-blur-xl border-b border-white/[0.05]">
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
          {activeTab === 'friends' && <FriendsPanel lang={lang} currentUser={user} />}
        </div>
      </div>

      {/* 💡 [모던 패치 2] 미니멀 다크 스페이스 모달 레이어 패널 (한영 완벽 연동) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#09090b] border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(158,56,255,0.12)] animate-in zoom-in-95 duration-300 text-center">
            
            <div className="w-11 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">{uiText.modalTitle}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                {uiText.modalDesc}
              </p>
            </div>

            {linkError && <p className="text-[11px] font-mono text-red-400 bg-red-500/5 p-2.5 rounded-xl border border-red-500/10 text-center">{linkError}</p>}
            {linkSuccess && <p className="text-[11px] font-mono text-emerald-400 bg-emerald-500/5 p-2.5 rounded-xl border border-emerald-500/10 animate-pulse">{uiText.modalSuccess}</p>}

            <div className="flex flex-col gap-2 pt-1">
              <button 
                onClick={handleLinkAccount}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
              >
                {uiText.modalLinkBtn}
              </button>
              <button 
                onClick={executeActualSignOut}
                className="w-full py-3 bg-zinc-900 border border-white/[0.05] hover:bg-zinc-800 text-zinc-400 hover:text-red-400 text-xs font-bold tracking-widest uppercase rounded-xl transition-all"
              >
                {uiText.modalLogoutBtn}
              </button>
              <button 
                onClick={() => { setShowLinkModal(false); setError(''); }}
                className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
              >
                {uiText.modalCancelBtn}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}