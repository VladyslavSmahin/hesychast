"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ScrollTop from "./ScrollTop";
import RefreshButton from "./RefreshButton";
import { useAdminAuth } from "@/features/admin/AdminAuthContext";
import { refreshAdminAction } from "@/features/admin/actions/common";
import s from "./admin.module.css";

// «Огляд» і «Маркетинг» (акції, новини) поки сховані з меню — сторінки акцій і новин
// лишились і відкриваються за прямим посиланням.
const NAV: { group: string; items: { href: string; label: string }[] }[] = [
  {
    group: "Каталог",
    items: [
      { href: "/admin/categories", label: "Категорії" },
      { href: "/admin/products", label: "Товари" },
      { href: "/admin/stickers", label: "Наклейки" },
    ],
  },
  {
    group: "Замовлення",
    items: [
      { href: "/admin/orders", label: "Замовлення" },
      { href: "/admin/reviews", label: "Відгуки" },
      { href: "/admin/gallery", label: "Галерея клієнтів" },
    ],
  },
  {
    group: "Система",
    items: [
      { href: "/admin/glossary", label: "Глосарій" },
      { href: "/admin/staff", label: "Співробітники" },
    ],
  },
];

/** Група меню, якій належить поточний маршрут (для авто-розгортання). */
function groupOfPath(path: string): string | undefined {
  return NAV.find((g) =>
    g.items.some((i) => i.href === path || (i.href !== "/admin" && path.startsWith(i.href + "/")))
  )?.group;
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, denied, logout } = useAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  // розгорнуті групи меню; за замовчуванням відкрита та, де поточна сторінка
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const g = groupOfPath(pathname);
    return g ? [g] : [NAV[0].group];
  });
  // куди йде перехід — для миттєвого візуального відгуку (спінер + підсвітка),
  // щоб не складалося враження зависання й не тиснули кілька разів
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isLogin = pathname === "/admin/login";

  // перехід завершено (маршрут змінився) — прибираємо індикатор
  useEffect(() => {
    setNavOpen(false);
    setPendingHref(null);
    const g = groupOfPath(pathname);
    if (g) setOpenGroups((prev) => (prev.includes(g) ? prev : [...prev, g]));
  }, [pathname]);

  const toggleGroup = (group: string) =>
    setOpenGroups((prev) => (prev.includes(group) ? prev.filter((x) => x !== group) : [...prev, group]));

  const signOut = async () => { await logout(); router.replace("/login"); };

  // сторінка логіну — без оболонки
  if (isLogin) return <>{children}</>;

  // завантаження сесії/ролі
  if (loading) {
    return (
      <div className={s.login}>
        <div className={s.loginCard}><p className={s.hint}>Завантаження…</p></div>
      </div>
    );
  }

  // залогінений у Google, але email не в білому списку
  if (denied) {
    return (
      <div className={s.login}>
        <div className={s.loginCard}>
          <div className={s.placeholderTitle} style={{ marginBottom: 8 }}>Немає доступу</div>
          <p className={s.hint} style={{ marginBottom: 18 }}>
            Акаунт <b>{denied}</b> не входить у білий список співробітників.
            Зверніться до адміністратора, щоб вас додали.
          </p>
          <button className={`${s.btn} ${s.btnGhost}`} onClick={signOut}>Вийти</button>
        </div>
      </div>
    );
  }

  // немає сесії (middleware перенаправить) — нічого не рендеримо
  if (!user) return null;

  const title =
    NAV.flatMap((g) => g.items).find((i) => i.href === pathname)?.label ?? "Адмінка";

  return (
    <div className={s.shell}>
      {navOpen && <div className={s.overlay} onClick={() => setNavOpen(false)} />}
      <aside className={`${s.sidebar} ${navOpen ? s.sidebarOpen : ""}`}>
        <Link href="/" className={s.brand} title="Перейти на сайт">
          <div>
            <div className={s.brandText} style={{ fontFamily: "var(--font-church)", letterSpacing: 4 }}>ІСІХАСТ</div>
            <div className={s.brandSub}>Адмінпанель</div>
          </div>
        </Link>

        {NAV.map((g) => {
          const open = openGroups.includes(g.group);
          return (
            <div key={g.group} className={s.navGroup}>
              <button
                type="button"
                className={s.navGroupBtn}
                onClick={() => toggleGroup(g.group)}
                aria-expanded={open}
              >
                <span>{g.group}</span>
                <Chevron open={open} />
              </button>

              <div className={`${s.navGroupBody} ${open ? s.navGroupBodyOpen : ""}`}>
                <div className={s.navGroupItems}>
                  {g.items.map((it) => {
                    const active = pathname === it.href;
                    const pending = pendingHref === it.href;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        tabIndex={open ? undefined : -1}
                        onClick={() => { if (pathname !== it.href) setPendingHref(it.href); }}
                        className={`${s.navItem} ${active || pending ? s.navItemActive : ""}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
                      >
                        {it.label}
                        {pending && <Spinner />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <Link href="/" className={s.navItem}>← На сайт</Link>
          <button className={s.navItem} style={{ width: "100%", textAlign: "left", background: "transparent" }} onClick={signOut}>
            Вийти
          </button>
        </div>
      </aside>

      <div className={s.main}>
        <div className={s.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className={s.menuBtn} aria-label="Меню" onClick={() => setNavOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className={s.topTitle}>{title}</div>
          </div>

          <div className={s.userBox}>
            <RefreshButton action={refreshAdminAction} />
            <div className={s.avatar} title={`${user.name} · ${user.role}`}>{user.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>

        <div className={s.content}>{children}</div>
      </div>
      <ScrollTop />
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round"
      className={`${s.navChevron} ${open ? s.navChevronOpen : ""}`}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" style={{ animation: "spin 0.7s linear infinite", flexShrink: 0, opacity: 0.9 }}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}
