import { NextResponse } from "next/server";
import { syncTgNews } from "@/lib/tgNews";
import { isStaff } from "@/lib/adminAuth";
import { revalidateTag } from "next/cache";
import { PUBLIC_TAG } from "@/features/publicCache";

// GET /api/cron/tg-news — оновлення новин із Telegram-каналів.
// Викликає Vercel Cron (кожні 5 годин) або співробітник із адмінки.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorized =
    (secret && req.headers.get("authorization") === `Bearer ${secret}`) || (await isStaff());

  if (!authorized) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncTgNews();
    revalidateTag(PUBLIC_TAG); // новини видно на вітрині — скидаємо її кеш
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("tg news sync failed:", (e as Error).message);
    return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
  }
}
