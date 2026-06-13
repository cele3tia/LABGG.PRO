'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { auth, database, db } from '../../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, update, set } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'result';
type GameType = 'reaction' | 'cps';

interface PlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  isReady: boolean;
  score?: number;
  level?: number;
  currentTitle?: string;
}

const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  return 'text-zinc-400 bg-zinc-900 border-zinc-800';
};

const TITLE_COLORS: Record<string, string> = {
  dev: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  ai: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  godspeed: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  fast: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  newbie: 'text-zinc-300 bg-zinc-900 border-zinc-800'
};

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie' }
};

export default function CustomRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);

  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting');
  const [gameType, setGameType] = useState<GameType>('reaction');
  const [totalOption, setTotalOption] = useState<number>(3);
  const [hostPlayer, setHostPlayer] = useState<PlayerInfo | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<PlayerInfo | null>(null);

  const [localGameState, setLocalGameState] = useState<'idle' | 'ready' | 'click' | 'foul' | 'finished'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [cpsClicks, setCpsClicks] = useState<number>(0);
  const [cpsTimeLeft, setCpsTimeLeft] = useState<number>(5);
  const [reactionStartTime, setReactionStartTime] = useState<number>(0);
  
  // 📋 복사 피드백 제어 상태 변수
  const [copied, setCopied] = useState<boolean>(false);

  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isHost = user && hostPlayer && user.uid === hostPlayer.uid;

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    const roomRef = ref(database, `rooms/${roomId}`);
    const unsubscribeRoom = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        router.push('/match/custom');
        return;
      }
      const data = snapshot.val();
      setGameType(data.settings.gameType);
      setTotalOption(data.settings.totalOption);
      setRoomStatus(data.status);
      setHostPlayer(data.players.host || null);
      setGuestPlayer(data.players.guest || null);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRoom();
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      if (cpsIntervalRef.current) clearInterval(cpsIntervalRef.current);
    };
  }, [roomId]);

  // 📡 [NEW] Firestore 유저 인벤토리 프로필 ➡️ Realtime DB 대기실 실시간 연동 소켓 파이프라인
  useEffect(() => {
    if (!user || roomStatus !== 'waiting') return;

    const injectProfileData = async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const profile = docSnap.data();
          const syncPayload = {
            level: profile.level || 1,
            currentTitle: profile.currentTitle || '',
            photoURL: profile.photoURL || user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'
          };

          // 내가 호스트이고 레벨 동기화가 아직 안 되었을 때
          if (hostPlayer && hostPlayer.uid === user.uid && !hostPlayer.level) {
            await update(ref(database, `rooms/${roomId}/players/host`), syncPayload);
          } 
          // 내가 게스트이고 레벨 동기화가 아직 안 되었을 때
          else if (guestPlayer && guestPlayer.uid === user.uid && !guestPlayer.level) {
            await update(ref(database, `rooms/${roomId}/players/guest`), syncPayload);
          }
        }
      } catch (err) {
        console.error("Profile sync failed:", err);
      }
    };

    injectProfileData();
  }, [user, hostPlayer, guestPlayer, roomStatus, roomId]);

  useEffect(() => {
    if (roomStatus === 'countdown') {
      runCountdown();
    } else if (roomStatus === 'playing') {
      startActualLocalGame();
    }
  }, [roomStatus]);

  const runCountdown = () => {
    setCountdownNum(3);
    const interval = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) {
            update(ref(database, `rooms/${roomId}`), { status: 'playing' });
          }
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startActualLocalGame = () => {
    if (gameType === 'reaction') {
      setLocalGameState('ready');
      const randomDelay = Math.floor(Math.random() * 2500) + 2000;
      reactionTimeoutRef.current = setTimeout(() => {
        setLocalGameState('click');
        setReactionStartTime(performance.now());
      }, randomDelay);
    } else {
      setLocalGameState('click');
      setCpsClicks(0);
      setCpsTimeLeft(totalOption);
      cpsIntervalRef.current = setInterval(() => {
        setCpsTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(cpsIntervalRef.current!);
            setLocalGameState('finished');
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleGamePanelClick = () => {
    if (roomStatus !== 'playing') return;

    if (gameType === 'reaction') {
      if (localGameState === 'ready') {
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        setLocalGameState('foul');
        submitScore(9999);
      } else if (localGameState === 'click') {
        const score = Math.round(performance.now() - reactionStartTime);
        setLocalGameState('finished');
        submitScore(score);
      }
    } else if (gameType === 'cps' && localGameState === 'click') {
      setCpsClicks((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (gameType === 'cps' && localGameState === 'finished' && cpsClicks > 0) {
      const finalCps = parseFloat((cpsClicks / totalOption).toFixed(1));
      submitScore(finalCps);
    }
  }, [localGameState]);

  const submitScore = async (score: number) => {
    const playerType = isHost ? 'host' : 'guest';
    const scoreRef = ref(database, `rooms/${roomId}/players/${playerType}`);
    await update(scoreRef, { score });

    setTimeout(async () => {
      const snap = await set(ref(database, `rooms/${roomId}/status`), 'result');
    }, 1000);
  };

  const handleActionButton = async () => {
    if (!user) return;
    if (isHost) {
      if (hostPlayer?.isReady && guestPlayer?.isReady) {
        await update(ref(database, `rooms/${roomId}`), { status: 'countdown' });
      }
    } else {
      const nextReadyState = !guestPlayer?.isReady;
      await update(ref(database, `rooms/${roomId}/players/guest`), { isReady: nextReadyState });
    }
  };

  const handleLeaveRoom = async () => {
    if (isHost) {
      await set(ref(database, `rooms/${roomId}`), null);
    } else {
      await set(ref(database, `rooms/${roomId}/players/guest`), null);
    }
    router.push('/match/custom');
  };

  // 📋 방 코드 비동기 클립보드 복사 유틸 시스템
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWinnerMessage = () => {
    const hScore = hostPlayer?.score;
    const gScore = guestPlayer?.score;
    if (hScore === undefined || gScore === undefined) return { txt: 'ANALYZING MATRIX...', css: 'text-zinc-500' };
    if (hScore === gScore) return { txt: 'DRAW MATCH 🤝', css: 'text-zinc-400' };

    let isHostWin = gameType === 'reaction' ? hScore < gScore : hScore > gScore;
    const amIWinner = isHost ? isHostWin : !isHostWin;

    return amIWinner 
      ? { txt: 'VICTORY 🔥', css: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 font-black animate-pulse drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]' }
      : { txt: 'DEFEATED ❌', css: 'text-rose-500 font-extrabold drop-shadow-[0_0_15px_rgba(244,63,94,0.2)]' };
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(168,85,247,0.02),transparent_60%)] pointer-events-none" />
      
      {/* 상단 헤더 기지 (클릭 시 복사 가능한 액션 버튼으로 개수) */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900/60 pb-5">
        <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-mono font-bold text-rose-500/80 hover:text-white hover:bg-rose-950/20 hover:border-rose-500/30 transition-all active:scale-95">
          {lang === 'ko' ? '← 나가기 (LEAVE)' : '← ESCAPE'}
        </button>
        
        {/* 📋 클릭 시 순간 복사 레이아웃 세팅 */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-zinc-600 font-bold uppercase tracking-wider hidden sm:inline">ROOM SYSTEM NODE:</span>
          <button 
            onClick={handleCopyCode}
            className="group/copy relative text-purple-400 font-black tracking-[0.2em] bg-purple-500/5 px-4 py-1.5 border border-purple-500/20 rounded-xl text-xs sm:text-sm shadow-md hover:border-purple-400 hover:bg-purple-500/10 transition-all flex items-center gap-2 active:scale-95"
          >
            <span>{roomId}</span>
            <span className="text-[9px] font-sans font-bold bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-300 group-hover/copy:bg-purple-500 group-hover/copy:text-white transition-all uppercase tracking-normal">
              {copied ? (lang === 'ko' ? '복사됨' : 'COPIED') : (lang === 'ko' ? '복사' : 'COPY')}
            </span>
          </button>
        </div>
      </div>

      {/* 메인 배틀 아레나 스테이지 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 space-y-6 relative z-10">
        
        {/* 🟢 대기방 상태 (Lobby UI + 완벽한 프로필 연동 스킨 적용) */}
        {roomStatus === 'waiting' && (
          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            
            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 md:gap-0">
              
              {/* 호스트 카드 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center gap-4 relative backdrop-blur-md shadow-xl">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">// HOST NODE</div>
                
                <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden p-0.5">
                  <img src={hostPlayer?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Host" className="w-full h-full object-cover rounded-xl" />
                </div>
                
                <div className="text-center space-y-2 flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-black text-white tracking-tight">{hostPlayer?.displayName}</p>
                    <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(hostPlayer?.level || 1)}`}>
                      LV.{hostPlayer?.level || 1}
                    </span>
                  </div>
                  
                  {hostPlayer?.currentTitle ? (
                    <span className={`text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${TITLE_COLORS[hostPlayer.currentTitle] || 'text-zinc-400 bg-zinc-900 border-zinc-800'}`}>
                      {TITLE_MAP[lang][hostPlayer.currentTitle] || hostPlayer.currentTitle}
                    </span>
                  ) : (
                    <span className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border border-zinc-900 bg-zinc-950 text-zinc-600 tracking-wide uppercase">칭호 없음</span>
                  )}
                </div>
                
                <span className="text-[10px] font-mono font-black px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl tracking-wider uppercase shadow-sm">
                  READY
                </span>
              </div>

              <div className="md:col-span-1 flex justify-center items-center font-mono py-2">
                <span className="text-2xl font-black text-zinc-800 italic tracking-tighter opacity-80">VS</span>
              </div>

              {/* 게스트 카드 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center gap-4 relative backdrop-blur-md shadow-xl transition-all">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">// CHALLENGER NODE</div>
                {guestPlayer ? (
                  <>
                    <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden p-0.5">
                      <img src={guestPlayer.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Guest" className="w-full h-full object-cover rounded-xl" />
                    </div>
                    
                    <div className="text-center space-y-2 flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-black text-white tracking-tight">{guestPlayer.displayName}</p>
                        <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(guestPlayer.level || 1)}`}>
                          LV.{guestPlayer.level || 1}
                        </span>
                      </div>
                      
                      {guestPlayer.currentTitle ? (
                        <span className={`text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${TITLE_COLORS[guestPlayer.currentTitle] || 'text-zinc-400 bg-zinc-900 border-zinc-800'}`}>
                          {TITLE_MAP[lang][guestPlayer.currentTitle] || guestPlayer.currentTitle}
                        </span>
                      ) : (
                        <span className="text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border border-zinc-900 bg-zinc-950 text-zinc-600 tracking-wide uppercase">칭호 없음</span>
                      )}
                    </div>
                    
                    <span className={`text-[10px] font-mono font-black px-3 py-1.5 rounded-xl tracking-wider uppercase border transition-all ${
                      guestPlayer.isReady 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-sm' 
                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'
                    }`}>
                      {guestPlayer.isReady ? 'READY' : 'WAITING'}
                    </span>
                  </>
                ) : (
                  <div className="h-44 flex items-center justify-center w-full">
                    <p className="text-xs font-mono font-black text-zinc-700 uppercase tracking-[0.25em] animate-pulse">
                      {lang === 'ko' ? '도전자 연결 대기 중...' : 'Awaiting Connection...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 메인 제어 커맨드 패널 액션 바 */}
            <div className="max-w-xs mx-auto w-full pt-4">
              <button
                onClick={handleActionButton}
                disabled={!guestPlayer}
                className={`w-full py-4 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all shadow-md active:scale-[0.985] ${
                  isHost 
                    ? (hostPlayer?.isReady && guestPlayer?.isReady 
                        ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]' 
                        : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 cursor-not-allowed')
                    : (guestPlayer?.isReady 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]')
                }`}
              >
                {isHost 
                  ? (hostPlayer?.isReady && guestPlayer?.isReady ? (lang === 'ko' ? '대결 시작 (LAUNCH)' : 'LAUNCH GAME') : (lang === 'ko' ? '도전자 준비 필요' : 'GUEST NOT READY')) 
                  : (guestPlayer?.isReady ? (lang === 'ko' ? '준비 취소' : 'CANCEL READY') : (lang === 'ko' ? '준비 완료' : 'SET READY'))}
              </button>
            </div>
          </div>
        )}

        {/* ⏳ 카운트다운 상태 */}
        {roomStatus === 'countdown' && (
          <div className="h-[360px] flex flex-col items-center justify-center">
            <span className="text-8xl font-mono font-black text-purple-500 animate-[ping_1s_infinite] tracking-tighter drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]">
              {countdownNum}
            </span>
          </div>
        )}

        {/* ⚡ 인게임 모드 액티브 상태 */}
        {roomStatus === 'playing' && (
          <div 
            onMouseDown={handleGamePanelClick}
            className={`h-[440px] rounded-[2.5rem] border-2 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-100 ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-red-600/95 border-red-500 shadow-[inset_0_0_60px_rgba(0,0,0,0.2)]' : localGameState === 'click' ? 'bg-emerald-500/95 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'bg-zinc-950 border-zinc-900')
                : 'bg-zinc-950 border-cyan-500/30 shadow-[inset_0_0_60px_rgba(34,211,238,0.02),0_0_40px_rgba(34,211,238,0.05)] active:border-cyan-400'
            }`}
          >
            {gameType === 'reaction' ? (
              localGameState === 'ready' ? <p className="text-4xl font-mono font-black text-white tracking-[0.25em] uppercase">STAY FOCUS...</p> :
              localGameState === 'click' ? <p className="text-6xl font-black text-black tracking-tight uppercase animate-bounce">CLICK!!!</p> :
              localGameState === 'foul' ? <p className="text-lg font-mono font-black text-rose-400 tracking-wider uppercase animate-pulse">FOUL DETECTED</p> :
              <p className="text-xs text-zinc-600 font-mono tracking-widest uppercase">Syncing Server Matrix...</p>
            ) : (
              <div className="space-y-4 pointer-events-none">
                <p className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 tracking-tighter tabular-nums">{cpsClicks}</p>
                <div className="inline-block px-4 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl font-mono text-xs text-cyan-400 font-bold tracking-wider uppercase">
                  Time Remaining: <span className="text-white font-black ml-1 tabular-nums">{cpsTimeLeft}s</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🏆 대결 정산 종료 상태 */}
        {roomStatus === 'result' && (
          <div className="bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 rounded-[2rem] space-y-8 text-center max-w-2xl mx-auto w-full backdrop-blur-md shadow-2xl animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-1">
              <span className="font-mono text-[10px] font-black text-purple-500 tracking-[0.3em] uppercase block">// BATTLE OVERVIEW MATRIX</span>
              <h2 className={`text-4xl font-black tracking-tighter ${getWinnerMessage().css}`}>
                {getWinnerMessage().txt}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-left max-w-md mx-auto">
              <div className={`p-5 rounded-2xl border transition-all ${hostPlayer?.score && guestPlayer?.score && ((gameType === 'reaction' ? hostPlayer.score < guestPlayer.score : hostPlayer.score > guestPlayer.score)) ? 'bg-purple-500/5 border-purple-500/20 shadow-[inset_0_0_15px_rgba(168,85,247,0.05)]' : 'bg-zinc-900/40 border-zinc-900'}`}>
                <span className="text-[10px] text-zinc-500 font-black block tracking-wider uppercase mb-1">HOST SCORE</span>
                <span className="text-2xl font-black text-white tabular-nums">{hostPlayer?.score || 0}</span>
                <span className="text-[10px] text-zinc-600 font-bold ml-1 uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>
              </div>
              
              <div className={`p-5 rounded-2xl border transition-all ${hostPlayer?.score && guestPlayer?.score && ((gameType === 'reaction' ? guestPlayer.score < hostPlayer.score : guestPlayer.score > hostPlayer.score)) ? 'bg-purple-500/5 border-purple-500/20 shadow-[inset_0_0_15px_rgba(168,85,247,0.05)]' : 'bg-zinc-900/40 border-zinc-900'}`}>
                <span className="text-[10px] text-zinc-500 font-black block tracking-wider uppercase mb-1">GUEST SCORE</span>
                <span className="text-2xl font-black text-white tabular-nums">{guestPlayer?.score || 0}</span>
                <span className="text-[10px] text-zinc-600 font-bold ml-1 uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>
              </div>
            </div>

            <button
              onClick={async () => {
                if (isHost) {
                  await update(ref(database, `rooms/${roomId}/players/host`), { score: null });
                  if (guestPlayer) await update(ref(database, `rooms/${roomId}/players/guest`), { score: null, isReady: false });
                  await update(ref(database, `rooms/${roomId}`), { status: 'waiting' });
                }
              }}
              className={`w-full max-w-xs mx-auto py-3.5 border rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md active:scale-95 ${
                isHost 
                  ? 'bg-purple-600 border-purple-500/40 text-white hover:bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isHost ? (lang === 'ko' ? '한 판 더 대결하기' : 'REMATCH') : (lang === 'ko' ? '방장의 재도전 승인 대기 중...' : 'AWAITING HOST REMATCH')}
            </button>
          </div>
        )}

      </div>

      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE ROOM METRICS v1.2</div>
        <div>REALTIME DISPATCH ENGINE SECURITY LOCK</div>
      </div>

    </div>
  );
}