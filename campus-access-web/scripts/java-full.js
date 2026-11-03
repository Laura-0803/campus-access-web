import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const repoRoot = path.resolve(webRoot, "..");
const java = process.env.JAVA_BIN || "java";
const children = [];
let stopping = false;

function loadLocalEnv() {
  const envFile = path.join(webRoot, ".env");
  if (!existsSync(envFile)) return;
  for (const rawLine of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(name in process.env)) process.env[name] = value;
  }
}

const requiredEnv = [
  "P2_DB_URL", "P2_DB_USER", "P2_DB_PASSWORD", "P2_INTERNAL_KEY",
  "P3_DB_URL", "P3_DB_USER", "P3_DB_PASSWORD", "P3_INTERNAL_KEY",
  "P4_DB_URL", "P4_DB_USER", "P4_DB_PASSWORD", "P4_INTERNAL_KEY",
  "P4C_DB_URL", "P4C_DB_USER", "P4C_DB_PASSWORD"
];
const servicePorts = [19761, 19762, 19800, 19811, 19821, 19841, 19851, 19861, 5173];

function validateEnvironment() {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`缺少启动环境变量：\n  ${missing.join("\n  ")}\n请先加载本机私密数据库配置，再重新执行 start-all。`);
  }

  for (const name of ["P2_DB_URL", "P3_DB_URL", "P4_DB_URL", "P4C_DB_URL"]) {
    if (!process.env[name].startsWith("jdbc:mysql://127.0.0.1:")) {
      throw new Error(`${name} 必须是以 jdbc:mysql://127.0.0.1: 开头的隔离数据库地址。`);
    }
  }

  for (const name of ["P2_INTERNAL_KEY", "P3_INTERNAL_KEY", "P4_INTERNAL_KEY"]) {
    if (process.env[name].length < 32) {
      throw new Error(`${name} 长度不能少于 32 个字符。`);
    }
  }
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(new Error(`端口 ${port} 已被占用。请先停止上一次启动的服务，再运行 start-all。`));
        return;
      }
      resolve();
    });
    server.listen({ host: "127.0.0.1", port }, () => server.close(resolve));
  });
}

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
    if (!stopping && code && code !== 0) {
      console.error(`${name} 异常退出：${code || signal}`);
      stopAll("SIGTERM");
      process.exitCode = code;
    }
  });
  children.push(child);
}

function stopAll(signal) {
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill(signal);
  }
}

try {
  loadLocalEnv();
  validateEnvironment();
  for (const port of servicePorts) {
    await assertPortAvailable(port);
  }
} catch (error) {
  console.error(`\n启动前检查失败：${error.message}\n`);
  process.exit(1);
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
