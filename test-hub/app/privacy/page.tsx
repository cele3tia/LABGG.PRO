import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-zinc-300 font-sans p-6 sm:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="border-b border-zinc-900 pb-6 mb-8">
          <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
            ← BACK TO HOME
          </Link>
          <h1 className="text-3xl font-black text-white mt-4">개인정보처리방침</h1>
          <p className="text-sm font-mono text-zinc-500 mt-2">Privacy Policy | Last Updated: 2026. 06</p>
        </div>

        <div className="space-y-6 text-sm leading-relaxed text-zinc-400">
          <section>
            <h2 className="text-lg font-bold text-white mb-2">1. 수집하는 개인정보 항목</h2>
            <p>LABGG.PRO(이하 "본 사이트")는 원활한 서비스 제공, 사용자 랭킹 시스템 운영을 위해 아래와 같은 최소한의 개인정보를 수집하고 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>필수 항목: 파이어베이스(Firebase) 연동을 통한 구글 등 소셜 로그인 식별자(UID), 닉네임, 프로필 이미지 URL</li>
              <li>자동 수집 항목: 접속 IP 정보, 쿠키(Cookie), 서비스 이용 기록 (반응속도 및 CPS 점수)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">2. 개인정보의 수집 및 이용 목적</h2>
            <p>수집된 개인정보는 다음의 목적을 위해 활용됩니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>글로벌 리더보드(명예의 전당) 랭킹 등재 및 점수 기록 보존</li>
              <li>사용자 식별 및 본인 인증, 불량 회원의 부정 이용 방지</li>
              <li>구글 애드센스 등 맞춤형 광고 송출을 위한 통계적 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">3. 개인정보의 보유 및 이용 기간</h2>
            <p>이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용 목적이 달성되면 지체 없이 파기합니다. 단, 리더보드 기록 유지를 위해 닉네임과 점수 데이터는 서비스 종료 시까지 보관될 수 있습니다. 탈퇴를 원하실 경우 관리자 이메일로 요청할 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-2">4. 광고 및 쿠키(Cookie) 사용</h2>
            <p>본 사이트는 Google AdSense를 포함한 제3자 광고를 게재할 수 있습니다. Google과 같은 제3자 공급업체는 쿠키를 사용하여 사용자의 과거 사이트 방문 기록을 기반으로 맞춤 광고를 게재합니다. 사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</p>
          </section>
        </div>

      </div>
    </div>
  );
}