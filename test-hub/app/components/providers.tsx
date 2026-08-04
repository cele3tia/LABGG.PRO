"use client";

import { ThemeProvider } from "next-themes";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language } from "@/app/lib/translations";
import { auth } from "@/app/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: typeof translations.ko;
  user: User | null;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, maxAge: number = 31536000) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

export function Providers({ children }: { children: ReactNode }) {
  // 기본값을 영어("en")로 설정
  const [lang, setLang] = useState<Language>("en");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedLang = getCookie("labgg_lang") as Language;
    if (savedLang && (savedLang === "ko" || savedLang === "en")) {
      setLang(savedLang);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleLang = () => {
    setLang((prev) => {
      const nextLang = prev === "ko" ? "en" : "ko";
      setCookie("labgg_lang", nextLang);
      return nextLang;
    });
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, user }}>
      {/* 기본 테마를 다크(dark)로 설정 */}
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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