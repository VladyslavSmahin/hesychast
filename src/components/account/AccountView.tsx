"use client";

// Особистий кабінет: особисті дані (ПІБ, телефон, email, адреса доставки за
// замовчуванням), зміна пароля та історія замовлень. Пише в profiles напряму —
// RLS дозволяє лише свій рядок, а роль/email тригер змінити не дасть.

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "@/features/account/AccountContext";
import { useT } from "@/features/locale/LocaleContext";
import { formatPhone, isPhoneValid } from "@/lib/phone";
import PasswordInput from "./PasswordInput";

const MIN_PASSWORD = 8;

interface OrderRow {
  id: string;
  created_at: string;
  status: "new" | "confirmed" | "done" | "canceled";
  total: number;
  address: string | null;
  order_items: { product_name: string; quantity: number; price: number }[];
}

const card: CSSProperties = {
  border: "1px solid var(--border-light)", background: "var(--bg-card)", padding: "22px 22px 24px", marginBottom: 20,
};
const h2: CSSProperties = {
  fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 14, lineHeight: 1.2,
};
const label: CSSProperties = {
  display: "block", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 6,
};
const msg = (ok: boolean): CSSProperties => ({
  fontSize: 12, margin: "10px 0 0", color: ok ? "var(--accent)" : "var(--danger)", lineHeight: 1.5,
});

export default function AccountView() {
  const t = useT();
  const { account, loading, isStaff, refresh, signOut } = useAccount();
  const [denied, setDenied] = useState(false);
  const [reset, setReset] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setDenied(sp.get("denied") === "1");
    setReset(sp.get("reset") === "1");
  }, []);

  if (loading) return <p style={{ color: "var(--text-secondary)" }}>…</p>;
  // сесії немає (вийшли в іншій вкладці) — middleware при наступному запиті поверне на /login
  if (!account) {
    return (
      <p>
        <Link href="/login?next=/account" style={{ color: "var(--accent)" }}>{t("auth.signin")}</Link>
      </p>
    );
  }

  const logout = async () => { await signOut(); window.location.href = "/"; };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>{t("account.title")}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1.1 }}>
            {account.fullName || account.email}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isStaff && <Link href="/admin" className="btn-primary" style={{ textDecoration: "none" }}>{t("account.admin")}</Link>}
          <button type="button" className="btn-secondary" onClick={logout}>{t("account.logout")}</button>
        </div>
      </div>

      {denied && !isStaff && (
        <div style={{ ...card, borderColor: "var(--danger)", fontSize: 13, lineHeight: 1.6 }}>{t("account.denied")}</div>
      )}

      <ProfileForm key={account.id} onSaved={refresh} />
      <PasswordForm highlight={reset} />
      <OrdersList />
    </div>
  );
}

function ProfileForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const t = useT();
  const { account } = useAccount();
  const supabase = useMemo(() => createClient(), []);
  const [fullName, setFullName] = useState(account?.fullName ?? "");
  const [phone, setPhone] = useState(formatPhone(account?.phone ?? ""));
  const [address, setAddress] = useState(account?.defaultAddress ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (!account) return null;

  const phoneOk = !phone.trim() || isPhoneValid(phone);
  const emailChanged = email.trim().toLowerCase() !== account.email.toLowerCase();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOk || busy) return;
    setBusy(true); setResult(null);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim() || null,
      phone: phone.trim() || null,
      default_address: address.trim() || null,
    }).eq("id", account.id);
    if (error) { setResult({ ok: false, text: t("account.saveFailed") }); setBusy(false); return; }

    let text = t("account.saved");
    // зміна email — через Supabase Auth: на нову адресу приходить лист підтвердження
    if (emailChanged) {
      const { error: emailErr } = await supabase.auth.updateUser(
        { email: email.trim().toLowerCase() },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` }
      );
      if (emailErr) { setResult({ ok: false, text: t("account.emailFailed") }); setBusy(false); await onSaved(); return; }
      text = t("account.emailSent");
    }
    await onSaved();
    setResult({ ok: true, text });
    setBusy(false);
  };

  return (
    <form style={card} onSubmit={save}>
      <h2 style={h2}>{t("account.personal")}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "var(--form-2col)", gap: 12 }}>
        <div>
          <span style={label}>{t("account.fullName")}</span>
          <input className="form-input" style={{ width: "100%" }} autoComplete="name"
            value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <span style={label}>{t("account.phone")}</span>
          <input className="form-input" style={{ width: "100%" }} type="tel" inputMode="numeric" autoComplete="tel"
            placeholder="093 728 42 98" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={label}>Email</span>
        <input className="form-input" style={{ width: "100%" }} type="email" autoComplete="email"
          value={email} disabled={account.viaGoogle} onChange={(e) => setEmail(e.target.value)} />
        {account.viaGoogle && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>{t("account.emailGoogle")}</p>}
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={label}>{t("account.address")}</span>
        <textarea className="form-input" style={{ width: "100%", minHeight: 70 }}
          placeholder={t("account.addressPh")} value={address} onChange={(e) => setAddress(e.target.value)} />
        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>{t("account.addressHint")}</p>
      </div>
      {!phoneOk && <p style={msg(false)}>{t("account.phoneBad")}</p>}
      {result && <p style={msg(result.ok)}>{result.text}</p>}
      <button type="submit" className="btn-primary" style={{ marginTop: 16 }} disabled={busy || !phoneOk}>
        {busy ? "…" : t("account.save")}
      </button>
    </form>
  );
}

function PasswordForm({ highlight }: { highlight: boolean }) {
  const t = useT();
  const { account } = useAccount();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (pwd.length < MIN_PASSWORD) { setResult({ ok: false, text: t("auth.errShort") }); return; }
    if (pwd !== pwd2) { setResult({ ok: false, text: t("account.pwdMismatch") }); return; }
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) { setResult({ ok: false, text: t("account.pwdFailed") }); return; }
    setPwd(""); setPwd2("");
    setResult({ ok: true, text: t("account.pwdSaved") });
  };

  return (
    <form style={{ ...card, ...(highlight ? { borderColor: "var(--accent)" } : null) }} onSubmit={submit}>
      <h2 style={h2}>{account?.viaGoogle ? t("account.pwdSet") : t("account.pwdChange")}</h2>
      {highlight && <p style={{ fontSize: 13, margin: "0 0 12px" }}>{t("account.pwdReset")}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "var(--form-2col)", gap: 12 }}>
        <PasswordInput autoComplete="new-password" placeholder={t("account.pwdNew")}
          value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <PasswordInput autoComplete="new-password" placeholder={t("account.pwdRepeat")}
          value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
      </div>
      {result && <p style={msg(result.ok)}>{result.text}</p>}
      <button type="submit" className="btn-secondary" style={{ marginTop: 16 }} disabled={busy || !pwd || !pwd2}>
        {busy ? "…" : t("account.pwdBtn")}
      </button>
    </form>
  );
}

function OrdersList() {
  const t = useT();
  const { account } = useAccount();
  const userId = account?.id;
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    // фільтр по user_id обовʼязковий: staff за RLS бачить усі замовлення магазину
    supabase
      .from("orders")
      .select("id, created_at, status, total, address, order_items(product_name, quantity, price)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setFailed(true);
        else setOrders((data as OrderRow[]) ?? []);
      });
  }, [supabase, userId]);

  return (
    <div style={card}>
      <h2 style={h2}>{t("account.orders")}</h2>
      {failed ? (
        <p style={msg(false)}>{t("account.ordersFailed")}</p>
      ) : orders === null ? (
        <p style={{ color: "var(--text-secondary)" }}>…</p>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("account.ordersEmpty")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {orders.map((o) => (
            <div key={o.id} style={{ padding: "14px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>
                  {new Date(o.created_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  <span style={{ marginLeft: 10, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: o.status === "canceled" ? "var(--danger)" : "var(--accent)" }}>
                    {t(`order.status.${o.status}`)}
                  </span>
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>{Number(o.total)} грн</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                {o.order_items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
                {o.address && <div>{o.address}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
