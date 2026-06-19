// app/profile/utils.ts

export const RANKED_UNLOCK_LEVEL = 15;
export const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

export const getNextXpForLevel = (lv: number): number => {
  return Math.floor(Math.pow(lv, 1.5) * 50) + 100;
};

export const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 border-amber-500/30'; 
  if (lv >= 30) return 'text-purple-400 border-purple-500/30'; 
  if (lv >= 20) return 'text-cyan-400 border-cyan-500/30';     
  if (lv >= 10) return 'text-emerald-400 border-emerald-500/30'; 
  return 'text-zinc-300 border-zinc-700'; 
};

export const getTierFromLp = (totalLp: number) => {
  if (totalLp < 0) totalLp = 0;
  
  const TIERS = [
    { name: 'IRON', xpBoost: 0, color: 'text-zinc-500 border-zinc-800 bg-zinc-500/5' },
    { name: 'BRONZE', xpBoost: 2, color: 'text-amber-700 border-amber-900 bg-amber-700/5' },
    { name: 'SILVER', xpBoost: 5, color: 'text-slate-300 border-slate-700 bg-slate-300/5' },
    { name: 'GOLD', xpBoost: 10, color: 'text-yellow-400 border-yellow-600/40 bg-yellow-400/5' },
    { name: 'PLATINUM', xpBoost: 15, color: 'text-emerald-400 border-emerald-600/40 bg-emerald-400/5' },
    { name: 'DIAMOND', xpBoost: 25, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-400/5' },
  ];

  if (totalLp >= 1800) {
    return { name: 'MASTER', division: '', localLp: totalLp - 1800, color: 'text-purple-400 border-purple-500/40 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.15)] font-black', xpBoost: 50 };
  }

  const tierIndex = Math.floor(totalLp / 300);
  const remainder = totalLp % 300;
  const divisionIndex = Math.floor(remainder / 100);
  const localLp = remainder % 100;
  const divisionMap = ['III', 'II', 'I'];
  
  return { name: TIERS[tierIndex].name, division: divisionMap[divisionIndex], localLp: localLp, color: TIERS[tierIndex].color, xpBoost: TIERS[tierIndex].xpBoost };
};

export const TRANSLATIONS = {
  ko: {
    back: '← 홈으로', loading: 'LOADING PHYSICAL PROFILE...', unauthorized: '프로필을 확인하려면 먼저 로그인해 주세요.', homeBtn: '홈으로 가기',
    lvl: 'LVL', rank: 'RANK', title: 'TITLE', editBtn: '닉네임 변경', logoutBtn: '로그아웃', saveBtn: '적용', cancelBtn: '취소', saving: '처리 중..',
    tab_info: '내 정보', tab_comp: '경쟁전', tab_title: '칭호', tab_friends: '친구',
    xpTitle: '레벨업 경험치 (Level Up XP)', statsTitle: 'HIGHEST METRICS', statReaction: 'VISUAL REACTION', statReactionDesc: '시각 반응 속도 최고 기록', statCps: 'CLICKS PER SECOND', statCpsDesc: '초당 클릭 속도 최고 기록',
    tierTitle: 'COMPETITIVE RANK RATING', lockedCompMsg: '경쟁전은 15레벨 달성 시 개방됩니다.', unranked: '언랭크',
    collectionTitle: 'AVAILABLE TITLES COLLECTION', equipped: '장착중', equipBtn: '장착', unequipBtn: '장착 해제', noTitle: '칭호 없음',
    title_dev: '개발자', desc_dev: 'LABGG 시스템 빌더 전용 마스터 칭호', title_ai: 'AI', desc_ai: '조건: 반속 150ms 이하 AND CPS 13 이상', title_godspeed: '전광석화', desc_godspeed: '조건: 반속 180ms 이하 OR CPS 10 이상', title_fast: '빠름', desc_fast: '조건: 반속 230ms 이하 OR CPS 7 이상', title_newbie: '뉴비', desc_newbie: '기본 지급되는 새내기 칭호',
    buffLabel: '패시브 능력:', tierBuffLabel: '티어 보너스:'
  },
  en: {
    back: '← Back to Home', loading: 'LOADING PHYSICAL PROFILE...', unauthorized: 'Please sign in first to view your profile.', homeBtn: 'Go to Home',
    lvl: 'LVL', rank: 'RANK', title: 'TITLE', editBtn: 'Edit Nickname', logoutBtn: 'Sign Out', saveBtn: 'Apply', cancelBtn: 'Cancel', saving: 'Processing...',
    tab_info: 'INFO', tab_comp: 'RANKED', tab_title: 'TITLES', tab_friends: 'FRIENDS',
    xpTitle: 'LEVEL UP XP', statsTitle: 'HIGHEST METRICS', statReaction: 'VISUAL REACTION', statReactionDesc: 'Personal best visual reaction time', statCps: 'CLICKS PER SECOND', statCpsDesc: 'Personal best clicks per second',
    tierTitle: 'COMPETITIVE RANK RATING', lockedCompMsg: 'Ranked mode unlocks at Level 15.', unranked: 'UNRANKED',
    collectionTitle: 'AVAILABLE TITLES COLLECTION', equipped: 'Equipped', equipBtn: 'Equip', unequipBtn: 'Unequip', noTitle: 'No Title',
    title_dev: 'Developer', desc_dev: 'Exclusive master title for LABGG core system builder', title_ai: 'AI', desc_ai: 'Req: Reaction ≤ 150ms AND CPS ≥ 13', title_godspeed: 'Lightning', desc_godspeed: 'Req: Reaction ≤ 180ms OR CPS ≥ 10', title_fast: 'Swift', desc_fast: 'Req: Reaction ≤ 230ms OR CPS ≥ 7', title_newbie: 'Newbie', desc_newbie: 'A fresh new starter title',
    buffLabel: 'Passive Buff:', tierBuffLabel: 'Tier Bonus:'
  }
};

export const getTitlesList = (t: any) => [
  { id: 'dev', text: t.title_dev, desc: t.desc_dev, xpBoost: 50, color: 'text-amber-400 border-amber-500/30' },
  { id: 'ai', text: t.title_ai, desc: t.desc_ai, xpBoost: 30, color: 'text-purple-400 border-purple-500/30' },
  { id: 'godspeed', text: t.title_godspeed, desc: t.desc_godspeed, xpBoost: 20, color: 'text-cyan-400 border-cyan-500/30' },
  { id: 'fast', text: t.title_fast, desc: t.desc_fast, xpBoost: 10, color: 'text-emerald-400 border-emerald-500/30' },
  { id: 'newbie', text: t.title_newbie, desc: t.desc_newbie, xpBoost: 5, color: 'text-zinc-300 border-zinc-700' }
];