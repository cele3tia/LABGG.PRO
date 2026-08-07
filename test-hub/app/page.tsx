"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
// @ts-ignore
import OptionWheel from "../components/OptionWheel"; 
import { Volume2, VolumeX, ArrowRight, Trophy, ExternalLink, Play, Lock, Medal } from "lucide-react";
import { challenges } from "@/app/lib/challenges";
import { useLanguage } from "./components/providers";
import { translations } from "@/app/lib/translations"; 

const challengeDetails: Record<string, { desc: { en: string; ko: string } }> = {
  cps: {
    desc: {
      en: "Click your left mouse button as many times as possible within 60 seconds. Compare your extreme clicking speed with the official Guinness World Record.",
      ko: "60초 동안 마우스 왼쪽 버튼을 최대한 많이 클릭하세요. 기네스 세계 기록과 자신의 클릭 속도를 비교해 보세요."
    }
  },
  default: {
    desc: {
      en: "Test your skills and push your limits in this challenge. Are you ready to beat the world record?",
      ko: "이 챌린지에서 기술을 테스트하고 한계를 뛰어넘으세요. 세계 기록을 깰 준비가 되셨나요?"
    }
  }
};

const getEmbedUrl = (url: string) => {
  if (!url || url === "#") return "";
  let videoId = "";
  if (url.includes("shorts/")) {
    videoId = url.split("shorts/")[1].split("?")[0];
  } else if (url.includes("watch?v=")) {
    videoId = url.split("watch?v=")[1].split("&")[0];
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1].split("?")[0];
  }
  return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
};

