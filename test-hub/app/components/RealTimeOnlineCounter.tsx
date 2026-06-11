'use client';

import React, { useEffect, useState } from 'react';
import { database, auth } from '../lib/firebase'; // 💡 위에서 export한 자원들을 가져옴
import { ref, set, onDisconnect, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';

export default function RealTimeOnlineCounter() {
  const [onlineCount, setOnlineCount] = useState<number>(1);

  useEffect(() => {
    // 1. 실시간 데이터베이스의 'status/users' 경로 전체를 실시간 감시
    const totalUsersRef = ref(database, 'status/users');
    
    const unsubscribeCount = onValue(totalUsersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        // 현재 'online: true' 상태인 실제 유저들만 필터링
        const activeCount = Object.values(usersData).filter(
          (user: any) => user.online === true
        ).length;
        
        // 0명 이하일 경우 나 자신(1명)으로 최소치 보정
        setOnlineCount(activeCount > 0 ? activeCount : 1);
      } else {
        setOnlineCount(1);
      }
    });

    // 2. 유저 접속 상태 확인 및 브라우저 종료(퇴장) 감지 세팅
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // 로그인 유저는 UID, 비로그인은 무작위 게스트ID 부여
      const myId = user ? user.uid : `guest_${Math.random().toString(36).substr(2, 9)}`;
      const myStatusRef = ref(database, `status/users/${myId}`);

      // [입장 처리]
      set(myStatusRef, {
        online: true,
        lastChanged: Date.now(),
      });

      // [퇴장 처리] ⭐️ 핵심: 유저가 브라우저를 종료하면 실시간 데이터베이스에서 내 기록을 즉시 삭제
      onDisconnect(myStatusRef).remove();
    });

    // 언마운트 시 리스너 완전 해제
    return () => {
      unsubscribeCount();
      unsubscribeAuth();
    };
  }, []);

  return (
    <span className="tabular-nums">
      {onlineCount.toLocaleString()}
    </span>
  );
}