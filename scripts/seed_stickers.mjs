// Завантажує картинки наклейок у Supabase Storage (bucket media, папка stickers)
// і створює записи в таблиці stickers. Запуск: node scripts/seed_stickers.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "media";
const DESKTOP = "/Users/vladyslav/Desktop";

// файл → назва наклейки
const ITEMS = [
  ["2026-08-22 00.15.07.jpg", "Христос Воскресе! (рядок)"],
  ["2026-08-22 00.15.22.jpg", "Христос Воскресе! (два рядки)"],
  ["2026-08-22 00.15.15.jpg", "Хрест простий"],
  ["2026-08-22 00.15.29.jpg", "Хрест православний"],
  ["2026-08-22 00.15.19.jpg", "Все можу в укріпляючому мене Ісусі Христі"],
  ["2026-08-22 00.15.33.jpg", "Все могу в укрепляющем меня Иисусе Христе"],
  ["2026-08-22 00.15.42.jpg", "Завжди радійте (Фессалонікійцям 5:16-18)"],
  ["2026-08-22 00.15.25.jpg", "Всегда радуйтесь (Фессалоникийцам 5:16-18)"],
  ["2026-08-22 00.15.39.jpg", "Всегда радуйтесь (вʼязь)"],
  ["2026-08-22 00.15.36.jpg", "Ничего святого"],
];

const SIZE_CHART = ["2026-08-22 00.15.48.jpg", "Розмірна сітка футболок"];

async function upload(file, folder) {
  const webp = await sharp(readFileSync(join(DESKTOP, file)))
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer();
  const key = `${folder}/${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(key, webp, {
    contentType: "image/webp", cacheControl: "31536000", upsert: false,
  });
  if (error) throw new Error(`${file}: ${error.message}`);
  return `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/${key}`;
}

const { count } = await supabase.from("stickers").select("id", { count: "exact", head: true });
if (count) { console.log(`У таблиці stickers вже ${count} записів — пропускаю.`); process.exit(0); }

let sort = 10;
for (const [file, name] of ITEMS) {
  const url = await upload(file, "stickers");
  const { error } = await supabase.from("stickers").insert({ name, image_path: url, sort_order: sort });
  if (error) throw new Error(`${name}: ${error.message}`);
  console.log(`OK  ${name}`);
  sort += 10;
}

const chartUrl = await upload(SIZE_CHART[0], "products");
console.log(`\nРозмірна сітка: ${chartUrl}`);
console.log("Готово.");
