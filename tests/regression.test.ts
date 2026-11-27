import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { emptyData } from "../src/data";
import { planTasks, applyConversions } from "../src/planning";
import { mergeChanges } from "../src/sync";
import { calendarFile, importWeek } from "../src/calendar";

process.env.NODE_ENV = "test";
for (const key of [
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
  "VERCEL",
  "RESEND_API_KEY",
  "AXON_MAIL_FROM",
  "AXON_REGISTRATION",
  "APP_ORIGIN",
])
  delete process.env[key];
process.env.AXON_DATA_DIR = mkdtempSync(join(tmpdir(), "axon-regression-"));
process.env.AXON_ENCRYPTION_KEY = randomBytes(32).toString("base64");
const { default: app } = await import("../server/app");
const { database } = await import("../server/db");
const { generate } = await import("../server/llm");
after(async () => {
  (await database()).close();
});
type Identity = { cookie: string; id: string };
function call(path: string, method = "GET", body?: unknown, who?: Identity) {
  return app.request(path, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: who?.cookie || "",
      "x-axon-user": who?.id || "",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function account(email: string) {
  const response = await call("/auth/register", "POST", {
    email,
    password: "fixture-password",
    name: "Fixture",
  });
  assert.equal(response.status, 200);
  const { user, recovery } = await response.json();
  return {
    id: user.id as string,
    cookie: response.headers
      .getSetCookie()
      .find((s) => s.startsWith("axon_session="))!
      .split(";")[0],
    recovery: recovery as string,
  };
}
test("owned sessions, atomic revisions, independent process persistence and logout", async () => {
  const a = await account("a@example.invalid"),
    b = await account("b@example.invalid");
  const data = emptyData();
  data.notes.push({
    id: "n",
    title: "saved",
    source: "manual",
    body: "body",
    createdAt: 1,
    updatedAt: 1,
  });
  assert.equal(
    (await call("/data", "PUT", { data, revision: 0 }, a)).status,
    200,
  );
  assert.equal(
    (await call("/data", "PUT", { data, revision: 0 }, a)).status,
    409,
  );
  assert.equal(
    (
      await call(
        "/data",
        "PUT",
        { data, revision: 0 },
        { cookie: b.cookie, id: a.id },
      )
    ).status,
    409,
  );
  assert.equal(
    (await (await call("/data", "GET", undefined, b)).json()).data,
    null,
  );
  assert.equal(
    (await call("/data", "PUT", { data: {}, revision: 1 }, a)).status,
    400,
  );
  const code =
    "import {readState,database} from './server/db.ts'; console.log((await readState(process.argv[1])).data.notes[0].title);(await database()).close()";
  assert.equal(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", code, a.id],
      { encoding: "utf8" },
    ).trim(),
    "saved",
  );
  assert.equal((await call("/auth/logout", "POST", {}, a)).status, 200);
  assert.equal((await call("/auth/me", "GET", undefined, a)).status, 401);
});
test("all provider keys can be set and removed independently", async () => {
  const a = await account("keys@example.invalid");
  for (const provider of ["openai", "grok", "deepseek"]) {
    assert.equal(
      (
        await (await call("/keys", "POST", { [provider]: "fixture" }, a)).json()
      )[provider],
      true,
    );
    assert.equal(
      (await (await call("/keys", "POST", { [provider]: null }, a)).json())[
        provider
      ],
      false,
    );
  }
});
test("same email registered concurrently has one owner", async () => {
  const responses = await Promise.all(
    [1, 2].map(() =>
      call("/auth/register", "POST", {
        email: "same@example.invalid",
        password: "fixture-password",
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
});
test("recovery is single use and revokes existing sessions", async () => {
  const email = "recover@example.invalid",
    a = await account(email),
    body = { email, password: "new-password", recovery: a.recovery };
  assert.equal((await call("/auth/recover", "POST", body)).status, 200);
  assert.equal((await call("/auth/recover", "POST", body)).status, 401);
  assert.equal((await call("/auth/me", "GET", undefined, a)).status, 401);
});
test("public sign-up issues no session before email verification", async () => {
  process.env.RESEND_API_KEY = "fixture";
  process.env.AXON_MAIL_FROM = "fixture@example.invalid";
  const original = fetch;
  let code = "";
  globalThis.fetch = async (_url, init) => {
    code = JSON.parse(String(init?.body)).text.split(": ")[1].split(" ")[0];
    return Response.json({ id: "fixture" });
  };
  try {
    const response = await call("/auth/register", "POST", {
      email: "mail@example.invalid",
      password: "fixture-password",
    });
    const { challenge } = await response.json();
    assert.ok(challenge);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(
      (await call("/auth/verify", "POST", { challenge, code })).status,
      200,
    );
    assert.equal(
      (await call("/auth/verify", "POST", { challenge, code })).status,
      400,
    );
  } finally {
    globalThis.fetch = original;
    delete process.env.RESEND_API_KEY;
    delete process.env.AXON_MAIL_FROM;
  }
});
test("three-way merge preserves independent edits and detects conflicting fields", () => {
  const base = [{ id: "n", title: "initial", body: "old" }];
  assert.deepEqual(
    mergeChanges(
      base,
      [{ ...base[0], title: "changed" }],
      [{ ...base[0], body: "new" }],
    ),
    [{ id: "n", title: "changed", body: "new" }],
  );
  assert.throws(() =>
    mergeChanges(base, [], [{ ...base[0], body: "changed" }]),
  );
});
const plan = {
  id: "p",
  variant: 0,
  generatedAt: Date.now(),
  weekOf: "2026-11-24",
  items: [
    {
      id: "i",
      category: "work" as const,
      title: "Review",
      time: "09:15",
      day: "THURSDAY",
    },
  ],
};
test("weekly conversion anchors dates and retains stable origin IDs and times", () => {
  const [item] = planTasks(plan);
  assert.equal(item.date, "2026-11-26");
  assert.equal(item.time, "09:15");
  assert.equal(item.originId, planTasks(plan)[0].originId);
});
test("calendar export and import preserve dated events", async () => {
  const ics = calendarFile(plan, true);
  assert.match(ics, /BEGIN:VALARM/);
  const [entry] = await importWeek(ics, "2026-11-24");
  assert.equal(entry.title, "Review");
  assert.equal(entry.date, "2026-11-26");
  assert.equal(entry.time, "09:15");
});
test("streamed output is visible and a missing weekly plan is rejected", async () => {
  const original = globalThis.fetch,
    progress: string[] = [];
  const input = {
    runId: crypto.randomUUID(),
    provider: "openai" as const,
    lang: "zh" as const,
    date: "2026-11-24",
    text: "help",
    history: [],
    memories: [],
    structuredCards: true,
    voiceStyle: false,
    context: "",
  };
  globalThis.fetch = async () =>
    new Response(
      "data: " +
        JSON.stringify({
          choices: [
            {
              delta: { content: JSON.stringify({ text: "Hello", card: null }) },
            },
          ],
        }) +
        "\n\ndata: [DONE]\n\n",
    );
  try {
    const result = await generate(
      input,
      "fixture",
      "chat",
      new AbortController().signal,
      (s) => progress.push(s),
    );
    assert.deepEqual(progress, ["Hello"]);
    assert.equal(result.message.text, "Hello");
    await assert.rejects(
      generate(
        input,
        "fixture",
        "plan",
        new AbortController().signal,
        () => {},
      ),
      /missing_plan/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("Vercel function dispatches an API subpath", async () => {
  const { default: fn } = await import("../api/index");
  for (const url of [
    "https://fixture.invalid/api/health",
    "https://fixture.invalid/api?__axon_route=health",
  ]) {
    const r = await fn.fetch(new Request(url));
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { ok: true });
  }
});

test("model run results survive reconnect, replay once and stay account-scoped", async () => {
  const a = await account("run@example.invalid"),
    b = await account("other@example.invalid");
  await call("/keys", "POST", { openai: "fixture" }, a);
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(
      "data: " +
        JSON.stringify({
          choices: [{ delta: { content: '{"text":"confirmed","card":null}' } }],
        }) +
        "\n\ndata: [DONE]\n",
    );
  };
  const input = {
    runId: crypto.randomUUID(),
    provider: "openai",
    lang: "en",
    date: "2026-11-24",
    text: "test",
    memories: [],
  };
  try {
    for (let i = 0; i < 2; i++) {
      const response = await call("/chat", "POST", input, a);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /confirmed/);
    }
    assert.equal(requests, 1);
    const list = await (await call("/runs", "GET", undefined, a)).json();
    assert.equal(list.runs[0].status, "done");
    assert.equal(
      (await (await call("/runs/" + input.runId, "GET", undefined, a)).json())
        .result.message.text,
      "confirmed",
    );
    assert.equal(
      (await call("/runs/" + input.runId, "GET", undefined, b)).status,
      404,
    );
  } finally {
    globalThis.fetch = original;
  }
});
test("trusted legacy JSON migration is atomic and repeatable", async () => {
  const { writeFileSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "axon-legacy-")),
    file = join(dir, "legacy.json");
  const snapshot = {
    users: [
      {
        id: "legacy",
        email: "legacy@example.invalid",
        name: "Old",
        password_hash: "legacy-hash",
        created_at: 1,
      },
    ],
    data: { legacy: { payload: JSON.stringify(emptyData()) } },
    keys: {},
  };
  writeFileSync(file, JSON.stringify(snapshot));
  const args = ["--import", "tsx", "server/migrate.ts", file],
    env = { ...process.env, AXON_DATA_DIR: dir };
  assert.match(
    execFileSync(process.execPath, args, { env, encoding: "utf8" }),
    /Imported accounts: 1/,
  );
  assert.match(
    execFileSync(process.execPath, args, { env, encoding: "utf8" }),
    /already applied/,
  );
});

test("scheduling moves an existing task once and skips occupied calendar intervals", () => {
  const old = {
    id: "task",
    title: "Write",
    date: "2026-11-25",
    done: false,
    createdAt: 1,
    category: "work" as const,
    source: "manual" as const,
  };
  const fixed = {
    ...old,
    id: "event",
    time: "09:00",
    endsAt: +new Date(2026, 10, 25, 10),
    originId: "calendar-1",
  };
  const item = {
    title: "Write",
    category: "work" as const,
    date: old.date,
    time: "09:30",
    taskId: "task",
    originId: "plan/1",
  };
  assert.deepEqual(applyConversions([old, fixed], [item], old.date).conflicts, [
    "Write",
  ]);
  const clear = { ...item, time: "10:00" };
  const outcome = applyConversions([old, fixed], [clear], old.date);
  assert.equal(outcome.tasks.length, 2);
  assert.equal(outcome.tasks[0].time, "10:00");
  assert.deepEqual(
    applyConversions(outcome.tasks, [clear], old.date).tasks,
    outcome.tasks,
  );
});

test("Vercel rewrite preserves a POST request body and session cookie", async () => {
  const { default: fn } = await import("../api/index");
  const response = await fn.fetch(
    new Request("https://fixture.invalid/api?__axon_route=auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "https://fixture.invalid",
      },
      body: JSON.stringify({
        email: "rewrite@example.invalid",
        password: "fixture-password",
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.ok(response.headers.getSetCookie()[0].startsWith("axon_session="));
});
