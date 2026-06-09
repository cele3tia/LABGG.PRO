'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export default function RealTimeOnlineCounter() {
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    // 1. 나만의 고유한 세션 ID 생성 (새로고침해도 세션스토리지 덕분에 유지됨)
    let sessionId = sessionStorage.getItem('active_session_id');
    if (!sessionId) {
      sessionId = 'user_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('active_session_id', sessionId);
    }

    // 2. 접속했을 때 'online_users' 컬렉션에 내 세션 ID 등록
    const userRef = doc(db, 'online_users', sessionId);
    setDoc(userRef, { timestamp: new Date() }).catch(e => console.error(e));

    // 3. 'online_users' 컬렉션의 전체 문서 개수를 실시간으로 감시 (onSnapshot)
    const q = collection(db, 'online_users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 현재 접속 중인 문서의 총 개수가 곧 실시간 유저 수!
      setOnlineCount(snapshot.size || 1);
    });

    // 4. 유저가 브라우저 창을 닫거나 다른 사이트로 이동할 때 디비에서 내 세션 삭제
    const handleBeforeUnload = () => {
      deleteDoc(userRef);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      deleteDoc(userRef).catch(e => console.error(e));
      unsubscribe();
    };
  }, []);

  return (
    <span className="tabular-nums font-black text-emerald-400">
      {onlineCount}
    </span>
  );
}