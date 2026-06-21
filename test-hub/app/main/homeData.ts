// app/main/homeData.ts

export const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (lv >= 30) return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
  if (lv >= 20) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (lv >= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  return 'text-zinc-400 bg-zinc-900 border-zinc-800';
};

export const TRANSLATIONS: Record<string, any> = {
  ko: {
    title1: '당신의 피지컬을', title2: '숫자로 증명하세요.', desc: '전 세계 플레이어들과 실시간으로 순위를 경쟁해 보세요.',
    global: '글로벌', proceed: '테스트 시작 →', standard: '평균 기준', myBest: '나의 최고 기록',
    loginBtn: '로그인', profileBtn: '프로필 보기', lvl: 'Lv.',
    multiplayerTitle: '멀티플레이어', singleplayerTitle: '싱글플레이어', multiplayerBadge: '핵심 전장',
    terms: '이용약관', privacy: '개인정보처리방침',
    modes: {
      normal: { name: '일반 매칭 (Casual Match)', desc: '레이팅 부담 없이 다른 유저들과 가볍게 피지컬 매치 진행' },
      ranked: { name: '경쟁 레이팅 (Ranked Match)', desc: '공식 티어와 랭킹 점수가 반영되는 하드코어 진검승부' },
      custom: { name: '커스텀 매치 (Custom Lobby)', desc: '고유 코드를 생성하여 친구와 1:1 비공개 대전을 개설합니다' }
    },
    tests: {
      reaction: { name: 'Visual Reaction Test', label: 'VISUAL REACTION', desc: '화면의 색상이 변하는 찰나의 순간을 포착하여 당신의 반사 신경을 정밀하게 측정합니다.', stat: '200ms ~ 250ms' },
      cps: { name: 'Clicks Per Second', label: 'CLICK PER SECOND', desc: '제한 시간 동안 마우스를 얼마나 빠르게 연타할 수 있는지 피지컬 한계를 측정합니다.', stat: '6.0 ~ 7.0 CPS' },
      precision: { name: 'Perfect Release Test', label: 'PERFECT RELEASE', desc: '게이지를 모으다 목표 시간에 도달하는 찰나의 순간 손을 떼어 감각의 정밀도를 측정합니다.', stat: '± 0.030s ~ 0.050s' }
    }
  },
  en: {
    title1: 'PROVE YOUR PHYSICAL', title2: 'LIMITS WITH NUMBERS.', desc: 'Compete for rankings with players worldwide in real-time.',
    global: 'GLOBAL', proceed: 'PROCEED TEST →', standard: 'Average Bench', myBest: 'MY BEST SCORE',
    loginBtn: 'SIGN IN', profileBtn: 'MY PROFILE', lvl: 'Lv.',
    multiplayerTitle: 'MULTIPLAYER', singleplayerTitle: 'SINGLEPLAYER', multiplayerBadge: 'CORE ARENA',
    terms: 'Terms of Service', privacy: 'Privacy Policy',
    modes: {
      normal: { name: 'Casual Match', desc: 'Lightweight physical match against other clickers without rating risks.' },
      ranked: { name: 'Ranked Match', desc: 'Hardcore competition that directly affects your global rank and MMR rating.' },
      custom: { name: 'Custom Lobby', desc: 'Generate a unique server code to set up a private 1v1 battle with friends.' }
    },
    tests: {
      reaction: { name: 'Visual Reaction Test', label: 'VISUAL REACTION', desc: 'Measures how fast you react the exact moment the screen changes color.', stat: '200ms to 250ms' },
      cps: { name: 'Clicks Per Second', label: 'CLICK PER SECOND', desc: 'Measures your maximum clicking frequency within a specific time limit.', stat: '6.0 to 7.0 CPS' },
      precision: { name: 'Perfect Release Test', label: 'PERFECT RELEASE', desc: 'Charge the gauge and release at the exact target time to measure your sensory precision.', stat: '± 0.030s to 0.050s' }
    }
  }
};

export const themeStyles = {
  bg: 'bg-[#000000] text-[#e4e4e7]',
  nav: 'bg-[#000000] border-zinc-900',
  logoText: 'text-white',
  profileBox: 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700',
  profileName: 'text-zinc-200',
  liveCounter: 'bg-emerald-950/10 border-emerald-950',
  title1: 'text-white',
  title2: 'text-zinc-500 group-hover/title:text-zinc-400', 
  desc: 'text-zinc-400',
  textDesc: 'text-zinc-400',
  sectionTitle: 'text-zinc-600',
  sliderCard: 'bg-[#0c0c0e]/80 border border-zinc-800/80 hover:border-zinc-700',
  sliderTitle: 'text-white',
  sliderMutedText: 'text-zinc-500 sm:border-zinc-900',
  sliderIndicatorIdle: 'bg-zinc-800',
  sliderArrow: 'bg-zinc-950 border-zinc-900 text-zinc-400 hover:text-white',
  leaderboardBg: 'bg-[#08080a] border-zinc-900',
  gridLine: 'linear-gradient(to right, rgba(39,39,42,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(39,39,42,0.15) 1px, transparent 1px)',
  footerBorder: 'border-zinc-900 text-zinc-600'
};