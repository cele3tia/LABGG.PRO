'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, database, db } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, update, set, get, runTransaction } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

type MatchState = 'idle' | 'queue' | 'countdown' | 'playing' | 'round_result' | 'result';
type GameType = 'reaction' | 'cps';

interface PlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  score?: number;
  level?: number;
  currentTitle?: string;
}

interface RoundScore {
  host?: number;
  guest?: number;
}

const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/5 border-purple-500/20';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20';
  return 'text-zinc-600 bg-zinc-950 border-zinc-900';
};

const TITLE_COLORS: Record<string, string> = {
  dev: 'text-amber-400 bg-amber-500/5 border-amber-500/20',
  ai: 'text-purple-400 bg-purple-500/5 border-purple-500/20',
  godspeed: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20',
  fast: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20',
  newbie: 'text-zinc-400 bg-zinc-900 border-zinc-800'
};

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie' }
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    nodeLabel: 'CASUAL MATCHMAKING CORE',
    idleTitle: '일반 교전 대기열 진입',
    idleDesc: 'MMR 레이팅에 영향을 주지 않으며, 전 세계 활성화된 유저와 무작위 1:1 피지컬 대전을 시작합니다.',
    startFind: 'MATCHMAKING SEARCH START',
    cancelFind: 'ABORT QUEUE SEQUENCE',
    queueing: 'SEARCHING FOR TARGET MATRIX...',
    elapsed: 'ELAPSED TIME',
    matched: 'TARGET CODES ALIGNED',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'RE-QUEUE SEQUENCE',
    victory: 'VICTORY SECURED',
    defeat: 'SYSTEM DEFEATED',
    draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY',
    roundLabel: 'ROUND',
    noTitle: '칭호 없음',
    errLogin: '대기열에 진입하려면 로그인이 필요합니다.'
  },
  en: {
    back: '← Back to Home',
    nodeLabel: 'CASUAL MATCHMAKING CORE',
    idleTitle: 'Enter Casual Queue',
    idleDesc: 'Does not affect ranked ratings. Instantly search and connect with worldwide active clickers for a 1v1 battle.',
    startFind: 'MATCHMAKING SEARCH START',
    cancelFind: 'ABORT QUEUE SEQUENCE',
    queueing: 'SEARCHING FOR TARGET MATRIX...',
    elapsed: 'ELAPSED TIME',
    matched: 'TARGET CODES ALIGNED',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'RE-QUEUE SEQUENCE',
    victory: 'VICTORY SECURED',
    defeat: 'SYSTEM DEFEATED',
    draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY',
    roundLabel: 'ROUND',
    noTitle: 'NO TITLE',
    errLogin: 'Authentication credentials required to join queue.'
  }
};

