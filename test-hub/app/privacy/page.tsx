'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const CONTENT = {
  ko: {
    title: '개인정보처리방침',
    subtitle: 'LABGG.PRO가 사용자의 데이터를 안전하게 보호하는 방법입니다.',
    sections: [
      {
        id: '1',
        title: '1. 수집하는 개인정보 항목',
        body: '서비스는 구글 소셜 로그인 등 Firebase Auth를 통해 제공되는 유저 고유 ID(UID), 이메일 주소, 프로필 이미지 및 표시 이름을 수집합니다. 또한 사용자가 테스트를 통해 기록한 반응 속도(ms), CPS 등의 게임 스코어 데이터가 Firestore에 안전하게 저장됩니다.'
      },
      {
        id: '2',
        title: '2. 개인정보의 이용 목적',
        body: '수집된 데이터는 글로벌 리더보드 순위 반영, 사용자의 최고 기록(My Best) 트래킹, 레벨업 시스템 등 서비스의 핵심 기능 제공 및 실시간 멀티플레이어 매칭을 위해서만 사용됩니다.'
      },
      {
        id: '3',
        title: '3. 제3자 제공 및 위탁',
        body: '본 서비스는 안정적인 데이터 저장 및 인증을 위해 Google Firebase(Auth, Firestore) 시스템을 이용하며, 이 외에 사용자의 동의 없이 어떠한 개인정보도 무단으로 제3자에게 판매하거나 공유하지 않습니다.'
      },
      {
        id: '4',
        title: '4. 데이터 파기 및 유저의 권리',
        body: '사용자는 언제든지 서비스 내에서 탈퇴를 요청하거나 수집된 개인정보의 삭제를 요구할 수 있습니다. 계정 삭제 시 Firestore에 기록된 모든 랭킹 및 프로필 데이터는 즉시 영구 파기됩니다.'
      }
    ],
    back: '← 홈으로 돌아가기'
  },
  en: {
    title: 'Privacy Policy',
    subtitle: 'How LABGG.PRO securely protects and manages your data.',
    sections: [
      {
        id: '1',
        title: '1. Information We Collect',
        body: 'The Service collects your unique User ID (UID), email address, profile image, and display name provided through Firebase Auth (e.g., Google Sign-In). Additionally, game score data such as visual reaction time (ms) and CPS captured during tests are securely stored in Firestore.'
      },
      {
        id: '2',
        title: '2. Purpose of Data Use',
        body: 'Collected data is exclusively used for core service mechanics, including updating the global leaderboard rankings, tracking your historical high scores (My Best), managing the level-up system, and executing real-time multiplayer matchmaking.'
      },
      {
        id: '3',
        title: '3. Third-Party Services & Data Processor',
        body: 'We utilize Google Firebase (Authentication & Firestore) for infrastructure stability and secure identity management. We never sell, rent, or distribute your personal data to any external third parties for marketing purposes.'
      },
      {
        id: '4',
        title: '4. Data Retention & User Rights',
        body: 'You retain the right to request account deletion or the erasure of your personal data at any time. Upon account deletion, all profiles and leaderboard match history associated with your UID stored in Firestore will be permanently deleted immediately.'
      }
    ],
    back: '← Back to Home'
  }
};

export default function PrivacyPage() {
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