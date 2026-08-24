"use client";

import HeroPromoSlider from "./HeroPromoSlider";
import { useT } from "@/features/locale/LocaleContext";
import HeroVideos from "./HeroVideos";
import SocialLinks from "./SocialLinks";
import { useGloss, useSectionOn } from "@/features/publicData";
import { CONTACTS } from "@/data/site";

export default function Hero() {
  const brand = useT()("brand");
  // під заголовком — блок «Про нас» із глосарію (адмінка → Глосарій)
  const videosOn = useSectionOn("videos");
  const bannersOn = useSectionOn("banners");
  const aboutTitle = useGloss("about_title");
  const socialTitle = useGloss("title_hero_social");
  const aboutText = useGloss("about_text");
  const aboutParagraphs = aboutText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section
      id="hero"
      style={{
        position: "relative",
        padding: "var(--hero-pt) var(--page-pad) var(--py)",
        background: "var(--hero-grad)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: "-20%", right: "-10%", width: "70%", height: "120%",
          background: "var(--hero-glow)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, transparent 0%, var(--bg-primary) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* зліва — текст і соцмережі, справа — відео клієнтів; на мобільному одне під одним */}
      <div
        className="hero-grid"
        style={{
          maxWidth: 1440, margin: "0 auto", position: "relative",
          display: "grid", gridTemplateColumns: "var(--hero-cols)", gap: 48, alignItems: "center",
        }}
      >
        <div className="hero-copy" style={{ minWidth: 0 }}>
          <div className="eyebrow hero-eyebrow" style={{ marginBottom: 24, fontSize: 14, letterSpacing: 4 }}>
            {CONTACTS.addressShort}
          </div>

          <h1
            className="hero-title"
            style={{
              fontFamily: "var(--font-church)", fontSize: "var(--hero-h1)", fontWeight: 700, lineHeight: 0.92,
              color: "var(--text-primary)", letterSpacing: -1, marginBottom: 28,
            }}
          >
            {brand}
          </h1>

          <div className="hero-about" style={{ marginBottom: 28 }}>
            <div className="eyebrow" style={{ marginBottom: 14, fontSize: 11, letterSpacing: 3.5 }}>{aboutTitle}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {aboutParagraphs.map((p, i) => (
                <p key={i} style={{ fontSize: 15, fontWeight: 400, color: "var(--text-primary)", lineHeight: 1.75, opacity: 0.92 }}>
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 12, fontSize: 11, letterSpacing: 3.5 }}>{socialTitle}</div>
            <SocialLinks />
          </div>
        </div>

        <div className="hero-slider" style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {videosOn && <HeroVideos />}
          {/* активні банери, якщо вони є */}
          {bannersOn && <HeroPromoSlider />}
        </div>
      </div>
    </section>
  );
}
