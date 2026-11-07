import { createContext } from "react";
import type { Lang, TKey } from "@/lib/i18n";

export type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
  num: (value: number) => string;
  date: (value: string) => string;
};

// Keep context identity independent of dictionary/provider hot updates.
export const I18nContext = createContext<I18nContextValue | null>(null);