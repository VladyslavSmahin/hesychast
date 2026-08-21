"use client";

// Бібліотека наклейок: картинки принтів, які покупець може додати до одягу.
// Наклейки спільні для всіх товарів — вмикаються прапорцем у картці товару.

import { useState } from "react";
import Image from "next/image";
import { downscaleImage } from "@/lib/clientImage";
import {
  useDbStickers, dbCreateSticker, dbUpdateSticker, dbDeleteSticker, dbUploadImage,
  type DbSticker,
} from "@/features/admin/db";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import { DeleteButton } from "@/components/admin/IconButtons";
import s from "@/components/admin/admin.module.css";

export default function StickersPage() {
  const { stickers, loading, refetch } = useDbStickers();
  const { user } = useAdminAuth();
  const isAdmin = user?.role === "admin";
  const [busy, setBusy] = useState(false);

  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Оберіть зображення."); return; }
    setBusy(true);
    const prepared = await downscaleImage(file, 1200, 0.9);
    const r = await dbUploadImage(prepared, "stickers");
    if (r.error) { setBusy(false); alert("Помилка завантаження: " + r.error); return; }
    const name = file.name.replace(/\.[^.]+$/, "");
    const err = await dbCreateSticker(name, r.url!);
    setBusy(false);
    if (err) { alert("Помилка збереження: " + err); return; }
    refetch();
  };

  const rename = async (st: DbSticker) => {
    const name = prompt("Назва наклейки:", st.name);
    if (name == null || !name.trim() || name === st.name) return;
    await dbUpdateSticker(st.id, { name: name.trim() });
    refetch();
  };

  const toggle = async (st: DbSticker) => { await dbUpdateSticker(st.id, { isActive: !st.isActive }); refetch(); };

  const remove = async (st: DbSticker) => {
    if (!confirm(`Видалити наклейку «${st.name}»?`)) return;
    await dbDeleteSticker(st.id);
    refetch();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className={s.hint} style={{ margin: 0 }}>
        Наклейки показуються на сторінці товару, якщо в картці товару увімкнено «Дозволити вибір наклейки».
        Вимкнена наклейка зникає з сайту, але лишається тут.
      </p>

      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>Наклейки ({stickers.length})</div>
          <label className={`${s.btn} ${s.btnSmall}`} style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Завантаження…" : "+ Наклейка"}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </div>

        <div style={{ padding: 18 }}>
          {loading ? (
            <p className={s.hint}>Завантаження…</p>
          ) : stickers.length === 0 ? (
            <p className={s.hint}>Наклейок ще немає.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {stickers.map((st) => (
                <div key={st.id} style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", opacity: st.isActive ? 1 : 0.5 }}>
                  <div style={{ position: "relative", aspectRatio: "1 / 1", background: "#fff" }}>
                    <Image src={st.image} alt={st.name} fill sizes="200px" style={{ objectFit: "contain", padding: 10 }} />
                  </div>
                  <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <button type="button" onClick={() => rename(st)} title="Перейменувати"
                      style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", textAlign: "left", padding: 0, fontSize: 12, lineHeight: 1.35 }}>
                      {st.name}
                    </button>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <button className={`${s.pill} ${st.isActive ? s.pillOn : s.pillOff}`} style={{ cursor: "pointer", border: "none" }} onClick={() => toggle(st)}>
                        {st.isActive ? "Активна" : "Прихована"}
                      </button>
                      {isAdmin && <DeleteButton onClick={() => remove(st)} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
