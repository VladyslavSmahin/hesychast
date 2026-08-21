"use client";

// Перемикач мови інтерфейсу: UA / RU.

import { useLocale } from "@/features/locale/LocaleContext";
import { LOCALES } from "@/lib/i18n";

export default function LocaleSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale();

  return (
    <div style={{ display: "inline-flex", border: "1px solid var(--border-light)", borderRadius: 4, overflow: "hidden" }}>
      {LOCALES.map((l) => {
        const active = l.value === locale;
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => setLocale(l.value)}
            aria-label={l.label}
            title={l.label}
            style={{
              padding: compact ? "5px 8px" : "6px 10px",
              fontSize: compact ? 11 : 12,
              letterSpacing: 1,
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#0A0908" : "var(--text-secondary)",
              border: "none",
              cursor: active ? "default" : "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {l.short}
          </button>
        );
      })}
    </div>
  );
}
