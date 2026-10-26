"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/admin/Modal";
import { downscaleImage } from "@/lib/clientImage";
import {
  useDbProducts, useDbCategories,
  dbCreateProduct, dbUpdateProduct, dbSetAvailability, dbSoftDelete, dbUploadImage,
  type DbProduct, type ProductInput,
} from "@/features/admin/db";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import type { Badge, Availability, ProductColor } from "@/lib/types";
import { EditButton, DeleteButton } from "@/components/admin/IconButtons";
import s from "@/components/admin/admin.module.css";

const BADGES: Badge[] = ["", "ХІТ", "НОВЕ"];

// Три статуси наявності. out_of_stock — товар зникає з вітрини.
const AVAILABILITY: { value: Availability; label: string; hint: string }[] = [
  { value: "in_stock",     label: "В наявності",      hint: "Показується на сайті, звичайне замовлення." },
  { value: "preorder",     label: "Передзамовлення",  hint: "Показується на сайті з поміткою: можлива затримка, деталі узгоджуємо в особистих." },
  { value: "out_of_stock", label: "Немає в наявності", hint: "На сайті не показується." },
];
const availLabel = (a: Availability) => AVAILABILITY.find((x) => x.value === a)?.label ?? a;

// Розміри одягу та типова палітра футболок (можна знімати/додавати в формі товару).
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const PALETTE: ProductColor[] = [
  { name: "Білий",     hex: "#FFFFFF" },
  { name: "Чорний",    hex: "#111111" },
  { name: "Блакитний", hex: "#8ECAE6" },
  { name: "Жовтий",    hex: "#F2C14E" },
  { name: "Червоний",  hex: "#C1392B" },
  { name: "Хакі",      hex: "#6B705C" },
];

interface Draft {
  categoryId: string;
  name: string; nameRu: string; price: number; weight: string; weightRu: string; badge: Badge;
  desc: string; descRu: string;
  /** усі фото: перше — головне (картка, пошук), далі додаткові */
  photos: string[]; availability: Availability;
  sizes: string[]; colors: ProductColor[];
  stickerOption: boolean; stickerPrice: number; sizeChart: string | null;
  hiddenInMenu: boolean; comingSoon: boolean;
}

const MAX_PHOTOS = 10;

const emptyDraft = (categoryId: string): Draft => ({
  categoryId, name: "", nameRu: "", price: 0, weight: "", weightRu: "", badge: "",
  desc: "", descRu: "", photos: [], availability: "in_stock",
  sizes: [], colors: [], stickerOption: false, stickerPrice: 75, sizeChart: null,
  hiddenInMenu: false, comingSoon: false,
});

