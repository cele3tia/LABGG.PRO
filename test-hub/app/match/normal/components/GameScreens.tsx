import React from 'react';
import { GameType, PlayerInfo, RoundScore, formatQueueTime, getRoundGapText, getCalculatedWinner } from '../utils';

// 💡 10레벨 단위 뱃지 색상 반환
const getLevelBadgeColor = (lv: number): string => {
  if (lv >= 40) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
  if (lv >= 30) return 'text-purple-400 border-purple-500/20 bg-purple-500/5';
  if (lv >= 20) return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
  if (lv >= 10) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  return 'text-zinc-500 border-zinc-800 bg-zinc-900/30';
};

/* =================================
   🎮 1. 대기 화면 (IDLE STATE)
   ================================= */
export const IdleScreen = ({ t, errorMessage, onStart }: any) => (
  <div className="max-w-xl mx-auto bg-zinc-950/40 border border-zinc-900 rounded-[2rem] p-8 sm:p-12 space-y-8 text-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
    {/* 은은한 탑 네온 그라데이션 광 효과 */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-zinc-800/10 blur-3xl pointer-events-none" />
    
    <div className="space-y-2.5 relative z-10">
      <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.25em] block uppercase">
        // CASUAL LOBBY INITIALIZER v1.2
      </span>
      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.idleTitle}</h2>
      <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-w-sm mx-auto">{t.idleDesc}</p>
    </div>

    {errorMessage && (
      <p className="text-xs font-mono font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl animate-pulse">
        {errorMessage}
      </p>
    )}

    {/* 버튼을 미니멀하고 시크한 하이테크 스타일로 리디자인 */}
    <button 
      onClick={onStart} 
      className="w-full py-4 bg-zinc-100 hover:bg-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.05)] active:scale-[0.99] relative z-10"
    >
      {t.startFind}
    </button>
  </div>
);

/* =================================
   ⏳ 2. 매칭 탐색 화면 (QUEUE STATE)
   ================================= */
export const QueueScreen = ({ t, queueSeconds, onCancel }: any) => (
  <div className="max-w-md mx-auto w-full bg-[#070709]/60 border border-zinc-900 p-8 sm:p-10 rounded-3xl text-center space-y-6 flex flex-col items-center shadow-2xl backdrop-blur-md">
    {/* 레이저 스캐닝 서클 인디케이터 */}
    <div className="relative w-12 h-12 flex items-center justify-center">
      <span className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" />
      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_15px_#34d399]" />
    </div>

    <div className="space-y-1.5">
      <p className="text-[10px] font-mono font-black text-zinc-500 tracking-[0.2em] uppercase">{t.queueing}</p>
      <p className="text-4xl font-mono font-black text-white tracking-tight tabular-nums">{formatQueueTime(queueSeconds)}</p>
    </div>
    
    <button 
      onClick={onCancel} 
      className="w-full py-3 bg-zinc-950 border border-zinc-800 text-[10px] font-mono font-black text-zinc-400 hover:text-red-400 hover:border-red-500/30 rounded-xl transition-all uppercase tracking-widest"
    >
      {t.cancelFind}
    </button>
  </div>
);

/* =================================
   ⚡ 3. 실제 플레이 화면 (PLAYING STATE)
   ================================= */
export const PlayingScreen = ({ t, gameType, localGameState, ripple, cpsClicks, cpsTimeLeft, totalOption, onPanelClick }: any) => (
  <div 
    onPointerDown={onPanelClick} 
    className={`h-[460px] rounded-[2rem] border flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none transition-all duration-150 relative overflow-hidden touch-none ${
      gameType === 'reaction' 
        ? (localGameState === 'ready' 
            ? 'bg-[#030304] border-zinc-900 shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]' 
            : localGameState === 'click' 
              ? 'bg-zinc-100 border-white shadow-[0_0_50px_rgba(255,255,255,0.2)]' 
              : 'bg-black border-zinc-950')
        : 'bg-[#030305] border-zinc-900 active:border-zinc-800'
    }`}
  >
    {/* 테크니컬 크로스헤어 조준선 가이드 내장 */}
    {localGameState !== 'click' && (
      <div className="absolute inset-0 m-12 border border-white/[0.02] rounded-2xl pointer-events-none flex items-center justify-center">
        <div className="w-3 h-[1px] bg-zinc-800" />
        <div className="w-[1px] h-3 bg-zinc-800 absolute" />
      </div>
    )}

    {ripple && <div className="absolute inset-0 bg-white/[0.02] pointer-events-none animate-pulse" />}

    {gameType === 'reaction' ? (
      localGameState === 'ready' ? (
        <p className="text-sm font-mono font-black text-zinc-600 tracking-[0.3em] uppercase pointer-events-none animate-pulse">{t.holdTrigger}</p>
      ) : localGameState === 'click' ? (
        <p className="text-5xl font-sans font-black text-black tracking-tighter uppercase pointer-events-none animate-[scaleUp_0.1s_ease-out]">{t.clickNow}</p>
      ) : localGameState === 'foul' ? (
        <div className="space-y-1 text-center pointer-events-none">
          <p className="text-sm font-mono font-black text-red-500 tracking-widest uppercase">{t.foul}</p>
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">{t.syncing}</p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">{t.syncing}</p>
      )
    ) : (
      <div className="space-y-6 pointer-events-none w-full max-w-xs relative z-10">
        <p className="text-8xl font-mono font-black text-white tracking-tighter leading-none tabular-nums animate-[scaleUp_0.1s_ease-out]">{cpsClicks}</p>
        
        {/* 미니멀 프로그레스 게이지 */}
        <div className="w-24 bg-zinc-900 h-[2px] mx-auto rounded-full overflow-hidden">
          <div className="bg-zinc-400 h-full transition-all duration-100 shadow-[0_0_8px_#fff]" style={{ width: `${Math.min(100, (cpsClicks / (totalOption * 8))) * 100}%` }} />
        </div>
        
        <div className="font-mono text-[9px] text-zinc-500 font-bold tracking-widest uppercase bg-zinc-950/60 border border-zinc-900 px-3 py-1.5 rounded-full inline-block mx-auto">
          BURST CLOCK: <span className="text-white font-black tabular-nums">{cpsTimeLeft}S</span>
        </div>
      </div>
    )}
  </div>
);

