import { NextResponse } from "next/server";
import { isStaff } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/storage";

// POST /api/video-upload — видає підписане посилання на завантаження відео.
// Відео вантажиться з браузера ПРЯМО в Supabase Storage: через сервер його гнати
// не можна (ліміт тіла запиту на Vercel — 4.5 МБ).
export const runtime = "nodejs";

const ALLOWED = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export async function POST(req: Request) {
  if (!(await isStaff())) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { contentType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const type = String(body.contentType || "");
  if (!ALLOWED.has(type)) {
    return NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 });
  }

  const ext = type === "video/webm" ? "webm" : type === "video/quicktime" ? "mov" : "mp4";
  const path = `videos/${crypto.randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("signed upload url failed:", error?.message);
    return NextResponse.json({ ok: false, error: "sign_failed" }, { status: 502 });
  }

  const publicUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;

  return NextResponse.json({ ok: true, path, token: data.token, publicUrl });
}
