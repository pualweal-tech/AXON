import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { config } from "dotenv";
import app from "./app";
import { hydrate, snapshot, subscribe } from "./db";

config();

const file = resolve(process.cwd(), "data", "axon.json");
try {
  if (existsSync(file)) hydrate(JSON.parse(readFileSync(file, "utf8")));
} catch {
  /* start empty */
}

subscribe((data) => {
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
});

const port = Number(process.env.PORT || 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`AXON API http://localhost:${port}`);
});
