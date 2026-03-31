"use client";

import { useEffect, useState, ReactNode } from "react";
import { useUIStore } from "@/store/uiStore";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as "dark" | "light" | "system" | null;
    if (storedTheme && storedTheme !== theme) {
      setTheme(storedTheme);
    }
  }, [theme, setTheme]);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    let effectiveTheme = theme;
    
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    if (effectiveTheme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  return <>{children}</>;
}
