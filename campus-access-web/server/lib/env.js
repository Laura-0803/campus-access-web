// 本模块在服务启动时读取项目根目录的 .env 文件，并将尚未定义的配置注入 process.env。
// fs 用于同步检查和读取环境文件。
import fs from "node:fs";
// path 用于根据当前模块位置计算 .env 的绝对路径。
import path from "node:path";
// fileURLToPath 将 ES Module 的 import.meta.url 转换为本地文件路径。
import { fileURLToPath } from "node:url";

// 先取得当前 lib 目录，再向上两级定位项目根目录中的 .env 文件。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../.env");

// 解析一行 KEY=VALUE 配置；空行、注释行和没有等号的内容返回 null。
function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  // 只按第一个等号拆分，保证值本身包含等号时仍能被完整保留。
  const index = trimmed.indexOf("=");
  if (index < 0) return null;

  // 支持使用单双引号包裹值，并在写入环境变量前移除最外层引号。
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return key ? [key, value] : null;
}

// 只有文件真实存在时才读取，项目未配置 .env 时不会阻止服务启动。
if (fs.existsSync(envPath)) {
  // 同时兼容 Windows 和 Unix 换行符，逐行解析配置。
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    // 系统或启动命令已经设置的环境变量优先，.env 不会覆盖它们。
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
