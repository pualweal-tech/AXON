import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";

export const production =
  process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
export const dataDir = resolve(process.env.AXON_DATA_DIR || "../.axon-data");

export function encryptionSecret(): string {
  const configured = process.env.AXON_ENCRYPTION_KEY;
  if (configured && /^[A-Za-z0-9+/=_-]{43,128}$/.test(configured))
    return configured;
  if (production || configured)
    throw new Error(
      "Configure AXON_ENCRYPTION_KEY with at least 32 random bytes, base64 encoded.",
    );
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const path = join(dataDir, "encryption.key");
  try {
    writeFileSync(path, randomBytes(32).toString("base64"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  return readFileSync(path, "utf8").trim();
}
