import Header from "./components/Header";

export default function Home() {
  return (
    // 👇 bg-white 뒤에 dark:bg-[#0a0a0a], text-black 뒤에 dark:text-white를 추가했습니다.
    // transition-colors duration-300을 넣으면 색이 바뀔 때 애니메이션처럼 부드럽게 스르륵 변합니다.
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white font-sans transition-colors duration-300">
      
      {/* 분리된 헤더 컴포넌트 적용 */}
      <Header />

      {/* 메인 콘텐츠 영역 (비워둠) */}
      <main className="p-6">
        
      </main>

    </div>
  );
}