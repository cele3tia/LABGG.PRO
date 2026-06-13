'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, database, db } from '../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, update, set, get } from 'firebase/database';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

type MatchState = 'idle' | 'queue' | 'countdown' | 'playing' | 'round_result' | 'result';
type GameType = 'reaction' | 'cps';

interface PlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  score?: number;
  level?: number;
  currentTitle?: string;
  rankedLp?: number;
}

interface RoundScore {
  host?: number;
  guest?: number;
}

// 📊 [경쟁전 핵심 레벨 스케줄러] 누적 LP를 기반으로 한 티어 분기 구조 체계
interface TierStructure {
  name: string;
  division: string;
  localLp: number;
  color: string;
  bgGlow: string;
}

const getTierFromLp = (totalLp: number): TierStructure => {
  if (totalLp < 0) totalLp = 0;
  
  const TIERS = [
    { name: 'IRON', color: 'text-zinc-500 border-zinc-800', bgGlow: 'rgba(113,113,122,0.03)' },
    { name: 'BRONZE', color: 'text-amber-700 border-amber-900', bgGlow: 'rgba(180,83,9,0.03)' },
    { name: 'SILVER', color: 'text-slate-300 border-slate-700', bgGlow: 'rgba(203,213,225,0.03)' },
    { name: 'GOLD', color: 'text-yellow-400 border-yellow-600/50', bgGlow: 'rgba(234,179,8,0.03)' },
    { name: 'PLATINUM', color: 'text-emerald-400 border-emerald-600/50', bgGlow: 'rgba(16,185,129,0.03)' },
    { name: 'DIAMOND', color: 'text-cyan-400 border-cyan-500/50', bgGlow: 'rgba(34,211,238,0.03)' },
  ];

  // 마스터 티어 예외 처리 최상단 배치 (1800 LP 이상 무한 축적)
  if (totalLp >= 1800) {
    return {
      name: 'MASTER',
      division: '',
      localLp: totalLp - 1800,
      color: 'text-purple-400 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse',
      bgGlow: 'rgba(168,85,247,0.05)'
    };
  }

  const tierIndex = Math.floor(totalLp / 300);
  const remainder = totalLp % 300;
  const divisionIndex = Math.floor(remainder / 100);
  const localLp = remainder % 100;

  const divisionMap = ['III', 'II', 'I'];
  
  return {
    name: TIERS[tierIndex].name,
    division: divisionMap[divisionIndex],
    localLp: localLp,
    color: TIERS[tierIndex].color,
    bgGlow: TIERS[tierIndex].bgGlow
  };
};

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
  newbie: 'text-zinc-500 bg-zinc-950 border-zinc-900'
};

const TITLE_MAP: Record<'ko' | 'en', Record<string, string>> = {
  ko: { dev: '개발자', ai: 'AI', godspeed: '전광석화', fast: '빠름', newbie: '뉴비' },
  en: { dev: 'Developer', ai: 'AI', godspeed: 'Lightning', fast: 'Swift', newbie: 'Newbie' }
};

const TRANSLATIONS = {
  ko: {
    back: '← 홈으로',
    nodeLabel: 'COMPETITIVE RANKED CORE v1.0',
    idleTitle: '경쟁 교전 진입',
    idleDesc: '초정밀 실시간 레이팅 시스템 매칭 패널. 경기 결과에 따라 등급 스탯 및 LP 변동 메트릭이 연산 처리됩니다.',
    startFind: 'RANKED SEARCH QUEUE START',
    cancelFind: 'ABORT QUEUE SEQUENCE',
    queueing: 'RESOLVING RANGE MATCH MATRIX...',
    elapsed: 'ELAPSED TIME',
    matched: 'MATCH ALIGNED // COMPILING ARENA',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'RE-QUEUE SEQUENCE',
    victory: 'RANKED VICTORY SECURED',
    defeat: 'RANKED DEFEAT DECLARED',
    draw: 'STALEMATE DRAW',
    analytics: '// COMPETITIVE PERFORMANCE OVERVIEW',
    roundLabel: 'ROUND',
    noTitle: '칭호 없음',
    errLogin: '경쟁 대기열에 진입하려면 로그인이 필요합니다.',
    promoAlert: 'PROMOTION EVENT OCCURRED',
    demoAlert: 'CRITICAL DEMOTION OCCURRED'
  },
  en: {
    back: '← Back to Home',
    nodeLabel: 'COMPETITIVE RANKED CORE v1.0',
    idleTitle: 'Enter Ranked Queue',
    idleDesc: 'High-fidelity skill rating framework. Match results strictly compute Tier fluctuations and LP mechanics.',
    startFind: 'RANKED SEARCH QUEUE START',
    cancelFind: 'ABORT QUEUE SEQUENCE',
    queueing: 'RESOLVING RANGE MATCH MATRIX...',
    elapsed: 'ELAPSED TIME',
    matched: 'MATCH ALIGNED // COMPILING ARENA',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'RE-QUEUE SEQUENCE',
    victory: 'RANKED VICTORY SECURED',
    defeat: 'RANKED DEFEAT DECLARED',
    draw: 'STALEMATE DRAW',
    analytics: '// COMPETITIVE PERFORMANCE OVERVIEW',
    roundLabel: 'ROUND',
    noTitle: 'NO TITLE',
    errLogin: 'Authentication credentials required to join ranked queue.',
    promoAlert: 'PROMOTION EVENT OCCURRED',
    demoAlert: 'CRITICAL DEMOTION OCCURRED'
  }
};

