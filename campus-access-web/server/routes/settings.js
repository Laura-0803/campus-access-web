// 本模块集中管理公告、校门、通行规则、黑名单和系统日志等全局配置与管理查询。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装和统一创建、成功、失败响应工具。
import { asyncRoute, created, fail, ok } from "../lib/http.js";
// 引入普通凭证和二维码凭证的通行策略判断函数。
import { evaluateCredentialAccess, evaluateQrAccess } from "../lib/accessPolicy.js";
// 引入黑名单查询、状态判断和凭证标准化工具。
import {
  findActiveBlacklistByCredential,
  isActiveBlacklistItem,
  normalizeBlacklistCredential
} from "../lib/blacklist.js";
// 引入二维码载荷解析工具。
import { extractQrToken } from "../lib/qrPayload.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入业务编号和当前时间生成工具。
import { nextId, nowDateTime } from "../lib/time.js";
// 引入公告接收角色判断、标准化、序列化和视图增强工具。
import {
  messageTargetsRole,
  normalizeMessageTargets,
  serializeMessageTargets,
  withMessageTargets
} from "../lib/messageTargets.js";

// 创建系统设置模块路由实例。
const router = Router();
// 定义通行认证方式集合，用于校验规则中允许的认证方式字段。
const authMethods = new Set(["校园卡", "工号", "人脸识别", "车牌识别", "预约二维码", "校友二维码", "二维码扫码", "人工核验", "人工核验后放行", "现场放行"]);
// 固定校门顺序既用于输入校验，也用于接口返回时保持界面顺序稳定。
const gateNameList = ["东门", "南门", "西门", "北门"];
// Set 形式用于快速判断请求中的校门名称是否合法。
const gateNames = new Set(gateNameList);
// 定义校门可写入的全部状态。
const gateStatuses = new Set(["开放", "维护中", "关闭"]);
// 定义通行规则可写入的启停状态。
const ruleStatuses = new Set(["启用", "停用"]);
// 仅保留系统支持的人员角色规则，过滤历史或无效规则。
const accessRuleRoles = new Set(["学生", "教职工", "访客", "校友", "门岗安保", "保卫处管理员"]);
// 将历史“管理员”名称映射为当前统一的“保卫处管理员”。
const accessRoleAliases = new Map([["管理员", "保卫处管理员"]]);

// 将角色别名标准化，统一为系统内部的规则名称。
function normalizeAccessRole(role) {
  return accessRoleAliases.get(role) || role;
}

