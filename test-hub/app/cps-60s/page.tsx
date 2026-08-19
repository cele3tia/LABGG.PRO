"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { db } from "../lib/firebase"; 
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useLanguage } from "../components/providers";

const TIME_LIMIT = 60; 
const GUINNESS_RECORD = "12.67 CPS";

export default function Cps60sChallenge() {
  const { lang, user } = useLanguage();

  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_LIMIT);
  
  const [pb, setPb] = useState<number | null>(null);
  const [globalWr, setGlobalWr] = useState<string | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  const [tickerIndex, setTickerIndex] = useState(0);
  
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchPb = async () => {
      if (user) {
        try {
          const docRef = doc(db, "records", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().cps60s) {
            setPb(docSnap.data().cps60s);
          }
        } catch (error) {}
      } else {
        const localPb = localStorage.getItem("pb_cps60s");
        if (localPb) setPb(parseFloat(localPb));
      }
    };

    const fetchGlobalWr = async () => {
      try {
        const q = query(collection(db, "records"), orderBy("cps60s", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setGlobalWr(`${querySnapshot.docs[0].data().cps60s.toFixed(2)} CPS`);
        }
      } catch (error) {}
    };

    setTimeout(() => { fetchPb(); fetchGlobalWr(); }, 500); 
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => { setTickerIndex((prev) => prev + 1); }, 2000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let animationFrame: number;
    if (status === "playing" && startTime) {
      const updateTimer = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const remaining = TIME_LIMIT - elapsed;
        
        if (remaining <= 0) {
          setTimeLeft(0);
          setStatus("finished");
        } else {
          setTimeLeft(remaining);
          animationFrame = requestAnimationFrame(updateTimer);
        }
      };
      animationFrame = requestAnimationFrame(updateTimer);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [status, startTime]);

  // 광클 감지 로직 (좌클릭/터치만 허용)
  const handleClick = (e: React.PointerEvent) => {
    if (e.button !== 0) return; 
    if (status === "finished") return;

    if (status === "idle") {
      setStatus("playing");
      setStartTime(performance.now());
      setCount(1);
    } else if (status === "playing") {
      setCount((prev) => prev + 1);
    }
  };

  useEffect(() => {
    if (status === "finished") {
      const finalCps = count / TIME_LIMIT;
      
      if (!pb || finalCps > pb) {
        setPb(finalCps);
        setIsNewPb(true);
        
        if (user) {
          const saveRecord = async () => {
            try {
              const dataToSave: any = {
                uid: user.uid,
                displayName: user.displayName || "익명 플레이어",
                cps60s: finalCps,
                updatedAt: new Date()
              };
              await setDoc(doc(db, "records", user.uid), dataToSave, { merge: true });
            } catch (error) {}
          };
          saveRecord();
        } else {
          localStorage.setItem("pb_cps60s", finalCps.toString());
        }
      } else {
        setIsNewPb(false);
      }
    }
  }, [status, count, pb, user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [status]);

  const handleReset = () => {
    setStatus("idle");
    setCount(0);
    setStartTime(null);
    setTimeLeft(TIME_LIMIT);
    setIsNewPb(false);
  };

  const currentCps = status === "playing" && startTime 
    ? (count / ((performance.now() - startTime) / 1000)).toFixed(2)
    : "0.00";

  const tickerStats = [
    { label: "GUINNESS", value: GUINNESS_RECORD, colorV: "text-[var(--c-text2)]" }
  ];
  if (globalWr && globalWr !== "--") {
    tickerStats.push({ label: "LABGG.PRO", value: globalWr, colorV: "text-[var(--c-accent)]" });
  }
  if (pb) {
    tickerStats.push({ label: "PB", value: `${pb.toFixed(2)} CPS`, colorV: "text-[var(--c-text1)]" });
  }
  
  const length = tickerStats.length;
  const currentIndexToShow = tickerIndex % length;

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
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
            
            <div className={`relative w-full h-[30px] flex justify-center items-center mb-8 overflow-hidden transition-opacity duration-300 ${status === "playing" ? "opacity-0" : "opacity-100"}`}>
              {tickerStats.map((stat, i) => {
                const isActive = i === currentIndexToShow;
                let translateClass = "translate-y-4 opacity-0"; 
                if (isActive) translateClass = "translate-y-0 opacity-100"; 
                else {
                  const isPrev = i === (currentIndexToShow - 1 + length) % length;
                  if (isPrev) translateClass = "-translate-y-4 opacity-0";
                }

                return (
                  <div key={stat.label} className={`absolute flex items-center transition-all duration-500 ease-in-out pointer-events-none ${translateClass}`}>
                    <span className="text-xs sm:text-sm font-bold tracking-widest uppercase linear-font">
                      <span className="text-[var(--c-text3)] opacity-60 mr-3">{stat.label}</span>
                      <span className={`${stat.colorV}`}>{stat.value}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            {status !== "finished" ? (
              <>
                <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-10 text-[var(--c-accent)] transition-opacity duration-200 ${status === "idle" ? "opacity-0 select-none" : "opacity-100"}`}>
                  {timeLeft.toFixed(3)}s
                </div>

                {/* 🚀 싼티나는 아이콘/박스 싹 삭제! 완벽한 투명 클릭 패드 */}
                <div 
                  onPointerDown={handleClick}
                  onContextMenu={(e) => e.preventDefault()} 
                  className="relative flex flex-col items-center justify-center w-full max-w-3xl min-h-[300px] select-none touch-none cursor-pointer"
                >
                  {status === "idle" && (
                    <div className="font-mono text-[2rem] sm:text-[3rem] font-bold tracking-tight text-[var(--c-text3)] opacity-60 animate-pulse text-center linear-font pointer-events-none">
                      CLICK TO START
                    </div>
                  )}

                  {status === "playing" && (
                    <div className="flex flex-col items-center pointer-events-none animate-fade-in-up">
                      <div className="text-[7rem] sm:text-[12rem] font-black font-mono tracking-tighter leading-none text-[var(--c-text1)]">
                        {count}
                      </div>
                      <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--c-accent)] mt-2 sm:mt-4 tracking-wide">
                        {currentCps} CPS
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center animate-fade-in-up">
                <div className="text-xl sm:text-2xl font-bold tracking-widest text-[var(--c-text3)] uppercase linear-font mb-4">
                  CPS TEST (60s)
                </div>
                <div className="flex items-start gap-3 text-7xl sm:text-9xl font-mono font-bold tracking-tighter text-[var(--c-text1)] mb-8 relative">
                  {(count / TIME_LIMIT).toFixed(2)}<span className="text-3xl sm:text-5xl text-[var(--c-text3)] mt-4 sm:mt-6">CPS</span>
                  {isNewPb && (
                    <div className="absolute -top-1 sm:-top-2 -right-12 sm:-right-14 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2.5 py-1 rounded-[4px] uppercase linear-font">
                      PB
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-4 sm:gap-6 text-[var(--c-text3)] font-mono text-lg sm:text-xl">
                  {!isNewPb && pb && (
                    <>
                      <span className="linear-font">PB: <span className="text-[var(--c-text1)] font-semibold">{pb.toFixed(2)} CPS</span></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                    </>
                  )}
                  <span className="linear-font">Total: <span className="text-[var(--c-text1)] font-semibold">{count}</span></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                  <span className="linear-font">Time: <span className="text-[var(--c-text1)] font-semibold">{TIME_LIMIT}s</span></span>
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