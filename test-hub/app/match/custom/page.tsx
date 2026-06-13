'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, database } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';

type GameType = 'reaction' | 'cps';

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    lobbyNode: 'CUSTOM LOBBY NODE',
    createSection: '// CREATE SERVER NODE',
    createTitle: '새로운 대전 방 개설',
    selectGame: '게임 매트릭스 선택',
    totalRounds: '총 라운드 수',
    timeDuration: '제한 시간 설정',
    rounds: '회차',
    seconds: '초',
    createBtn: '서버 코드 발급 및 방 개설',
    generating: '세션 생성 중...',
    
    joinSection: '// JOIN ACTIVE SESSION',
    joinTitle: '기존 대전 방 참여',
    enterCode: '6자리 참여 코드 입력',
    joinBtn: '방 동기화 및 입장',
    connecting: '네트워크 연결 중...',

    alertLoginCreate: '방을 생성하려면 로그인이 필요합니다.',
    alertLoginJoin: '방에 입장하려면 로그인이 필요합니다.',
    errCodeLength: '6자리 참여 코드를 정확히 입력하세요.',
    errNotFound: '존재하지 않거나 만료된 방 코드입니다.',
    errFull: '이미 인원이 가득 찬 방입니다. (최대 2인)',
    errStarted: '이미 게임이 시작되어 진입할 수 없습니다.',
    errConnection: '파이어베이스 실시간 소켓 연결에 실패했습니다.',
    errUnknown: '방 처리 중 알 수 없는 오류가 발생했습니다.',
    
    footerVersion: 'LABGG MULTIPLAYER ROUTER v1.2',
    footerStatus: 'SECURE SOCKET LIVE CONNECTION'
  },
  en: {
    back: '← Back to Home',
    lobbyNode: 'CUSTOM LOBBY NODE',
    createSection: '// CREATE SERVER NODE',
    createTitle: 'Host Custom Match',
    selectGame: 'SELECT GAME MATRIX',
    totalRounds: 'TOTAL ROUNDS',
    timeDuration: 'TIME DURATION',
    rounds: ' Rounds',
    seconds: 's',
    createBtn: 'Initialize Room Session',
    generating: 'Generating...',
    
    joinSection: '// JOIN ACTIVE SESSION',
    joinTitle: 'Enter Active Room',
    enterCode: 'ENTER 6-DIGIT CODE',
    joinBtn: 'Establish Connection',
    connecting: 'Connecting...',

    alertLoginCreate: 'Sign in required to create a room.',
    alertLoginJoin: 'Sign in required to join a room.',
    errCodeLength: 'Please enter a valid 6-digit code.',
    errNotFound: 'Room not found or session expired.',
    errFull: 'The room is already full. (Max 2 Players)',
    errStarted: 'Game already in progress.',
    errConnection: 'Failed to connect to Firebase Realtime Socket.',
    errUnknown: 'An unexpected error occurred.',

    footerVersion: 'LABGG MULTIPLAYER ROUTER v1.2',
    footerStatus: 'SECURE SOCKET LIVE CONNECTION'
  }
};

