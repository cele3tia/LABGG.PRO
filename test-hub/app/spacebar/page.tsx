"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { db, auth } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const TIME_LIMIT = 10; // 10초 동안 테스트

export default function SpacebarChallenge() {
  const [status, setStatus] = useState<"idle" | "playing" | "finished">("idle");
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(TIME_LIMIT);
  
  const [pb, setPb] = useState<number | null>(null);
  const [isNewPb, setIsNewPb] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // 🚀 DB에서 내 최고 기록(PB) 불러오기
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
        // spacebar 필드가 있으면 불러오기
        if (docSnap.exists() && docSnap.data().spacebar) {
          setPb(docSnap.data().spacebar);
        }
      } catch (error) {
        console.error("🔥 DB 로드 실패:", error);
      }
    };
    setTimeout(fetchPb, 500); 
  }, []);

  // 🚀 스페이스바 눌렀을 때 로직
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // 스페이스바 눌렀을 때 화면 스크롤 내려가는 거 방지!
        
        if (status === "finished") return;

        if (status === "idle") {
          setStatus("playing");
          setStartTime(performance.now());
          setCount(1);
        } else if (status === "playing") {
          setCount((prev) => prev + 1);
        }
      }

      // 재시작 단축키 (Tab 또는 결과 화면에서 Enter)
      if (e.key === "Tab" || (status === "finished" && e.key === "Enter")) {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status]);

  // 🚀 타이머 깎이는 애니메이션 로직
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

  // 🚀 게임 종료 시 DB 저장 (신기록 처리)
  useEffect(() => {
    if (status === "finished") {
      const finalCps = count / TIME_LIMIT;
      
      // 스페이스바는 숫자가 "높을수록" 신기록입니다! (알파벳이랑 반대)
      if (!pb || finalCps > pb) {
        setPb(finalCps);
        setIsNewPb(true);
        
        if (userId) {
          const saveRecord = async () => {
            try {
              const currentUser = auth.currentUser;
              const dataToSave: any = {
                spacebar: finalCps, // spacebar 종목으로 저장
                updatedAt: new Date()
              };

              if (currentUser) {
                dataToSave.uid = currentUser.uid;
                dataToSave.email = currentUser.email || "";
                dataToSave.displayName = currentUser.displayName || "익명 타자수";
              }

              await setDoc(doc(db, "records", userId), dataToSave, { merge: true });
            } catch (error) {
              console.error("🔥 DB 저장 실패:", error);
            }
          };
          saveRecord();
        }
      } else {
        setIsNewPb(false);
      }
    }
  }, [status, count, pb, userId]);

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

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-6 flex flex-col justify-center pt-16 pb-32 relative z-10">
        <Link href="/" className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors mb-8 focus:outline-none w-fit">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase mt-px">Back</span>
        </Link>

        <div className="flex flex-col items-center justify-center w-full min-h-[400px]">
          
          {/* 상단 타이머 (플레이 중에만 표시) */}
          <div className={`font-mono text-3xl sm:text-4xl font-semibold tracking-tighter mb-12 text-[var(--c-brand)] transition-opacity duration-300 ${status === "idle" ? "opacity-0" : "opacity-100"}`}>
            {timeLeft.toFixed(3)}s
          </div>

          {status === "idle" && (
            <div className="font-mono text-[2rem] sm:text-[3rem] font-bold tracking-tight text-[var(--c-text3)] opacity-60 animate-pulse text-center">
              PRESS SPACEBAR TO START
            </div>
          )}

          {status === "playing" && (
            <div className="flex flex-col items-center">
              <div className="text-[6rem] sm:text-[10rem] font-bold font-mono tracking-tighter leading-none text-[var(--c-text1)]">
                {count}
              </div>
              <div className="text-xl sm:text-2xl font-mono font-bold text-[var(--c-text3)] mt-2">
                {currentCps} CPS
              </div>
            </div>
          )}

          {status === "finished" && (
            <div className="flex flex-col items-center animate-fade-in-up">
              <div className="flex items-start gap-3 text-6xl sm:text-8xl font-mono font-bold tracking-tighter text-[var(--c-text1)] mb-4">
                {(count / TIME_LIMIT).toFixed(2)}<span className="text-3xl sm:text-5xl text-[var(--c-text3)] mt-3">CPS</span>
                {isNewPb && (
                  <div className="mt-2 text-[10px] sm:text-xs font-bold tracking-widest text-[var(--c-brand)] bg-[var(--c-brand)]/10 px-2.5 py-1 rounded-[4px] uppercase">
                    PB
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 sm:gap-6 text-[var(--c-text3)] font-mono text-lg sm:text-xl mb-12">
                {!isNewPb && pb && (
                  <>
                    <span>PB: <span className="text-[var(--c-text1)] font-semibold">{pb.toFixed(2)} CPS</span></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                  </>
                )}
                <span>Total: <span className="text-[var(--c-text1)] font-semibold">{count}</span> Clicks</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--c-border)]" />
                <span>Time: <span className="text-[var(--c-text1)] font-semibold">{TIME_LIMIT}s</span></span>
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