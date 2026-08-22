"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { ArrowDownAZ, ArrowDownZA, Keyboard, MousePointerClick, Zap, LayoutGrid, Binary, Grip, Search } from "lucide-react";

import { db, auth } from "./lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { useLanguage } from "./components/providers";

// 🚀 1. 좌측 사이드바용 300x600 대형 광고 컴포넌트
const SidebarAd = () => {
  const adPushed = useRef(false);

  useEffect(() => {
    if (!adPushed.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adPushed.current = true;
      } catch (err) {
        console.error("AdSense Error:", err);
      }
    }
  }, []);

  return (
    <div className="sticky top-28 w-[300px] h-[600px] rounded-2xl bg-white dark:bg-[#121212] border border-[var(--c-border)] shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-colors hover:border-[var(--c-accent)]/30 overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--c-text3)] pointer-events-none z-0">
        <span className="text-xs font-bold tracking-widest uppercase opacity-40 mb-1">Advertisement</span>
        <span className="font-mono text-[10px] opacity-30">300 x 600</span>
      </div>
      <ins
        className="adsbygoogle relative z-10"
        // 👇 구글 봇이 헷갈리지 않게 300x600 쐐기 박기!
        style={{ display: "inline-block", width: "300px", height: "600px", background: "transparent" }}
        data-ad-client="ca-pub-9543272564767938"
        data-ad-slot="6841405748" // ✅ 첫 번째로 만드신 사이드바용 ID
      />
    </div>
  );
};

// 🚀 2. 게임 목록 사이에 들어갈 반응형(auto) 인피드 광고 컴포넌트
const InFeedAdCard = () => {
  const adPushed = useRef(false);

  useEffect(() => {
    if (!adPushed.current) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        adPushed.current = true;
      } catch (err) {
        console.error("AdSense Error:", err);
      }
    }
  }, []);

  return (
    <div className="group relative flex flex-col items-center justify-center rounded-2xl bg-white dark:bg-[#121212] border border-[var(--c-border)] transition-all duration-300 ease-out animate-fade-in-up overflow-hidden w-full h-full min-h-[200px] sm:min-h-[250px]">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--c-text3)] pointer-events-none z-0">
        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase opacity-40 mb-1">Advertisement</span>
        <span className="font-mono text-[9px] opacity-30">In-Feed</span>
      </div>
      <ins
        className="adsbygoogle relative z-10 w-full h-full"
        style={{ display: "block", background: "transparent" }}
        data-ad-client="ca-pub-9543272564767938"
        data-ad-slot="7676859748" // ✅ 방금 가져오신 찐 반응형 ID 장착!!!
        data-ad-format="auto"     // ✅ 주신 코드 그대로 auto 적용
        data-full-width-responsive="true"
      />
    </div>
  );
};

