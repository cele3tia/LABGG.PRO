"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ArrowRight, ArrowLeft } from "lucide-react";

import { db, auth } from "./lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const categories = [
  { id: "CLICK", name: "Click", desc: "Mouse physical benchmarks" },
  { id: "TYPING", name: "Typing", desc: "Keyboard physical benchmarks" },
  { id: "MEMORY", name: "Memory", desc: "Cognitive & memory benchmarks" }
];

// 🚀 Typing Speed 영구 삭제! Spacebar CPS 유지!
const challenges = [
  { id: "alphabet", category: "TYPING", name: "Alphabet A-Z", wr: "3.25 SEC", type: "GUINNESS" }, 
  { id: "alphabet-za", category: "TYPING", name: "Alphabet Z-A", wr: "2.88 SEC", type: "GUINNESS" }, 
  { id: "spacebar", category: "TYPING", name: "Spacebar CPS", wr: "--", type: "LABGG.PRO" }, 
  { id: "cps-60s", category: "CLICK", name: "CPS Test (60s)", wr: "12.67 CPS", type: "GUINNESS" }, 
  { id: "cps-10s", category: "CLICK", name: "CPS Test (10s)", wr: "--", type: "LABGG.PRO" }, 
  { id: "reaction", category: "CLICK", name: "Reaction Time", wr: "--", type: "LABGG.PRO" },
  { id: "number-memory", category: "MEMORY", name: "Number Memory", wr: "--", type: "LABGG.PRO" },
  { id: "sequence-memory", category: "MEMORY", name: "Sequence Memory", wr: "--", type: "LABGG.PRO" },
  { id: "chimp-test", category: "MEMORY", name: "Chimp Test", wr: "--", type: "LABGG.PRO" }
];

