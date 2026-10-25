"use client";

// Вхід і реєстрація на вітрині: Google або email + пароль.
// Один акаунт і для покупців, і для співробітників — роль вирішує, чи пустить у /admin.

import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/features/locale/LocaleContext";
import PasswordInput from "./PasswordInput";

type Mode = "signin" | "signup" | "reset";

const MIN_PASSWORD = 8;

const tabBtn = (active: boolean): CSSProperties => ({
  flex: 1, padding: "12px 4px", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 11,
  letterSpacing: 1.4, textTransform: "uppercase",
  background: active ? "var(--bg-elevated)" : "transparent",
  border: `1px solid ${active ? "var(--accent)" : "var(--border-light)"}`,
  color: active ? "var(--accent)" : "var(--text-secondary)",
});

export default function LoginForm() {
  const t = useT();
  const [mode, setMode] = useState<Mode>("signin");
  const [next, setNext] = useState("/account");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
    if (sp.get("error") === "auth") setError(t("auth.errLink"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (m: Mode) => { setMode(m); setError(""); setNotice(""); };
  const callbackUrl = (to: string) => `${window.location.origin}/auth/callback?next=${encodeURIComponent(to)}`;

  const google = async () => {
    setBusy(true); setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next) },
    });
    if (error) { setError(t("auth.errGeneric")); setBusy(false); }
    // інакше браузер перейде на сторінку Google
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eml = email.trim().toLowerCase();
    setBusy(true); setError(""); setNotice("");
    const supabase = createClient();

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(eml, { redirectTo: callbackUrl("/account?reset=1") });
      setBusy(false);
      if (error) setError(t("auth.errGeneric"));
      else setNotice(t("auth.resetSent"));
      return;
    }

    if (mode === "signup") {
      if (password.length < MIN_PASSWORD) { setError(t("auth.errShort")); setBusy(false); return; }
      const { data, error } = await supabase.auth.signUp({
        email: eml,
        password,
        options: { data: { full_name: fullName.trim() }, emailRedirectTo: callbackUrl(next) },
      });
      if (error) {
        setError(/registered|exists/i.test(error.message) ? t("auth.errExists") : t("auth.errGeneric"));
        setBusy(false);
        return;
      }
      // якщо в Supabase увімкнено підтвердження email — сесії ще немає, чекаємо лист
      if (!data.session) { setNotice(t("auth.confirmSent")); setBusy(false); return; }
      window.location.href = next;
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: eml, password });
    if (error) {
      setError(/confirm/i.test(error.message) ? t("auth.errNotConfirmed") : t("auth.errCredentials"));
      setBusy(false);
      return;
    }
    window.location.href = next;
  };

  const canSubmit =
    !!email.trim() && (mode === "reset" || !!password) && (mode !== "signup" || !!fullName.trim());

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1.1, marginBottom: 24 }}>
        {mode === "signup" ? t("auth.signupTitle") : mode === "reset" ? t("auth.resetTitle") : t("auth.signinTitle")}
      </h1>

      {mode !== "reset" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <button type="button" style={tabBtn(mode === "signin")} onClick={() => switchMode("signin")}>{t("auth.signin")}</button>
            <button type="button" style={tabBtn(mode === "signup")} onClick={() => switchMode("signup")}>{t("auth.signup")}</button>
          </div>

          <button type="button" className="btn-secondary" onClick={google} disabled={busy}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <GoogleIcon />
            {t("auth.google")}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0", color: "var(--text-secondary)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase" }}>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            {t("auth.or")}
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>
        </>
      )}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {mode === "signup" && (
          <input className="form-input" placeholder={t("account.fullName")} autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
        )}
        <input className="form-input" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        {mode !== "reset" && (
          <PasswordInput placeholder={t("auth.password")}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} />
        )}
        {mode === "signup" && (
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{t("auth.passwordHint")}</p>
        )}

        {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0, lineHeight: 1.5 }}>{error}</p>}
        {notice && <p style={{ fontSize: 12, color: "var(--accent)", margin: 0, lineHeight: 1.5 }}>{notice}</p>}

        <button type="submit" className="btn-primary" disabled={busy || !canSubmit} style={{ width: "100%", marginTop: 4 }}>
          {busy ? "…" : mode === "signup" ? t("auth.signupBtn") : mode === "reset" ? t("auth.resetBtn") : t("auth.signinBtn")}
        </button>
      </form>

      <div style={{ marginTop: 18, fontSize: 12, textAlign: "center" }}>
        {mode === "signin" && (
          <button type="button" onClick={() => switchMode("reset")} style={linkBtn}>{t("auth.forgot")}</button>
        )}
        {mode === "reset" && (
          <button type="button" onClick={() => switchMode("signin")} style={linkBtn}>← {t("auth.signin")}</button>
        )}
      </div>
    </div>
  );
}

const linkBtn: CSSProperties = {
  background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer",
  textDecoration: "underline", fontFamily: "var(--font-body)", fontSize: 12,
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}
