'use client';

import React, { useEffect, useState } from 'react';
import { database, auth } from '../lib/firebase';
import { ref, set, onDisconnect, onValue, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function RealTimeOnlineCounter() {
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    // 1. 전체 유저 상태 실시간 감시 리스너
    const totalUsersRef = ref(database, 'status/users');
    
    const unsubscribeCount = onValue(totalUsersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const activeCount = Object.values(usersData).filter(
          (user: any) => user?.online === true
        ).length;
        
        setOnlineCount(activeCount > 0 ? activeCount : 1);
      } else {
        setOnlineCount(1);
      }
    });

    // 2. 고유 게스트 ID 세션 고정 (재마운트 시 중복 생성 방지)
    let guestId = '';
    if (typeof window !== 'undefined') {
      let savedId = sessionStorage.getItem('labgg_guest_id');
      if (!savedId) {
        savedId = `guest_${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem('labgg_guest_id', savedId);
      }
      guestId = savedId;
    }

    let myStatusRef: any = null;

    // 3. 유저 인증 상태 및 연결 리스너 세팅
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // 기존에 등록된 참조가 있다면 먼저 안전하게 제거
      if (myStatusRef) {
        remove(myStatusRef);
      }

      const myId = user ? user.uid : guestId;
      myStatusRef = ref(database, `status/users/${myId}`);

      // [입장 처리]
      set(myStatusRef, {
        online: true,
        lastChanged: Date.now(),
      });

      // [소켓 끊김(퇴장) 예약]
      onDisconnect(myStatusRef).remove();
    });

    // 4. 컴포넌트 언마운트(페이지 전환 등) 시 클라이언트 단에서 즉시 청소
    return () => {
      unsubscribeCount();
      unsubscribeAuth();
      if (myStatusRef) {
        remove(myStatusRef);
      }
    };
  }, []);

  return (
    <span className="tabular-nums">
      {onlineCount.toLocaleString()}
    </span>
  );
}