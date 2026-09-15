import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type Client, type InValue } from "@libsql/client";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function dbPath(): { url: string; authToken?: string } {
  if (process.env.TURSO_DATABASE_URL) {
    return {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    };
  }
  if (process.env.VERCEL) {
    return { url: "file:/tmp/axon.db" };
  }
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  return { url: "file:" + resolve(process.cwd(), "data", "axon.db") };
}

export function getDb(): Client {
  if (!client) {
    client = createClient(dbPath());
  }
  return client;
}

export async function initDb(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = getDb();
      await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          name TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_data (
          user_id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS user_keys (
          user_id TEXT PRIMARY KEY,
          openai TEXT,
          xai TEXT,
          deepseek TEXT
        );
      `);
    })();
  }
  await ready;
}

export async function query<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const rs = await getDb().execute({ sql, args });
  return rs.rows as unknown as T[];
}

export async function run(sql: string, args: InValue[] = []): Promise<void> {
  await getDb().execute({ sql, args });
}

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: number;
};

export type DataRow = {
  user_id: string;
  payload: string;
  updated_at: number;
};

export type KeyRow = {
  user_id: string;
  openai: string | null;
  xai: string | null;
  deepseek: string | null;
};
