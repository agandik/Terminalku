import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/** Pilihan user: mengikuti OS, atau dipaksa terang/gelap. */
export type ThemeMode = "light" | "dark" | "system";
/** Hasil akhir setelah "system" diselesaikan — hanya ini yang dipakai CSS. */
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "remote_app_theme";
const MEDIA_QUERY = "(prefers-color-scheme: light)";

function readStoredMode(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia?.(MEDIA_QUERY).matches ? "light" : "dark";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? systemTheme() : mode;
}

interface ThemeContextType {
  /** Preferensi tersimpan (bisa "system"). */
  mode: ThemeMode;
  /** Tema yang benar-benar aktif di layar. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Toggle cepat untuk tombol di TitleBar: terang ⇄ gelap (keluar dari "system"). */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  resolved: "dark",
  setMode: () => {},
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolve(readStoredMode()));

  // Satu sumber kebenaran: atribut di <html> yang dibaca semua selector [data-theme] di CSS.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolved);
    // Supaya widget bawaan (scrollbar, popup <select>, caret) ikut mode.
    root.style.colorScheme = resolved;
  }, [resolved]);

  // Mode "system" harus ikut berubah realtime saat tema OS diganti.
  useEffect(() => {
    if (mode !== "system") {
      setResolved(mode);
      return;
    }
    setResolved(systemTheme());

    const mq = window.matchMedia?.(MEDIA_QUERY);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setResolved(e.matches ? "light" : "dark");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(() => {
    setMode(resolved === "dark" ? "light" : "dark");
  }, [resolved, setMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
