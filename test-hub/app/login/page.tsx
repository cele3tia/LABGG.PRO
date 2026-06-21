'use client';

/* ==========================================
   [START: IMPORTS_AND_TYPES]
   ========================================== */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MagicRings from '../components/MagicRings'; 
import { auth, googleProvider } from '../lib/firebase';
// 💡 signInAnonymously(익명/게스트 로그인) 추가 임포트
import { signInWithPopup, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
/* ==========================================
   [END: IMPORTS_AND_TYPES]
   ========================================== */

export default function LoginPage() {
  /* ==========================================
     [START: STATE_AND_ROUTER]
     ========================================== */
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isMounted, setIsMounted] = useState(false); 
  /* ==========================================
     [END: STATE_AND_ROUTER]
     ========================================== */


  /* ==========================================
     [START: INITIAL_EFFECTS]
     ========================================== */
  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);
  /* ==========================================
     [END: INITIAL_EFFECTS]
     ========================================== */


  /* ==========================================
     [START: TRANSLATION_DATA]
     ========================================== */
  const t = {
    ko: {
      title: '로그인',
      subtitle: 'LABGG.PRO 계정으로 접속',
      emailLabel: '이메일 주소',
      passwordLabel: '비밀번호',
      rememberMe: '로그인 상태 유지',
      forgotPw: '비밀번호를 잊으셨나요?',
      signInBtn: '접속하기',
      or: '또는',
      googleSignIn: 'Google 계정으로 계속하기',
      guestSignIn: '게스트 모드로 시작하기 (경쟁전 불가)', // 💡 게스트 문구 추가
      noAccount: '아직 계정이 없으신가요?',
      signUp: '회원가입',
      backToHome: '← 메인 대시보드로 돌아가기'
    },
    en: {
      title: 'Sign In',
      subtitle: 'Access your LABGG.PRO account',
      emailLabel: 'Email Address',
      passwordLabel: 'Password',
      rememberMe: 'Keep me signed in',
      forgotPw: 'Forgot password?',
      signInBtn: 'Sign In',
      or: 'OR',
      googleSignIn: 'Continue with Google',
      guestSignIn: 'Continue as Guest (No Ranked)', // 💡 게스트 문구 추가
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      backToHome: '← Back to Dashboard'
    }
  }[lang];
  /* ==========================================
     [END: TRANSLATION_DATA]
     ========================================== */


  /* ==========================================
     [START: AUTH_HANDLERS]
     ========================================== */
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 💡 게스트 로그인 핸들러 기능 탑재
  const handleGuestSignIn = async () => {
    setError('');
    try {
      await signInAnonymously(auth);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  };
  /* ==========================================
     [END: AUTH_HANDLERS]
     ========================================== */

  return (
    <div className="relative min-h-screen bg-[#000000] text-zinc-100 font-sans antialiased flex flex-col justify-between items-center overflow-hidden tracking-tight">
      
      {/* 🔮 BACKGROUND_RINGS */}
      <div className="fixed inset-0 z-[0] pointer-events-none opacity-70">
        <MagicRings color="#d9b2ff" colorTwo="#9e38ff" ringCount={5} speed={0.8} attenuation={11} lineThickness={5} baseRadius={0.38} radiusStep={0.09} scaleRate={0.07} opacity={1} blur={6} noiseAmount={0.05} rotation={15} ringGap={1.4} clickBurst={false} />
      </div>

      {/* 📐 GRID_LINES */}
      <div className="absolute inset-0 z-[1] pointer-events-none select-none opacity-30" 
           style={{ backgroundImage: 'linear-gradient(to right, rgba(39,39,42,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* ↩️ TOP_BACK_BUTTON */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-12 py-6">
        <Link href="/" className="text-xs font-mono font-black text-zinc-500 hover:text-white transition-colors tracking-widest uppercase">
          {t.backToHome}
        </Link>
      </header>

      {/* 💳 MAIN_LOGIN_CARD_CONTAINER */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-6 pb-24">
        <div className={`w-full max-w-md transition-all duration-1000 transform ease-[cubic-bezier(0.2,1,0.3,1)] ${isMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
          
          <div className="relative p-[1px] rounded-3xl bg-zinc-900 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-zinc-800/50 backdrop-blur-xl">
            
            <div className="bg-[#070709]/90 rounded-[23px] p-8 sm:p-10 space-y-6">
              
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t.title}</h1>
                <p className="text-xs font-light text-zinc-500 tracking-wide">{t.subtitle}</p>
              </div>

              {error && (
                <div className="text-xs font-mono text-red-500 bg-red-500/5 border border-red-500/10 p-3 rounded-xl text-center">
                  {error}
                </div>
              )}

              {/* 📥 EMAIL_FORM_UI */}
              <form onSubmit={handleEmailSignIn} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-bold text-zinc-500 tracking-wider uppercase pl-1">{t.emailLabel}</label>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
                    className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#9e38ff] focus:ring-1 focus:ring-[#9e38ff]/30 focus:bg-[#080808] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="block font-mono text-[10px] font-bold text-zinc-500 tracking-wider uppercase">{t.passwordLabel}</label>
                    <a href="#" className="text-[11px] text-zinc-600 hover:text-[#9e38ff] transition-colors">{t.forgotPw}</a>
                  </div>
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full bg-zinc-950/60 border border-zinc-900 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-[#9e38ff] focus:ring-1 focus:ring-[#9e38ff]/30 focus:bg-[#080808] transition-all font-mono"
                  />
                </div>

                <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-black text-xs font-black tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-md transform active:scale-[0.98]">
                  {t.signInBtn}
                </button>
              </form>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-900" /></div>
                <span className="relative bg-[#070709] px-3 font-mono text-[9px] font-bold text-zinc-600 tracking-widest">{t.or}</span>
              </div>

              {/* 🔘 소셜 / 게스트 로그인 버튼 그룹 */}
              <div className="space-y-3">
                {/* 구글 로그인 */}
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="group relative w-full p-[1px] rounded-xl overflow-hidden bg-zinc-900 transition-all duration-300 hover:scale-[1.01]"
                >
                  <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#ff007f] via-[#9e38ff] to-[#42fcff] animate-pulse" />
                  <div className="relative z-10 w-full flex items-center justify-center gap-3 bg-zinc-950 hover:bg-zinc-950/80 rounded-[11px] py-3 text-xs font-bold text-zinc-300 group-hover:text-white transition-all">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    {t.googleSignIn}
                  </div>
                </button>

                {/* 💡 게스트 로그인 버튼 (고스트 브레이크 테크니컬 디자인) */}
                <button
                  type="button"
                  onClick={handleGuestSignIn}
                  className="w-full bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold py-3 rounded-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  {t.guestSignIn}
                </button>
              </div>

              <div className="mt-8 text-center text-xs text-zinc-600">
                {t.noAccount}{' '}
                <a href="#" className="text-zinc-400 font-bold hover:text-[#9e38ff] border-b border-zinc-800 hover:border-[#9e38ff] pb-0.5 transition-all">
                  {t.signUp}
                </a>
              </div>
            </div>
          </div>

        </div>
      </main>

      <div className="w-full py-4 relative z-10" />
    </div>
  );
}