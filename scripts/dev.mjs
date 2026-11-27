import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scripts = [["tsx/cli", "watch", "server/index.ts"], ["vite/bin/vite.js"]];
const children = scripts.map(([name, ...args]) => {
  const file = name.startsWith("vite/")
    ? new URL("../node_modules/vite/bin/vite.js", import.meta.url)
    : import.meta.resolve(name);
  return spawn(process.execPath, [fileURLToPath(file), ...args], {
    stdio: "inherit",
  });
});
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const child of children) child.on("exit", (code) => stop(code ?? 1));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
