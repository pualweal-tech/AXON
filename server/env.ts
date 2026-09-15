export function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "axon-dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

export function encryptionSecret(): string {
  return process.env.JWT_SECRET || "axon-dev-secret-change-me";
}

export function isProd(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}
