"use client";

// Галерея клієнтів: фото покупців із необовʼязковим відгуком.
// Фото конвертується у WebP при завантаженні (як і решта зображень сайту).

import { useState } from "react";
import Image from "next/image";
import { downscaleImage } from "@/lib/clientImage";
import {
  useDbGallery, dbCreateGalleryItem, dbUpdateGalleryItem, dbDeleteGalleryItem, dbUploadImage,
  useDbVideos, dbUploadVideo, dbUpdateVideo, dbDeleteVideo,
  type DbGalleryItem, type DbVideoItem,
} from "@/features/admin/db";
import { videoPosterFile } from "@/lib/clientVideo";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import { DeleteButton } from "@/components/admin/IconButtons";
import s from "@/components/admin/admin.module.css";

type Tab = "photo" | "video";

export default function GalleryPage() {
  const [tab, setTab] = useState<Tab>("photo");
  const { items, loading, refetch } = useDbGallery();
  const { videos, loading: videosLoading, refetch: refetchVideos } = useDbVideos();
  const { user } = useAdminAuth();
  const isAdmin = user?.role === "admin";
  const [busy, setBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [editing, setEditing] = useState<DbGalleryItem | null>(null);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const prepared = await downscaleImage(file, 1600, 0.85);
      const r = await dbUploadImage(prepared, "products");
      if (r.error) { alert("Помилка завантаження: " + r.error); break; }
      const err = await dbCreateGalleryItem(r.url!);
      if (err) { alert("Помилка збереження: " + err); break; }
    }
    setBusy(false);
    refetch();
  };

  const openEdit = (g: DbGalleryItem) => { setEditing(g); setAuthor(g.author); setText(g.text); };

  const saveEdit = async () => {
    if (!editing) return;
    await dbUpdateGalleryItem(editing.id, { author, text });
    setEditing(null);
    refetch();
  };

  const toggle = async (g: DbGalleryItem) => { await dbUpdateGalleryItem(g.id, { isActive: !g.isActive }); refetch(); };

  const remove = async (g: DbGalleryItem) => {
    if (!confirm("Видалити фото з галереї?")) return;
    await dbDeleteGalleryItem(g.id);
    refetch();
  };

  const uploadVideo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { alert("Оберіть відеофайл."); return; }
    if (file.size > 100 * 1024 * 1024) { alert("Відео завелике — максимум 100 МБ."); return; }
    setVideoBusy(true);
    // постер — перший кадр, знімаємо в браузері (щоб сторінка не тягнула відео заради обкладинки)
    const poster = await videoPosterFile(file).catch(() => null);
    const err = await dbUploadVideo(file, poster);
    setVideoBusy(false);
    if (err) { alert("Помилка завантаження: " + err); return; }
    refetchVideos();
  };

  const editVideo = async (v: DbVideoItem) => {
    const author = prompt("Ім'я клієнта:", v.author);
    if (author == null) return;
    const text = prompt("Підпис/відгук:", v.text) ?? v.text;
    await dbUpdateVideo(v.id, { author: author.trim(), text: text.trim() });
    refetchVideos();
  };

  const toggleVideo = async (v: DbVideoItem) => { await dbUpdateVideo(v.id, { isActive: !v.isActive }); refetchVideos(); };

  const removeVideo = async (v: DbVideoItem) => {
    if (!confirm("Видалити відео?")) return;
    await dbDeleteVideo(v.id);
    refetchVideos();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className={s.hint} style={{ margin: 0 }}>
        Блок «Наші клієнти» на головній. Можна лише фото/відео, а можна з відгуком.
        Кілька фото можна вибрати одразу.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <button className={`chip square ${tab === "photo" ? "active" : ""}`} onClick={() => setTab("photo")}>
          Фото ({items.length})
        </button>
        <button className={`chip square ${tab === "video" ? "active" : ""}`} onClick={() => setTab("video")}>
          Відео ({videos.length})
        </button>
      </div>

      {tab === "photo" && (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>Фото ({items.length})</div>
          <label className={`${s.btn} ${s.btnSmall}`} style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Завантаження…" : "+ Фото"}
            <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => upload(e.target.files)} />
          </label>
        </div>

        <div style={{ padding: 18 }}>
          {loading ? (
            <p className={s.hint}>Завантаження…</p>
          ) : items.length === 0 ? (
            <p className={s.hint}>Фото ще немає.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {items.map((g) => (
                <div key={g.id} style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", opacity: g.isActive ? 1 : 0.5 }}>
                  <div style={{ position: "relative", aspectRatio: "3 / 4", background: "var(--bg-dark)" }}>
                    <Image src={g.image} alt="" fill sizes="220px" style={{ objectFit: "cover" }} />
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, minHeight: 32 }}>
                      {g.text ? `«${g.text.slice(0, 70)}${g.text.length > 70 ? "…" : ""}»` : <span style={{ color: "var(--text-secondary)" }}>без відгуку</span>}
                      {g.author && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{g.author}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                      <button className={`${s.pill} ${g.isActive ? s.pillOn : s.pillOff}`} style={{ cursor: "pointer", border: "none" }} onClick={() => toggle(g)}>
                        {g.isActive ? "На сайті" : "Прихована"}
                      </button>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => openEdit(g)}>Відгук</button>
                        {isAdmin && <DeleteButton onClick={() => remove(g)} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {tab === "video" && (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>Відео ({videos.length})</div>
          <label className={`${s.btn} ${s.btnSmall}`} style={{ cursor: videoBusy ? "wait" : "pointer", opacity: videoBusy ? 0.6 : 1 }}>
            {videoBusy ? "Завантаження…" : "+ Відео"}
            <input type="file" accept="video/*" hidden disabled={videoBusy} onChange={(e) => uploadVideo(e.target.files?.[0])} />
          </label>
        </div>

        <div style={{ padding: 18 }}>
          <p className={s.hint} style={{ marginTop: 0, marginBottom: 14 }}>
            Вертикальні ролики (як у сторіс), до 100 МБ. Обкладинка знімається з першого кадру автоматично.
          </p>

          {videosLoading ? (
            <p className={s.hint}>Завантаження…</p>
          ) : videos.length === 0 ? (
            <p className={s.hint}>Відео ще немає.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
              {videos.map((v) => (
                <div key={v.id} style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden", background: "var(--bg-elevated)", opacity: v.isActive ? 1 : 0.5 }}>
                  <video
                    src={v.video}
                    poster={v.poster ?? undefined}
                    controls
                    preload="metadata"
                    playsInline
                    style={{ width: "100%", aspectRatio: "9 / 16", objectFit: "cover", background: "#000", display: "block" }}
                  />
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, minHeight: 32 }}>
                      {v.text ? `«${v.text.slice(0, 70)}${v.text.length > 70 ? "…" : ""}»` : <span style={{ color: "var(--text-secondary)" }}>без підпису</span>}
                      {v.author && <div style={{ color: "var(--accent)", fontSize: 11, marginTop: 4 }}>{v.author}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                      <button className={`${s.pill} ${v.isActive ? s.pillOn : s.pillOff}`} style={{ cursor: "pointer", border: "none" }} onClick={() => toggleVideo(v)}>
                        {v.isActive ? "На сайті" : "Приховане"}
                      </button>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => editVideo(v)}>Підпис</button>
                        {isAdmin && <DeleteButton onClick={() => removeVideo(v)} />}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {editing && (
        <div onClick={() => setEditing(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "min(460px, 100%)", background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className={s.cardTitle}>Відгук до фото</div>
            <div className={s.field}>
              <span className={s.fieldLabel}>Ім&apos;я клієнта</span>
              <input className={s.input} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Напр. Олена" />
            </div>
            <div className={s.field}>
              <span className={s.fieldLabel}>Текст відгуку</span>
              <textarea className={s.input} rows={4} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Необовʼязково — можна лишити порожнім" style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={() => setEditing(null)}>Скасувати</button>
              <button className={s.btn} onClick={saveEdit}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
