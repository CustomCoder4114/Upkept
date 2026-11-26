/**
 * Preview of the morning summary, worded exactly like the backend's
 * app/services/home.py summary_text(), so what you see here is what you get.
 */
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function midSentence(title: string) {
  return title.length > 1 && title[0] === title[0].toUpperCase() && title[1] === title[1].toLowerCase() && /[A-Za-z]/.test(title[1])
    ? title[0].toLowerCase() + title.slice(1) : title;
}

function when(days: number, today: Date) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return `on ${WEEKDAYS[d.getDay()]}`;
  }
  return `in ${days} days`;
}

export function summaryText(items: { title: string; days_left: number | null }[], today = new Date()) {
  const list = items.filter((i) => i.days_left !== null).sort((a, b) => a.days_left! - b.days_left!);
  if (!list.length) return null;
  const expired = list.filter((i) => i.days_left! < 0);
  const coming = list.filter((i) => i.days_left! >= 0);
  const sentences: string[] = [];
  if (coming.length) {
    const named = coming.slice(0, 3).map((i) => `${midSentence(i.title)} ${when(i.days_left!, today)}`);
    const more = coming.length - 3;
    const text = named.join(", ") + (more > 0 ? ` and ${more} more` : "");
    sentences.push(text[0].toUpperCase() + text.slice(1) + ".");
  }
  if (expired.length) sentences.push(expired.length === 1 ? `${expired[0].title} has expired.` : `${expired.length} things have expired.`);
  return { title: `Home: ${list.length} thing${list.length === 1 ? "" : "s"} this week`, body: sentences.join(" ") };
}