export default function RankedMatchPage() {
  const router = useRouter();
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);
  const [myDbData, setMyDbData] = useState<{ level: number; currentTitle: string; rankedLp: number } | null>(null);

  // 전술 매칭 시스템 코어 스태터스
  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [activeRoomId, setActiveRoomId] = useState<string>('');
  const [gameType, setGameType] = useState<GameType>('reaction');
  const [totalOption, setTotalOption] = useState<number>(3);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsData, setRoundsData] = useState<Record<string, RoundScore>>({});
  
  const [hostPlayer, setHostPlayer] = useState<PlayerInfo | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<PlayerInfo | null>(null);

  // 인게임 작동 기어
  const [localGameState, setLocalGameState] = useState<'idle' | 'ready' | 'click' | 'foul' | 'finished'>('idle');
  const [queueSeconds, setQueueSeconds] = useState<number>(0);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [cpsClicks, setCpsClicks] = useState<number>(0);
  const [cpsTimeLeft, setCpsTimeLeft] = useState<number>(5);
  const [reactionStartTime, setReactionStartTime] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [ripple, setRipple] = useState<boolean>(false);

  // 📈 랭크 정산용 변동 지표 상태 기록부
  const [lpChangeAmount, setLpChangeAmount] = useState<number>(0);
  const [hasUpdatedLp, setHasUpdatedLp] = useState<boolean>(false);

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
        // Firestore 랭크 스탯 데이터 트리 리드
        const docSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (docSnap.exists()) {
          const p = docSnap.data();
          setMyDbData({
            level: p.level || 1,
            currentTitle: p.currentTitle || '',
            rankedLp: p.rankedLp !== undefined ? p.rankedLp : 300 // 최초 시작점 기본 브론즈3(300점) 강제 안착
          });
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
    if (user) set(ref(database, `queue/ranked/${user.uid}`), null);
  };

  // 📡 경쟁전 전용 레이팅 매칭 프로토콜 오케스트레이터
  const handleStartMatchmaking = async () => {
    if (!user || !myDbData) {
      setErrorMessage(t.errLogin);
      return;
    }
    setErrorMessage('');
    setMatchState('queue');
    setQueueSeconds(0);
    setHasUpdatedLp(false);

    queueTimerRef.current = setInterval(() => {
      setQueueSeconds((prev) => prev + 1);
    }, 1000);

    const queueRef = ref(database, 'queue/ranked');
    
    try {
      const snapshot = await get(queueRef);
      let matchedOpponent: any = null;

      if (snapshot.exists()) {
        const currentQueue = snapshot.val();
        // 경쟁전용 레이팅 매칭: 내 점수 기준 위아래 유사 밴드 매칭을 원칙으로 하되 대기열 첫 유저 서칭
        const opponentId = Object.keys(currentQueue).find((uid) => uid !== user.uid);
        if (opponentId) matchedOpponent = currentQueue[opponentId];
      }

      if (matchedOpponent) {
        const generatedRoomId = `ranked_room_${matchedOpponent.uid}_${user.uid}`;
        const roomRef = ref(database, `rooms/${generatedRoomId}`);

        // 경쟁전 종목 가변 로직 주입 (Reaction / CPS 가변 분기 처리)
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
              rankedLp: matchedOpponent.rankedLp,
              isReady: true
            },
            guest: {
              uid: user.uid,
              displayName: user.displayName || 'Challenger',
              photoURL: user.photoURL || '',
              level: myDbData.level,
              currentTitle: myDbData.currentTitle,
              rankedLp: myDbData.rankedLp,
              isReady: true
            }
          }
        };

        await set(roomRef, initialRoomSetup);
        await update(ref(database, `queue/ranked/${matchedOpponent.uid}`), { roomId: generatedRoomId });
        
        setActiveRoomId(generatedRoomId);
        subscribeRoomChannel(generatedRoomId);
      } else {
        const myQueueRef = ref(database, `queue/ranked/${user.uid}`);
        await set(myQueueRef, {
          uid: user.uid,
          displayName: user.displayName || 'Operator',
          photoURL: user.photoURL || '',
          level: myDbData.level,
          currentTitle: myDbData.currentTitle,
          rankedLp: myDbData.rankedLp,
          roomId: null,
          joinedAt: Date.now()
        });

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

  // 경쟁전 전용 하이피델리티 룸 소켓 스트림 바인딩
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
    } else if (matchState === 'result') {
      // 🎯 [경쟁전 심장부 정산 스크립트] 결과창이 뜨면 클라이언트 세션에서 단 1회 랭크 점수 정산기 가동
      processRankedLpTransaction();
    }
  }, [matchState]);

  const runCountdown = () => {
    setCountdownNum(3);
    setLocalGameState('idle');
    const interval = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost) update(ref(database, `rooms/${activeRoomId}`), { status: 'playing' });
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

  // 📝 [경쟁전 코어 점수 정산 모듈] 요청에 따라 20~30점 난수 적용 및 강등 차단 연산
  const processRankedLpTransaction = async () => {
    if (!user || !myDbData || hasUpdatedLp) return;
    setHasUpdatedLp(true);

    const metrics = getCalculatedWinner();
    // 20~30점 사이 난수 정밀 생성
    const lpDelta = Math.floor(Math.random() * 11) + 20; 
    
    let nextLp = myDbData.rankedLp;
    if (metrics.isDraw) {
      setLpChangeAmount(0);
      return;
    } else if (metrics.amIWinner) {
      nextLp += lpDelta;
      setLpChangeAmount(lpDelta);
    } else {
      nextLp -= lpDelta;
      if (nextLp < 0) nextLp = 0; // 아이언3 0점 밑으로 추락하는 현상 완벽 방어
      setLpChangeAmount(-lpDelta);
    }

    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { rankedLp: nextLp });
      setMyDbData((prev) => prev ? { ...prev, rankedLp: nextLp } : null);
    } catch (err) {
      console.error("Failed to commit Ranked LP Transaction:", err);
    }
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
      if (h === g) return { state: t.draw, gap: '0.0 CPS', amIWinner: false, isDraw: true };
      const hostWin = h > g;
      return {
        state: (isHost ? hostWin : !hostWin) ? t.victory : t.defeat,
        gap: `Δ GAP : ${diff} CPS`,
        amIWinner: isHost ? hostWin : !hostWin,
        isDraw: false
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

      if (hostAvg === guestAvg) return { state: t.draw, gap: '0ms AVERAGE', amIWinner: false, isDraw: true };
      const hostWin = hostAvg < guestAvg;
      const diff = Math.abs(hostAvg - guestAvg);

      return {
        state: (isHost ? hostWin : !hostWin) ? t.victory : t.defeat,
        gap: hostAvg === 9999 || guestAvg === 9999 ? 'CRITICAL DISQUALIFIED GAP' : `Δ AVG GAP : ${diff}ms`,
        amIWinner: isHost ? hostWin : !hostWin,
        isDraw: false
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

  // 현재 내 실시간 랭킹 티어 오브젝트 디코딩
  const currentTierObj = myDbData ? getTierFromLp(myDbData.rankedLp) : null;
  const matchMetrics = matchState === 'result' ? getCalculatedWinner() : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans antialiased flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      
      {/* 🔮 연산 노드 백그라운드 텍스처 아우라 스킨 */}
      {currentTierObj && (
        <div 
          className="absolute inset-0 transition-all duration-1000 pointer-events-none z-0" 
          style={{ backgroundColor: currentTierObj.bgGlow }}
        />
      )}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* 상단 랭킹 인스턴스 전술 표시 바 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900/80 pb-5">
        <Link href="/" onClick={leaveQueueDirectly} className="text-xs font-mono font-bold text-zinc-600 hover:text-white transition-all">
          {t.back}
        </Link>
        
        {/* 현재 플레이어 실시간 티어 HUD 오버레이 바 */}
        {currentTierObj && matchState === 'idle' && (
          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-900 px-4 py-1.5 rounded-xl font-mono text-[10px] font-black">
            <span className="text-zinc-500">CURRENT COMPETITIVE RATING:</span>
            <span className={`${currentTierObj.color} tracking-widest`}>
              {currentTierObj.name} {currentTierObj.division}
            </span>
            <span className="text-zinc-300 tabular-nums bg-white/5 px-2 py-0.5 rounded border border-white/5">
              {currentTierObj.localLp} / 100 LP
            </span>
          </div>
        )}

        <span className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.25em] hidden sm:inline">
          {t.nodeLabel}
        </span>
      </div>

      {/* 대시보드 메인 스테이지 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        
        {/* 🟢 상태 1. 대기 로비 (IDLE DASHBOARD) */}
        {matchState === 'idle' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start max-w-4xl mx-auto w-full">
            
            {/* 좌측 카드: 유저 전술 티어 인디케이터 장치 */}
            {currentTierObj && (
              <div className="md:col-span-2 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] font-bold text-zinc-600 tracking-widest block uppercase">// RATING FILE</span>
                  <p className="text-sm font-black text-zinc-400 truncate">{user?.displayName}</p>
                </div>

                {/* 하이엔드 네온 서클 프레임 디스플레이 */}
                <div className="w-32 h-32 mx-auto rounded-[2.5rem] bg-black border border-zinc-900 flex flex-col items-center justify-center relative shadow-inner">
                  <span className={`text-xl font-mono font-black tracking-tighter ${currentTierObj.color}`}>
                    {currentTierObj.name}
                  </span>
                  <span className="text-sm font-mono font-black text-zinc-300 mt-0.5">
                    {currentTierObj.division || 'TOP'}
                  </span>
                </div>

                {/* 📊 요구사항: 예쁜 실시간 티어 전용 게이지 점수 바 렌더링 벨트 */}
                <div className="space-y-2 text-left font-mono">
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                    <span>PROGRESS RATE</span>
                    <span className="text-white font-black tabular-nums">{currentTierObj.localLp} <span className="text-zinc-600 font-normal">/</span> 100 LP</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden p-[1px] border border-zinc-900">
                    <div 
                      className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.8)]" 
                      style={{ width: `${currentTierObj.localLp}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 우측 카드: 큐 인스턴스 트리거 */}
            <div className="md:col-span-3 bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 sm:p-10 space-y-6 shadow-2xl backdrop-blur-md h-full flex flex-col justify-between">
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="font-mono text-[9px] font-bold text-zinc-600 tracking-widest block uppercase">// OPERATIONAL LAUNCHER</span>
                  <h2 className="text-2xl font-mono font-black text-white tracking-tight">{t.idleTitle}</h2>
                </div>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">{t.idleDesc}</p>
              </div>

              {errorMessage && (
                <p className="text-xs font-bold text-red-500 bg-red-500/5 border border-red-500/10 p-3.5 rounded-xl">{errorMessage}</p>
              )}

              <button
                onClick={handleStartMatchmaking}
                className="w-full py-4 mt-6 bg-white border border-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-2xl hover:bg-transparent hover:text-white transition-all shadow-md active:scale-[0.99]"
              >
                {t.startFind}
              </button>
            </div>
          </div>
        )}

        {/* 🔍 상태 2. 대기열 레이더 (QUEUE LOOKUP STATE) */}
        {matchState === 'queue' && (
          <div className="max-w-md mx-auto w-full bg-zinc-950/30 border border-zinc-900 p-8 sm:p-10 rounded-[2rem] text-center space-y-6 flex flex-col items-center backdrop-blur-md shadow-2xl">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-black text-zinc-500 tracking-widest uppercase">{t.queueing}</p>
              <p className="text-4xl font-mono font-black text-white tracking-tighter tabular-nums">{formatQueueTime(queueSeconds)}</p>
            </div>
            <p className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-wider">{t.elapsed}</p>
            
            <button
              onClick={handleCancelMatchmaking}
              className="w-full py-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl text-[11px] font-mono font-black text-zinc-400 hover:text-red-500 hover:border-red-500/20 transition-all uppercase tracking-widest"
            >
              {t.cancelFind}
            </button>
          </div>
        )}

        {/* ⏳ 상태 3. 경기 매핑 동시 진입 (COUNTDOWN MATRIX) */}
        {matchState === 'countdown' && (
          <div className="h-[360px] flex flex-col items-center justify-center">
            <span className="text-[120px] font-mono font-black text-white tracking-tighter tabular-nums animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
              {countdownNum}
            </span>
            <span className="font-mono text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase mt-2">{t.matched}</span>
          </div>
        )}

        {/* ⚡ 상태 4. 인게임 아레나 (PLAYING HUD - 포인터 터치 완전 방어 스펙) */}
        {matchState === 'playing' && (
          <div 
            onPointerDown={handleGamePanelClick} 
            className={`h-[460px] rounded-[2rem] border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-75 relative overflow-hidden touch-none ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-[#030303] border-zinc-950' : localGameState === 'click' ? 'bg-white border-white' : 'bg-black border-zinc-950')
                : 'bg-[#020202] border-zinc-900 active:border-zinc-800'
            }`}
          >
            {/* 정밀 에임 가이드 격자 크로스헤어 오버레이 */}
            {localGameState !== 'click' && (
              <div className="absolute inset-0 border border-white/[0.005] m-10 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-2 h-[1px] bg-zinc-900" />
                <div className="w-[1px] h-2 bg-zinc-900 absolute" />
              </div>
            )}

            {ripple && <div className="absolute inset-0 bg-white/[0.015] pointer-events-none animate-ping" />}

            {gameType === 'reaction' ? (
              localGameState === 'ready' ? (
                <div className="space-y-1.5 pointer-events-none">
                  <p className="text-xl font-mono font-black text-zinc-500 tracking-[0.25em] uppercase">{t.holdTrigger}</p>
                </div>
              ) : localGameState === 'click' ? (
                <p className="text-5xl font-sans font-black text-black tracking-tighter uppercase pointer-events-none animate-pulse">{t.clickNow}</p>
              ) : localGameState === 'foul' ? (
                <div className="space-y-1 text-center pointer-events-none">
                  <p className="text-xs font-mono font-black text-red-500 tracking-widest uppercase">{t.foul}</p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{t.syncing}</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">{t.syncing}</p>
              )
            ) : (
              /* CPS 터치 패널 기판: 그라데이션 탈피 완전한 Stark White 텐션 */
              <div className="space-y-6 pointer-events-none w-full max-w-xs relative z-10">
                <p className="text-[100px] font-mono font-black text-white tracking-tighter leading-none tabular-nums animate-[scaleUp_0.1s_ease-out]">
                  {cpsClicks}
                </p>
                <div className="w-16 bg-zinc-900 h-[1px] mx-auto opacity-60">
                  <div className="bg-white h-full transition-all duration-100 mx-auto" style={{ width: `${Math.min(100, (cpsClicks / (totalOption * 7.2))) * 100}%` }} />
                </div>
                <div className="font-mono text-[9px] text-zinc-600 font-bold tracking-widest uppercase">
                  BURST SECONDS: <span className="text-white font-black tabular-nums">{cpsTimeLeft}S</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔄 상태 5. 중간 라운드 정산 보드 (ROUND OVERVIEW) */}
        {matchState === 'round_result' && (
          <div className="h-[450px] bg-zinc-950/20 border border-zinc-900 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-6 animate-[scaleUp_0.3s_ease-out] backdrop-blur-sm">
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.25em] block">// {t.roundFinish}</span>
              <h3 className="text-3xl font-mono font-black text-white tracking-tight uppercase">ROUND 0{currentRound} RESOLVED</h3>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 px-5 py-2.5 rounded-xl font-mono text-xs text-zinc-400 font-black tracking-widest uppercase shadow-sm">
              {getRoundGapText(currentRound)}
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm w-full font-mono text-left pt-2">
              <div className="bg-black border border-zinc-900 p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-zinc-600 block font-bold truncate uppercase">{hostPlayer?.displayName}</span>
                <span className="text-xl font-black text-white tabular-nums">{roundsData?.[currentRound]?.host === 9999 ? 'FOUL' : `${roundsData?.[currentRound]?.host}ms`}</span>
              </div>
              <div className="bg-black border border-zinc-900 p-4 rounded-xl shadow-inner">
                <span className="text-[9px] text-zinc-600 block font-bold truncate uppercase">{guestPlayer?.displayName}</span>
                <span className="text-xl font-black text-white tabular-nums">{roundsData?.[currentRound]?.guest === 9999 ? 'FOUL' : `${roundsData?.[currentRound]?.guest}ms`}</span>
              </div>
            </div>
          </div>
        )}

        {/* 🏆 상태 6. 최종 경쟁 스코어 리포트 및 가변 LP 변동 게이지 랙 (MATCH BREAKDOWN MATRIX) */}
        {matchState === 'result' && matchMetrics && currentTierObj && (
          <div className="bg-black border border-zinc-900 p-8 sm:p-12 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full relative overflow-hidden shadow-2xl animate-[scaleUp_0.3s_ease-out]">
            
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase block">// {t.matchFinish}</span>
              <h2 className="text-5xl font-mono font-black text-white tracking-tighter uppercase">
                {matchMetrics.state} 
              </h2>
            </div>

            {/* 📊 요구사항: 실시간 +20~30 LP 변동 레이블 및 격차 연산 분석 프레임 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-1">
              <div className="bg-zinc-950 border border-zinc-900 py-2.5 px-5 rounded-xl font-mono text-xs text-zinc-400 font-black tracking-widest uppercase">
                {matchMetrics.gap}
              </div>
              <div className={`border py-2.5 px-5 rounded-xl font-mono text-xs font-black tracking-widest uppercase ${lpChangeAmount >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-500'}`}>
                RATING: {lpChangeAmount >= 0 ? `+${lpChangeAmount}` : lpChangeAmount} LP
              </div>
            </div>

            {/* 📊 요구사항: 결과창 하단에 장착된 변동 후의 고성능 LP 진진척도 바 인디케이터 */}
            <div className="max-w-md mx-auto w-full bg-zinc-950 border border-zinc-900/60 rounded-2xl p-5 font-mono text-left space-y-3">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-black tracking-wider">
                <span>UPDATED TIER RECORD</span>
                <span className={`${currentTierObj.color} font-black`}>
                  {currentTierObj.name} {currentTierObj.division} ({currentTierObj.localLp} / 100 LP)
                </span>
              </div>
              <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden p-[1px]">
                <div 
                  className="bg-zinc-100 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  style={{ width: `${currentTierObj.localLp}%` }}
                />
              </div>
            </div>

            {/* 라운드별 상세 로깅 스탯 분석 테이블 */}
            {gameType === 'reaction' && (
              <div className="max-w-md mx-auto w-full bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden font-mono text-[11px] shadow-inner">
                <div className="grid grid-cols-3 bg-zinc-900/40 border-b border-zinc-900 text-zinc-600 font-black py-2.5 px-5 uppercase tracking-wider text-[9px]">
                  <div>{t.roundLabel}</div>
                  <div className="truncate">{hostPlayer?.displayName}</div>
                  <div className="truncate">{guestPlayer?.displayName}</div>
                </div>
                <div className="max-h-[140px] overflow-y-auto divide-y divide-zinc-900/50">
                  {Object.keys(roundsData).map((rKey) => {
                    const rNum = Number(rKey);
                    const rData = roundsData[rNum];
                    return (
                      <div key={rKey} className="grid grid-cols-3 py-2.5 px-5 items-center text-zinc-400 font-medium tracking-tight">
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
                className="w-full max-w-xs mx-auto py-3.5 bg-white border border-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl hover:bg-transparent hover:text-white transition-all shadow-lg active:scale-95"
              >
                {t.rematch}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 푸터 영역 */}
      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-700 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE RANKED METRICS v1.5</div>
        <div>SECURE LIVE SOCKET TRANSCEIVER LAYER</div>
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