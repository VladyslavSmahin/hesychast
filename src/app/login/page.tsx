import type { Metadata } from "next";
import InfoPageShell from "@/components/InfoPageShell";
import LoginForm from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Вхід",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <InfoPageShell>
      <LoginForm />
    </InfoPageShell>
  );
}