const challenges = [
  { id: "alphabet", category: "TYPING", name: "Alphabet A-Z", desc: { en: "Type A to Z as fast as possible.", ko: "A부터 Z까지 최대한 빨리 누르세요." }, icon: ArrowDownAZ, wr: "3.25 SEC", type: "GUINNESS", dbField: "alphabetAZ", order: "asc" }, 
  { id: "alphabet-za", category: "TYPING", name: "Alphabet Z-A", desc: { en: "Type Z to A backwards.", ko: "Z부터 A까지 거꾸로 누르세요." }, icon: ArrowDownZA, wr: "2.88 SEC", type: "GUINNESS", dbField: "alphabetZA", order: "asc" }, 
  { id: "spacebar", category: "TYPING", name: "Spacebar CPS", desc: { en: "Mash the spacebar for 10 seconds.", ko: "10초 동안 스페이스바를 미친듯이 누르세요." }, icon: Keyboard, wr: "--", type: "LABGG.PRO", dbField: "spacebar", order: "desc" }, 
  { id: "cps-60s", category: "CLICK", name: "CPS Test (60s)", desc: { en: "Click as fast as you can for 60 seconds.", ko: "60초 동안 마우스를 최대한 빨리 클릭하세요." }, icon: MousePointerClick, wr: "12.67 CPS", type: "GUINNESS", dbField: "cps60s", order: "desc" }, 
  { id: "cps-10s", category: "CLICK", name: "CPS Test (10s)", desc: { en: "Click as fast as you can for 10 seconds.", ko: "10초 동안 마우스를 최대한 빨리 클릭하세요." }, icon: MousePointerClick, wr: "--", type: "LABGG.PRO" }, 
  { id: "reaction", category: "CLICK", name: "Reaction Time", desc: { en: "Test your visual reflexes.", ko: "시각적 반사 신경을 테스트하세요." }, icon: Zap, wr: "--", type: "LABGG.PRO" },
  { id: "visual-memory", category: "MEMORY", name: "Visual Memory", desc: { en: "Remember an increasingly large board of squares.", ko: "점점 늘어나는 타일 패턴을 기억하세요." }, icon: LayoutGrid, wr: "--", type: "LABGG.PRO", dbField: "visualMemory", order: "desc" },
  { id: "number-memory", category: "MEMORY", name: "Number Memory", desc: { en: "Remember the longest number you can.", ko: "최대한 긴 숫자를 기억하세요." }, icon: Binary, wr: "--", type: "LABGG.PRO" },
  { id: "sequence-memory", category: "MEMORY", name: "Sequence Memory", desc: { en: "Remember an increasingly long pattern.", ko: "점점 길어지는 순서를 기억하세요." }, icon: Grip, wr: "--", type: "LABGG.PRO" }
];

const categoryLabels: Record<string, { en: string, ko: string }> = {
  "ALL": { en: "ALL", ko: "전체" },
  "CLICK": { en: "CLICK", ko: "클릭" },
  "TYPING": { en: "TYPING", ko: "타이핑" },
  "MEMORY": { en: "MEMORY", ko: "메모리" }
};

