import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Проксі до API Нової Пошти: підказки міст і список відділень у місті.
// Ходимо через сервер, а не з браузера — щоб не впертись у CORS, тримати
// ключ (якщо колись знадобиться) на сервері й кешувати відповіді.
//
// Довідникові методи (getCities / getWarehouses) працюють без ключа.
const NP_API = "https://api.novaposhta.ua/v2.0/json/";
const MAX_QUERY = 60;

type NpCity = { Ref: string; Description: string; AreaDescription?: string; SettlementTypeDescription?: string };
type NpWarehouse = { Ref: string; Description: string; ShortAddress?: string };

async function npCall(modelName: string, calledMethod: string, methodProperties: Record<string, string>) {
  const res = await fetch(NP_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: process.env.NOVA_POSHTA_API_KEY ?? "", modelName, calledMethod, methodProperties }),
    // довідники змінюються рідко — кешуємо на добу
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`np http ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(Array.isArray(json.errors) ? json.errors.join("; ") : "np error");
  return json.data as unknown[];
}

// GET /api/np?type=cities&q=тульчин
// GET /api/np?type=warehouses&city=<Ref>
export async function GET(req: Request) {
  const rl = rateLimit(`np:${clientIp(req)}`, 40, 60_000); // 40 запитів/хв з IP
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "cities") {
      const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY);
      if (q.length < 2) return NextResponse.json({ ok: true, items: [] });

      const data = (await npCall("Address", "getCities", { FindByString: q, Limit: "20" })) as NpCity[];
      return NextResponse.json({
        ok: true,
        items: data.map((c) => ({
          ref: c.Ref,
          name: c.Description,
          region: c.AreaDescription ? `${c.AreaDescription} обл.` : "",
        })),
      });
    }

    if (type === "warehouses") {
      const city = (searchParams.get("city") ?? "").trim();
      if (!city) return NextResponse.json({ ok: true, items: [] });

      const data = (await npCall("Address", "getWarehouses", { CityRef: city, Limit: "500" })) as NpWarehouse[];
      return NextResponse.json({
        ok: true,
        items: data.map((w) => ({ ref: w.Ref, name: w.Description })),
      });
    }

    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  } catch (e) {
    console.error("nova poshta:", (e as Error).message);
    // не валимо оформлення замовлення — клієнт зможе ввести відділення вручну
    return NextResponse.json({ ok: false, error: "np_unavailable" }, { status: 502 });
  }
}
