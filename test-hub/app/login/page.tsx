"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLanguage } from "../components/providers";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();

  // 폼 상태 관리
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이메일 로그인 처리 함수
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      console.error("로그인 에러:", err);
      setError(
        lang === "ko" 
          ? "이메일 또는 비밀번호가 올바르지 않습니다." 
          : "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  // 구글 로그인 처리 함수
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("로그인 성공:", user);
      router.push("/");
    } catch (error) {
      console.error("로그인 에러:", error);
      setError(
        lang === "ko"
          ? "구글 로그인에 실패했습니다."
          : "Google login failed."
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300">
      
      <Header />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[320px] flex flex-col items-center relative">
          
          <div className="w-full flex items-center mb-6">
            <Link 
              href="/" 
              className="group flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>{lang === "ko" ? "홈으로" : "Back"}</span>
            </Link>
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-1">{t.welcome}</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-8">
            {t.loginSub}
          </p>

          {/* 에러 메시지 표시 영역 */}
          {error && (
            <div className="w-full mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[12px] font-bold text-center">
              {error}
            </div>
          )}

          {/* 이메일/비밀번호 입력 폼 */}
          <form onSubmit={handleEmailLogin} className="w-full space-y-3">
            <div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t.emailPlaceholder} 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder={t.passwordPlaceholder} 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] placeholder:text-gray-400"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 mt-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-[12px] tracking-wider uppercase transition-opacity hover:opacity-80 disabled:opacity-50 flex justify-center items-center h-[42px]"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                t.signIn
              )}
            </button>
          </form>

          <div className="w-full flex items-center my-6">
            <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-900"></div>
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.or}</span>
            <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-900"></div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-black dark:text-white font-bold text-[12px] tracking-wider transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t.googleLogin}
          </button>

          <div className="mt-6 flex items-center justify-between w-full text-[11px] font-bold text-gray-400">
            {/* 🚀 비밀번호 찾기(Forgot Password) 페이지로 넘어가는 링크 */}
            <Link href="/forgot-password" className="hover:text-black dark:hover:text-white transition-colors">
              {t.forgotPassword}
            </Link>
            
            {/* 🚀 회원가입(Signup) 페이지로 넘어가는 링크 */}
            <Link href="/signup" className="hover:text-black dark:hover:text-white transition-colors">
              {t.createAccount}
            </Link>
          </div>
          
        </div>
      </main>

      <Footer />

    </div>
  );
}