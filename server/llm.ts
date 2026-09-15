import type { AICard, Category, ChatMessage, Lang, MemoryItem, WeeklyPlan } from "../src/types";
import { decryptSecret } from "./crypto";
import type { KeyRow } from "./db";

export type Provider = "openai" | "grok" | "deepseek";

const PROVIDERS: Record<
  Provider,
  { url: string; modelEnv: string; fallbackModel: string; envKey: string; keyField: keyof KeyRow }
> = {
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    modelEnv: "OPENAI_MODEL",
    fallbackModel: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    keyField: "openai",
  },
  grok: {
    url: "https://api.x.ai/v1/chat/completions",
    modelEnv: "XAI_MODEL",
    fallbackModel: "grok-3-mini",
    envKey: "XAI_API_KEY",
    keyField: "xai",
  },
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    modelEnv: "DEEPSEEK_MODEL",
    fallbackModel: "deepseek-chat",
    envKey: "DEEPSEEK_API_KEY",
    keyField: "deepseek",
  },
};

export async function resolveApiKey(provider: Provider, keys: KeyRow | undefined): Promise<string | null> {
  const spec = PROVIDERS[provider];
  const stored = keys?.[spec.keyField];
  if (stored) {
    try {
      const plain = await decryptSecret(stored);
      if (plain.trim()) return plain.trim();
    } catch {
      /* ignore bad stored key */
    }
  }
  const env = process.env[spec.envKey]?.trim();
  return env || null;
}

type LLMCard = {
  type?: AICard["type"];
  title?: string;
  summary?: string;
  bullets?: string[];
  tasks?: { title: string; category: Category }[];
  meta?: string;
  planItems?: { title: string; time?: string; category: Category; day: string }[];
};

type LLMPayload = {
  text?: string;
  card?: LLMCard | null;
};

function stripFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (fenced?.[1] || trimmed).trim();
}

function parsePayload(raw: string): LLMPayload {
  try {
    return JSON.parse(stripFence(raw)) as LLMPayload;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as LLMPayload;
      } catch {
        return { text: raw.trim() };
      }
    }
    return { text: raw.trim() };
  }
}

function fallbackPlan(_date: string): WeeklyPlan {
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
  return {
    id: nid("plan"),
    variant: 0,
    generatedAt: Date.now(),
    items: days.map((day, i) => ({
      id: nid("pi"),
      title: i % 2 === 0 ? "Deep work" : "Recovery / review",
      time: i % 2 === 0 ? "9am" : "6pm",
      category: i % 2 === 0 ? "work" : "health",
      day,
    })),
  };
}

function nid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

function systemPrompt(
  lang: Lang,
  memories: MemoryItem[],
  date: string,
  structuredCards: boolean,
): string {
  const language =
    lang === "zh" ? "Simplified Chinese" : lang === "ja" ? "Japanese" : "English";
  const memoryBlock = memories
    .filter((m) => m.enabled)
    .map((m) => `- ${m.kind}: ${m.text}`)
    .join("\n");
  return [
    "You are AXON, a calm personal operating system — not a generic chatbot.",
    "Turn thoughts into structured, editable, actionable output: plans, tasks, notes, summaries, meetings, trips.",
    "Be concise, specific, and useful. Never be sci-fi or overly decorative.",
    `Today is ${date}. Reply in ${language}.`,
    structuredCards
      ? "Prefer a structured card when the user asks to plan, summarize, list tasks, prep a meeting, or travel."
      : "Reply mainly as text. Only add a card if it is clearly useful.",
    memoryBlock ? `Known context about this person:\n${memoryBlock}` : "No stored memories yet.",
    "Return JSON only, no markdown, with this shape:",
    `{
  "text": "short spoken reply",
  "card": null or {
    "type": "weekly" | "summary" | "tasks" | "meeting" | "trip" | "note" | "analysis",
    "title": "string",
    "summary": "optional",
    "bullets": ["optional"],
    "tasks": [{"title":"string","category":"work"|"health"|"study"|"personal"}],
    "meta": "optional",
    "planItems": [{"title":"string","time":"9am","category":"work","day":"MONDAY"}]
  }
}`,
    "For weekly plans, include planItems for Monday–Friday using day names MONDAY..FRIDAY.",
    "If the user is just chatting, card may be null.",
  ].join("\n");
}

export async function completeChat(opts: {
  provider: Provider;
  apiKey: string;
  lang: Lang;
  date: string;
  memories: MemoryItem[];
  structuredCards: boolean;
  history: { role: "user" | "assistant"; text: string }[];
  prompt: string;
}): Promise<{ message: ChatMessage; plan: WeeklyPlan | null }> {
  const spec = PROVIDERS[opts.provider];
  const model = process.env[spec.modelEnv] || spec.fallbackModel;
  const messages = [
    {
      role: "system" as const,
      content: systemPrompt(opts.lang, opts.memories, opts.date, opts.structuredCards),
    },
    ...opts.history.slice(-12).map((m) => ({
      role: m.role,
      content: m.text,
    })),
    { role: "user" as const, content: opts.prompt },
  ];

  const res = await fetch(spec.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages,
    }),
    signal: AbortSignal.timeout(60000),
  });

  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!res.ok) {
    const detail = body.error?.message || `LLM HTTP ${res.status}`;
    throw Object.assign(new Error(detail), { code: "llm" });
  }

  const raw = body.choices?.[0]?.message?.content || "";
  const parsed = parsePayload(raw);
  const text =
    parsed.text?.trim() ||
    (opts.lang === "zh" ? "我记下了。" : "Noted.");

  let plan: WeeklyPlan | null = null;
  const cardIn = parsed.card;
  let card: ChatMessage["card"] | undefined;

  if (cardIn?.type) {
    if (cardIn.type === "weekly") {
      if (cardIn.planItems?.length) {
        plan = {
          id: nid("plan"),
          variant: 0,
          generatedAt: Date.now(),
          items: cardIn.planItems.map((item) => ({
            id: nid("pi"),
            title: item.title,
            time: item.time,
            category: item.category || "work",
            day: (item.day || "MONDAY").toUpperCase(),
          })),
        };
      } else {
        plan = fallbackPlan(opts.date);
      }
    }
    card = {
      type: cardIn.type,
      title: cardIn.title || (opts.lang === "zh" ? "AXON" : "AXON"),
      summary: cardIn.summary,
      bullets: cardIn.bullets,
      tasks: cardIn.tasks,
      meta: cardIn.meta,
      planId: plan?.id,
    };
  }

  return {
    message: {
      id: nid("m"),
      role: "assistant",
      text,
      createdAt: Date.now(),
      card,
    },
    plan,
  };
}

export async function completePlan(opts: {
  provider: Provider;
  apiKey: string;
  lang: Lang;
  date: string;
  memories: MemoryItem[];
}): Promise<WeeklyPlan> {
  const result = await completeChat({
    ...opts,
    structuredCards: true,
    history: [],
    prompt:
      opts.lang === "zh"
        ? "请根据我的优先级生成一份周一到周五的周计划，带上时间和类别。"
        : "Generate a Monday–Friday weekly plan around my priorities, with times and categories.",
  });
  return result.plan || fallbackPlan(opts.date);
}
