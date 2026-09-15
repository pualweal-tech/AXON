import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: number;
};

export type KeyRow = {
  user_id: string;
  openai: string | null;
  xai: string | null;
  deepseek: string | null;
};

type FileDB = {
  users: UserRow[];
  data: Record<string, { payload: string; updated_at: number }>;
  keys: Record<string, Omit<KeyRow, "user_id">>;
};

function dbFile(): string {
  if (process.env.VERCEL) return "/tmp/axon.json";
  const file = resolve(process.cwd(), "data", "axon.json");
  mkdirSync(dirname(file), { recursive: true });
  return file;
}

function empty(): FileDB {
  return { users: [], data: {}, keys: {} };
}

function load(): FileDB {
  const file = dbFile();
  if (!existsSync(file)) return empty();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as Partial<FileDB>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      data: parsed.data && typeof parsed.data === "object" ? parsed.data : {},
      keys: parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {},
    };
  } catch {
    return empty();
  }
}

function save(db: FileDB): void {
  writeFileSync(dbFile(), JSON.stringify(db));
}

export async function initDb(): Promise<void> {
  save(load());
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return load().users.find((user) => user.email === email);
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  return load().users.find((user) => user.id === id);
}

export async function createUser(user: UserRow): Promise<void> {
  const db = load();
  db.users.push(user);
  save(db);
}

export async function readPayload(userId: string): Promise<string | null> {
  return load().data[userId]?.payload ?? null;
}

export async function writePayload(userId: string, payload: string): Promise<void> {
  const db = load();
  db.data[userId] = { payload, updated_at: Date.now() };
  save(db);
}

export async function readKeys(userId: string): Promise<KeyRow | undefined> {
  const keys = load().keys[userId];
  if (!keys) return undefined;
  return { user_id: userId, ...keys };
}

export async function writeKeys(userId: string, keys: Omit<KeyRow, "user_id">): Promise<void> {
  const db = load();
  db.keys[userId] = keys;
  save(db);
}
