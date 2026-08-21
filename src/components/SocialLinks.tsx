"use client";

// Кнопки соцмереж у фірмових кольорах. Посилання беруться з CONTACTS;
// поки там "#" (не задане) — іконка не показується.

import { Icon } from "./icons";
import { CONTACTS } from "@/data/site";

type Link = {
  label: string;
  Ico: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  href: string;
  bg: string;
};

const LINKS: Link[] = [
  {
    label: "Instagram",
    Ico: Icon.InstagramBrand,
    href: CONTACTS.instagram,
    // фірмовий градієнт Instagram
    bg: "radial-gradient(circle at 30% 107%, #FDF497 0%, #FD5949 45%, #D6249F 60%, #285AEB 90%)",
  },
  { label: "Telegram — мерч", Ico: Icon.TelegramBrand, href: CONTACTS.telegram, bg: "#229ED9" },
  { label: "Telegram", Ico: Icon.TelegramBrand, href: CONTACTS.telegramPersonal, bg: "#229ED9" },
  { label: "Facebook", Ico: Icon.FacebookBrand, href: CONTACTS.facebook, bg: "#1877F2" },
  { label: "TikTok — мерч", Ico: Icon.TikTokBrand, href: CONTACTS.tiktok, bg: "#010101" },
  { label: "TikTok", Ico: Icon.TikTokBrand, href: CONTACTS.tiktokPersonal, bg: "#010101" },
];

export default function SocialLinks({ size = 40 }: { size?: number }) {
  const list = LINKS.filter((l) => l.href && l.href !== "#");
  if (!list.length) return null;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {list.map(({ label, Ico, href, bg }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          title={label}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: size, height: size, borderRadius: 10, background: bg, color: "#fff",
            border: bg === "#010101" ? "1px solid var(--border-light)" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none", transition: "transform 0.18s, filter 0.18s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.filter = "brightness(1.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.filter = "none"; }}
        >
          <Ico width={Math.round(size * 0.52)} height={Math.round(size * 0.52)} />
        </a>
      ))}
    </div>
  );
}
