"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// 🚀 Z부터 A까지! 역방향
const ALPHABET = "ZYXWVUTSRQPONMLKJIHGFEDCBA";

export default function AlphabetZAChallenge() {
  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [isError, setIsError] = useState(false);
  
  const [pb, setPb] = useState<number | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  const [userId, setUserId] = useState<string>("");
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [cursorPos, setCursorPos] = useState({ left: 0, top: 0, height: 0 });

  useEffect(() => {
    const fetchPb = async () => {
      let uid = auth.currentUser?.uid || localStorage.getItem("labgg_device_id");
      if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem("labgg_device_id", uid);
      }
      setUserId(uid);

      try {
        const docRef = doc(db, "records", uid);
        const docSnap = await getDoc(docRef);
        // 🚀 DB에서 alphabetZA 기록 가져오기!
        if (docSnap.exists() && docSnap.data().alphabetZA) {
          setPb(docSnap.data().alphabetZA);
        }
      } catch (error) {
        console.error("🔥 DB 로드 실패:", error);
      }
    };
    setTimeout(fetchPb, 500); 
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
          
          if (userId) {
            try {
              const currentUser = auth.currentUser;
              // 🚀 alphabetZA (역방향)으로 DB에 저장!
              const dataToSave: any = { alphabetZA: timeInSeconds, updatedAt: new Date() };
              if (currentUser) {
                dataToSave.uid = currentUser.uid;
                dataToSave.email = currentUser.email || "";
                dataToSave.displayName = currentUser.displayName || "익명 타자수";
              }
              await setDoc(doc(db, "records", userId), dataToSave, { merge: true });
            } catch (error) {}
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
  }, [currentIndex, status, startTime, pb, userId]);

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

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custom-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
      
      <Header />
      <input ref={inputRef} type="text" onChange={handleInput} className="absolute opacity-0 -z-10 pointer-events-none" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col justify-center pt-16 pb-32 relative z-10">
        
        {/* 🚀 인터 폰트로 강제 고정된 근본 Back 버튼! */}
        <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors mb-8 focus:outline-none w-fit">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span 
            className="text-xs font-bold tracking-widest font-sans mt-px" 
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Back
          </span>
        </Link>

        <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
          <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-12 text-[var(--c-accent)] transition-opacity duration-300 ${status === "idle" ? "opacity-0" : "opacity-100"}`}>
            {displayTime}
          </div>

          {status !== "finished" ? (
            <div className="relative font-mono text-[2.5rem] sm:text-[4rem] leading-tight tracking-[0.1em] sm:tracking-[0.15em] break-all select-none w-full text-center" style={{ wordSpacing: "4px" }}>
              
              {/* 🚀 스르르륵 부드럽게 미끄러지는 심장박동 스무스 커서! */}
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

              {/* 🚀 Z 부터 A 까지 렌더링! */}
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
            {/* 🚀 Tab + Enter 원본 복구 완료! */}
            <span className="font-mono text-xs text-[var(--c-text3)] opacity-60 uppercase tracking-widest">
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