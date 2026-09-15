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

const routes = new Hono<Vars>();

routes.use("*", async (_c, next) => {
  await initDb();
  await next();
});

routes.use(
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

const auth: Parameters<typeof routes.use>[1] = async (c, next) => {
  const token = getCookie(c, COOKIE);
  const session = token ? await readToken(token) : null;
  if (!session) return c.json({ error: "auth" }, 401);
  c.set("userId", session.userId);
  c.set("email", session.email);
  await next();
};

routes.onError((err, c) => {
  console.error(err);
  return c.json({ error: "server", detail: err instanceof Error ? err.message : "unknown" }, 500);
});

routes.notFound((c) => c.json({ error: "not_found", path: c.req.path }, 404));

routes.get("/health", (c) =>
  c.json({
    ok: true,
    vercel: Boolean(process.env.VERCEL),
  }),
);

routes.post("/auth/register", async (c) => {
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

routes.post("/auth/login", async (c) => {
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

routes.post("/auth/logout", async (c) => {
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

routes.get("/auth/me", auth, async (c) => {
  const userId = c.get("userId");
  const user = await findUserById(userId);
  if (!user) return c.json({ error: "auth" }, 401);
  const data = await loadPayload(user.id);
  return c.json({
    user: { id: user.id, email: user.email, name: user.name },
    data,
  });
});

routes.get("/data", auth, async (c) => {
  return c.json({ data: await loadPayload(c.get("userId")) });
});

routes.put("/data", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const payload = JSON.stringify(body.data ?? body);
  await writePayload(c.get("userId"), payload);
  return c.json({ ok: true });
});

routes.get("/keys", auth, async (c) => {
  const keys = await readKeys(c.get("userId"));
  return c.json({
    openai: Boolean(keys?.openai),
    grok: Boolean(keys?.xai),
    deepseek: Boolean(keys?.deepseek),
  });
});

routes.post("/keys", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const userId = c.get("userId");
  const current = (await readKeys(userId)) || {
    user_id: userId,
    openai: null,
    xai: null,
    deepseek: null,
  };

  const next = {
    openai: await patchKey(body.openai, current.openai),
    xai: await patchKey(body.grok ?? body.xai, current.xai),
    deepseek: await patchKey(body.deepseek, current.deepseek),
  };

  await writeKeys(userId, next);
  return c.json({
    openai: Boolean(next.openai),
    grok: Boolean(next.xai),
    deepseek: Boolean(next.deepseek),
  });
});

routes.post("/chat", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const provider = normalizeProvider(body.provider);
  const keys = await loadKeys(c.get("userId"));
  const apiKey = await resolveApiKey(provider, keys);
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

routes.post("/plan", auth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const provider = normalizeProvider(body.provider);
  const keys = await loadKeys(c.get("userId"));
  const apiKey = await resolveApiKey(provider, keys);
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

async function patchKey(incoming: unknown, current: string | null): Promise<string | null> {
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

const app = new Hono().route("/", routes).route("/api", routes);

export default app;
