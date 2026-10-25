import { redirect } from "next/navigation";

// Огляд (дашборд) поки прибрано — адмінка відкривається одразу на замовленнях.
// Попередня версія сторінки — в історії git.
export default function AdminHome() {
  redirect("/admin/orders");
}
