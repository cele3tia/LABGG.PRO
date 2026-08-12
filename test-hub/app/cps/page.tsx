"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { 
  ArrowLeft, RotateCcw, MousePointer2, Trophy, Crown, 
  Target, Medal, Lock, ExternalLink, Play 
} from "lucide-react";
import { useLanguage } from "../components/providers";
import { db } from "@/app/lib/firebase";
import { collection, addDoc, serverTimestamp, query, onSnapshot } from "firebase/firestore";

// 메인 페이지와 동일한 라이트/다크 호환 테마 변수
const c = { 
  bg: "var(--c-bg)", panelBright: "var(--c-panel-bright)", panelMuted: "var(--c-panel-muted)", 
  border: "var(--c-border)", accent: "var(--c-accent)", accentDim: "var(--c-accent-dim)", 
  text1: "var(--c-text1)", text2: "var(--c-text2)", text3: "var(--c-text3)"
};

const GAME_DURATION = 60; // 60초
const GUINNESS_CLICKS = 760; 
const GUINNESS_CPS = 12.66;

export default function CpsPage() {
  const router = useRouter();
  const context = useLanguage() as any;
  const user = context.user;
  const lang = (context.language || context.lang || context.locale || "en").includes("ko") ? "ko" : "en";

  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [clicks, setClicks] = useState(0);
  const [saved, setSaved] = useState(false);
  const [personalBest, setPersonalBest] = useState<number | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);

  // 사운드 세팅
  useEffect(() => {
    if (typeof window !== "undefined") {
      clickAudioRef.current = new Audio("/sounds/click.mp3");
      clickAudioRef.current.volume = 0.4;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 내 최고 기록 불러오기 (우측 패널용)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "leaderboards", "cps", "records"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let max = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.uid === user.uid && data.score > max) max = data.score;
      });
      if (max > 0) setPersonalBest(max);
    });
    return () => unsubscribe();
  }, [user]);

  const playClickSound = () => {
    if (clickAudioRef.current) {
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  };

  const startGame = () => {
    setGameState("playing");
    setClicks(1); 
    setTimeLeft(GAME_DURATION);
    setSaved(false);
    playClickSound();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setGameState("finished");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleClick = () => {
    if (gameState === "playing") {
      setClicks((prev) => prev + 1);
      playClickSound();
    }
  };

  const resetGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState("idle");
    setClicks(0);
    setTimeLeft(GAME_DURATION);
    setSaved(false);
  };

  // 백그라운드 자동 저장 로직
  useEffect(() => {
    if (gameState === "finished" && user && !saved && clicks > 0) {
      const saveScoreAutomatically = async () => {
        const finalCps = Number((clicks / GAME_DURATION).toFixed(2));
        try {
          await addDoc(collection(db, "leaderboards", "cps", "records"), {
            uid: user.uid,
            displayName: user.displayName || user.email?.split("@")[0] || "Unknown Player",
            score: finalCps,
            isVerified: false,
            timestamp: serverTimestamp(),
          });
          setSaved(true);
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      };
      saveScoreAutomatically();
    }
  }, [gameState, user, saved, clicks]);

  const currentCps = (GAME_DURATION - timeLeft) > 0 ? (clicks / (GAME_DURATION - timeLeft)).toFixed(2) : "0.00";
  const finalCps = Number((clicks / GAME_DURATION).toFixed(2));
  const guinnessPercentage = Math.min(100, (finalCps / GUINNESS_CPS) * 100).toFixed(1);

  return (
    <div className="relative min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden" style={{ background: c.bg, color: c.text1 }}>
      
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
      `}} />

      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(circle at top left, var(--c-accent-dim) 0%, transparent 50%)`, opacity: 0.3 }}></div>

      <Header />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col lg:flex-row items-stretch justify-center gap-8 lg:gap-12 relative z-10 pt-10 lg:pt-20 pb-12 select-none">
        
        {/* 🎮 좌측: 메인 게임 에어리어 */}
        <div className="flex-[3] flex flex-col w-full h-full relative">
          
          <div className="w-full flex items-center justify-between mb-6">
            <button onClick={() => router.push("/")} className="flex items-center gap-2 px-4 py-2 rounded-full transition-all hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-black/10 dark:hover:border-white/10" style={{ color: c.text2 }}>
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-bold tracking-wider uppercase hidden sm:block">{lang === "ko" ? "뒤로가기" : "Go Back"}</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: c.border, background: c.panelBright }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: gameState === "playing" ? c.accent : c.text3 }}></span>
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: c.text2 }}>
                {gameState === "idle" ? "READY" : gameState === "playing" ? "LIVE" : "FINISHED"}
              </span>
            </div>
          </div>

          <div className="w-full relative flex-1 min-h-[450px] sm:min-h-[550px] rounded-[2rem] sm:rounded-[3rem] border-2 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden shadow-2xl"
               style={{ background: c.panelBright, borderColor: gameState === "playing" ? c.accent : c.border }}>
            
            {/* 클릭 감지 패드 (게임 중이거나 대기 중일 때만 활성화) */}
            {gameState !== "finished" && (
              <div className="absolute inset-0 z-10 cursor-pointer" onMouseDown={gameState === "idle" ? startGame : handleClick} />
            )}

            {/* 상태 1: 대기 (Idle) */}
            {gameState === "idle" && (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 pointer-events-none z-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6 shadow-xl transition-transform group-hover:scale-110" style={{ background: c.accent }}>
                  <MousePointer2 className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: "var(--c-accent-fg)", fill: "var(--c-accent-fg)" }} />
                </div>
                <h2 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight text-center px-4" style={{ color: c.text1 }}>
                  {lang === "ko" ? "클릭하여 챌린지 시작" : "CLICK TO START CHALLENGE"}
                </h2>
                <p className="text-sm sm:text-base font-bold uppercase tracking-widest" style={{ color: c.text3 }}>
                  {lang === "ko" ? "제한 시간: 60초" : "TIME LIMIT: 60 SECONDS"}
                </p>
              </div>
            )}

            {/* 상태 2: 게임 중 (Playing) */}
            {gameState === "playing" && (
              <div className="flex flex-col items-center w-full px-8 pointer-events-none z-0">
                <div className="absolute top-6 left-6 sm:top-10 sm:left-10 flex flex-col items-start">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c.text3 }}>Time Left</span>
                  <span className="text-3xl sm:text-5xl font-black font-mono tabular-nums" style={{ color: timeLeft <= 10 ? "red" : c.text1 }}>
                    {timeLeft}<span className="text-base sm:text-xl ml-1" style={{ color: c.text3 }}>s</span>
                  </span>
                </div>
                
                <div className="absolute top-6 right-6 sm:top-10 sm:right-10 flex flex-col items-end">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: c.text3 }}>Current CPS</span>
                  <span className="text-3xl sm:text-5xl font-black font-mono tabular-nums" style={{ color: c.accent }}>
                    {currentCps}
                  </span>
                </div>

                <div className="text-center mt-12 sm:mt-16">
                  <span className="text-[12px] sm:text-sm font-bold uppercase tracking-[0.3em] block mb-2" style={{ color: c.text3 }}>Total Clicks</span>
                  <span className="text-8xl sm:text-[160px] leading-none font-black font-mono tabular-nums tracking-tighter" style={{ color: c.text1 }}>
                    {clicks}
                  </span>
                </div>
              </div>
            )}

            {/* 상태 3: 게임 종료 (Finished) - 🚀 기네스 기록 비교 추가 */}
            {gameState === "finished" && (
              <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500 pointer-events-auto z-20 bg-black/5 dark:bg-white/5 w-full h-full justify-center backdrop-blur-sm px-6">
                <div className="px-4 py-1.5 rounded-full mb-6 border" style={{ borderColor: c.border, background: c.panelMuted }}>
                  <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: c.text1 }}>Challenge Completed</span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-7xl sm:text-[100px] leading-none font-black font-mono tabular-nums tracking-tighter" style={{ color: c.accent }}>{finalCps}</span>
                  <span className="text-2xl sm:text-3xl font-bold uppercase" style={{ color: c.text3 }}>CPS</span>
                </div>
                
                <p className="text-sm sm:text-base font-bold tracking-widest mb-8" style={{ color: c.text2 }}>
                  TOTAL <span style={{ color: c.text1 }}>{clicks} CLICKS</span> IN 60 SEC.
                </p>

                {/* 🚀 기네스 기록 분석 바 */}
                <div className="w-full max-w-sm flex flex-col gap-2 mb-10">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                    <span style={{ color: c.text2 }}>{lang === "ko" ? "기네스 세계 기록 비교" : "VS GUINNESS RECORD"}</span>
                    <span style={{ color: c.accent }}>{guinnessPercentage}%</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: c.panelMuted, border: `1px solid ${c.border}` }}>
                    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${guinnessPercentage}%`, background: c.accent }}></div>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1">
                    <span>0 CPS</span>
                    <span>12.66 CPS (RECORD)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto flex-col sm:flex-row">
                  <button onClick={resetGame} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95" style={{ background: c.panelMuted, border: `1px solid ${c.border}`, color: c.text1 }}>
                    <RotateCcw className="w-4 h-4" />
                    {lang === "ko" ? "다시 하기" : "Try Again"}
                  </button>
                  <button onClick={() => router.push("/")} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95 shadow-md" style={{ background: c.accent, color: "var(--c-accent-fg)" }}>
                    <Crown className="w-4 h-4" />
                    {lang === "ko" ? "랭킹 확인" : "Leaderboard"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 📊 우측: 사이드 인포 패널 (메인 페이지랑 톤앤매너 통일) */}
        <div className="flex-[1.2] w-full lg:max-w-[400px] flex flex-col pt-0 lg:pt-14">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: c.accent }}>CHALLENGE</span>
            <span className="w-1 h-1 rounded-full shrink-0" style={{ background: c.text3 }} />
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: c.text3 }}>MOUSE CLICKING</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-3 uppercase" style={{ color: c.text1 }}>
            1 MIN CLICKS
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: c.text2 }}>
            {lang === "ko" ? "60초 동안 마우스를 최대한 많이 클릭하여 한계를 뛰어넘으세요." : "Click as many times as possible within 60 seconds."}
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {/* 세계 기록 */}
            <div className="p-4 rounded-2xl border" style={{ background: c.panelBright, borderColor: c.border }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-3.5 h-3.5" style={{ color: c.accent }} />
                <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: c.text2 }}>WORLD RECORD</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-black font-mono tabular-nums" style={{ color: c.text1 }}>{GUINNESS_CPS}</span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.text3 }}>CPS</span>
              </div>
              <div className="text-[10px] truncate" style={{ color: c.text3 }}>{GUINNESS_CLICKS} Clicks by Yiğit Arslan</div>
            </div>

            {/* 내 최고 기록 */}
            <div className="p-4 rounded-2xl border" style={{ background: c.panelMuted, borderColor: c.border }}>
              {user ? (
                personalBest ? (
                  <>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Medal className="w-3.5 h-3.5" style={{ color: c.accent }} />
                      <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>YOUR BEST</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono tabular-nums" style={{ color: c.text1 }}>{personalBest.toFixed(2)}</span>
                      <span className="text-[10px] font-semibold uppercase" style={{ color: c.text3 }}>CPS</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-3.5 h-3.5" style={{ color: c.text3 }} />
                      <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>YOUR BEST</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black font-mono tabular-nums" style={{ color: c.text3 }}>—</span>
                    </div>
                  </>
                )
              ) : (
                <div onClick={() => router.push('/login')} className="flex flex-col cursor-pointer justify-center">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lock className="w-3.5 h-3.5" style={{ color: c.text3 }} />
                    <span className="text-[10px] font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>YOUR BEST</span>
                  </div>
                  <div className="text-sm font-black uppercase hover:opacity-70 transition-opacity" style={{ color: c.text2 }}>LOGIN TO SAVE</div>
                </div>
              )}
            </div>
          </div>

          {/* 기네스 영상 썸네일 (메인 화면 감성 유지) */}
          <div className="w-full flex flex-col mt-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: c.text3 }}>GUINNESS VIDEO</span>
              <a href="https://www.guinnessworldrecords.com/world-records/781836-most-mouse-clicks-in-one-minute" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] font-bold tracking-[0.12em] uppercase hover:opacity-70 transition-opacity" style={{ color: c.text2 }}>
                VIEW RECORD<ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <a href="https://www.youtube.com/shorts/babsG1t1oq4" target="_blank" rel="noreferrer" className="relative rounded-xl overflow-hidden aspect-video flex items-center justify-center group/video shadow-lg bg-black border cursor-pointer" style={{ borderColor: c.border }}>
              <img src="https://i.ytimg.com/vi/babsG1t1oq4/maxresdefault.jpg" alt="Thumbnail" className="w-full h-full object-cover transition-transform duration-700 ease-out opacity-60 group-hover/video:scale-105 group-hover/video:opacity-40" />
              <span className="absolute inset-0 bg-black/40" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="relative w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-transform duration-300 group-hover/video:scale-110" style={{ background: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.25)" }}>
                  <Play className="w-4 h-4 ml-0.5" style={{ color: "white", fill: "white" }} />
                </div>
              </div>
            </a>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}