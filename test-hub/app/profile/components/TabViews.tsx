import React from 'react';

export function InfoTab({ t, xp, nextXpNeeded, xpPercentage, activeTitle, myTier, reactionBest, cpsBest }: any) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-3">
        <div className="flex justify-between items-center font-mono text-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-zinc-400 font-bold tracking-wider mr-1">{t.xpTitle}</span>
            {activeTitle && activeTitle.xpBoost > 0 && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(16,185,129,0.2)]">TITLE +{activeTitle.xpBoost}%</span>}
            {myTier.xpBoost > 0 && <span className={`text-[9px] bg-zinc-900 border px-1.5 py-0.5 rounded shadow-sm ${myTier.color}`}>TIER +{myTier.xpBoost}%</span>}
          </div>
          <span className="text-zinc-200 font-black tracking-wide tabular-nums shrink-0 ml-2">{xp} <span className="text-zinc-600 font-normal">/</span> {nextXpNeeded} XP <span className="text-emerald-400 ml-1">({xpPercentage}%)</span></span>
        </div>
        <div className="w-full bg-zinc-900 h-2.5 rounded-full overflow-hidden p-[2px] border border-zinc-900 relative">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500" style={{ width: `${xpPercentage}%` }} />
        </div>
      </div>
      <div className="bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-4">
        <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-2 border-b border-zinc-900/50 uppercase">{t.statsTitle}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex justify-between items-center px-5 py-4 bg-[#050505] border border-zinc-900/60 rounded-xl font-mono">
            <div className="flex flex-col space-y-1"><span className="font-bold text-zinc-200 text-xs tracking-wider">{t.statReaction}</span><span className="text-[11px] text-zinc-500 font-medium leading-none">{t.statReactionDesc}</span></div>
            <span className="text-xl font-black text-white tabular-nums">{reactionBest > 0 ? `${reactionBest}ms` : '---'}</span>
          </div>
          <div className="flex justify-between items-center px-5 py-4 bg-[#050505] border border-zinc-900/60 rounded-xl font-mono">
            <div className="flex flex-col space-y-1"><span className="font-bold text-zinc-200 text-xs tracking-wider">{t.statCps}</span><span className="text-[11px] text-zinc-500 font-medium leading-none">{t.statCpsDesc}</span></div>
            <span className="text-xl font-black text-emerald-400 tabular-nums">{cpsBest > 0 ? `${cpsBest} CPS` : '---'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompTab({ t, isRankedUnlocked, myTier, rankedLp }: any) {
  if (!isRankedUnlocked) {
    return (
      <div className="animate-in fade-in duration-500 h-[200px] flex flex-col items-center justify-center bg-zinc-950/80 border border-zinc-900 rounded-2xl text-center px-4 space-y-3">
        <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-500"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
        <div className="text-sm font-black text-zinc-300 tracking-tight">{t.lockedCompMsg}</div>
      </div>
    );
  }
  return (
    <div className="animate-in fade-in duration-500 bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-4">
      <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-2 border-b border-zinc-900/50 uppercase">{t.tierTitle}</div>
      <div className="px-6 py-5 bg-[#050505] border border-zinc-900/60 rounded-xl font-mono flex flex-col space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className={`text-base font-black tracking-widest ${myTier.color}`}>{myTier.name} {myTier.division}</span>
          <span className="text-zinc-300 font-black tabular-nums">{myTier.name === 'MASTER' ? `${rankedLp} TOTAL LP` : `${myTier.localLp} / 100 LP`}</span>
        </div>
        {myTier.name !== 'MASTER' && <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden"><div className="bg-zinc-200 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${myTier.localLp}%` }} /></div>}
        {myTier.xpBoost > 0 && <div className="flex items-center gap-2 mt-2 pt-3 border-t border-zinc-900/50"><span className="text-[10px] font-mono text-zinc-500 font-bold">{t.tierBuffLabel}</span><span className={`text-[10px] font-mono font-black ${myTier.color}`}>XP +{myTier.xpBoost}%</span></div>}
      </div>
    </div>
  );
}

export function TitleTab({ t, titlesList, unlockedTitles, currentTitleId, handleEquipToggle }: any) {
  return (
    <div className="animate-in fade-in duration-500 bg-zinc-950/80 border border-zinc-900 p-6 rounded-2xl space-y-4">
      <div className="text-[11px] font-mono font-black text-zinc-400 tracking-wider pb-2 border-b border-zinc-900/50 uppercase">{t.collectionTitle}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {titlesList.map((title: any) => {
          const isUnlocked = unlockedTitles[title.id];
          const isEquipped = currentTitleId === title.id;
          return (
            <div key={title.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${isUnlocked ? 'bg-[#050505] border-zinc-900 hover:border-zinc-700/50' : 'bg-black border-zinc-950/50 opacity-20 select-none'}`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] sm:text-xs font-sans font-bold px-2.5 py-0.5 rounded border uppercase tracking-wide ${title.color}`}>{title.text}</span>
                  {isEquipped && <span className="text-[9px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{t.equipped}</span>}
                </div>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">{title.desc}</p>
                <div className="flex items-center gap-1.5 mt-1"><span className="text-[9px] font-mono text-zinc-600 font-bold">{t.buffLabel}</span><span className="text-[10px] font-mono text-emerald-400 font-bold">XP +{title.xpBoost}%</span></div>
              </div>
              {isUnlocked && <button onClick={() => handleEquipToggle(title.id)} className={`px-4 py-2 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${isEquipped ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-white hover:text-black'}`}>{isEquipped ? t.unequipBtn : t.equipBtn}</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}