import { readFile } from "node:fs/promises";
import { z } from "zod";
import { database } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
import { workspace } from "../src/schema";
import { mergeData } from "../src/data";

const legacy = z.object({
  users: z.array(
    z.object({
      id: z.string(),
      email: z.email(),
      name: z.string(),
      password_hash: z.string(),
      created_at: z.number(),
    }),
  ),
  data: z.record(z.string(), z.object({ payload: z.string() })),
  keys: z.record(z.string(), z.record(z.string(), z.string().nullable())),
});
const file = process.argv[2];
if (!file) throw Error("Pass the trusted server-side axon.json path.");
const snapshot = legacy.parse(JSON.parse(await readFile(file, "utf8")));
const db = await database(),
  tx = await db.transaction("write");
try {
  if (
    (await tx.execute("SELECT id FROM migrations WHERE id='legacy-json-v1'"))
      .rows.length
  ) {
    console.info("Legacy migration already applied.");
  } else {
    if ((await tx.execute("SELECT id FROM users LIMIT 1")).rows.length)
      throw Error("Import requires an empty target database.");
    const ids = new Set(snapshot.users.map((u) => u.id));
    if (
      [...Object.keys(snapshot.data), ...Object.keys(snapshot.keys)].some(
        (id) => !ids.has(id),
      )
    )
      throw Error("Snapshot contains orphaned records.");
    for (const u of snapshot.users) {
      await tx.execute({
        sql: "INSERT INTO users(id,email,name,password_hash,created_at) VALUES(?,?,?,?,?)",
        args: [u.id, u.email, u.name, u.password_hash, u.created_at],
      });
      if (snapshot.data[u.id]) {
        const data = workspace.parse(
          mergeData(JSON.parse(snapshot.data[u.id].payload)),
        );
        await tx.execute({
          sql: "INSERT INTO workspaces VALUES(?,1,?)",
          args: [u.id, JSON.stringify(data)],
        });
      }
      for (const [field, cipher] of Object.entries(snapshot.keys[u.id] || {})) {
        if (!cipher) continue;
        if (!process.env.LEGACY_JWT_SECRET)
          throw Error("Set LEGACY_JWT_SECRET to migrate stored provider keys.");
        if (!["openai", "xai", "deepseek"].includes(field))
          throw Error("Unknown legacy provider.");
        await tx.execute({
          sql: "INSERT INTO provider_keys VALUES(?,?,?)",
          args: [
            u.id,
            field === "xai" ? "grok" : field,
            await encryptSecret(
              await decryptSecret(cipher, process.env.LEGACY_JWT_SECRET),
            ),
          ],
        });
      }
    }
    await tx.execute("INSERT INTO migrations VALUES('legacy-json-v1')");
    console.info("Imported accounts:", snapshot.users.length);
  }
  await tx.commit();
} finally {
  tx.close();
  db.close();
}
