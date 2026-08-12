"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";

// 🚀 휠 컴포넌트 영원히 안녕! (import 삭제)

import { 
  Trophy, Target, ArrowRight, ArrowLeft, ExternalLink, 
  Play, Lock, Medal, Volume2, VolumeX, Crown, 
  ShieldAlert, CheckCircle, Trash2, ChevronRight
} from "lucide-react";
import { challenges } from "@/app/lib/challenges";
import { useLanguage } from "./components/providers";
import { translations } from "@/app/lib/translations"; 

import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/app/lib/firebase"; 

// 테마 CSS 변수
const c = { 
  bg: "var(--c-bg)", panelBright: "var(--c-panel-bright)", panelMuted: "var(--c-panel-muted)", 
  border: "var(--c-border)", accent: "var(--c-accent)", accentDim: "var(--c-accent-dim)", 
  text1: "var(--c-text1)", text2: "var(--c-text2)", text3: "var(--c-text3)", 
  gold: "#FFD700", silver: "#C0C0C0", bronze: "#CD7F32" 
};

// 종목 매핑
const gameConfig: Record<string, { category: string; unit: string }> = {
  cps: { category: "MOUSE CLICKING", unit: "CPS" },
  alphabet: { category: "KEYBOARD TYPING", unit: "SEC" },
  typing: { category: "KEYBOARD TYPING", unit: "WPM" },
  reaction: { category: "REACTION TIME", unit: "MS" },
  spacebar: { category: "KEYBOARD TYPING", unit: "CPS" },
  aim: { category: "AIM TRACKING", unit: "%" },
  "number-typing": { category: "KEYBOARD TYPING", unit: "SEC" },
  "number-memory": { category: "MEMORY TEST", unit: "DIGITS" },
  chimp: { category: "MEMORY TEST", unit: "LVL" },
  visual: { category: "MEMORY TEST", unit: "LVL" },
  math: { category: "COGNITIVE TEST", unit: "Q/MIN" },
  scroll: { category: "MOUSE SKILL", unit: "M/S" },
  default: { category: "SKILL TEST", unit: "PTS" }
};

const challengeDetails: Record<string, { desc: { en: string; ko: string } }> = { 
  cps: { desc: { en: "Click as many times as possible within 60 seconds.", ko: "60초 동안 최대한 많이 클릭하세요." } }, 
  default: { desc: { en: "Test your skills and push your limits.", ko: "기술을 테스트하고 한계를 뛰어넘으세요." } } 
};

