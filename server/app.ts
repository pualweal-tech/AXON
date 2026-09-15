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
import {
  createUser,
  findUserByEmail,
  findUserById,
  initDb,
  readKeys,
  readPayload,
  writeKeys,
  writePayload,
  type KeyRow,
} from "./db";
import "./env";
import { isProd } from "./env";
import { completeChat, completePlan, resolveApiKey, type Provider } from "./llm";

type Vars = { Variables: { userId: string; email: string } };

const app = new Hono<Vars>().basePath("/api");

app.use("*", async (c, next) => {
  try {
    await initDb();
  } catch (err) {
    console.error(err);
    return c.json({ error: "server", detail: "database" }, 500);
  }
  await next();
});

app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
  }),
);

function normalizeEmail(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/＠/g, "@")
    .replace(/\s+/g, "");
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
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

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "server", detail: err instanceof Error ? err.message : "unknown" }, 500);
});

app.get("/health", (c) => c.json({ ok: true }));

app.post("/auth/register", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!isEmail(email)) return c.json({ error: "email" }, 400);
  if (password.length < 8) return c.json({ error: "password" }, 400);

  if (await findUserByEmail(email)) return c.json({ error: "exists" }, 409);

  const id = crypto.randomUUID();
  await createUser({
    id,
    email,
    password_hash: await hashPassword(password),
    name,
    created_at: Date.now(),
  });
  await setSession(c, id, email);
  return c.json({ user: { id, email, name }, data: null });
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const user = await findUserByEmail(email);
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
  const user = await findUserById(userId);
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
  await writePayload(c.get("userId"), payload);
  return c.json({ ok: true });
});

app.get("/keys", auth, async (c) => {
  const keys = await readKeys(c.get("userId"));
  return c.json({
    openai: Boolean(keys?.openai),
    grok: Boolean(keys?.xai),
    deepseek: Boolean(keys?.deepseek),
  });
});

app.post("/keys", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = c.get("userId");
  const current = (await readKeys(userId)) || {
    user_id: userId,
    openai: null,
    xai: null,
    deepseek: null,
  };

  const next = {
    openai: patchKey(body.openai, current.openai),
    xai: patchKey(body.grok ?? body.xai, current.xai),
    deepseek: patchKey(body.deepseek, current.deepseek),
  };

  await writeKeys(userId, next);
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
  return readKeys(userId);
}

async function loadPayload(userId: string): Promise<Partial<AppData> | null> {
  const payload = await readPayload(userId);
  if (!payload) return null;
  try {
    return JSON.parse(payload) as Partial<AppData>;
  } catch {
    return null;
  }
}

export default app;
