"use client";

// Кілька фото товару: свайп пальцем (scroll-snap), перетягування мишею, стрілки ‹ ›
// і крапки знизу. Одне фото або жодного — звичайний PhotoSlot без зайвої розмітки.
// Усередині картки-посилання: крапки, стрілки й перетягування не відкривають товар.

import { useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { PhotoSlot } from "./icons";

const arrowBtn: CSSProperties = {
  position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 2,
  width: 34, height: 34, borderRadius: "50%", border: "1px solid var(--border-light)",
  background: "var(--scrim)", backdropFilter: "blur(6px)", color: "var(--text-primary)",
  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
};

export default function PhotoGallery({
  photos,
  alt = "",
  h = "100%",
  sizes,
  priority = false,
  soon = false,
  soonLabel,
  arrows = false,
}: {
  photos: string[];
  alt?: string;
  h?: number | string;
  sizes?: string;
  priority?: boolean;
  soon?: boolean;
  soonLabel?: string;
  /** стрілки видно завжди (модалка, сторінка товару); інакше — лише при наведенні */
  arrows?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // перетягування мишею (тач і трекпад гортають нативно)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  if (photos.length <= 1) {
    return <PhotoSlot h={h} photo={photos[0] ?? null} alt={alt} sizes={sizes} priority={priority} soon={soon} soonLabel={soonLabel} />;
  }

  const go = (e: MouseEvent, i: number) => {
    e.preventDefault(); e.stopPropagation();
    const el = track.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 5) return;
    if (!d.moved) {
      d.moved = true;
      // під час перетягування snap заважає — вмикаємо назад, коли відпустили
      e.currentTarget.style.scrollSnapType = "none";
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    e.currentTarget.scrollLeft = d.left - dx;
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const el = e.currentTarget;
    suppressClick.current = true; // клік після перетягування — не перехід на товар
    const w = Math.max(el.clientWidth, 1);
    // достатньо зсунути на ~15% ширини, щоб перейти на сусіднє фото
    const shift = (d.left - el.scrollLeft) / w;
    const from = Math.round(d.left / w);
    const target = Math.abs(shift) > 0.15 ? from + (shift < 0 ? 1 : -1) : from;
    const next = Math.min(Math.max(target, 0), photos.length - 1);
    // snap повертаємо, коли доїхали до фото: раніше він «притягнув» би назад
    const restore = () => { el.style.scrollSnapType = "x mandatory"; };
    if ("onscrollend" in el) el.addEventListener("scrollend", restore, { once: true });
    setTimeout(restore, 1000); // страховка, якщо scrollend не прийде (уже на місці)
    el.scrollTo({ left: next * w, behavior: "smooth" });
  };

  return (
    <div className={`photo-gallery${arrows ? " photo-gallery--arrows" : ""}`} style={{ position: "relative", width: "100%", height: h }}>
      <div
        ref={track}
        className="no-scrollbar"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault(); e.stopPropagation();
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(el.clientWidth, 1)));
        }}
        style={{ display: "flex", width: "100%", height: "100%", overflowX: "auto", scrollSnapType: "x mandatory" }}
      >
        {photos.map((src, i) => (
          <div key={src + i} style={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start" }}>
            <PhotoSlot h="100%" photo={src} alt={i === 0 ? alt : `${alt} — фото ${i + 1}`} sizes={sizes}
              priority={priority && i === 0} soon={soon} soonLabel={soonLabel} />
          </div>
        ))}
      </div>

      <button type="button" className="photo-gallery__arrow" aria-label="Попереднє фото" onClick={(e) => go(e, index - 1)} style={{ ...arrowBtn, left: 10 }}>‹</button>
      <button type="button" className="photo-gallery__arrow" aria-label="Наступне фото" onClick={(e) => go(e, index + 1)} style={{ ...arrowBtn, right: 10 }}>›</button>

      {/* крапки поверх фото: світлі на темній підкладці — видно на будь-якому фото й темі */}
      <div style={{
        position: "absolute", left: "50%", bottom: 8, transform: "translateX(-50%)", zIndex: 2,
        display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 10,
        background: "rgba(0, 0, 0, 0.35)", backdropFilter: "blur(4px)",
      }}>
        {photos.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Фото ${i + 1}`}
            aria-current={i === index}
            onClick={(e) => go(e, i)}
            style={{
              width: i === index ? 16 : 6, height: 6, padding: 0, borderRadius: 3, border: "none", cursor: "pointer",
              background: i === index ? "var(--accent)" : "rgba(255, 255, 255, 0.75)",
              transition: "width 0.2s, background 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
