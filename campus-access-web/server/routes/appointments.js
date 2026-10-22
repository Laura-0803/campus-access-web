// 本模块负责访客预约的查询、提交和两阶段审核，并在最终通过后生成访客通行二维码。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装、统一响应和必填字段校验工具。
import { asyncRoute, created, fail, ok, requireFields } from "../lib/http.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入业务编号、当前时间和紧凑日期生成工具。
import { nextId, nowDateTime, todayCompact } from "../lib/time.js";
// 引入黑名单凭证标准化和生效记录查询工具。
import { findActiveBlacklistByCredential, normalizeBlacklistCredential } from "../lib/blacklist.js";

// 创建预约管理模块路由实例。
const router = Router();
// 预约流程中使用的状态枚举，表示当前位于哪一个审核阶段。
const appointmentStatus = {
  legacyPending: "待审核",
  hostPending: "待被访人审核",
  securityPending: "待保卫处审核",
  approved: "已通过",
  rejected: "未通过"
};
// 审核操作允许的目标状态集合，确保只接受已通过或未通过。
const reviewStatus = new Set([appointmentStatus.approved, appointmentStatus.rejected]);
// 被访人阶段允许的状态集合，只有这些状态下才可由被访人审核。
const hostPendingStatus = new Set([appointmentStatus.legacyPending, appointmentStatus.hostPending]);
// 可作为被访人的角色集合，限定预约中可选的被访人对象。
const hostRoles = new Set(["student", "teacher", "admin"]);
// 允许进行被访人阶段审核的角色集合，通常是学生和教职工。
const scopedHostReviewerRoles = new Set(["student", "teacher"]);

// 将输入的时间字符串转换为时间戳，便于判断来访时间和预计离校时间的先后顺序，以及进行时间合法性校验。
function parseDateTime(value) {
  // 浏览器表单常提交“日期 空格 时间”，替换为 T 后交给 Date.parse 统一解析。
  const parsed = Date.parse(String(value || "").replace(" ", "T"));
  return Number.isNaN(parsed) ? null : parsed;
}

// 根据请求中的查询条件筛选预约记录，支持按状态、被访人、访客姓名、访客手机号、被访人 ID、访客 ID 等字段过滤，方便列表展示和查询。
function filterAppointments(data, query) {
  // 当使用 visitorId 查询时先取得人员档案，以便兼容旧预约中没有 visitorId 的数据。
  const visitorPerson = query.visitorId
    ? data.people.find((item) => item.id === query.visitorId)
    : null;

  return data.appointments.filter((item) => {
    if (query.status && item.status !== query.status) return false;
    if (query.host && !item.host.includes(query.host)) return false;
    if (query.visitor && !item.visitor.includes(query.visitor)) return false;
    if (query.hostId && item.hostId !== query.hostId) return false;
    if (query.visitorId) {
      // 新数据直接比较 visitorId；旧数据则通过手机号或姓名判断是否属于同一访客。
      if (item.visitorId) return item.visitorId === query.visitorId;
      return item.visitorPhone === visitorPerson?.phone || item.visitor === visitorPerson?.name;
    }
    if (query.visitorPhone && item.visitorPhone !== query.visitorPhone) return false;
    return true;
  });
}

// 根据当前登录角色自动生成可见范围的查询条件，学生和教职工只能查看自己相关的预约，访客只能查看自己的预约，避免越权访问。
function scopedQuery(req) {
  // 复制查询对象，避免直接修改 Express 提供的 req.query。
  const query = { ...req.query };

  if (scopedHostReviewerRoles.has(req.auth.role)) {
    // 学生和教职工只按自己的人员 ID 查询其作为被访人的预约。
    query.hostId = req.auth.personId;
    delete query.visitorId;
    delete query.visitorPhone;
  }

  if (req.auth.role === "visitor") {
    // 访客只按自己的人员 ID 和手机号查询，并移除可能伪造的 hostId 条件。
    query.visitorId = req.auth.personId;
    query.visitorPhone = req.auth.person?.phone || query.visitorPhone;
    delete query.hostId;
  }

  return query;
}

// 判断当前登录用户是否具备查看某条预约的权限，管理员可查看全部，学生和教职工只能查看与自己相关的预约，访客只能查看自己的预约。
function canSeeAppointment(req, appointment) {
  if (req.auth.role === "admin") return true;
  if (scopedHostReviewerRoles.has(req.auth.role)) {
    return appointment.hostId === req.auth.personId || appointment.host === req.auth.person?.name;
  }
  if (req.auth.role === "visitor") {
    return appointment.visitorId === req.auth.personId
      || appointment.visitorPhone === req.auth.person?.phone
      || appointment.visitor === req.auth.person?.name;
  }
  return false;
}

