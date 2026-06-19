import React from 'react';
import BorderGlow from '../../components/BorderGlow';
import { getLevelBadgeColor } from '../utils';

export default function ProfileHeader({ 
  user, displayName, setDisplayName, isEditing, setIsEditing, 
  saveLoading, handleSaveProfile, handleLogout, 
  level, myTier, activeTitle, canEditName, daysLeftToEdit, isDevUser, t, lang 
}: any) {
  return (
    <BorderGlow backgroundColor="#09090b" glowColor="277 100 65" colors={['#9e38ff', '#ff007f', '#42fcff']} borderRadius={24} className="w-full">
      <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 w-full sm:w-auto">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-zinc-800 p-1.5 bg-zinc-950 shrink-0 overflow-hidden relative z-10 shadow-xl">
            <img src={user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg'} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="text-center sm:text-left space-y-3 relative z-10 mt-1 sm:mt-0">
            <div className="space-y-1">
              {isEditing ? (
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={10} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1 text-xl font-black text-white focus:outline-none focus:border-[#9e38ff]" />
              ) : (
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{displayName}</h2>
              )}
              <p className="text-xs font-mono text-zinc-500 tracking-wide">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-950/50 shadow-sm ${getLevelBadgeColor(level)}`}>
                <span className="opacity-50 font-mono text-[9px] uppercase tracking-widest">{t.lvl}</span>
                <span className="font-sans font-black text-xs">{level}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-950/50 shadow-sm ${myTier.color}`}>
                <span className="opacity-50 font-mono text-[9px] uppercase tracking-widest">{t.rank}</span>
                <span className="font-sans font-black text-xs">{myTier.name} {myTier.division}</span>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-zinc-950/50 shadow-sm ${activeTitle ? activeTitle.color : 'text-zinc-400 border-zinc-800'}`}>
                <span className="opacity-50 font-mono text-[9px] uppercase tracking-widest">{t.title}</span>
                <span className="font-sans font-black text-xs">{activeTitle ? activeTitle.text : t.noTitle}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="shrink-0 w-full sm:w-auto flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-2 relative z-10 pt-2 sm:pt-0 border-t border-zinc-900 sm:border-t-0">
          {isEditing ? (
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleSaveProfile} disabled={saveLoading} className="flex-1 sm:flex-none px-4 py-2 bg-white text-black font-bold rounded-xl text-xs hover:bg-zinc-200 transition-all">{saveLoading ? t.saving : t.saveBtn}</button>
              <button onClick={() => { setIsEditing(false); setDisplayName(user.displayName || 'Player'); }} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl text-xs hover:text-white transition-all">{t.cancelBtn}</button>
            </div>
          ) : (
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              {(canEditName || isDevUser) ? (
                <button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white font-bold rounded-xl text-xs hover:border-zinc-600 transition-all">{t.editBtn}</button>
              ) : (
                <button disabled className="flex-1 sm:flex-none px-4 py-2 bg-zinc-950/50 border border-zinc-900 text-zinc-600 font-bold rounded-xl text-[10px] cursor-not-allowed">
                  {lang === 'ko' ? `변경 대기 (D-${daysLeftToEdit})` : `WAIT (D-${daysLeftToEdit})`}
                </button>
              )}
              <button onClick={handleLogout} className="flex-1 sm:flex-none px-4 py-2 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-950/10 font-bold rounded-xl text-xs transition-all">{t.logoutBtn}</button>
            </div>
          )}
        </div>
      </div>
    </BorderGlow>
  );
}