import type { AppData, MemoryItem, Note, Task } from "./types";
import { addDays, isoDate, uid } from "./dates";

const today = isoDate();

export const seedTasks: Task[] = [
  {
    id: "t1",
    title: "Finish design system tokens",
    done: false,
    category: "work",
    source: "manual",
    date: today,
    createdAt: Date.now() - 3600000,
  },
  {
    id: "t2",
    title: "Prep product review slides",
    done: false,
    category: "work",
    source: "ai",
    date: addDays(today, 1),
    createdAt: Date.now() - 7200000,
  },
  {
    id: "t3",
    title: "Gym · Push day",
    done: true,
    category: "health",
    source: "ai",
    date: today,
    createdAt: Date.now() - 86400000,
  },
];

export const seedNotes: Note[] = [
  {
    id: "n1",
    title: "Design System Principles",
    body: "Clarity over decoration. AI output should be actionable. Keep AXON calm, structured, and editable.",
    source: "ai",
    createdAt: Date.now() - 4000000,
    updatedAt: Date.now() - 4000000,
  },
  {
    id: "n2",
    title: "Product Review Prep",
    body: "Show the loop: Think → Ask → Generate → Review → Convert → Save → Act. Lead with the weekly plan conversion.",
    source: "ai",
    createdAt: Date.now() - 172000000,
    updatedAt: Date.now() - 172000000,
  },
];

export const seedMemories: MemoryItem[] = [
  {
    id: "m1",
    category: "work",
    kind: "Role",
    text: "Visual communication design student, works on UI projects for portfolio.",
    enabled: true,
    confidence: 98,
  },
  {
    id: "m2",
    category: "preferences",
    kind: "Habit",
    text: "Prefers structured card outputs over plain prose answers.",
    enabled: true,
    confidence: 94,
  },
  {
    id: "m3",
    category: "schedule",
    kind: "Routine",
    text: "Gym 3× per week, prefers morning sessions.",
    enabled: true,
    confidence: 87,
  },
  {
    id: "m4",
    category: "work",
    kind: "Project",
    text: "Currently finishing an AXON design system and mobile prototype.",
    enabled: true,
    confidence: 91,
  },
];

export function defaultData(): AppData {
  return {
    authenticated: false,
    theme: "system",
    lang: "en",
    selectedDate: today,
    tasks: seedTasks,
    notes: seedNotes,
    saved: [
      {
        id: "s1",
        title: "Weekly Plan · " + today,
        kind: "weekly",
        preview: "Balanced work blocks with recovery time.",
        payload: { planId: "plan_seed" },
        createdAt: Date.now() - 120000,
      },
    ],
    memories: seedMemories,
    messages: [],
    plans: [],
    prefs: {
      notifications: true,
      hapticStyle: true,
      structuredCards: true,
      memoryEnabled: true,
      voiceReplies: false,
    },
  };
}

export function newId(prefix: string): string {
  return uid(prefix);
}
