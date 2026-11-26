/**
 * Popular subscriptions, worldwide. Names and type only: prices differ by country
 * and change often, so the person types what they actually pay.
 */
import type { SpendGroup } from "@upkept/api-client";

export interface Service { name: string; group: SpendGroup; type: string }

const S = (name: string, group: SpendGroup, type: string): Service => ({ name, group, type });

export const POPULAR_SERVICES: Service[] = [
  // Video
  S("Netflix", "entertainment", "streaming"), S("YouTube Premium", "entertainment", "streaming"),
  S("Disney+", "entertainment", "streaming"), S("Amazon Prime", "entertainment", "streaming"),
  S("Max", "entertainment", "streaming"), S("Apple TV+", "entertainment", "streaming"),
  S("Hulu", "entertainment", "streaming"), S("Paramount+", "entertainment", "streaming"),
  S("Peacock", "entertainment", "streaming"), S("Showmax", "entertainment", "streaming"),
  S("DStv", "entertainment", "streaming"), S("GOtv", "entertainment", "streaming"),
  S("Crunchyroll", "entertainment", "streaming"),
  // Music and books
  S("Spotify", "entertainment", "streaming"), S("Apple Music", "entertainment", "streaming"),
  S("YouTube Music", "entertainment", "streaming"), S("Deezer", "entertainment", "streaming"),
  S("Tidal", "entertainment", "streaming"), S("Boomplay", "entertainment", "streaming"),
  S("Audible", "entertainment", "streaming"), S("Kindle Unlimited", "entertainment", "streaming"),
  // Games
  S("PlayStation Plus", "entertainment", "streaming"), S("Xbox Game Pass", "entertainment", "streaming"),
  S("Nintendo Switch Online", "entertainment", "streaming"),
  // Storage and work
  S("iCloud+", "internet_phone", "other"), S("Google One", "internet_phone", "other"),
  S("Microsoft 365", "other", "other"), S("Dropbox", "other", "other"), S("Adobe Creative Cloud", "other", "other"),
  S("Canva Pro", "other", "other"), S("Notion", "other", "other"), S("Zoom", "other", "other"),
  S("Grammarly", "other", "other"), S("LinkedIn Premium", "other", "other"),
  S("ChatGPT Plus", "other", "other"), S("Claude Pro", "other", "other"),
  // Learning, fitness, connectivity
  S("Duolingo", "other", "other"), S("Strava", "fitness", "gym"), S("Starlink", "internet_phone", "internet"),
];

export function searchServices(q: string, limit = 8): Service[] {
  const s = q.trim().toLowerCase();
  if (!s) return POPULAR_SERVICES.slice(0, limit);
  return POPULAR_SERVICES.filter((x) => x.name.toLowerCase().includes(s)).slice(0, limit);
}
