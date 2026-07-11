'use client';

import React from 'react';
import useIdleEngine from './idle/useIdleEngine';
import IdleMinePanel from './idle/IdleMinePanel';
import IdleShopPanel from './idle/IdleShopPanel';

export default function IdleGame({ lang, titleId }: { lang: 'ko' | 'en', titleId?: string }) {
  // 엔진 구동 (두뇌)
  const engine = useIdleEngine(lang, titleId);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-10 select-none">
      {/* 화면 왼쪽 채굴장 UI */}
      <IdleMinePanel engine={engine} lang={lang} />
      
      {/* 화면 오른쪽 상점/가챠 UI */}
      <IdleShopPanel engine={engine} lang={lang} />
    </div>
  );
}