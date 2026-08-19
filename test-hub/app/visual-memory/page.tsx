"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw, Heart } from "lucide-react";

import { db } from "../lib/firebase"; 
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useLanguage } from "../components/providers";

type GameStatus = "idle" | "preparing" | "showing" | "playing" | "result" | "cleared" | "finished";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function VisualMemoryChallenge() {
  const { lang, user } = useLanguage();

  const [status, setStatus] = useState<GameStatus>("idle");
  const [level, setLevel] = useState(1);
  
  const [lives, setLives] = useState(3);
  const [roundStrikes, setRoundStrikes] = useState(0); 
  
  const [gridSize, setGridSize] = useState(3);
  const [pattern, setPattern] = useState<number[]>([]);
  
  const [clicked, setClicked] = useState<number[]>([]);
  const [wrongClicks, setWrongClicks] = useState<number[]>([]);
  
  const [pb, setPb] = useState<number | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchPb = async () => {
      if (user) {
        try {
          const docRef = doc(db, "records", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().visualMemory) {
            setPb(docSnap.data().visualMemory);
          }
        } catch (error) {}
      } else {
        const localPb = localStorage.getItem("pb_visualMemory");
        if (localPb) setPb(parseInt(localPb));
      }
    };
    setTimeout(() => { fetchPb(); }, 500); 
  }, [user]);

  const playTickSound = () => {
    const audio = document.getElementById("tick-sound") as HTMLAudioElement;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const getGridParams = (lvl: number) => {
    const size = 3 + Math.floor((lvl - 1) / 3);
    const count = lvl + 2; 
    return { size, count };
  };

  const startLevel = async (lvl: number, currentLives: number) => {
    const { size, count } = getGridParams(lvl);
    const totalSquares = size * size;
    
    const newPattern: number[] = [];
    while (newPattern.length < count) {
      const rand = Math.floor(Math.random() * totalSquares);
      if (!newPattern.includes(rand)) newPattern.push(rand);
    }

    setGridSize(size);
    setPattern(newPattern);
    setClicked([]);
    setWrongClicks([]);
    setRoundStrikes(0); 
    setLevel(lvl);
    setLives(currentLives);
    
    setStatus("preparing");
    await sleep(500);

    setStatus("showing");
    await sleep(1500);
    
    if (currentLives > 0) {
      setStatus("playing");
    }
  };

  const handleSquareClick = async (index: number) => {
    if (status !== "playing") return;
    if (clicked.includes(index) || wrongClicks.includes(index)) return; 

    playTickSound();

    if (pattern.includes(index)) {
      const newClicked = [...clicked, index];
      setClicked(newClicked);

      if (newClicked.length === pattern.length) {
        setStatus("cleared"); 
        await sleep(800); 
        startLevel(level + 1, lives); 
      }
    } else {
      const newWrong = [...wrongClicks, index];
      setWrongClicks(newWrong);
      
      const newRoundStrikes = roundStrikes + 1;
      setRoundStrikes(newRoundStrikes);

      if (newRoundStrikes >= 3) {
        setStatus("result"); 
        const newLives = lives - 1;
        setLives(newLives);
        
        await sleep(1500); 

        if (newLives > 0) {
          startLevel(level, newLives); 
        } else {
          handleGameOver(level); 
        }
      }
    }
  };

  const handleGameOver = (finalScore: number) => {
    setStatus("finished");

    if (!pb || finalScore > pb) {
      setPb(finalScore);
      setIsNewPb(true);
      
      if (user) {
        const saveRecord = async () => {
          try {
            const dataToSave: any = {
              uid: user.uid,
              displayName: user.displayName || "익명 플레이어",
              visualMemory: finalScore,
              updatedAt: new Date()
            };
            await setDoc(doc(db, "records", user.uid), dataToSave, { merge: true });
          } catch (error) {}
        };
        saveRecord();
      } else {
        localStorage.setItem("pb_visualMemory", finalScore.toString());
      }
    } else {
      setIsNewPb(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status === "idle" && e.code === "Space") {
        e.preventDefault();
        startLevel(1, 3);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        resetBtnRef.current?.focus();
        return;
      }
      
      if (e.key === "Enter") {
        if (document.activeElement === resetBtnRef.current || status === "finished") {
          e.preventDefault();
          handleReset(); 
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, level, lives]);

  const handleReset = () => {
    setStatus("idle");
    setLevel(1);
    setLives(3);
    setRoundStrikes(0);
    setPattern([]);
    setClicked([]);
    setWrongClicks([]);
    setIsNewPb(false);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      <audio id="tick-sound" src="/sounds/tick.mp3" preload="auto" />
      
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center pt-20 pb-32 relative z-10">
        
        <div className="w-full flex flex-col items-center justify-center">
          
          <div className="w-full flex justify-start mb-8 sm:mb-12">
            <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors focus:outline-none w-fit">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold tracking-widest uppercase linear-font mt-px">Back</span>
            </Link>
          </div>

          <div className="flex flex-col items-center justify-center w-full relative">
            
            {status !== "finished" ? (
              <>
                <div className={`flex flex-col items-center mb-10 transition-opacity duration-300 ${status === "idle" ? "opacity-0 select-none" : "opacity-100"}`}>
                  <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tighter text-[var(--c-accent)] mb-4">
                    Level {level}
                  </div>
                  <div className="flex gap-2.5">
                    {[...Array(3)].map((_, i) => (
                      <Heart 
                        key={i} 
                        className={`w-6 h-6 transition-all duration-300 ${i < lives ? "fill-[var(--c-accent)] text-[var(--c-accent)]" : "text-[var(--c-text3)] opacity-20"}`} 
                      />
                    ))}
                  </div>
                </div>

                <div className="relative flex flex-col items-center justify-center w-full min-h-[350px] select-none">
                  
                  {status === "idle" && (
                    <button 
                      onClick={() => startLevel(1, 3)}
                      className="absolute font-mono text-[2rem] sm:text-[3rem] font-bold tracking-tight text-[var(--c-text3)] hover:text-[var(--c-text1)] opacity-60 hover:opacity-100 transition-all text-center linear-font z-50 focus:outline-none animate-pulse"
                    >
                      PRESS SPACEBAR
                    </button>
                  )}

                  <div 
                    className={`grid gap-2 sm:gap-3 w-full max-w-[420px] transition-opacity duration-300 ${status === "idle" ? "opacity-10 pointer-events-none" : "opacity-100"}`}
                    style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
                  >
                    {Array.from({ length: gridSize * gridSize }).map((_, i) => {
                      const isPattern = pattern.includes(i);
                      const isClicked = clicked.includes(i);
                      const isWrong = wrongClicks.includes(i);

                      let bgClass = "bg-black/5 dark:bg-white/5";
                      let transformClass = "scale-100";
                      
                      if (status === "showing") {
                        if (isPattern) {
                          bgClass = "bg-white dark:bg-white"; 
                          // 🚀 scale-105 완전 삭제! 제자리에서 빛만 납니다
                          transformClass = "scale-100 shadow-sm"; 
                        }
                      } else if (status === "cleared") {
                        if (isPattern) {
                          bgClass = "bg-[#FF5500]"; 
                          // 🚀 여기도 scale-105 삭제! 
                          transformClass = "scale-100 shadow-[0_0_24px_rgba(255,85,0,0.6)]"; 
                        } else {
                          bgClass = "bg-black/5 dark:bg-white/5 opacity-40"; 
                        }
                      } else if (status === "playing" || status === "result") {
                        if (isWrong) {
                          bgClass = "bg-red-500"; 
                          transformClass = "scale-95";
                        } else if (isClicked && isPattern) {
                          bgClass = "bg-white dark:bg-white"; 
                          transformClass = "scale-95";
                        } else if (status === "result" && isPattern && !isClicked) {
                          bgClass = "bg-white/30 dark:bg-white/30"; 
                        } else if (status === "playing") {
                          bgClass = "bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer";
                          transformClass = "active:scale-95"; 
                        } else {
                          bgClass = "bg-black/5 dark:bg-white/5 opacity-50"; 
                        }
                      }

                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSquareClick(i)}
                          className={`w-full aspect-square rounded-[14px] sm:rounded-2xl transition-all duration-200 ease-out ${bgClass} ${transformClass}`} 
                        />
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center animate-fade-in-up mt-10">
                <div className="text-xl sm:text-2xl font-bold tracking-widest text-[var(--c-text3)] uppercase linear-font mb-4">
                  Visual Memory
                </div>
                <div className="flex items-center gap-4 text-7xl sm:text-9xl font-mono font-bold tracking-tighter text-[var(--c-text1)] mb-8 relative">
                  {level}
                  {isNewPb && (
                    <div className="absolute -top-1 sm:-top-2 -right-10 sm:-right-12 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2.5 py-1 rounded-[4px] uppercase linear-font">
                      PB
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 text-[var(--c-text3)] font-mono text-lg sm:text-xl">
                  <span className="linear-font">Score: <span className="text-[var(--c-text1)] font-semibold">{level} Level</span></span>
                  {!isNewPb && pb && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                      <span className="linear-font">PB: <span className="text-[var(--c-text1)] font-semibold">{pb} Level</span></span>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="mt-20 flex flex-col items-center gap-4 w-full">
              <button 
                ref={resetBtnRef}
                onClick={handleReset} 
                className="flex items-center justify-center w-14 h-14 rounded-full text-[var(--c-text3)] hover:text-[var(--c-text1)] hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none group transition-all duration-300"
              >
                <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
              </button>
              <span className="text-xs font-bold text-[var(--c-text3)] opacity-60 uppercase tracking-widest linear-font">
                tab + enter to restart
              </span>

              {!user && status === "finished" && (
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-[var(--c-text3)] linear-font opacity-80 animate-fade-in-up">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                  <span>
                    {lang === "ko" ? "기록을 랭킹에 등록하려면 " : "To save your score on the leaderboard, please "}
                    <Link href="/login" className="text-[var(--c-text1)] underline underline-offset-2 hover:text-[var(--c-accent)] transition-colors">
                      {lang === "ko" ? "로그인" : "log in"}
                    </Link>
                    {lang === "ko" ? "이 필요합니다." : "."}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-[var(--c-bg)] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}