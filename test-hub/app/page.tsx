"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "./components/Header";
import Footer from "./components/Footer";
import OptionWheel from "../components/OptionWheel"; 
import { Volume2, VolumeX, ArrowRight, Trophy, ExternalLink, Play, Lock, Medal } from "lucide-react";
import { challenges } from "@/app/lib/challenges";
import { useLanguage } from "./components/providers";

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
  const { user } = useLanguage();
  
  const START_INDEX = 4;
  const TARGET_INDEX = 0;

  const [mounted, setMounted] = useState(false);
  
  const [wheelTarget, setWheelTarget] = useState(START_INDEX); 
  const [displayIndex, setDisplayIndex] = useState(START_INDEX); 

  const activeChallenge = challenges[displayIndex];

  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  
  const clickAudioRef = useRef<HTMLAudioElement | null>(null);
  const wheelOptions = challenges.map(c => c.name);

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
    let index = typeof val === "number" ? val : challenges.findIndex(c => c.name === val);
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
      alert(`[준비 중] ${activeChallenge.name} 챌린지는 곧 오픈됩니다!`);
    }
  };

  useEffect(() => {
    const mTimer = setTimeout(() => setMounted(true), 50);
    const rTimer = setTimeout(() => {
      setWheelTarget(TARGET_INDEX);
    }, 600);

    return () => {
      clearTimeout(mTimer);
      clearTimeout(rTimer);
    };
  }, []);

  const isActiveGame = activeChallenge.id === "cps";

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a] text-black dark:text-gray-200 transition-colors duration-300">
      <Header />

      <div className={`transition-opacity duration-1000 ease-out ${mounted ? "opacity-100" : "opacity-0"}`}>
        <button
          onClick={toggleMute}
          className="fixed bottom-8 left-8 md:bottom-12 md:left-12 z-50 p-3 rounded-full bg-gray-100/50 dark:bg-[#111111]/80 border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:scale-110 transition-all backdrop-blur-sm shadow-sm"
          aria-label="Toggle Sound"
        >
          {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
        </button>
      </div>

      <main 
        className={`flex-1 w-full max-w-[1500px] mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 select-none relative transition-opacity duration-1000 ease-out ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
      >
        
        {/* 🚀 왼쪽 휠 영역 확장 (lg:w-1/2 -> lg:w-7/12) */}
        <div className="w-full lg:w-7/12 flex items-center justify-center lg:justify-end shrink-0 relative">
          <div className="absolute w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          {/* 🚀 휠 컨테이너 크기 확장 */}
          <div className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px] lg:w-[650px] lg:h-[650px] flex items-center justify-center">
            <OptionWheel 
              items={wheelOptions}
              defaultSelected={wheelTarget} 
              onChange={handleChange}
              loop={true}
              textColor="var(--muted-foreground)"
              activeColor="var(--foreground)"
              soundUrl="/sounds/tick.mp3"
              soundVolume={isMuted ? 0 : 0.3}
              /* 🚀 휠 폰트를 키우고 간격을 쫀쫀하게 조절! */
              fontSize={4}
              spacing={1.2}
            />
          </div>
        </div>

        {/* 🚀 오른쪽 대시보드 영역 축소 (lg:w-1/2 -> lg:w-5/12) */}
        <div className="w-full lg:w-5/12 flex flex-col items-center lg:items-start text-center lg:text-left z-10 pl-0 lg:pl-4">
          
          {/* 🚀 텍스트 크기 살짝 다이어트 */}
          <h1 className="text-4xl md:text-5xl lg:text-[4rem] font-black tracking-tighter uppercase leading-[0.95] mb-6 dark:text-white transition-all duration-300">
            {activeChallenge.name}
          </h1>
          
          {/* 🚀 최대 너비(max-w)를 550px에서 460px로 줄여 컴팩트하게! */}
          <div className="flex flex-col gap-5 w-full max-w-[460px] items-center lg:items-start">
            
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              
              {/* 🚀 패딩 축소 (p-6 -> p-5) */}
              <div className="flex flex-col gap-1.5 p-5 bg-gray-50/50 dark:bg-[#111111]/80 border border-gray-200 dark:border-gray-800 rounded-xl">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Trophy className="w-4 h-4 text-blue-500" />
                  World Record
                </div>
                <div className="text-2xl lg:text-3xl font-black tracking-tighter text-black dark:text-white uppercase mt-1">
                  {activeChallenge.worldRecord}
                </div>
                <div className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-1">
                  by {activeChallenge.holder}
                </div>
              </div>

              {user ? (
                <div className="flex flex-col gap-1.5 p-5 bg-gray-50/50 dark:bg-[#111111]/80 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <Medal className="w-4 h-4 text-blue-500" />
                    Your Record
                  </div>
                  <div className="text-2xl lg:text-3xl font-black tracking-tighter text-black dark:text-white uppercase mt-1">
                    {activeChallenge.personalBest}
                  </div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">
                    {user.displayName || user.email?.split("@")[0]}
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => router.push('/login')}
                  className="group flex flex-col justify-center gap-1 p-5 bg-blue-50 dark:bg-blue-500/5 border border-dashed border-blue-300 dark:border-blue-500/30 hover:border-blue-500 transition-all rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-widest">
                      Your Record
                    </span>
                  </div>
                  <div className="text-base lg:text-lg font-black tracking-tighter text-gray-800 dark:text-gray-200 uppercase leading-none">
                    Login to Save
                  </div>
                  <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                    Click here to sign in
                  </div>
                </div>
              )}

            </div>

            {activeChallenge.thumbnail && activeChallenge.thumbnail !== "#" && (
              <div className="w-full flex flex-col gap-3">
                <div className="relative w-full aspect-[21/9] sm:aspect-[16/9] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-black">
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
                      className="group absolute inset-0 w-full h-full cursor-pointer block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={activeChallenge.thumbnail} 
                        alt="Video Thumbnail" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-center items-center">
                        <div className="w-14 h-14 bg-blue-600/90 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500 transition-all duration-300">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {activeChallenge.guinness !== "#" && (
                  <div className="flex justify-start px-1 pb-3 border-b border-gray-100 dark:border-gray-900">
                    <a 
                      href={activeChallenge.guinness} 
                      target="_blank" 
                      rel="noreferrer"
                      className="group flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 uppercase tracking-widest transition-colors w-max"
                    >
                      <ExternalLink className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      View Official Guinness Record
                    </a>
                  </div>
                )}
              </div>
            )}

            <div className="w-full mt-1">
              {/* 🚀 버튼 높이 살짝 다이어트 (py-5 -> py-4) */}
              <button 
                onClick={handleStart}
                className={`group flex items-center justify-between px-6 sm:px-8 py-4 font-black text-lg uppercase tracking-widest transition-all w-full rounded-xl ${
                  isActiveGame 
                    ? "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-600/20" 
                    : "bg-gray-100 dark:bg-[#111111] text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-800 active:scale-95 cursor-not-allowed"
                }`}
              >
                <span>{isActiveGame ? "Start Challenge" : "Coming Soon"}</span>
                <ArrowRight className={`w-5 h-5 transition-transform ${isActiveGame ? "group-hover:translate-x-2" : "opacity-50"}`} />
              </button>
            </div>
            
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center lg:text-left h-4 w-full">
              {!isActiveGame && "Scroll to [1 Min Clicks] to start playing."}
            </p>
            
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}