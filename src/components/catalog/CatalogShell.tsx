import Link from "next/link";
import CartHost from "./CartHost";
import { CONTACTS, TEXTS } from "@/data/site";

// Каркас сторінок каталогу (товар, категорія) — серверний, у стилі сайту.
// Шапка з брендом і кошиком + мінімальний футер; хлібні крихти передаються ззовні.
export default function CatalogShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 10, height: "var(--header-h)",
          borderBottom: "1px solid var(--border)", background: "rgba(13,11,9,0.92)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center",
        }}
      >
        <div style={{ maxWidth: 1180, width: "100%", margin: "0 auto", padding: "0 var(--page-pad)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <Link
            href="/"
            style={{ fontFamily: "var(--font-church)", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: "var(--text-primary)", textDecoration: "none" }}
          >
            ІСИХАСТ
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Link href="/" style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-secondary)", textDecoration: "none" }}>
              ← На головну
            </Link>
            <CartHost />
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px var(--page-pad) 72px" }}>
        {breadcrumbs}
        {children}
      </div>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "28px var(--page-pad)", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
          {TEXTS.footerTagline}
          <br />
          {CONTACTS.address} · {CONTACTS.phone}
        </p>
      </footer>
    </main>
  );
}
