// 本模块负责通行记录查询、人工补录和设备核验模拟，并在核验失败时自动生成异常事件。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装、统一响应和必填字段校验工具。
import { asyncRoute, created, fail, ok, requireFields } from "../lib/http.js";
// 引入数据快照读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入普通凭证和二维码凭证的通行策略判断函数。
import { evaluateCredentialAccess, evaluateQrAccess } from "../lib/accessPolicy.js";
// 引入通行记录视图增强函数，用人员档案补齐记录展示字段。
import { enrichAccessRecord, enrichAccessRecords } from "../lib/accessRecordView.js";
// 引入二维码载荷解析函数，用于从原始扫码内容中提取令牌。
import { extractQrToken } from "../lib/qrPayload.js";
// 引入业务编号与当前时间生成工具。
import { nextId, nowDateTime } from "../lib/time.js";

// 创建通行记录模块的路由实例。
const router = Router();
// 定义可手工登记的通行方式，避免陌生人员被错误地通过普通录入接口创建记录。
const manualRecordMethods = new Set(["人工核验后放行", "现场放行"]);

// 对通行记录做查询条件过滤，支持按状态、类型、校门、方式、姓名和时间范围筛选。
function filterRecords(items, query) {
  // limit 为 0 或无效值时不截断结果；正数时只返回前 limit 条。
  const limit = Number(query.limit || 0);
  // 每个已提供的查询参数都作为过滤条件，未提供的参数不影响结果。
  const filtered = items.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.type && item.type !== query.type) return false;
    if (query.gate && item.gate !== query.gate) return false;
    if (query.method && item.method !== query.method) return false;
    if (query.name && !item.name.includes(query.name)) return false;
    if (query.keyword) {
      // 关键字会在编号、时间、人员、方式、校门和状态等常用展示字段中做模糊匹配。
      const keyword = String(query.keyword).trim();
      const values = [item.id, item.time, item.name, item.personCode, item.type, item.method, item.gate, item.status].filter(Boolean);
      if (!values.some((value) => String(value).includes(keyword))) return false;
    }
    if (query.timeFrom && item.time < query.timeFrom) return false;
    if (query.timeTo && item.time > query.timeTo) return false;
    return true;
  });

  return limit > 0 ? filtered.slice(0, limit) : filtered;
}

// 根据通行失败的原因生成对应的异常事件，包含风险等级、建议处理方式和初始状态，方便后续门岗或管理员人工介入。
function createException(record, reason, gate, method) {
  // 根据失败原因中的风险关键词确定风险等级，黑名单、强行通行和冒用优先判为高风险。
  const risk = reason.includes("黑名单") || reason.includes("强行") || reason.includes("冒用")
    ? "高风险"
    : reason.includes("未找到") || reason.includes("不允许") || reason.includes("过期") || reason.includes("不可用")
      ? "中风险"
      : "低风险";

  return {
    id: nextId("E"),
    time: record.time,
    person: record.name,
    personType: record.type,
    gate,
    method,
    type: `${method}失败`,
    reason,
    risk,
    status: "待处理",
    suggestion: risk === "高风险"
      ? "建议拒绝通行并立即上报保卫处管理员复核。"
      : "建议门岗核验身份信息并联系相关人员确认，确认无误后可人工核验后放行。",
    actions: []
  };
}

// 查询通行记录列表接口，先按条件过滤通行记录，再使用视图增强函数补全人员信息和展示字段，最终返回给前端用于列表和统计。
router.get("/access-records", (req, res) => {
  const data = getData();
  const result = filterRecords(enrichAccessRecords(data.accessRecords, data.people), req.query);
  ok(res, result, { total: result.length });
});