const getEmbedUrl = (url: string) => { 
  if (!url || url === "#") return ""; 
  let videoId = ""; 
  if (url.includes("shorts/")) videoId = url.split("shorts/")[1].split("?")[0]; 
  else if (url.includes("watch?v=")) videoId = url.split("watch?v=")[1].split("&")[0]; 
  else if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1].split("?")[0]; 
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1`; 
};

const splitRecord = (record: string) => { 
  const parts = record.split(" "); 
  return { val: parts[0], unit: parts.slice(1).join(" ") }; 
};

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "leehyeon110919@gmail.com";
interface RecordData { id: string; uid: string; displayName: string; score: number; isVerified: boolean; timestamp: any; }

export default function HomePage() {
  const router = useRouter(); 
  const context = useLanguage() as any; 
  const user = context.user;
  
  const currentLang = context.language || context.lang || context.locale || "en";
  const lang = currentLang.includes("ko") ? "ko" : "en"; 
  const t = translations[lang]; 
  const isAdmin = user?.email === ADMIN_EMAIL;

  const START_INDEX = 0; // 🚀 시작 인덱스를 0번으로 변경
  const [mounted, setMounted] = useState(false); 
  const [displayIndex, setDisplayIndex] = useState(START_INDEX); 
  const [hasInteracted, setHasInteracted] = useState(true); // 🚀 시작 화면도 제거됨 (메뉴 클릭형이라 불필요)
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  
  const [viewMode, setViewMode] = useState<"info" | "leaderboard">("info");
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const activeChallenge = challenges[displayIndex]; 
  const activeDetails = challengeDetails[activeChallenge.id] || challengeDetails.default;
  const activeConfig = gameConfig[activeChallenge.id] || gameConfig.default;

  const [isMuted, setIsMuted] = useState(false); 
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  
  const toggleMute = () => { 
    const nextState = !isMuted;
    setIsMuted(nextState); 
    if (!nextState && typeof window !== "undefined") {
      const popAudio = new Audio("/sounds/tick.mp3");
      popAudio.volume = 0.5;
      popAudio.play().catch(() => {});
    }
  };

  const playClickSound = () => { 
    if (isMuted) return; 
    if (typeof window !== "undefined") { 
      if (!audioRef.current) { audioRef.current = new Audio("/sounds/tick.mp3"); audioRef.current.volume = 0.5; } 
      audioRef.current.currentTime = 0; 
      audioRef.current.play().catch(() => {}); 
    } 
  };

  const handleChange = (index: number) => { 
    if (index !== displayIndex) { 
      setDisplayIndex(index); 
      setIsPlayingVideo(false); 
      playClickSound(); // 🚀 휠 틱 소리 대신 메뉴 클릭할 때 틱 소리 나게 변경
    } 
  };
  
  const handleStart = () => { 
    if (!isMuted && typeof window !== "undefined") new Audio("/sounds/click.mp3").play().catch(()=> {}); 
    if (activeChallenge.id === "cps") router.push(`/${activeChallenge.id}`); 
    else alert(`[준비 중] ${activeChallenge.name}${t.readyMsg}`); 
  };
  
  useEffect(() => { const mTimer = setTimeout(() => setMounted(true), 50); return () => clearTimeout(mTimer); }, []);

  useEffect(() => {
    if (viewMode !== "leaderboard") return;
    setLoadingRecords(true);
    const q = query(collection(db, "leaderboards", activeChallenge.id, "records"), orderBy("score", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RecordData[] = []; snapshot.forEach((doc) => { data.push({ id: doc.id, ...doc.data() } as RecordData); });
      setRecords(data); setLoadingRecords(false);
    });
    return () => unsubscribe();
  }, [viewMode, activeChallenge.id]);

  const toggleVerification = async (recordId: string, currentStatus: boolean) => { if (!isAdmin) return; try { await updateDoc(doc(db, "leaderboards", activeChallenge.id, "records", recordId), { isVerified: !currentStatus }); } catch (e) { alert("업데이트 실패"); } };
  const deleteRecord = async (recordId: string) => { if (!isAdmin) return; if (!confirm("삭제하시겠습니까?")) return; try { await deleteDoc(doc(db, "leaderboards", activeChallenge.id, "records", recordId)); } catch (e) { alert("삭제 실패"); } };

  const isActiveGame = activeChallenge.id === "cps";
  const wr = splitRecord(activeChallenge.worldRecord);
  const pr = activeChallenge.personalBest !== "-" ? splitRecord(activeChallenge.personalBest) : null;

  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden" style={{ background: c.bg, color: c.text1 }}>
      
      {/* 스크롤바 숨기기 CSS 추가 */}
      <style dangerouslySetInnerHTML={{ __html: `
        :root, [data-theme="light"] {
          --c-bg: #f9fafb; --c-panel-bright: #ffffff; --c-panel-muted: #f3f4f6; --c-border: #e5e7eb;
          --c-text1: #111827; --c-text2: #6b7280; --c-text3: #9ca3af;
          --c-accent: #3B82F6; --c-accent-dim: rgba(59, 130, 246, 0.15); --c-accent-fg: #ffffff; 
        }
        .dark, [data-theme="dark"] {
          --c-bg: oklch(0.10 0.006 30); --c-panel-bright: oklch(0.17 0.015 35); --c-panel-muted: oklch(0.13 0.01 30); --c-border: oklch(0.26 0.012 30);
          --c-text1: oklch(0.97 0 0); --c-text2: oklch(0.62 0.01 30); --c-text3: oklch(0.42 0.01 30);
          --c-accent: #FF5500; --c-accent-dim: rgba(255, 85, 0, 0.25); --c-accent-fg: #000000; 
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      <div className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-300" style={{ background: `radial-gradient(circle at center, var(--c-accent-dim) 0%, transparent 65%)`, opacity: 0.3 }}></div>
      
      <Header />

      <div className={`transition-opacity duration-1000 ease-out z-[60] ${mounted ? "opacity-100" : "opacity-0"}`}>
        <button 
          onClick={toggleMute} 
          className="fixed bottom-16 left-6 md:bottom-16 md:left-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all border shadow-lg backdrop-blur-md hover:scale-105 focus-visible:outline-none" 
          style={{ background: c.panelBright, borderColor: c.border, color: c.text2 }}
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      </div>

      {/* 🚀 레이아웃 변경: lg:flex-row 로 좌측(리스트 메뉴) 우측(패널) 배치 */}
      <main className={`flex-1 w-full max-w-[1300px] mx-auto px-4 sm:px-8 md:px-12 flex flex-col lg:flex-row items-start justify-between gap-8 lg:gap-16 relative z-10 pt-6 lg:pt-16 pb-24 transition-opacity duration-1000 ease-out ${mounted ? "opacity-100" : "opacity-0"}`}>
        
        {/* 🚀 새로운 모바일 UI: 가로 스크롤 탭 메뉴 */}
        <div className="w-full lg:hidden flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
          {challenges.map((chal, idx) => (
            <button
              key={chal.id}
              onClick={() => handleChange(idx)}
              className={`flex-shrink-0 snap-center px-6 py-3.5 rounded-full border transition-all whitespace-nowrap font-bold text-xs tracking-wider uppercase ${displayIndex === idx ? 'shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
              style={{
                background: displayIndex === idx ? c.accent : c.panelMuted,
                borderColor: displayIndex === idx ? c.accent : c.border,
                color: displayIndex === idx ? "var(--c-accent-fg)" : c.text3
              }}
            >
              {chal.name}
            </button>
          ))}
        </div>

        {/* 🚀 새로운 데스크탑 UI: 수직 리스트 메뉴 */}
        <div className="hidden lg:flex flex-col w-[40%] pr-4 xl:pr-8 sticky top-24 max-h-[calc(100vh-140px)] overflow-y-auto hide-scrollbar">
          <div className="flex items-center gap-2 mb-6 ml-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.accent }}></span>
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: c.text3 }}>SELECT CHALLENGE</span>
          </div>
          
          <div className="flex flex-col gap-3">
            {challenges.map((chal, idx) => (
              <button
                key={chal.id}
                onClick={() => handleChange(idx)}
                className={`group flex items-center justify-between p-5 rounded-2xl transition-all duration-300 border text-left ${displayIndex === idx ? 'shadow-lg scale-[1.02]' : 'hover:scale-[1.01] hover:bg-black/5 dark:hover:bg-white/5'}`}
                style={{
                  background: displayIndex === idx ? c.panelBright : 'transparent',
                  borderColor: displayIndex === idx ? c.accent : c.border,
                }}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase transition-colors" style={{ color: displayIndex === idx ? c.accent : c.text3 }}>
                    {gameConfig[chal.id]?.category || "SKILL TEST"}
                  </span>
                  <span className="text-xl font-black uppercase tracking-tight transition-colors" style={{ color: displayIndex === idx ? c.text1 : c.text2 }}>
                    {chal.name}
                  </span>
                </div>
                <ChevronRight className={`w-5 h-5 transition-all ${displayIndex === idx ? 'opacity-100 translate-x-1' : 'opacity-0 -translate-x-2 group-hover:opacity-50'}`} style={{ color: c.accent }} />
              </button>
            ))}
          </div>
        </div>

        {/* 우측 패널 영역 (모바일 100%, 데스크탑 60%) */}
        <div className="w-full lg:w-[60%] flex flex-col relative pb-12">
            
          {viewMode === "info" ? (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300 w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none">
              
              <div className="flex items-center mb-4">
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: c.accent }}>
                  {t.challengePrefix || "CHALLENGE"}
                </span>
                <span className="mx-2 text-[10px]" style={{ color: c.text3 }}>•</span>
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: c.text3 }}>
                  {activeConfig.category}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-none mb-4 uppercase" style={{ color: c.text1 }}>{activeChallenge.name}</h1>
              <p className="text-sm sm:text-base leading-relaxed mb-8 max-w-md" style={{ color: c.text2 }}>{activeDetails.desc[lang] || activeDetails.desc.en}</p>
              
              <div className="grid grid-cols-2 rounded-3xl overflow-hidden border mb-6" style={{ borderColor: c.border }}>
                <div className="p-5 sm:p-6" style={{ background: c.panelBright }}><div className="flex items-center gap-1.5 mb-3 sm:mb-4"><Trophy className="w-4 h-4" style={{ color: c.accent }} /><span className="text-[10px] sm:text-xs font-bold tracking-[0.12em] uppercase" style={{ color: c.text2 }}>{t.worldRecord}</span></div><div className="flex items-baseline gap-1.5 mb-1 sm:mb-2"><span className="text-3xl sm:text-5xl font-black font-mono tabular-nums" style={{ color: c.text1 }}>{wr.val}</span><span className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: c.text3 }}>{wr.unit}</span></div><div className="text-[10px] sm:text-[11px] truncate" style={{ color: c.text3 }}>{t.by} {activeChallenge.holder}</div></div>
                <div className="p-5 sm:p-6" style={{ background: c.panelMuted, borderLeft: `1px solid ${c.border}` }}>
                  {user ? (pr ? (<><div className="flex items-center gap-1.5 mb-3 sm:mb-4"><Medal className="w-4 h-4" style={{ color: c.accent }} /><span className="text-[10px] sm:text-xs font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>{t.yourRecord}</span></div><div className="flex items-baseline gap-1.5 mb-1 sm:mb-2"><span className="text-3xl sm:text-5xl font-black font-mono tabular-nums" style={{ color: c.text1 }}>{pr.val}</span><span className="text-[10px] sm:text-xs font-semibold uppercase" style={{ color: c.text3 }}>{pr.unit}</span></div><div className="text-[10px] sm:text-[11px] truncate" style={{ color: c.text3 }}>{user.displayName || user.email?.split("@")[0]}</div></>) : (<><div className="flex items-center gap-1.5 mb-3 sm:mb-4"><span className="relative flex items-center justify-center w-4 h-4 shrink-0"><span className="absolute inline-flex h-full w-full rounded-full animate-ping" style={{ background: c.accentDim }} /><Target className="w-4 h-4 relative" style={{ color: c.text3 }} /></span><span className="text-[10px] sm:text-xs font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>{t.yourRecord}</span></div><div className="flex items-baseline gap-1.5 mb-1 sm:mb-2"><span className="text-3xl sm:text-5xl font-black font-mono tabular-nums" style={{ color: c.text3 }}>—</span></div><div className="text-[10px] sm:text-[11px]" style={{ color: c.text3 }}>{t.playToSet}</div></>)) : (<div onClick={() => router.push('/login')} className="group flex flex-col h-full cursor-pointer justify-center"><div className="flex items-center gap-1.5 mb-3 sm:mb-4"><Lock className="w-4 h-4" style={{ color: c.text3 }} /><span className="text-[10px] sm:text-xs font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>{t.yourRecord}</span></div><div className="text-base sm:text-xl font-black uppercase" style={{ color: c.text2 }}>{t.loginToSave}</div></div>)}
                </div>
              </div>

              <div className="w-full flex gap-3 sm:gap-4 mb-8">
                <button onClick={handleStart} disabled={!isActiveGame} className="flex-[2] sm:flex-[3] rounded-2xl py-4 sm:py-5 px-6 sm:px-8 flex items-center justify-between font-bold text-sm sm:text-base tracking-widest transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-md focus-visible:outline-none" style={isActiveGame ? { background: c.accent, color: "var(--c-accent-fg)" } : { background: c.panelMuted, color: c.text3, border: `1px solid ${c.border}` }}>
                  <span className="uppercase">{isActiveGame ? t.startChallenge : t.comingSoon}</span>
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ opacity: isActiveGame ? 1 : 0.5 }} />
                </button>
                
                <button onClick={() => setViewMode("leaderboard")} className="flex-1 rounded-2xl py-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-[1.03] active:scale-[0.97] border focus-visible:outline-none group/rank cursor-pointer" style={{ background: c.panelBright, borderColor: c.border, color: c.text2 }}>
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 group-hover:opacity-80 transition-opacity" style={{ color: c.accent }} />
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase group-hover:opacity-80 transition-opacity">
                    {t.leaderboard || "Rankings"}
                  </span>
                </button>
              </div>

              {activeChallenge.video !== "#" && (
                <div className="w-full flex flex-col">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: c.text3 }}>{t.officialVideo || "Official Video"}</span>
                    <a href={activeChallenge.guinness} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase hover:opacity-70 transition-opacity" style={{ color: c.text2 }}>{t.viewGuinness || "View Guinness Record"}<ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></a>
                  </div>
                  <div className="relative rounded-3xl overflow-hidden aspect-video flex items-center justify-center group/video shadow-lg bg-black border" style={{ borderColor: c.border }}>
                    {isPlayingVideo ? (
                      <iframe width="100%" height="100%" src={getEmbedUrl(activeChallenge.video)} frameBorder="0" allowFullScreen className="absolute inset-0"></iframe>
                    ) : (
                      <button onClick={() => setIsPlayingVideo(true)} className="absolute inset-0 w-full h-full cursor-pointer block overflow-hidden focus:outline-none">
                        <img src={activeChallenge.thumbnail} alt="Thumbnail" className="w-full h-full object-cover transition-transform duration-700 ease-out opacity-70 group-hover/video:scale-105 group-hover/video:opacity-40" />
                        <span className="absolute inset-0 bg-black/30" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center backdrop-blur-md transition-transform duration-300 group-hover/video:scale-110 shadow-lg" style={{ background: "rgba(255, 255, 255, 0.2)", border: "1px solid rgba(255, 255, 255, 0.3)" }}><Play className="w-5 h-5 sm:w-6 sm:h-6 ml-1" style={{ color: "white", fill: "white" }} /></div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            /* 🏆 리더보드 뷰 */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-[600px] lg:h-[750px] w-full max-w-lg mx-auto lg:mx-0 lg:max-w-none">
              <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button onClick={() => setViewMode("info")} className="p-2 sm:p-2.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10" style={{ color: c.text2 }}><ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" /></button>
                <div className="flex flex-col"><span className="text-[10px] sm:text-[11px] font-bold tracking-[0.15em] uppercase" style={{ color: c.accent }}>{t.globalRankings || "Global Rankings"}</span><h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight" style={{ color: c.text1 }}>{activeChallenge.name}</h2></div>
              </div>

              {isAdmin && (<div className="flex items-center gap-2 p-3 sm:p-4 mb-4 sm:mb-5 rounded-2xl border" style={{ background: "color-mix(in oklch, var(--c-accent) 10%, transparent)", borderColor: "color-mix(in oklch, var(--c-accent) 30%, transparent)" }}><ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" style={{ color: c.accent }} /><span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase" style={{ color: c.accent }}>{t.adminModeActive || "Admin Mode Active"}</span></div>)}

              <div className="flex flex-col rounded-3xl overflow-hidden border shadow-lg flex-1" style={{ borderColor: c.border, background: c.panelMuted }}>
                <div className="grid grid-cols-[50px_1fr_80px] sm:grid-cols-[60px_1fr_100px] p-4 sm:p-5 border-b text-[9px] sm:text-[10px] font-bold tracking-[0.15em] uppercase" style={{ borderColor: c.border, background: c.panelBright, color: c.text3 }}>
                  <div className="text-center">{t.rank || "Rank"}</div><div>{t.player || "Player"}</div><div className="text-right">{t.score || "Score"}</div>
                </div>
                
                <div className="flex flex-col overflow-y-auto" style={{ maxHeight: "calc(100% - 50px)" }}>
                  {loadingRecords ? (<div className="p-10 text-center text-xs font-bold tracking-widest uppercase animate-pulse" style={{ color: c.text3 }}>{t.loading || "Loading..."}</div>) : records.length === 0 ? (<div className="p-10 text-center text-xs font-bold tracking-widest uppercase" style={{ color: c.text3 }}>{t.noRecordsFound || "No Records Found"}</div>) : records.map((record, index) => (
                    <div key={record.id} className="group grid grid-cols-[50px_1fr_80px] sm:grid-cols-[60px_1fr_100px] items-center p-4 sm:p-5 border-b last:border-b-0 transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ borderColor: c.border }}>
                      <div className="flex justify-center">{index + 1 <= 3 ? (<Medal className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: index === 0 ? c.gold : index === 1 ? c.silver : c.bronze }} />) : (<span className="font-mono text-sm sm:text-base font-bold" style={{ color: c.text3 }}>{index + 1}</span>)}</div>
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-bold text-sm sm:text-base truncate" style={{ color: c.text1 }}>{record.displayName}</span>
                        {record.isVerified && (<div className="flex items-center gap-1 px-1.5 py-0.5 rounded border shrink-0" style={{ background: "color-mix(in srgb, red 10%, transparent)", borderColor: "color-mix(in srgb, red 20%, transparent)" }}><Play className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500 fill-red-500" /><CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-red-500" /></div>)}
                        {isAdmin && (
                          <div className="hidden group-hover:flex items-center gap-1.5 ml-auto">
                            <button onClick={() => toggleVerification(record.id, record.isVerified)} className="text-[8px] sm:text-[9px] px-2 py-1 rounded font-bold uppercase tracking-wider border transition-all" style={{ borderColor: "color-mix(in oklch, var(--c-accent) 50%, transparent)", color: c.accent }}>{record.isVerified ? (t.revoke || "Revoke") : (t.verify || "Verify")}</button>
                            <button onClick={() => deleteRecord(record.id)} className="p-1 rounded text-red-500 transition-all" style={{ background: "color-mix(in srgb, red 10%, transparent)" }}><Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /></button>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex items-baseline justify-end gap-1"><span className="text-xl sm:text-2xl font-black font-mono tabular-nums" style={{ color: c.accent }}>{record.score}</span><span className="text-[9px] sm:text-[10px] font-bold uppercase" style={{ color: c.text3 }}>{activeConfig.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}