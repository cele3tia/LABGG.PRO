export interface Challenge {
  id: string;
  name: string; // 🚀 다시 깔끔한 문자열로 복구
  worldRecord: string;
  holder: string;
  personalBest: string;
  guinness: string;
  video: string;
  thumbnail?: string;
}

export const challenges: Challenge[] = [
  { 
    id: "cps", 
    name: "1 Min Clicks", // 🚀 고유명사 감성 유지 (번역 안 함)
    worldRecord: "760 Clicks", 
    holder: "Yiğit Arslan (Yigox)", 
    personalBest: "-", 
    guinness: "https://www.guinnessworldrecords.com/world-records/781836-most-mouse-clicks-in-one-minute", 
    video: "https://www.youtube.com/shorts/babsG1t1oq4",
    thumbnail: "https://i.ytimg.com/vi/babsG1t1oq4/maxresdefault.jpg" 
  },
  { id: "alphabet", name: "Alphabet A-Z", worldRecord: "3.25 SEC", holder: "AlphaTypist", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "typing", name: "Typing Speed", worldRecord: "212 WPM", holder: "Stella", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "reaction", name: "Reaction Time", worldRecord: "101 MS", holder: "Faker", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "spacebar", name: "Spacebar CPS", worldRecord: "17.5 CPS", holder: "John Doe", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "aim", name: "Aim Precision", worldRecord: "99.9 %", holder: "TenZ", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "number-typing", name: "Type 1 to 100", worldRecord: "12.4 SEC", holder: "NumGod", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "number-memory", name: "Number Memory", worldRecord: "24 DIGITS", holder: "MemoryKing", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "chimp", name: "Chimp Test", worldRecord: "41 LVL", holder: "ChimpMaster", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "visual", name: "Visual Memory", worldRecord: "15 LVL", holder: "EyeTracker", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "math", name: "Quick Math", worldRecord: "50 Q/MIN", holder: "Einstein", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
  { id: "scroll", name: "Scroll Speed", worldRecord: "110 M/S", holder: "MouseBreaker", personalBest: "-", guinness: "#", video: "#", thumbnail: "#" },
];