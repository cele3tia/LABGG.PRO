'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// 상위 폴더 경로 구조에 맞춰서 정확하게 수정 (app/login/page.tsx 기준 두 단계 위가 최상위)
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);
  }, []);

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
      noAccount: "Don't have an account?",
      signUp: 'Sign Up',
      backToHome: '← Back to Dashboard'
    }
  }[lang];

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

  return (
    <div className="relative min-h-screen bg-[#000000] text-zinc-100 font-sans antialiased flex flex-col justify-center items-center px-6 overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.05),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.12) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      </div>

      <div className="absolute top-8 left-8 z-10">
        <Link href="/" className="font-mono text-[11px] font-bold text-zinc-500 hover:text-white transition-colors tracking-widest uppercase">
          {t.backToHome}
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#040404]/60 border border-zinc-900 rounded-2xl p-8 md:p-10 backdrop-blur-md shadow-2xl">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t.title}</h1>
          <p className="text-xs font-light text-zinc-500 tracking-wide">{t.subtitle}</p>
        </div>

        {error && <p className="text-xs font-mono text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleEmailSignIn} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-bold text-zinc-500 tracking-wider uppercase">{t.emailLabel}</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com"
              className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 focus:bg-[#080808] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block font-mono text-[10px] font-bold text-zinc-500 tracking-wider uppercase">{t.passwordLabel}</label>
              <a href="#" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">{t.forgotPw}</a>
            </div>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full bg-zinc-950/50 border border-zinc-900 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:outline-none focus:border-zinc-500 focus:bg-[#080808] transition-all font-mono"
            />
          </div>

          <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-black text-xs font-black tracking-widest uppercase py-3.5 rounded-xl transition-all shadow-md transform active:scale-[0.99]">
            {t.signInBtn}
          </button>
        </form>

        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-900" /></div>
          <span className="relative bg-[#040404] px-3 font-mono text-[9px] font-bold text-zinc-600 tracking-widest">{t.or}</span>
        </div>

        <div className="space-y-2.5">
          <button 
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-zinc-950 border border-zinc-900 rounded-xl py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t.googleSignIn}
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          {t.noAccount}{' '}
          <a href="#" className="text-zinc-400 font-bold hover:text-white border-b border-zinc-800 hover:border-white pb-0.5 transition-all">
            {t.signUp}
          </a>
        </div>
      </div>
    </div>
  );
}