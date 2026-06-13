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

      if (data.status === 'playing') {
        const hostScore = data.players?.host?.score;
        const guestScore = data.players?.guest?.score;
        if (hostScore !== undefined && guestScore !== undefined) {
          update(ref(database, `rooms/${roomId}`), { status: 'result' });
        }
      }
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
    setLocalGameState('idle');
    if (gameType === 'reaction') {
      setLocalGameState('ready');
      const randomDelay = Math.floor(Math.random() * 3000) + 2000;
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

  const handleGamePanelClick = (e: React.PointerEvent) => {
    e.preventDefault(); // 모바일 더블탭 줌 동작 강제 차단
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

  const getMatchMetrics = () => {
    const hScore = hostPlayer?.score ?? 0;
    const gScore = guestPlayer?.score ?? 0;
    const unit = gameType === 'reaction' ? 'ms' : 'CPS';

    const rawGap = Math.abs(hScore - gScore);
    const gapStr = gameType === 'reaction' ? `${Math.round(rawGap)}` : `${rawGap.toFixed(1)}`;

    if (hScore === gScore) return { title: 'MATCH DRAWN', gapText: '0.0 LEVEL DIFFERENCE', amIWinner: false };

    let isHostWin = gameType === 'reaction' ? hScore < gScore : hScore > gScore;
    const amIWinner = isHost ? isHostWin : !isHostWin;

    return {
      title: amIWinner ? 'VICTORY' : 'DEFEATED',
      gapText: `Δ GAP : ${gapStr} ${unit}`,
      amIWinner
    };
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(168,85,247,0.005),transparent_60%)] pointer-events-none z-0" />
      
      {/* 상단 통합 HUD 바 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900 pb-5">
        <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-mono font-bold text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95 shadow-lg">
          {lang === 'ko' ? '← 퇴장하기' : '← QUIT'}
        </button>
        
        {roomStatus === 'playing' && (
          <div className="flex items-center gap-6 bg-zinc-950 border border-zinc-900 px-5 py-2 rounded-xl font-mono text-[10px] font-bold tracking-wider text-zinc-400">
            <span className="flex items-center gap-1.5"><span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />{hostPlayer?.displayName}</span>
            <span className="text-zinc-800 font-black">VS</span>
            <span className="flex items-center gap-1.5">{guestPlayer?.displayName}<span className="w-1 h-1 bg-zinc-600 rounded-full animate-ping" /></span>
          </div>
        )}

        <div className="flex items-center gap-3 font-mono text-xs">
          <button 
            onClick={handleCopyCode}
            className="group/copy relative text-purple-400 font-black tracking-[0.15em] bg-purple-500/5 px-4 py-1.5 border border-purple-500/20 rounded-xl text-xs shadow-md hover:border-purple-500/40 transition-all flex items-center gap-2"
          >
            <span>{roomId}</span>
            <span className="text-[9px] font-sans font-black bg-purple-500/20 px-1.5 py-0.5 rounded text-purple-300">
              {copied ? 'COPIED' : 'COPY'}
            </span>
          </button>
        </div>
      </div>

      {/* 메인 스테이지 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        
        {/* 🟢 대기실 화면 */}
        {roomStatus === 'waiting' && (
          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 md:gap-0">
              
              {/* 호스트 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 flex flex-col items-center gap-5 relative shadow-xl">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-bold text-zinc-600 tracking-widest uppercase">// HOST NODE</div>
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden p-0.5">
                  <img src={hostPlayer?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Host" className="w-full h-full object-cover rounded-xl" />
                </div>
                <div className="text-center space-y-1.5 flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white">{hostPlayer?.displayName}</p>
                    <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(hostPlayer?.level || 1)}`}>
                      LV.{hostPlayer?.level || 1}
                    </span>
                  </div>
                  {hostPlayer?.currentTitle && (
                    <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${TITLE_COLORS[hostPlayer.currentTitle] || 'text-zinc-400'}`}>
                      {TITLE_MAP[lang][hostPlayer.currentTitle]}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-black px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg tracking-wider uppercase">READY</span>
              </div>

              <div className="md:col-span-1 flex justify-center items-center font-mono text-zinc-800 font-black italic text-xl">VS</div>

              {/* 게스트 */}
              <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 flex flex-col items-center gap-5 relative shadow-xl">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-bold text-zinc-600 tracking-widest uppercase">// CHALLENGER NODE</div>
                {guestPlayer ? (
                  <>
                    <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden p-0.5">
                      <img src={guestPlayer.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Guest" className="w-full h-full object-cover rounded-xl" />
                    </div>
                    <div className="text-center space-y-1.5 flex flex-col items-center">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white">{guestPlayer.displayName}</p>
                        <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(guestPlayer.level || 1)}`}>
                          LV.{guestPlayer.level || 1}
                        </span>
                      </div>
                      {guestPlayer.currentTitle && (
                        <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${TITLE_COLORS[guestPlayer.currentTitle] || 'text-zinc-400'}`}>
                          {TITLE_MAP[lang][guestPlayer.currentTitle]}
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] font-mono font-black px-2.5 py-1 rounded-lg tracking-wider uppercase border transition-all ${guestPlayer.isReady ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'}`}>
                      {guestPlayer.isReady ? 'READY' : 'WAITING'}
                    </span>
                  </>
                ) : (
                  <div className="h-40 flex items-center justify-center">
                    <p className="text-[10px] font-mono font-black text-zinc-700 tracking-widest uppercase animate-pulse">Awaiting Opponent Connection...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-xs mx-auto w-full pt-2">
              <button
                onClick={handleActionButton}
                disabled={!guestPlayer}
                className={`w-full py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-md ${
                  isHost 
                    ? (hostPlayer?.isReady && guestPlayer?.isReady ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'bg-zinc-900 text-zinc-600 border border-zinc-800/50 cursor-not-allowed')
                    : (guestPlayer?.isReady ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' : 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]')
                }`}
              >
                {isHost ? 'LAUNCH MATCH' : (guestPlayer?.isReady ? 'CANCEL READY' : 'LOCK READY')}
              </button>
            </div>
          </div>
        )}

        {/* ⏳ 카운트다운 */}
        {roomStatus === 'countdown' && (
          <div className="h-[360px] flex items-center justify-center">
            <span className="text-8xl font-mono font-black text-white tracking-tighter tabular-nums animate-[scaleUp_0.5s_ease-out]">
              {countdownNum}
            </span>
          </div>
        )}

        {/* ⚡ 2. 인게임 플레이 기지 (onPointerDown 및 touch-none 모바일 노딜레이 패치 완료) */}
        {roomStatus === 'playing' && (
          <div 
            onPointerDown={handleGamePanelClick} 
            className={`h-[450px] rounded-3xl border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all relative overflow-hidden touch-none ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-[#09090b] border-red-900/50 shadow-[inset_0_0_100px_rgba(239,68,68,0.03)]' : localGameState === 'click' ? 'bg-[#10b981] border-emerald-400' : 'bg-black border-zinc-900')
                : 'bg-[#050505] border-zinc-900 shadow-[inset_0_0_40px_rgba(255,255,255,0.01)] active:border-zinc-700'
            }`}
          >
            {/* 정밀 에임 가이드 라인 오버레이 */}
            <div className="absolute inset-0 border border-white/[0.01] m-8 rounded-2xl pointer-events-none flex items-center justify-center">
              <div className="w-3 h-[1px] bg-zinc-800" />
              <div className="w-[1px] h-3 bg-zinc-800 absolute" />
            </div>

            {gameType === 'reaction' ? (
              localGameState === 'ready' ? (
                <div className="space-y-1.5 pointer-events-none">
                  <p className="text-xl font-mono font-black text-red-500 tracking-[0.3em] uppercase">STANDBY...</p>
                  <p className="text-[9px] font-mono text-zinc-600 tracking-wider uppercase">TRIGGER FIRES AT RANDOM INTERVALS</p>
                </div>
              ) : localGameState === 'click' ? (
                <p className="text-5xl font-black text-black tracking-tighter uppercase pointer-events-none">TOUCH!!</p>
              ) : localGameState === 'foul' ? (
                <div className="space-y-1 text-center pointer-events-none">
                  <p className="text-xs font-mono font-black text-red-600 tracking-widest uppercase">// SIGNAL DISRUPTED (FOUL)</p>
                  <p className="text-[9px] text-zinc-600 font-medium uppercase">Awaiting opponent connection cycle</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">TRANSMITTING METRICS...</p>
              )
            ) : (
              /* 🎯 CPS 카운터: 짜치는 그라데이션 전부 걷어내고 Stark White로 긴장감 조성 */
              <div className="space-y-6 pointer-events-none w-full max-w-xs relative z-10">
                <p className="text-8xl font-mono font-black text-white tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                  {cpsClicks}
                </p>
                <div className="w-24 bg-zinc-900 h-[2px] mx-auto overflow-hidden relative">
                  <div className="bg-white h-full transition-all duration-150 mx-auto" style={{ width: `${Math.min(100, (cpsClicks / (totalOption * 7))) * 100}%` }} />
                </div>
                <div className="font-mono text-[9px] text-zinc-500 tracking-widest uppercase">
                  BURST SECONDS: <span className="text-white font-black tabular-nums">{cpsTimeLeft}S</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🏆 3. 대결 결과 정산 대시보드 (이스포츠 스펙 모노크롬 리디자인) */}
        {roomStatus === 'result' && (
          <div className="bg-black border border-zinc-900 p-8 sm:p-12 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full relative overflow-hidden shadow-2xl animate-[scaleUp_0.3s_ease-out]">
            
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase block">// LOG INTERCEPT COMPLETE</span>
              <h2 className="text-4xl font-mono font-black text-white tracking-tighter uppercase">
                {getMatchMetrics().title}
              </h2>
            </div>

            {/* 📊 정밀 갭 분석 디렉토리 (불필요한 이모지 완벽 압수) */}
            <div className="bg-zinc-950 border border-zinc-900 py-2.5 px-5 rounded-xl inline-block font-mono text-[11px] text-zinc-400 font-black tracking-widest">
              {getMatchMetrics().gapText}
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-left max-w-md mx-auto">
              
              {/* 호스트 점수 슬롯 */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
                <span className="text-[9px] text-zinc-600 font-black tracking-wider uppercase truncate">{hostPlayer?.displayName} (HOST)</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black tabular-nums ${hostPlayer?.score === 9999 ? 'text-red-500 font-mono' : 'text-zinc-100'}`}>
                    {hostPlayer?.score === 9999 ? 'FOUL' : hostPlayer?.score}
                  </span>
                  {hostPlayer?.score !== 9999 && <span className="text-[9px] text-zinc-600 font-black uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>}
                </div>
              </div>
              
              {/* 게스트 점수 슬롯 */}
              <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-900 flex flex-col justify-between h-24">
                <span className="text-[9px] text-zinc-600 font-black tracking-wider uppercase truncate">{guestPlayer?.displayName} (GUEST)</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black tabular-nums ${guestPlayer?.score === 9999 ? 'text-red-500 font-mono' : 'text-zinc-100'}`}>
                    {guestPlayer?.score === 9999 ? 'FOUL' : guestPlayer?.score}
                  </span>
                  {guestPlayer?.score !== 9999 && <span className="text-[9px] text-zinc-600 font-black uppercase">{gameType === 'reaction' ? 'ms' : 'CPS'}</span>}
                </div>
              </div>

            </div>

            <div className="pt-2">
              <button
                onClick={async () => {
                  if (isHost) {
                    await update(ref(database, `rooms/${roomId}/players/host`), { score: null });
                    if (guestPlayer) await update(ref(database, `rooms/${roomId}/players/guest`), { score: null, isReady: false });
                    await update(ref(database, `rooms/${roomId}`), { status: 'waiting' });
                  }
                }}
                className={`w-full max-w-xs mx-auto py-3.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all border ${
                  isHost 
                    ? 'bg-white border-white text-black hover:bg-transparent hover:text-white' 
                    : 'bg-transparent border-zinc-900 text-zinc-700 cursor-not-allowed'
                }`}
              >
                {isHost ? 'REINITIATE MATCH' : 'AWAITING HOST COMMAND'}
              </button>
            </div>
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