// 查询预约列表接口，根据当前登录用户的角色自动限制可见范围，并返回过滤后的预约结果，供前端展示和管理。
router.get("/appointments", (req, res) => {
  const data = getData();
  const result = filterAppointments(data, scopedQuery(req));
  ok(res, result, { total: result.length });
});

// 查询可作为被访人的人员列表，供预约表单选择。
router.get("/appointments/hosts", (req, res) => {
  const data = getData();
  // 先过滤合法被访人角色，再映射为预约表单实际需要的安全字段。
  const result = data.people
    .filter((item) => hostRoles.has(item.role))
    .map((item) => ({
      id: item.id,
      name: item.name,
      role: item.role,
      type: item.type,
      code: item.code,
      department: item.department || item.college || item.gate || ""
    }));
  ok(res, result, { total: result.length });
});

// 根据预约 ID 查看单条预约详情，包含权限校验。
router.get("/appointments/:id", (req, res) => {
  const data = getData();
  const appointment = data.appointments.find((item) => item.id === req.params.id);
  if (!appointment) return fail(res, 404, "预约不存在");
  if (!canSeeAppointment(req, appointment)) return fail(res, 403, "无权查看该预约");
  ok(res, appointment);
});

// 提交新的访客预约接口，先校验必填字段和时间合法性，再根据当前角色选择访客身份信息，最后创建预约并根据被访人角色决定初始审核阶段。
router.post("/appointments", asyncRoute(async (req, res) => {
  // 管理员代录时还需填写访客姓名和手机号；访客本人提交时身份来自登录上下文。
  const required = req.auth.role === "admin"
    ? ["visitor", "visitorPhone", "host", "reason", "visitStart"]
    : ["host", "reason", "visitStart"];
  const missing = requireFields(req.body, required);
  if (missing.length) return fail(res, 400, "预约信息不完整", { missing });

  // 来访开始时间必须可解析；如果填写结束时间，则必须严格晚于开始时间。
  const start = parseDateTime(req.body.visitStart);
  const end = req.body.visitEnd ? parseDateTime(req.body.visitEnd) : null;
  if (!start) return fail(res, 400, "来访时间格式不正确");
  if (end && end <= start) return fail(res, 400, "预计离校时间必须晚于来访时间");

  const appointment = await updateData((data) => {
    // 访客本人从登录账号解析人员档案，管理员代录则允许通过 userId 或 visitorId 指定人员。
    const visitorUser = req.auth.role === "visitor"
      ? req.auth.user
      : req.body.userId
        ? data.users.find((item) => item.id === req.body.userId)
        : null;
    const visitorPerson = visitorUser
      ? data.people.find((item) => item.id === visitorUser.personId)
      : data.people.find((item) => item.id === req.body.visitorId);
    // 被访人只能按人员编号或系统 ID 匹配，不能按姓名匹配，避免重名导致预约绑定错误。
    const hostPerson = data.people.find((item) => {
      const hostValue = String(req.body.host || "").trim();
      const hostIdValue = String(req.body.hostId || "").trim();
      const matched = item.id === hostIdValue || item.id === hostValue || item.code === hostValue;
      return matched && hostRoles.has(item.role);
    });

    if (!hostPerson) return { error: "hostNotFound" };
    if (req.auth.role === "visitor" && !visitorPerson) return { error: "visitorNotFound" };
    if (req.auth.role === "admin" && !visitorPerson && (!req.body.visitor || !req.body.visitorPhone)) {
      return { error: "visitorRequired" };
    }
    // 提交前使用标准化身份证号检查黑名单，命中时拒绝创建预约。
    const visitorIdNumber = normalizeBlacklistCredential(visitorPerson?.idNumber || req.body.idNumber);
    if (visitorIdNumber && findActiveBlacklistByCredential(data, visitorIdNumber)) {
      return { error: "blacklisted" };
    }

    // 被访人为管理员时直接进入保卫处审核，否则先进入被访人审核阶段。
    const initialStatus = hostPerson.role === "admin"
      ? appointmentStatus.securityPending
      : appointmentStatus.hostPending;
    const next = {
      id: nextId("A"),
      visitor: visitorPerson?.name || req.body.visitor,
      visitorId: visitorPerson?.id || req.body.visitorId || null,
      visitorPhone: visitorPerson?.phone || req.body.visitorPhone || req.body.phone || "",
      idNumber: visitorIdNumber,
      host: hostPerson.name,
      hostId: hostPerson.id,
      time: req.body.visitStart,
      visitStart: req.body.visitStart,
      visitEnd: req.body.visitEnd || "",
      reason: req.body.reason,
      status: initialStatus,
      createdAt: nowDateTime()
    };

    data.appointments.unshift(next);

    return next;
  });

  if (appointment.error === "hostNotFound") return fail(res, 404, "被访人必须填写系统内学生、教职工或保卫处管理员的学号/工号/编号，不能填写姓名");
  if (appointment.error === "visitorNotFound") return fail(res, 404, "访客账号资料不存在");
  if (appointment.error === "visitorRequired") return fail(res, 400, "管理员代录预约必须填写访客姓名和手机号");
  if (appointment.error === "blacklisted") return fail(res, 403, "该身份证号已在黑名单中，禁止提交访客预约");
  created(res, appointment);
}));