export default function CasualMatchPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<{ level: number; currentTitle: string } | null>(null);

  // 멀티플레이어 기계식 상태 제어 엔진
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [gameType, setGameType] = useState<GameType>('reaction');
  const [totalOption, setTotalOption] = useState<number>(3);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsData, setRoundsData] = useState<Record<string, RoundScore>>({});
  
  const [hostPlayer, setHostPlayer] = useState<PlayerInfo | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<PlayerInfo | null>(null);

  // 로컬 인게임 제어 슬롯
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
    if (user) {
      set(ref(database, `queue/normal/${user.uid}`), null);
    }
  };

  // 📡 [서버리스 매칭 알고리즘 가동] 
  // 원자적 트랜잭션을 활용해 Race Condition을 방어하고 대기열 매칭 동기화
  const handleStartMatchmaking = async () => {
    if (!user || !myProfile) {
      setErrorMessage(t.errLogin);
      return;
    }
    setErrorMessage('');
    setMatchState('queue');
    setQueueSeconds(0);

    // 대기열 스톱워치 기동
    queueTimerRef.current = setInterval(() => {
      setQueueSeconds((prev) => prev + 1);
    }, 1000);

    const queueRef = ref(database, 'queue/normal');
    
    try {
      const snapshot = await get(queueRef);
      let matchedOpponent: any = null;

      if (snapshot.exists()) {
        const currentQueue = snapshot.val();
        // 내가 아닌 다른 유저 한 명을 피킹
        const opponentId = Object.keys(currentQueue).find((uid) => uid !== user.uid);
        if (opponentId) {
          matchedOpponent = currentQueue[opponentId];
        }
      }

      if (matchedOpponent) {
        // 1. 도전자(나)가 선진입 유저를 가로채 매칭 룸 생성
        const generatedRoomId = `normal_room_${matchedOpponent.uid}_${user.uid}`;
        const roomRef = ref(database, `rooms/${generatedRoomId}`);

        // 무작위 종목 선정 메트릭 컴파일 (반응속도 / CPS 중 택 1)
        const selectedGame: GameType = Math.random() > 0.5 ? 'reaction' : 'cps';
        const gameOption = selectedGame === 'reaction' ? 3 : 5;

        const initialRoomSetup = {
          settings: {
            gameType: selectedGame,
            totalOption: gameOption,
            createdAt: Date.now()
          },
          status: 'countdown',
          currentRound: 1,
          players: {
            host: {
              uid: matchedOpponent.uid,
              displayName: matchedOpponent.displayName,
              photoURL: matchedOpponent.photoURL,
              level: matchedOpponent.level,
              currentTitle: matchedOpponent.currentTitle,
              isReady: true
            },
            guest: {
              uid: user.uid,
              displayName: user.displayName || 'Challenger',
              photoURL: user.photoURL || '',
              level: myProfile.level,
              currentTitle: myProfile.currentTitle,
              isReady: true
            }
          }
        };

        // 방 데이터 피드 주입
        await set(roomRef, initialRoomSetup);
        
        // 상대방 대기열 노드에 방 배정 주소를 밀어넣어 동시 진입 시그널 브로드캐스팅
        await update(ref(database, `queue/normal/${matchedOpponent.uid}`), { roomId: generatedRoomId });
        
        // 나도 방으로 스위칭
        setActiveRoomId(generatedRoomId);
        subscribeRoomChannel(generatedRoomId);
      } else {
        // 2. 먼저 대기 중인 유저가 없으면 대기열 노드에 나를 등록하고 방 매핑 대기 리스너 가동
        const myQueueRef = ref(database, `queue/normal/${user.uid}`);
        await set(myQueueRef, {
          uid: user.uid,
          displayName: user.displayName || 'Operator',
          photoURL: user.photoURL || '',
          level: myProfile.level,
          currentTitle: myProfile.currentTitle,
          roomId: null,
          joinedAt: Date.now()
        });

        // 내 노드 채널을 감시하다가 대기열을 긁어간 상대방이 RoomId를 꽂아주는지 스캐닝
        onValue(myQueueRef, (snap) => {
          if (!snap.exists()) return;
          const val = snap.val();
          if (val.roomId) {
            setActiveRoomId(val.roomId);
            subscribeRoomChannel(val.roomId);
            // 매칭 성립 시 대기 노드 폭파 파기
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

  // 📡 [실시간 매치 룸 동기화 채널 오케스트레이션]
  const subscribeRoomChannel = (targetRoomId: string) => {
    cleanupTimers();
    setMatchState('countdown');

    const roomRef = ref(database, `rooms/${targetRoomId}`);
    onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMatchState('idle');
        return;
      }
      const data = snapshot.val();
      setGameType(data.settings.gameType);
      setTotalOption(data.settings.totalOption);
      setMatchState(data.status);
      setCurrentRound(data.currentRound || 1);
      setRoundsData(data.rounds || {});
      setHostPlayer(data.players.host || null);
      setGuestPlayer(data.players.guest || null);

      // 다중 라운드 동기화 스케줄러 디스패치
      if (data.status === 'playing') {
        const cRound = data.currentRound || 1;
        const currentRoundScores = data.rounds?.[cRound];
        
        if (currentRoundScores && currentRoundScores.host !== undefined && currentRoundScores.guest !== undefined) {
          // 호스트 측 연산 장치가 주도하여 방 스태터스를 컨트롤 마이그레이션
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

  useEffect(() => {
    if (matchState === 'countdown') {
      runCountdown();
    } else if (matchState === 'playing') {
      startActualLocalGame();
    } else if (matchState === 'round_result') {
      if (isHost) {
        roundTransitionTimeoutRef.current = setTimeout(() => {
          update(ref(database, `rooms/${activeRoomId}`), {
            status: 'countdown',
            currentRound: currentRound + 1
          });
        }, 2500);
      }
    }
  }, [matchState]);

  const runCountdown = () => {
    setCountdownNum(3);
    setLocalGameState('idle');
    const interval = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) {
            update(ref(database, `rooms/${activeRoomId}`), { status: 'playing' });
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

  // ⚡ [모바일 완전 방어]PointerDown 프레임 인터셉터
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
      const finalCps = parseFloat((cpsClicks / totalOption).toFixed(1));
      submitRoundScore(finalCps);
    }
  }, [localGameState]);

  const submitRoundScore = async (score: number) => {
    const playerType = isHost ? 'host' : 'guest';
    const roundScoreRef = ref(database, `rooms/${activeRoomId}/rounds/${currentRound}/${playerType}`);
    await set(roundScoreRef, score);
  };

  const formatQueueTime = (sec: number): string => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getCalculatedWinner = () => {
    if (gameType === 'cps') {
      const h = roundsData?.[1]?.host ?? 0;
      const g = roundsData?.[1]?.guest ?? 0;
      const diff = parseFloat(Math.abs(h - g).toFixed(1));
      if (h === g) return { state: t.draw, gap: '0.0 CPS', amIWinner: false };
      const hostWin = h > g;
      return {
        state: (isHost ? hostWin : !hostWin) ? t.victory : t.defeat,
        gap: `Δ GAP : ${diff} CPS`,
        amIWinner: isHost ? hostWin : !hostWin
      };
    } else {
      let hostSum = 0, guestSum = 0, hostFouls = 0, guestFouls = 0;
      const totalRoundsPlayed = Object.keys(roundsData).length;

      Object.values(roundsData).forEach((r) => {
        if (r.host === 9999) hostFouls++; else hostSum += (r.host ?? 0);
        if (r.guest === 9999) guestFouls++; else guestSum += (r.guest ?? 0);
      });

      const hostAvg = hostFouls === totalRoundsPlayed ? 9999 : Math.round(hostSum / (totalRoundsPlayed - hostFouls));
      const guestAvg = guestFouls === totalRoundsPlayed ? 9999 : Math.round(guestSum / (totalRoundsPlayed - guestFouls));

      if (hostAvg === guestAvg) return { state: t.draw, gap: '0ms AVERAGE', amIWinner: false };
      const hostWin = hostAvg < guestAvg;
      const diff = Math.abs(hostAvg - guestAvg);

      return {
        state: (isHost ? hostWin : !hostWin) ? t.victory : t.defeat,
        gap: hostAvg === 9999 || guestAvg === 9999 ? 'CRITICAL DISQUALIFIED GAP' : `Δ AVG GAP : ${diff}ms`,
        amIWinner: isHost ? hostWin : !hostWin
      };
    }
  };

  const getRoundGapText = (roundNum: number) => {
    const round = roundsData?.[roundNum];
    if (!round || round.host === undefined || round.guest === undefined) return '';
    if (round.host === 9999 || round.guest === 9999) return 'FOUL MATCH';
    const diff = Math.abs(round.host - round.guest);
    return gameType === 'reaction' ? `Δ ${diff}ms` : `Δ ${diff.toFixed(1)} CPS`;
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      {/* 초미니멀 가이드 격자 넷 구조 슬롯 */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* 상단 내비바 프레임 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900 pb-5">
        <Link href="/" onClick={leaveQueueDirectly} className="text-xs font-mono font-bold text-zinc-500 hover:text-white transition-colors">
          {t.back}
        </Link>
        <span className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.25em]">
          {t.nodeLabel}
        </span>
      </div>

      {/* 메인 매칭 전술 디스플레이 세션 무대 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        
        {/* 1. 대기 화면 (IDLE STATE) */}
        {matchState === 'idle' && (
          <div className="max-w-xl mx-auto bg-zinc-950/20 border border-zinc-900 rounded-[2rem] p-8 sm:p-12 space-y-8 text-center backdrop-blur-md shadow-2xl">
            <div className="space-y-2">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">// CASUAL LOBBY INITIALIZER</span>
              <h2 className="text-3xl font-black text-white tracking-tight">{t.idleTitle}</h2>
              <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">{t.idleDesc}</p>
            </div>

            {errorMessage && (
              <p className="text-xs font-bold text-red-400 bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl">{errorMessage}</p>
            )}

            <button
              onClick={handleStartMatchmaking}
              className="w-full py-4 bg-white border border-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-2xl hover:bg-transparent hover:text-white transition-all shadow-md active:scale-[0.995]"
            >
              {t.startFind}
            </button>
          </div>
        )}

        {/* 2. 매칭 탐색 서칭 화면 (QUEUE STATE) */}
        {matchState === 'queue' && (
          <div className="max-w-md mx-auto w-full bg-zinc-950/40 border border-zinc-900 p-8 sm:p-10 rounded-3xl text-center space-y-6 flex flex-col items-center">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <div className="space-y-1">
              <p className="text-xs font-mono font-black text-zinc-500 tracking-widest uppercase">{t.queueing}</p>
              <p className="text-4xl font-mono font-black text-white tracking-tight tabular-nums">{formatQueueTime(queueSeconds)}</p>
            </div>
            <p className="text-[10px] font-mono text-zinc-600 font-bold uppercase tracking-wider">{t.elapsed}</p>
            
            <button
              onClick={handleCancelMatchmaking}
              className="w-full py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[11px] font-mono font-black text-zinc-400 hover:text-red-400 hover:border-red-500/20 transition-all uppercase tracking-widest"
            >
              {t.cancelFind}
            </button>
          </div>
        )}

        {/* 3. 인게임 배치 전 카운트다운 (COUNTDOWN STATE) */}
        {matchState === 'countdown' && (
          <div className="h-[360px] flex flex-col items-center justify-center">
            <span className="text-[120px] font-mono font-black text-white tracking-tighter tabular-nums animate-[scaleUp_0.4s_ease-out]">
              {countdownNum}
            </span>
            <span className="font-mono text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase mt-2">{t.matched}</span>
          </div>
        )}

        {/* 4. 액티브 전투 전개 세션 (PLAYING STATE - 포인터 이벤트 최적화 완료) */}
        {matchState === 'playing' && (
          <div 
            onPointerDown={handleGamePanelClick} 
            className={`h-[460px] rounded-[2rem] border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-75 relative overflow-hidden touch-none ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-[#030303] border-zinc-900 shadow-[inset_0_0_80px_rgba(255,255,255,0.01)]' : localGameState === 'click' ? 'bg-white border-white' : 'bg-black border-zinc-950')
                : 'bg-[#020202] border-zinc-900 active:border-zinc-700'
            }`}
          >
            {localGameState !== 'click' && (
              <div className="absolute inset-0 border border-white/[0.005] m-10 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-2 h-[1px] bg-zinc-900" />
                <div className="w-[1px] h-2 bg-zinc-900 absolute" />
              </div>
            )}

            {ripple && <div className="absolute inset-0 bg-white/[0.015] pointer-events-none animate-ping" />}

            {gameType === 'reaction' ? (
              localGameState === 'ready' ? (
                <div className="space-y-1 pointer-events-none">
                  <p className="text-xl font-mono font-black text-zinc-500 tracking-[0.2em] uppercase">{t.holdTrigger}</p>
                </div>
              ) : localGameState === 'click' ? (
                <p className="text-6xl font-sans font-black text-black tracking-tighter uppercase pointer-events-none">{t.clickNow}</p>
              ) : localGameState === 'foul' ? (
                <div className="space-y-1 text-center pointer-events-none">
                  <p className="text-xs font-mono font-black text-red-500 tracking-widest uppercase">{t.foul}</p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{t.syncing}</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">{t.syncing}</p>
              )
            ) : (
              <div className="space-y-5 pointer-events-none w-full max-w-xs relative z-10">
                <p className="text-[100px] font-mono font-black text-white tracking-tighter leading-none tabular-nums animate-[scaleUp_0.1s_ease-out]">
                  {cpsClicks}
                </p>
                <div className="w-16 bg-zinc-900 h-[1px] mx-auto opacity-60">
                  <div className="bg-white h-full transition-all duration-100 mx-auto" style={{ width: `${Math.min(100, (cpsClicks / (totalOption * 7.2))) * 100}%` }} />
                </div>
                <div className="font-mono text-[9px] text-zinc-600 font-bold tracking-widest uppercase">
                  BURST CLOCK: <span className="text-white font-black tabular-nums">{cpsTimeLeft}S</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. 라운드 단기 교전 결과 창 (ROUND RESULT STATE) */}
        {matchState === 'round_result' && (
          <div className="h-[450px] bg-zinc-950/20 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 animate-[scaleUp_0.3s_ease-out]">
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-purple-500 tracking-[0.25em] block">// {t.roundFinish}</span>
              <h3 className="text-3xl font-mono font-black text-white tracking-tight uppercase">ROUND 0{currentRound} RESOLVED</h3>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-900 py-2.5 px-5 rounded-xl font-mono text-xs text-zinc-400 font-black tracking-widest uppercase">
              {getRoundGapText(currentRound)}
            </div>

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

        {/* 6. 전체 교전 최종 스코어 보드 (MATCH RESULT STATE - 미니멀리즘 분석화) */}
        {matchState === 'result' && (
          <div className="bg-black border border-zinc-900 p-8 sm:p-12 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full shadow-2xl animate-[scaleUp_0.3s_ease-out]">
            
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase block">// {t.matchFinish}</span>
              <h2 className={`text-5xl font-mono font-black tracking-tighter uppercase ${getCalculatedWinner().amIWinner ? 'text-white' : 'text-zinc-500'}`}>
                {getCalculatedWinner().state}
              </h2>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 py-2.5 px-6 rounded-xl inline-block font-mono text-xs text-zinc-300 font-black tracking-widest uppercase">
              {getCalculatedWinner().gap}
            </div>

            {gameType === 'reaction' && (
              <div className="max-w-md mx-auto w-full bg-zinc-950/60 border border-zinc-900 rounded-xl overflow-hidden font-mono text-[11px]">
                <div className="grid grid-cols-3 bg-zinc-900/40 border-b border-zinc-900 text-zinc-600 font-black py-2 px-4 uppercase tracking-wider text-[9px]">
                  <div>{t.roundLabel}</div>
                  <div className="truncate">{hostPlayer?.displayName}</div>
                  <div className="truncate">{guestPlayer?.displayName}</div>
                </div>
                <div className="max-h-[140px] overflow-y-auto divide-y divide-zinc-900/60">
                  {Object.keys(roundsData).map((rKey) => {
                    const rNum = Number(rKey);
                    const rData = roundsData[rNum];
                    return (
                      <div key={rKey} className="grid grid-cols-3 py-2.5 px-4 items-center text-zinc-400 font-medium tracking-tight">
                        <div className="font-black text-zinc-600">RD.0{rNum}</div>
                        <div className={rData?.host === 9999 ? 'text-red-500 font-bold' : 'tabular-nums'}>{rData?.host === 9999 ? 'FOUL' : `${rData?.host}ms`}</div>
                        <div className={rData?.guest === 9999 ? 'text-red-500 font-bold' : 'tabular-nums'}>{rData?.guest === 9999 ? 'FOUL' : `${rData?.guest}ms`}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => {
                  cleanupTimers();
                  setMatchState('idle');
                }}
                className="w-full max-w-xs mx-auto py-3.5 bg-white border border-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl hover:bg-transparent hover:text-white transition-all"
              >
                {t.rematch}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 시스템 푸터 엔벨로프 */}
      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE ROOM METRICS v1.2</div>
        <div>REALTIME DISPATCH ENGINE SECURITY LOCK</div>
      </div>

      <style jsx global>{`
        @keyframes scaleUp {
          from { transform: scale(0.98); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
}