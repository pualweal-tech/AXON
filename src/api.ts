import type { AppData, ChatMessage, MemoryItem, WeeklyPlan } from "./types";

export type User = { id: string; email: string; name: string };
export type Provider = "openai" | "grok" | "deepseek";
export type KeyFlags = { openai: boolean; grok: boolean; deepseek: boolean };

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  constructor(code: string, status: number, detail?: string) {
    super(code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
  } & T;
  if (!res.ok) {
    throw new ApiError(body.error || "request_failed", res.status, body.detail);
  }
  return body;
}

export const api = {
  me() {
    return request<{ user: User; data: Partial<AppData> | null }>("/api/auth/me");
  },
  register(email: string, password: string, name: string) {
    return request<{ user: User; data: Partial<AppData> | null }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },
  login(email: string, password: string) {
    return request<{ user: User; data: Partial<AppData> | null }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  logout() {
    return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
  },
  saveData(data: AppData) {
    const { authenticated, ...payload } = data;
    void authenticated;
    return request<{ ok: boolean }>("/api/data", {
      method: "PUT",
      body: JSON.stringify({ data: payload }),
    });
  },
  keys() {
    return request<KeyFlags>("/api/keys");
  },
  saveKeys(partial: Partial<Record<Provider | "openai" | "grok" | "deepseek", string | null>>) {
    return request<KeyFlags>("/api/keys", {
      method: "POST",
      body: JSON.stringify(partial),
    });
  },
  chat(input: {
    text: string;
    provider: Provider;
    lang: AppData["lang"];
    date: string;
    memories: MemoryItem[];
    structuredCards: boolean;
    history: Pick<ChatMessage, "role" | "text">[];
  }) {
    return request<{ message: ChatMessage; plan: WeeklyPlan | null }>("/api/chat", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  plan(input: {
    provider: Provider;
    lang: AppData["lang"];
    date: string;
    memories: MemoryItem[];
  }) {
    return request<{ plan: WeeklyPlan }>("/api/plan", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
