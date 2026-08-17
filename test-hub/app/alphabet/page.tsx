"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw } from "lucide-react";

// 🚀 유저님이 만드신 firebase.ts 파일 가져오기 (경로에 맞게 수정하세요!)
import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function AlphabetChallenge() {
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

  // 🚀 [DB 연동 1] 파이어베이스에서 내 기록 불러오기
  useEffect(() => {
    const fetchPb = async () => {
      // 1. 구글 로그인 유저면 uid, 아니면 로컬 기기 고유 ID 사용
      let uid = auth.currentUser?.uid || localStorage.getItem("labgg_device_id");
      if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem("labgg_device_id", uid);
      }
      setUserId(uid);

      try {
        const docRef = doc(db, "records", uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().alphabet) {
          setPb(docSnap.data().alphabet);
        }
      } catch (error) {
        console.error("🔥 Firebase DB 로드 실패:", error);
      }
    };
    
    // Auth 상태가 준비되는 시간을 살짝 기다렸다가 불러옴
    setTimeout(fetchPb, 500); 
  }, []);

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

        // 🚀 [DB 연동 2] 신기록일 경우 파이어베이스에 바로 덮어쓰기!
        if (!pb || timeInSeconds < pb) {
          setPb(timeInSeconds);
          setIsNewPb(true);
          
          if (userId) {
            try {
              // records 컬렉션 -> 유저 ID 문서 -> alphabet 필드 업데이트
              await setDoc(doc(db, "records", userId), {
                alphabet: timeInSeconds,
                updatedAt: new Date()
              }, { merge: true });
              console.log("🔥 Firebase DB 저장 완료!");
            } catch (error) {
              console.error("🔥 Firebase DB 저장 실패:", error);
            }
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
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Tab" || (status === "finished" && e.key === "Enter")) {
        e.preventDefault();
        handleReset();
        return;
      }
      if (status === "finished" || e.keyCode === 229) return; 

      let typedChar = "";
      if (e.code && e.code.startsWith("Key")) {
        typedChar = e.code.replace("Key", ""); 
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        typedChar = e.key.toUpperCase();
      } else return;

      e.preventDefault(); 
      processChar(typedChar);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, status, startTime, pb, userId]); // userId 의존성 추가

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
      if (status !== "finished" && inputRef.current) inputRef.current.focus();
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

  const displayTime = status === "finished" && finalTime 
    ? (finalTime / 1000).toFixed(3) 
    : (currentTime / 1000).toFixed(3);

  const accuracy = status === "finished" 
    ? ((26 / (26 + errors)) * 100).toFixed(1) 
    : "100";

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <Header />
      <input ref={inputRef} type="text" onChange={handleInput} className="absolute opacity-0 -z-10 pointer-events-none" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col justify-center pt-16 pb-32 relative z-10">
        <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors mb-8 focus:outline-none w-fit">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase mt-px">Back</span>
        </Link>

        <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
          <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-12 text-[var(--c-brand)] transition-opacity duration-300 ${status === "idle" ? "opacity-0" : "opacity-100"}`}>
            {displayTime}
          </div>

          {status !== "finished" ? (
            <div className="relative font-mono text-[2.5rem] sm:text-[4rem] leading-tight tracking-[0.1em] sm:tracking-[0.15em] break-all select-none w-full text-center" style={{ wordSpacing: "4px" }}>
              {ALPHABET.split("").map((char, i) => {
                const isCurrent = i === currentIndex;
                return (
                  <span key={char} className={`relative inline-block transition-colors duration-150 ${i < currentIndex ? "text-[var(--c-text1)]" : isCurrent && isError ? "text-red-500" : isCurrent ? "text-[var(--c-text1)]" : "text-[var(--c-text3)] opacity-40"}`}>
                    {isCurrent && (
                      <span className={`absolute left-0 top-[10%] w-[2px] sm:w-[3px] h-[80%] animate-pulse ${isError ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-[var(--c-brand)] shadow-[0_0_8px_var(--c-brand)]"}`} style={{ transform: "translateX(-4px)" }} />
                    )}
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
                  <div className="mt-2 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-brand)] bg-[var(--c-brand)]/10 px-2.5 py-1 rounded-[4px] uppercase">
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
            <button onClick={handleReset} className="flex items-center justify-center w-14 h-14 rounded-full text-[var(--c-text3)] hover:text-[var(--c-text1)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none group">
              <RotateCcw className="w-6 h-6 group-hover:-rotate-90 transition-transform duration-300" />
            </button>
            <span className="font-mono text-xs text-[var(--c-text3)] opacity-60 uppercase tracking-widest">
              tab / enter to restart
            </span>
          </div>
        </div>
      </main>
      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-white/60 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-t border-black/[0.05] dark:border-white/[0.05] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}