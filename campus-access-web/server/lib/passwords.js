// 本模块使用 Node.js 加密能力完成密码哈希、验证和旧密码格式识别。
// 引入安全随机数、PBKDF2 和恒定时间比较函数。
import crypto from "node:crypto";

// 哈希字符串前缀用于标识存储格式和兼容旧版明文密码。
const PREFIX = "pbkdf2";
// PBKDF2 迭代次数用于提高暴力破解成本。
const ITERATIONS = 120000;
// 派生密钥长度为 32 字节，即 256 位。
const KEY_LENGTH = 32;
// 使用 SHA-256 作为 PBKDF2 的摘要算法。
const DIGEST = "sha256";

// 通过固定格式前缀判断数据库中的值是否已经是 PBKDF2 哈希。
export function isPasswordHash(value = "") {
  return String(value).startsWith(`${PREFIX}$`);
}

// 为密码生成独立的 16 字节随机盐，并返回包含算法、迭代次数、盐和密钥的存储字符串。
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${PREFIX}$${ITERATIONS}$${salt}$${key}`;
}

// 验证用户输入密码；兼容旧数据中的非哈希密码，以便登录成功后完成渐进升级。
export function verifyPassword(password, storedPassword = "") {
  // 旧格式暂按字符串比较；调用方可在验证成功后立即重新哈希。
  if (!isPasswordHash(storedPassword)) {
    return String(password) === String(storedPassword);
  }

  // 按约定格式拆出迭代次数、盐和期望密钥，字段不完整时直接验证失败。
  const [, iterations, salt, key] = String(storedPassword).split("$");
  if (!iterations || !salt || !key) return false;

  // 用相同参数重新派生密钥，并使用 timingSafeEqual 降低计时攻击风险。
  const actual = crypto.pbkdf2Sync(String(password), salt, Number(iterations), KEY_LENGTH, DIGEST);
  const expected = Buffer.from(key, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// 判断存储密码是否仍是需要升级的旧格式。
export function needsPasswordRehash(storedPassword = "") {
  return !isPasswordHash(storedPassword);
}
