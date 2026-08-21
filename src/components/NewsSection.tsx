"use client";

// Останній блок головної: свіжі дописи з відкритих Telegram-каналів.
// Вигляд — як повідомлення в Telegram: бульбашка з підписом каналу, текстом і часом.
// Дані збирає крон (/api/cron/tg-news); тут лише показ збереженого.

import Image from "next/image";
import { usePublicNews, useGloss } from "@/features/publicData";
import { useT } from "@/features/locale/LocaleContext";
import { Icon } from "./icons";

const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

// у картці лишаємо короткий уривок — повний текст читається в Telegram
const SNIPPET = 180;
const snippet = (t: string) => (t.length > SNIPPET ? t.slice(0, SNIPPET).trimEnd() + "…" : t);

export default function NewsSection() {
  const news = usePublicNews();
  const t = useT();
  const title = useGloss("title_news");
  const subtitle = useGloss("subtitle_news");
  if (!news.length) return null;

  return (
    <section id="news" style={{ padding: "var(--py) var(--page-pad)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <h2 className="section-title" style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1.05, color: "var(--text-primary)", marginBottom: 8 }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24, letterSpacing: 0.5 }}>
          {subtitle}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "var(--news-cols, repeat(4, 1fr))", gap: 14, alignItems: "stretch" }}>
          {news.map((n) => (
            <a
              key={n.id}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", flexDirection: "column", height: "100%", textDecoration: "none", color: "inherit",
                // бульбашка як у Telegram: заокруглена, з «хвостиком»-кутом ліворуч знизу
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "12px 12px 12px 4px", overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px 6px" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#229ED9", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon.Telegram width="12" height="12" />
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {n.channel}
                </span>
              </div>

              {n.image && (
                <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--bg-dark)", margin: "0 6px" }}>
                  <Image src={n.image} alt="" fill sizes="(max-width: 860px) 100vw, 300px" style={{ objectFit: "cover", borderRadius: 8 }} unoptimized />
                </div>
              )}

              {n.text && (
                <p
                  style={{
                    fontSize: 13, fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.55, opacity: 0.9,
                    padding: "8px 12px 0", whiteSpace: "pre-line",
                    display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 5, overflow: "hidden",
                  }}
                >
                  {snippet(n.text)}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px 10px", marginTop: "auto" }}>
                <span style={{ fontSize: 11, color: "#229ED9", letterSpacing: 0.3 }}>{t("news.read")}</span>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fmtDate(n.postedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
