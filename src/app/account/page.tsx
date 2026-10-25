import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";
import AccountView from "@/components/account/AccountView";

export const metadata: Metadata = {
  title: "Особистий кабінет",
  robots: { index: false, follow: false },
};

// Доступ лише з сесією — без неї middleware перенаправляє на /login.
export default function AccountPage() {
  return (
    <InfoPageShell>
      <AccountView />
    </InfoPageShell>
  );
}
