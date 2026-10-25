import { NextResponse } from "next/server";
import { sendTelegramMessage, esc } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";

interface ReviewBody {
  name: string;
  contact: string;
  rating: number;
  text: string;
}

export async function POST(req: Request) {
  const rl = rateLimit(`review:${clientIp(req)}`, 4, 60_000); // 4 відгуки / хв з IP
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
  }

  let body: ReviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  // відгук від акаунта: імʼя й контакт беремо з профілю, а не з форми
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  let { name, contact } = body;
  const { rating, text } = body;
  if (user) {
    const { data: profile } = await session.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
    name = profile?.full_name?.trim() || name?.trim() || user.email || "";
    contact = profile?.phone?.trim() || user.email || contact;
  }
  if (!name?.trim() || !contact?.trim() || !text?.trim()) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  // ліміти довжини текстових полів (анти-спам/абʼюз)
  if (name.length > 100 || contact.length > 100 || text.length > 2000) {
    return NextResponse.json({ ok: false, error: "field_too_long" }, { status: 400 });
  }

  const r = Number(rating);
  const ratingVal = r >= 1 && r <= 5 ? Math.floor(r) : null;

  // Запис у БД зі статусом pending (модерація в адмінці)
  try {
    const { error } = await createAdminClient().from("reviews").insert({
      user_id: user?.id ?? null,
      author_name: name.trim(), contact: contact.trim(), rating: ratingVal, text: text.trim(), status: "pending",
    });
    if (error) console.error("review insert failed:", error.message);
  } catch (e) {
    console.error("review insert failed:", (e as Error).message);
  }

  const stars = ratingVal ? "⭐".repeat(ratingVal) : "—";

  const msg = [
    "📝 <b>НОВИЙ ВІДГУК</b>",
    "",
    `👤 <b>Ім'я:</b> ${esc(name)}${user ? " (акаунт)" : ""}`,
    `📞 <b>Контакт:</b> ${esc(contact)}`,
    `⭐ <b>Оцінка:</b> ${stars}`,
    "",
    esc(text),
  ].join("\n");

  const sent = await sendTelegramMessage(msg);
  return NextResponse.json({ ok: true, telegram: sent });
}
