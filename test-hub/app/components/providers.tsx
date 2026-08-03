"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useContext, useState, ReactNode } from "react";
import { translations, Language } from "../lib/translations"; // 👈 lib 폴더를 바라보도록 경로 수정

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: typeof translations.ko;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("ko");

  const toggleLang = () => {
    setLang((prev) => (prev === "ko" ? "en" : "ko"));
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        {children}
      </ThemeProvider>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a Providers");
  }
  return context;
}