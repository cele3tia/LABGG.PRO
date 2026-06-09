// 💡 레벨별 필요 경험치 공식 (10렙까지는 순삭, 이후 점진적 증가)
export const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

// 💡 플레이 기록에 따른 경험치 획득 공식
// 반응속도는 낮을수록(빠를수록), CPS는 높을수록(빠를수록) 보너스 XP 지급!
export const calculateEarnedXp = (gameType: 'reaction' | 'cps', score: number): number => {
  let baseXp = 30; // 기본 참가 점수
  
  if (gameType === 'reaction') {
    if (score <= 150) baseXp += 120;
    else if (score <= 180) baseXp += 80;
    else if (score <= 230) baseXp += 50;
    else if (score <= 300) baseXp += 20;
  } else if (gameType === 'cps') {
    baseXp += Math.floor(score * 8); // 10 CPS 면 80 XP 보너스
  }
  
  return baseXp;
};

// 💡 [요구사항] 10레벨 단위 뱃지 색상 테일윈드 클래스 반환 함수
export const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30'; // 40렙 이상: 신화 골드
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30'; // 30~39렙: 에픽 퍼플
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';     // 20~29렙: 레어 레디언트
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'; // 10~19렙: 고급 그린
  return 'text-zinc-400 bg-zinc-900 border-zinc-800'; // 1~9렙: 일반 회색
};