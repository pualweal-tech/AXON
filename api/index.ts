import { handle } from "hono/vercel";
import app from "../server/app";

export const runtime = "edge";
export const config = {
  runtime: "edge",
};

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export default handler;
