'use client';

import React, { useState, useEffect } from 'react';
import MagicRings from '../components/MagicRings'; 
import IdleGame from '../components/IdleGame'; 
import HomeNav from '../main/HomeNav'; 
import { TRANSLATIONS, themeStyles as s, getLevelBadgeColor } from '../main/homeData'; 
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function IdlePage() {
  const [lang, setLang] = useState<'ko' | 'en'>('en'); 
  const [user, setUser] = useState<User | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [dbDisplayName, setDbDisplayName] = useState<string>('');
  const [titleId, setTitleId] = useState<string>(''); 

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const dbData = docSnap.data();
          setLevel(dbData.level || 1);
          setDbDisplayName(dbData.displayName || currentUser.displayName || 'Player');
          setTitleId(dbData.currentTitle || ''); 
        } else {
          setDbDisplayName(currentUser.displayName || 'Player');
        }
      } else {
        setDbDisplayName('');
        setLevel(1);
        setTitleId('');
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLangChange = (newLang: 'ko' | 'en') => {
    setLang(newLang);
    localStorage.setItem('site-lang', newLang);
  };

  const t = TRANSLATIONS[lang];

  return (
    <div className={`relative min-h-screen flex flex-col ${s.bg} font-sans antialiased selection:bg-white selection:text-black overflow-x-hidden tracking-tight`}>
      
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-80">
        <MagicRings color="#d9b2ff" colorTwo="#9e38ff" ringCount={6} speed={1} attenuation={10} lineThickness={6} baseRadius={0.35} radiusStep={0.1} scaleRate={0.1} opacity={1} blur={5} noiseAmount={0.1} rotation={0} ringGap={1.5} fadeIn={0.7} fadeOut={0.5} followMouse={false} mouseInfluence={0.2} hoverScale={1.2} parallax={0.05} clickBurst={true} />
      </div>

      <div className="absolute inset-x-0 bottom-0 top-24 z-[1] pointer-events-none select-none overflow-hidden">
        <div className="absolute inset-0 opacity-100" style={{ backgroundImage: s.gridLine, backgroundSize: '40px 40px' }} />
      </div>

      <HomeNav 
        lang={lang} 
        onLangChange={handleLangChange} 
        user={user} 
        dbDisplayName={dbDisplayName} 
        level={level} 
        t={t} 
        s={s} 
        getLevelBadgeColor={getLevelBadgeColor} 
      />

      {/* 💡 짜치는 텍스트 다 날리고 깔끔하게 게임 컴포넌트만 렌더링 */}
      <main className="relative z-10 flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 pt-8 pb-24">
        <IdleGame lang={lang} titleId={titleId} />
      </main>

    </div>
  );
}