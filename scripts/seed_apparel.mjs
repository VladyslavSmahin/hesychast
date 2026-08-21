// Проставляє опції одягу (розміри, кольори, наклейка, розмірна сітка) товарам-футболкам.
// Запуск: node scripts/seed_apparel.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SIZE_CHART = "https://wpluiixhfyqbwsskouyk.supabase.co/storage/v1/object/public/media/products/ea7ec79e-125f-48de-a40b-b5859474d58f.webp";

const PATCH = {
  sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  colors: [
    { name: "Білий", hex: "#FFFFFF" },
    { name: "Чорний", hex: "#111111" },
    { name: "Блакитний", hex: "#8ECAE6" },
    { name: "Жовтий", hex: "#F2C14E" },
    { name: "Червоний", hex: "#C1392B" },
    { name: "Хакі", hex: "#6B705C" },
  ],
  sticker_option: true,
  sticker_price: 75,
  size_chart_image: SIZE_CHART,
};

const { data: products, error } = await supabase.from("products").select("id, name").ilike("name", "%футболк%");
if (error) { console.error(error.message); process.exit(1); }
if (!products.length) { console.log("Футболок у каталозі не знайдено."); process.exit(0); }

for (const p of products) {
  const { error: e } = await supabase.from("products").update(PATCH).eq("id", p.id);
  console.log(e ? `FAIL ${p.name}: ${e.message}` : `OK  ${p.name}`);
}
