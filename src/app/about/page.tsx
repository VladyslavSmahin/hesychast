import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";

export const metadata: Metadata = {
  title: "Про нас",
  description: "Про крамницю ІСИХАСТ: мед із власної пасіки, церковне начиння та православний мерч від православного священника.",
};

const p: React.CSSProperties = { margin: "0 0 16px" };

export default function AboutPage() {
  return (
    <InfoPageShell title="Про нас">
      <div style={{ padding: "14px 16px", marginBottom: 24, border: "1px solid var(--border-light)", borderRadius: 8, background: "var(--bg-elevated)", fontSize: 13, color: "var(--text-secondary)" }}>
        ⚠️ Чернетка. Текст про крамницю додамо разом із власником (історія, парафія, пасіка, фото).
      </div>
      <p style={p}>
        ІСИХАСТ — православна крамниця, де кожен виріб зроблено з молитвою та любов&apos;ю.
        Ми пропонуємо мед із власної пасіки, церковне начиння та православний мерч.
      </p>
      <p style={p}>
        Наша філософія проста: натуральність, чесність і турбота. Мед збираємо на власній пасіці,
        свічки — з натурального воску, а кожне замовлення відправляємо з благословенням.
      </p>
    </InfoPageShell>
  );
}
