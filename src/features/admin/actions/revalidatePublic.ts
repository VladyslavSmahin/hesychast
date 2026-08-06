"use server";

import { revalidateTag } from "next/cache";
import { PUBLIC_TAG } from "@/features/publicCache";

/**
 * Скидає кеш публічної витрини. Викликається з адмінки після змін, які видно
 * на сайті: товари, категорії, акції, банери, відгуки, налаштування.
 * Без цього правка з'явилася б лише коли протухне кеш.
 */
export async function revalidatePublicAction(): Promise<void> {
  revalidateTag(PUBLIC_TAG);
}
