'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getTierFromLp } from './utils'; // 💡 티어 계산기 연동

export default function FriendsPanel({ lang, currentUser }: { lang: 'ko' | 'en', currentUser: User | null }) {
  const [searchCode, setSearchCode] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' }); // 알림 메시지 상태

  const t = {
    ko: {
      searchPlaceholder: '정확한 닉네임 또는 UID 입력',
      addBtn: '추가',
      online: 'ONLINE',
      noFriends: '등록된 친구가 없습니다.',
      listTitle: '친구 목록 (FRIENDS)',
      lvl: 'Lv.',
      searching: '탐색 중...',
      notFound: '해당 유저를 찾을 수 없습니다.',
      cannotAddSelf: '자신은 추가할 수 없습니다.',
      alreadyFriend: '이미 등록된 친구입니다.',
      addSuccess: '친구 데이터 링크 성공!'
    },
    en: {
      searchPlaceholder: 'Enter exact Nickname or UID',
      addBtn: 'ADD',
      online: 'ONLINE',
      noFriends: 'No friends added yet.',
      listTitle: 'FRIENDS LIST',
      lvl: 'Lv.',
      searching: 'Searching...',
      notFound: 'User not found.',
      cannotAddSelf: 'Cannot add yourself.',
      alreadyFriend: 'Already friends.',
      addSuccess: 'Friend link successful!'
    }
  }[lang];

  // 1️⃣ 친구 목록 불러오기 로직
  useEffect(() => {
    if (!currentUser) return;
    const fetchFriends = async () => {
      setIsLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const friendUids = userDoc.data().friends || [];
          if (friendUids.length > 0) {
            // 친구 UID 배열을 돌면서 각각의 유저 데이터를 가져옴
            const friendDocs = await Promise.all(friendUids.map((uid: string) => getDoc(doc(db, 'users', uid))));
            const friendsData = friendDocs.map(d => ({ uid: d.id, ...d.data() }));
            setFriends(friendsData);
          } else {
            setFriends([]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, [currentUser]);

  // 2️⃣ 친구 추가 (검색 & DB 등록) 로직
  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !searchCode.trim()) return;
    setStatusMsg({ text: t.searching, type: 'text-zinc-400' });

    try {
      let targetUid = '';
      
      // 닉네임으로 검색
      const usersRef = collection(db, 'users');
      const qName = query(usersRef, where('displayName', '==', searchCode.trim()));
      const snapName = await getDocs(qName);

      if (!snapName.empty) {
        targetUid = snapName.docs[0].id;
      } else {
        // 닉네임이 없으면 UID일 수도 있으니 문서 ID로 직접 찔러봄
        const targetDoc = await getDoc(doc(db, 'users', searchCode.trim()));
        if (targetDoc.exists()) targetUid = targetDoc.id;
      }

      if (!targetUid) {
        setStatusMsg({ text: t.notFound, type: 'text-red-400' });
        return;
      }

      if (targetUid === currentUser.uid) {
        setStatusMsg({ text: t.cannotAddSelf, type: 'text-amber-400' });
        return;
      }

      // 이미 친구인지 확인
      const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const myFriends = myDoc.data()?.friends || [];
      if (myFriends.includes(targetUid)) {
        setStatusMsg({ text: t.alreadyFriend, type: 'text-amber-400' });
        return;
      }

      // 양방향으로 친구 배열에 UID 추가! (arrayUnion이 중복 없이 쏙 넣어줌)
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(targetUid) });
      await updateDoc(doc(db, 'users', targetUid), { friends: arrayUnion(currentUser.uid) });

      setStatusMsg({ text: t.addSuccess, type: 'text-emerald-400' });
      setSearchCode('');
      
      // 화면에 방금 추가한 친구 바로 띄워주기
      const newFriendDoc = await getDoc(doc(db, 'users', targetUid));
      setFriends(prev => [...prev, { uid: targetUid, ...newFriendDoc.data() }]);

    } catch (error) {
      console.error(error);
      setStatusMsg({ text: 'Error fetching data.', type: 'text-red-400' });
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      
      {/* 🔍 친구 검색 및 추가 섹션 */}
      <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-2xl space-y-2">
        <form onSubmit={handleAddFriend} className="flex gap-2">
          <input
            type="text"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#9e38ff] transition-all font-mono"
          />
          <button
            type="submit"
            className="px-5 bg-zinc-100 hover:bg-white text-black text-xs font-mono font-bold tracking-wider rounded-xl transition-all shrink-0 uppercase active:scale-95"
          >
            {t.addBtn}
          </button>
        </form>
        {statusMsg.text && (
          <div className={`px-2 text-[10px] font-mono font-bold tracking-widest ${statusMsg.type}`}>
            {statusMsg.text}
          </div>
        )}
      </div>

      {/* 👥 친구 리스트 섹션 */}
      <div className="bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-4 min-h-[150px]">
        <div className="text-[11px] font-mono font-black text-zinc-500 tracking-wider pb-2 border-b border-zinc-900/50 uppercase">
          {t.listTitle} ({friends.length})
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-600 tracking-widest animate-pulse">SYNCING DB...</div>
        ) : friends.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-600 tracking-widest">{t.noFriends}</div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {friends.map((friend) => {
              // 친구의 LP 데이터로 실시간 티어 색상/이름 연산
              const fTier = getTierFromLp(friend.rankedLp || 300);
              
              return (
                <div
                  key={friend.uid}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#050505] border border-zinc-900/60 rounded-xl transition-all hover:border-zinc-700/80 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>

                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200 tracking-tight">{friend.displayName || 'Player'}</span>
                        <span className="text-[9px] font-mono text-zinc-500 font-bold border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded">
                          {t.lvl}{friend.level || 1}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600 tracking-wider">UID: {friend.uid.slice(0, 10)}...</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t border-zinc-900 sm:border-t-0 pt-2 sm:pt-0">
                    <span className={`font-mono text-[9px] sm:text-[10px] font-black tracking-widest uppercase border border-zinc-900 bg-zinc-950/40 px-2.5 py-1 rounded-md ${fTier.color}`}>
                      {fTier.name} {fTier.division}
                    </span>
                    <span className="font-mono text-[9px] font-black tracking-widest text-zinc-600 uppercase hidden sm:inline-block">
                      {t.online}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}