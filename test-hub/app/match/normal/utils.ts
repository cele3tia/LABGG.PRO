export type MatchState = 'idle' | 'queue' | 'countdown' | 'playing' | 'round_result' | 'result';
export type GameType = 'reaction' | 'cps';

export interface PlayerInfo {
  uid: string;
  displayName: string;
  photoURL?: string;
  score?: number;
  level?: number;
  currentTitle?: string;
}

export interface RoundScore {
  host?: number;
  guest?: number;
}

export const formatQueueTime = (sec: number): string => {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const getRoundGapText = (roundNum: number, roundsData: Record<string, RoundScore>, gameType: GameType) => {
  const round = roundsData?.[roundNum];
  if (!round || round.host === undefined || round.guest === undefined) return '';
  if (round.host === 9999 || round.guest === 9999) return 'FOUL MATCH';
  const diff = Math.abs(round.host - round.guest);
  return gameType === 'reaction' ? `Δ ${diff}ms` : `Δ ${diff.toFixed(1)} CPS`;
};

export const getCalculatedWinner = (gameType: GameType, roundsData: Record<string, RoundScore>, isHost: boolean, t: any) => {
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

export const TRANSLATIONS = {
  ko: {
    back: '← 홈으로', nodeLabel: 'CASUAL MATCHMAKING CORE', idleTitle: '일반 교전 대기열 진입',
    idleDesc: 'MMR 레이팅에 영향을 주지 않으며, 전 세계 활성화된 유저와 무작위 1:1 피지컬 대전을 시작합니다.',
    startFind: 'MATCHMAKING SEARCH START', cancelFind: 'ABORT QUEUE SEQUENCE', queueing: 'SEARCHING FOR TARGET MATRIX...',
    elapsed: 'ELAPSED TIME', matched: 'TARGET CODES ALIGNED', holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE', foul: 'INVALID TRIGGER (FOUL)', syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE', matchFinish: 'MATCH LOG RESOLVED', rematch: 'RE-QUEUE SEQUENCE',
    victory: 'VICTORY SECURED', defeat: 'SYSTEM DEFEATED', draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY', roundLabel: 'ROUND', noTitle: '칭호 없음',
    errLogin: '대기열에 진입하려면 로그인이 필요합니다.'
  },
  en: {
    back: '← Back to Home', nodeLabel: 'CASUAL MATCHMAKING CORE', idleTitle: 'Enter Casual Queue',
    idleDesc: 'Does not affect ranked ratings. Instantly search and connect with worldwide active clickers for a 1v1 battle.',
    startFind: 'MATCHMAKING SEARCH START', cancelFind: 'ABORT QUEUE SEQUENCE', queueing: 'SEARCHING FOR TARGET MATRIX...',
    elapsed: 'ELAPSED TIME', matched: 'TARGET CODES ALIGNED', holdTrigger: 'STANDBY FOR SIGNAL...',
    clickNow: 'TARGET TRIGGER ACTIVE', foul: 'INVALID TRIGGER (FOUL)', syncing: 'CORRELATING REALTIME DATA...',
    roundFinish: 'ROUND COMPLETE', matchFinish: 'MATCH LOG RESOLVED', rematch: 'RE-QUEUE SEQUENCE',
    victory: 'VICTORY SECURED', defeat: 'SYSTEM DEFEATED', draw: 'STALEMATE DRAW',
    analytics: '// BATTLE ANALYTICS MATRIX SUMMARY', roundLabel: 'ROUND', noTitle: 'NO TITLE',
    errLogin: 'Authentication credentials required to join queue.'
  }
};