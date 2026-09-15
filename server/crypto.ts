import { SignJWT, jwtVerify } from "jose";
import { encryptionSecret, jwtSecret } from "./env";

const COOKIE = "axon_session";
const TOKEN_DAYS = 30;
const enc = new TextEncoder();

export { COOKIE };

function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(secret: string, salt: Uint8Array): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    material,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `pbkdf2$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts[0] !== "pbkdf2" || !parts[1] || !parts[2]) return false;
  const salt = fromB64(parts[1]);
  const expected = fromB64(parts[2]);
  const actual = await pbkdf2(password, salt);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export async function signToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_DAYS}d`)
    .sign(jwtSecret());
}

export async function readToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    if (!payload.sub) return null;
    return { userId: payload.sub, email: String(payload.email || "") };
  } catch {
    return null;
  }
}

async function aesKey(): Promise<CryptoKey> {
  const salt = enc.encode("axon-api-keys");
  const material = await crypto.subtle.importKey(
    "raw",
    enc.encode(encryptionSecret()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plain));
  const packed = new Uint8Array(iv.length + cipher.byteLength);
  packed.set(iv);
  packed.set(new Uint8Array(cipher), iv.length);
  return toB64(packed);
}

export async function decryptSecret(payload: string): Promise<string> {
  const packed = fromB64(payload);
  const iv = packed.subarray(0, 12);
  const data = packed.subarray(12);
  const key = await aesKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}
