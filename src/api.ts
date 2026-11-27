import type { AppData, ChatMessage, WeeklyPlan, AIProvider } from "./types";
import type { ModelRequest } from "./schema";
export type User = { id: string; name: string; email: string };
export type KeyFlags = Record<AIProvider, boolean> & {
  shared?: Record<AIProvider, boolean>;
};
export type RunInfo = {
  id: string;
  mode: "chat" | "plan";
  label: string;
  status: "running" | "interrupted" | "failed" | "done";
  updated: number;
};
export type RunResult = { message: ChatMessage; plan: WeeklyPlan | null };
export type State = { revision: number; data: Partial<AppData> | null };
export type Session = State & { user: User; recovery?: string };
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}
let owner = "",
  lifetime = new AbortController();
export function bindUser(id: string) {
  lifetime.abort();
  lifetime = new AbortController();
  owner = id;
}
async function response(
  path: string,
  method: string,
  data?: unknown,
  signal?: AbortSignal,
) {
  const res = await fetch("/api/" + path, {
    method,
    body: data === undefined ? undefined : JSON.stringify(data),
    headers: { "Content-Type": "application/json", "X-Axon-User": owner },
    credentials: "same-origin",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, lifetime.signal])
      : lifetime.signal,
  });
  if (!res.ok) {
    const code = (await res.json().catch(() => ({}))).error || "request_failed";
    if ((code === "session_changed" || code === "auth") && owner)
      window.dispatchEvent(new Event("axon-session-changed"));
    throw new ApiError(code, res.status);
  }
  return res;
}
async function request<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  return (await response(path, method, data)).json();
}
export const api = {
  me: () => request<Session>("auth/me"),
  login: (email: string, password: string) =>
    request<Session>("auth/login", "POST", { email, password }),
  register: (email: string, password: string, name: string) =>
    request<Session | { challenge: string }>("auth/register", "POST", {
      email,
      password,
      name,
    }),
  verify: (challenge: string, code: string) =>
    request<Session>("auth/verify", "POST", { challenge, code }),
  recover: (email: string, password: string, recovery: string) =>
    request<{ recovery: string }>("auth/recover", "POST", {
      email,
      password,
      recovery,
    }),
  account: (action: string, password: string, newPassword?: string) =>
    request<{ recovery?: string }>("account", "POST", {
      action,
      password,
      newPassword,
    }),
  logout: () => request("auth/logout", "POST", {}),
  data: () => request<State>("data"),
  saveData: (data: AppData, revision: number) =>
    request<{ revision: number }>("data", "PUT", { data, revision }),
  keys: () => request<KeyFlags>("keys"),
  saveKeys: (values: Partial<Record<AIProvider, string | null>>) =>
    request<KeyFlags>("keys", "POST", values),
  runs: () => request<{ runs: RunInfo[] }>("runs"),
  run: (id: string) =>
    request<{
      mode: "chat" | "plan";
      input: ModelRequest;
      result: RunResult | null;
    }>("runs/" + id),
  async generate(
    route: "chat" | "plan",
    input: ModelRequest,
    signal: AbortSignal,
    onText: (text: string) => void,
  ) {
    const res = await response(route, "POST", input, signal);
    const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) throw new ApiError("incomplete", 502);
        buffer += chunk.value;
        let i: number;
        while ((i = buffer.indexOf("\n")) >= 0) {
          const frame = JSON.parse(buffer.slice(0, i));
          buffer = buffer.slice(i + 1);
          if (frame.error) throw new ApiError(frame.error, 502);
          if (frame.result)
            return frame.result as {
              message: ChatMessage;
              plan: WeeklyPlan | null;
            };
          if (typeof frame.text === "string") onText(frame.text);
        }
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
  },
};
