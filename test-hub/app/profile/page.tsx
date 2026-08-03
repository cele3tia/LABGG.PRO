"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLanguage } from "../components/providers";
import { auth } from "../lib/firebase";
import { updateProfile, signOut, onAuthStateChanged, User } from "firebase/auth";

export default function ProfilePage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/login");
      } else {
        setUser(currentUser);
        setNickname(currentUser.displayName || "");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, {
        displayName: nickname,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("닉네임 변경 실패:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  if (loading) return null;

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

          <h1 className="text-xl font-bold tracking-tight mb-1">
            {lang === "ko" ? "프로필 설정" : "Profile Settings"}
          </h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-8">
            {user?.email}
          </p>

          <form onSubmit={handleSave} className="w-full space-y-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                {lang === "ko" ? "닉네임" : "Nickname"}
              </label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={lang === "ko" ? "닉네임을 입력하세요" : "Enter nickname"} 
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] placeholder:text-gray-400"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3 mt-2 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-[12px] tracking-wider uppercase transition-opacity hover:opacity-80 cursor-pointer"
            >
              {saved ? (lang === "ko" ? "저장 완료!" : "Saved!") : (lang === "ko" ? "저장하기" : "Save")}
            </button>
          </form>

          <div className="w-full h-[1px] bg-gray-100 dark:bg-gray-900 my-6"></div>

          <button 
            type="button" 
            onClick={handleLogout}
            className="w-full py-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-bold text-[12px] tracking-wider uppercase transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer"
          >
            {lang === "ko" ? "로그아웃" : "Sign Out"}
          </button>

        </div>
      </main>

      <Footer />
    </div>
  );
}