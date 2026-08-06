import HomeClient from "@/components/HomeClient";
import JsonLd from "@/components/JsonLd";
import { storeSchema } from "@/lib/schema";
import { PublicDataProvider } from "@/features/publicData";
import { fetchPublicData } from "@/features/publicData.server";

// Каталог змінюється через адмінку → рендеримо динамічно (без кешу).
export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await fetchPublicData();
  return (
    <PublicDataProvider value={data}>
      <JsonLd data={storeSchema()} />
      <HomeClient />
    </PublicDataProvider>
  );
}
