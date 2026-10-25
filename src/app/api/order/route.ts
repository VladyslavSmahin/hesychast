import { NextResponse } from "next/server";
import { sendTelegramMessage, esc } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

interface IncomingItem {
  id: string;             // ключ рядка кошика (товар + опції)
  productId?: string;     // uuid товару з каталогу
  name: string;
  price: number;
  qty: number;
  options?: IncomingOptions;
}

interface IncomingOptions {
  size?: string;
  color?: string;
  sticker?: string;
}

type Carrier = "nova_poshta" | "ukrposhta" | "other";

// Підписи перевізників для Telegram і валідації (самовивозу немає)
const CARRIER_LABEL: Record<Carrier, string> = {
  nova_poshta: "Нова Пошта",
  ukrposhta: "Укрпошта",
  other: "Інше (див. коментар)",
};

interface OrderBody {
  delivery: Carrier;
  name: string;
  phone: string;
  address?: string;
  comment?: string;
  consent?: boolean;
  items: IncomingItem[];
}

interface DbProductRow {
  name: string;
  price: number;
  sizes: string[];
  colors: string[];
  stickerOption: boolean;
  stickerPrice: number;
}

interface LineOptions { size?: string; color?: string; sticker?: string; stickerPrice?: number }

interface LineItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  options: LineOptions | null;
}

