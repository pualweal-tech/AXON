import ICAL from "ical.js";
import { isoDate, addDays, startOfWeek, parseIso } from "./dates";
import { planTasks, type Conversion } from "./planning";
import type { WeeklyPlan } from "./types";

const compact = (s: string) => s.replace(/-/g, "");
const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
export function calendarFile(plan: WeeklyPlan, reminders: boolean) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AXON//Personal Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  for (const item of planTasks(plan)) {
    const date = compact(item.date!),
      time = parseTime(item.time || "");
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + escapeText(item.originId!) + "@axon",
      "DTSTAMP:" + stamp,
      time
        ? "DTSTART:" + date + "T" + time.replace(":", "") + "00"
        : "DTSTART;VALUE=DATE:" + date,
      "SUMMARY:" + escapeText(item.title),
    );
    if (reminders && time)
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT10M",
        "DESCRIPTION:" + escapeText(item.title),
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  return [...lines, "END:VCALENDAR", ""].join("\r\n");
}
export function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return "";
  let h = Number(match[1]);
  const m = Number(match[2] || 0);
  if (m > 59 || h > 23 || (match[3] && (h < 1 || h > 12))) return "";
  if (match[3]) h = (h % 12) + (match[3].toLowerCase() === "pm" ? 12 : 0);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}
export async function importWeek(
  text: string,
  anchor: string,
): Promise<Conversion[]> {
  if (text.length > 1500000) throw Error("Calendar exceeds 1.5 MB");
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== "vcalendar") throw Error("Invalid calendar");
  const begin = startOfWeek(anchor),
    end = parseIso(addDays(isoDate(begin), 7));
  const zones = root.getAllSubcomponents("vtimezone");
  const events = root
    .getAllSubcomponents("vevent")
    .map((c) => new ICAL.Event(c));
  const result: Conversion[] = [];
  try {
    for (const z of zones) ICAL.TimezoneService.register(z);
    for (const event of events.filter((e) => !e.isRecurrenceException())) {
      for (const child of events.filter(
        (e) => e.isRecurrenceException() && e.uid === event.uid,
      ))
        event.relateException(child);
      const iter = event.iterator();
      for (let count = 0; count < 20000; count++) {
        const occurrence = event.isRecurring() ? iter.next() : event.startDate;
        if (!occurrence || occurrence.toJSDate() >= end) break;
        const detail = event.getOccurrenceDetails(occurrence),
          start = detail.startDate.toJSDate();
        if (
          start >= begin &&
          start < end &&
          detail.item.component.getFirstPropertyValue("status") !== "CANCELLED"
        ) {
          const day = isoDate(start),
            time = detail.startDate.isDate
              ? undefined
              : parseTime(
                  start.getHours() +
                    ":" +
                    String(start.getMinutes()).padStart(2, "0"),
                );
          const bytes = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(event.uid + "/" + occurrence.toString()),
          );
          const originId =
            "calendar-" +
            Array.from(new Uint8Array(bytes), (v) =>
              v.toString(16).padStart(2, "0"),
            ).join("");
          result.push({
            title: (detail.item.summary || "Event").slice(0, 1000),
            date: day,
            time,
            endsAt: detail.endDate.toJSDate().getTime(),
            originId,
            category: "personal",
          });
          if (result.length > 1000) throw Error("Too many events");
        }
        if (!event.isRecurring()) break;
        if (count === 19999) throw Error("Recurrence exceeds supported range");
      }
    }
  } finally {
    for (const z of zones)
      ICAL.TimezoneService.remove(String(z.getFirstPropertyValue("tzid")));
  }
  return result;
}
export function downloadCalendar(plan: WeeklyPlan, reminders: boolean) {
  const url = URL.createObjectURL(
    new Blob([calendarFile(plan, reminders)], {
      type: "text/calendar;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "AXON-" + (plan.weekOf || "plan") + ".ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
