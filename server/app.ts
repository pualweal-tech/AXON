import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { bodyLimit } from "hono/body-limit";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  COOKIE,
  digest,
  encryptSecret,
  hashPassword,
  token,
  verifyPassword,
} from "./crypto";
import { database, quota, readKeys, readState, writeState } from "./db";
import { production } from "./env";
import { generate, resolveApiKey } from "./llm";
import { workspace, modelRequest, provider } from "../src/schema";

type User = { id: string; email: string; name: string };
type Env = { Variables: { user: User; requestId: string } };
const app = new Hono<Env>();
const ttl = 30 * 86400;
const opts = {
  httpOnly: true,
  path: "/",
  sameSite: "Lax" as const,
  secure: production,
  maxAge: ttl,
};
const password = z.string().min(8).max(256);
const email = z
  .string()
  .max(254)
  .transform((s) => s.normalize("NFKC").trim().toLowerCase())
  .pipe(z.email());
async function body<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success)
    throw new HTTPException(400, { message: "invalid_input" });
  return parsed.data;
}
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  c.header("X-Request-Id", c.get("requestId"));
  c.header("Cache-Control", "no-store");
  if (getCookie(c, "axon_accounts"))
    deleteCookie(c, "axon_accounts", { path: "/" });
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (
      origin &&
      origin !== (process.env.APP_ORIGIN || new URL(c.req.url).origin)
    )
      return c.json({ error: "origin" }, 403);
    if (!c.req.header("Content-Type")?.startsWith("application/json"))
      return c.json({ error: "content_type" }, 415);
  }
  await next();
});
app.use(
  "*",
  bodyLimit({
    maxSize: 4 * 1024 * 1024,
    onError: (c) => c.json({ error: "too_large" }, 413),
  }),
);
app.onError((err, c) => {
  if (err instanceof HTTPException)
    return c.json({ error: err.message }, err.status);
  console.error("request_failed", c.get("requestId"), err.name);
  return c.json({ error: "server", requestId: c.get("requestId") }, 500);
});
const auth: MiddlewareHandler<Env> = async (c, next) => {
  const raw = getCookie(c, COOKIE);
  const db = await database();
  const row =
    raw &&
    (
      await db.execute({
        sql: "SELECT u.id,u.email,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        args: [digest(raw), Date.now()],
      })
    ).rows[0];
  if (!row) return c.json({ error: "auth" }, 401);
  const user = {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
  };
  if (
    !c.req.path.endsWith("/auth/me") &&
    c.req.header("X-Axon-User") !== user.id
  )
    return c.json({ error: "session_changed" }, 409);
  c.set("user", user);
  await next();
};
async function session(c: Context, user: User) {
  const raw = token(),
    db = await database();
  await db.batch(
    [
      {
        sql: "DELETE FROM sessions WHERE expires<=? OR token=?",
        args: [Date.now(), digest(getCookie(c, COOKIE) || "")],
      },
      {
        sql: "INSERT INTO sessions VALUES(?,?,?)",
        args: [digest(raw), user.id, Date.now() + ttl * 1000],
      },
    ],
    "write",
  );
  setCookie(c, COOKIE, raw, opts);
  return { user, ...(await readState(user.id)) };
}
async function limitLogin(c: Context, account: string) {
  const ip = process.env.VERCEL
    ? c.req.header("x-vercel-forwarded-for") || "unknown"
    : "local";
  if (
    !(await quota("auth-site:" + digest(ip), 180, 60000)) ||
    !(await quota("auth:" + digest(account), 15, 60000))
  )
    throw new HTTPException(429, { message: "rate_limited" });
}
app.get("/health", async (c) => {
  await (await database()).execute("SELECT 1");
  return c.json({ ok: true });
});
app.post("/auth/register", async (c) => {
  const b = await body(
    c,
    z.object({ email, password, name: z.string().trim().max(120).default("") }),
  );
  await limitLogin(c, b.email);
  const db = await database();
  if (process.env.AXON_REGISTRATION === "closed")
    return c.json({ error: "registration_closed" }, 403);
  const delivery = process.env.RESEND_API_KEY,
    from = process.env.AXON_MAIL_FROM;
  if ((production || delivery || from) && !(delivery && from))
    return c.json({ error: "mail_unavailable" }, 503);
  if (
    (
      await db.execute({
        sql: "SELECT id FROM users WHERE email=?",
        args: [b.email],
      })
    ).rows.length
  )
    return c.json({ error: "exists" }, 409);
  const hash = await hashPassword(b.password);
  if (delivery && from) {
    const challenge = token(),
      code = token().slice(0, 12),
      expires = Date.now() + 600000;
    await db.batch(
      [
        { sql: "DELETE FROM challenges WHERE expires<=?", args: [Date.now()] },
        {
          sql: "INSERT INTO challenges VALUES(?,?,?,?,?,?)",
          args: [challenge, digest(code), b.email, b.name, hash, expires],
        },
      ],
      "write",
    );
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + delivery,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [b.email],
        subject: "AXON · Email verification",
        text: "AXON verification code: " + code + " (10 min).",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!sent.ok) return c.json({ error: "mail_unavailable" }, 503);
    return c.json({ challenge });
  }
  return createAccount(c, b.email, b.name, hash);
});
async function createAccount(
  c: Context,
  email: string,
  name: string,
  hash: string,
) {
  const db = await database(),
    id = crypto.randomUUID(),
    recovery = token();
  const result = await db.execute({
    sql: "INSERT INTO users(id,email,name,password_hash,created_at,recovery) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING",
    args: [id, email, name, hash, Date.now(), digest(recovery)],
  });
  if (!result.rowsAffected) return c.json({ error: "exists" }, 409);
  return c.json({ ...(await session(c, { id, email, name })), recovery });
}
app.post("/auth/verify", async (c) => {
  const b = await body(
    c,
    z.object({
      challenge: z.string().max(100),
      code: z.string().min(8).max(64),
    }),
  );
  await limitLogin(c, b.challenge);
  const db = await database();
  const row = (
    await db.execute({
      sql: "DELETE FROM challenges WHERE id=? AND code=? AND expires>? RETURNING email,name,hash",
      args: [b.challenge, digest(b.code), Date.now()],
    })
  ).rows[0];
  if (!row) return c.json({ error: "verification" }, 400);
  return createAccount(
    c,
    String(row.email),
    String(row.name),
    String(row.hash),
  );
});
app.post("/auth/login", async (c) => {
  const b = await body(c, z.object({ email, password }));
  await limitLogin(c, b.email);
  const db = await database();
  const row = (
    await db.execute({
      sql: "SELECT * FROM users WHERE email=?",
      args: [b.email],
    })
  ).rows[0];
  if (!row || !(await verifyPassword(b.password, String(row.password_hash))))
    return c.json({ error: "invalid" }, 401);
  return c.json(
    await session(c, {
      id: String(row.id),
      email: b.email,
      name: String(row.name),
    }),
  );
});
app.post("/auth/recover", async (c) => {
  const b = await body(
    c,
    z.object({ email, password, recovery: z.string().min(20).max(160) }),
  );
  await limitLogin(c, b.email);
  const db = await database(),
    next = token();
  const result = await db.batch(
    [
      {
        sql: "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email=? AND recovery=?)",
        args: [b.email, digest(b.recovery)],
      },
      {
        sql: "UPDATE users SET password_hash=?,recovery=? WHERE email=? AND recovery=?",
        args: [
          await hashPassword(b.password),
          digest(next),
          b.email,
          digest(b.recovery),
        ],
      },
    ],
    "write",
  );
  if (!result[1].rowsAffected) return c.json({ error: "invalid" }, 401);
  return c.json({ recovery: next });
});
app.get("/auth/me", auth, async (c) =>
  c.json({ user: c.get("user"), ...(await readState(c.get("user").id)) }),
);
app.post("/auth/logout", auth, async (c) => {
  const db = await database();
  await db.execute({
    sql: "DELETE FROM sessions WHERE token=?",
    args: [digest(getCookie(c, COOKIE)!)],
  });
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});
app.post("/account", auth, async (c) => {
  const b = await body(
    c,
    z.object({
      password,
      action: z.enum(["password", "delete", "recovery"]),
      newPassword: password.optional(),
    }),
  );
  const id = c.get("user").id,
    db = await database();
  await limitLogin(c, c.get("user").email);
  const row = (
    await db.execute({
      sql: "SELECT password_hash FROM users WHERE id=?",
      args: [id],
    })
  ).rows[0];
  if (!row || !(await verifyPassword(b.password, String(row.password_hash))))
    return c.json({ error: "invalid" }, 403);
  if (b.action === "delete") {
    const tables = ["sessions", "workspaces", "provider_keys", "runs"];
    await db.batch(
      [
        ...tables.map((t) => ({
          sql: "DELETE FROM " + t + " WHERE user_id=?",
          args: [id],
        })),
        { sql: "DELETE FROM users WHERE id=?", args: [id] },
      ],
      "write",
    );
    deleteCookie(c, COOKIE, { path: "/" });
    return c.json({ ok: true });
  }
  const recovery = token();
  if (b.action === "password" && !b.newPassword)
    return c.json({ error: "password" }, 400);
  await db.batch(
    [
      {
        sql: "UPDATE users SET password_hash=?,recovery=? WHERE id=?",
        args: [
          b.newPassword ? await hashPassword(b.newPassword) : row.password_hash,
          digest(recovery),
          id,
        ],
      },
      {
        sql: "DELETE FROM sessions WHERE user_id=? AND token<>?",
        args: [id, digest(getCookie(c, COOKIE)!)],
      },
    ],
    "write",
  );
  return c.json({ recovery });
});
app.get("/data", auth, async (c) => c.json(await readState(c.get("user").id)));
app.put("/data", auth, async (c) => {
  const b = await body(
      c,
      z.object({ revision: z.number().int().nonnegative(), data: workspace }),
    ),
    id = c.get("user").id;
  if (!(await writeState(id, b.revision, JSON.stringify(b.data))))
    return c.json({ error: "conflict" }, 409);
  return c.json({ revision: b.revision + 1 });
});
async function flags(id: string) {
  const keys = await readKeys(id);
  return {
    openai: !!keys.openai,
    grok: !!keys.xai,
    deepseek: !!keys.deepseek,
    shared: {
      openai: !!process.env.OPENAI_API_KEY,
      grok: !!process.env.XAI_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
    },
  };
}
app.get("/keys", auth, async (c) => c.json(await flags(c.get("user").id)));
app.post("/keys", auth, async (c) => {
  const value = z.string().trim().min(1).max(4096).nullable().optional();
  const b = await body(
    c,
    z.object({ openai: value, grok: value, deepseek: value }).strict(),
  );
  const db = await database(),
    id = c.get("user").id,
    statements = [];
  for (const [p, v] of Object.entries(b)) {
    if (v === null)
      statements.push({
        sql: "DELETE FROM provider_keys WHERE user_id=? AND provider=?",
        args: [id, p],
      });
    else if (v)
      statements.push({
        sql: "INSERT INTO provider_keys VALUES(?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET cipher=excluded.cipher",
        args: [id, p, await encryptSecret(v)],
      });
  }
  if (statements.length) await db.batch(statements, "write");
  return c.json(await flags(id));
});
const retention = 86400000,
  lease = 90000;
