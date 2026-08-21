// Записує адресу сайту та CRON_SECRET у settings.cron_config,
// щоб планувальник Supabase (pg_cron, раз на добу) міг смикати /api/cron/tg-news.
//
// Використання: node scripts/setup_cron.mjs https://ваш-домен
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

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error("Вкажіть адресу сайту: node scripts/setup_cron.mjs https://ваш-домен");
  process.exit(1);
}
if (!env.CRON_SECRET) {
  console.error("У .env.local немає CRON_SECRET");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await supabase
  .from("settings")
  .upsert({ key: "cron_config", value: { url: url.replace(/\/+$/, ""), secret: env.CRON_SECRET } }, { onConflict: "key" });

if (error) { console.error("Помилка:", error.message); process.exit(1); }
console.log(`OK: pg_cron раз на добу смикатиме ${url.replace(/\/+$/, "")}/api/cron/tg-news`);
console.log("Не забудьте додати CRON_SECRET у змінні оточення Vercel.");
