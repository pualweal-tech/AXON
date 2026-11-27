import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Client } from "@libsql/client";
import { workspace } from "../src/schema";
import { dataDir, encryptionSecret } from "./env";
export type KeyRow = {
  openai: string | null;
  xai: string | null;
  deepseek: string | null;
};
let ready: Promise<Client> | undefined;

async function open() {
  encryptionSecret();
  const url = process.env.TURSO_DATABASE_URL;
  let client: Client;
  if (url) {
    if (!/^(libsql|https):\/\//.test(url) || !process.env.TURSO_AUTH_TOKEN)
      throw Error("Configure a remote database and token.");
    const { createClient } = await import("@libsql/client/web");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  } else {
    if (process.env.VERCEL) throw Error("Vercel requires TURSO_DATABASE_URL.");
    mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    const { createClient } = await import("@libsql/client");
    client = createClient({
      url: pathToFileURL(join(dataDir, "axon.db")).href,
    });
  }
  try {
    await client.batch(
      [
        "CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL,recovery TEXT)",
        "CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL)",
        "CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)",
        "CREATE TABLE IF NOT EXISTS workspaces(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision INTEGER NOT NULL,payload TEXT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS provider_keys(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,provider TEXT NOT NULL,cipher TEXT NOT NULL,PRIMARY KEY(user_id,provider))",
        "CREATE TABLE IF NOT EXISTS quotas(scope TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,mode TEXT NOT NULL,label TEXT NOT NULL,input TEXT NOT NULL,status TEXT NOT NULL,result TEXT,updated INTEGER NOT NULL)",
        "CREATE INDEX IF NOT EXISTS runs_owner ON runs(user_id,updated)",
        "CREATE TABLE IF NOT EXISTS challenges(id TEXT PRIMARY KEY,code TEXT NOT NULL,email TEXT NOT NULL,name TEXT NOT NULL,hash TEXT NOT NULL,expires INTEGER NOT NULL)",
        "CREATE TABLE IF NOT EXISTS migrations(id TEXT PRIMARY KEY)",
      ],
      "write",
    );
    return client;
  } catch (error) {
    client.close();
    throw error;
  }
}
export function database() {
  return (ready ??= open().catch((error) => {
    ready = undefined;
    throw error;
  }));
}
export async function readState(userId: string) {
  const db = await database();
  const row = (
    await db.execute({
      sql: "SELECT revision,payload FROM workspaces WHERE user_id=?",
      args: [userId],
    })
  ).rows[0];
  return row
    ? {
        revision: Number(row.revision),
        data: workspace.parse(JSON.parse(String(row.payload))),
      }
    : { revision: 0, data: null };
}
export async function writeState(
  userId: string,
  revision: number,
  payload: string,
) {
  const db = await database();
  const result =
    revision === 0
      ? await db.execute({
          sql: "INSERT INTO workspaces(user_id,revision,payload) VALUES(?,1,?) ON CONFLICT(user_id) DO NOTHING",
          args: [userId, payload],
        })
      : await db.execute({
          sql: "UPDATE workspaces SET revision=revision+1,payload=? WHERE user_id=? AND revision=?",
          args: [payload, userId, revision],
        });
  return result.rowsAffected === 1;
}
export async function quota(scope: string, limit: number, ms: number) {
  const db = await database(),
    now = Date.now();
  const result = await db.batch(
    [
      { sql: "DELETE FROM quotas WHERE expires<=?", args: [now] },
      {
        sql: "INSERT INTO quotas VALUES(?,1,?) ON CONFLICT(scope) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
        args: [scope, now + ms, limit],
      },
    ],
    "write",
  );
  return result[1].rows.length > 0;
}
export async function readKeys(userId: string): Promise<KeyRow> {
  const db = await database(),
    result: KeyRow = { openai: null, xai: null, deepseek: null };
  const { rows } = await db.execute({
    sql: "SELECT provider,cipher FROM provider_keys WHERE user_id=?",
    args: [userId],
  });
  for (const row of rows) {
    const field = row.provider === "grok" ? "xai" : String(row.provider);
    if (Object.hasOwn(result, field))
      result[field as keyof KeyRow] = String(row.cipher);
  }
  return result;
}
