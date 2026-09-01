export type Lang = "en" | "zh" | "ja" | "ko" | "de" | "fr" | "es";
export type ThemeMode = "system" | "light" | "dark";
export type Tab = "chat" | "actions" | "workspace" | "profile";
export type Category = "work" | "health" | "study" | "personal";
export type Source = "ai" | "manual";
export type MemoryCategory = "work" | "schedule" | "preferences";
export type CardType =
  | "weekly"
  | "summary"
  | "tasks"
  | "meeting"
  | "trip"
  | "note"
  | "analysis";

export type Overlay =
  | { name: "none" }
  | { name: "weekly-plan"; planId: string }
  | { name: "memory" }
  | { name: "note"; noteId?: string }
  | { name: "tasks" }
  | { name: "saved"; id?: string }
  | { name: "multimodal"; mode?: "voice" | "image" | "link" | "document" }
  | { name: "summarize" }
  | { name: "create-task" }
  | { name: "appearance" }
  | { name: "language" }
  | { name: "notifications" }
  | { name: "ai-prefs" }
  | { name: "about" }
  | { name: "account" };

export interface Task {
  id: string;
  title: string;
  done: boolean;
  category: Category;
  source: Source;
  date: string;
  createdAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  source: Source;
  createdAt: number;
  updatedAt: number;
}

export interface SavedItem {
  id: string;
  title: string;
  kind: CardType | "chat";
  preview: string;
  payload: unknown;
  createdAt: number;
}

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  kind: string;
  text: string;
  enabled: boolean;
  confidence: number;
}

export interface PlanItem {
  id: string;
  title: string;
  time?: string;
  category: Category;
  day: string;
}

export interface WeeklyPlan {
  id: string;
  variant: number;
  generatedAt: number;
  items: PlanItem[];
}

export interface AICard {
  type: CardType;
  title: string;
  planId?: string;
  summary?: string;
  bullets?: string[];
  tasks?: { title: string; category: Category }[];
  meta?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  card?: AICard;
}

export interface Prefs {
  notifications: boolean;
  hapticStyle: boolean;
  structuredCards: boolean;
  memoryEnabled: boolean;
  voiceReplies: boolean;
}

export interface AppData {
  authenticated: boolean;
  theme: ThemeMode;
  lang: Lang;
  selectedDate: string;
  tasks: Task[];
  notes: Note[];
  saved: SavedItem[];
  memories: MemoryItem[];
  messages: ChatMessage[];
  plans: WeeklyPlan[];
  prefs: Prefs;
}
