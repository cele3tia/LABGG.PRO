"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLanguage } from "../components/providers";
import { auth } from "../lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

export default function SignupPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 1. 비밀번호 일치 여부 확인
    if (password !== confirmPassword) {
      setError(lang === "ko" ? "비밀번호가 일치하지 않습니다." : "Passwords do not match.");
      return;
    }

    // 2. 비밀번호 유효성 검사 (8~18자리, 영문 및 숫자 포함)
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,18}$/;
    if (!passwordRegex.test(password)) {
      setError(
        lang === "ko" 
          ? "비밀번호는 8~18자리이며, 영문과 숫자를 포함해야 합니다." 
          : "Password must be 8-18 characters with letters and numbers."
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: nickname,
      });

      router.push("/");
    } catch (err: any) {
      console.error("회원가입 실패:", err);
      if (err.code === "auth/email-already-in-use") {
        setError(lang === "ko" ? "이미 사용 중인 이메일입니다." : "Email is already in use.");
      } else {
        setError(lang === "ko" ? "회원가입에 실패했습니다. 다시 시도해주세요." : "Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[340px] flex flex-col items-center relative">
          
          <div className="w-full flex items-center justify-start mb-6">
            <Link 
              href="/login" 
              className="group flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>{lang === "ko" ? "로그인으로 돌아가기" : "Back to Login"}</span>
            </Link>
          </div>

          <div className="flex flex-col items-center mb-8 w-full">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {lang === "ko" ? "회원가입" : "Create Account"}
            </h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center">
              {lang === "ko" ? "가입하고 모든 기능을 이용해 보세요." : "Sign up to get started."}
            </p>
          </div>

          {error && (
            <div className="w-full mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[12px] font-bold text-center leading-relaxed">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="w-full space-y-4">
            
            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "닉네임" : "Nickname"}
              </label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                required
                maxLength={20}
                placeholder={lang === "ko" ? "사용할 닉네임" : "Enter nickname"} 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] font-medium placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "이메일" : "Email"}
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@example.com" 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] font-medium placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "비밀번호" : "Password"}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={18}
                placeholder={lang === "ko" ? "8~18자, 영문+숫자 포함" : "8-18 chars, letter + number"} 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] font-medium placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "비밀번호 확인" : "Confirm Password"}
              </label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                maxLength={18}
                placeholder={lang === "ko" ? "비밀번호를 다시 입력하세요" : "Re-enter your password"} 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] font-medium placeholder:text-gray-400"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3.5 mt-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-[12px] tracking-wider uppercase transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer flex justify-center items-center h-[46px]"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                lang === "ko" ? "가입하기" : "Sign Up"
              )}
            </button>
          </form>

        </div>
      </main>

      <Footer />
    </div>
  );
}