import { after } from "next/server";
import { revalidateTag } from "next/cache";
import HomeClient from "@/components/HomeClient";
import JsonLd from "@/components/JsonLd";
import { storeSchema } from "@/lib/schema";
import { PublicDataProvider } from "@/features/publicData";
import { fetchPublicData } from "@/features/publicData.server";
import { maybeSyncTgNews } from "@/lib/tgNews";
import { PUBLIC_TAG } from "@/features/publicCache";

// Сторінка кешується, а дані каталогу — під тегом PUBLIC_TAG: адмінка після
// кожної зміни скидає його, тож правка видно одразу. Раніше тут стояв
// force-dynamic — 6 запитів до БД на КОЖЕН захід відвідувача.
export const revalidate = 60;

export default async function Page() {
  const data = await fetchPublicData();

  // Новини з Telegram освіжаємо ПІСЛЯ віддачі сторінки й не частіше ніж раз на добу —
  // страховка на випадок, якщо планувальник у Supabase не спрацював.
  // Відвідувач при цьому не чекає на походи в t.me.
  after(async () => {
    try {
      if (await maybeSyncTgNews()) revalidateTag(PUBLIC_TAG);
    } catch (e) {
      console.error("tg news lazy sync:", (e as Error).message);
    }
  });

  return (
    <PublicDataProvider value={data}>
      <JsonLd data={storeSchema()} />
      <HomeClient />
    </PublicDataProvider>
  );
}
