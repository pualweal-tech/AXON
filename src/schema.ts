import { z } from "zod";
const id = z.string().min(1).max(160);
const short = z.string().max(1000);
const text = z.string().max(100000);
const ts = z.number().int().nonnegative();
export const date = z.iso.date();
export const category = z.enum(["work", "health", "study", "personal"]);
export const language = z.enum(["zh", "en", "ja", "ko", "de", "fr", "es"]);
export const provider = z.enum(["openai", "grok", "deepseek"]);
const source = z.enum(["manual", "ai"]);
const kind = z.enum([
  "weekly",
  "summary",
  "tasks",
  "meeting",
  "trip",
  "note",
  "analysis",
]);
export const day = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);
export const taskSuggestion = z.object({ title: short.min(1), category });
export const planSuggestion = taskSuggestion.extend({
  day,
  taskId: id.optional(),
  time: short.optional(),
});
export const card = z.object({
  type: kind,
  title: short.min(1),
  summary: text.optional(),
  bullets: z.array(short).max(100).optional(),
  tasks: z.array(taskSuggestion).max(100).optional(),
  meta: short.optional(),
  planId: id.optional(),
});
export const modelOutput = z.object({
  text: text.min(1),
  card: card
    .extend({ planItems: z.array(planSuggestion).max(100).optional() })
    .nullable()
    .optional(),
});
export const memory = z.object({
  id,
  category: z.enum(["work", "schedule", "preferences"]),
  kind: short,
  text,
  enabled: z.boolean(),
  confidence: z.number().optional(),
  updatedAt: ts.optional(),
});
const task = taskSuggestion.extend({
  id,
  done: z.boolean(),
  source,
  date,
  createdAt: ts,
  originId: id.optional(),
  endsAt: ts.optional(),
  time: short.optional(),
});
const note = z.object({
  id,
  title: short,
  body: text,
  source,
  createdAt: ts,
  updatedAt: ts,
});
const plan = z.object({
  id,
  variant: z.number(),
  generatedAt: ts,
  weekOf: date.optional(),
  items: z.array(planSuggestion.extend({ id })).max(1000),
});
const saved = z.object({
  id,
  title: short,
  kind: z.union([kind, z.literal("chat")]),
  preview: text,
  payload: z.unknown().optional(),
  createdAt: ts,
});
const message = z.object({
  id,
  role: z.enum(["user", "assistant"]),
  text,
  createdAt: ts,
  card: card.optional(),
});
const prefs = z.object({
  notifications: z.boolean(),
  hapticStyle: z.boolean(),
  structuredCards: z.boolean(),
  memoryEnabled: z.boolean(),
  voiceReplies: z.boolean(),
  aiProvider: provider,
});
export const workspace = z.object({
  theme: z.enum(["system", "light", "dark"]),
  lang: language,
  selectedDate: date,
  tasks: z.array(task).max(10000),
  notes: z.array(note).max(10000),
  plans: z.array(plan).max(10000),
  messages: z.array(message).max(20000),
  memories: z.array(memory).max(10000),
  saved: z.array(saved).max(10000),
  prefs,
});
export const modelRequest = z.object({
  runId: z.uuid(),
  targetPlan: id.optional(),
  provider,
  lang: language,
  date,
  memories: z.array(memory).max(32),
  text: text.max(32000).optional(),
  structuredCards: z.boolean().default(true),
  history: z
    .array(message.pick({ role: true, text: true }))
    .max(12)
    .default([]),
  context: z.string().max(20000).default(""),
  image: z
    .string()
    .max(2000000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/]+=*$/)
    .optional(),
  voiceStyle: z.boolean().default(false),
});
export type ModelRequest = z.infer<typeof modelRequest>;
