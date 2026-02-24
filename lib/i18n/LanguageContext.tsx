"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { translations, type Locale, type Translations } from "./translations";

/** Replace {key} placeholders in a translation string */
export function interpolate(
  str: string,
  params: Record<string, string | number>
): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
}

interface LangContext {
  locale: Locale;
  t: Translations;
  setLocale: (l: Locale) => void;
}

const LanguageContext = createContext<LangContext>({
  locale: "it",
  t: translations.it,
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("it");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "it" || saved === "en") setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem("locale", l);
  }

  return (
    <LanguageContext.Provider value={{ locale, t: translations[locale], setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslations() {
  return useContext(LanguageContext);
}
