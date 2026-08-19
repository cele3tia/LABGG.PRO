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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  
  const [typedHistory, setTypedHistory] = useState<string[]>([]);
  
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

    setTimeout(() => { fetchPb(); fetchGlobalWr(); }, 500); 
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { setTickerIndex((prev) => prev + 1); }, 2000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateCursorPosition = () => {
      const targetIndex = status === "finished" ? 25 : typedHistory.length;
      const currentElem = charRefs.current[Math.min(targetIndex, 25)];
      if (currentElem) {
        setCursorPos({
          left: currentElem.offsetLeft + (targetIndex >= 26 || status === "finished" ? currentElem.offsetWidth : 0),
          top: currentElem.offsetTop,
          height: currentElem.offsetHeight
        });
      }
    };
    setTimeout(updateCursorPosition, 10);
    window.addEventListener("resize", updateCursorPosition);
    return () => window.removeEventListener("resize", updateCursorPosition);
  }, [typedHistory.length, status]);

  const processChar = (typedChar: string) => {
    if (status === "finished") return;

    if (typedHistory.length < 26) {
      if (status === "idle") {
        setStatus("playing");
        setStartTime(performance.now());
      }

      const expectedChar = ALPHABET[typedHistory.length];
      if (typedChar !== expectedChar) {
        setErrors((prev) => prev + 1); 
      }

      const newHistory = [...typedHistory, typedChar];
      setTypedHistory(newHistory);

      if (newHistory.length === 26 && newHistory.join("") === ALPHABET) {
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
              setDoc(doc(db, "records", currentUser.uid), dataToSave, { merge: true });
            } catch (error) {}
          } else {
            localStorage.setItem("pb_alphabetAZ", timeInSeconds.toString());
          }
        } else {
          setIsNewPb(false);
        }
      }
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

      if (e.key === "Backspace") {
        e.preventDefault();
        if (typedHistory.length > 0) {
          setTypedHistory((prev) => prev.slice(0, -1));
        }
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      if (status === "finished" || e.keyCode === 229) return; 

      let typedChar = "";
      if (/^[a-zA-Z]$/.test(e.key)) {
        typedChar = e.key.toUpperCase();
      } else {
        return;
      }

      e.preventDefault(); 
      processChar(typedChar);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, startTime, pb, typedHistory]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    e.target.value = ""; 
    if (!val) return;
    
    const char = val.slice(-1);
    if (/[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]/.test(char)) {
      processChar(char.length === 1 && /[a-zA-Z]/.test(char) ? char.toUpperCase() : char);
    }
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
    setTypedHistory([]); 
    setStatus("idle");
    setStartTime(null);
    setCurrentTime(0);
    setFinalTime(null);
    setErrors(0);
    setIsNewPb(false);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
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

  let tickerContainerOpacity = "opacity-100";
  if (status === "playing") tickerContainerOpacity = "opacity-0";

  const isCursorRed = typedHistory.length > 0 && typedHistory[typedHistory.length - 1] !== ALPHABET[typedHistory.length - 1];

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custom-cursor-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}} />
      
      <Header />
      <input ref={inputRef} type="text" onChange={handleInput} className="absolute opacity-0 -z-10 pointer-events-none" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />

      {/* 🚀 [레이아웃 대공사] items-center justify-center를 main 태그에 적용해서 '백 버튼+본문'을 통째로 묶어 화면 정중앙으로 이동! */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col items-center justify-center pt-20 pb-32 relative z-10">
        
        <div className="w-full flex flex-col items-center justify-center">
          
          {/* 🚀 이제 백 버튼이 붕 뜨지 않고 본문 바로 위(mb-8 sm:mb-12)에 예쁘게 안착합니다 */}
          <div className="w-full flex justify-start mb-8 sm:mb-12">
            <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors focus:outline-none w-fit">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold tracking-widest linear-font mt-px">Back</span>
            </Link>
          </div>

          {/* 🚀 본문 영역 */}
          <div className="flex flex-col items-center justify-center w-full relative">
            
            <div className={`relative w-full h-[30px] flex justify-center items-center mb-8 overflow-hidden transition-opacity duration-300 ${tickerContainerOpacity}`}>
              {activeMilestones.map((stat, i) => {
                const isActive = i === currentIndexToShow;
                let translateClass = "translate-y-4 opacity-0"; 
                if (isActive) translateClass = "translate-y-0 opacity-100"; 
                else if (status === "playing") {
                  if (i < currentIndexToShow) translateClass = "-translate-y-4 opacity-0";
                  if (i > currentIndexToShow) translateClass = "translate-y-4 opacity-0";
                } else {
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
                <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-12 text-[var(--c-accent)] transition-opacity duration-200 ${status === "idle" ? "opacity-0 select-none" : "opacity-100"}`}>
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
                      backgroundColor: isCursorRed ? "#ef4444" : "var(--c-accent, #FF5500)",
                      animation: status === "idle" ? "custom-cursor-blink 1s ease-in-out infinite" : "none" 
                    }}
                  />

                  {ALPHABET.split("").map((expectedChar, i) => {
                    const typedChar = typedHistory[i];
                    const isTyped = typedChar !== undefined;
                    const isCorrect = typedChar === expectedChar;
                    const isWrong = isTyped && !isCorrect;

                    let displayChar = expectedChar;
                    let colorClass = "text-[var(--c-text3)] opacity-40";

                    if (isTyped) {
                      if (isCorrect) {
                        colorClass = "text-[var(--c-text1)]";
                      } else {
                        displayChar = typedChar; 
                        colorClass = "!text-red-500 !opacity-100 font-bold linear-font"; 
                      }
                    }

                    return (
                      <span 
                        key={i} 
                        ref={el => { charRefs.current[i] = el; }}
                        className={`relative inline-block transition-colors duration-150 ${colorClass}`}
                      >
                        {displayChar}
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
                    <div className="mt-2 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2.5 py-1 rounded-[4px] uppercase linear-font">
                      PB
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 sm:gap-6 text-[var(--c-text3)] font-mono text-lg sm:text-xl mb-12">
                  {!isNewPb && pb && (
                    <>
                      <span className="linear-font">PB: <span className="text-[var(--c-text1)] font-semibold">{pb.toFixed(3)}s</span></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                    </>
                  )}
                  <span className="linear-font">Acc: <span className="text-[var(--c-text1)] font-semibold">{accuracy}%</span></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                  <span className="linear-font">Err: <span className="text-red-500 font-semibold">{errors}</span></span>
                </div>
              </div>
            )}

            <div className="mt-16 flex flex-col items-center gap-4 w-full">
              <button 
                ref={resetBtnRef}
                onClick={() => handleReset()} 
                className="flex items-center justify-center w-12 h-12 rounded-full text-[var(--c-text3)] hover:text-[var(--c-text1)] hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none group transition-all duration-300"
              >
                <RotateCcw className="w-5 h-5 group-hover:-rotate-90 transition-transform duration-300" />
              </button>
              <span className="text-xs font-bold text-[var(--c-text3)] opacity-60 uppercase tracking-widest linear-font">
                tab + enter to restart
              </span>
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