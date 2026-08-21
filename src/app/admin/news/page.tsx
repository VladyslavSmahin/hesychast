"use client";

// Які відкриті Telegram-канали показуємо в блоці «Новини» на сайті.
// Пости тягне крон кожні 5 годин; тут же є ручне оновлення.

import { useState } from "react";
import {
  useDbTgChannels, dbCreateTgChannel, dbUpdateTgChannel, dbDeleteTgChannel, dbSyncTgNews,
  type DbTgChannel,
} from "@/features/admin/db";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import { EditButton, DeleteButton } from "@/components/admin/IconButtons";
import s from "@/components/admin/admin.module.css";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function NewsPage() {
  const { channels, loading, refetch } = useDbTgChannels();
  const { user } = useAdminAuth();
  const isAdmin = user?.role === "admin";

  const [username, setUsername] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const add = async () => {
    const u = username.replace(/^@/, "").trim();
    if (!u) return;
    setSaving(true);
    const err = await dbCreateTgChannel(u, title);
    setSaving(false);
    if (err) { alert("Помилка: " + err); return; }
    setUsername(""); setTitle("");
    refetch();
  };

  const rename = async (c: DbTgChannel) => {
    const t = prompt("Свій підпис (порожньо — беремо назву з Telegram):", c.title);
    if (t == null) return;
    await dbUpdateTgChannel(c.id, { title: t.trim() });
    refetch();
  };

  const toggle = async (c: DbTgChannel) => { await dbUpdateTgChannel(c.id, { isActive: !c.isActive }); refetch(); };

  const remove = async (c: DbTgChannel) => {
    if (!confirm(`Прибрати канал @${c.username}? Його пости теж зникнуть із сайту.`)) return;
    await dbDeleteTgChannel(c.id);
    refetch();
  };

  const sync = async () => {
    setSyncing(true); setSyncMsg("");
    const r = await dbSyncTgNews();
    setSyncing(false);
    setSyncMsg(
      r.ok
        ? "Оновлено: " + (r.channels ?? []).map((c) => `@${c.username} — ${c.error ? `помилка (${c.error})` : `${c.fetched} дописів`}`).join("; ")
        : "Помилка оновлення: " + r.error
    );
    refetch();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className={s.hint} style={{ margin: 0 }}>
        Пости з цих відкритих каналів показуються в блоці «Новини» на головній.
        Назву каналу тягнемо з Telegram; свій підпис задавайте лише якщо треба інакше. Оновлення автоматичне — раз на добу.
      </p>

      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>Канали ({channels.length})</div>
          <button className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={sync} disabled={syncing}>
            {syncing ? "Оновлення…" : "Оновити зараз"}
          </button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
          {syncMsg && <p className={s.hint} style={{ margin: 0 }}>{syncMsg}</p>}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input className={s.input} placeholder="@username каналу" value={username}
              onChange={(e) => setUsername(e.target.value)} style={{ flex: "0 1 220px" }} />
            <input className={s.input} placeholder="Свій підпис (порожньо — назва з Telegram)" value={title}
              onChange={(e) => setTitle(e.target.value)} style={{ flex: "1 1 240px" }} />
            <button className={`${s.btn} ${s.btnSmall}`} onClick={add} disabled={!username.trim() || saving}>
              {saving ? "Додаємо…" : "+ Канал"}
            </button>
          </div>

          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Канал</th><th>Назва в Telegram</th><th>Свій підпис</th><th>Дописів</th><th>Оновлено</th><th>Стан</th><th style={{ textAlign: "right" }}>Дії</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding: 20, color: "var(--text-secondary)" }}>Завантаження…</td></tr>
                ) : channels.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 20, color: "var(--text-secondary)" }}>Каналів ще немає.</td></tr>
                ) : channels.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Канал">
                      <a href={`https://t.me/${c.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                        @{c.username}
                      </a>
                    </td>
                    <td data-label="Назва в Telegram">{c.titleAuto || "—"}</td>
                    <td data-label="Свій підпис" style={{ color: "var(--text-secondary)" }}>{c.title || "— (беремо з Telegram)"}</td>
                    <td data-label="Дописів">{c.postCount}</td>
                    <td data-label="Оновлення" style={{ color: "var(--text-secondary)", fontSize: 12 }}>{fmt(c.lastSyncAt)}</td>
                    <td data-label="Стан">
                      <button className={`${s.pill} ${c.isActive ? s.pillOn : s.pillOff}`} style={{ cursor: "pointer", border: "none" }} onClick={() => toggle(c)}>
                        {c.isActive ? "Показуємо" : "Прихований"}
                      </button>
                    </td>
                    <td>
                      <div className={s.rowActions}>
                        <EditButton onClick={() => rename(c)} title="Змінити підпис" />
                        {isAdmin && <DeleteButton onClick={() => remove(c)} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
