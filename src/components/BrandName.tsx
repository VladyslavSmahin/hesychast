"use client";

// Назва бренду мовою інтерфейсу: ІСІХАСТ / ИСИХАСТ.
// Окремий клієнтський компонент — щоб серверні каркаси теж могли її показати.

import { useT } from "@/features/locale/LocaleContext";

export default function BrandName() {
  return <>{useT()("brand")}</>;
}
