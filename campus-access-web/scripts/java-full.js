import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webRoot, "..");
const java = process.env.JAVA_BIN || "java";
const children = [];

function jar(module) {
  return path.join(repoRoot, "backend", module, "target", `${module}-0.2.0-SNAPSHOT.jar`);
}

function launch(name, args, extraEnv = {}) {
  const target = args.at(-1)?.endsWith(".jar") ? args.at(-1) : args.find((item) => item.endsWith(".jar"));
  if (target && !existsSync(target)) {
    throw new Error(`缺少 ${name} 构建产物：${target}，请先运行 mvn -f backend/pom.xml clean package`);
  }
  const child = spawn(java, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnv }
  });
  child.once("exit", (code, signal) => {
    if (code && code !== 0) {
      console.error(`${name} 异常退出：${code || signal}`);
      stopAll("SIGTERM");
      process.exitCode = code;
    }
  });
  children.push(child);
}

function stopAll(signal) {
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

const registryJar = jar("eureka-server");
launch("registry-19761", ["-Xmx160m", "-jar", registryJar, "--server.port=19761"], {
  REGISTRY_HOST: "localhost",
  PEER_URL: "http://127.0.0.1:19762/eureka/"
});
launch("registry-19762", ["-Xmx160m", "-jar", registryJar, "--server.port=19762"], {
  REGISTRY_HOST: "127.0.0.1",
  PEER_URL: "http://localhost:19761/eureka/"
});

setTimeout(() => {
  for (const module of [
    "gateway-service",
    "user-service",
    "appointment-service",
    "access-service",
    "exception-service",
    "aggregation-service"
  ]) {
    launch(module, ["-Xmx256m", "-jar", jar(module)]);
  }
  const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "0.0.0.0"], {
    cwd: webRoot,
    stdio: "inherit",
    env: { ...process.env, VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || "/api" }
  });
  children.push(vite);
}, 8000);

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));
