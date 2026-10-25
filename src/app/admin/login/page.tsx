import { redirect } from "next/navigation";

// Окремого входу в адмінку більше немає: усі входять на /login,
// а в /admin middleware пускає лише staff (admin/editor).
export default function AdminLoginRedirect() {
  redirect("/login?next=/admin");
}
