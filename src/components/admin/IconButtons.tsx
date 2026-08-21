"use client";

// Компактні дії рядка таблиці: олівець (редагувати) та кошик (видалити).
// Текстові підписи замінені іконками — рядок не розповзається на мобільному.

import s from "./admin.module.css";

export function EditButton({ onClick, title = "Редагувати" }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className={s.iconBtn} onClick={onClick} title={title} aria-label={title}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>
  );
}

export function DeleteButton({ onClick, title = "Видалити" }: { onClick: () => void; title?: string }) {
  return (
    <button type="button" className={`${s.iconBtn} ${s.iconBtnDanger}`} onClick={onClick} title={title} aria-label={title}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
