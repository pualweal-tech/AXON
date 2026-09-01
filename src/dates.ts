import type { Category, Lang } from "./types";
import { t, type CopyKey } from "./i18n";

export function isoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function startOfWeek(iso: string): Date {
  const d = parseIso(iso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return isoDate(d);
  });
}

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatShort(iso: string, lang: Lang): string {
  const d = parseIso(iso);
  if (lang === "zh") return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export function formatRange(iso: string, lang: Lang): string {
  const dates = weekDates(iso);
  const a = parseIso(dates[0]);
  const b = parseIso(dates[4]);
  if (lang === "zh") {
    return `${a.getMonth() + 1}月${a.getDate()}日—${b.getMonth() + 1}月${b.getDate()}日`;
  }
  const left = `${months[a.getMonth()]} ${a.getDate()}`;
  const right =
    a.getMonth() === b.getMonth()
      ? `${b.getDate()}`
      : `${months[b.getMonth()]} ${b.getDate()}`;
  return `${left}—${right}`;
}

export function formatRangeCaps(iso: string): string {
  const dates = weekDates(iso);
  const a = parseIso(dates[0]);
  const b = parseIso(dates[4]);
  const left = `${months[a.getMonth()].toUpperCase()} ${a.getDate()}`;
  const right =
    a.getMonth() === b.getMonth()
      ? `${String(b.getDate())}`
      : `${months[b.getMonth()].toUpperCase()} ${b.getDate()}`;
  return `${left} - ${right}`;
}

export function weekdayKey(iso: string): CopyKey {
  const keys: CopyKey[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return keys[parseIso(iso).getDay()];
}

export function relativeLabel(iso: string, today: string, lang: Lang): string {
  if (iso === today) return t(lang, "today");
  if (iso === addDays(today, 1)) return t(lang, "tomorrow");
  if (iso === addDays(today, -1)) return t(lang, "yesterday");
  return formatShort(iso, lang);
}

export function formatTime(ts: number, lang: Lang): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  if (lang === "zh") return `${h}:${m}`;
  const am = h < 12;
  const hr = h % 12 || 12;
  return `${hr}:${m} ${am ? "AM" : "PM"}`;
}

export function categoryLabel(cat: Category, lang: Lang): string {
  return t(lang, cat);
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
