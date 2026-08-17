"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ArrowLeft, Trophy, Medal } from "lucide-react";

// 🚀 파이어베이스 DB 가져오기
import { db } from "../lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface RecordData {
  id: string;
  alphabet: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 파이어베이스에서 A-Z 타이핑 상위 10명 기록 가져오기
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // records 컬렉션에서 alphabet 기록이 짧은 순(오름차순)으로 10개 땡겨오기
        const q = query(collection(db, "records"), orderBy("alphabet", "asc"), limit(10));
        const querySnapshot = await getDocs(q);
        
        const fetchedRecords: RecordData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedRecords.push({
            id: doc.id,
            alphabet: doc.data().alphabet,
          });
        });
        
        setLeaders(fetchedRecords);
      } catch (error) {
        console.error("🔥 랭킹 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div 
      className="min-h-screen flex flex-col transition-colors duration-300 relative"
      style={{ 
        backgroundColor: "var(--c-bg)", 
        color: "var(--c-text1)",
        backgroundImage: "radial-gradient(var(--c-dot) 1px, transparent 1px)",
        backgroundSize: "24px 24px"
      }}
    >
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 flex flex-col pt-24 pb-32 relative z-10">
        
        {/* 뒤로가기 버튼 */}
        <Link 
          href="/"
          className="group flex items-center gap-2 text-[var(--c-text3)] hover:text-[var(--c-text1)] transition-colors mb-10 focus:outline-none w-fit"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-[var(--c-text1)] group-hover:text-[var(--c-bg)] transition-all duration-300">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold tracking-widest uppercase mt-px">Back to Home</span>
        </Link>

        {/* 랭킹 타이틀 영역 */}
        <div className="flex items-center gap-4 mb-12 animate-fade-in-up">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--c-brand)]/10 text-[var(--c-brand)]">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-1">Global Rankings</h1>
            <p className="text-sm font-medium tracking-wide text-[var(--c-text3)] uppercase">Alphabet A-Z - Top 10</p>
          </div>
        </div>

        {/* 🚀 랭킹 리스트 영역 */}
        <div className="flex flex-col gap-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {loading ? (
            // 로딩 중 UI
            <div className="py-20 text-center font-mono text-sm tracking-widest text-[var(--c-text3)] animate-pulse">
              LOADING LEADERBOARD...
            </div>
          ) : leaders.length === 0 ? (
            // 데이터 없을 때 UI
            <div className="py-20 text-center font-mono text-sm tracking-widest text-[var(--c-text3)]">
              NO RECORDS YET. BE THE FIRST!
            </div>
          ) : (
            // 랭킹 데이터 렌더링
            leaders.map((record, index) => {
              const isTop3 = index < 3;
              return (
                <div 
                  key={record.id}
                  className={`group flex items-center justify-between p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${
                    isTop3 
                      ? "bg-white dark:bg-[#141414] border-black/10 dark:border-white/10 shadow-sm" 
                      : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-5 sm:gap-6">
                    {/* 순위 (1, 2, 3등은 특별한 아이콘/색상 적용) */}
                    <div className={`font-mono text-xl sm:text-2xl font-bold w-8 text-center ${
                      index === 0 ? "text-yellow-500" :
                      index === 1 ? "text-gray-400" :
                      index === 2 ? "text-amber-700" : "text-[var(--c-text3)]"
                    }`}>
                      {isTop3 ? <Medal className="w-7 h-7 mx-auto" /> : `#${index + 1}`}
                    </div>

                    {/* 유저 ID (현재는 고유 ID의 앞 6자리만 보여줌) */}
                    <div className="flex flex-col">
                      <span className="font-semibold text-[var(--c-text1)] text-lg">
                        Player_{record.id.slice(0, 5).toUpperCase()}
                      </span>
                      <span className="text-xs font-mono tracking-widest text-[var(--c-text3)] uppercase">
                        Anonymous
                      </span>
                    </div>
                  </div>

                  {/* 기록 (초) */}
                  <div className="font-mono text-xl sm:text-2xl font-bold tracking-tighter text-[var(--c-brand)]">
                    {record.alphabet.toFixed(3)}<span className="text-sm text-[var(--c-text3)] ml-1">SEC</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      <div className="fixed bottom-0 inset-x-0 z-[9000] bg-white/60 dark:bg-[#0a0a0a]/70 backdrop-blur-md border-t border-black/[0.05] dark:border-white/[0.05] transition-colors duration-300">
        <Footer />
      </div>
    </div>
  );
}