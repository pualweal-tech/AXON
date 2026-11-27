import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import api from "./app";
import { database } from "./db";
await database();
const app = new Hono().route("/api", api);
app.use("*", serveStatic({ root: "./dist" }));
serve(
  {
    fetch: app.fetch,
    port: Number(process.env.PORT || 8787),
    hostname: process.env.HOST || "127.0.0.1",
  },
  (info) => console.log("AXON listening on port", info.port),
);
