import {
  createHash,
  randomBytes,
  timingSafeEqual,
  pbkdf2 as derive,
} from "node:crypto";
import { promisify } from "node:util";
import { encryptionSecret } from "./env";
const pbkdf2 = promisify(derive);
const rounds = 310000;
export const COOKIE = "axon_session";
export const token = () => randomBytes(32).toString("base64url");
export const digest = (v: string) =>
  createHash("sha256").update(v).digest("hex");

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, rounds, 32, "sha256");
  return ["v2", salt.toString("base64url"), hash.toString("base64url")].join(
    "$",
  );
}
export async function verifyPassword(password: string, stored: string) {
  const [format, salt, hash] = stored.split("$");
  if (!["v2", "pbkdf2"].includes(format) || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await pbkdf2(
    password,
    Buffer.from(salt, "base64url"),
    format === "v2" ? rounds : 120000,
    32,
    "sha256",
  );
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
async function key(secret: string) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("axon-api-keys"),
      iterations: 120000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
let current: Promise<CryptoKey> | undefined;
function currentKey() {
  return (current ??= key(encryptionSecret()));
}

export async function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await currentKey(),
    new TextEncoder().encode(value),
  );
  return Buffer.concat([iv, Buffer.from(cipher)]).toString("base64url");
}
export async function decryptSecret(value: string, legacySecret?: string) {
  const packed = Buffer.from(value, "base64url");
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: packed.subarray(0, 12) },
    await (legacySecret ? key(legacySecret) : currentKey()),
    packed.subarray(12),
  );
  return new TextDecoder().decode(plain);
}
