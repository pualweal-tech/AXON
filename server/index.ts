import { serve } from "@hono/node-server";
import app from "./app";
import "./env";

const port = Number(process.env.PORT || 8787);

serve({ fetch: app.fetch, port }, () => {
  console.log(`AXON API http://localhost:${port}`);
});
