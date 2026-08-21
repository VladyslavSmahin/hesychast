"use client";

// Позначка передзамовлення: товар видно на вітрині, але його немає на складі —
// термін узгоджується з покупцем окремо (у переписці).

import { useT } from "@/features/locale/LocaleContext";

export function PreorderTag({ size = "sm" }: { size?: "sm" | "md" }) {
  const t = useT();
  const pad = size === "md" ? "6px 12px" : "3px 8px";
  const fontSize = size === "md" ? 11 : 9;
  return (
    <div
      style={{
        padding: pad,
        background: "rgba(26,23,20,0.85)",
        border: "1px solid var(--gold, #C9A84C)",
        color: "var(--gold, #C9A84C)",
        fontSize, fontWeight: 500, letterSpacing: 2.2, textTransform: "uppercase",
        backdropFilter: "blur(6px)", whiteSpace: "nowrap",
      }}
    >
      {t("avail.preorder")}
    </div>
  );
}

export function PreorderNote() {
  const t = useT();

  return (
    <p
      style={{
        fontSize: 12, lineHeight: 1.6, color: "var(--gold, #C9A84C)",
        border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.08)",
        padding: "10px 12px", marginBottom: 12,
      }}
    >
      {t("avail.preorderNote")}
    </p>
  );
}
