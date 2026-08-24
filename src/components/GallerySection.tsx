"use client";

// Галерея клієнтів: фото покупців, іноді з відгуком. Горизонтальний слайдер —
// на мобільному гортається пальцем (scroll-snap), на десктопі є стрілки.

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePublicGallery, useGloss } from "@/features/publicData";
import { useT } from "@/features/locale/LocaleContext";
import { Icon } from "./icons";
import ReviewModal from "./ReviewForm";

export default function GallerySection() {
  const items = usePublicGallery();
  const t = useT();
  const title = useGloss("title_clients");
  const subtitle = useGloss("subtitle_clients");
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => { updateArrows(); }, [updateArrows, items.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!items.length) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <section id="gallery" style={{ padding: "var(--py) var(--page-pad)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div>
            <h2 className="section-title" style={{ fontFamily: "var(--font-display)", fontSize: "var(--h2-size)", fontWeight: 700, lineHeight: 1.05, color: "var(--text-primary)", marginBottom: 8 }}>
              {title}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", letterSpacing: 0.5 }}>
              {subtitle}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-secondary" onClick={() => setReviewOpen(true)}>{t("review.leave")}</button>
            <span className="desktop-only" style={{ display: "flex", gap: 8 }}>
              <ArrowBtn dir="left" disabled={atStart} onClick={() => scrollBy(-1)} />
              <ArrowBtn dir="right" disabled={atEnd} onClick={() => scrollBy(1)} />
            </span>
          </div>
        </div>

        <div
          ref={trackRef}
          onScroll={updateArrows}
          className="gallery-track"
          style={{
            display: "flex", gap: 16, overflowX: "auto", scrollSnapType: "x mandatory",
            paddingBottom: 8, scrollbarWidth: "none",
          }}
        >
          {items.map((g) => (
            <figure
              key={g.id}
              style={{
                margin: 0, flex: "0 0 auto", width: "var(--gallery-card, 300px)", scrollSnapAlign: "start",
                background: "var(--bg-card)", border: "1px solid var(--border)", display: "flex", flexDirection: "column",
              }}
            >
              <button
                type="button"
                onClick={() => setLightbox(g.image)}
                style={{ position: "relative", aspectRatio: "3 / 4", background: "var(--bg-dark)", border: "none", padding: 0, cursor: "zoom-in", width: "100%" }}
              >
                <Image src={g.image} alt={g.author ? `Фото клієнта — ${g.author}` : "Фото клієнта"} fill sizes="(max-width: 860px) 80vw, 320px" style={{ objectFit: "cover" }} />
              </button>

              {(g.text || g.author) && (
                <figcaption style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                  {g.text && (
                    <p style={{ fontSize: 14, fontWeight: 300, color: "var(--text-primary)", lineHeight: 1.65, opacity: 0.92 }}>
                      «{g.text}»
                    </p>
                  )}
                  {g.author && (
                    <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "var(--accent)" }}>{g.author}</span>
                  )}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>

      <ReviewModal open={reviewOpen} onClose={() => setReviewOpen(false)} />

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay-strong)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}
        >
          <div style={{ position: "relative", width: "min(760px, 100%)", height: "min(88vh, 1000px)" }}>
            <Image src={lightbox} alt="Фото клієнта" fill sizes="760px" style={{ objectFit: "contain" }} />
          </div>
        </div>
      )}
    </section>
  );
}

function ArrowBtn({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Назад" : "Далі"}
      style={{
        width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "1px solid var(--border-light)",
        color: disabled ? "var(--text-tertiary, #666)" : "var(--text-primary)",
        cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, transition: "all 0.2s",
      }}
    >
      <Icon.Arrow width="16" height="16" style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }} />
    </button>
  );
}
