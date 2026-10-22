// 本模块是门禁通行策略核心，统一判断二维码、校园卡、人脸和车牌凭证是否满足放行条件。
// 引入黑名单凭证匹配和生效状态判断能力。
import { blacklistCredentialMatches, isActiveBlacklistItem } from "./blacklist.js";

// 将账号内部英文角色转换为通行规则中使用的中文角色名称。
const roleLabels = {
  student: "学生",
  teacher: "教职工",
  visitor: "访客",
  alumni: "校友",
  guard: "门岗安保",
  admin: "保卫处管理员"
};

// 将数组或使用顿号、中英文逗号分隔的配置统一转换为非空字符串数组。
function listValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 从 HH:mm 文本中提取当天分钟数；格式无法识别时返回 null。
function minutes(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// 将给定时间转换为当天已经过的分钟数，供开放时段比较。
function currentMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

// 判断当前时间是否落在规则时段内，同时支持全天、预约时段和跨午夜时间段。
function inTimeRange(range, date = new Date()) {
  // 空配置、全天或预约时段由其他业务条件约束，此处直接视为时间允许。
  if (!range || range === "全天" || range === "全天时间" || range.includes("预约时段")) return true;
  // 未能解析出起止时间时保持兼容，不因旧配置格式阻断通行。
  const matches = String(range).match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
  if (!matches) return true;

  const start = minutes(matches[1]);
  const end = minutes(matches[2]);
  const now = currentMinutes(date);
  if (start === null || end === null) return true;
  // 起点不晚于终点是普通日内时段，否则按跨越午夜的时段判断。
  if (start <= end) return now >= start && now <= end;
  return now >= start || now <= end;
}

// 将业务日期时间字符串转换为时间戳；空值或非法日期统一返回 null。
function parseDateTime(value) {
  if (!value) return null;
  const parsed = Date.parse(String(value).replace(" ", "T"));
  return Number.isNaN(parsed) ? null : parsed;
}

// 根据二维码中的 ownerId、visitorId 或旧版 ownerName 查找其所属人员档案。
export function findPersonForQr(data, qrCode) {
  if (!qrCode) return null;
  // 新数据优先使用稳定的人员 ID，旧数据缺少 ID 时再按姓名兼容查询。
  const personId = qrCode.ownerId || qrCode.visitorId;
  return personId
    ? data.people.find((item) => item.id === personId) || null
    : data.people.find((item) => item.name === qrCode.ownerName) || null;
}

// 判断二维码当前处于未开始、已过期或有效时段内三种状态中的哪一种。
export function qrWindowState(qrCode, now = new Date()) {
  const current = now.getTime();
  const start = parseDateTime(qrCode?.validFrom);
  const end = parseDateTime(qrCode?.validTo);
  if (start && start > current) return "notStarted";
  if (end && end < current) return "expired";
  return "active";
}

// 判断二维码及其所属人员是否命中某一条生效黑名单记录。
function matchesBlacklist(item, person, qrCode) {
  if (!isActiveBlacklistItem(item)) return false;
  // 汇总姓名、人员编号、身份证号、手机号、二维码所属人和令牌等可比对标识。
  const values = [
    person?.name,
    person?.code,
    person?.idNumber,
    person?.phone,
    qrCode?.ownerName,
    qrCode?.token
  ].filter(Boolean).map(String);

  // 黑名单名称可直接命中；存在 credentialNo 时再使用统一凭证匹配规则逐项比较。
  if (values.includes(String(item.name))) return true;
  if (!item.credentialNo) return false;
  return values.some((value) => blacklistCredentialMatches(item.credentialNo, value));
}

// 判断普通凭证及其所属人员是否命中某一条生效黑名单记录。
function matchesCredentialBlacklist(item, person, credentialValue) {
  if (!isActiveBlacklistItem(item)) return false;
  const values = [
    person?.name,
    person?.code,
    person?.idNumber,
    person?.phone,
    credentialValue
  ].filter(Boolean).map(String);

  if (values.includes(String(item.name))) return true;
  if (!item.credentialNo) return false;
  return values.some((value) => blacklistCredentialMatches(item.credentialNo, value));
}

// 解析通行主体对应的中文角色；人员档案优先，二维码类型作为缺少档案角色时的回退。
function roleForAccess(person, qrCode) {
  if (person?.role) return roleLabels[person.role] || person.role;
  if (qrCode?.type === "visitor") return "访客";
  if (qrCode?.type === "alumni") return "校友";
  return "未知";
}

// 查找指定角色当前启用的通行规则，并兼容“管理员”的历史角色名称。
function findAccessRule(data, roleLabel) {
  const aliases = roleLabel === "保卫处管理员" ? ["保卫处管理员", "管理员"] : [roleLabel];
  return data.accessRules.find((rule) => aliases.includes(rule.role) && rule.status === "启用") || null;
}

// 判断规则配置的允许校门中是否包含当前校门、全部校门或值守校门通配配置。
function gateAllowedByRule(rule, gate) {
  const gates = listValue(rule?.gates);
  return gates.length > 0 && (
    gates.includes("全部校门")
    || gates.includes("值守校门")
    || gates.includes(gate?.name)
    || gates.includes(gate?.id)
  );
}

// 判断实际通行方式是否被规则允许，并处理校园卡/工号及不同二维码名称之间的业务别名。
function methodAllowedByRule(rule, method, context = {}) {
  const methods = listValue(rule?.methods);
  if (!methods.length) return false;

  // candidates 保存当前方式的所有等价表示，避免配置命名差异造成误拒绝。
  const methodText = String(method || "");
  const candidates = new Set([methodText]);
  if (methodText === "校园卡") candidates.add("工号");
  if (methodText === "工号") candidates.add("校园卡");
  if (methodText.includes("二维码")) candidates.add("二维码扫码");
  if (context.qrCode?.type === "visitor") candidates.add("预约二维码");
  if (context.qrCode?.type === "alumni") candidates.add("校友二维码");

  // 使用双向包含兼容“二维码”与“二维码扫码”等粒度不同的配置名称。
  return methods.some((item) => [...candidates].some((candidate) => {
    return candidate && (candidate.includes(item) || item.includes(candidate));
  }));
}

// 综合二维码状态、有效期、人员、黑名单、校门和角色规则，给出最终二维码通行决策。
export function evaluateQrAccess(data, qrCode, options = {}) {
  // 未指定上下文时默认在东门使用二维码扫码，并以当前时间作为判断时间。
  const gateName = options.gate || "东门";
  const method = options.method || "二维码扫码";
  const now = options.now || new Date();

  // 第一阶段校验二维码是否存在、状态可用且处于允许使用的时间窗口。
  if (!qrCode) return { allowed: false, reason: "未找到有效二维码", person: null, gate: null };
  if (qrCode.status !== "有效") return { allowed: false, reason: "二维码状态不可用", person: findPersonForQr(data, qrCode), gate: null };
  const windowState = qrWindowState(qrCode, now);
  if (windowState === "notStarted") return { allowed: false, reason: "二维码尚未到可用时间", person: findPersonForQr(data, qrCode), gate: null };
  if (windowState === "expired") return { allowed: false, reason: "二维码已过期", person: findPersonForQr(data, qrCode), gate: null };

  // 第二阶段解析二维码所属人员，无法绑定有效人员时不能继续核验。
  const person = findPersonForQr(data, qrCode);
  if (!person) return { allowed: false, reason: "二维码未绑定有效人员", person: null, gate: null };

  // 第三阶段检查人员、证件或二维码令牌是否命中生效黑名单。
  const blacklistItem = data.blacklist.find((item) => matchesBlacklist(item, person, qrCode));
  if (blacklistItem) {
    return { allowed: false, reason: `命中黑名单：${blacklistItem.reason || blacklistItem.name}`, person, gate: null };
  }

  // 第四阶段确认校门存在、处于开放状态且当前时间位于校门开放时段。
  const gate = data.gates.find((item) => item.id === gateName || item.name === gateName);
  if (!gate) return { allowed: false, reason: "校门不存在", person, gate: null };
  if (gate.status !== "开放") return { allowed: false, reason: `校门${gate.status}`, person, gate };
  if (!inTimeRange(gate.openTime || `${data.settings.gateOpenTime}-${data.settings.gateCloseTime}`, now)) {
    return { allowed: false, reason: "当前不在校门开放时间内", person, gate };
  }

  // 第五阶段依次验证角色规则存在、校门允许、方式允许和角色通行时间允许。
  const roleLabel = roleForAccess(person, qrCode);
  const rule = findAccessRule(data, roleLabel);
  if (!rule) return { allowed: false, reason: "未配置该角色通行规则", person, gate };
  if (!gateAllowedByRule(rule, gate)) return { allowed: false, reason: "该角色不允许从此校门通行", person, gate, rule };
  if (!methodAllowedByRule(rule, method, { qrCode })) return { allowed: false, reason: "该角色不允许使用此通行方式", person, gate, rule };
  if (!inTimeRange(rule.allowedTime, now)) return { allowed: false, reason: "当前不在该角色允许通行时间内", person, gate, rule };

  // 所有前置条件均通过后返回完整放行上下文，供调用方记录人员、校门和命中规则。
  return { allowed: true, reason: "", person, gate, rule };
}

// 综合普通凭证、人员/车辆状态、人脸档案、黑名单、校门和角色规则给出通行决策。
export function evaluateCredentialAccess(data, options = {}) {
  // 支持 campusCard、face、plate 等凭证类型，并提供东门与当前时间默认值。
  const credentialType = options.credentialType || "campusCard";
  const credentialValue = String(options.credentialValue || "").trim();
  const gateName = options.gate || "东门";
  const now = options.now || new Date();

  // 缺少凭证内容时无法识别通行主体，立即返回明确的拒绝原因。
  if (!credentialValue) {
    return { allowed: false, reason: "缺少识别凭证", person: null, gate: null, method: "未知方式" };
  }

  // 将内部凭证类型映射为业务展示名称；调用方显式 method 的优先级更高。
  const methodMap = {
    campusCard: "校园卡",
    face: "人脸识别",
    plate: "车牌识别"
  };
  const method = options.method || methodMap[credentialType] || "身份核验";

  // 车牌凭证先找车辆再找车主，其他凭证直接按人员编号、身份证号或人员 ID 查找。
  let person = null;
  let vehicle = null;
  if (credentialType === "plate") {
    vehicle = data.vehicles.find((item) => item.plateNo === credentialValue);
    person = vehicle ? data.people.find((item) => item.id === vehicle.ownerId) || null : null;
    // 车辆必须已登记且状态正常，才能继续执行车主身份和通行规则判断。
    if (!vehicle) return { allowed: false, reason: "未找到绑定车辆", person: null, gate: null, method };
    if (vehicle.status !== "正常") return { allowed: false, reason: `车辆状态${vehicle.status}`, person, gate: null, method, vehicle };
  } else {
    person = data.people.find((item) => item.code === credentialValue || item.idNumber === credentialValue || item.id === credentialValue);
    if (!person) return { allowed: false, reason: "未找到有效人员信息", person: null, gate: null, method };
  }

  // 人员必须存在且状态属于系统认可的正常、在线、值守或已认证状态。
  if (!person) return { allowed: false, reason: "凭证未绑定有效人员", person: null, gate: null, method, vehicle };
  if (person.status && !["正常", "在线", "值守中", "已认证"].includes(person.status)) {
    return { allowed: false, reason: `人员状态${person.status}`, person, gate: null, method, vehicle };
  }

  // 人脸识别还要求人员至少存在一条状态为“已上传”的人脸档案。
  if (credentialType === "face") {
    const face = data.faces.find((item) => item.personId === person.id);
    if (!face || face.status !== "已上传") {
      return { allowed: false, reason: "未上传可用人脸照片", person, gate: null, method, vehicle };
    }
  }

  // 使用人员多种标识和当前凭证值检查生效黑名单。
  const blacklistItem = data.blacklist.find((item) => matchesCredentialBlacklist(item, person, credentialValue));
  if (blacklistItem) {
    return { allowed: false, reason: `命中黑名单：${blacklistItem.reason || blacklistItem.name}`, person, gate: null, method, vehicle };
  }

  // 校验目标校门的存在性、运行状态和开放时间。
  const gate = data.gates.find((item) => item.id === gateName || item.name === gateName);
  if (!gate) return { allowed: false, reason: "校门不存在", person, gate: null, method, vehicle };
  if (gate.status !== "开放") return { allowed: false, reason: `校门${gate.status}`, person, gate, method, vehicle };
  if (!inTimeRange(gate.openTime || `${data.settings.gateOpenTime}-${data.settings.gateCloseTime}`, now)) {
    return { allowed: false, reason: "当前不在校门开放时间内", person, gate, method, vehicle };
  }

  // 查找主体角色的启用规则，并校验校门、认证方式和允许时段。
  const roleLabel = roleForAccess(person);
  const rule = findAccessRule(data, roleLabel);
  if (!rule) return { allowed: false, reason: "未配置该角色通行规则", person, gate, method, vehicle };
  if (!gateAllowedByRule(rule, gate)) return { allowed: false, reason: "该角色不允许从此校门通行", person, gate, rule, method, vehicle };
  if (!methodAllowedByRule(rule, method)) return { allowed: false, reason: "该角色不允许使用此通行方式", person, gate, rule, method, vehicle };
  if (!inTimeRange(rule.allowedTime, now)) return { allowed: false, reason: "当前不在该角色允许通行时间内", person, gate, rule, method, vehicle };

  // 放行结果同时带回 vehicle，便于车牌通行成功后刷新车辆最近通行时间。
  return { allowed: true, reason: "", person, gate, rule, method, vehicle };
}