app.get("/runs", auth, async (c) => {
  const db = await database();
  const rows = (
    await db.execute({
      sql: "SELECT id,mode,label,status,updated FROM runs WHERE user_id=? AND updated>? ORDER BY updated DESC LIMIT 100",
      args: [c.get("user").id, Date.now() - retention],
    })
  ).rows;
  return c.json({
    runs: rows.map((r) => ({
      ...r,
      status:
        r.status === "running" && Number(r.updated) < Date.now() - lease
          ? "interrupted"
          : r.status,
    })),
  });
});
app.get("/runs/:id", auth, async (c) => {
  const db = await database();
  const row = (
    await db.execute({
      sql: "SELECT mode,status,result,input FROM runs WHERE id=? AND user_id=? AND updated>?",
      args: [c.req.param("id"), c.get("user").id, Date.now() - retention],
    })
  ).rows[0];
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({
    mode: row.mode,
    input: JSON.parse(String(row.input)),
    result: row.result ? JSON.parse(String(row.result)) : null,
  });
});
for (const route of ["chat", "plan"] as const)
  app.post("/" + route, auth, async (c) => {
    const b = await body(c, modelRequest),
      id = c.get("user").id;
    if (route === "chat" && !b.text?.trim())
      return c.json({ error: "invalid_input" }, 400);
    if (b.image && b.provider !== "openai")
      return c.json({ error: "image_provider" }, 400);
    const db = await database(),
      now = Date.now();
    await db.execute({
      sql: "DELETE FROM runs WHERE updated<?",
      args: [now - retention],
    });
    const previous = (
      await db.execute({
        sql: "SELECT mode,status,result FROM runs WHERE id=? AND user_id=?",
        args: [b.runId, id],
      })
    ).rows[0];
    if (previous?.mode && previous.mode !== route)
      return c.json({ error: "conflict" }, 409);
    if (previous?.status === "done")
      return new Response(
        JSON.stringify({ result: JSON.parse(String(previous.result)) }) + "\n",
        {
          headers: {
            "Content-Type": "application/x-ndjson",
            "Cache-Control": "no-store",
          },
        },
      );
    const key = await resolveApiKey(
      provider.parse(b.provider),
      await readKeys(id),
    );
    if (!key) return c.json({ error: "missing_key" }, 400);
    if (
      !(await quota("model:" + id, 12, 60000)) ||
      !(await quota("model-day:" + id, 100, 86400000)) ||
      !(await quota("model-site", 1200, 86400000))
    )
      return c.json({ error: "rate_limited" }, 429);
    const claim = await db.execute({
      sql: "INSERT INTO runs(id,user_id,mode,label,input,status,updated) VALUES(?,?,?,?,?,'running',?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,status='running' WHERE runs.user_id=excluded.user_id AND runs.input=excluded.input AND (runs.status='failed' OR (runs.status='running' AND runs.updated<?))",
      args: [
        b.runId,
        id,
        route,
        (b.text || b.date).slice(0, 120),
        JSON.stringify(b),
        now,
        now - lease,
      ],
    });
    if (!claim.rowsAffected) return c.json({ error: "run_busy" }, 409);
    const controller = new AbortController();
    const signal = AbortSignal.any([
      controller.signal,
      c.req.raw.signal,
      AbortSignal.timeout(60000),
    ]);
    const requestId = c.get("requestId"),
      started = Date.now();
    const stream = new ReadableStream<Uint8Array>({
      async start(out) {
        const send = (value: unknown) => {
          if (!controller.signal.aborted)
            out.enqueue(new TextEncoder().encode(JSON.stringify(value) + "\n"));
        };
        try {
          const result = await generate(b, key, route, signal, (text) =>
            send({ text }),
          );
          if (b.targetPlan && result.plan) {
            result.plan.id = b.targetPlan;
            if (result.message.card) result.message.card.planId = b.targetPlan;
          }
          await db.execute({
            sql: "UPDATE runs SET status='done',result=?,input='{}',updated=? WHERE id=? AND user_id=? AND updated=?",
            args: [JSON.stringify(result), Date.now(), b.runId, id, now],
          });
          send({ result });
        } catch {
          await db.execute({
            sql: "UPDATE runs SET status='failed',updated=? WHERE id=? AND user_id=? AND updated=?",
            args: [Date.now(), b.runId, id, now],
          });
          send({ error: "llm", requestId });
        } finally {
          if (!controller.signal.aborted) out.close();
          console.info("model_request", requestId, route, Date.now() - started);
        }
      },
      cancel() {
        controller.abort();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Request-Id": requestId,
      },
    });
  });
export default app;
