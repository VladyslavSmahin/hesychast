import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Supabase Storage — сховище зображень (фото товарів, банери).
// Бакет публічний: читання — без ключа, запис — лише service_role (цей модуль, тільки сервер).
// Змінні ті самі, що й для БД: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
export const BUCKET = "media";

/** Чи задані змінні, потрібні для завантаження (інакше воно недоступне). */
export function storageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Публічний префікс URL бакета (із завершальним слешем). */
function publicBase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "");
  return `${url}/storage/v1/object/public/${BUCKET}/`;
}

/** Завантажує об'єкт у бакет і повертає публічний URL. Кидає помилку при невдачі. */
export async function storagePut(key: string, body: Buffer, contentType: string): Promise<string> {
  const { error } = await createAdminClient().storage.from(BUCKET).upload(key, body, {
    contentType,
    cacheControl: "31536000", // рік: імена файлів унікальні (uuid), тому кеш безпечний
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return publicBase() + key;
}

export async function storageDelete(key: string): Promise<void> {
  const { error } = await createAdminClient().storage.from(BUCKET).remove([key]);
  if (error) throw new Error(error.message);
}

/** Витягує ключ у бакеті з публічного URL (для видалення). null — якщо URL не з нашого бакета. */
export function storageKeyFromUrl(url: string): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const base = publicBase();
  return url.startsWith(base) ? url.slice(base.length) : null;
}
