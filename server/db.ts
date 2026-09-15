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

const g = globalThis as typeof globalThis & { __axonDb?: FileDB; __axonSubs?: Array<(db: FileDB) => void> };

function empty(): FileDB {
  return { users: [], data: {}, keys: {} };
}

function db(): FileDB {
  if (!g.__axonDb) g.__axonDb = empty();
  return g.__axonDb;
}

function emit(): void {
  g.__axonSubs?.forEach((fn) => fn(db()));
}

export function hydrate(data: Partial<FileDB> | null | undefined): void {
  g.__axonDb = {
    users: Array.isArray(data?.users) ? data.users : [],
    data: data?.data && typeof data.data === "object" ? data.data : {},
    keys: data?.keys && typeof data.keys === "object" ? data.keys : {},
  };
}

export function snapshot(): FileDB {
  return db();
}

export function subscribe(fn: (data: FileDB) => void): void {
  g.__axonSubs = g.__axonSubs || [];
  g.__axonSubs.push(fn);
}

export async function initDb(): Promise<void> {
  db();
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
  return db().users.find((user) => user.email === email);
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  return db().users.find((user) => user.id === id);
}

export async function createUser(user: UserRow): Promise<void> {
  db().users.push(user);
  emit();
}

export async function readPayload(userId: string): Promise<string | null> {
  return db().data[userId]?.payload ?? null;
}

export async function writePayload(userId: string, payload: string): Promise<void> {
  db().data[userId] = { payload, updated_at: Date.now() };
  emit();
}

export async function readKeys(userId: string): Promise<KeyRow | undefined> {
  const keys = db().keys[userId];
  if (!keys) return undefined;
  return { user_id: userId, ...keys };
}

export async function writeKeys(userId: string, keys: Omit<KeyRow, "user_id">): Promise<void> {
  db().keys[userId] = keys;
  emit();
}
