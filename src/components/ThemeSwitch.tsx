"use client";

// Перемикач теми оформлення: сонце (світла) / місяць (темна).
// Візуально повторює LocaleSwitch, щоб у шапці вони читались як одна група.

import { useTheme } from "@/features/theme/ThemeContext";

export default function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const size = compact ? 34 : 38;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={dark ? "Світла тема" : "Темна тема"}
      title={dark ? "Світла тема" : "Темна тема"}
      style={{
        width: size, height: size, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-light)", borderRadius: 4,
        background: "transparent", color: "var(--accent)",
        cursor: "pointer", transition: "color 0.2s, border-color 0.2s, background 0.2s",
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}

function Sun() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.5 6.5 4.9 4.9M19.1 19.1l-1.6-1.6M17.5 6.5l1.6-1.6M4.9 19.1l1.6-1.6" />
    </svg>
  );
}

function Moon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8Z" />
    </svg>
  );
}
