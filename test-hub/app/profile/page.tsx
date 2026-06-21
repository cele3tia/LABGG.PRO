'use client';

/* ==========================================
   [START: IMPORTS_AND_TYPES]
   ========================================== */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// 구글 프로바이더 및 연동 모듈 임포트
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
     [START: ACTION_HANDLERS]
     ========================================= */
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

  // 계정 연동 마이그레이션 핸들러
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

  // 로그아웃 가로채기 모달 호출
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
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans antialiased flex flex-col select-none overflow-x-hidden relative">
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-20" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* 게스트용 실시간 계정 연동 인-UI 상단 배너 */}
      {user?.isAnonymous && (
        <div className="w-full bg-gradient-to-r from-purple-950/40 to-fuchsia-950/20 border-b border-purple-500/20 p-4 relative z-50">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-xs font-mono font-black text-purple-400 tracking-wider uppercase flex items-center justify-center sm:justify-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                GUEST ACCOUNT PROTECTION ACTIVE
              </p>
              <p className="text-xs text-zinc-400">지금 구글 계정과 연동하시면 로그아웃해도 현재 레벨, XP, 기록 보드가 안전하게 정식 영구 저장됩니다.</p>
            </div>
            <button 
              onClick={handleLinkAccount}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-95 transition-all whitespace-nowrap"
            >
              구글 계정 연동하기
            </button>
          </div>
        </div>
      )}

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
          {activeTab === 'friends' && <FriendsPanel lang={lang} currentUser={user} />}
        </div>
      </div>

      {/* 화면 전체 커스텀 인-UI 모달 레이어 패널 */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0a0a0d] border border-purple-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(158,56,255,0.2)] animate-in zoom-in-95 duration-300 text-center">
            
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <svg width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-wide">데이터 영구 삭제 경고</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                현재 게스트 계정입니다. 지금 계정 연동 없이 로그아웃하시면 공들여 쌓아온 <span className="text-purple-400 font-bold">모든 전적, 레벨, 누적 경험치</span>가 시스템 DB에서 즉시 완전 삭제되며 영구 복구가 불가능합니다.
              </p>
            </div>

            {linkError && <p className="text-[11px] font-mono text-red-400 bg-red-500/5 p-2.5 rounded-lg border border-red-500/10">{linkError}</p>}
            {linkSuccess && <p className="text-[11px] font-mono text-emerald-400 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/10 animate-bounce">🎉 계정 연동 성공! 회원 승격 정산 중...</p>}

            <div className="flex flex-col gap-2.5 pt-2">
              <button 
                onClick={handleLinkAccount}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-xs font-black tracking-widest uppercase rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
              >
                🚀 구글 계정 연동하고 기록 지키기
              </button>
              <button 
                onClick={executeActualSignOut}
                className="w-full py-3.5 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-500 hover:text-red-400 text-xs font-bold tracking-widest uppercase rounded-xl transition-all"
              >
                그냥 로그아웃 (기록 폭파)
              </button>
              {/* 💡 구문 오류 주석 제거 후 완벽하게 튜닝한 취소 버튼 패널 */}
              <button 
                onClick={() => { setShowLinkModal(false); setError(''); }}
                className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-[10px] font-mono font-bold tracking-widest uppercase transition-all"
              >
                취소하고 플레이로 돌아가기
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}