// 将字符串或数组输入统一拆分为列表，便于规则配置中处理多选项。
function listValue(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 将校门配置的输入内容转换为标准校门列表。
function normalizeGateList(value) {
  const list = listValue(value);
  if (list.includes("全部校门") || list.includes("值守校门")) return gateNameList;
  return gateNameList.filter((name) => list.includes(name));
}

// 按固定顺序整理允许校门列表，便于界面展示与校验。
function sortAllowedGates(gates) {
  return gateNameList
    .map((name) => gates.find((item) => item.name === name))
    .filter(Boolean);
}

// 当校门状态发生变化时，同步更新与该校门相关设备的状态。
function syncDevicesWithGateStatus(data, gateName, status) {
  // 校门进入维护时相关设备同步维护；校门恢复开放时，仅把原维护设备恢复在线。
  if (!gateName || !status) return;
  for (const device of data.devices || []) {
    if (device.gate !== gateName) continue;
    if (status === "维护中") {
      device.status = "维护中";
    } else if (status === "开放" && device.status === "维护中") {
      device.status = "在线";
    }
  }
}

// 校验通行规则的允许时间格式是否合法。
function isValidAllowedTime(value) {
  const text = String(value || "");
  return text === "全天时间"
    || text === "全天"
    || text === "预约时段"
    || text === "预约时段内"
    || /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/.test(text);
}

// 校验规则中的最大使用次数配置是否合法。
function isValidMaxUses(value) {
  const text = String(value || "");
  return text === "不限" || /^[1-9]\d{0,3}$/.test(text);
}

// 判断一条通知是否属于预约相关系统通知，便于在公告列表中剔除它们。
function isAppointmentNotice(message) {
  const title = String(message?.title || "").trim();
  const content = String(message?.content || "").trim();
  return /^预约(已通过|未通过|待保卫处审核|待被访人审核|待审核)/.test(title)
    || /^访客预约待(保卫处审核|被访人审核|审核)$/.test(title)
    || /^.+ 提交了新的来访预约/.test(content)
    || /^.+ 的预约已(通过|未通过|由保卫处|由.+通过|被.+驳回)/.test(content);
}

// 判断当前用户是否有权限读取某条通知消息。
function canReadMessage(req, message) {
  if (req.auth.role === "admin") {
    return !req.query.role || messageTargetsRole(message, req.query.role);
  }
  return messageTargetsRole(message, req.auth.role);
}

// 查询公告与通知消息，按角色和已读状态过滤。
router.get("/messages", (req, res) => {
  const data = getData();
  // 公告列表排除预约流程自动通知，并执行角色可见性和已读状态筛选。
  const result = data.messages.filter((item) => {
    if (isAppointmentNotice(item)) return false;
    if (!canReadMessage(req, item)) return false;
    if (req.query.read !== undefined && String(item.read) !== String(req.query.read)) return false;
    return true;
  });
  ok(res, result.map(withMessageTargets), { total: result.length });
});

// 发布新的公告消息，只有管理员能够执行。
router.post("/messages", asyncRoute(async (req, res) => {
  // 公告会广播给指定角色，因此发布权限限定为保卫处管理员。
  if (req.auth.role !== "admin") return fail(res, 403, "只有保卫处管理员可以发布公告");

  // 标题、正文去除首尾空白；接收对象兼容 targetRoles 和旧版 targetRole 字段。
  const title = String(req.body?.title || "").trim();
  const content = String(req.body?.content || "").trim();
  const targetRoles = normalizeMessageTargets(req.body?.targetRoles ?? req.body?.targetRole ?? "all");

  if (!title || !content) return fail(res, 400, "请填写公告标题和公告内容");
  if (!targetRoles.length) return fail(res, 400, "请至少选择一个接收对象");

  const result = await updateData((data) => {
    // 数据层使用序列化后的 targetRole 存储，响应时再由 withMessageTargets 转为前端结构。
    const message = {
      id: nextId("M"),
      title,
      content,
      targetRole: serializeMessageTargets(targetRoles),
      read: false,
      createdAt: nowDateTime()
    };
    data.messages.unshift(message);
    return message;
  });

  created(res, withMessageTargets(result));
}));

// 编辑已有公告内容和接收对象。
router.patch("/messages/:id", asyncRoute(async (req, res) => {
  if (req.auth.role !== "admin") return fail(res, 403, "只有保卫处管理员可以编辑公告");

  // undefined 表示不修改该字段，空字符串则视为非法更新。
  const title = req.body?.title === undefined ? undefined : String(req.body.title || "").trim();
  const content = req.body?.content === undefined ? undefined : String(req.body.content || "").trim();
  const targetInput = req.body?.targetRoles ?? req.body?.targetRole;
  const targetRoles = targetInput === undefined
    ? undefined
    : normalizeMessageTargets(targetInput);

  if (title === "" || content === "") return fail(res, 400, "公告标题和公告内容不能为空");
  if (targetRoles && !targetRoles.length) return fail(res, 400, "请至少选择一个接收对象");

  const result = await updateData((data) => {
    const message = data.messages.find((item) => item.id === req.params.id);
    if (!message) return null;
    if (title !== undefined) message.title = title;
    if (content !== undefined) message.content = content;
    if (targetRoles !== undefined) message.targetRole = serializeMessageTargets(targetRoles);
    return message;
  });

  if (!result) return fail(res, 404, "公告不存在");
  ok(res, withMessageTargets(result));
}));

// 删除指定公告消息。
router.delete("/messages/:id", asyncRoute(async (req, res) => {
  if (req.auth.role !== "admin") return fail(res, 403, "只有保卫处管理员可以删除公告");

  const result = await updateData((data) => {
    // findIndex 与 splice 组合可以同时完成定位、删除并返回被删除公告。
    const index = data.messages.findIndex((item) => item.id === req.params.id);
    if (index < 0) return null;
    const [deleted] = data.messages.splice(index, 1);
    return deleted;
  });

  if (!result) return fail(res, 404, "公告不存在");
  ok(res, result);
}));

// 标记消息为已读或未读，更新用户的通知状态。
router.patch("/messages/:id/read", asyncRoute(async (req, res) => {
  const result = await updateData((data) => {
    // 只有公告可见范围内的用户才能改变其已读状态；未传 read 时默认标记为已读。
    const message = data.messages.find((item) => item.id === req.params.id);
    if (!message) return { error: "notFound" };
    if (!canReadMessage(req, message)) return { error: "forbidden" };
    message.read = req.body?.read ?? true;
    return message;
  });

  if (result.error === "notFound") return fail(res, 404, "通知不存在");
  if (result.error === "forbidden") return fail(res, 403, "无权操作该通知");
  ok(res, result);
}));

// 查询校门信息列表，返回前端可展示的校门配置。
router.get("/gates", (req, res) => {
  const data = getData();
  const result = sortAllowedGates(data.gates || []);
  ok(res, result, { total: result.length });
});

// 更新校门状态或校门基本信息，并同步设备状态。
router.patch("/gates/:id", asyncRoute(async (req, res) => {
  // 对枚举字段先校验再进入数据更新，防止非法校门名称或状态写入。
  const status = req.body?.status;
  if (status !== undefined && !gateStatuses.has(status)) return fail(res, 400, "校门状态不正确");
  if (req.body?.name !== undefined && !gateNames.has(req.body.name)) return fail(res, 400, "校门名称不正确");

  const result = await updateData((data) => {
    const gate = data.gates.find((item) => item.id === req.params.id);
    if (!gate || !gateNames.has(gate.name)) return null;
    // 仅复制允许维护的校门字段，并保留旧名称用于同步已有设备关联。
    const previousName = gate.name;
    for (const key of ["name", "campus", "location", "openTime", "status"]) {
      if (req.body?.[key] !== undefined) gate[key] = req.body[key];
    }
    syncDevicesWithGateStatus(data, previousName, gate.status);
    if (gate.name !== previousName) {
      // 校门改名时同步更新所有关联设备的 gate 字段，再应用新的校门状态。
      for (const device of data.devices || []) {
        if (device.gate === previousName) device.gate = gate.name;
      }
      syncDevicesWithGateStatus(data, gate.name, gate.status);
    }
    return gate;
  });

  if (!result) return fail(res, 404, "校门不存在");
  ok(res, result);
}));

// 将通行规则判断结果格式化为前端可直接消费的结构。
function validationResult(decision, input = {}) {
  // 只暴露前端展示与调试规则所需的字段，避免返回策略引擎内部的完整对象。
  return {
    allowed: Boolean(decision.allowed),
    reason: decision.reason || "",
    credentialType: input.credentialType,
    method: decision.method || input.method || "",
    person: decision.person ? {
      id: decision.person.id,
      name: decision.person.name,
      type: decision.person.type,
      role: decision.person.role,
      code: decision.person.code
    } : null,
    gate: decision.gate ? {
      id: decision.gate.id,
      name: decision.gate.name,
      status: decision.gate.status,
      openTime: decision.gate.openTime
    } : null,
    rule: decision.rule ? {
      id: decision.rule.id,
      role: normalizeAccessRole(decision.rule.role),
      methods: listValue(decision.rule.methods),
      allowedTime: decision.rule.allowedTime,
      gates: normalizeGateList(decision.rule.gates),
      status: decision.rule.status
    } : null
  };
}

// 查询当前配置的通行规则列表，供系统管理界面展示。
router.get("/access-rules", (req, res) => {
  const data = getData();
  const result = data.accessRules
    .map((item) => ({ ...item, role: normalizeAccessRole(item.role), gates: normalizeGateList(item.gates).join("、") }))
    .filter((item) => accessRuleRoles.has(item.role));
  ok(res, result, { total: result.length });
});

// 对指定凭证进行通行规则验证，模拟实际门禁判断过程。
router.post("/access-rules/validate", (req, res) => {
  const data = getData();
  const credentialType = req.body?.credentialType || "campusCard";
  const credentialValue = String(req.body?.credentialValue || req.body?.token || "").trim();
  const gate = req.body?.gate || "东门";
  const method = req.body?.method;

  if (!credentialValue) return fail(res, 400, "请填写需要验证的通行凭证");

  // 二维码类型先解析令牌并查找二维码实体，其余类型直接交给普通凭证策略。
  const isQr = credentialType === "qr" || credentialType === "visitorQr" || credentialType === "alumniQr";
  const decision = isQr
    ? (() => {
        const token = extractQrToken(credentialValue);
        const qrCode = data.qrCodes.find((item) => item.token === token || item.id === token);
        return evaluateQrAccess(data, qrCode, { gate, method });
      })()
    : evaluateCredentialAccess(data, { credentialType, credentialValue, gate, method });

  ok(res, validationResult(decision, { credentialType, method }));
});

// 更新指定通行规则的认证方式、允许时间、校门范围和启用状态。
router.patch("/access-rules/:id", asyncRoute(async (req, res) => {
  // normalizedGateSelection 保存按系统固定顺序整理后的校门数组，供事务内写入。
  let normalizedGateSelection;

  // 分别验证认证方式、时间、校门和状态；请求体未提供的字段保持原规则值。
  if (req.body?.methods !== undefined) {
    const methods = listValue(req.body.methods);
    if (!methods.length || methods.some((item) => !authMethods.has(item))) return fail(res, 400, "认证方式不正确");
  }
  if (req.body?.allowedTime !== undefined && !isValidAllowedTime(req.body.allowedTime)) {
    return fail(res, 400, "允许时间不正确");
  }
  if (req.body?.gates !== undefined) {
    const gates = listValue(req.body.gates);
    if (!gates.length || gates.some((item) => !gateNames.has(item))) return fail(res, 400, "允许校门不正确");
    normalizedGateSelection = gateNameList.filter((item) => gates.includes(item));
  }
  if (req.body?.status !== undefined && !ruleStatuses.has(req.body.status)) {
    return fail(res, 400, "通行规则状态不正确");
  }
  const result = await updateData((data) => {
    const rule = data.accessRules.find((item) => item.id === req.params.id);
    if (!rule) return null;
    // 仅允许修改规则白名单字段，校门使用前面已经标准化的数组。
    for (const key of ["methods", "allowedTime", "gates", "status"]) {
      if (req.body?.[key] !== undefined) rule[key] = key === "gates" ? normalizedGateSelection : req.body[key];
    }
    return rule;
  });

  if (!result) return fail(res, 404, "通行规则不存在");
  ok(res, result);
}));

// 查询生效中的黑名单记录，支持按状态、类别和关键字过滤。
router.get("/blacklist", (req, res) => {
  const data = getData();
  // 首先排除已失效或已移出的记录，再应用状态、类型和关键字查询条件。
  const result = data.blacklist.filter((item) => {
    if (!isActiveBlacklistItem(item)) return false;
    if (req.query.status && item.status !== req.query.status) return false;
    if (req.query.type && item.type !== req.query.type) return false;
    if (req.query.keyword) {
      const keyword = String(req.query.keyword);
      return [item.name, item.credentialNo, item.reason].some((value) => String(value || "").includes(keyword));
    }
    return true;
  });
  ok(res, result, { total: result.length });
});

// 新增黑名单记录，阻止相应身份证号或车牌号继续通行。
router.post("/blacklist", asyncRoute(async (req, res) => {
  // 凭证统一去空白、转大写；人员黑名单必须使用未打码的完整 18 位身份证号。
  const type = req.body?.type || "限制通行人员";
  const credentialNo = normalizeBlacklistCredential(req.body?.credentialNo);
  if (!credentialNo) return fail(res, 400, "请填写身份证号或车牌号");
  if (credentialNo.includes("*")) return fail(res, 400, "黑名单身份证号必须完整填写，不能使用星号打码");
  if (type !== "异常车辆" && !/^\d{17}[\dX]$/.test(credentialNo)) {
    return fail(res, 400, "黑名单人员身份证号需为完整的 18 位身份证号码");
  }

  const result = await updateData((data) => {
    // 相同凭证不能同时存在两条生效记录，避免通行策略出现重复命中。
    if (findActiveBlacklistByCredential(data, credentialNo)) {
      return { error: "duplicatedCredential" };
    }
    const item = {
      id: nextId("B"),
      name: req.body?.name || "未命名对象",
      type,
      credentialNo,
      reason: req.body?.reason || "",
      status: req.body?.status || "生效",
      createdAt: nowDateTime()
    };
    data.blacklist.unshift(item);
    return item;
  });
  if (result.error === "duplicatedCredential") {
    return fail(res, 409, "该身份证号或车牌号已在生效黑名单中");
  }
  ok(res, result);
}));

// 更新黑名单记录状态，支持移出黑名单并补充移出原因。
router.patch("/blacklist/:id", asyncRoute(async (req, res) => {
  const nextStatus = req.body?.status;
  const removalReason = String(req.body?.removedReason || req.body?.removeReason || "").trim();
  // 移出黑名单属于重要审计操作，必须填写原因。
  if (nextStatus === "已移出" && !removalReason) {
    return fail(res, 400, "拉出黑名单原因不能为空");
  }

  const result = await updateData((data) => {
    const item = data.blacklist.find((entry) => entry.id === req.params.id);
    if (!item) return null;
    if (nextStatus !== undefined) item.status = nextStatus;
    if (req.body?.reason !== undefined) item.reason = req.body.reason;
    if (nextStatus === "已移出") {
      // 同时记录移出原因、时间和操作者，保留完整追溯信息。
      item.removedReason = removalReason;
      item.removedAt = nowDateTime();
      item.removedBy = req.auth?.person?.name || req.auth?.user?.username || "系统";
    }
    return item;
  });

  if (!result) return fail(res, 404, "黑名单记录不存在");
  ok(res, result);
}));

// 查询系统操作日志，便于后续审计和排查问题。
router.get("/logs", (req, res) => {
  const data = getData();
  // role 使用精确匹配，actor 使用姓名或账号的包含匹配。
  const result = data.logs.filter((item) => {
    if (req.query.role && item.role !== req.query.role) return false;
    if (req.query.actor && !item.actor.includes(req.query.actor)) return false;
    return true;
  });
  ok(res, result, { total: result.length });
});

// 导出系统设置路由，供服务入口统一挂载。
export default router;
