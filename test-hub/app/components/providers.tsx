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

export function Providers({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("ko");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleLang = () => {
    setLang((prev) => (prev === "ko" ? "en" : "ko"));
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, user }}>
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