'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, database, db } from '../../../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, onValue, update, set } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';

type RoomStatus = 'waiting' | 'countdown' | 'playing' | 'round_result' | 'result';
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

interface RoundScore {
  host?: number;
  guest?: number;
}

const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/5 border-amber-500/20';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/5 border-purple-500/20';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/5 border-cyan-500/20';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20';
  return 'text-zinc-500 bg-zinc-950 border-zinc-900';
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
    quit: 'QUIT MATCH',
    roomNode: 'CORE LOBBY NODE',
    hostNode: '// PLATFORM HOST',
    guestNode: '// OPPONENT CHALLENGER',
    awaiting: 'AWAITING CONNECTION CYCLE...',
    launch: 'LAUNCH MATCH MATRIX',
    notReady: 'OPPONENT NOT READY',
    cancelReady: 'CANCEL READY STATE',
    setReady: 'ENGAGE READY STATE',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'REINITIATE MATCH SEQUENCE',
    awaitHost: 'AWAITING HOST OPERATION',
    copied: 'COPIED',
    copy: 'COPY',
    victory: 'VICTORY SECURED',
    defeat: 'SYSTEM DEFEATED',
    draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY',
    roundLabel: 'ROUND',
    noTitle: '칭호 없음'
  },
  en: {
    quit: 'QUIT MATCH',
    roomNode: 'CORE LOBBY NODE',
    hostNode: '// PLATFORM HOST',
    guestNode: '// OPPONENT CHALLENGER',
    awaiting: 'AWAITING CONNECTION CYCLE...',
    launch: 'LAUNCH MATCH MATRIX',
    notReady: 'OPPONENT NOT READY',
    cancelReady: 'CANCEL READY STATE',
    setReady: 'ENGAGE READY STATE',
    holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE',
    foul: 'INVALID TRIGGER (FOUL)',
    syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE',
    matchFinish: 'MATCH LOG RESOLVED',
    rematch: 'REINITIATE MATCH SEQUENCE',
    awaitHost: 'AWAITING HOST OPERATION',
    copied: 'COPIED',
    copy: 'COPY',
    victory: 'VICTORY SECURED',
    defeat: 'SYSTEM DEFEATED',
    draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY',
    roundLabel: 'ROUND',
    noTitle: 'NO TITLE'
  }
};

