'use client';

import React, { useState, useEffect, useRef } from 'react';
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

          if (hostPlayer && hostPlayer.uid === user.uid && !hostPlayer.level) {
            await update(ref(database, `rooms/${roomId}/players/host`), syncPayload);
          } else if (guestPlayer && guestPlayer.uid === user.uid && !guestPlayer.level) {
            await update(ref(database, `rooms/${roomId}/players/guest`), syncPayload);
          }
        }
      } catch (err) {
        console.error(err);
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
      await set(ref(database, `rooms/${roomId}/status`), 'result');
    }, 1200);
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
      ? { txt: 'VICTORY 🔥', css: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 font-black tracking-tight drop-shadow-[0_0_30px_rgba(245,158,11,0.4)]' }
      : { txt: 'DEFEATED ❌', css: 'text-rose-500 font-extrabold tracking-tight drop-shadow-[0_0_20px_rgba(244,63,94,0.3)]' };
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      {/* 🔮 테크니컬 격자 백그라운드 스킨 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(168,85,247,0.02),transparent_60%)] pointer-events-none z-0" />
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      
      {/* 상단 통합 HUD 바 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900 pb-5">
        <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-mono font-bold text-rose-500 hover:text-white hover:bg-rose-950/20 hover:border-rose-500/30 transition-all active:scale-95 shadow-lg">
          {lang === 'ko' ? '← 나가기' : '← ESCAPE'}
        </button>
        
        {/* 인게임 상시 가동 스태터스 모듈 스킨 */}
        {roomStatus === 'playing' && (
          <div className="flex items-center gap-6 bg-zinc-950/80 border border-zinc-900/60 px-5 py-2 rounded-2xl font-mono text-[11px] font-bold shadow-md">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
              <span>{hostPlayer?.displayName}</span>
            </div>
            <span className="text-zinc-700 font-black">VS</span>
            <div className="flex items-center gap-2 text-zinc-400">
              <span>{guestPlayer?.displayName}</span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 font-mono text-xs">
          <button 
            onClick={handleCopyCode}
            className="group/copy relative text-purple-400 font-black tracking-[0.2em] bg-purple-500/5 px-4 py-1.5 border border-purple-500/20 rounded-xl text-xs sm:text-sm shadow-md hover:border-purple-400 hover:bg-purple-500/10 transition-all flex items-center gap-2 active:scale-95"
          >
            <span>{roomId}</span>
            <span className="text-[9px] font-sans font-bold bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-300 group-hover/copy:bg-purple-500 group-hover/copy:text-white transition-all">
              {copied ? (lang === 'ko' ? '복사됨' : 'COPIED') : (lang === 'ko' ? '복사' : 'COPY')}
            </span>
          </button>
        </div>
      </div>

      {/* 메인 배틀 스튜디오 스페이스 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        
        {/* 🟢 1. 대기방 모드 (Lobby UI) */}
        {roomStatus === 'waiting' && (
          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 md:gap-0">
              
              {/* 호스트 진형 노드 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 flex flex-col items-center gap-5 relative backdrop-blur-md shadow-xl">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest">// HOST MATRIX</div>
                <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden p-0.5 shadow-inner">
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
                    <span className={`text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${TITLE_COLORS[hostPlayer.currentTitle] || 'text-zinc-400'}`}>
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

              {/* 매칭 브릿지 디바이더 */}
              <div className="md:col-span-1 flex flex-col justify-center items-center font-mono py-2 text-center">
                <span className="text-2xl font-black text-zinc-800 italic tracking-tighter opacity-60">VS</span>
                <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-zinc-800 to-transparent mt-2 hidden md:block" />
              </div>

              {/* 도전자 진형 노드 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 flex flex-col items-center gap-5 relative backdrop-blur-md shadow-xl transition-all">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">// CHALLENGER MATRIX</div>
                {guestPlayer ? (
                  <>
                    <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-800 rounded-2xl overflow-hidden p-0.5 shadow-inner">
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
                        <span className={`text-[10px] font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${TITLE_COLORS[guestPlayer.currentTitle] || 'text-zinc-400'}`}>
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

            {/* 메인 커맨드 버튼 스틱 */}
            <div className="max-w-xs mx-auto w-full pt-4">
              <button
                onClick={handleActionButton}
                disabled={!guestPlayer}
                className={`w-full py-4 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all shadow-md active:scale-[0.985] ${
                  isHost 
                    ? (hostPlayer?.isReady && guestPlayer?.isReady 
                        ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)]' 
                        : 'bg-zinc-900 text-zinc-600 border border-zinc-800/60 cursor-not-allowed')
                    : (guestPlayer?.isReady 
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white' 
                        : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.25)]')
                }`}
              >
                {isHost 
                  ? (hostPlayer?.isReady && guestPlayer?.isReady ? (lang === 'ko' ? '대결 시작 (LAUNCH)' : 'LAUNCH GAME') : (lang === 'ko' ? '도전자 준비 필요' : 'GUEST NOT READY')) 
                  : (guestPlayer?.isReady ? (lang === 'ko' ? '준비 취소' : 'CANCEL READY') : (lang === 'ko' ? '준비 완료' : 'SET READY'))}
              </button>
            </div>
          </div>
        )}

        {/* ⏳ 2. 카운트다운 상태 */}
        {roomStatus === 'countdown' && (
          <div className="h-[400px] flex flex-col items-center justify-center relative">
            <span className="text-9xl font-mono font-black text-purple-500 animate-[ping_1s_infinite] tracking-tighter drop-shadow-[0_0_40px_rgba(168,85,247,0.5)]">
              {countdownNum}
            </span>
            <div className="absolute font-mono text-[10px] text-zinc-700 tracking-widest uppercase bottom-10">// CORRELATING SENSORS</div>
          </div>
        )}

        {/* ⚡ 3. 인게임 전술 모드 가동 세션 (핵심 디자인 패치 적용) */}
        {roomStatus === 'playing' && (
          <div 
            onMouseDown={handleGamePanelClick}
            className={`h-[460px] rounded-[2.5rem] border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all relative overflow-hidden ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-red-950/20 border-red-500 shadow-[inset_0_0_60px_rgba(239,68,68,0.1)]' : localGameState === 'click' ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.25)]' : 'bg-zinc-950 border-zinc-900')
                : 'bg-zinc-950 border-cyan-500/20 shadow-[inset_0_0_60px_rgba(34,211,238,0.02)] active:border-cyan-400'
            }`}
          >
            {/* 전술 조준선 데코 오버레이 스킨 */}
            {localGameState !== 'click' && (
              <div className="absolute inset-0 border border-white/[0.02] m-10 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-6 h-[1px] bg-zinc-800" />
                <div className="w-[1px] h-6 bg-zinc-800 absolute" />
              </div>
            )}

            {gameType === 'reaction' ? (
              localGameState === 'ready' ? (
                <div className="space-y-2 animate-pulse">
                  <p className="text-4xl font-mono font-black text-red-500 tracking-[0.2em] uppercase">HOLD TRIGGER...</p>
                  <p className="text-[11px] font-mono text-zinc-600 font-bold tracking-widest uppercase">Click immediately when it turns green</p>
                </div>
              ) : localGameState === 'click' ? (
                <p className="text-7xl font-black text-black tracking-tighter uppercase drop-shadow-md scale-105 transition-transform duration-700">CLICK NOW!!!</p>
              ) : localGameState === 'foul' ? (
                <p className="text-lg font-mono font-black text-rose-500 tracking-wider uppercase animate-bounce">⚠️ FOUL DETECTED ⚠️</p>
              ) : (
                <p className="text-xs text-zinc-600 font-mono tracking-widest uppercase animate-pulse">Syncing Payload Matrix...</p>
              )
            ) : (
              /* CPS 전용 전술 버스트 계기판 아레나 */
              <div className="space-y-6 pointer-events-none flex flex-col items-center w-full max-w-sm">
                <p className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-400 to-cyan-600 tracking-tighter tabular-nums drop-shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-[wiggle_0.1s_ease-in-out_infinite]">
                  {cpsClicks}
                </p>
                
                {/* 실시간 타격 인디케이터 게이지 바 */}
                <div className="w-full bg-zinc-900/60 h-1 rounded-full overflow-hidden p-[1px] border border-zinc-800">
                  <div className="bg-cyan-400 h-full rounded-full transition-all duration-200" style={{ width: `${(cpsClicks / (totalOption * 8)) * 100}%` }} />
                </div>

                <div className="inline-block px-4 py-1.5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl font-mono text-[11px] text-cyan-400 font-bold tracking-wider uppercase">
                  TIME DURATION: <span className="text-white font-black ml-1 tabular-nums">{cpsTimeLeft}S</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🏆 4. 대결 결과 정산 대시보드 (Result HUD) */}
        {roomStatus === 'result' && (
          <div className="bg-zinc-950/40 border border-zinc-900 p-8 sm:p-12 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full backdrop-blur-md shadow-2xl animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-2">
              <span className="font-mono text-[10px] font-black text-purple-500 tracking-[0.3em] uppercase block">// COMBAT MATRIX EVALUATION</span>
              <h2 className={`text-5xl font-black tracking-tight uppercase ${getWinnerMessage().css}`}>
                {getWinnerMessage().txt}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-5 font-mono text-left max-w-md mx-auto pt-2">
              
              {/* 호스트 점수 모듈 */}
              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/[0.01] rounded-full blur-xl" />
                <span className="text-[10px] text-zinc-500 font-black block tracking-wider uppercase mb-1">{hostPlayer?.displayName}</span>
                <span className="text-3xl font-black text-white tabular-nums">{hostPlayer?.score || 0}</span>
                <span className="text-[11px] text-zinc-600 font-black ml-1 uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>
              </div>
              
              {/* 게스트 점수 모듈 */}
              <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.01] rounded-full blur-xl" />
                <span className="text-[10px] text-zinc-500 font-black block tracking-wider uppercase mb-1">{guestPlayer?.displayName}</span>
                <span className="text-3xl font-black text-white tabular-nums">{guestPlayer?.score || 0}</span>
                <span className="text-[11px] text-zinc-600 font-black ml-1 uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>
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
              className={`w-full max-w-xs mx-auto py-4 border rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-md active:scale-95 ${
                isHost 
                  ? 'bg-purple-600 border-purple-500/40 text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                  : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              {isHost ? (lang === 'ko' ? '한 판 더 대결하기' : 'NEXT REMATCH') : (lang === 'ko' ? '방장의 보드 초기화 대기 중...' : 'AWAITING HOST NEXT OPERATION')}
            </button>
          </div>
        )}

      </div>

      {/* 하단 시스템 엔벨로프 포지션 */}
      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE ROOM METRICS v1.2</div>
        <div>REALTIME DISPATCH ENGINE SECURITY LOCK</div>
      </div>

    </div>
  );
}