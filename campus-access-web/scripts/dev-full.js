import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const node = process.execPath;

const processes = [
  spawn(node, ["server/index.js"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.API_PORT || "3001" }
  }),
  spawn(node, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "/api" }
  })
];

function stopAll(signal) {
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      stopAll(signal || "SIGTERM");
      process.exit(code);
    }
  });
}

process.on("SIGINT", () => {
  stopAll("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  stopAll("SIGTERM");
  process.exit(0);
});
