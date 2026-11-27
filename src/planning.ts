import type { AppData, Category, WeeklyPlan, Task } from "./types";
import { addDays, isoDate, startOfWeek, parseIso, uid } from "./dates";
export const days = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];
export type Conversion = {
  title: string;
  category: Category;
  originId?: string;
  taskId?: string;
  endsAt?: number;
  date?: string;
  time?: string;
};
export function planTasks(plan: WeeklyPlan): Conversion[] {
  const week = isoDate(
    startOfWeek(plan.weekOf || isoDate(new Date(plan.generatedAt))),
  );
  return plan.items.map((i) => ({
    title: i.title,
    category: i.category,
    time: i.time,
    taskId: i.taskId,
    date: addDays(week, days.indexOf(i.day)),
    originId: plan.id + "/" + i.id,
  }));
}
export function modelContext(d: AppData, question: string) {
  const words = question
    .toLowerCase()
    .split(/\s+/)
    .filter((x) => x.length > 1);
  const relevant = (s: string) =>
    words.some((x) => s.toLowerCase().includes(x));
  return JSON.stringify({
    tasks: d.tasks
      .filter((t) => !t.done)
      .slice(0, 35)
      .map((t) => ({
        id: t.id,
        title: t.title.slice(0, 150),
        date: t.date,
        time: t.time,
        endsAt: t.endsAt,
        fixed: t.originId?.startsWith("calendar-"),
      })),
    notes: d.notes
      .filter((n) => relevant(n.title) || relevant(n.body))
      .slice(0, 3)
      .map((n) => ({
        title: n.title.slice(0, 120),
        excerpt: n.body.slice(0, 450),
      })),
    plans: d.plans
      .slice(-3)
      .map((p) => ({
        weekOf: p.weekOf,
        items: p.items
          .slice(0, 15)
          .map((i) => ({
            title: i.title.slice(0, 120),
            day: i.day,
            time: i.time,
          })),
      })),
    lastCard: d.messages.filter((m) => m.card).at(-1)?.card,
  }).slice(0, 19000);
}

export function applyConversions(
  existing: Task[],
  items: Conversion[],
  selectedDate: string,
) {
  const tasks = [...existing],
    conflicts: string[] = [];
  for (const item of items) {
    const imported = item.originId?.startsWith("calendar-") || false;
    const index = tasks.findIndex(
      (t) =>
        (item.taskId && t.id === item.taskId) ||
        (item.originId && t.originId === item.originId),
    );
    if (
      item.taskId &&
      (index < 0 ||
        tasks[index].done ||
        tasks[index].originId?.startsWith("calendar-"))
    ) {
      conflicts.push(item.title);
      continue;
    }
    const date = item.date || selectedDate,
      instant = parseIso(date);
    if (item.time && /^\d\d:\d\d$/.test(item.time)) {
      const [h, m] = item.time.split(":").map(Number);
      instant.setHours(h, m);
      if (
        !imported &&
        tasks.some((t, i) => {
          if (i === index || t.done || !t.originId?.startsWith("calendar-"))
            return false;
          const start = parseIso(t.date),
            [hour, min] = (t.time || "00:00").split(":").map(Number);
          start.setHours(hour, min);
          return +instant >= +start && +instant < (t.endsAt ?? +start + 60000);
        })
      ) {
        conflicts.push(item.title);
        continue;
      }
    }
    if (index >= 0) {
      tasks[index] = {
        ...tasks[index],
        date,
        time: item.time,
        endsAt: item.endsAt,
        originId: item.originId,
      };
      continue;
    }
    tasks.unshift({
      id: uid("t"),
      date,
      title: item.title,
      category: item.category,
      time: item.time,
      endsAt: item.endsAt,
      originId: item.originId,
      done: false,
      source: imported ? "manual" : "ai",
      createdAt: Date.now(),
    });
  }
  return { tasks, conflicts };
}
