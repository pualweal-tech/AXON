import type { AppData } from "./types";
import { isoDate } from "./dates";

export function emptyData(): AppData {
  const lang =
    typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("zh")
      ? "zh"
      : "en";
  return {
    authenticated: false,
    theme: "system",
    lang,
    selectedDate: isoDate(),
    tasks: [],
    notes: [],
    saved: [],
    memories: [],
    messages: [],
    plans: [],
    prefs: {
      notifications: true,
      hapticStyle: true,
      structuredCards: true,
      memoryEnabled: true,
      voiceReplies: false,
      aiProvider: "openai",
    },
  };
}

export function defaultData(): AppData {
  return emptyData();
}

export function mergeData(partial?: Partial<AppData> | null): AppData {
  const base = emptyData();
  if (!partial) return { ...base, authenticated: true };
  return {
    ...base,
    ...partial,
    prefs: { ...base.prefs, ...partial.prefs },
    authenticated: true,
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}