// 对预约进行审核接口，支持被访人审核阶段和保卫处管理员审核阶段的审批流转，审批通过后可为访客生成二维码，审批不通过则维持拒绝状态。
router.patch("/appointments/:id/review", asyncRoute(async (req, res) => {
  const { status, comment = "" } = req.body ?? {};

  if (!reviewStatus.has(status)) {
    return fail(res, 400, "审核状态必须为已通过或未通过");
  }

  const result = await updateData((data) => {
    // 先定位预约；即使预约存在，审批通过前仍需再次检查访客是否新进入黑名单。
    const appointment = data.appointments.find((item) => item.id === req.params.id);
    if (!appointment) return { error: "notFound" };
    if (status === appointmentStatus.approved
      && findActiveBlacklistByCredential(data, appointment.idNumber)) {
      return { error: "blacklisted" };
    }

    // 统一记录审核人和审核时间，两个审核阶段共用这些审计字段。
    const reviewerName = req.auth.person?.name || req.auth.user.username;
    const reviewedAt = nowDateTime();

    if (scopedHostReviewerRoles.has(req.auth.role) && appointment.hostId !== req.auth.personId) {
      return { error: "forbidden" };
    }
    if (scopedHostReviewerRoles.has(req.auth.role)) {
      // 被访人通过后只推进至保卫处审核；被访人拒绝则流程直接结束。
      if (!hostPendingStatus.has(appointment.status)) return { error: "hostStageOnly" };

      appointment.status = status === appointmentStatus.approved
        ? appointmentStatus.securityPending
        : appointmentStatus.rejected;
      appointment.reviewedAt = reviewedAt;
      appointment.reviewer = reviewerName;
      appointment.reviewComment = comment;

      return { appointment, qrCode: null };
    }
    // 第二阶段仅管理员可处理，且预约必须已经处于待保卫处审核状态。
    if (req.auth.role !== "admin") return { error: "roleForbidden" };
    if (appointment.status !== appointmentStatus.securityPending) return { error: "securityStageOnly" };

    appointment.status = status;
    appointment.reviewedAt = reviewedAt;
    appointment.reviewer = reviewerName;
    appointment.reviewComment = comment;

    let qrCode = null;
    if (status === appointmentStatus.approved) {
      // 优先复用该预约已有二维码，避免重复审批产生多张凭证。
      qrCode = data.qrCodes.find((item) => item.appointmentId === appointment.id);
      if (!qrCode && appointment.visitorId) {
        // 只有预约绑定了系统访客档案时才自动创建二维码，并沿用预约有效时段。
        qrCode = {
          id: nextId("Q"),
          token: `VIS-${appointment.id}-${todayCompact()}`,
          type: "visitor",
          ownerName: appointment.visitor,
          ownerId: appointment.visitorId,
          visitorId: appointment.visitorId,
          appointmentId: appointment.id,
          validFrom: appointment.visitStart,
          validTo: appointment.visitEnd || appointment.visitStart,
          status: "有效"
        };
        data.qrCodes.unshift(qrCode);
      }
    }

    return { appointment, qrCode };
  });

  if (result.error === "notFound") return fail(res, 404, "预约不存在");
  if (result.error === "forbidden") return fail(res, 403, "只能审核自己作为被访人的预约");
  if (result.error === "hostStageOnly") return fail(res, 400, "当前预约不在被访人审核阶段");
  if (result.error === "securityStageOnly") return fail(res, 400, "当前预约不在保卫处审核阶段");
  if (result.error === "roleForbidden") return fail(res, 403, "当前角色无权审核预约");
  if (result.error === "blacklisted") return fail(res, 403, "该访客身份证号已在黑名单中，禁止通过预约");
  ok(res, result);
}));

// 导出预约管理路由，供服务入口统一挂载。
export default router;
