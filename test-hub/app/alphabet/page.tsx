"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GUINNESS_RECORD = "3.250s"; 

export default function AlphabetAZChallenge() {
  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isError, setIsError] = useState(false);
  
  const [pb, setPb] = useState<number | null>(null);
  const [globalWr, setGlobalWr] = useState<string | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  
  const [tickerIndex, setTickerIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [cursorPos, setCursorPos] = useState({ left: 0, top: 0, height: 0 });

  useEffect(() => {
    const fetchPb = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const docRef = doc(db, "records", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().alphabetAZ) {
            setPb(docSnap.data().alphabetAZ);
          }
        } catch (error) {}
      } else {
        const localPb = localStorage.getItem("pb_alphabetAZ");
        if (localPb) setPb(parseFloat(localPb));
      }
    };

    const fetchGlobalWr = async () => {
      try {
        const q = query(collection(db, "records"), orderBy("alphabetAZ", "asc"), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setGlobalWr(`${querySnapshot.docs[0].data().alphabetAZ.toFixed(3)}s`);
        }
      } catch (error) {}
    };

    setTimeout(() => {
      fetchPb();
      fetchGlobalWr();
    }, 500); 
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTickerIndex((prev) => prev + 1);
    }, 2000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateCursorPosition = () => {
      const targetIndex = status === "finished" ? 25 : currentIndex;
      const currentElem = charRefs.current[targetIndex];
      
      if (currentElem) {
        setCursorPos({
          left: currentElem.offsetLeft + (status === "finished" ? currentElem.offsetWidth : 0),
          top: currentElem.offsetTop,
          height: currentElem.offsetHeight
        });
      }
    };
    
    setTimeout(updateCursorPosition, 10);
    window.addEventListener("resize", updateCursorPosition);
    return () => window.removeEventListener("resize", updateCursorPosition);
  }, [currentIndex, status]);

  const processChar = async (typedChar: string) => {
    if (status === "finished") return;
    const expectedChar = ALPHABET[currentIndex];

    if (typedChar === expectedChar) {
      if (status === "idle") {
        setStatus("playing");
        setStartTime(performance.now());
      }
      setIsError(false);
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);

      if (nextIndex === 26) {
        setStatus("finished");
        const endTime = performance.now();
        const timeTaken = endTime - (startTime || endTime);
        setFinalTime(timeTaken);
        const timeInSeconds = timeTaken / 1000;

        if (!pb || timeInSeconds < pb) {
          setPb(timeInSeconds);
          setIsNewPb(true);
          
          const currentUser = auth.currentUser;
          if (currentUser) {
            try {
              const dataToSave: any = { alphabetAZ: timeInSeconds, updatedAt: new Date() };
              dataToSave.uid = currentUser.uid;
              dataToSave.email = currentUser.email || "";
              dataToSave.displayName = currentUser.displayName || "익명 타자수";
              await setDoc(doc(db, "records", currentUser.uid), dataToSave, { merge: true });
            } catch (error) {}
          } else {
            localStorage.setItem("pb_alphabetAZ", timeInSeconds.toString());
          }
        } else {
          setIsNewPb(false);
        }
      }
    } else {
      if (status === "idle") {
        setStatus("playing");
        setStartTime(performance.now());
      }
      setErrors((prev) => prev + 1);
      setIsError(true);
      setTimeout(() => setIsError(false), 150);
    }
  };

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

      if (e.ctrlKey || e.metaKey || e.altKey) return; 
      if (status === "finished" || e.keyCode === 229) return; 

      let typedChar = "";
      if (e.code && e.code.startsWith("Key")) typedChar = e.code.replace("Key", ""); 
      else if (/^[a-zA-Z]$/.test(e.key)) typedChar = e.key.toUpperCase();
      else return;

      e.preventDefault(); 
      processChar(typedChar);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, status, startTime, pb]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    e.target.value = ""; 
    if (!val) return;
    const char = val.slice(-1).toUpperCase();
    if (/^[A-Z]$/.test(char)) processChar(char);
  };

  useEffect(() => {
    let animationFrame: number;
    if (status === "playing" && startTime) {
      const updateTimer = () => {
        setCurrentTime(performance.now() - startTime);
        animationFrame = requestAnimationFrame(updateTimer);
      };
      animationFrame = requestAnimationFrame(updateTimer);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [status, startTime]);

  useEffect(() => {
    const focusInput = () => {
      if (status !== "finished" && inputRef.current && document.activeElement !== resetBtnRef.current) {
        inputRef.current.focus();
      }
    };
    document.addEventListener("click", focusInput);
    focusInput(); 
    return () => document.removeEventListener("click", focusInput);
  }, [status]);

  const handleReset = () => {
    setCurrentIndex(0);
    setStatus("idle");
    setStartTime(null);
    setCurrentTime(0);
    setFinalTime(null);
    setErrors(0);
    setIsError(false);
    setIsNewPb(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const displayTime = status === "finished" && finalTime ? (finalTime / 1000).toFixed(3) : (currentTime / 1000).toFixed(3);
  const accuracy = status === "finished" ? ((26 / (26 + errors)) * 100).toFixed(1) : "100";

  const activeMilestones = [
    { label: "GUINNESS", value: GUINNESS_RECORD, time: 3.250, colorV: "text-[var(--c-text2)]" }
  ];
  if (globalWr && globalWr !== "--") {
    activeMilestones.push({ label: "LABGG.PRO", value: globalWr, time: parseFloat(globalWr), colorV: "text-[var(--c-accent)]" });
  }
  if (pb) {
    activeMilestones.push({ label: "PB", value: `${pb.toFixed(3)}s`, time: pb, colorV: "text-[var(--c-text1)]" });
  }
  
  activeMilestones.sort((a, b) => a.time - b.time);
  const length = activeMilestones.length;
  let currentIndexToShow = length > 0 ? tickerIndex % length : 0;

  if (status === "playing") {
    const currentSec = currentTime / 1000;
    for (let i = 0; i < length; i++) {
      if (currentSec < activeMilestones[i].time) {
        currentIndexToShow = i;
        break; 
      }
      if (i === length - 1) currentIndexToShow = i; 
    }
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custom-cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}} />
      
      <Header />
      <input ref={inputRef} type="text" onChange={handleInput} className="absolute opacity-0 -z-10 pointer-events-none" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col pt-16 pb-32 relative z-10">
        
        <div className="w-full flex justify-start mb-12">
          <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors focus:outline-none w-fit">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold tracking-widest font-sans mt-px" style={{ fontFamily: "'Inter', sans-serif" }}>Back</span>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center w-full flex-1 relative">
          
          <div className={`relative w-full h-[30px] flex justify-center items-center mb-8 overflow-hidden transition-opacity duration-300 ${status === "playing" ? "opacity-0" : "opacity-100"}`}>
            {activeMilestones.map((stat, i) => {
              const isActive = i === currentIndexToShow;
              let translateClass = "translate-y-4 opacity-0"; 
              
              if (isActive) {
                translateClass = "translate-y-0 opacity-100"; 
              } else if (status === "playing") {
                if (i < currentIndexToShow) translateClass = "-translate-y-4 opacity-0";
                if (i > currentIndexToShow) translateClass = "translate-y-4 opacity-0";
              } else {
                const isPrev = i === (currentIndexToShow - 1 + length) % length;
                if (isPrev) translateClass = "-translate-y-4 opacity-0";
              }

              return (
                <div
                  key={stat.label}
                  className={`absolute flex items-center transition-all duration-500 ease-in-out pointer-events-none ${translateClass}`}
                >
                  <span 
                    className="text-xs sm:text-sm font-bold tracking-widest uppercase font-sans"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    <span className="text-[var(--c-text3)] opacity-60 mr-3">{stat.label}</span>
                    <span className={`${stat.colorV}`}>{stat.value}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* 🚀 [수정점] 라이브 타이머를 status !== "finished" 안으로 집어넣어, 끝나면 아예 삭제되도록 변경! */}
          {status !== "finished" ? (
            <>
              <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-12 text-[var(--c-accent)] transition-opacity duration-300 ${status === "idle" ? "opacity-0" : "opacity-100"}`}>
                {displayTime}
              </div>

              <div className="relative font-mono text-[2.5rem] sm:text-[4rem] leading-tight tracking-[0.1em] sm:tracking-[0.15em] break-all select-none w-full text-center" style={{ wordSpacing: "4px" }}>
                
                <div 
                  className="absolute w-[3px] z-50 pointer-events-none transition-all duration-100 ease-out"
                  style={{ 
                    left: cursorPos.left, 
                    top: cursorPos.top, 
                    height: cursorPos.height * 0.8,
                    marginTop: cursorPos.height * 0.1,
                    transform: "translateX(-4px)", 
                    backgroundColor: isError ? "#ef4444" : "var(--c-accent, #FF5500)",
                    animation: status === "idle" ? "custom-cursor-blink 1s ease-in-out infinite" : "none" 
                  }}
                />

                {ALPHABET.split("").map((char, i) => {
                  const isTyped = i < currentIndex;
                  const isCurrent = i === currentIndex;
                  
                  return (
                    <span 
                      key={char} 
                      ref={el => { charRefs.current[i] = el; }}
                      className={`relative inline-block transition-colors duration-150 
                        ${isTyped ? "text-[var(--c-text1)]" : "text-[var(--c-text3)] opacity-40"}
                        ${isCurrent && isError ? "!text-red-500 !opacity-100" : ""}
                      `}
                    >
                      {char}
                    </span>
                  );
                })}

              </div>
            </>
          ) : (
            <div className="flex flex-col items-center animate-fade-in-up">
              <div className="flex items-start gap-3 text-6xl sm:text-8xl font-mono font-bold tracking-tighter text-[var(--c-text1)] mb-4">
                {displayTime}<span className="text-3xl sm:text-5xl text-[var(--c-text3)] mt-3">s</span>
                {isNewPb && (
                  <div className="mt-2 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2.5 py-1 rounded-[4px] uppercase">
                    PB
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 sm:gap-6 text-[var(--c-text3)] font-mono text-lg sm:text-xl mb-12">
                {!isNewPb && pb && (
                  <>
                    <span>PB: <span className="text-[var(--c-text1)] font-semibold">{pb.toFixed(3)}s</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                  </>
                )}
                <span>Acc: <span className="text-[var(--c-text1)] font-semibold">{accuracy}%</span></span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                <span>Err: <span className="text-red-500 font-semibold">{errors}</span></span>
              </div>
            </div>
          )}

          <div className="mt-16 flex flex-col items-center gap-4">
            <button 
              ref={resetBtnRef}
              onClick={handleReset} 
              className="flex items-center justify-center w-14 h-14 rounded-full text-[var(--c-text3)] hover:text-[var(--c-text1)] hover:bg-black/5 dark:hover:bg-white/10 focus:text-[var(--c-text1)] focus:bg-black/10 dark:focus:bg-white/20 transition-colors focus:outline-none group"
            >
              <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
            </button>
            <span 
              className="text-xs font-bold text-[var(--c-text3)] opacity-60 uppercase tracking-widest font-sans"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              tab + enter to restart
            </span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-[var(--c-bg)] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}