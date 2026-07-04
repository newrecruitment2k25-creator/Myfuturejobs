import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Lang } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "MYFutureJobs_lang";

const VALID_LANGS: Lang[] = ["en", "bm", "zh", "ta"];

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_LANGS.includes(stored as Lang) ? (stored as Lang) : "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string): string => (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
