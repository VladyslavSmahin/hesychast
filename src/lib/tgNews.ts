import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Новини з відкритих Telegram-каналів. Bot API читати чужі канали не дає,
// тому беремо публічну веб-версію t.me/s/<канал> і розбираємо її розміткою.
// Викликається кроном (/api/cron/tg-news) — на сайті показуємо вже збережене.

const SYNC_EVERY_MS = 24 * 60 * 60 * 1000; // як часто освіжаємо стрічку (раз на добу)
const MAX_POSTS_PER_CHANNEL = 4;   // скільки останніх постів тримаємо з каналу
const MAX_TEXT = 400;              // обрізаємо довгі пости для картки

// Хвости, які t.me домальовує до розмітки: реакції, службові підписи, «дивитись у Telegram».
const JUNK_LINES = [
  /^please open telegram to view this post$/i,
  /^view in telegram$/i,
  /^open in telegram$/i,
  /^\s*$/,
];

export interface ParsedPost {
  postId: number;
  text: string;
  image: string | null;
  link: string;
  postedAt: string | null;
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
   // числові мнемоніки (&#33;, &#x27;) — Telegram віддає текст саме так
   .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
   .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
   .replace(/&amp;/g, "&");

/** Текст поста: прибираємо теги, <br> → перенос рядка. */
function plainText(html: string): string {
  const raw = decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(?:b|i|u|s|a|span|code|pre|em|strong|tg-emoji|tg-spoiler)[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
  ).trim();

  // прибираємо службові рядки та лічильники реакцій («🙏71❤️15…» — самі емодзі й числа)
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !JUNK_LINES.some((re) => re.test(l)))
    .filter((l) => !/^[\p{Extended_Pictographic}\p{Emoji_Component}\d\s+]+$/u.test(l) || /[\p{L}]/u.test(l));

  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT).trimEnd() + "…" : text;
}

/** Назва каналу, як вона задана в самому Telegram. */
export function parseChannelTitle(html: string): string | null {
  const og = html.match(/<meta property="og:title" content="([^"]*)"/);
  if (og?.[1]) return decode(og[1]).trim() || null;
  const header = html.match(/tgme_channel_info_header_title[^>]*>\s*<span[^>]*>([^<]+)/);
  return header?.[1] ? decode(header[1]).trim() : null;
}

/** Розбирає сторінку t.me/s/<канал> у список постів (найновіші — останні на сторінці). */
export function parseChannelHtml(html: string, username: string): ParsedPost[] {
  const blocks = html.split('class="tgme_widget_message_wrap').slice(1);
  const posts: ParsedPost[] = [];

  for (const block of blocks) {
    const idM = block.match(new RegExp(`data-post="${username}/(\\d+)"`, "i"));
    if (!idM) continue;
    const postId = Number(idM[1]);

    // текст поста — до футера повідомлення
    let text = "";
    const tStart = block.search(/<div class="tgme_widget_message_text[^"]*"[^>]*>/);
    if (tStart >= 0) {
      const rest = block.slice(tStart);
      const inner = rest.slice(rest.indexOf(">") + 1);
      const stop = inner.search(/<div class="(tgme_widget_message_(footer|reply_markup|metadata)|tgme_widget_message_reactions)/);
      text = plainText(stop >= 0 ? inner.slice(0, stop) : inner);
    }

    const photoM = block.match(/js-message_photo[^>]*background-image:url\('([^']+)'\)/);
    const timeM = block.match(/<time datetime="([^"]+)"/);

    posts.push({
      postId,
      text,
      image: photoM?.[1] ?? null,
      link: `https://t.me/${username}/${postId}`,
      postedAt: timeM?.[1] ?? null,
    });
  }

  // лишаємо найсвіжіші
  return posts.sort((a, b) => b.postId - a.postId).slice(0, MAX_POSTS_PER_CHANNEL);
}

async function fetchChannel(username: string): Promise<{ posts: ParsedPost[]; title: string | null }> {
  const res = await fetch(`https://t.me/s/${encodeURIComponent(username)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; IsihastBot/1.0)" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`t.me ${res.status}`);
  const html = await res.text();
  return { posts: parseChannelHtml(html, username), title: parseChannelTitle(html) };
}

export interface SyncResult {
  channels: { username: string; fetched: number; error?: string }[];
  saved: number;
}

/** Оновлює пости всіх активних каналів. Пише лише сервер (service role). */
export async function syncTgNews(): Promise<SyncResult> {
  const supabase = createAdminClient();
  const { data: channels } = await supabase
    .from("tg_channels").select("id, username").eq("is_active", true).order("sort_order");

  const result: SyncResult = { channels: [], saved: 0 };

  for (const ch of channels ?? []) {
    try {
      const { posts, title } = await fetchChannel(ch.username);
      if (posts.length) {
        const { error } = await supabase.from("tg_posts").upsert(
          posts.map((p) => ({
            channel_id: ch.id, post_id: p.postId, text: p.text,
            image_path: p.image, link: p.link, posted_at: p.postedAt,
          })),
          { onConflict: "channel_id,post_id" }
        );
        if (error) throw new Error(error.message);
        result.saved += posts.length;

        // тримаємо лише останні MAX_POSTS_PER_CHANNEL постів каналу
        const keep = posts.map((p) => p.postId);
        await supabase.from("tg_posts").delete().eq("channel_id", ch.id).not("post_id", "in", `(${keep.join(",")})`);
      }
      // оригінальну назву каналу зберігаємо окремо — ручний підпис (title) не чіпаємо
      await supabase.from("tg_channels")
        .update({ last_sync_at: new Date().toISOString(), ...(title ? { title_auto: title } : {}) })
        .eq("id", ch.id);
      result.channels.push({ username: ch.username, fetched: posts.length });
    } catch (e) {
      result.channels.push({ username: ch.username, fetched: 0, error: (e as Error).message });
    }
  }

  return result;
}

/**
 * Ліниве оновлення: викликається після віддачі головної сторінки (next/after).
 * Синхронізує новини лише якщо з останньої спроби минула доба —
 * страховка на випадок, якщо планувальник у Supabase не спрацював.
 * Повертає true, якщо синхронізація відбулась.
 */
export async function maybeSyncTgNews(): Promise<boolean> {
  const supabase = createAdminClient();

  // найстаріша (або відсутня) синхронізація серед активних каналів
  const { data: oldest } = await supabase
    .from("tg_channels")
    .select("id, last_sync_at")
    .eq("is_active", true)
    .order("last_sync_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (!oldest) return false; // каналів немає — нічого робити

  const last = oldest.last_sync_at ? new Date(oldest.last_sync_at).getTime() : 0;
  if (Date.now() - last < SYNC_EVERY_MS) return false;

  // одразу позначаємо спробу, щоб паралельні запити не запустили синк удруге
  await supabase
    .from("tg_channels")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("is_active", true);

  await syncTgNews();
  return true;
}
