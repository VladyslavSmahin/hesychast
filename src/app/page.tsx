import HomeClient from "@/components/HomeClient";
import JsonLd from "@/components/JsonLd";
import { storeSchema } from "@/lib/schema";
import { PublicDataProvider } from "@/features/publicData";
import { fetchPublicData } from "@/features/publicData.server";

// Сторінка кешується, а дані каталогу — під тегом PUBLIC_TAG: адмінка після
// кожної зміни скидає його, тож правка видно одразу. Раніше тут стояв
// force-dynamic — 6 запитів до БД на КОЖЕН захід відвідувача.
export const revalidate = 60;

export default async function Page() {
  const data = await fetchPublicData();
  return (
    <PublicDataProvider value={data}>
      <JsonLd data={storeSchema()} />
      <HomeClient />
    </PublicDataProvider>
  );
}
