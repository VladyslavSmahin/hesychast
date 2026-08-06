// Структуровані дані (schema.org) для пошуковика — саме вони дають розширені
// сніпети: ціна й наявність у видачі, хлібні крихти під заголовком тощо.
//
// Про безпеку: розмітка — це JSON, згенерований нами із даних БД, а не HTML
// від користувача. Символи, якими можна було б вирватися зі <script>, екрануємо
// у \u-послідовності — тоді вміст лишається валідним JSON і не може стати тегом.
const escapeJson = (json: string) =>
  json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJson(JSON.stringify(data)) }}
    />
  );
}