/* =================================
   🏆 4. 최종 스코어보드 결과 창 (MATCH RESULT STATE)
   ================================= */
export const ResultScreen = ({ t, gameType, roundsData, hostPlayer, guestPlayer, isHost, onRematch }: any) => {
  const winner = getCalculatedWinner(gameType, roundsData, isHost, t);
  
  return (
    <div className="bg-zinc-950/40 border border-zinc-900 p-8 sm:p-12 rounded-[2.5rem] space-y-8 text-center max-w-2xl mx-auto w-full shadow-2xl backdrop-blur-xl animate-[scaleUp_0.3s_ease-out] relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-zinc-800/5 blur-3xl pointer-events-none" />

      <div className="space-y-1.5 relative z-10">
        <span className="font-mono text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase block">// {t.matchFinish}</span>
        <h2 className={`text-4xl sm:text-5xl font-mono font-black tracking-tighter uppercase ${winner.amIWinner ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]' : 'text-zinc-500'}`}>
          {winner.state}
        </h2>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-900/60 py-2 px-5 rounded-lg inline-block font-mono text-[11px] text-zinc-400 font-bold tracking-widest uppercase relative z-10">
        {winner.gap}
      </div>
      
      {/* 라운드 매트릭스 로그 표 리디자인 (더 플랫하고 미니멀하게) */}
      {gameType === 'reaction' && (
        <div className="max-w-md mx-auto w-full bg-black/60 border border-zinc-900/80 rounded-2xl overflow-hidden font-mono text-[11px] relative z-10 shadow-inner">
          <div className="grid grid-cols-3 bg-zinc-950/80 border-b border-zinc-900 text-zinc-500 font-black py-2.5 px-4 uppercase tracking-wider text-[9px]">
            <div>{t.roundLabel}</div>
            <div className="truncate flex items-center justify-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${getLevelBadgeColor(hostPlayer?.level || 1)}`} />
              {hostPlayer?.displayName}
            </div>
            <div className="truncate flex items-center justify-center gap-1.5">
              <span className={`w-1 h-1 rounded-full ${getLevelBadgeColor(guestPlayer?.level || 1)}`} />
              {guestPlayer?.displayName}
            </div>
          </div>
          
          <div className="divide-y divide-zinc-900/50 max-h-[160px] overflow-y-auto no-scrollbar">
            {Object.keys(roundsData).map((rKey) => {
              const rData = roundsData[rKey as any];
              return (
                <div key={rKey} className="grid grid-cols-3 py-3 px-4 items-center text-zinc-400 font-medium tracking-tight hover:bg-zinc-950/20">
                  <div className="font-black text-zinc-600 text-[10px]">RD.0{rKey}</div>
                  <div className={rData?.host === 9999 ? 'text-red-500/80 font-bold' : 'tabular-nums text-zinc-300'}>{rData?.host === 9999 ? 'FOUL' : `${rData?.host}ms`}</div>
                  <div className={rData?.guest === 9999 ? 'text-red-500/80 font-bold' : 'tabular-nums text-zinc-300'}>{rData?.guest === 9999 ? 'FOUL' : `${rData?.guest}ms`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 relative z-10">
        <button 
          onClick={onRematch} 
          className="w-full max-w-xs mx-auto py-3.5 bg-zinc-100 hover:bg-white text-black text-xs font-mono font-black tracking-widest uppercase rounded-xl transition-all shadow-md active:scale-[0.99]"
        >
          {t.rematch}
        </button>
      </div>
    </div>
  );
};