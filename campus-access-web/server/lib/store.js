// 本模块是系统统一数据访问层，负责 MySQL 初始化、关系表读写、内存缓存、历史数据迁移和串行事务更新。
// mysql2/promise 提供基于 Promise 的连接、连接池和事务接口。
import mysql from "mysql2/promise";
// 种子数据用于数据库首次初始化和旧数据缺失字段的默认补齐。
import { seedData } from "../data/seed.js";
// 密码工具用于在迁移阶段自动把旧版明文密码升级为安全哈希。
import { hashPassword, needsPasswordRehash } from "./passwords.js";

// 从环境变量读取数据库连接信息；未配置时使用本地开发默认值。
const dbConfig = {
  host: process.env.CAMPUS_DB_HOST || "127.0.0.1",
  port: Number(process.env.CAMPUS_DB_PORT || 3306),
  user: process.env.CAMPUS_DB_USER || "root",
  password: process.env.CAMPUS_DB_PASSWORD || "root",
  database: process.env.CAMPUS_DB_NAME || "campus_access",
  legacyTable: process.env.CAMPUS_DB_TABLE || "app_state"
};

// 集中维护本系统使用的全部关系表名称，同时决定清表、初始化和存储信息的处理范围。
const tableNames = [
  "roles",
  "role_profiles",
  "users",
  "people",
  "access_records",
  "appointments",
  "exceptions",
  "devices",
  "vehicles",
  "faces",
  "qr_codes",
  "settings",
  "gates",
  "access_rules",
  "blacklist",
  "logs",
  "messages",
  "sessions"
];

// cache 保存当前规范化业务快照，pool 保存 MySQL 连接池。
let cache;
let pool;
// 写操作通过 Promise 链串行执行，避免多个并发更新相互覆盖内存快照或数据库内容。
let writeQueue = Promise.resolve();

// 通过 JSON 序列化生成纯数据深拷贝，供事务草稿和默认数据复制使用。
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// 将 undefined 转换为 SQL 可接受的 null，其他值保持不变。
function valueOrNull(value) {
  return value === undefined ? null : value;
}

