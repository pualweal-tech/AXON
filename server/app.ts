import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import type { AppData, MemoryItem } from "../src/types";
import {
  COOKIE,
  encryptSecret,
  hashPassword,
  readToken,
  signToken,
  verifyPassword,
} from "./crypto";
import { initDb, query, run, type KeyRow, type UserRow } from "./db";
import "./env";
import { isProd } from "./env";
import { completeChat, completePlan, resolveApiKey, type Provider } from "./llm";

type Vars = { Variables: { userId: string; email: string } };

const app = new Hono<Vars>().basePath("/api");

app.use("*", async (c, next) => {
  await initDb();
  await next();
});

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
  }),
);

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cookieOpts() {
  return {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "Lax" as const,
    secure: isProd(),
  };
}

async function setSession(c: Context, userId: string, email: string) {
  const token = await signToken(userId, email);
  setCookie(c, COOKIE, token, cookieOpts());
}

const auth: Parameters<typeof app.use>[1] = async (c, next) => {
  const token = getCookie(c, COOKIE);
  const session = token ? await readToken(token) : null;
  if (!session) return c.json({ error: "auth" }, 401);
  c.set("userId", session.userId);
  c.set("email", session.email);
  await next();
};

app.get("/health", (c) => c.json({ ok: true }));

app.post("/auth/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!isEmail(email)) return c.json({ error: "email" }, 400);
  if (password.length < 8) return c.json({ error: "password" }, 400);

  const existing = await query<UserRow>("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length) return c.json({ error: "exists" }, 409);

  const id = crypto.randomUUID();
  await run(
    "INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, email, await hashPassword(password), name, Date.now()],
  );
  await setSession(c, id, email);
  const user = { id, email, name };
  return c.json({ user, data: null });
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const rows = await query<UserRow>("SELECT * FROM users WHERE email = ?", [email]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "invalid" }, 401);
  }
  await setSession(c, user.id, user.email);
  const data = await loadPayload(user.id);
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    data,
  });
});

app.post("/auth/logout", async (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

app.get("/auth/me", auth, async (c) => {
  const userId = c.get("userId");
  const rows = await query<UserRow>("SELECT id, email, name FROM users WHERE id = ?", [userId]);
  const user = rows[0];
  if (!user) return c.json({ error: "auth" }, 401);
  const data = await loadPayload(user.id);
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    data,
  });
});

app.get("/data", auth, async (c) => {
  return c.json({ data: await loadPayload(c.get("userId")) });
});

app.put("/data", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const payload = JSON.stringify(body.data ?? body);
  await run(
    `INSERT INTO user_data (user_id, payload, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    [c.get("userId"), payload, Date.now()],
  );
  return c.json({ ok: true });
});

app.get("/keys", auth, async (c) => {
  const rows = await query<KeyRow>("SELECT * FROM user_keys WHERE user_id = ?", [c.get("userId")]);
  const keys = rows[0];
  return c.json({
    openai: Boolean(keys?.openai),
    grok: Boolean(keys?.xai),
    deepseek: Boolean(keys?.deepseek),
  });
});

app.post("/keys", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = c.get("userId");
  const rows = await query<KeyRow>("SELECT * FROM user_keys WHERE user_id = ?", [userId]);
  const current = rows[0] || { user_id: userId, openai: null, xai: null, deepseek: null };

  const next = {
    openai: patchKey(body.openai, current.openai),
    xai: patchKey(body.grok ?? body.xai, current.xai),
    deepseek: patchKey(body.deepseek, current.deepseek),
  };

  await run(
    `INSERT INTO user_keys (user_id, openai, xai, deepseek) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET openai = excluded.openai, xai = excluded.xai, deepseek = excluded.deepseek`,
    [userId, next.openai, next.xai, next.deepseek],
  );
  return c.json({
    openai: Boolean(next.openai),
    grok: Boolean(next.xai),
    deepseek: Boolean(next.deepseek),
  });
});

app.post("/chat", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const provider = normalizeProvider(body.provider);
  const keys = await loadKeys(c.get("userId"));
  const apiKey = resolveApiKey(provider, keys);
  if (!apiKey) return c.json({ error: "missing_key", provider }, 400);

  const memories = Array.isArray(body.memories) ? (body.memories as MemoryItem[]) : [];
  const history = Array.isArray(body.history) ? body.history : [];
  const prompt = String(body.text || body.prompt || "").trim();
  if (!prompt) return c.json({ error: "invalid" }, 400);

  try {
    const result = await completeChat({
      provider,
      apiKey,
      lang: body.lang === "zh" ? "zh" : body.lang === "ja" ? "ja" : "en",
      date: String(body.date || new Date().toISOString().slice(0, 10)),
      memories,
      structuredCards: body.structuredCards !== false,
      history,
      prompt,
    });
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "llm";
    return c.json({ error: "llm", detail: message }, 502);
  }
});

app.post("/plan", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const provider = normalizeProvider(body.provider);
  const keys = await loadKeys(c.get("userId"));
  const apiKey = resolveApiKey(provider, keys);
  if (!apiKey) return c.json({ error: "missing_key", provider }, 400);
  try {
    const plan = await completePlan({
      provider,
      apiKey,
      lang: body.lang === "zh" ? "zh" : "en",
      date: String(body.date || new Date().toISOString().slice(0, 10)),
      memories: Array.isArray(body.memories) ? body.memories : [],
    });
    return c.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "llm";
    return c.json({ error: "llm", detail: message }, 502);
  }
});

function normalizeProvider(value: unknown): Provider {
  if (value === "grok" || value === "deepseek" || value === "openai") return value;
  return "openai";
}

function patchKey(incoming: unknown, current: string | null): string | null {
  if (incoming === undefined) return current;
  if (incoming === null || incoming === "") return null;
  return encryptSecret(String(incoming).trim());
}

async function loadKeys(userId: string): Promise<KeyRow | undefined> {
  const rows = await query<KeyRow>("SELECT * FROM user_keys WHERE user_id = ?", [userId]);
  return rows[0];
}

async function loadPayload(userId: string): Promise<Partial<AppData> | null> {
  const rows = await query<{ payload: string }>(
    "SELECT payload FROM user_data WHERE user_id = ?",
    [userId],
  );
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].payload) as Partial<AppData>;
  } catch {
    return null;
  }
}

export default app;
