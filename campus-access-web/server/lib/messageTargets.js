// 本模块负责公告接收角色的标准化、序列化、视图补充和可见性判断。
// 公告只允许面向全体或系统已定义的六类用户角色。
export const messageTargetValues = new Set([
  "all",
  "student",
  "teacher",
  "visitor",
  "alumni",
  "guard",
  "admin"
]);

// 将数组、JSON 字符串或逗号分隔字符串统一转换为去重后的合法角色数组。
export function normalizeMessageTargets(value) {
  let values = value;
  // 非数组输入先尝试按 JSON 解析，失败后再按中英文逗号或顿号拆分。
  if (!Array.isArray(values)) {
    const text = String(values || "").trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      values = Array.isArray(parsed) ? parsed : [text];
    } catch {
      values = text.split(/[、,，/]/);
    }
  }

  // 清理空白、过滤非法角色并通过 Set 去重，同时保持首次出现顺序。
  const targets = [...new Set(values
    .map((item) => String(item || "").trim())
    .filter((item) => messageTargetValues.has(item)))];

  // 一旦包含 all，就只保留 all，避免“全体 + 单独角色”的冗余表示。
  return targets.includes("all") ? ["all"] : targets;
}

// 将标准角色数组序列化为逗号分隔文本，便于数据库字段统一存储。
export function serializeMessageTargets(value) {
  return normalizeMessageTargets(value).join(",");
}

// 为公告响应补充标准化后的 targetRoles 数组，同时保留原公告全部字段。
export function withMessageTargets(message) {
  return {
    ...message,
    targetRoles: normalizeMessageTargets(message?.targetRoles ?? message?.targetRole)
  };
}

// 判断某角色是否属于公告接收范围；all 表示所有角色均可读取。
export function messageTargetsRole(message, role) {
  const targets = normalizeMessageTargets(message?.targetRoles ?? message?.targetRole);
  return targets.includes("all") || targets.includes(role);
}
