"use client";

import { useMemo, useState } from "react";
import Modal from "@/components/admin/Modal";
import { useDbOrders, dbSetOrderStatus, CARRIER_LABEL, type DbOrder, type OrderStatus , orderItemOptions } from "@/features/admin/db";
import s from "@/components/admin/admin.module.css";

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "new", label: "Нове" },
  { value: "confirmed", label: "Підтверджено" },
  { value: "done", label: "Виконано" },
  { value: "canceled", label: "Скасовано" },
];
const statusLabel = (st: OrderStatus) => STATUSES.find((x) => x.value === st)?.label ?? st;
const statusPill = (st: OrderStatus) =>
  st === "new" ? s.pillEditor : st === "done" ? s.pillOn : st === "canceled" ? s.pillOff : s.pillAdmin;

const timeLabel = (iso: string) => new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function OrdersPage() {
  const { orders, loading, refetch } = useDbOrders();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [selected, setSelected] = useState<DbOrder | null>(null);

  const shown = useMemo(
    () => orders.filter((o) => filter === "all" || o.status === filter),
    [orders, filter]
  );

  const setStatus = async (id: string, st: OrderStatus) => {
    await dbSetOrderStatus(id, st);
    setSelected((cur) => (cur && cur.id === id ? { ...cur, status: st } : cur));
    refetch();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p className={s.hint}>
        Нові зверху. Натисніть на рядок, щоб переглянути деталі та змінити статус.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {([["all", "Усі"], ...STATUSES.map((x) => [x.value, x.label] as const)] as const).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v as OrderStatus | "all")}
            className={`chip square ${filter === v ? "active" : ""}`}>{l}</button>
        ))}
      </div>

      <div className={s.card}>
        <div className={s.cardHead}><div className={s.cardTitle}>Замовлення ({shown.length})</div></div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Час</th><th>Статус</th><th>Клієнт</th><th>Телефон</th><th>Позиції</th><th style={{ textAlign: "right" }}>Сума</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 20, color: "var(--text-secondary)" }}>Завантаження…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 20, color: "var(--text-secondary)" }}>Замовлень немає.</td></tr>
              ) : shown.map((o) => (
                <tr key={o.id} onClick={() => setSelected(o)} style={{ cursor: "pointer" }}>
                  <td data-label="Час" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{timeLabel(o.createdAt)}</td>
                  <td data-label="Статус"><span className={`${s.pill} ${statusPill(o.status)}`}>{statusLabel(o.status)}</span></td>
                  <td data-label="Клієнт" style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{o.customerName}</td>
                  <td data-label="Телефон" style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{o.phone}</td>
                  <td data-label="Позиції" style={{ color: "var(--text-secondary)" }}>
                    {o.items.map((it) => `${it.name} × ${it.quantity}`).join(", ")}
                  </td>
                  <td data-label="Сума" style={{ textAlign: "right", fontWeight: 700 }}>{o.total} грн</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal title={`Замовлення · ${selected.customerName}`} onClose={() => setSelected(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className={`${s.pill} ${statusPill(selected.status)}`}>{statusLabel(selected.status)}</span>
              <a href={`tel:${selected.phone}`} style={{ color: "var(--accent)" }}>{selected.phone}</a>
              <span className={s.hint} style={{ fontSize: 12 }}>{timeLabel(selected.createdAt)} · {CARRIER_LABEL[selected.deliveryType] ?? selected.deliveryType}</span>
            </div>

            <div className={s.field}>
              <span className={s.fieldLabel}>Статус</span>
              <select className={s.input} value={selected.status} onChange={(e) => setStatus(selected.id, e.target.value as OrderStatus)}>
                {STATUSES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
              </select>
            </div>

            {selected.address && <p className={s.hint}>📍 {selected.address}</p>}
            {selected.comment && <p className={s.hint}>💬 {selected.comment}</p>}

            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Позиція</th><th>Ціна</th><th>К-ть</th><th style={{ textAlign: "right" }}>Сума</th></tr></thead>
                <tbody>
                  {selected.items.map((it, i) => (
                    <tr key={i}>
                      <td data-label="Позиція">
                        {it.name}
                        {orderItemOptions(it) && (
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>{orderItemOptions(it)}</div>
                        )}
                      </td>
                      <td data-label="Ціна" style={{ color: "var(--text-secondary)" }}>{it.price} грн</td>
                      <td data-label="К-ть">{it.quantity}</td>
                      <td data-label="Сума" style={{ textAlign: "right" }}>{it.price * it.quantity} грн</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", fontSize: 13 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: 16 }}>Разом: {selected.total} грн</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