export default function CustomRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.roomId as string;

  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const [user, setUser] = useState<User | null>(null);

  // 실시간 연동 방 정보 콘텍스트
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('waiting');
  const [gameType, setGameType] = useState<GameType>('reaction');
  const [totalOption, setTotalOption] = useState<number>(3);
  const [hostPlayer, setHostPlayer] = useState<PlayerInfo | null>(null);
  const [guestPlayer, setGuestPlayer] = useState<PlayerInfo | null>(null);
  
  // 🔄 [핵심 고도화] 라운드 연속성 처리를 위한 데이터 트리 아키텍처
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundsData, setRoundsData] = useState<Record<string, RoundScore>>({});

  // 모바일 0ms 반응 및 펄스 이펙트 핸들링 상태 변수
  const [localGameState, setLocalGameState] = useState<'idle' | 'ready' | 'click' | 'foul' | 'finished'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [cpsClicks, setCpsClicks] = useState<number>(0);
  const [cpsTimeLeft, setCpsTimeLeft] = useState<number>(5);
  const [reactionStartTime, setReactionStartTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [ripple, setRipple] = useState<boolean>(false);

  const reactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cpsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const roundTransitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHost = user && hostPlayer && user.uid === hostPlayer.uid;

  const t = TRANSLATIONS[lang];

  // 파이어베이스 인증 및 룸 소켓 구독 파이프라인
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
      setCurrentRound(data.currentRound || 1);
      setRoundsData(data.rounds || {});
      setHostPlayer(data.players.host || null);
      setGuestPlayer(data.players.guest || null);

      // 📡 [실시간 라운드 판정 코어 가동] 
      // 현재 라운드에서 양쪽 유저의 데이터 연산 기록이 모두 동기화 완료되었는지 체크
      if (data.status === 'playing') {
        const cRound = data.currentRound || 1;
        const currentRoundScores = data.rounds?.[cRound];
        
        if (currentRoundScores && currentRoundScores.host !== undefined && currentRoundScores.guest !== undefined) {
          if (isHost) {
            // 호스트 측 브라우저가 마스터 노드가 되어 다음 스테이지 시퀀스를 RTDB에 브로드캐스팅
            setTimeout(() => {
              if (cRound >= data.settings.totalOption || data.settings.gameType === 'cps') {
                update(ref(database, `rooms/${roomId}`), { status: 'result' });
              } else {
                update(ref(database, `rooms/${roomId}`), { status: 'round_result' });
              }
            }, 1000);
          }
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRoom();
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
      if (cpsIntervalRef.current) clearInterval(cpsIntervalRef.current);
      if (roundTransitionTimeoutRef.current) clearTimeout(roundTransitionTimeoutRef.current);
    };
  }, [roomId, isHost]);

  // Firestore 데이터 로컬 RTDB 노드로 강제 바인딩
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

  // 방 상태 트리거 감지 시스템
  useEffect(() => {
    if (roomStatus === 'countdown') {
      runCountdown();
    } else if (roomStatus === 'playing') {
      startActualLocalGame();
    } else if (roomStatus === 'round_result') {
      // 🔄 라운드가 남았을 때 중간 정산 뷰 표출 후 2.5초 뒤 자동 다음 라운드 세션 컴파일
      if (isHost) {
        roundTransitionTimeoutRef.current = setTimeout(() => {
          update(ref(database, `rooms/${roomId}`), {
            status: 'countdown',
            currentRound: currentRound + 1
          });
        }, 2800);
      }
    }
  }, [roomStatus]);

  const runCountdown = () => {
    setCountdownNum(3);
    setLocalGameState('idle');
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
      const randomDelay = Math.floor(Math.random() * 2600) + 1800; // dialed.gg 스펙 가변 딜레이
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

  // ⚡ [모바일 완전 패치] PointerDown 터치 인터셉트 마스터 로직
  const handleGamePanelClick = (e: React.PointerEvent) => {
    e.preventDefault();
    if (roomStatus !== 'playing') return;

    // 미니멀 클릭 타격감 피드백 트리거
    setRipple(true);
    setTimeout(() => setRipple(false), 150);

    if (gameType === 'reaction') {
      if (localGameState === 'ready') {
        if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
        setLocalGameState('foul');
        submitRoundScore(9999); // 부정출발 시 영구적 패널티 프레임 고정
      } else if (localGameState === 'click') {
        const score = Math.round(performance.now() - reactionStartTime);
        setLocalGameState('finished');
        submitRoundScore(score);
      }
    } else if (gameType === 'cps' && localGameState === 'click') {
      setCpsClicks((prev) => prev + 1);
    }
  };

  // CPS 타임아웃 종료 스트림 처리
  useEffect(() => {
    if (gameType === 'cps' && localGameState === 'finished' && cpsClicks > 0) {
      const finalCps = parseFloat((cpsClicks / totalOption).toFixed(1));
      submitRoundScore(finalCps);
    }
  }, [localGameState]);

  // 📝 실시간 데이터베이스 라운드 전용 트리 노드에 개별 적재
  const submitRoundScore = async (score: number) => {
    const playerType = isHost ? 'host' : 'guest';
    const roundScoreRef = ref(database, `rooms/${roomId}/rounds/${currentRound}/${playerType}`);
    await set(roundScoreRef, score);
  };

  const handleActionButton = async () => {
    if (!user) return;
    if (isHost) {
      if (hostPlayer?.isReady && guestPlayer?.isReady) {
        // 게임 완전 초기화 바인딩 후 개설 시작
        await set(ref(database, `rooms/${roomId}/rounds`), null);
        await update(ref(database, `rooms/${roomId}`), { 
          status: 'countdown',
          currentRound: 1
        });
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

  // 📊 [dialed.gg 룩업] 명품 계량화 데이터 가공 유틸리티 엔진
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
      // 반응속도 멀티 라운드 평균 스코어 집계 연산
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
      
      {/* 초미니멀 고해상도 백그라운드 매트릭스 라인 스킨 */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      
      {/* 상단 레이아웃 기지 */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex justify-between items-center border-b border-zinc-900 pb-5">
        <button onClick={handleLeaveRoom} className="px-4 py-1.5 rounded-lg bg-transparent border border-zinc-900 text-[11px] font-mono font-black text-zinc-500 hover:text-white hover:border-zinc-700 transition-all">
          {t.quit}
        </button>
        
        {/* 인게임 실시간 현황 모니터 노드 칩 */}
        {roomStatus === 'playing' && (
          <div className="flex items-center bg-zinc-950 border border-zinc-900 px-4 py-1.5 rounded-lg font-mono text-[10px] font-bold text-zinc-500 tracking-wider">
            <span>{hostPlayer?.displayName}</span>
            <span className="mx-3 text-zinc-800">VS</span>
            <span>{guestPlayer?.displayName}</span>
            {gameType === 'reaction' && <span className="ml-4 text-purple-400 font-black">RD.{currentRound}</span>}
          </div>
        )}

        <div className="flex items-center gap-3 font-mono text-xs">
          <button 
            onClick={handleCopyCode}
            className="group/copy relative text-purple-500 font-black tracking-[0.1em] bg-purple-500/[0.02] px-3.5 py-1.5 border border-purple-500/10 rounded-lg text-xs hover:border-purple-500/30 transition-all flex items-center gap-2"
          >
            <span className="text-zinc-400 font-bold">CODE:</span>
            <span className="text-purple-400 font-black">{roomId}</span>
            <span className="text-[9px] font-sans font-black bg-purple-500/10 px-1 py-0.5 rounded text-purple-300">
              {copied ? t.copied : t.copy}
            </span>
          </button>
        </div>
      </div>

      {/* 메인 무대 스테이지 전개 세션 */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center my-6 relative z-10">
        
        {/* 🟢 대기실 화면 스킨 (Lobby Module) */}
        {roomStatus === 'waiting' && (
          <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 md:gap-0">
              
              {/* 호스트 커넥터 */}
              <div className="md:col-span-3 bg-zinc-950/20 border border-zinc-900/60 rounded-3xl p-8 flex flex-col items-center gap-4 relative">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">{t.hostNode}</div>
                <div className="w-14 h-16 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-0.5">
                  <img src={hostPlayer?.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Host" className="w-full h-full object-cover rounded-lg" />
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-black text-zinc-100 tracking-tight">{hostPlayer?.displayName}</p>
                    <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(hostPlayer?.level || 1)}`}>
                      LV.{hostPlayer?.level || 1}
                    </span>
                  </div>
                  {hostPlayer?.currentTitle ? (
                    <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded border uppercase tracking-wider block ${TITLE_COLORS[hostPlayer.currentTitle] || 'text-zinc-500'}`}>
                      {TITLE_MAP[lang][hostPlayer.currentTitle]}
                    </span>
                  ) : (
                    <span className="text-[9px] font-sans font-medium text-zinc-700 tracking-wide uppercase block">{t.noTitle}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-black px-2.5 py-1 bg-purple-500/5 border border-purple-500/10 text-purple-400 rounded-md tracking-wider uppercase">READY</span>
              </div>

              <div className="md:col-span-1 flex flex-col justify-center items-center font-mono text-zinc-800 font-black italic text-sm">VS</div>

              {/* 게스트 커넥터 */}
              <div className="md:col-span-3 bg-zinc-950/20 border border-zinc-900/60 rounded-3xl p-8 flex flex-col items-center gap-4 relative transition-all">
                <div className="absolute top-4 left-5 font-mono text-[9px] font-black text-zinc-600 tracking-widest uppercase">{t.guestNode}</div>
                {guestPlayer ? (
                  <>
                    <div className="w-14 h-16 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-0.5">
                      <img src={guestPlayer.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Guest" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className="text-center space-y-1">
                      <div className="flex items-center justify-center gap-2">
                        <p className="text-sm font-black text-zinc-100 tracking-tight">{guestPlayer.displayName}</p>
                        <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded border leading-none ${getLevelBadgeColor(guestPlayer.level || 1)}`}>
                          LV.{guestPlayer.level || 1}
                        </span>
                      </div>
                      {guestPlayer.currentTitle ? (
                        <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded border uppercase tracking-wider block ${TITLE_COLORS[guestPlayer.currentTitle] || 'text-zinc-400'}`}>
                          {TITLE_MAP[lang][guestPlayer.currentTitle]}
                        </span>
                      ) : (
                        <span className="text-[9px] font-sans font-medium text-zinc-700 tracking-wide uppercase block">{t.noTitle}</span>
                      )}
                    </div>
                    <span className={`text-[9px] font-mono font-black px-2.5 py-1 rounded-md tracking-wider uppercase border transition-all ${guestPlayer.isReady ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-600'}`}>
                      {guestPlayer.isReady ? 'READY' : 'WAITING'}
                    </span>
                  </>
                ) : (
                  <div className="h-36 flex items-center justify-center w-full">
                    <p className="text-[9px] font-mono font-black text-zinc-800 tracking-widest uppercase animate-pulse">{t.awaiting}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="max-w-xs mx-auto w-full pt-4">
              <button
                onClick={handleActionButton}
                disabled={!guestPlayer}
                className={`w-full py-3.5 rounded-xl text-[11px] font-mono font-black tracking-widest uppercase transition-all border ${
                  isHost 
                    ? (hostPlayer?.isReady && guestPlayer?.isReady ? 'bg-white border-white text-black hover:bg-transparent hover:text-white' : 'bg-transparent text-zinc-700 border-zinc-900 cursor-not-allowed')
                    : (guestPlayer?.isReady ? 'bg-zinc-950 border-zinc-800 text-zinc-400' : 'bg-white border-white text-black hover:bg-transparent hover:text-white')
                }`}
              >
                {isHost ? (hostPlayer?.isReady && guestPlayer?.isReady ? t.launch : t.notReady) : (guestPlayer?.isReady ? t.cancelReady : t.setReady)}
              </button>
            </div>
          </div>
        )}

        {/* ⏳ 카운트다운 진입 국면 */}
        {roomStatus === 'countdown' && (
          <div className="h-[360px] flex flex-col items-center justify-center">
            <span className="text-[120px] font-mono font-black text-white tracking-tighter tabular-nums select-none animate-[scaleUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
              {countdownNum}
            </span>
            {gameType === 'reaction' && (
              <span className="font-mono text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase mt-2">
                // PROCESSING ROUND FRAME {currentRound} OF {totalOption}
              </span>
            )}
          </div>
        )}

        {/* ⚡ 2. 인게임 전술 패널 가동 세션 (dialed.gg 모노크롬 하드코어 스타일링) */}
        {roomStatus === 'playing' && (
          <div 
            onPointerDown={handleGamePanelClick} 
            className={`h-[460px] rounded-3xl border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-75 relative overflow-hidden touch-none ${
              gameType === 'reaction' 
                ? (localGameState === 'ready' ? 'bg-[#030303] border-zinc-900' : localGameState === 'click' ? 'bg-white border-white' : 'bg-black border-zinc-950')
                : 'bg-[#020202] border-zinc-900 active:border-zinc-700'
            }`}
          >
            {/* 정밀 에임 가이드 십자선 오버레이 (짜침 완전 제거) */}
            {localGameState !== 'click' && (
              <div className="absolute inset-0 border border-white/[0.006] m-10 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-2 h-[1px] bg-zinc-900" />
                <div className="w-[1px] h-2 bg-zinc-900 absolute" />
              </div>
            )}

            {/* 터치 리플 이펙트 구조 인젝션 */}
            {ripple && <div className="absolute inset-0 bg-white/[0.015] pointer-events-none animate-ping" />}

            {gameType === 'reaction' ? (
              localGameState === 'ready' ? (
                <div className="space-y-1 pointer-events-none">
                  <p className="text-xl font-mono font-black text-zinc-400 tracking-[0.2em] uppercase">{t.holdTrigger}</p>
                </div>
              ) : localGameState === 'click' ? (
                <p className="text-6xl font-sans font-black text-black tracking-tighter uppercase select-none pointer-events-none animate-[pulse_0.1s_infinite]">
                  {t.clickNow}
                </p>
              ) : localGameState === 'foul' ? (
                <div className="space-y-1 text-center pointer-events-none">
                  <p className="text-xs font-mono font-black text-red-500 tracking-widest uppercase">{t.foul}</p>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase">{t.syncing}</p>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">{t.syncing}</p>
              )
            ) : (
              /* CPS 무대 계기판: 파란 그라데이션 완전 몰수하고 순수 Stark White 디지털 텐션 가설 */
              <div className="space-y-6 pointer-events-none w-full max-w-xs relative z-10">
                <p className="text-[100px] font-mono font-black text-white tracking-tighter leading-none tabular-nums select-none animate-[scaleUp_0.1s_ease-out]">
                  {cpsClicks}
                </p>
                <div className="w-16 bg-zinc-900 h-[1px] mx-auto overflow-hidden relative opacity-60">
                  <div className="bg-white h-full transition-all duration-100 mx-auto" style={{ width: `${Math.min(100, (cpsClicks / (totalOption * 7.2))) * 100}%` }} />
                </div>
                <div className="font-mono text-[9px] text-zinc-600 font-bold tracking-widest uppercase">
                  BURST CLOCK: <span className="text-white font-black tabular-nums">{cpsTimeLeft}S</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔄 3. [NEW] 라운드 중간 결과 화면 (중간 정산 뷰 컴포넌트 레이어) */}
        {roomStatus === 'round_result' && (
          <div className="h-[450px] bg-zinc-950/20 border border-zinc-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-6 animate-[scaleUp_0.3s_ease-out]">
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] font-black text-purple-500 tracking-[0.25em] uppercase block">// {t.roundFinish}</span>
              <h3 className="text-3xl font-mono font-black text-white tracking-tight uppercase">ROUND 0{currentRound} RESOLVED</h3>
            </div>

            {/* 라운드 스코어 편차 격차 출력 기지 */}
            <div className="bg-zinc-900/40 border border-zinc-900 px-5 py-2.5 rounded-xl font-mono text-xs text-zinc-400 font-black tracking-widest uppercase">
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

            <div className="text-[9px] font-mono text-zinc-600 tracking-wider animate-pulse pt-4 uppercase">// PREPARING NEXT MATRIX FRAME...</div>
          </div>
        )}

        {/* 🏆 4. 최종 게임 연산 종료 리포트 (시즌 매치 로그 분석 뷰) */}
        {roomStatus === 'result' && (
          <div className="bg-black border border-zinc-900 p-8 sm:p-10 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full relative overflow-hidden shadow-2xl animate-[scaleUp_0.3s_ease-out]">
            
            <div className="space-y-1">
              <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase block">// {t.matchFinish}</span>
              <h2 className={`text-4xl font-mono font-black tracking-tighter uppercase ${getCalculatedWinner().amIWinner ? 'text-white' : 'text-zinc-500'}`}>
                {getCalculatedWinner().state}
              </h2>
            </div>

            {/* 정밀 격차 분석 라인 보드 */}
            <div className="bg-zinc-950 border border-zinc-900 py-2.5 px-6 rounded-xl inline-block font-mono text-xs text-zinc-300 font-black tracking-widest uppercase">
              {getCalculatedWinner().gap}
            </div>

            {/* 📊 [NEW] 라운드별 상세 상세 정보 테이블 어레이 (짜침 완전 제로화 구조 설계) */}
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
                onClick={async () => {
                  if (isHost) {
                    // 호스트가 리매치 세션 누를 시 라운드 로그 데이터 싹 비워내고 웨이팅 룸 마이그레이션 실행
                    await set(ref(database, `rooms/${roomId}/rounds`), null);
                    await update(ref(database, `rooms/${roomId}/players/host`), { score: null });
                    if (guestPlayer) await update(ref(database, `rooms/${roomId}/players/guest`), { score: null, isReady: false });
                    await update(ref(database, `rooms/${roomId}`), { status: 'waiting', currentRound: 1 });
                  }
                }}
                className={`w-full max-w-xs mx-auto py-3.5 rounded-xl text-xs font-mono font-black tracking-widest uppercase transition-all border ${
                  isHost 
                    ? 'bg-white border-white text-black hover:bg-transparent hover:text-white' 
                    : 'bg-transparent border-zinc-900 text-zinc-700 cursor-not-allowed'
                }`}
              >
                {isHost ? t.rematch : t.awaitHost}
              </button>
            </div>
          </div>
        )}

      </div>

      <div className="w-full max-w-5xl mx-auto border-t border-zinc-900/60 pt-5 font-mono text-[9px] text-zinc-600 flex justify-between items-center uppercase tracking-wider relative z-10">
        <div>LABGG LIVE ROOM METRICS v1.2</div>
        <div>REALTIME DISPATCH ENGINE SECURITY LOCK</div>
      </div>

      {/* dialed.gg 미학 구현 전용 글로벌 키프레임 주입 */}
      <style jsx global>{`
        @keyframes scaleUp {
          from { transform: scale(0.97); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

    </div>
  );
}