// Заповнюємо повний ProductInput; поля, яких немає у спрощеній схемі, — дефолтами.
const toInput = (d: Draft): ProductInput => ({
  categoryId: d.categoryId || null,
  name: d.name.trim(), nameRu: d.nameRu.trim(), price: d.price,
  weight: d.weight, weightRu: d.weightRu, badge: d.badge,
  desc: d.desc, descRu: d.descRu, photo: d.photos[0] ?? null, images: d.photos.slice(1), availability: d.availability,
  sizes: d.sizes, colors: d.colors,
  stickerOption: d.stickerOption, stickerPrice: d.stickerPrice, sizeChart: d.sizeChart,
  hiddenInMenu: d.hiddenInMenu, comingSoon: d.comingSoon,
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
  const [chartBusy, setChartBusy] = useState(false);
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
      categoryId: p.categoryId ?? "", name: p.name, nameRu: p.nameRu, price: p.price,
      weight: p.weight, weightRu: p.weightRu,
      badge: p.badge, desc: p.desc, descRu: p.descRu,
      photos: [p.photo, ...p.images].filter((x): x is string => !!x), availability: p.availability,
      sizes: p.sizes, colors: p.colors,
      stickerOption: p.stickerOption, stickerPrice: p.stickerPrice, sizeChart: p.sizeChart,
      hiddenInMenu: p.hiddenInMenu, comingSoon: p.comingSoon,
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

  // клік по бейджу в таблиці перемикає статус по колу: наявність → передзамовлення → немає
  const cycleAvailability = async (p: DbProduct) => {
    const i = AVAILABILITY.findIndex((a) => a.value === p.availability);
    const next = AVAILABILITY[(i + 1) % AVAILABILITY.length].value;
    await dbSetAvailability(p.id, next);
    refetch();
  };
  const remove = async (p: DbProduct) => {
    if (!confirm(`Видалити товар «${p.name}»?`)) return;
    await dbSoftDelete(p.id); refetch();
  };

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  // кілька файлів за раз: вантажимо по черзі й дописуємо в кінець списку
  const handlePhotoFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    const room = MAX_PHOTOS - (draft?.photos.length ?? 0);
    if (room <= 0) { alert(`Не більше ${MAX_PHOTOS} фото на товар.`); return; }
    setPhotoBusy(true);
    const failed: string[] = [];
    for (const file of files.slice(0, room)) {
      const prepared = await downscaleImage(file, 1600, 0.82);
      if (prepared.size > 4 * 1024 * 1024) { failed.push(`${file.name}: завелике навіть після стиснення`); continue; }
      const r = await dbUploadImage(prepared, "products");
      if (r.error || !r.url) { failed.push(`${file.name}: ${r.error ?? "помилка"}`); continue; }
      const url = r.url;
      setDraft((d) => (d ? { ...d, photos: [...d.photos, url] } : d));
    }
    setPhotoBusy(false);
    if (files.length > room) failed.push(`завантажено лише ${room} — ліміт ${MAX_PHOTOS} фото`);
    if (failed.length) alert("Не всі фото завантажено:\n" + failed.join("\n"));
  };

  const movePhoto = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      if (!d) return d;
      const j = i + dir;
      if (j < 0 || j >= d.photos.length) return d;
      const photos = [...d.photos];
      [photos[i], photos[j]] = [photos[j], photos[i]];
      return { ...d, photos };
    });
  const removePhoto = (i: number) =>
    setDraft((d) => (d ? { ...d, photos: d.photos.filter((_, k) => k !== i) } : d));

  const handleChartFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Оберіть зображення."); return; }
    setChartBusy(true);
    const prepared = await downscaleImage(file, 1600, 0.9);
    const r = await dbUploadImage(prepared, "products");
    setChartBusy(false);
    if (r.error) { alert("Помилка завантаження: " + r.error); return; }
    set("sizeChart", r.url ?? null);
  };

  const toggleSize = (sz: string) =>
    set("sizes", draft!.sizes.includes(sz) ? draft!.sizes.filter((x) => x !== sz) : [...draft!.sizes, sz].sort((a, b) => SIZES.indexOf(a) - SIZES.indexOf(b)));

  const toggleColor = (c: ProductColor) =>
    set("colors", draft!.colors.some((x) => x.name === c.name)
      ? draft!.colors.filter((x) => x.name !== c.name)
      : [...draft!.colors, c]);

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
              <tr><th>Назва</th><th>Ціна</th><th>Вага</th><th>Бейдж</th><th>Наявність</th><th style={{ textAlign: "right" }}>Дії</th></tr>
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
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 600, flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            {p.name}
                            {p.hiddenInMenu && <span className={`${s.pill} ${s.pillOff}`} title="Сховано з меню">Сховано</span>}
                            {p.comingSoon && <span className={`${s.pill} ${s.pillAdmin}`} title="У стрічці «Скоро в продажу»">Скоро</span>}
                          </span>
                          <span className={s.cardMeta}>
                            {p.badge && <span className={`${s.pill} ${s.pillEditor}`}>{p.badge}</span>}
                            <span style={{ fontWeight: 700 }}>{p.price} грн</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Ціна" className={s.colHideMobile}>{p.price} грн</td>
                      <td data-label="Вага" className={s.colHideMobile} style={{ color: "var(--text-secondary)", fontSize: 12 }}>{p.weight || "—"}</td>
                      <td data-label="Бейдж" className={s.colHideMobile}>{p.badge ? <span className={`${s.pill} ${s.pillEditor}`}>{p.badge}</span> : "—"}</td>
                      <td data-label="Наявність">
                        <button
                          className={`${s.pill} ${availPillClass(p.availability)}`}
                          style={{ cursor: "pointer", border: "none" }}
                          title="Натисніть, щоб змінити статус"
                          onClick={() => cycleAvailability(p)}
                        >
                          {availLabel(p.availability)}
                        </button>
                      </td>
                      <td>
                        <div className={s.rowActions}>
                          <EditButton onClick={() => openEdit(p)} />
                          {isAdmin && <DeleteButton onClick={() => remove(p)} />}
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
            <Field label={`Фото товару (${draft.photos.length}/${MAX_PHOTOS})`}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                {draft.photos.map((url, i) => (
                  <div key={url + i} style={{ width: 96, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ position: "relative", width: 96, height: 96, borderRadius: 8, overflow: "hidden", border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border-light)"}`, background: `#0A0908 url(${url}) center/cover no-repeat` }}>
                      {i === 0 && (
                        <span style={{ position: "absolute", left: 4, top: 4, padding: "2px 6px", borderRadius: 4, background: "var(--accent)", color: "var(--on-accent)", fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>Головне</span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} style={{ flex: 1, padding: "4px 0" }}
                        disabled={i === 0} onClick={() => movePhoto(i, -1)} aria-label="Перемістити ліворуч">←</button>
                      <button type="button" className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} style={{ flex: 1, padding: "4px 0" }}
                        disabled={i === draft.photos.length - 1} onClick={() => movePhoto(i, 1)} aria-label="Перемістити праворуч">→</button>
                      <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} style={{ flex: 1, padding: "4px 0" }}
                        onClick={() => removePhoto(i)} aria-label="Прибрати фото">✕</button>
                    </div>
                  </div>
                ))}
                {draft.photos.length < MAX_PHOTOS && (
                  <label style={{ width: 96, height: 96, borderRadius: 8, border: "1px dashed var(--border-light)", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontSize: 11, color: "var(--text-secondary)", cursor: photoBusy ? "wait" : "pointer", opacity: photoBusy ? 0.6 : 1, padding: 6 }}>
                    {photoBusy ? "Завантаження…" : "+ Додати фото"}
                    <input type="file" accept="image/*" multiple hidden disabled={photoBusy}
                      onChange={(e) => { handlePhotoFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
              <p className={s.hint} style={{ fontSize: 11, marginTop: 8 }}>
                Можна обрати кілька файлів одразу. Перше фото — головне (картка в каталозі, пошук, соцмережі);
                стрілками змінюйте порядок. На сайті фото гортаються свайпом. Автоматично конвертуються у WebP.
              </p>
            </Field>

            <Field label="Назва (укр)">
              <input className={s.input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>

            <Field label="Назва (рос)">
              <input className={s.input} value={draft.nameRu} placeholder="Порожньо — покажемо українську"
                onChange={(e) => set("nameRu", e.target.value)} />
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
              <Field label="Вага (рос)" grow>
                <input className={s.input} placeholder="0.5 л · 250 г · 10 шт" value={draft.weightRu} onChange={(e) => set("weightRu", e.target.value)} />
              </Field>
              <Field label="Бейдж">
                <select className={s.input} value={draft.badge} onChange={(e) => set("badge", e.target.value as Badge)}>
                  {BADGES.map((b) => <option key={b} value={b}>{b || "—"}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Опис (укр)">
              <textarea className={s.input} rows={3} placeholder="Короткий опис товару (необов'язково)"
                value={draft.desc} onChange={(e) => set("desc", e.target.value)} style={{ resize: "vertical", minHeight: 72 }} />
            </Field>

            <Field label="Опис (рос)">
              <textarea className={s.input} rows={3} placeholder="Порожньо — покажемо українську версію"
                value={draft.descRu} onChange={(e) => set("descRu", e.target.value)} style={{ resize: "vertical", minHeight: 72 }} />
            </Field>

            <Field label="Наявність">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {AVAILABILITY.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    className={`chip square ${draft.availability === a.value ? "active" : ""}`}
                    onClick={() => set("availability", a.value)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className={s.hint} style={{ fontSize: 11, marginTop: 6 }}>
                {AVAILABILITY.find((a) => a.value === draft.availability)?.hint}
              </p>
            </Field>

            <Field label="Показ на сайті">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={draft.hiddenInMenu} onChange={(e) => set("hiddenInMenu", e.target.checked)} style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.45 }}>
                    Сховати з меню
                    <span className={s.hint} style={{ display: "block", fontSize: 11 }}>Не показувати в каталозі, новинках, категоріях і «Додатково». Сторінка товару за посиланням лишається.</span>
                  </span>
                </label>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={draft.comingSoon} onChange={(e) => set("comingSoon", e.target.checked)} style={{ marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.45 }}>
                    Скоро в продажу
                    <span className={s.hint} style={{ display: "block", fontSize: 11 }}>Показати в стрічці «Скоро в продажу» під меню. Купити поки не можна.</span>
                  </span>
                </label>
              </div>
            </Field>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
              <div className={s.fieldLabel} style={{ marginBottom: 4 }}>Опції одягу</div>
              <p className={s.hint} style={{ fontSize: 11, marginBottom: 12 }}>
                Заповнюйте лише для одягу. Порожні розміри/кольори — на сайті селекторів немає.
              </p>

              <Field label="Розміри">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SIZES.map((sz) => (
                    <button key={sz} type="button"
                      className={`chip square ${draft.sizes.includes(sz) ? "active" : ""}`}
                      onClick={() => toggleSize(sz)}>
                      {sz}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Кольори">
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PALETTE.map((c) => {
                    const on = draft.colors.some((x) => x.name === c.name);
                    return (
                      <button key={c.name} type="button" title={c.name} onClick={() => toggleColor(c)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer",
                          background: on ? "var(--bg-elevated)" : "transparent",
                          border: `1px solid ${on ? "var(--accent)" : "var(--border-light)"}`,
                          color: on ? "var(--accent)" : "var(--text-secondary)", fontSize: 12, borderRadius: 6,
                        }}>
                        <span style={{ width: 16, height: 16, borderRadius: "50%", background: c.hex, border: "1px solid var(--border-light)" }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14 }}>
                <Field label="Наклейка" grow>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={draft.stickerOption} onChange={(e) => set("stickerOption", e.target.checked)} />
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>Дозволити вибір наклейки</span>
                  </label>
                </Field>
                <Field label="Доплата, грн">
                  <input className={`${s.input} no-spin`} type="number" disabled={!draft.stickerOption}
                    value={draft.stickerPrice || ""} onChange={(e) => set("stickerPrice", e.target.value === "" ? 0 : Number(e.target.value))} />
                </Field>
              </div>

              <Field label="Розмірна сітка (картинка)">
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div style={{ width: 64, height: 64, flexShrink: 0, borderRadius: 6, border: "1px solid var(--border-light)", background: draft.sizeChart ? `#fff url(${draft.sizeChart}) center/contain no-repeat` : "var(--bg-elevated)" }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <label className={`${s.btn} ${s.btnGhost} ${s.btnSmall}`} style={{ cursor: chartBusy ? "wait" : "pointer", opacity: chartBusy ? 0.6 : 1 }}>
                      {chartBusy ? "Завантаження…" : draft.sizeChart ? "Замінити" : "Завантажити"}
                      <input type="file" accept="image/*" hidden disabled={chartBusy} onChange={(e) => handleChartFile(e.target.files?.[0])} />
                    </label>
                    {draft.sizeChart && (
                      <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnSmall}`} onClick={() => set("sizeChart", null)}>Прибрати</button>
                    )}
                  </div>
                </div>
              </Field>
            </div>

            <p className={s.hint} style={{ fontSize: 11 }}>
              Щоб товар зʼявився у блоці «Популярне» на сайті — встановіть бейдж «ХІТ».
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

function availPillClass(a: Availability): string {
  if (a === "in_stock") return s.pillOn;
  if (a === "preorder") return s.pillPreorder;
  return s.pillOff;
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
