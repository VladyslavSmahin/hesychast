// Завантажує фото товарів і фото клієнтів (галерея) у Supabase Storage з конвертацією у WebP.
// Запуск: node scripts/seed_photos.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "media";
const DESKTOP = "/Users/vladyslav/Desktop";

async function upload(file, folder, maxDim = 1400) {
  const webp = await sharp(readFileSync(join(DESKTOP, file)))
    .rotate()
    .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer();
  const key = `${folder}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, webp, {
    contentType: "image/webp", cacheControl: "31536000", upsert: false,
  });
  if (error) throw new Error(`${file}: ${error.message}`);
  return `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
}

// ---- фото товарів: файл → назва товару в БД ----
const PRODUCT_PHOTOS = [
  ["Лесной.png", "Мед Лесной"],
  ["Акация.png", "Мед Акация"],
  ["Разнотравный.png", "Мед Разнотравный"],
  ["Подсолнух.png", "Мед Подсолнух"],
  ["Прополис.png", "Прополис"],
  ["Мед в сотах паленький.png", "Мед в сотах до 350 г"],
  ["Мед в сотах большой.png.png", "Мед в сотах до 2 кг"],
  // безіменні файли: дрібні круглі різнокольорові гранули — пилок, щільні стовпчики — перга
  ["ChatGPT Image 22 авг. 2026 г., 00_26_43 (1).png", "Пыльца"],
  ["ChatGPT Image 22 авг. 2026 г., 00_26_44 (3).png", "Перга"],
];

console.log("— Фото товарів —");
for (const [file, productName] of PRODUCT_PHOTOS) {
  const { data: rows } = await supabase.from("products").select("id, name").eq("name", productName);
  if (!rows?.length) { console.log(`SKIP ${productName} — товару немає в БД`); continue; }
  const url = await upload(file, "products", 1280);
  const { error } = await supabase.from("products").update({ image_path: url }).eq("id", rows[0].id);
  console.log(error ? `FAIL ${productName}: ${error.message}` : `OK   ${productName}`);
}

// ---- фото клієнтів у галерею ----
const GALLERY = [
  "2026-08-22 00.29.00.jpg", "2026-08-22 00.29.13.jpg", "2026-08-22 00.29.18.jpg",
  "2026-08-22 00.29.27.jpg", "2026-08-22 00.30.31.jpg", "2026-08-22 00.30.47.jpg",
  "2026-08-22 00.30.52.jpg", "2026-08-22 00.30.57.jpg", "2026-08-22 00.31.02.jpg",
];

const { count } = await supabase.from("gallery_items").select("id", { count: "exact", head: true });
if (count) {
  console.log(`\n— Галерея: вже ${count} записів, пропускаю —`);
} else {
  console.log("\n— Фото клієнтів —");
  let sort = 10;
  for (const file of GALLERY) {
    const url = await upload(file, "products", 1400);
    const { error } = await supabase.from("gallery_items").insert({ image_path: url, sort_order: sort });
    console.log(error ? `FAIL ${file}: ${error.message}` : `OK   ${file}`);
    sort += 10;
  }
}
console.log("\nГотово.");