export default function HomePage() {
  const router = useRouter();
  
  const context = useLanguage() as any;
  const user = context.user;
  const currentLang = context.language || context.lang || context.locale || "en"; 
  const lang = (currentLang === "ko" ? "ko" : "en") as "en" | "ko";
  
  const t = translations[lang]; 

  // 🚀 시작 위치를 8번(Chimp Test)으로 멀리 둬서, 클릭 시 0번으로 길게 회전하는 맛을 살림
  const START_INDEX = 8;
  const TARGET_INDEX = 0;

  const [mounted, setMounted] = useState(false);
  const [wheelTarget, setWheelTarget] = useState(START_INDEX); 
  const [displayIndex, setDisplayIndex] = useState(START_INDEX); 
  
  const [hasInteracted, setHasInteracted] = useState(false);

  const activeChallenge = challenges[displayIndex];
  const activeDetails = challengeDetails[activeChallenge.id] || challengeDetails.default;

  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const wheelOptions = challenges ? challenges.map(c => c.name) : [];

  const toggleMute = () => setIsMuted(!isMuted);

  const playClickSound = () => {
    if (isMuted) return;
    if (typeof window !== "undefined") {
      if (!clickAudioRef.current) {
        clickAudioRef.current = new Audio("/sounds/click.mp3");
        clickAudioRef.current.volume = 0.5;
      }
      clickAudioRef.current.currentTime = 0;
      clickAudioRef.current.play().catch(() => {});
    }
  };

  const handleChange = (val: any) => {
    let index = typeof val === "number" 
      ? val 
      : challenges.findIndex(c => c.name === val);
      
    if (index !== -1 && index !== displayIndex) {
      setDisplayIndex(index);
      setIsPlayingVideo(false);
    }
  };

  const handleStart = () => {
    playClickSound();
    if (activeChallenge.id === "cps") {
      router.push(`/${activeChallenge.id}`);
    } else {
      alert(`[준비 중] ${activeChallenge.name}${t.readyMsg}`);
    }
  };

  useEffect(() => {
    const mTimer = setTimeout(() => setMounted(true), 50);
    // 🚀 뒤에서 혼자 도는 걸 방지하기 위해 기존 600ms 자동 회전 타이머 완전 삭제!
    return () => {
      clearTimeout(mTimer);
    };
  }, []);

  const isActiveGame = activeChallenge.id === "cps";

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] text-white transition-colors duration-300">
      
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.06)_0%,transparent_65%)] pointer-events-none z-0"></div>

      {!hasInteracted && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050505]/70 backdrop-blur-md cursor-pointer transition-opacity duration-500 group"
          onClick={() => {
            setHasInteracted(true);
            if (typeof window !== "undefined") {
              const tempAudio = new Audio("/sounds/tick.mp3");
              tempAudio.volume = 0;
              tempAudio.play().catch(() => {});
            }
            
            // 🚀 오버레이를 클릭하는 정확히 이 순간에 휠 타겟을 0번(1 Min Clicks)으로 변경!
            setWheelTarget(TARGET_INDEX);
          }}
        >
          <div className="flex flex-col items-center transform transition-transform duration-300 group-hover:scale-105">
            
            <div className="w-20 h-20 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-6 shadow-2xl group-hover:bg-white/10 group-hover:border-white/40 transition-all duration-300">
              <Play className="w-8 h-8 text-white ml-1 opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
              {lang === "ko" ? "화면을 클릭하여 시작하기" : "Click anywhere to start"}
            </h2>
            <p className="text-sm md:text-base font-medium text-gray-400">
              {lang === "ko" ? "사운드 및 애니메이션이 활성화됩니다" : "Enable sound and animations"}
            </p>
          </div>
        </div>
      )}
      
      <Header />

      <div className={`transition-opacity duration-1000 ease-out z-50 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={toggleMute}
          className="fixed bottom-8 left-8 md:bottom-12 md:left-12 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-gray-500 hover:text-white hover:bg-white/10 hover:scale-110 transition-all backdrop-blur-md shadow-sm"
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      <main 
        className={`flex-1 w-full max-w-[1500px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 relative min-h-[calc(100vh-140px)] z-10 pt-12 transition-opacity duration-1000 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        
        <div className="w-full lg:w-[45%] flex justify-start relative">
          <div className="relative w-full max-w-[700px] h-[700px] flex items-center justify-start">
            <OptionWheel 
              items={wheelOptions}
              defaultSelected={wheelTarget} 
              onChange={handleChange}
              loop={true}
              soundUrl="/sounds/tick.mp3"
              soundVolume={isMuted ? 0 : 0.3}
              fontSize={4}
              spacing={1.15}
              curve={1.2}
              tilt={6}
              blur={1.5}
              fade={0.2}
              minOpacity={0.15}
              inset={60} 
            />
          </div>
        </div>

        <div className="w-full lg:w-[50%] flex justify-start pb-12">
          <div className="flex flex-col w-full max-w-[500px]">
            
            <h1 className="text-4xl md:text-[3.8rem] lg:text-[4.2rem] font-black tracking-tighter uppercase leading-none text-white mb-4 transition-all duration-300">
              {activeChallenge.name}
            </h1>
            
            <p className="text-base text-gray-400 mb-8 leading-relaxed whitespace-normal">
              {activeDetails.desc[lang] || activeDetails.desc.en}
            </p>
            
            <div className="w-full grid grid-cols-2 gap-5 mb-8">
              <div className="flex flex-col p-6 bg-white/[0.03] border border-white/10 rounded-xl relative overflow-hidden">
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  {t.worldRecord}
                </div>
                <div className="text-3xl font-black tracking-tighter text-white uppercase mt-2">
                  {activeChallenge.worldRecord}
                </div>
                <div className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                  {t.by} {activeChallenge.holder}
                </div>
              </div>

              {user ? (
                <div className="flex flex-col p-6 bg-white/[0.03] border border-white/10 rounded-xl relative overflow-hidden">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    <Medal className="w-4 h-4 text-blue-500" />
                    {t.yourRecord}
                  </div>
                  {activeChallenge.personalBest !== "-" ? (
                    <>
                      <div className="text-3xl font-black tracking-tighter text-white uppercase mt-2">
                        {activeChallenge.personalBest}
                      </div>
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">
                        {user.displayName || user.email?.split("@")[0]}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col justify-center h-full mt-2">
                      <div className="text-xl font-black tracking-tighter text-white uppercase">
                        {t.noRecord}
                      </div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">
                        {t.playToSet}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div 
                  onClick={() => router.push('/login')}
                  className="group flex flex-col justify-center p-6 bg-blue-500/5 border border-dashed border-blue-500/30 hover:border-blue-500 transition-all rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">
                      {t.yourRecord}
                    </span>
                  </div>
                  <div className="text-xl font-black tracking-tighter text-white uppercase leading-none">
                    {t.loginToSave}
                  </div>
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                    {t.trackStats}
                  </div>
                </div>
              )}
            </div>

            {activeChallenge.video !== "#" && (
              <div className="w-full flex flex-col mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    {t.officialVideo}
                  </span>
                  {activeChallenge.guinness !== "#" && (
                    <a 
                      href={activeChallenge.guinness} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group px-4 py-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] rounded-md text-[11px] font-bold text-gray-300 uppercase tracking-widest transition-colors flex items-center gap-2"
                    >
                      <Trophy className="w-3.5 h-3.5 text-blue-400" />
                      {t.viewGuinness}
                    </a>
                  )}
                </div>

                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-white/10 bg-black group/video shadow-lg">
                  {isPlayingVideo ? (
                    <iframe
                      width="100%"
                      height="100%"
                      src={getEmbedUrl(activeChallenge.video)}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0"
                    ></iframe>
                  ) : (
                    <button 
                      onClick={() => setIsPlayingVideo(true)}
                      className="absolute inset-0 w-full h-full cursor-pointer block overflow-hidden bg-black focus:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={activeChallenge.thumbnail} 
                        alt="Challenge Thumbnail" 
                        className="w-full h-full object-cover transition-transform duration-700 ease-out opacity-80 block"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50 pointer-events-none"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="relative w-20 h-20 bg-gray-500/40 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center group-hover/video:scale-110 group-hover/video:bg-gray-400/50 transition-transform duration-300 shadow-xl">
                          <Play className="w-8 h-8 text-white fill-white ml-1 opacity-90" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="w-full mb-0">
              <button 
                onClick={handleStart}
                className={`group flex items-center justify-between px-8 py-6 font-black text-xl uppercase tracking-widest transition-all w-full rounded-xl shadow-lg ${
                  isActiveGame 
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]" 
                    : "bg-[#111111] text-gray-600 border border-white/5 active:scale-[0.98] cursor-not-allowed"
                }`}
              >
                <span>{isActiveGame ? t.startChallenge : t.comingSoon}</span>
                <ArrowRight className={`w-6 h-6 transition-transform ${isActiveGame ? "group-hover:translate-x-2" : "opacity-50"}`} />
              </button>
            </div>
            
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}