import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Серверний клієнт БЕЗ cookies — для сторінок, які не залежать від користувача
// (sitemap). Звичайний серверний клієнт читає cookies, через що Next не може
// відрендерити маршрут статично й дані просто не потрапляють у результат.
// Доступ обмежений RLS: публічно читається лише каталог.
export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