// 安全解析可能来自 JSON 字段的值；空值或解析失败时使用调用方给定的默认值。
function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;

  // MySQL 驱动可能已经返回非字符串结构，此时无需重复解析。
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// 将数组或使用顿号、中英文逗号、斜杠分隔的配置统一转换为去空白数组。
function listValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 把任意来源的数据整理为完整统一的系统状态结构，并使用种子数据补齐缺失内容。
function normalizeData(data = {}) {
  // 先深拷贝种子数据，避免规范化过程修改被其他模块共享的 seedData。
  const base = clone(seedData);
  const normalized = {
    ...base,
    ...data,
    roles: { ...base.roles, ...(data.roles || {}) },
    roleProfiles: { ...base.roleProfiles, ...(data.roleProfiles || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    sessions: Array.isArray(data.sessions) ? data.sessions : []
  };

  // 列表型业务数据必须是数组；来源值非法时回退对应种子数组。
  for (const key of [
    "users",
    "people",
    "accessRecords",
    "appointments",
    "exceptions",
    "devices",
    "vehicles",
    "faces",
    "qrCodes",
    "gates",
    "accessRules",
    "blacklist",
    "logs",
    "messages"
  ]) {
    normalized[key] = Array.isArray(data[key]) ? data[key] : base[key];
  }

  // 旧版派生统计字段已改为路由实时计算，规范化时不再保留其历史缓存。
  delete normalized.stats;
  delete normalized.dashboardCards;
  delete normalized.accessTrend;
  delete normalized.riskData;

  return normalized;
}

// 将历史时间文本统一成 YYYY-MM-DD HH:mm:ss，兼容仅时间、缺少秒、今日/昨日和“刚刚”等格式。
function normalizeDateTimeText(value) {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return value;
  // 仅时间和相对日期属于旧演示数据，使用固定演示日期补齐以便统一查询。
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return `2026-06-11 ${text}`;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) return text.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) return `${text.replace("T", " ")}:00`;

  const relative = text.match(/^(今日|昨日|昨天)\s+(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (relative) {
    const date = relative[1] === "今日" ? "2026-06-11" : "2026-06-10";
    return `${date} ${relative[2]}:${relative[3] || "00"}`;
  }

  // “刚刚”按上海当前时间转换为完整时间文本。
  if (text === "刚刚") {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  }

  return value;
}

// 批量规范化一个对象的指定时间字段，并返回是否发生过实际变更。
function normalizeDateTimeFields(item, fields) {
  let changed = false;
  for (const field of fields) {
    const next = normalizeDateTimeText(item?.[field]);
    if (next !== item?.[field]) {
      item[field] = next;
      changed = true;
    }
  }
  return changed;
}

// 以下常量集中描述旧版本中的业务名称，迁移时用于替换已经废弃的二维码次数和临时授权概念。
const legacyQrCountLimitType = "\u4e8c\u7ef4\u7801\u6b21\u6570\u8d85\u9650";
const legacyQrMaxUseReason = "\u8bbf\u5ba2\u4e8c\u7ef4\u7801\u5df2\u8fbe\u5230\u6700\u5927\u4f7f\u7528\u6b21\u6570";
const legacyTimesUsedUpText = "\u6b21\u6570\u7528\u5c3d";
const legacyOrTimesUsedUpText = "\u6216\u6b21\u6570\u7528\u5c3d";
const legacyTemporaryAuthMethod = "\u4e34\u65f6\u6388\u6743";
const manualReleaseMethod = "人工核验后放行";
// 为旧版打码黑名单演示记录补回完整凭证，确保新版本能够执行精确匹配。
const legacyBlacklistCredentialsById = new Map([
  ["B20260611001", "340100199001019090"],
  ["B20260611003", "340100199002028080"],
  ["B20260611005", "340100199003037070"],
  ["B20260611007", "340100199004046060"],
  ["B20260611009", "340100199005055050"],
  ["B20260611011", "340100199006064040"]
]);

// 将文本中旧“临时授权”名称统一替换为当前“人工核验后放行”。
function replaceLegacyTemporaryAuthText(value) {
  return String(value || "").replaceAll(legacyTemporaryAuthMethod, manualReleaseMethod);
}

// 从通行方式数组或分隔文本中移除已经废弃的临时授权方式。
function removeLegacyTemporaryAuthMethod(value) {
  const methods = listValue(value).filter((item) => item !== legacyTemporaryAuthMethod);
  return Array.isArray(value) ? methods : methods.join("、");
}

// 对加载的数据执行幂等历史迁移，统一密码、时间、状态、关联 ID 和已经变更的业务概念。
function migrateData(data) {
  // 迁移函数累计 changed 标记，调用方据此决定是否需要把结果重新写回 MySQL。
  let changed = false;
  data.sessions ||= [];

  // 旧版非哈希密码自动升级为当前 PBKDF2 格式。
  for (const user of data.users || []) {
    if (needsPasswordRehash(user.password)) {
      user.password = hashPassword(user.password);
      changed = true;
    }
  }

  // 预约迁移统一时间和审核状态，并尽量补齐被访人、访客的稳定人员 ID。
  for (const appointment of data.appointments || []) {
    changed = normalizeDateTimeFields(appointment, ["time", "visitStart", "visitEnd", "createdAt", "reviewedAt"]) || changed;

    if (appointment.status === "待审核") {
      appointment.status = "待被访人审核";
      changed = true;
    }

    if (appointment.hostId && !(data.people || []).some((person) => person.id === appointment.hostId)) {
      appointment.hostId = null;
      changed = true;
    }

    if (!appointment.visitorId) {
      const visitor = (data.people || []).find((person) =>
        person.role === "visitor"
        && (person.phone === appointment.visitorPhone || person.name === appointment.visitor)
      );
      if (visitor) {
        appointment.visitorId = visitor.id;
        changed = true;
      }
    }
  }

  // 通行记录统一时间，并替换废弃的临时授权方式名称。
  for (const record of data.accessRecords || []) {
    changed = normalizeDateTimeFields(record, ["time"]) || changed;
    if (record.method === legacyTemporaryAuthMethod) {
      record.method = manualReleaseMethod;
      changed = true;
    }
  }

  // 异常记录及其动作统一时间，同时迁移旧二维码异常名称、原因和处置建议。
  for (const exception of data.exceptions || []) {
    changed = normalizeDateTimeFields(exception, ["time", "handledAt"]) || changed;
    for (const action of exception.actions || []) {
      changed = normalizeDateTimeFields(action, ["createdAt"]) || changed;
    }
    if (exception.type === legacyQrCountLimitType) {
      exception.type = "二维码状态异常";
      changed = true;
    }
    if (exception.reason === legacyQrMaxUseReason) {
      exception.reason = "二维码不在有效时间内或状态不可用";
      changed = true;
    }
    if (String(exception.suggestion || "").includes("补发二维码")) {
      exception.suggestion = "联系被访人确认来访信息，确认前拒绝自动通行。";
      changed = true;
    }
    if (String(exception.suggestion || "").includes(legacyTemporaryAuthMethod)) {
      exception.suggestion = replaceLegacyTemporaryAuthText(exception.suggestion);
      changed = true;
    }
  }

  // 校门处于维护状态时，关联设备也必须同步显示维护中。
  const gateStatusByName = new Map((data.gates || []).map((gate) => [gate.name, gate.status]));
  for (const device of data.devices || []) {
    if (gateStatusByName.get(device.gate) === "维护中" && device.status !== "维护中") {
      device.status = "维护中";
      changed = true;
    }
  }

  // 统一车辆最近通行、人脸更新时间和二维码有效期等凭证时间。
  for (const vehicle of data.vehicles || []) {
    changed = normalizeDateTimeFields(vehicle, ["lastAccess"]) || changed;
  }

  for (const face of data.faces || []) {
    changed = normalizeDateTimeFields(face, ["updatedAt"]) || changed;
  }

  // 二维码不再限制使用次数，并通过预约或姓名尽量补齐 ownerId、visitorId。
  for (const qrCode of data.qrCodes || []) {
    changed = normalizeDateTimeFields(qrCode, ["validFrom", "validTo"]) || changed;
    if (qrCode.maxUses !== undefined && qrCode.maxUses !== 0) {
      qrCode.maxUses = 0;
      changed = true;
    }
    if (qrCode.usedCount !== undefined && qrCode.usedCount !== 0) {
      qrCode.usedCount = 0;
      changed = true;
    }

    if (!qrCode.ownerId && qrCode.appointmentId) {
      const appointment = (data.appointments || []).find((item) => item.id === qrCode.appointmentId);
      if (appointment?.visitorId) {
        qrCode.ownerId = appointment.visitorId;
        qrCode.visitorId = appointment.visitorId;
        changed = true;
      }
    }

    if (!qrCode.ownerId) {
      const person = (data.people || []).find((item) => item.name === qrCode.ownerName);
      if (person) {
        qrCode.ownerId = person.id;
        if (qrCode.type === "visitor") qrCode.visitorId = person.id;
        changed = true;
      }
    }
  }

  // 通行规则移除旧 maxUses 和临时授权，并用种子规则补齐缺少的方法、校门、时段或状态。
  const defaultAccessRules = new Map((seedData.accessRules || []).map((rule) => [rule.id, rule]));
  for (const rule of data.accessRules || []) {
    if (rule.maxUses !== undefined && rule.maxUses !== null && rule.maxUses !== "") {
      delete rule.maxUses;
      changed = true;
    }
    if (listValue(rule.methods).includes(legacyTemporaryAuthMethod)) {
      rule.methods = removeLegacyTemporaryAuthMethod(rule.methods);
      changed = true;
    }
    const fallback = defaultAccessRules.get(rule.id);
    if (fallback) {
      if (!listValue(rule.methods).length && listValue(fallback.methods).length) {
        rule.methods = listValue(fallback.methods);
        changed = true;
      }
      if (!listValue(rule.gates).length && listValue(fallback.gates).length) {
        rule.gates = listValue(fallback.gates);
        changed = true;
      }
      if (!rule.allowedTime && fallback.allowedTime) {
        rule.allowedTime = fallback.allowedTime;
        changed = true;
      }
      if (!rule.status && fallback.status) {
        rule.status = fallback.status;
        changed = true;
      }
    }
  }

  // 黑名单统一审计时间，并为已知历史演示记录恢复完整凭证。
  for (const item of data.blacklist || []) {
    changed = normalizeDateTimeFields(item, ["createdAt", "removedAt"]) || changed;
    const fullCredential = legacyBlacklistCredentialsById.get(item.id);
    if (fullCredential && String(item.credentialNo || "").includes("*")) {
      item.credentialNo = fullCredential;
      changed = true;
    }
  }

  // 公告统一时间，同时删除旧版二维码“次数用尽”文案。
  for (const message of data.messages || []) {
    changed = normalizeDateTimeFields(message, ["createdAt"]) || changed;
    if (String(message.content || "").includes(legacyTimesUsedUpText)) {
      message.content = message.content.replace(legacyOrTimesUsedUpText, "");
      changed = true;
    }
  }

  // 最后统一系统日志时间，并返回本次迁移是否改变过任意数据。
  for (const log of data.logs || []) {
    changed = normalizeDateTimeFields(log, ["time"]) || changed;
  }

  return changed;
}

// 使用不指定具体数据库的临时连接创建业务数据库，确保首次启动无需手工建库。
async function ensureDatabase() {
  // 这里只连接 MySQL 服务本身，因为目标数据库此时可能尚不存在。
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });

  try {
    // utf8mb4 支持完整 Unicode 字符，unicode_ci 排序规则适合中英文业务文本。
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`
       DEFAULT CHARACTER SET utf8mb4
       DEFAULT COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    // 无论建库成功与否都关闭临时连接，避免连接资源泄漏。
    await connection.end();
  }
}

// 创建系统所需关系表，并对已有数据库补充新版本字段和字段长度。
async function ensureSchema() {
  // 所有建表语句都使用 IF NOT EXISTS，因此该过程可在每次启动时安全重复执行。
  const statements = [
    // 角色字典与角色默认档案。
    `CREATE TABLE IF NOT EXISTS roles (
      role_key VARCHAR(32) NOT NULL PRIMARY KEY,
      label VARCHAR(64) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS role_profiles (
      role_key VARCHAR(32) NOT NULL PRIMARY KEY,
      person_id VARCHAR(64),
      name VARCHAR(128),
      title VARCHAR(255),
      role_value VARCHAR(32),
      type VARCHAR(64),
      avatar VARCHAR(512),
      status VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // 登录账号与人员主档案。
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      username VARCHAR(128) NOT NULL UNIQUE,
      account_type VARCHAR(64),
      password VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL,
      person_id VARCHAR(64),
      status VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS people (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      type VARCHAR(64),
      code VARCHAR(128),
      id_number VARCHAR(64),
      role VARCHAR(32),
      college VARCHAR(128),
      class_name VARCHAR(128),
      phone VARCHAR(32),
      face_status VARCHAR(64),
      status VARCHAR(64),
      department VARCHAR(128),
      position VARCHAR(128),
      host VARCHAR(128),
      company VARCHAR(255),
      graduation_year VARCHAR(32),
      major VARCHAR(255),
      gate VARCHAR(128),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // 通行记录、访客预约和异常事件三类核心业务流水。
    `CREATE TABLE IF NOT EXISTS access_records (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      time VARCHAR(64),
      name VARCHAR(128),
      person_id VARCHAR(64),
      type VARCHAR(64),
      method VARCHAR(128),
      gate VARCHAR(128),
      status VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      visitor VARCHAR(128),
      visitor_id VARCHAR(64),
      visitor_phone VARCHAR(32),
      id_number VARCHAR(64),
      host VARCHAR(128),
      host_id VARCHAR(64),
      time VARCHAR(64),
      visit_start VARCHAR(64),
      visit_end VARCHAR(64),
      reason TEXT,
      status VARCHAR(64),
      created_at VARCHAR(64),
      reviewed_at VARCHAR(64),
      reviewer VARCHAR(128),
      review_comment TEXT,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS exceptions (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      time VARCHAR(64),
      person VARCHAR(128),
      person_type VARCHAR(64),
      gate VARCHAR(128),
      method VARCHAR(128),
      type VARCHAR(128),
      reason TEXT,
      risk VARCHAR(64),
      status VARCHAR(64),
      suggestion TEXT,
      handler VARCHAR(128),
      handled_at VARCHAR(64),
      note TEXT,
      actions TEXT,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // 门禁设备、车辆、人脸和二维码等通行凭证相关表。
    `CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128),
      type VARCHAR(64),
      gate VARCHAR(128),
      status VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      owner_id VARCHAR(64),
      owner_name VARCHAR(128),
      plate_no VARCHAR(64),
      status VARCHAR(64),
      last_access VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS faces (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      person_id VARCHAR(64),
      person_name VARCHAR(128),
      status VARCHAR(64),
      file_name VARCHAR(255),
      image_url LONGTEXT,
      slot_key VARCHAR(32),
      label VARCHAR(128),
      updated_at VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS qr_codes (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      token VARCHAR(191) NOT NULL UNIQUE,
      type VARCHAR(32),
      owner_name VARCHAR(128),
      owner_id VARCHAR(64),
      visitor_id VARCHAR(64),
      appointment_id VARCHAR(64),
      valid_from VARCHAR(64),
      valid_to VARCHAR(64),
      status VARCHAR(64),
      max_uses INT NOT NULL DEFAULT 1,
      used_count INT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // 全局参数、校门和角色通行规则配置表。
    `CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(32) NOT NULL PRIMARY KEY,
      gate_open_time VARCHAR(32),
      gate_close_time VARCHAR(32),
      visitor_qr_minutes INT,
      alumni_qr_minutes INT,
      face_threshold DECIMAL(5,2),
      high_risk_auto_block TINYINT(1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS gates (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128),
      campus VARCHAR(128),
      location VARCHAR(255),
      open_time VARCHAR(64),
      status VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS access_rules (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      role VARCHAR(32),
      methods TEXT,
      allowed_time VARCHAR(128),
      gates TEXT,
      max_uses VARCHAR(64),
      status VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    // 黑名单、系统日志、公告消息和登录会话等安全审计表。
    `CREATE TABLE IF NOT EXISTS blacklist (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      name VARCHAR(128),
      type VARCHAR(128),
      credential_no VARCHAR(128),
      reason TEXT,
      status VARCHAR(64),
      created_at VARCHAR(64),
      removed_at VARCHAR(64),
      removed_reason TEXT,
      removed_by VARCHAR(128),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS logs (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      time VARCHAR(64),
      actor VARCHAR(128),
      role VARCHAR(64),
      action VARCHAR(255),
      target VARCHAR(255),
      result VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      title VARCHAR(255),
      content TEXT,
      target_role VARCHAR(255),
      read_flag TINYINT(1),
      created_at VARCHAR(64),
      sort_order INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token VARCHAR(128) NOT NULL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      role VARCHAR(32),
      created_at VARCHAR(64),
      expires_at VARCHAR(64)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  ];

  // 顺序执行全部建表语句，保证后续字段升级和数据读取时表一定存在。
  for (const statement of statements) {
    await pool.query(statement);
  }

  // 调整历史字段类型，并通过 addColumn 幂等补充后续版本新增字段。
  await pool.query("ALTER TABLE access_rules MODIFY max_uses VARCHAR(64)");
  await pool.query("ALTER TABLE messages MODIFY target_role VARCHAR(255)");
  await addColumn("faces", "image_url", "LONGTEXT");
  await addColumn("faces", "slot_key", "VARCHAR(32)");
  await addColumn("faces", "label", "VARCHAR(128)");
  await addColumn("blacklist", "removed_at", "VARCHAR(64)");
  await addColumn("blacklist", "removed_reason", "TEXT");
  await addColumn("blacklist", "removed_by", "VARCHAR(128)");
}

// 查询 information_schema，判断旧版单表 JSON 存储是否仍然存在。
async function legacyTableExists() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [dbConfig.database, dbConfig.legacyTable]
  );
  return Number(rows[0]?.count || 0) > 0;
}

// 从旧版 app_state 类表读取主 JSON 状态；不存在表或主记录时返回 null。
async function readLegacyState() {
  if (!(await legacyTableExists())) return null;

  const [rows] = await pool.query(
    `SELECT data FROM \`${dbConfig.legacyTable}\` WHERE id = ? LIMIT 1`,
    ["main"]
  );
  if (!rows.length) return null;
  return typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
}

// 查询 information_schema，判断指定数据表是否已经具备某一列。
async function columnExists(tableName, columnName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [dbConfig.database, tableName, columnName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

// 仅在列不存在时执行 ALTER TABLE，保证数据库升级过程可重复运行。
async function addColumn(tableName, columnName, definition) {
  if (await columnExists(tableName, columnName)) return;
  await pool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
}

// 查询当前数据库是否已经存在指定名称的表约束。
async function constraintExists(name) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.table_constraints
     WHERE table_schema = ? AND constraint_name = ?`,
    [dbConfig.database, name]
  );
  return Number(rows[0]?.count || 0) > 0;
}

// 幂等添加外键；历史脏数据导致添加失败时记录警告，但不阻止整个服务启动。
async function addForeignKey(name, sql) {
  if (await constraintExists(name)) return;
  try {
    await pool.query(sql);
  } catch (error) {
    console.warn(`Skipping foreign key ${name}: ${error.message}`);
  }
}

// 为账号、会话、凭证、通行记录和预约等实体建立主要关联外键及删除行为。
async function ensureForeignKeys() {
  // 账号删除人员时保留账号并置空 person_id；删除账号时级联清理会话。
  await addForeignKey(
    "fk_users_person",
    "ALTER TABLE users ADD CONSTRAINT fk_users_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "fk_sessions_user",
    "ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "fk_faces_person",
    "ALTER TABLE faces ADD CONSTRAINT fk_faces_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE"
  );
  // 人脸随人员级联删除，车辆和通行记录则在人员删除后保留业务记录并置空关联。
  await addForeignKey(
    "fk_vehicles_owner",
    "ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "fk_records_person",
    "ALTER TABLE access_records ADD CONSTRAINT fk_records_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  // 预约的访客和被访人删除后保留预约事实，仅将关联 ID 置空。
  await addForeignKey(
    "fk_appointments_visitor",
    "ALTER TABLE appointments ADD CONSTRAINT fk_appointments_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "fk_appointments_host",
    "ALTER TABLE appointments ADD CONSTRAINT fk_appointments_host FOREIGN KEY (host_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  // 二维码对所属人、访客和预约均采用 SET NULL，避免删除主体时丢失历史凭证记录。
  await addForeignKey(
    "fk_qr_owner",
    "ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "fk_qr_visitor",
    "ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "fk_qr_appointment",
    "ALTER TABLE qr_codes ADD CONSTRAINT fk_qr_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL"
  );
}

// 以 users 表是否存在记录判断关系库是否已经完成过业务数据初始化。
async function relationalHasData() {
  const [rows] = await pool.query("SELECT COUNT(*) AS count FROM users");
  return Number(rows[0]?.count || 0) > 0;
}

// 并行读取全部关系表，并转换回路由层使用的统一驼峰业务对象结构。
async function readAllFromDatabase() {
  // Promise.all 同时发起独立 SELECT，缩短服务启动时读取完整快照的等待时间。
  const [
    [roleRows],
    [profileRows],
    [userRows],
    [peopleRows],
    [recordRows],
    [appointmentRows],
    [exceptionRows],
    [deviceRows],
    [vehicleRows],
    [faceRows],
    [qrRows],
    [settingRows],
    [gateRows],
    [ruleRows],
    [blacklistRows],
    [logRows],
    [messageRows],
    [sessionRows]
  ] = await Promise.all([
    pool.query("SELECT role_key AS roleKey, label FROM roles ORDER BY role_key"),
    pool.query("SELECT role_key AS roleKey, person_id AS personId, name, title, role_value AS role, type, avatar, status FROM role_profiles ORDER BY role_key"),
    pool.query("SELECT id, username, account_type AS accountType, password, role, person_id AS personId, status FROM users ORDER BY sort_order, id"),
    pool.query(`SELECT id, name, type, code, id_number AS idNumber, role, college, class_name AS className,
      phone, face_status AS faceStatus, status, department, position, host, company,
      graduation_year AS graduationYear, major, gate FROM people ORDER BY sort_order, id`),
    pool.query("SELECT id, time, name, person_id AS personId, type, method, gate, status FROM access_records ORDER BY sort_order, id"),
    pool.query(`SELECT id, visitor, visitor_id AS visitorId, visitor_phone AS visitorPhone,
      id_number AS idNumber, host, host_id AS hostId, time, visit_start AS visitStart,
      visit_end AS visitEnd, reason, status, created_at AS createdAt, reviewed_at AS reviewedAt,
      reviewer, review_comment AS reviewComment FROM appointments ORDER BY sort_order, id`),
    pool.query(`SELECT id, time, person, person_type AS personType, gate, method, type, reason,
      risk, status, suggestion, handler, handled_at AS handledAt, note, actions
      FROM exceptions ORDER BY sort_order, id`),
    pool.query("SELECT id, name, type, gate, status FROM devices ORDER BY sort_order, id"),
    pool.query("SELECT id, owner_id AS ownerId, owner_name AS ownerName, plate_no AS plateNo, status, last_access AS lastAccess FROM vehicles ORDER BY sort_order, id"),
    pool.query("SELECT id, person_id AS personId, person_name AS personName, status, file_name AS fileName, image_url AS imageUrl, slot_key AS slot, label, updated_at AS updatedAt FROM faces ORDER BY sort_order, id"),
    pool.query(`SELECT id, token, type, owner_name AS ownerName, owner_id AS ownerId,
      visitor_id AS visitorId, appointment_id AS appointmentId, valid_from AS validFrom,
      valid_to AS validTo, status
      FROM qr_codes ORDER BY sort_order, id`),
    pool.query("SELECT gate_open_time AS gateOpenTime, gate_close_time AS gateCloseTime, visitor_qr_minutes AS visitorQrMinutes, alumni_qr_minutes AS alumniQrMinutes, face_threshold AS faceThreshold, high_risk_auto_block AS highRiskAutoBlock FROM settings WHERE id = 'main' LIMIT 1"),
    pool.query("SELECT id, name, campus, location, open_time AS openTime, status FROM gates ORDER BY sort_order, id"),
    pool.query("SELECT id, role, methods, allowed_time AS allowedTime, gates, status FROM access_rules ORDER BY sort_order, id"),
    pool.query(`SELECT id, name, type, credential_no AS credentialNo, reason, status, created_at AS createdAt,
      removed_at AS removedAt, removed_reason AS removedReason, removed_by AS removedBy
      FROM blacklist ORDER BY sort_order, id`),
    pool.query("SELECT id, time, actor, role, action, target, result FROM logs ORDER BY sort_order, id"),
    pool.query("SELECT id, title, content, target_role AS targetRole, read_flag AS `read`, created_at AS createdAt FROM messages ORDER BY sort_order, id"),
    pool.query("SELECT token, user_id AS userId, role, created_at AS createdAt, expires_at AS expiresAt FROM sessions ORDER BY created_at DESC")
  ]);

  // 将角色行和角色档案行还原为以 roleKey 为键的对象。
  const roles = Object.fromEntries(roleRows.map((row) => [row.roleKey, row.label]));
  const roleProfiles = Object.fromEntries(profileRows.map((row) => [row.roleKey, {
    personId: row.personId,
    name: row.name,
    title: row.title,
    role: row.role || row.roleKey,
    type: row.type,
    avatar: row.avatar,
    status: row.status
  }]));
  // JSON 文本、数值和布尔字段在装配时恢复类型，最后再经过 normalizeData 完整补齐。
  return normalizeData({
    roles,
    roleProfiles,
    users: userRows,
    people: peopleRows,
    accessRecords: recordRows,
    appointments: appointmentRows,
    exceptions: exceptionRows.map((row) => ({
      ...row,
      actions: parseJson(row.actions, [])
    })),
    devices: deviceRows,
    vehicles: vehicleRows,
    faces: faceRows,
    qrCodes: qrRows,
    settings: settingRows[0] ? {
      ...settingRows[0],
      faceThreshold: Number(settingRows[0].faceThreshold),
      highRiskAutoBlock: Boolean(settingRows[0].highRiskAutoBlock)
    } : {},
    gates: gateRows,
    accessRules: ruleRows.map((row) => ({
      ...row,
      methods: parseJson(row.methods, []),
      gates: parseJson(row.gates, [])
    })),
    blacklist: blacklistRows,
    logs: logRows,
    messages: messageRows.map((row) => ({
      ...row,
      read: Boolean(row.read)
    })),
    sessions: sessionRows
  });
}

// 将内存状态的顶层字段映射到对应关系表，用于只持久化本次真正发生变化的数据域。
const topLevelTableMap = {
  roles: ["roles"],
  roleProfiles: ["role_profiles"],
  users: ["users"],
  people: ["people"],
  accessRecords: ["access_records"],
  appointments: ["appointments"],
  exceptions: ["exceptions"],
  devices: ["devices"],
  vehicles: ["vehicles"],
  faces: ["faces"],
  qrCodes: ["qr_codes"],
  settings: ["settings"],
  gates: ["gates"],
  accessRules: ["access_rules"],
  blacklist: ["blacklist"],
  logs: ["logs"],
  messages: ["messages"],
  sessions: ["sessions"]
};

// 通过 JSON 结构比较找出更新前后发生变化的顶层数据字段。
function changedTopLevelKeys(previous, next) {
  return Object.keys(topLevelTableMap).filter((key) => {
    return JSON.stringify(previous?.[key]) !== JSON.stringify(next?.[key]);
  });
}

// 把变化字段集合转换为去重后的数据库表集合。
function tablesForTopLevelKeys(keys) {
  return new Set(keys.flatMap((key) => topLevelTableMap[key] || []));
}

// 按表清单的逆序清空选中表，降低父子表依赖顺序引发约束冲突的风险。
async function clearRelationalTables(connection, tables = tableNames) {
  const selected = new Set(tables);
  for (const table of [...tableNames].reverse().filter((item) => selected.has(item))) {
    await connection.query(`DELETE FROM \`${table}\``);
  }
}

// 使用统一映射函数逐行执行参数化 INSERT，并把数组索引提供给 sort_order 等字段。
async function insertRows(connection, sql, rows, mapper) {
  for (const [index, row] of rows.entries()) {
    await connection.query(sql, mapper(row, index));
  }
}

// 在单个数据库事务中重写指定关系表，确保内存快照与各表内容整体一致。
async function writeAllToDatabase(data, tables = tableNames) {
  // 写入前再次规范化数据；selectedTables 决定本次最小持久化范围。
  const normalized = normalizeData(data);
  const connection = await pool.getConnection();
  const selectedTables = new Set(tables);
  const shouldWrite = (table) => selectedTables.has(table);

  try {
    // 开启事务并暂时关闭外键检查，再清空本次变化的表准备完整重写。
    await connection.beginTransaction();
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    await clearRelationalTables(connection, selectedTables);

    // 写入角色字典和角色默认档案。
    if (shouldWrite("roles")) {
    await insertRows(
      connection,
      "INSERT INTO roles (role_key, label) VALUES (?, ?)",
      Object.entries(normalized.roles),
      ([role, label]) => [role, label]
    );
    }
    if (shouldWrite("role_profiles")) {
    await insertRows(
      connection,
      `INSERT INTO role_profiles (role_key, person_id, name, title, role_value, type, avatar, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      Object.entries(normalized.roleProfiles),
      ([role, profile]) => [
        role,
        valueOrNull(profile.personId),
        valueOrNull(profile.name),
        valueOrNull(profile.title),
        valueOrNull(profile.role || role),
        valueOrNull(profile.type),
        valueOrNull(profile.avatar),
        valueOrNull(profile.status)
      ]
    );
    }
    // 写入登录账号和人员档案，sort_order 保存内存数组的展示顺序。
    if (shouldWrite("users")) {
    await insertRows(
      connection,
      `INSERT INTO users (id, username, account_type, password, role, person_id, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.users,
      (user, index) => [user.id, user.username, user.accountType, user.password, user.role, user.personId, user.status, index]
    );
    }
    if (shouldWrite("people")) {
    await insertRows(
      connection,
      `INSERT INTO people (id, name, type, code, id_number, role, college, class_name, phone, face_status,
        status, department, position, host, company, graduation_year, major, gate, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.people,
      (person, index) => [
        person.id,
        person.name,
        valueOrNull(person.type),
        valueOrNull(person.code),
        valueOrNull(person.idNumber),
        valueOrNull(person.role),
        valueOrNull(person.college),
        valueOrNull(person.className),
        valueOrNull(person.phone),
        valueOrNull(person.faceStatus),
        valueOrNull(person.status),
        valueOrNull(person.department),
        valueOrNull(person.position),
        valueOrNull(person.host),
        valueOrNull(person.company),
        valueOrNull(person.graduationYear),
        valueOrNull(person.major),
        valueOrNull(person.gate),
        index
      ]
    );
    }
    // 写入通行记录、预约和异常事件；可空关联字段统一转换为 SQL NULL。
    if (shouldWrite("access_records")) {
    await insertRows(
      connection,
      `INSERT INTO access_records (id, time, name, person_id, type, method, gate, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.accessRecords,
      (item, index) => [item.id, item.time, item.name, valueOrNull(item.personId), item.type, item.method, item.gate, item.status, index]
    );
    }
    if (shouldWrite("appointments")) {
    await insertRows(
      connection,
      `INSERT INTO appointments (id, visitor, visitor_id, visitor_phone, id_number, host, host_id, time,
        visit_start, visit_end, reason, status, created_at, reviewed_at, reviewer, review_comment, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.appointments,
      (item, index) => [
        item.id,
        valueOrNull(item.visitor),
        valueOrNull(item.visitorId),
        valueOrNull(item.visitorPhone),
        valueOrNull(item.idNumber),
        valueOrNull(item.host),
        valueOrNull(item.hostId),
        valueOrNull(item.time),
        valueOrNull(item.visitStart),
        valueOrNull(item.visitEnd),
        valueOrNull(item.reason),
        valueOrNull(item.status),
        valueOrNull(item.createdAt),
        valueOrNull(item.reviewedAt),
        valueOrNull(item.reviewer),
        valueOrNull(item.reviewComment),
        index
      ]
    );
    }
    if (shouldWrite("exceptions")) {
    await insertRows(
      connection,
      `INSERT INTO exceptions (id, time, person, person_type, gate, method, type, reason, risk, status,
        suggestion, handler, handled_at, note, actions, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.exceptions,
      (item, index) => [
        item.id,
        valueOrNull(item.time),
        valueOrNull(item.person),
        valueOrNull(item.personType),
        valueOrNull(item.gate),
        valueOrNull(item.method),
        valueOrNull(item.type),
        valueOrNull(item.reason),
        valueOrNull(item.risk),
        valueOrNull(item.status),
        valueOrNull(item.suggestion),
        valueOrNull(item.handler),
        valueOrNull(item.handledAt),
        valueOrNull(item.note),
        JSON.stringify(item.actions || []),
        index
      ]
    );
    }
    // 写入设备、车辆、人脸照片和二维码凭证数据。
    if (shouldWrite("devices")) {
    await insertRows(
      connection,
      "INSERT INTO devices (id, name, type, gate, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      normalized.devices,
      (item, index) => [item.id, item.name, item.type, item.gate, item.status, index]
    );
    }
    if (shouldWrite("vehicles")) {
    await insertRows(
      connection,
      "INSERT INTO vehicles (id, owner_id, owner_name, plate_no, status, last_access, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      normalized.vehicles,
      (item, index) => [item.id, valueOrNull(item.ownerId), item.ownerName, item.plateNo, item.status, item.lastAccess, index]
    );
    }
    if (shouldWrite("faces")) {
    await insertRows(
      connection,
      "INSERT INTO faces (id, person_id, person_name, status, file_name, image_url, slot_key, label, updated_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      normalized.faces,
      (item, index) => [item.id, item.personId, item.personName, item.status, item.fileName, valueOrNull(item.imageUrl), valueOrNull(item.slot || "primary"), valueOrNull(item.label), item.updatedAt, index]
    );
    }
    if (shouldWrite("qr_codes")) {
    await insertRows(
      connection,
      `INSERT INTO qr_codes (id, token, type, owner_name, owner_id, visitor_id, appointment_id,
        valid_from, valid_to, status, max_uses, used_count, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.qrCodes,
      (item, index) => [
        item.id,
        item.token,
        item.type,
        item.ownerName,
        valueOrNull(item.ownerId),
        valueOrNull(item.visitorId),
        valueOrNull(item.appointmentId),
        item.validFrom,
        item.validTo,
        item.status,
        Number(item.maxUses ?? 0),
        Number(item.usedCount ?? 0),
        index
      ]
    );
    }
    // 全局 settings 只有一条 main 记录，直接执行单行插入。
    if (shouldWrite("settings")) {
    await connection.query(
      `INSERT INTO settings (id, gate_open_time, gate_close_time, visitor_qr_minutes,
        alumni_qr_minutes, face_threshold, high_risk_auto_block)
       VALUES ('main', ?, ?, ?, ?, ?, ?)`,
      [
        normalized.settings.gateOpenTime,
        normalized.settings.gateCloseTime,
        normalized.settings.visitorQrMinutes,
        normalized.settings.alumniQrMinutes,
        normalized.settings.faceThreshold,
        normalized.settings.highRiskAutoBlock ? 1 : 0
      ]
    );
    }
    // 写入校门和角色通行规则，规则的 methods、gates 数组以 JSON 文本保存。
    if (shouldWrite("gates")) {
    await insertRows(
      connection,
      "INSERT INTO gates (id, name, campus, location, open_time, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      normalized.gates,
      (item, index) => [item.id, item.name, item.campus, item.location, item.openTime, item.status, index]
    );
    }
    if (shouldWrite("access_rules")) {
    await insertRows(
      connection,
      "INSERT INTO access_rules (id, role, methods, allowed_time, gates, max_uses, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      normalized.accessRules,
      (item, index) => [
        item.id,
        item.role,
        JSON.stringify(item.methods || []),
        item.allowedTime,
        JSON.stringify(item.gates || []),
        valueOrNull(item.maxUses),
        item.status,
        index
      ]
    );
    }
    // 写入黑名单及其移出审计信息。
    if (shouldWrite("blacklist")) {
    await insertRows(
      connection,
      `INSERT INTO blacklist (id, name, type, credential_no, reason, status, created_at,
        removed_at, removed_reason, removed_by, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      normalized.blacklist,
      (item, index) => [
        item.id,
        item.name,
        item.type,
        item.credentialNo,
        item.reason,
        item.status,
        item.createdAt,
        valueOrNull(item.removedAt),
        valueOrNull(item.removedReason),
        valueOrNull(item.removedBy),
        index
      ]
    );
    }
    // 写入系统日志、公告消息和登录会话。
    if (shouldWrite("logs")) {
    await insertRows(
      connection,
      "INSERT INTO logs (id, time, actor, role, action, target, result, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      normalized.logs,
      (item, index) => [item.id, item.time, item.actor, item.role, item.action, item.target, item.result, index]
    );
    }
    if (shouldWrite("messages")) {
    await insertRows(
      connection,
      "INSERT INTO messages (id, title, content, target_role, read_flag, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
      normalized.messages,
      (item, index) => [item.id, item.title, item.content, item.targetRole, item.read ? 1 : 0, item.createdAt, index]
    );
    }
    if (shouldWrite("sessions")) {
    await insertRows(
      connection,
      "INSERT INTO sessions (token, user_id, role, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
      normalized.sessions,
      (item) => [item.token, item.userId, item.role, item.createdAt, item.expiresAt]
    );
    }

    // 所有表写入成功后恢复外键检查并一次性提交事务。
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");
    await connection.commit();
  } catch (error) {
    // 任意写入失败时尽力恢复外键检查、回滚全部修改，并把原错误继续抛给调用方。
    await connection.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    await connection.rollback();
    throw error;
  } finally {
    // 无论提交或回滚都归还连接池连接。
    connection.release();
  }
}

// 初始化数据层：建库、建表、创建连接池、加载或导入数据、执行迁移并补充外键。
export async function initStore() {
  // 数据库必须先创建，随后才能让连接池指定该数据库。
  await ensureDatabase();
  pool = mysql.createPool({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4"
  });
  await ensureSchema();

  // 已初始化的关系库直接读取；空库则优先导入旧状态，否则写入种子数据。
  if (await relationalHasData()) {
    cache = await readAllFromDatabase();
  } else {
    cache = normalizeData((await readLegacyState()) || seedData);
    migrateData(cache);
    await writeAllToDatabase(cache);
  }

  // 无论数据来自何处都再执行一次幂等迁移，确有变化时完整持久化。
  const migrated = migrateData(cache);
  if (migrated) {
    await writeAllToDatabase(cache);
  }

  // 数据清理和迁移完成后再建立外键，可降低历史脏数据造成的初始化失败。
  await ensureForeignKeys();

  return cache;
}

// 返回当前只读用途的内存数据快照；服务未初始化时明确抛出错误。
export function getData() {
  if (!cache) {
    throw new Error("Store has not been initialized.");
  }

  return cache;
}

// 串行执行一次数据更新：复制快照、运行修改器、检测变化、事务持久化并替换缓存。
export async function updateData(mutator) {
  if (!cache) {
    throw new Error("Store has not been initialized.");
  }

  // 新操作挂到前一写操作之后，确保所有修改都基于最新已提交缓存。
  const operation = writeQueue.then(async () => {
    // mutator 只接触深拷贝草稿，失败时不会污染当前 cache。
    const draft = clone(cache);
    const result = await mutator(draft);
    const next = normalizeData(draft);
    const changedKeys = changedTopLevelKeys(cache, next);
    // 仅重写实际变化的顶层数据所对应的表，减少无关数据库写入。
    if (changedKeys.length) {
      await writeAllToDatabase(next, tablesForTopLevelKeys(changedKeys));
    }
    // 数据库写入成功后才发布新缓存，保证缓存与持久层一致。
    cache = next;
    return result ?? cache;
  });

  // 队列尾部吞掉拒绝仅用于保证后续操作仍能排队；当前 operation 的错误仍会返回给调用者。
  writeQueue = operation.catch(() => {});
  return operation;
}

// 返回不包含密码的可读 MySQL 数据位置描述，供健康检查展示。
export function getDataFilePath() {
  return `mysql://${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database} (${tableNames.length} relational tables)`;
}

// 返回结构化存储元信息，包括类型、地址、数据库名、旧表名和关系表清单。
export function getStoreInfo() {
  return {
    type: "mysql-relational",
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    legacyTable: dbConfig.legacyTable,
    tables: tableNames,
    user: dbConfig.user
  };
}