/** Опції позиції одним рядком: «L · Чорний · наклейка Хрест (+75 грн)». */
function optionsLine(o: LineOptions | null): string {
  if (!o) return "";
  const parts = [o.size, o.color].filter(Boolean) as string[];
  if (o.sticker) parts.push(`наклейка «${o.sticker}»${o.stickerPrice ? ` (+${o.stickerPrice} грн)` : ""}`);
  return parts.join(" · ");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_LINE_ITEMS = 100; // макс. різних позицій у замовленні
const MAX_QTY = 100;        // макс. кількість однієї позиції

export async function POST(req: Request) {
  const rl = rateLimit(`order:${clientIp(req)}`, 6, 60_000); // 6 замовлень / хв з IP
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body: OrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { delivery, name, phone, address, comment, consent, items } = body;

  if (!name?.trim() || !phone?.trim() || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (items.length > MAX_LINE_ITEMS) {
    return NextResponse.json({ ok: false, error: "too_many_items" }, { status: 400 });
  }
  if (items.some((i) => !i || typeof i.id !== "string")) {
    return NextResponse.json({ ok: false, error: "bad_items" }, { status: 400 });
  }
  // id рядка кошика містить опції, тому товар шукаємо за productId (старі кошики — за id)
  const productIdOf = (i: IncomingItem) => (typeof i.productId === "string" ? i.productId : i.id.split("|")[0]);
  if (consent !== true) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 400 });
  }
  if (!CARRIER_LABEL[delivery]) {
    return NextResponse.json({ ok: false, error: "bad_delivery" }, { status: 400 });
  }
  // відділення (або опис способу для «інше») обовʼязкове — без нього нема куди слати
  if (!address?.trim()) {
    return NextResponse.json({ ok: false, error: "address_required" }, { status: 400 });
  }
  // ліміти довжини текстових полів (анти-спам/абʼюз)
  if (name.length > 100 || phone.length > 30 || (address?.length ?? 0) > 300 || (comment?.length ?? 0) > 1000) {
    return NextResponse.json({ ok: false, error: "field_too_long" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // залогінений покупець — замовлення потрапить у його кабінет (сесія з cookie, не з тіла запиту)
  const { data: { user } } = await (await createSessionClient()).auth.getUser();

  // ---- Авторитетні ціни з БД (захист від підміни ціни на клієнті) ----
  const ids = [...new Set(items.map(productIdOf).filter((id) => UUID_RE.test(id)))];
  const fromDb = new Map<string, DbProductRow>();
  const promoPrice = new Map<string, number>(); // авторитетна акційна ціна по товару
  const stickerNames = new Set<string>();       // дозволені назви наклейок
  if (ids.length) {
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, price, is_available, sizes, colors, sticker_option, sticker_price")
      .in("id", ids);
    for (const p of prods ?? []) {
      if (!p.is_available) continue;
      fromDb.set(p.id, {
        name: p.name,
        price: Number(p.price),
        sizes: Array.isArray(p.sizes) ? p.sizes : [],
        colors: Array.isArray(p.colors)
          ? (p.colors as { name?: unknown }[]).map((c) => String(c?.name ?? "")).filter(Boolean)
          : [],
        stickerOption: Boolean(p.sticker_option),
        stickerPrice: Number(p.sticker_price ?? 0),
      });
    }
    // назви наклейок — теж авторитетні, з бібліотеки
    const { data: stickerRows } = await supabase.from("stickers").select("name").eq("is_active", true);
    for (const s of stickerRows ?? []) stickerNames.add(s.name);
    // активні акції на ці товари — щоб ціна замовлення збігалася з тією, що бачить клієнт
    const { data: promos } = await supabase
      .from("promos")
      .select("product_id, promo_price, is_active, valid_from, valid_until")
      .in("product_id", ids)
      .eq("is_active", true);
    const now = new Date();
    for (const pr of promos ?? []) {
      if (!pr.product_id) continue;
      if (pr.valid_from && new Date(pr.valid_from) > now) continue;
      if (pr.valid_until && new Date(pr.valid_until) < now) continue;
      const pp = Number(pr.promo_price);
      if (pp > 0) {
        const prev = promoPrice.get(pr.product_id);
        promoPrice.set(pr.product_id, prev != null ? Math.min(prev, pp) : pp);
      }
    }
  }

  // Кожна позиція мусить резолвитись у доступний товар з БД.
  // Ціна й назва — ВИКЛЮЧНО з БД (ніколи з клієнта), інакше — відмова.
  const lineItems: LineItem[] = [];
  for (const i of items) {
    const pid = productIdOf(i);
    const db = fromDb.get(pid);
    if (!db) {
      return NextResponse.json({ ok: false, error: "item_unavailable" }, { status: 400 });
    }
    const qty = Math.floor(Number(i.qty) || 0);
    if (qty < 1 || qty > MAX_QTY) {
      return NextResponse.json({ ok: false, error: "invalid_qty" }, { status: 400 });
    }

    // опції: приймаємо лише ті значення, які реально налаштовані на товарі
    const size = db.sizes.includes(String(i.options?.size ?? "")) ? String(i.options!.size) : undefined;
    const color = db.colors.includes(String(i.options?.color ?? "")) ? String(i.options!.color) : undefined;
    const sticker =
      db.stickerOption && stickerNames.has(String(i.options?.sticker ?? "")) ? String(i.options!.sticker) : undefined;

    // обовʼязкові опції (якщо товар їх має) мусять бути вибрані
    if ((db.sizes.length && !size) || (db.colors.length && !color)) {
      return NextResponse.json({ ok: false, error: "options_required" }, { status: 400 });
    }

    const promoP = promoPrice.get(pid);
    const base = promoP != null ? Math.min(db.price, promoP) : db.price;
    const stickerPrice = sticker ? db.stickerPrice : 0;

    lineItems.push({
      productId: pid,
      name: db.name,
      // акційна ціна, якщо вона є й нижча за каталожну, + доплата за наклейку
      price: base + stickerPrice,
      qty,
      options: size || color || sticker ? { size, color, sticker, stickerPrice: stickerPrice || undefined } : null,
    });
  }
  const subtotal = lineItems.reduce((s, i) => s + i.price * i.qty, 0);

  // Вартість доставки не рахуємо взагалі — її називає менеджер при підтвердженні.
  const total = subtotal;

  // ---- Запис замовлення в БД (service role обходить RLS) ----
  let orderId: string | null = null;
  let dbSaved = false;
  try {
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        customer_name: name.trim(),
        phone: phone.trim(),
        delivery_type: delivery,
        address: address.trim(),
        comment: comment?.trim() || null,
        subtotal,
        total,
        pd_consent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    orderId = order.id;

    const { error: itemsErr } = await supabase.from("order_items").insert(
      lineItems.map((i) => ({
        order_id: orderId, product_id: i.productId, product_name: i.name,
        price: i.price, quantity: i.qty, options: i.options,
      }))
    );
    if (itemsErr) throw itemsErr;
    dbSaved = true;
  } catch (e) {
    console.error("order insert failed:", (e as Error).message);
  }

  // ---- Сповіщення в Telegram (за авторитетними цінами) ----
  const lines = lineItems.flatMap((i) => {
    const opts = optionsLine(i.options);
    return [`• ${esc(i.name)} × ${i.qty} — ${i.price * i.qty} грн`, ...(opts ? [`   ↳ ${esc(opts)}`] : [])];
  });
  const msg = [
    "🛒 <b>НОВЕ ЗАМОВЛЕННЯ</b>",
    "",
    `👤 <b>Ім'я:</b> ${esc(name)}`,
    `📞 <b>Телефон:</b> ${esc(phone)}`,
    `🚚 <b>Доставка:</b> ${CARRIER_LABEL[delivery]}`,
    `📍 <b>Відділення:</b> ${esc(address)}`,
    comment?.trim() ? `💬 <b>Коментар:</b> ${esc(comment)}` : null,
    "",
    "<b>Позиції:</b>",
    ...lines,
    "",
    `💰 <b>Разом:</b> ${total} грн`,
    !dbSaved ? "\n⚠️ <i>Замовлення не збереглося в БД — перевірте адмінку</i>" : null,
  ]
    .filter(Boolean)
    .join("\n");

  const sent = await sendTelegramMessage(msg);

  // замовлення нікуди не дійшло (ні БД, ні Telegram) — чесна помилка, клієнт НЕ очистить кошик
  if (!dbSaved && !sent) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 502 });
  }

  // notified видно в devtools і при перевірці curl-ом: якщо false — у Vercel
  // не задані (або невірні) TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID
  return NextResponse.json({ ok: true, orderId, saved: dbSaved, notified: sent });
}
