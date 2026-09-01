import { defaultData } from "./data";
import type { AppData } from "./types";

const KEY = "axon.v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return { ...defaultData(), ...parsed, prefs: { ...defaultData().prefs, ...parsed.prefs } };
  } catch {
    return defaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearAuthFlag(data: AppData): AppData {
  const next = { ...data, authenticated: false };
  saveData(next);
  return next;
}
