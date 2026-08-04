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
      }
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-[12px] font-bold text-gray-400 animate-pulse">
            Loading...
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  // 아바타에 표시할 첫 글자 추출 (닉네임이 있으면 닉네임, 없으면 이메일 첫 글자)
  const avatarLetter = nickname ? nickname.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[340px] flex flex-col items-center relative">
          
          {/* 뒤로 가기 버튼 */}
          <div className="w-full flex items-center justify-start mb-6">
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

          {/* 🚀 프로필 아바타 및 정보 영역 */}
          <div className="flex flex-col items-center mb-8 w-full">
            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 flex items-center justify-center mb-4 shadow-sm">
              <span className="text-3xl font-bold text-gray-300 dark:text-gray-600">
                {avatarLetter}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight mb-1">
              {lang === "ko" ? "내 프로필" : "My Profile"}
            </h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>

          {/* 닉네임 설정 폼 */}
          <form onSubmit={handleSave} className="w-full space-y-4">
            <div className="space-y-1.5">
              <label className="px-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {lang === "ko" ? "닉네임 (Nickname)" : "Nickname"}
              </label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={lang === "ko" ? "새 닉네임을 입력하세요" : "Enter new nickname"} 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-gray-900 focus:outline-none focus:border-gray-300 dark:focus:border-gray-700 transition-colors text-[13px] font-medium placeholder:text-gray-400"
              />
            </div>
            
            <button 
              type="submit" 
              className="w-full py-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-[12px] tracking-wider uppercase transition-all hover:scale-[0.98] active:scale-95 cursor-pointer"
            >
              {saved ? (lang === "ko" ? "저장 완료! ✓" : "Saved! ✓") : (lang === "ko" ? "변경사항 저장" : "Save Changes")}
            </button>
          </form>

          {/* 구분선 */}
          <div className="w-full h-[1px] bg-gray-100 dark:bg-gray-900 my-8"></div>

          {/* 로그아웃 버튼 (아이콘 추가 및 스타일 개선) */}
          <button 
            type="button" 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-[12px] tracking-wider uppercase transition-colors hover:bg-red-100 dark:hover:bg-red-900/40 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {lang === "ko" ? "로그아웃" : "Sign Out"}
          </button>

        </div>
      </main>

      <Footer />
    </div>
  );
}