// 手工新增一条通行记录接口，适用于现场人工登记、补录或异常情况回填，系统会根据人员信息生成一条新的通行记录。
router.post("/access-records", asyncRoute(async (req, res) => {
  // 新记录必须具备人员名称、类型、通行方式、校门和结果状态。
  const missing = requireFields(req.body, ["name", "type", "method", "gate", "status"]);
  if (missing.length) return fail(res, 400, "通行记录信息不完整", { missing });

  const record = await updateData((data) => {
    // 优先按人员 ID 匹配，未提供或未命中时再按姓名查找人员档案。
    const person = data.people.find((item) => item.id === req.body.personId || item.name === req.body.name);
    // 陌生人员只能通过明确的人工放行方式补录，避免绕过人员档案约束。
    if (!person && !manualRecordMethods.has(req.body.method)) return { error: "personNotFound" };

    const next = {
      id: nextId("R"),
      time: req.body.time || nowDateTime(),
      name: person?.name || req.body.name,
      personId: person?.id || null,
      type: person?.type || req.body.type,
      method: req.body.method,
      gate: req.body.gate,
      status: req.body.status
    };
    data.accessRecords.unshift(next);
    return next;
  });

  if (record.error === "personNotFound") return fail(res, 404, "未找到人员，只有人工核验后放行或现场放行可手工登记陌生人员");
  created(res, enrichAccessRecord(record, getData().people));
}));

// 模拟设备核验流程接口，接收凭证和门禁上下文，调用通行策略引擎判断是否允许通行；允许时生成正常记录，不允许时生成异常记录并进入异常处理流程。
router.post("/access-records/simulate", asyncRoute(async (req, res) => {
  // 为设备模拟提供常用默认值，同时兼容 credentialValue 和 token 两种凭证字段。
  const {
    credentialType = "qr",
    credentialValue,
    token,
    gate = "东门",
    method
  } = req.body ?? {};

  // 二维码可能是纯令牌，也可能包含包装后的扫码载荷，统一提取后再验证。
  const value = extractQrToken(credentialValue || token);
  if (!value) return fail(res, 400, "缺少识别凭证");

  const result = await updateData((data) => {
    // 二维码类型走二维码策略，其余校园卡、人脸、车牌等类型走普通凭证策略。
    const isQr = credentialType === "qr" || credentialType === "visitorQr" || credentialType === "alumniQr";
    const qrCode = isQr ? data.qrCodes.find((item) => item.token === value || item.id === value) : null;
    const decision = isQr
      ? evaluateQrAccess(data, qrCode, { gate, method: method || "二维码扫码" })
      : evaluateCredentialAccess(data, { credentialType, credentialValue: value, gate, method });
    const person = decision.person;
    const ownerName = person?.name || qrCode?.ownerName || "未知人员";
    const recordMethod = decision.method || method || "二维码扫码";

    // 无论核验成功或失败都保留一条通行记录；status 用“正常/异常”体现判断结果。
    const record = {
      id: nextId("R"),
      time: nowDateTime(),
      name: ownerName,
      personId: person?.id ?? null,
      type: qrCode?.type === "alumni" ? "校友" : qrCode?.type === "visitor" ? "访客" : person?.type || "未知",
      method: recordMethod,
      gate: decision.gate?.name || gate,
      status: decision.allowed ? "正常" : "异常"
    };

    data.accessRecords.unshift(record);

    if (decision.allowed) {
      // 车辆凭证成功通行后刷新车辆最近通行时间。
      if (decision.vehicle) {
        decision.vehicle.lastAccess = nowDateTime();
      }
    } else {
      // 拒绝通行时同步创建待处理异常，供门岗后续处置。
      data.exceptions.unshift(createException(record, decision.reason, gate, recordMethod));
    }

    // 写入系统操作日志，记录模拟核验的操作者、目标凭证和最终结果。
    data.logs.unshift({
      id: nextId("L"),
      time: record.time,
      actor: req.auth?.person?.name || "系统",
      role: req.auth?.role || "system",
      action: "模拟设备核验",
      target: `${recordMethod}/${value}`,
      result: decision.allowed ? "成功" : "失败"
    });

    return { record, qrCode, allowed: decision.allowed, reason: decision.reason, rule: decision.rule || null };
  });

  ok(res, {
    ...result,
    record: enrichAccessRecord(result.record, getData().people)
  });
}));

// 导出通行记录路由，供服务入口统一挂载。
export default router;
