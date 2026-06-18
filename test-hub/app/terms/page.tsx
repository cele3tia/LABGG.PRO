'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const CONTENT = {
  ko: {
    title: '이용약관',
    subtitle: 'LABGG.PRO 서비스 이용을 위한 기본 규칙입니다.',
    sections: [
      {
        id: '1',
        title: '1. 목적 및 약관의 동의',
        body: '본 약관은 LABGG.PRO(이하 "회사" 또는 "서비스")가 제공하는 피지컬 측정 및 멀티플레이어 경쟁 서비스의 이용 조건을 규정합니다. 사용자는 서비스를 이용함으로써 본 약관에 동의한 것으로 간주됩니다.'
      },
      {
        id: '2',
        title: '2. 계정 및 데이터 관리',
        body: '회사는 Firebase Auth를 통해 인증된 계정 정보를 기반으로 서비스를 제공합니다. 사용자는 자신의 계정 비밀번호 및 보안을 유지할 책임이 있으며, 계정 오용으로 인한 데이터 손실은 사용자 본인에게 책임이 있습니다.'
      },
      {
        id: '3',
        title: '3. 금지 행위 (부정행위 제한)',
        body: '공정한 경쟁을 위해 서비스 내에서 매크로, 하드웨어 핵, 에임 어시스트, 패킷 조작 등의 비정상적인 방법으로 기록을 조작하는 행위를 엄격히 금지합니다. 적발 시 해당 기록은 사전 경고 없이 리더보드에서 영구 삭제되며 계정이 차단될 수 있습니다.'
      },
      {
        id: '4',
        title: '4. 서비스의 변경 및 면책조항',
        body: '본 서비스는 실시간 성능 측정을 위한 것으로, 네트워크 환경이나 서버 상태에 따라 측정값에 오차가 발생할 수 있습니다. 회사는 서버 점검이나 패치로 인한 데이터 일시 중단에 대해 책임을 지지 않습니다.'
      }
    ],
    back: '← 홈으로 돌아가기'
  },
  en: {
    title: 'Terms of Service',
    subtitle: 'These are the basic rules for using the LABGG.PRO service.',
    sections: [
      {
        id: '1',
        title: '1. Acceptance of Terms',
        body: 'These Terms of Service govern your use of LABGG.PRO ("the Service"). By accessing or using our physical measurement and multiplayer arena services, you agree to be bound by these terms.'
      },
      {
        id: '2',
        title: '2. Account & Data Security',
        body: 'We provide services based on account information authenticated through Firebase Auth. You are entirely responsible for maintaining the confidentiality of your account, and any data loss due to account misuse is your own responsibility.'
      },
      {
        id: '3',
        title: '3. Prohibited Conduct (Anti-Cheat)',
        body: 'To ensure fair competition, any attempt to manipulate scores using macros, hardware hacks, bot scripts, or packet tampering is strictly prohibited. Violations will result in permanent removal from the leaderboard without prior notice and a potential account ban.'
      },
      {
        id: '4',
        title: '4. Disclaimer of Liability',
        body: 'Since this service measures real-time physical reaction, slight variations may occur depending on network latency or server conditions. The Service is not liable for temporary data interruptions caused by server maintenance or patches.'
      }
    ],
    back: '← Back to Home'
  }
};

export default function TermsPage() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);
  }, []);

  const t = CONTENT[lang];

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans antialiased pt-24 pb-20 px-6 sm:px-10 max-w-4xl mx-auto">
      <div className="border-b border-zinc-900 pb-6 mb-10">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <h1 className="text-4xl font-black text-white tracking-tight mt-6 mb-2">{t.title}</h1>
        <p className="text-sm text-zinc-500">{t.subtitle}</p>
      </div>

      <div className="space-y-10">
        {t.sections.map((section) => (
          <div key={section.id} className="bg-[#0c0c0e] border border-zinc-900 rounded-2xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-white mb-3 font-sans tracking-tight">{section.title}</h2>
            <p className="text-sm leading-relaxed text-zinc-400">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}