"use client";

import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useLanguage } from "../components/providers";

export default function PrivacyPage() {
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-white font-sans transition-colors duration-300">
      
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[600px] flex flex-col">
          
          <div className="w-full flex items-center mb-6">
            <Link 
              href="/" 
              className="group flex items-center gap-1.5 text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>{lang === "ko" ? "홈으로" : "Back"}</span>
            </Link>
          </div>

          <h1 className="text-xl font-bold tracking-tight mb-4 text-white">
            {lang === "ko" ? "개인정보처리방침" : "Privacy Policy"}
          </h1>
          
          <div className="space-y-4 text-[12px] text-gray-400 leading-relaxed">
            {lang === "ko" ? (
              <>
                <p>LABGG.PRO(이하 "서비스")는 이용자의 개인정보를 소중하게 생각하며, 안전하게 보호하고 있습니다.</p>
                
                <h3 className="font-bold text-white mt-4">1. 수집하는 개인정보 항목</h3>
                <p>- Google 로그인 시: 이메일 주소, 닉네임, 프로필 정보</p>
                
                <h3 className="font-bold text-white mt-4">2. 개인정보의 수집 및 이용 목적</h3>
                <p>- 회원 식별, 기록 저장 및 서비스 제공</p>
                
                <h3 className="font-bold text-white mt-4">3. 개인정보의 보유 및 파기</h3>
                <p>- 회원 탈퇴 또는 서비스 이용 종료 시 지체 없이 파기합니다.</p>
              </>
            ) : (
              <>
                <p>LABGG.PRO ("Service") values your personal information and protects it securely.</p>
                
                <h3 className="font-bold text-white mt-4">1. Information We Collect</h3>
                <p>- Upon Google Login: Email address, nickname, profile info</p>
                
                <h3 className="font-bold text-white mt-4">2. Purpose of Collection</h3>
                <p>- User identification, saving scores, and providing services</p>
                
                <h3 className="font-bold text-white mt-4">3. Retention and Deletion</h3>
                <p>- Deleted without delay upon account withdrawal or service termination.</p>
              </>
            )}
          </div>

        </div>
      </main>

      <Footer />

    </div>
  );
}