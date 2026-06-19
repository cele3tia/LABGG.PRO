'use client';

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
// 💡 누락됐던 파이어베이스 검색 함수들(collection, query, where, getDocs) 다시 소환!
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getTierFromLp } from './utils';

export default function FriendsPanel({ lang, currentUser }: { lang: 'ko' | 'en', currentUser: User | null }) {
  const [searchCode, setSearchCode] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  
  const [activeMenuUid, setActiveMenuUid] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'list' | 'requests'>('list');

  const t = {
    ko: {
      searchPlaceholder: '정확한 닉네임 또는 UID 입력',
      reqBtn: '요청',
      online: 'ONLINE',
      offline: 'OFFLINE',
      noFriends: '등록된 친구가 없습니다.',
      noRequests: '받은 요청이 없습니다.',
      listTitle: '친구 목록',
      reqTitle: '받은 요청',
      lvl: 'Lv.',
      searching: '탐색 중...',
      notFound: '유저를 찾을 수 없습니다.',
      cannotAddSelf: '자신은 추가할 수 없습니다.',
      alreadyFriend: '이미 등록된 친구입니다.',
      alreadyRequested: '이미 대기 중인 요청입니다.',
      reqSuccess: '친구 요청을 보냈습니다!',
      menu_profile: '프로필 보기',
      menu_invite: '1:1 친선전 (예정)',
      menu_remove: '친구 삭제',
    },
    en: {
      searchPlaceholder: 'Enter exact Nickname or UID',
      reqBtn: 'SEND',
      online: 'ONLINE',
      offline: 'OFFLINE',
      noFriends: 'No friends added yet.',
      noRequests: 'No pending requests.',
      listTitle: 'FRIENDS',
      reqTitle: 'REQUESTS',
      lvl: 'Lv.',
      searching: 'Searching...',
      notFound: 'User not found.',
      cannotAddSelf: 'Cannot add yourself.',
      alreadyFriend: 'Already friends.',
      alreadyRequested: 'Request already sent.',
      reqSuccess: 'Friend request sent!',
      menu_profile: 'View Profile',
      menu_invite: 'Invite 1v1 (Soon)',
      menu_remove: 'Remove Friend',
    }
  }[lang];

  // 1️⃣ 실시간 내 데이터 감지 로직
  useEffect(() => {
    if (!currentUser) return;
    
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), async (docSnap) => {
      setIsLoading(true);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const friendUids = data.friends || [];
        const reqUids = data.pendingRequests || [];

        if (friendUids.length > 0) {
          const fDocs = await Promise.all(friendUids.map((uid: string) => getDoc(doc(db, 'users', uid))));
          setFriends(fDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() })));
        } else setFriends([]);

        if (reqUids.length > 0) {
          const rDocs = await Promise.all(reqUids.map((uid: string) => getDoc(doc(db, 'users', uid))));
          setRequests(rDocs.filter(d => d.exists()).map(d => ({ uid: d.id, ...d.data() })));
        } else setRequests([]);
      }
      setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // 2️⃣ 친구 요청 보내기 로직 (💡 닉네임/UID 2단 스캔 엔진 복구 완료)
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !searchCode.trim()) return;
    setStatusMsg({ text: t.searching, type: 'text-zinc-400' });

    try {
      const searchStr = searchCode.trim();
      let targetUid = '';
      let targetData = null;

      // [스텝 1] UID로 먼저 찔러보기
      const uidDoc = await getDoc(doc(db, 'users', searchStr));
      if (uidDoc.exists()) {
        targetUid = uidDoc.id;
        targetData = uidDoc.data();
      } else {
        // [스텝 2] UID가 아니면 닉네임(displayName)으로 전체 스캔
        const q = query(collection(db, 'users'), where('displayName', '==', searchStr));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          targetUid = querySnapshot.docs[0].id;
          targetData = querySnapshot.docs[0].data();
        }
      }

      // 두 번 다 못 찾았으면 빠꾸
      if (!targetUid || !targetData) {
        setStatusMsg({ text: t.notFound, type: 'text-red-400' });
        return;
      }

      // 나 자신에게 보내는지 체크
      if (targetUid === currentUser.uid) {
        setStatusMsg({ text: t.cannotAddSelf, type: 'text-amber-400' });
        return;
      }

      // 이미 친구인지, 이미 요청했는지 체크
      if (targetData.friends?.includes(currentUser.uid)) {
        setStatusMsg({ text: t.alreadyFriend, type: 'text-amber-400' });
        return;
      }
      if (targetData.pendingRequests?.includes(currentUser.uid)) {
        setStatusMsg({ text: t.alreadyRequested, type: 'text-amber-400' });
        return;
      }

      // 💡 상대방의 대기열(pendingRequests)에 내 UID 발송!
      await updateDoc(doc(db, 'users', targetUid), { pendingRequests: arrayUnion(currentUser.uid) });
      setStatusMsg({ text: t.reqSuccess, type: 'text-emerald-400' });
      setSearchCode('');
    } catch (error) {
      console.error(error);
      setStatusMsg({ text: 'Error fetching data.', type: 'text-red-400' });
    }
  };

  // 3️⃣ 친구 수락 / 거절 로직
  const handleRequestAction = async (targetUid: string, action: 'accept' | 'decline') => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { pendingRequests: arrayRemove(targetUid) });
      
      if (action === 'accept') {
        await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayUnion(targetUid) });
        await updateDoc(doc(db, 'users', targetUid), { friends: arrayUnion(currentUser.uid) });
      }
    } catch (e) { console.error(e); }
  };

  // 4️⃣ 친구 삭제 로직
  const handleRemoveFriend = async (targetUid: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { friends: arrayRemove(targetUid) });
      await updateDoc(doc(db, 'users', targetUid), { friends: arrayRemove(currentUser.uid) });
      setActiveMenuUid(null);
    } catch (e) { console.error(e); }
  };

  // 5️⃣ 접속 상태 판별 (5분 이내)
  const checkIsOnline = (lastActiveTs?: number) => {
    if (!lastActiveTs) return false;
    const FIVE_MIN_MS = 5 * 60 * 1000;
    return (Date.now() - lastActiveTs) < FIVE_MIN_MS;
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 relative">
      
      {activeMenuUid && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuUid(null)} />
      )}

      {/* 🔍 검색 및 추가 폼 */}
      <div className="bg-zinc-950/80 border border-zinc-900 p-4 rounded-2xl space-y-2">
        <form onSubmit={handleSendRequest} className="flex gap-2">
          <input
            type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value)} placeholder={t.searchPlaceholder}
            className="flex-1 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[#9e38ff] transition-all font-mono"
          />
          <button type="submit" className="px-5 bg-zinc-100 hover:bg-white text-black text-xs font-mono font-bold tracking-wider rounded-xl transition-all shrink-0 uppercase active:scale-95">
            {t.reqBtn}
          </button>
        </form>
        {statusMsg.text && <div className={`px-2 text-[10px] font-mono font-bold tracking-widest ${statusMsg.type}`}>{statusMsg.text}</div>}
      </div>

      {/* 👥 소셜 허브 메인 패널 */}
      <div className="bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-4 min-h-[250px]">
        
        {/* 내부 서브 탭 */}
        <div className="flex items-center gap-4 pb-3 border-b border-zinc-900/50">
          <button onClick={() => setSubTab('list')} className={`text-[11px] font-mono font-black tracking-wider uppercase transition-colors ${subTab === 'list' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
            {t.listTitle} ({friends.length})
          </button>
          <button onClick={() => setSubTab('requests')} className={`relative text-[11px] font-mono font-black tracking-wider uppercase transition-colors ${subTab === 'requests' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
            {t.reqTitle}
            {requests.length > 0 && <span className="absolute -top-1.5 -right-3 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center text-[7px] text-white">{requests.length}</span>}
          </button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-600 tracking-widest animate-pulse">SYNCING SOCIAL DATA...</div>
        ) : subTab === 'list' ? (
          
          friends.length === 0 ? (
            <div className="py-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest">{t.noFriends}</div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {friends.map((friend) => {
                const fTier = getTierFromLp(friend.rankedLp || 300);
                const isOnline = checkIsOnline(friend.lastActive);

                return (
                  <div key={friend.uid} className="relative flex items-center justify-between p-3.5 bg-[#050505] border border-zinc-900/60 rounded-xl transition-all hover:border-zinc-700/80">
                    <div className="flex items-center gap-3 w-full">
                      <button onClick={() => setActiveMenuUid(activeMenuUid === friend.uid ? null : friend.uid)} className="relative shrink-0 group">
                        <div className={`w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950 overflow-hidden transition-transform group-hover:scale-105 ${isOnline ? 'border-emerald-500/50' : ''}`}>
                          <img src={friend.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#050505] ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`}></span>
                      </button>

                      <div className="flex flex-col flex-1">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-200">{friend.displayName || 'Player'}</span>
                            <span className="text-[9px] font-mono text-zinc-500 font-bold border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 rounded">{t.lvl}{friend.level || 1}</span>
                          </div>
                          <span className={`font-mono text-[9px] font-black tracking-widest uppercase ${isOnline ? 'text-emerald-400' : 'text-zinc-600'}`}>
                            {isOnline ? t.online : t.offline}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[9px] font-mono text-zinc-600 tracking-wider">UID: {friend.uid.slice(0, 8)}</span>
                          <span className={`font-mono text-[9px] font-black tracking-widest uppercase ${fTier.color}`}>{fTier.name} {fTier.division}</span>
                        </div>
                      </div>
                    </div>

                    {activeMenuUid === friend.uid && (
                      <div className="absolute top-12 left-12 z-50 w-40 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col animate-in slide-in-from-top-2 duration-200">
                        <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                          {t.menu_profile}
                        </button>
                        <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                          {t.menu_invite}
                        </button>
                        <div className="w-full h-[1px] bg-zinc-800 my-1" />
                        <button onClick={() => handleRemoveFriend(friend.uid)} className="flex items-center gap-2 w-full text-left px-3 py-2 text-[10px] font-mono font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          {t.menu_remove}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          requests.length === 0 ? (
            <div className="py-8 text-center text-[10px] font-mono text-zinc-600 tracking-widest">{t.noRequests}</div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {requests.map((req) => (
                <div key={req.uid} className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-950 overflow-hidden shrink-0">
                      <img src={req.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-xs font-bold text-zinc-300">{req.displayName || 'Player'}</span>
                      <span className="text-[9px] font-mono text-zinc-500 tracking-wider">Wants to connect</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRequestAction(req.uid, 'accept')} className="w-8 h-8 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </button>
                    <button onClick={() => handleRequestAction(req.uid, 'decline')} className="w-8 h-8 flex items-center justify-center bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

    </div>
  );
}