"use client";

// Форма відгуку живе в модалці — її відкриває кнопка «Залишити відгук»
// у блоці «Наші клієнти». Окремої секції з формою на сторінці більше немає.

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { TEXTS } from "@/data/site";
import { useAccount } from "@/features/account/AccountContext";

export default function ReviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // залогінений — пише від імені акаунта, імʼя й контакт сервер бере з профілю
  const { account } = useAccount();
  const asAccount = !!account;
  const filled = asAccount ? !!text : !!(name && contact && text);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!filled || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contact, rating, text }),
      });
    } catch {
      /* навіть якщо не дійшло — показуємо подяку, відгук не критичний */
    } finally {
      setSubmitting(false);
    }
    setSent(true);
    setTimeout(() => {
      setName(""); setContact(""); setText(""); setRating(0); setSent(false);
      onClose();
    }, 2600);
  };

  return (
    <div
      onClick={onClose}
      className="fade-in"
      style={{
        position: "fixed", inset: 0, zIndex: 1100, background: "var(--overlay-strong)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-pop"
        style={{
          width: "min(560px, 100%)", maxHeight: "90vh", overflowY: "auto", position: "relative",
          background: "var(--bg-card)", border: "1px solid var(--border-light)", padding: "28px 28px 32px",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Закрити"
          style={{
            position: "absolute", top: 16, right: 16, width: 34, height: 34, background: "transparent",
            border: "1px solid var(--border-light)", color: "var(--text-primary)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon.Close width="13" height="13" />
        </button>

        {sent ? (
          <div style={{ padding: "40px 10px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
              Дякуємо!
            </div>
            <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.6 }}>{TEXTS.reviewThanks}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Ваша думка важлива</div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: "var(--text-primary)", marginBottom: 10 }}>
              Залишити відгук
            </h3>
            <p style={{ fontSize: 13, fontWeight: 300, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 20 }}>
              Поділіться враженнями від покупки. Ми читаємо кожен відгук.
            </p>

            {asAccount ? (
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                Відгук від акаунта <b style={{ color: "var(--text-primary)" }}>{account.fullName || account.email}</b>
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "var(--form-2col)", gap: 12, marginBottom: 12 }}>
                <input className="form-input" placeholder="Ім'я" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="form-input" placeholder="Телефон або email" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
            )}

            <div style={{ marginBottom: 12, padding: "14px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 300, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)" }}>Оцінка:</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className="star"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{ color: n <= (hoverRating || rating) ? "var(--gold)" : "var(--border-light)" }}
                  >
                    <Icon.Star width="22" height="22" filled={n <= (hoverRating || rating)} />
                  </span>
                ))}
              </div>
            </div>

            <textarea className="form-input" placeholder="Ваш відгук..." value={text} onChange={(e) => setText(e.target.value)} style={{ marginBottom: 20, width: "100%" }} />

            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={!filled || submitting}>
              {submitting ? "Надсилаємо…" : "Надіслати"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