export default function HomePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userPbs, setUserPbs] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRecords = async () => {
      const uid = auth.currentUser?.uid || localStorage.getItem("labgg_device_id");
      if (!uid) return; 

      try {
        const docRef = doc(db, "records", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const pbs: Record<string, string> = {};
          
          if (data.alphabetAZ || data.alphabet) pbs["alphabet"] = `${(data.alphabetAZ || data.alphabet).toFixed(3)}s`;
          if (data.alphabetZA) pbs["alphabet-za"] = `${data.alphabetZA.toFixed(3)}s`;
          if (data.spacebar) pbs["spacebar"] = `${data.spacebar.toFixed(2)} CPS`;
          
          setUserPbs(pbs);
        }
      } catch (error) {
        console.error("🔥 Firebase DB 로드 에러:", error);
      }
    };

    setTimeout(fetchRecords, 300); 
  }, [selectedCategory]);

  const filteredChallenges = challenges.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        html, body { font-family: 'Inter', sans-serif !important; -webkit-font-smoothing: antialiased !important; }
        :root, [data-theme="light"] { --c-bg: #fcfcfc; --c-border: rgba(0,0,0,0.08); --c-dot: rgba(0,0,0,0.06); --c-text1: #111; --c-text2: #555; --c-text3: #999; --c-brand: #FF5500; }
        .dark, [data-theme="dark"] { --c-bg: #0a0a0a; --c-border: rgba(255,255,255,0.08); --c-dot: rgba(255,255,255,0.04); --c-text1: #f3f3f3; --c-text2: #aaa; --c-text3: #666; --c-brand: #FF5500; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }
      `}} />

      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-12 flex flex-col justify-center pt-16 pb-32">
        <div key={selectedCategory || "home"}>
          
          <div className="mb-10 sm:mb-12 px-2 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors mb-6 sm:mb-8 focus:outline-none w-fit">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold tracking-widest uppercase mt-px">Categories</span>
              </button>
            )}
            <h1 className="text-[2.5rem] sm:text-[3.25rem] font-bold tracking-[-0.04em] leading-tight mb-3" style={{ color: "var(--c-text1)" }}>
              {selectedCategory ? `${selectedCategory}.` : "Select Category."}
            </h1>
            <p className="text-[15px] font-medium tracking-wide font-sans" style={{ color: "var(--c-text3)" }}>
              {selectedCategory ? "Select your challenge" : "Benchmark your physical limits"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {!selectedCategory && categories.map((cat, idx) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className="group relative flex items-center justify-between w-full py-6 px-5 sm:px-8 rounded-2xl border border-transparent hover:bg-white dark:hover:bg-[#141414] hover:border-black/5 dark:hover:border-white/5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] transition-all duration-300 ease-out focus:outline-none animate-fade-in-up text-left overflow-hidden" style={{ animationDelay: `${(idx + 1) * 70}ms` }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--c-brand)] origin-center scale-y-0 transition-transform duration-300 ease-out group-hover:scale-y-100" />
                <div className="flex items-center gap-5 sm:gap-8 transition-transform duration-300 ease-out group-hover:translate-x-2 shrink-0">
                  <span className="font-mono text-sm sm:text-base font-semibold transition-colors duration-300 group-hover:text-[var(--c-brand)]" style={{ color: "var(--c-text3)" }}>{String(idx + 1).padStart(2, '0')}</span>
                  <div className="flex flex-col items-start gap-1">
                    <h2 className="text-xl sm:text-3xl font-bold tracking-[-0.02em] uppercase transition-colors duration-300" style={{ color: "var(--c-text1)" }}>{cat.name}</h2>
                    <p className="text-xs sm:text-[13px] font-medium tracking-wide" style={{ color: "var(--c-text3)" }}>{cat.desc}</p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-transparent bg-transparent group-hover:bg-[#f5f5f5] dark:group-hover:bg-[#222] transition-colors duration-300 overflow-hidden shrink-0">
                  <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 opacity-0 -translate-x-5 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0" style={{ color: "var(--c-text1)" }} />
                </div>
              </button>
            ))}

            {selectedCategory && filteredChallenges.map((chal, idx) => (
              <button key={chal.id} onClick={() => router.push(`/${chal.id}`)} className="group relative flex items-center justify-between w-full py-4 px-4 sm:px-6 rounded-2xl border border-transparent hover:bg-white dark:hover:bg-[#141414] hover:border-black/5 dark:hover:border-white/5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(255,255,255,0.02)] transition-all duration-300 ease-out focus:outline-none animate-fade-in-up text-left overflow-hidden" style={{ animationDelay: `${(idx + 1) * 70}ms` }}>
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--c-brand)] origin-center scale-y-0 transition-transform duration-300 ease-out group-hover:scale-y-100" />
                <div className="flex items-center gap-4 sm:gap-6 transition-transform duration-300 ease-out group-hover:translate-x-2 shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-semibold transition-colors duration-300 group-hover:text-[var(--c-brand)]" style={{ color: "var(--c-text3)" }}>{String(idx + 1).padStart(2, '0')}</span>
                  <h2 className="text-lg sm:text-2xl font-semibold tracking-[-0.02em] uppercase transition-colors duration-300" style={{ color: "var(--c-text1)" }}>{chal.name}</h2>
                </div>

                <div className="flex items-center gap-4 sm:gap-5 transition-transform duration-300 ease-out group-hover:-translate-x-1">
                  <div className="hidden sm:flex items-center gap-4 mr-2 opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex flex-col items-end gap-1.5">
                      {chal.type === "GUINNESS" && (
                        <div className="flex items-center gap-2">
                          <span className="text-[7px] px-1 py-[1.5px] rounded-[3px] font-bold tracking-widest leading-none bg-[var(--c-text3)]/10 text-[var(--c-text3)]">GUINNESS</span>
                          <span className="font-mono text-[12px] font-semibold text-[var(--c-text2)] tracking-tight">{chal.wr}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-[7px] px-1 py-[1.5px] rounded-[3px] font-bold tracking-widest leading-none bg-[var(--c-brand)]/10 text-[var(--c-brand)]">LABGG.PRO</span>
                        <span className="font-mono text-[12px] font-semibold text-[var(--c-text1)] tracking-tight">{chal.type === "LABGG.PRO" ? chal.wr : "--"}</span>
                      </div>
                    </div>
                    
                    <div className="w-[1px] h-8 bg-[var(--c-border)] transition-colors duration-300 group-hover:bg-black/10 dark:group-hover:bg-white/10" />

                    <div className="flex flex-col items-start w-[50px] justify-center">
                      <span className="text-[9px] font-bold tracking-[0.1em] text-[var(--c-text3)] mb-[2px]">PB</span>
                      <span className="font-mono text-[13px] font-semibold text-[var(--c-brand)] tracking-tight">
                        {userPbs[chal.id] || "--"}
                      </span>
                    </div>
                  </div>
                  <div className="relative z-10 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-transparent bg-transparent group-hover:bg-[#f5f5f5] dark:group-hover:bg-[#222] transition-colors duration-300 overflow-hidden shrink-0">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 -translate-x-5 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-x-0" style={{ color: "var(--c-text1)" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-white/60 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-t border-black/[0.05] dark:border-white/[0.05] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}