export default function HomePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const currentLang = lang === "ko" ? "ko" : "en";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  
  const [userPbs, setUserPbs] = useState<Record<string, string>>({});
  const [globalWrs, setGlobalWrs] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchMyRecords = async () => {
      const pbs: Record<string, string> = {};

      const localAz = localStorage.getItem("pb_alphabetAZ");
      if (localAz) pbs["alphabet"] = `${parseFloat(localAz).toFixed(3)}s`;
      
      const localZa = localStorage.getItem("pb_alphabetZA");
      if (localZa) pbs["alphabet-za"] = `${parseFloat(localZa).toFixed(3)}s`;
      
      const localSpace = localStorage.getItem("pb_spacebar");
      if (localSpace) pbs["spacebar"] = `${parseFloat(localSpace).toFixed(2)} CPS`;

      const localCps60 = localStorage.getItem("pb_cps60s");
      if (localCps60) pbs["cps-60s"] = `${parseFloat(localCps60).toFixed(2)} CPS`;
      
      const localVm = localStorage.getItem("pb_visualMemory");
      if (localVm) pbs["visual-memory"] = `Level ${parseInt(localVm)}`;

      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const docRef = doc(db, "records", currentUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.alphabetAZ || data.alphabet) pbs["alphabet"] = `${(data.alphabetAZ || data.alphabet).toFixed(3)}s`;
            if (data.alphabetZA) pbs["alphabet-za"] = `${data.alphabetZA.toFixed(3)}s`;
            if (data.spacebar) pbs["spacebar"] = `${data.spacebar.toFixed(2)} CPS`;
            if (data.cps60s) pbs["cps60s"] = `${data.cps60s.toFixed(2)} CPS`;
            if (data.visualMemory) pbs["visual-memory"] = `Level ${data.visualMemory}`;
          }
        } catch (error) {}
      }

      setUserPbs(pbs);
    };

    const fetchGlobalRecords = async () => {
      const wrs: Record<string, string> = {};
      const recordsCol = collection(db, "records");

      const activeChallenges = challenges.filter(c => c.dbField);

      for (const chal of activeChallenges) {
        try {
          const q = query(recordsCol, orderBy(chal.dbField as string, chal.order as "asc" | "desc"), limit(1));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const topDoc = querySnapshot.docs[0].data();
            const topScore = topDoc[chal.dbField as string];
            
            if (chal.id.includes("alphabet")) {
              wrs[chal.id] = `${topScore.toFixed(3)}s`;
            } else if (chal.id === "spacebar" || chal.id.includes("cps")) {
              wrs[chal.id] = `${topScore.toFixed(2)} CPS`;
            } else if (chal.id === "visual-memory") {
              wrs[chal.id] = currentLang === "ko" ? `레벨 ${topScore}` : `Level ${topScore}`;
            }
          }
        } catch (error) {}
      }
      setGlobalWrs(wrs);
    };

    setTimeout(() => {
      fetchMyRecords();
      fetchGlobalRecords(); 
    }, 300); 

  }, [currentLang]);

  const filteredChallenges = challenges.filter(chal => {
    const matchesCategory = activeCategory === "ALL" || chal.category === activeCategory;
    const matchesSearch = chal.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          chal.desc[currentLang].toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300 relative" style={{ backgroundColor: "var(--c-bg)", color: "var(--c-text1)", backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      <Script 
        id="adsbygoogle-init"
        strategy="lazyOnload"
        crossOrigin="anonymous"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9543272564767938"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        html, body { font-family: 'Inter', sans-serif !important; -webkit-font-smoothing: antialiased !important; }
        
        :root, [data-theme="light"] { --c-bg: #fcfcfc; --c-border: rgba(0,0,0,0.08); --c-dot: rgba(0,0,0,0.06); --c-text1: #111; --c-text2: #555; --c-text3: #999; --c-accent: #FF5500; }
        .dark, [data-theme="dark"] { --c-bg: #0a0a0a; --c-border: rgba(255,255,255,0.08); --c-dot: rgba(255,255,255,0.04); --c-text1: #f3f3f3; --c-text2: #aaa; --c-text3: #666; --c-accent: #FF5500; }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; opacity: 0; }

        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background-color: rgba(150, 150, 150, 0.3); border-radius: 9999px; border: 4px solid var(--c-bg); background-clip: padding-box; }
        ::-webkit-scrollbar-thumb:hover { background-color: rgba(150, 150, 150, 0.5); }

        ins.adsbygoogle { background: transparent !important; }
        ins.adsbygoogle iframe { background: transparent !important; }
        ins.adsbygoogle[data-ad-status="unfilled"] { display: none !important; }
      `}} />

      <Header />

      <div className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 pt-24 sm:pt-28 pb-32 relative z-10 flex items-start justify-center gap-6 lg:gap-10">
        
        <aside className="hidden xl:flex w-[300px] shrink-0 flex-col animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <SidebarAd />
        </aside>

        <main className="w-full max-w-5xl flex flex-col items-center">
          
          <div className="w-full max-w-2xl flex flex-col items-center mb-8 sm:mb-16 animate-fade-in-up">
            <div className="relative w-full mb-5 sm:mb-6 group">
              <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-[var(--c-text3)] group-focus-within:text-[var(--c-accent)] transition-colors duration-300">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={currentLang === "ko" ? "검색..." : "Search..."}
                className="w-full pl-11 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#121212] border border-[var(--c-border)] focus:border-[var(--c-accent)] outline-none transition-all duration-300 text-sm sm:text-base font-medium text-[var(--c-text1)] placeholder-[var(--c-text3)] shadow-sm hover:shadow-md focus:shadow-[0_4px_20px_rgba(255,85,0,0.1)]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {["ALL", "CLICK", "TYPING", "MEMORY"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs font-bold tracking-widest transition-all duration-300 focus:outline-none ${
                    activeCategory === cat 
                      ? "bg-[var(--c-text1)] text-[var(--c-bg)] shadow-md scale-105" 
                      : "bg-black/5 dark:bg-white/5 text-[var(--c-text3)] hover:bg-black/10 dark:hover:bg-white/10 hover:text-[var(--c-text1)]"
                  }`}
                >
                  {categoryLabels[cat][currentLang]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 w-full auto-rows-fr">
            {filteredChallenges.length > 0 ? (
              filteredChallenges.reduce((acc, chal, idx) => {
                const Icon = chal.icon;
                
                const Card = (
                  <button 
                    key={chal.id} 
                    onClick={() => router.push(`/${chal.id}`)} 
                    className="group relative flex flex-row sm:flex-col items-center sm:items-stretch p-4 sm:p-8 sm:pt-10 rounded-2xl bg-white dark:bg-[#121212] border border-[var(--c-border)] hover:border-[var(--c-accent)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(255,85,0,0.06)] transition-all duration-300 ease-out focus:outline-none animate-fade-in-up overflow-hidden h-full"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="text-[var(--c-text3)] opacity-60 group-hover:text-[var(--c-accent)] group-hover:opacity-100 sm:group-hover:-translate-y-1 transition-all duration-300 shrink-0 mr-4 sm:mr-0 sm:mb-5">
                      <Icon className="w-8 h-8 sm:w-14 sm:h-14" strokeWidth={1.5} />
                    </div>

                    <div className="flex flex-col items-start sm:items-center text-left sm:text-center flex-1 w-full min-w-0">
                      <h2 className="text-[15px] sm:text-xl font-bold tracking-tight text-[var(--c-text1)] mb-0.5 sm:mb-3 group-hover:text-[var(--c-accent)] transition-colors truncate w-full">
                        {chal.name}
                      </h2>
                      <p className="text-[11px] sm:text-sm font-medium text-[var(--c-text3)] leading-snug sm:leading-relaxed truncate w-full sm:whitespace-normal sm:break-keep">
                        {chal.desc[currentLang]}
                      </p>
                    </div>

                    <div className="hidden sm:flex w-full items-center justify-between pt-4 mt-auto border-t border-[var(--c-border)] opacity-80 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-start w-1/2">
                        <span className="text-[9px] font-bold tracking-widest text-[var(--c-text3)] uppercase truncate w-full">
                          {chal.type === "GUINNESS" ? (currentLang === "ko" ? "기네스" : "Guinness") : (currentLang === "ko" ? "세계기록" : "World")}
                        </span>
                        <span className="text-xs font-mono font-semibold text-[var(--c-text2)] truncate w-full">
                          {globalWrs[chal.id] ? globalWrs[chal.id] : chal.wr}
                        </span>
                      </div>
                      <div className="flex flex-col items-end w-1/2">
                        <span className="text-[9px] font-bold tracking-widest text-[var(--c-accent)] uppercase">
                          {currentLang === "ko" ? "최고기록" : "PB"}
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--c-text1)]">
                          {userPbs[chal.id] || "--"}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:hidden flex-col items-end justify-center shrink-0 ml-3 pl-4 border-l border-[var(--c-border)] min-w-[50px] mt-auto">
                      <span className="text-[8px] font-bold tracking-widest text-[var(--c-accent)] uppercase">
                        {currentLang === "ko" ? "PB" : "PB"}
                      </span>
                      <span className="text-xs font-mono font-bold text-[var(--c-text1)] mt-0.5">
                        {userPbs[chal.id] || "--"}
                      </span>
                    </div>
                  </button>
                );

                acc.push(Card);

                // 🚀 인피드 광고 위치 유지 (2번째 줄 마지막 칸)
                if (idx === 4 && activeCategory === "ALL") {
                  acc.push(<InFeedAdCard key="in-feed-ad" />);
                }

                return acc;
              }, [] as React.ReactNode[])
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-10 sm:py-20 text-[var(--c-text3)] animate-fade-in-up">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 mb-4 opacity-20" />
                <p className="text-sm sm:text-lg font-medium">
                  {currentLang === "ko" ? "검색 결과가 없습니다." : "No results found."}
                </p>
                <button 
                  onClick={() => { setSearchTerm(""); setActiveCategory("ALL"); }}
                  className="mt-3 sm:mt-4 text-xs sm:text-sm font-bold text-[var(--c-accent)] hover:underline underline-offset-4 transition-all"
                >
                  {currentLang === "ko" ? "초기화" : "Clear filters"}
                </button>
              </div>
            )}
          </div>

        </main>

        <div className="hidden xl:block w-[300px] shrink-0 pointer-events-none" />

      </div>

      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-[var(--c-bg)] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}