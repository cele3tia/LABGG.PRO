"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLanguage } from "../components/providers";
import { auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";

export default function ForgotPasswordPage() {
  const { lang } = useLanguage();
  
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        lang === "ko" 
          ? "이메일로 비밀번호 재설정 링크가 발송되었습니다." 
          : "A password reset link has been sent to your email."
      );
    } catch (err: any) {
      console.error("이메일 전송 실패:", err);
      if (err.code === "auth/user-not-found") {
        setError(
          lang === "ko" 
            ? "등록되지 않은 계정입니다." 
            : "No account found with this email."
        );
      } else if (err.code === "auth/invalid-email") {
        setError(
          lang === "ko" 
            ? "유효하지 않은 이메일 주소입니다." 
            : "Please enter a valid email address."
        );
      } else {
        setError(
          lang === "ko" 
            ? "이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." 
            : "Failed to send the email. Please try again later."
        );
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
              {lang === "ko" ? "비밀번호 찾기" : "Reset Password"}
            </h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              {lang === "ko" 
                ? "가입 시 사용한 이메일 주소를 입력해 주세요. 비밀번호를 재설정할 수 있는 링크를 보내드립니다." 
                : "Enter the email address associated with your account and we'll send you a link to reset your password."}
            </p>
          </div>

          {error && (
            <div className="w-full mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[12px] font-bold text-center leading-relaxed">
              {error}
            </div>
          )}

          {message && (
            <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[12px] font-bold text-center leading-relaxed">
              {message}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "이메일 주소" : "Email Address"}
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
            
            <button 
              type="submit" 
              disabled={loading || !!message}
              className="w-full py-3.5 mt-4 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-[12px] tracking-wider uppercase transition-all hover:scale-[0.98] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer flex justify-center items-center h-[46px]"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                lang === "ko" ? "이메일 전송" : "Send Email"
              )}
            </button>
          </form>

        </div>
      </main>

      <Footer />
    </div>
  );
}