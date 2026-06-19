'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// 💡 네가 확인한 정상 작동 경로 반영 완료!
import { auth, database, db } from '../../lib/firebase'; 
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, update, set, get } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

// 💡 유틸 및 컴포넌트 임포트
import { MatchState, GameType, PlayerInfo, RoundScore, TRANSLATIONS, getRoundGapText } from './utils';
import { IdleScreen, QueueScreen, PlayingScreen, ResultScreen } from './components/GameScreens';

export default function CasualMatchPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<{ level: number; currentTitle: string } | null>(null);

  // 멀티플레이어 매칭 제어 상태 슬롯
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [gameType, setGameType] = useState<GameType>('reaction');
  const [totalOption, setTotalOption] = useState<number>(3);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsData, setRoundsData] = useState<Record<string, RoundScore>>({});
  
  const [hostPlayer, setHostPlayer] = useState<PlayerInfo | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<PlayerInfo | null>(null);

  // 인게임 인터랙션 제어 플래그
  const [localGameState, setLocalGameState] = useState<'idle' | 'ready' | 'click' | 'foul' | 'finished'>('idle');
  const [queueSeconds, setQueueSeconds] = useState<number>(0);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [cpsClicks, setCpsClicks] = useState<number>(0);
  const [cpsTimeLeft, setCpsTimeLeft] = useState<number>(5);
  const [reactionStartTime, setReactionStartTime] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [ripple, setRipple] = useState<boolean>(false);

  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isHost = user && hostPlayer && user.uid === hostPlayer.uid;
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    const savedLang = localStorage.getItem('site-lang') as 'ko' | 'en';
    if (savedLang) setLang(savedLang);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          const p = docSnap.data();
          setMyProfile({ level: p.level || 1, currentTitle: p.currentTitle || '' });
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupTimers();
      leaveQueueDirectly();
    };
  }, []);

  const cleanupTimers = () => {
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    if (cpsIntervalRef.current) clearInterval(cpsIntervalRef.current);
    if (roundTransitionTimeoutRef.current) clearTimeout(roundTransitionTimeoutRef.current);
  };

  const leaveQueueDirectly = () => {
    if (user) set(ref(database, `queue/normal/${user.uid}`), null);
  };

  // 📡 대기열 등록 및 트랜잭션 매칭 빌더
  const handleStartMatchmaking = async () => {
    if (!user || !myProfile) return setErrorMessage(t.errLogin);
    setErrorMessage('');
    setMatchState('queue');
    setQueueSeconds(0);

    queueTimerRef.current = setInterval(() => setQueueSeconds((prev) => prev + 1), 1000);
    const queueRef = ref(database, 'queue/normal');
    
    try {
      const snapshot = await get(queueRef);
      let matchedOpponent: any = null;

      if (snapshot.exists()) {
        const currentQueue = snapshot.val();
        const opponentId = Object.keys(currentQueue).find((uid) => uid !== user.uid);
        if (opponentId) matchedOpponent = currentQueue[opponentId];
      }

      if (matchedOpponent) {
        const generatedRoomId = `normal_room_${matchedOpponent.uid}_${user.uid}`;
        const roomRef = ref(database, `rooms/${generatedRoomId}`);
        const selectedGame: GameType = Math.random() > 0.5 ? 'reaction' : 'cps';
        const gameOption = selectedGame === 'reaction' ? 3 : 5;

        await set(roomRef, {
          settings: { gameType: selectedGame, totalOption: gameOption, createdAt: Date.now() },
          status: 'countdown', currentRound: 1,
          players: {
            host: { uid: matchedOpponent.uid, displayName: matchedOpponent.displayName, photoURL: matchedOpponent.photoURL, level: matchedOpponent.level, currentTitle: matchedOpponent.currentTitle, isReady: true },
            guest: { uid: user.uid, displayName: user.displayName || 'Challenger', photoURL: user.photoURL || '', level: myProfile.level, currentTitle: myProfile.currentTitle, isReady: true }
          }
        });
        
        await update(ref(database, `queue/normal/${matchedOpponent.uid}`), { roomId: generatedRoomId });
        setActiveRoomId(generatedRoomId);
        subscribeRoomChannel(generatedRoomId);
      } else {
        const myQueueRef = ref(database, `queue/normal/${user.uid}`);
        await set(myQueueRef, { uid: user.uid, displayName: user.displayName || 'Operator', photoURL: user.photoURL || '', level: myProfile.level, currentTitle: myProfile.currentTitle, roomId: null, joinedAt: Date.now() });

        onValue(myQueueRef, (snap) => {
          if (!snap.exists()) return;
          const val = snap.val();
          if (val.roomId) {
            setActiveRoomId(val.roomId);
            subscribeRoomChannel(val.roomId);
            set(myQueueRef, null);
          }
        });
      }
    } catch (err) {
      console.error(err);
      setMatchState('idle');
    }
  };

  const handleCancelMatchmaking = async () => {
    cleanupTimers();
    leaveQueueDirectly();
    setMatchState('idle');
  };

  // 📡 생성된 게임방 실시간 스트리밍 채널 리스너 동기화 오케스트레이션
  const subscribeRoomChannel = (targetRoomId: string) => {
    cleanupTimers();
    setMatchState('countdown');

    const roomRef = ref(database, `rooms/${targetRoomId}`);
    onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) return setMatchState('idle');
      
      const data = snapshot.val();
      setGameType(data.settings.gameType);
      setTotalOption(data.settings.totalOption);
      setMatchState(data.status);
      setCurrentRound(data.currentRound || 1);
      setRoundsData(data.rounds || {});
      setHostPlayer(data.players.host || null);
      setGuestPlayer(data.players.guest || null);

      if (data.status === 'playing') {
        const cRound = data.currentRound || 1;
        const currentRoundScores = data.rounds?.[cRound];
        
        if (currentRoundScores && currentRoundScores.host !== undefined && currentRoundScores.guest !== undefined) {
          if (user && data.players.host.uid === user.uid) {
            setTimeout(() => {
              if (cRound >= data.settings.totalOption || data.settings.gameType === 'cps') {
                update(ref(database, `rooms/${targetRoomId}`), { status: 'result' });
              } else {
                update(ref(database, `rooms/${targetRoomId}`), { status: 'round_result' });
              }
            }, 1000);
          }
        }
      }
    });
  };

  // ⚙️ [버그 수정본] 1. 매치 룸 스태터스 상태 변이 트리거에 따른 게임 초기화
  useEffect(() => {
    if (matchState === 'countdown') {
      setCountdownNum(3);
      setLocalGameState('idle');
    } else if (matchState === 'playing') {
      if (gameType === 'reaction') {
        setLocalGameState('ready');
        reactionTimeoutRef.current = setTimeout(() => {
          setLocalGameState('click');
          setReactionStartTime(performance.now());
        }, Math.floor(Math.random() * 2500) + 2000);
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
    } else if (matchState === 'round_result') {
      if (isHost) {
        roundTransitionTimeoutRef.current = setTimeout(() => {
          update(ref(database, `rooms/${activeRoomId}`), { status: 'countdown', currentRound: currentRound + 1 });
        }, 2500);
      }
    }
  }, [matchState]);

  // ⏳ [버그 수정본] 2. 카운트다운 자체를 안전하게 감소시키는 독립 타이머
  useEffect(() => {
    if (matchState !== 'countdown') return;
    
    const interval = setInterval(() => {
      setCountdownNum((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [matchState]);

  // 🚀 [버그 수정본] 3. 카운트다운이 0이 되면 실시간 방장 권한을 체크하여 게임 스타트 신호 주입
  useEffect(() => {
    if (matchState === 'countdown' && countdownNum === 0 && isHost && activeRoomId) {
      update(ref(database, `rooms/${activeRoomId}`), { status: 'playing' });
    }
  }, [countdownNum, matchState, isHost, activeRoomId]);

  const handleGamePanelClick = (e: React.PointerEvent) => {
    e.preventDefault();
    if (matchState !== 'playing') return;

    setRipple(true);
    setTimeout(() => setRipple(false), 120);

    if (gameType === 'reaction') {
      if (localGameState === 'ready') {
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        setLocalGameState('foul');
        submitRoundScore(9999);
      } else if (localGameState === 'click') {
        const score = Math.round(performance.now() - reactionStartTime);
        setLocalGameState('finished');
        submitRoundScore(score);
      }
    } else if (gameType === 'cps' && localGameState === 'click') {
      setCpsClicks((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (gameType === 'cps' && localGameState === 'finished' && cpsClicks > 0) {
      submitRoundScore(parseFloat((cpsClicks / totalOption).toFixed(1)));
    }
  }, [localGameState]);

  const submitRoundScore = async (score: number) => {
    const playerType = isHost ? 'host' : 'guest';
    await set(ref(database, `rooms/${activeRoomId}/rounds/${currentRound}/${playerType}`), score);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900 pb-5">
        <Link href="/" onClick={leaveQueueDirectly} className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">{t.back}</Link>
        <span className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.25em]">{t.nodeLabel}</span>
      </div>

      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        {matchState === 'idle' && <IdleScreen t={t} errorMessage={errorMessage} onStart={handleStartMatchmaking} />}
        {matchState === 'queue' && <QueueScreen t={t} queueSeconds={queueSeconds} onCancel={handleCancelMatchmaking} />}
        
        {matchState === 'countdown' && (
          <div className="h-[360px] flex flex-col items-center justify-center">
            <span className="text-[120px] font-mono font-black text-white tracking-tighter tabular-nums animate-[scaleUp_0.4s_ease-out]">{countdownNum}</span>
            <span className="font-mono text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase mt-2">{t.matched}</span>
          </div>
        )}

        {matchState === 'playing' && (
          <PlayingScreen t={t} gameType={gameType} localGameState={localGameState} ripple={ripple} cpsClicks={cpsClicks} cpsTimeLeft={cpsTimeLeft} totalOption={totalOption} onPanelClick={handleGamePanelClick} />
        )}

        {matchState === 'round_result' && (
          <div className="h-[450px] bg-zinc-950/20 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 animate-[scaleUp_0.3s_ease-out]">
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-purple-500 tracking-[0.25em] block">// {t.roundFinish}</span>
              <h3 className="text-3xl font-mono font-black text-white tracking-tight uppercase">ROUND 0{currentRound} RESOLVED</h3>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-900 py-2.5 px-5 rounded-xl font-mono text-xs text-zinc-400 font-black tracking-widest uppercase">{getRoundGapText(currentRound, roundsData, gameType)}</div>
            <div className="grid grid-cols-2 gap-4 max-w-sm w-full font-mono text-left pt-2">
              <div className="bg-black border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] text-zinc-600 block font-bold truncate uppercase">{hostPlayer?.displayName}</span>
                <span className="text-xl font-black text-white tabular-nums">{roundsData?.[currentRound]?.host === 9999 ? 'FOUL' : `${roundsData?.[currentRound]?.host}ms`}</span>
              </div>
              <div className="bg-black border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] text-zinc-600 block font-bold truncate uppercase">{guestPlayer?.displayName}</span>
                <span className="text-xl font-black text-white tabular-nums">{roundsData?.[currentRound]?.guest === 9999 ? 'FOUL' : `${roundsData?.[currentRound]?.guest}ms`}</span>
              </div>
            </div>
          </div>
        )}

        {matchState === 'result' && (
          <ResultScreen t={t} gameType={gameType} roundsData={roundsData} hostPlayer={hostPlayer} guestPlayer={guestPlayer} isHost={isHost} onRematch={() => { cleanupTimers(); setMatchState('idle'); }} />
        )}
      </div>

      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE ROOM METRICS v1.2</div>
        <div>REALTIME DISPATCH ENGINE SECURITY LOCK</div>
      </div>

      <style jsx global>{`
        @keyframes scaleUp { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}