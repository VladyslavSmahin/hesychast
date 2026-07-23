// Применяет указанные SQL-файлы миграций через Session pooler (одноразово).
// Использование: node scripts/apply_migrations.mjs 0001_auth_roles.sql 0002_catalog.sql
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// читаем SUPABASE_DB_URL_SP из .env.local
const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
const url = env.split("\n").find((l) => l.startsWith("SUPABASE_DB_URL_SP="))?.slice("SUPABASE_DB_URL_SP=".length).trim();
if (!url) { console.error("SUPABASE_DB_URL_SP не задан в .env.local"); process.exit(1); }

const files = process.argv.slice(2);
if (files.length === 0) { console.error("Укажите файлы миграций"); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Подключено к БД.");
  for (const f of files) {
    const sql = readFileSync(join(__dirname, "..", "supabase", "migrations", f), "utf8");
    process.stdout.write(`Применяю ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  console.log("Все миграции применены.");
} catch (e) {
  console.error("ОШИБКА:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
