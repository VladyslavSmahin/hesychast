"use client";

// Відеогалерея клієнтів у героєві: два ролики в ряд, гортаються слайдером,
// відкриваються по черзі у повноекранному вікні (там же можна перемикати).

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePublicVideos, useGloss } from "@/features/publicData";

export default function HeroVideos() {
  const videos = usePublicVideos();
  const title = useGloss("title_hero_videos");
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [current, setCurrent] = useState<number | null>(null);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => { updateArrows(); }, [updateArrows, videos.length]);

  useEffect(() => {
    if (current == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCurrent(null);
      if (e.key === "ArrowRight") setCurrent((c) => (c == null ? c : (c + 1) % videos.length));
      if (e.key === "ArrowLeft") setCurrent((c) => (c == null ? c : (c - 1 + videos.length) % videos.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [current, videos.length]);

  if (!videos.length) return null;

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth / 2 + 8), behavior: "smooth" });
  };

  const playing = current == null ? null : videos[current];

  return (
    <div style={{ position: "relative" }}>
      <div className="eyebrow" style={{ marginBottom: 12, fontSize: 11, letterSpacing: 3.5 }}>{title}</div>

      <div
        ref={trackRef}
        onScroll={updateArrows}
        className="gallery-track"
        style={{ display: "flex", gap: 12, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
      >
        {videos.map((v, i) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setCurrent(i)}
            aria-label="Відтворити відео"
            style={{
              position: "relative", flex: "0 0 calc(50% - 6px)", scrollSnapAlign: "start",
              aspectRatio: "9 / 16", background: "var(--bg-dark)", border: "1px solid var(--border)",
              padding: 0, cursor: "pointer", overflow: "hidden",
            }}
          >
            {v.poster ? (
              <Image src={v.poster} alt={v.author ? `Відео клієнта — ${v.author}` : "Відео клієнта"} fill sizes="(max-width: 860px) 45vw, 260px" style={{ objectFit: "cover" }} />
            ) : (
              <video src={`${v.video}#t=0.1`} preload="metadata" muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}

            <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)" }}>
              <span style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--scrim)", border: "1px solid rgba(255,255,255,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>

            {(v.author || v.text) && (
              <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#fff", background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.75))" }}>
                {v.author || v.text}
              </span>
            )}
          </button>
        ))}
      </div>

      {videos.length > 2 && (
        <>
          {!atStart && <SlideArrow dir="left" onClick={() => scrollByCard(-1)} />}
          {!atEnd && <SlideArrow dir="right" onClick={() => scrollByCard(1)} />}
        </>
      )}

      {playing && (
        <div
          onClick={() => setCurrent(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "var(--overlay-strong)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <video
            key={playing.id}
            src={playing.video}
            poster={playing.poster ?? undefined}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(460px, 100%)", maxHeight: "86vh", background: "#000" }}
          />

          {videos.length > 1 && (
            <>
              <LightboxArrow dir="left" onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c == null ? c : (c - 1 + videos.length) % videos.length)); }} />
              <LightboxArrow dir="right" onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c == null ? c : (c + 1) % videos.length)); }} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SlideArrow({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Попередні відео" : "Наступні відео"}
      style={{
        position: "absolute", top: "50%", [dir]: -14, transform: "translateY(-50%)",
        width: 34, height: 34, borderRadius: "50%", zIndex: 2, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--scrim)", border: "1px solid var(--border-light)", color: "var(--text-primary)",
      }}
    >
      <Chevron dir={dir} />
    </button>
  );
}

function LightboxArrow({ dir, onClick }: { dir: "left" | "right"; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Попереднє відео" : "Наступне відео"}
      style={{
        position: "absolute", top: "50%", [dir]: 16, transform: "translateY(-50%)",
        width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff",
      }}
    >
      <Chevron dir={dir} />
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
