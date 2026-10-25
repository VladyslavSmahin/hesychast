"use client";

// Поле пароля з «оком»: показати / сховати введене.

import { useState, type InputHTMLAttributes } from "react";
import { useT } from "@/features/locale/LocaleContext";

export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const { style, className, ...rest } = props;

  return (
    <div style={{ position: "relative", ...style }}>
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={className ?? "form-input"}
        style={{ width: "100%", paddingRight: 46 }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        style={{
          position: "absolute", top: 0, right: 0, bottom: 0, width: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", border: "none", cursor: "pointer",
          color: visible ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {!visible && <path d="M4 20L20 4" />}
        </svg>
      </button>
    </div>
  );
}
