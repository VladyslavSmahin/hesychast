"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/admin/Modal";
import { downscaleImage } from "@/lib/clientImage";
import {
  useDbProducts, useDbCategories,
  dbCreateProduct, dbUpdateProduct, dbSetAvailable, dbSoftDelete, dbUploadImage,
  type DbProduct, type ProductInput,
} from "@/features/admin/db";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import type { Badge } from "@/lib/types";
import s from "@/components/admin/admin.module.css";

const BADGES: Badge[] = ["", "ХІТ", "НОВЕ"];

interface Draft {
  categoryId: string;
  name: string; price: number; weight: string; badge: Badge;
  desc: string; photo: string | null; isAvailable: boolean;
}

const emptyDraft = (categoryId: string): Draft => ({
  categoryId, name: "", price: 0, weight: "", badge: "",
  desc: "", photo: null, isAvailable: true,
});

// Заповнюємо повний ProductInput; поля, яких немає у спрощеній схемі, — дефолтами.
const toInput = (d: Draft): ProductInput => ({
  categoryId: d.categoryId || null,
  name: d.name.trim(), price: d.price, weight: d.weight, badge: d.badge,
  desc: d.desc, photo: d.photo, isAvailable: d.isAvailable,
});

export default function ProductsPage() {
  const { products, loading, refetch } = useDbProducts();
  const { categories } = useDbCategories();
  const { user } = useAdminAuth();
  const isAdmin = user?.role === "admin";

  const [editing, setEditing] = useState<DbProduct | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [catFilter, setCatFilter] = useState<string>("all"); // id категорії | "all" | "__none__"
  const [query, setQuery] = useState("");

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Без категорії";

  // фільтр за категорією + пошук
  const filtered = useMemo(() => {
    let list = products;
    if (catFilter === "__none__") list = list.filter((p) => !p.categoryId);
    else if (catFilter !== "all") list = list.filter((p) => p.categoryId === catFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
    return list;
  }, [products, catFilter, query]);

  const groups = useMemo(() => {
    const gs = categories
      .map((c) => ({ id: c.id, name: c.name, items: filtered.filter((p) => p.categoryId === c.id) }))
      .filter((g) => g.items.length);
    const noCat = filtered.filter((p) => !p.categoryId);
    if (noCat.length) gs.push({ id: "__none__", name: "Без категорії", items: noCat });
    return gs;
  }, [categories, filtered]);

  const openNew = () => {
    setEditing(null);
    const cat = catFilter !== "all" && catFilter !== "__none__" ? catFilter : categories[0]?.id ?? "";
    setDraft(emptyDraft(cat));
  };
  const openEdit = (p: DbProduct) => {
    setEditing(p);
    setDraft({
      categoryId: p.categoryId ?? "", name: p.name, price: p.price, weight: p.weight,
      badge: p.badge, desc: p.desc, photo: p.photo, isAvailable: p.isAvailable,
    });
  };
  const close = () => { setDraft(null); setEditing(null); };

  const save = async () => {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    const err = editing ? await dbUpdateProduct(editing.id, toInput(draft)) : await dbCreateProduct(toInput(draft));
    setSaving(false);
    if (err) { alert("Помилка збереження: " + err); return; }
    close();
    refetch();
  };

  const toggleAvailable = async (p: DbProduct) => { await dbSetAvailable(p.id, !p.isAvailable); refetch(); };
  const remove = async (p: DbProduct) => {
    if (!confirm(`Видалити товар «${p.name}»?`)) return;
    await dbSoftDelete(p.id); refetch();
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const handlePhotoFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Оберіть зображення."); return; }
    setPhotoBusy(true);
    const prepared = await downscaleImage(file, 1600, 0.82);
    if (prepared.size > 4 * 1024 * 1024) {
      setPhotoBusy(false);
      alert("Фото завелике навіть після стиснення. Оберіть інше або менше за розміром.");
      return;
    }
    const r = await dbUploadImage(prepared, "products");
    setPhotoBusy(false);
    if (r.error) { alert("Помилка завантаження: " + r.error); return; }
    set("photo", r.url ?? null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p className={s.hint} style={{ margin: 0 }}>
        Товари згруповані за категоріями. Натисніть «+ Товар», щоб додати позицію.
      </p>

      {/* фільтр за категорією */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className={`chip square ${catFilter === "all" ? "active" : ""}`} onClick={() => setCatFilter("all")}>
          Усі ({products.length})
        </button>
        {categories.map((c) => {
          const n = products.filter((p) => p.categoryId === c.id).length;
          if (!n) return null;
          return (
            <button key={c.id} className={`chip square ${catFilter === c.id ? "active" : ""}`} onClick={() => setCatFilter(c.id)}>
              {c.name} ({n})
            </button>
          );
        })}
      </div>

      <div className={s.card}>
        <div className={s.cardHead}>
          <div className={s.cardTitle}>Товари ({filtered.length})</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "0 1 280px" }}>
              <input className={s.input} placeholder="Пошук за назвою…" value={query}
                onChange={(e) => setQuery(e.target.value)} style={{ width: "100%", paddingRight: query ? 30 : undefined }} />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="Очистити"
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>
            <button className={`${s.btn} ${s.btnSmall}`} onClick={openNew} disabled={!categories.length}>+ Товар</button>
          </div>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Назва</th><th>Ціна</th><th>Вага</th><th>Бейдж</th><th>В наявності</th><th style={{ textAlign: "right" }}>Дії</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 20, color: "var(--text-secondary)" }}>Завантаження…</td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, color: "var(--text-secondary)" }}>Немає товарів.</td></tr>
              ) : groups.map((g) => (
                <GroupRows key={g.id} name={g.name} count={g.items.length}>
                  {g.items.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 6, flexShrink: 0, border: "1px solid var(--border)", background: p.photo ? `#0A0908 url(${p.photo}) center/cover no-repeat` : "var(--bg-elevated)" }} />
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0 }}>{p.name}</span>
                          <span className={s.cardMeta}>
                            {p.badge && <span className={`${s.pill} ${s.pillEditor}`}>{p.badge}</span>}
                            <span style={{ fontWeight: 700 }}>{p.price} грн</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Ціна" className={s.colHideMobile}>{p.price} грн</td>
                      <td data-label="Вага" className={s.colHideMobile} style={{ color: "var(--text-secondary)", fontSize: 12 }}>{p.weight || "—"}</td>
                      <td data-label="Бейдж" className={s.colHideMobile}>{p.badge ? <span className={`${s.pill} ${s.pillEditor}`}>{p.badge}</span> : "—"}</td>
                      <td data-label="В наявності">
                        <button className={`${s.pill} ${p.isAvailable ? s.pillOn : s.pillOff}`} style={{ cursor: "pointer", border: "none" }}
                          onClick={() => toggleAvailable(p)}>
                          {p.isAvailable ? "Так" : "Ні"}
                        </button>
                      </td>
                      <td>
                        <div className={s.rowActions}>
                          <button className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} onClick={() => openEdit(p)}>Редагувати</button>
                          {isAdmin && (
                            <button className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => remove(p)}>Видалити</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </GroupRows>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <Modal
          title={editing ? "Редагувати товар" : "Новий товар"}
          onClose={close}
          footer={
            <>
              <button className={`${s.btn} ${s.btnGhost}`} onClick={close}>Скасувати</button>
              <button className={s.btn} onClick={save} disabled={!draft.name.trim() || saving}>{saving ? "Збереження…" : "Зберегти"}</button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Фото товару">
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 96, height: 96, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-light)", background: draft.photo ? `#0A0908 url(${draft.photo}) center/cover no-repeat` : "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: 10 }}>
                  {!draft.photo && "Немає"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} style={{ cursor: photoBusy ? "wait" : "pointer", textAlign: "center", opacity: photoBusy ? 0.6 : 1 }}>
                    {photoBusy ? "Завантаження…" : draft.photo ? "Замінити" : "Завантажити"}
                    <input type="file" accept="image/*" hidden disabled={photoBusy} onChange={(e) => handlePhotoFile(e.target.files?.[0])} />
                  </label>
                  {draft.photo && (
                    <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => set("photo", null)}>Прибрати</button>
                  )}
                </div>
              </div>
              <p className={s.hint} style={{ fontSize: 11, marginTop: 8 }}>
                Фото автоматично конвертується у WebP і зберігається у хмарному сховищі (R2). До 8 МБ.
              </p>
            </Field>

            <Field label="Назва">
              <input className={s.input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Field label="Категорія" grow>
                <select className={s.input} value={draft.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Ціна, грн">
                <input className={`${s.input} no-spin`} type="number" value={draft.price || ""} onChange={(e) => set("price", e.target.value === "" ? 0 : Number(e.target.value))} />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Field label="Вага / об'єм" grow>
                <input className={s.input} placeholder="0.5 л · 250 г · 10 шт" value={draft.weight} onChange={(e) => set("weight", e.target.value)} />
              </Field>
              <Field label="Бейдж">
                <select className={s.input} value={draft.badge} onChange={(e) => set("badge", e.target.value as Badge)}>
                  {BADGES.map((b) => <option key={b} value={b}>{b || "—"}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Опис">
              <textarea className={s.input} rows={3} placeholder="Короткий опис товару (необов'язково)"
                value={draft.desc} onChange={(e) => set("desc", e.target.value)} style={{ resize: "vertical", minHeight: 72 }} />
            </Field>

            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={draft.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} />
              <span style={{ fontSize: 13, color: "var(--text-primary)" }}>В наявності (показувати на сайті)</span>
            </label>

            <p className={s.hint} style={{ fontSize: 11 }}>
              Щоб товар зʼявився у блоці «Популярне» на сайті — встановіть бейдж «ХІТ».
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function GroupRows({ name, count, children }: { name: string; count: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={6} style={{ background: "var(--bg-elevated)", padding: "8px 14px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, letterSpacing: 0.5, color: "var(--accent)", borderTop: "1px solid var(--border-light)" }}>
          {name} <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>· {count}</span>
        </td>
      </tr>
      {children}
    </>
  );
}

function Field({ label, children, grow }: { label: string; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={s.field} style={grow ? { flex: 1, minWidth: 160 } : undefined}>
      <span className={s.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}