export default function CustomLobbyPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);

  const [gameType, setGameType] = useState<GameType>('reaction');
  const [optionValue, setOptionValue] = useState<number>(3);
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const generateRoomId = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateRoom = async () => {
    if (!user) {
      setErrorMessage(t.alertLoginCreate);
      return;
    }
    setIsProcessing(true);
    setErrorMessage('');

    const roomId = generateRoomId();
    const roomRef = ref(database, `rooms/${roomId}`);

    const initialRoomData = {
      settings: {
        gameType,
        totalOption: optionValue,
        createdAt: Date.now()
      },
      status: 'waiting',
      players: {
        host: {
          uid: user.uid,
          displayName: user.displayName || 'Host_Player',
          photoURL: user.photoURL || '',
          isReady: true
        },
        guest: null
      }
    };

    try {
      await set(roomRef, initialRoomData);
      router.push(`/match/custom/${roomId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(t.errConnection);
      setIsProcessing(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedId = inputRoomId.trim().toUpperCase();

    if (formattedId.length !== 6) {
      setErrorMessage(t.errCodeLength);
      return;
    }
    if (!user) {
      setErrorMessage(t.alertLoginJoin);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const dbRef = ref(database);
    try {
      const snapshot = await get(child(dbRef, `rooms/${formattedId}`));
      if (!snapshot.exists()) {
        setErrorMessage(t.errNotFound);
        setIsProcessing(false);
        return;
      }

      const roomData = snapshot.val();
      
      if (roomData.players.guest && roomData.players.guest.uid !== user.uid) {
        setErrorMessage(t.errFull);
        setIsProcessing(false);
        return;
      }

      if (roomData.status !== 'waiting') {
        setErrorMessage(t.errStarted);
        setIsProcessing(false);
        return;
      }

      const guestRef = ref(database, `rooms/${formattedId}/players/guest`);
      await set(guestRef, {
        uid: user.uid,
        displayName: user.displayName || 'Guest_Player',
        photoURL: user.photoURL || '',
        isReady: false
      });

      router.push(`/match/custom/${formattedId}`);
    } catch (error) {
      console.error(error);
      setErrorMessage(t.errUnknown);
      setIsProcessing(false);
    }
  };

  const handleGameTypeChange = (type: GameType) => {
    setGameType(type);
    setOptionValue(type === 'reaction' ? 3 : 5);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      {/* 백그라운드 퍼플 그라데이션 노드 코어 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(168,85,247,0.015),transparent_50%)] pointer-events-none" />

      {/* 상단 레이아웃 네비게이터 */}
      <div className="w-full max-w-5xl mx-auto flex justify-between items-center relative z-10">
        <Link href="/" className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <span className="text-[10px] font-mono font-black text-purple-500 tracking-[0.25em] bg-purple-500/5 border border-purple-500/10 px-3.5 py-1 rounded-lg shadow-sm">
          {t.lobbyNode}
        </span>
      </div>

      {/* 🚀 공백 수술 완료된 듀얼 기어 매칭 랙 */}
      <div className="w-full max-w-5xl mx-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-start my-auto py-12 relative z-10">
        
        {/* 모듈 A: 방 개설 크리에이터 */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 sm:p-10 flex flex-col space-y-8 shadow-2xl backdrop-blur-md transition-all hover:border-zinc-800/80 w-full">
          <div className="space-y-1 border-b border-zinc-900 pb-4">
            <span className="font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase block">{t.createSection}</span>
            <h2 className="text-2xl font-black text-white tracking-tight">{t.createTitle}</h2>
          </div>

          {/* 고화력 매트릭스 셀렉터 버튼 */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase block">{t.selectGame}</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 border border-zinc-900 rounded-2xl font-mono text-[11px]">
              <button
                type="button"
                onClick={() => handleGameTypeChange('reaction')}
                className={`py-3.5 rounded-xl font-black tracking-tight transition-all ${gameType === 'reaction' ? 'bg-zinc-900 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                VISUAL REACTION
              </button>
              <button
                type="button"
                onClick={() => handleGameTypeChange('cps')}
                className={`py-3.5 rounded-xl font-black tracking-tight transition-all ${gameType === 'cps' ? 'bg-zinc-900 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.08)]' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                CPS MEASURE
              </button>
            </div>
          </div>

          {/* 정밀 슬라이더 제어 바 */}
          <div className="space-y-3">
            <div className="flex justify-between font-mono text-[10px] font-black text-zinc-500 tracking-wider">
              <span className="uppercase">{gameType === 'reaction' ? t.totalRounds : t.timeDuration}</span>
              <span className={`font-black text-xs ${gameType === 'reaction' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {optionValue}{gameType === 'reaction' ? t.rounds : t.seconds}
              </span>
            </div>
            <div className="p-4 bg-black/40 border border-zinc-900 rounded-xl flex items-center">
              <input 
                type="range" 
                min={gameType === 'reaction' ? 3 : 3} 
                max={gameType === 'reaction' ? 10 : 10} 
                step={gameType === 'reaction' ? 2 : 1}
                value={optionValue === 10 && gameType === 'reaction' ? 9 : optionValue}
                onChange={(e) => {
                  let val = Number(e.target.value);
                  if (gameType === 'reaction' && val === 9) val = 10;
                  setOptionValue(val);
                }}
                className="flex-1 accent-purple-500 h-1 bg-zinc-900 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <button
            disabled={isProcessing}
            onClick={handleCreateRoom}
            className="w-full py-4 bg-purple-600 border border-purple-500/40 rounded-2xl text-xs font-black text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all uppercase tracking-[0.15em] disabled:opacity-40 active:scale-[0.99]"
          >
            {isProcessing ? t.generating : t.createBtn}
          </button>
        </div>

        {/* 모듈 B: 세션 게스트 조이너 */}
        <div className="bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 sm:p-10 flex flex-col space-y-8 shadow-2xl backdrop-blur-md transition-all hover:border-zinc-800/80 w-full">
          <div className="space-y-1 border-b border-zinc-900 pb-4">
            <span className="font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase block">{t.joinSection}</span>
            <h2 className="text-2xl font-black text-white tracking-tight">{t.joinTitle}</h2>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase block">{t.enterCode}</label>
              <input
                type="text"
                maxLength={6}
                placeholder="X9F3K2"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="w-full bg-black/60 border border-zinc-900 rounded-2xl py-4 px-5 font-mono text-2xl font-black text-center tracking-[0.4em] uppercase text-purple-400 placeholder:text-zinc-800 focus:outline-none focus:border-purple-500/40 focus:bg-zinc-950 transition-all shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]"
              />
            </div>

            {/* 🛠️ 휑한 공간을 고급스럽게 채워줄 인게임 커넥션 대시보드 데코 데이터 */}
            <div className="p-4 bg-zinc-900/10 border border-zinc-900/60 rounded-xl font-mono text-[10px] text-zinc-500 space-y-1.5">
              / <span className="text-zinc-400 font-bold">LOBBY STATUS:</span> ONLINE<br />
              / <span className="text-zinc-400 font-bold">DISPATCHER:</span> P2P REALTIME SOCKET<br />
              / <span className="text-zinc-400 font-bold">ENCRYPTION:</span> TLS 1.3 SECURE
            </div>

            {errorMessage && (
              <p className="text-xs font-bold text-rose-400 bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl tracking-tight text-center animate-[fadeIn_0.2s_ease-out]">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl text-xs font-black text-zinc-300 hover:bg-white hover:text-black hover:border-white transition-all uppercase tracking-[0.15em] disabled:opacity-40 active:scale-[0.99]"
            >
              {isProcessing ? t.connecting : t.joinBtn}
            </button>
          </form>
        </div>

      </div>

      {/* 하단 시스템 그리드 엔벨로프 */}
      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>{t.footerVersion}</div>
        <div>{t.footerStatus}</div>
      </div>

    </div>
  );
}