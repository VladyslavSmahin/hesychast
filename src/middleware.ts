import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Гард та оновлення сесії для адмінки, кабінету й сторінки входу.
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login"],
};
