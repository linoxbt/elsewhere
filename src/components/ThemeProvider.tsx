"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "light";

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } | null>(
  null,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("elsewhere.theme");
    const next: Theme = saved === "light" || saved === "dark" ? saved : "dark";
    setThemeState(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    localStorage.setItem("elsewhere.theme", next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("ThemeProvider");
  return ctx;
}
