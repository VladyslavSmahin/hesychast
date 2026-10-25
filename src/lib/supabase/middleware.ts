import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Оновлює сесію (refresh токенів у cookies) і захищає сторінки:
//  /account — лише з сесією, інакше на /login;
//  /admin   — лише staff (admin/editor); без сесії → /login, покупець → /account?denied=1;
//  /login   — із сесією одразу туди, куди просили (?next) або в кабінет.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const redirect = (pathname: string, params: Record<string, string> = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return NextResponse.redirect(url);
  };

  if (path === "/login") {
    if (!user) return response;
    return redirect(safeNext(request.nextUrl.searchParams.get("next")));
  }

  // старе посилання /admin/login веде на спільний вхід, а після нього — в адмінку
  if (!user) return redirect("/login", { next: path === "/admin/login" ? "/admin" : path });

  if (path.startsWith("/admin")) {
    // Роль із profiles перевіряємо на сервері, а не лише на клієнті —
    // інакше будь-який залогінений покупець бачив би /admin.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isStaff = profile?.role === "admin" || profile?.role === "editor";
    if (!isStaff) return redirect("/account", { denied: "1" });
  }

  return response;
}

/** Лише внутрішній шлях — захист від open redirect через ?next=//evil.com. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}
