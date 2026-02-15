"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { LanguageEntry } from "@/lib/types";

interface ActiveLanguageContextValue {
  activeLanguage: LanguageEntry | null;
  setActiveLanguage: (lang: LanguageEntry | null) => void;
}

const ActiveLanguageCtx = createContext<ActiveLanguageContextValue | null>(null);

export function ActiveLanguageProvider({ children }: { children: ReactNode }) {
  const [activeLanguage, setActiveLanguageState] = useState<LanguageEntry | null>(null);

  const setActiveLanguage = useCallback((lang: LanguageEntry | null) => {
    setActiveLanguageState(lang);
  }, []);

  return (
    <ActiveLanguageCtx.Provider value={{ activeLanguage, setActiveLanguage }}>
      {children}
    </ActiveLanguageCtx.Provider>
  );
}

export function useActiveLanguage() {
  const ctx = useContext(ActiveLanguageCtx);
  if (!ctx) throw new Error("useActiveLanguage must be used within ActiveLanguageProvider");
  return ctx;
}
