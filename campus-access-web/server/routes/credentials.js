// 本模块统一管理人脸照片、车辆和二维码三类通行凭证，并执行所属人权限与业务数量限制。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装、统一响应和必填字段校验工具。
import { asyncRoute, created, fail, ok, requireFields } from "../lib/http.js";
// 引入二维码通行策略判断函数。
import { evaluateQrAccess } from "../lib/accessPolicy.js";
// 引入二维码载荷解析函数，兼容纯令牌和完整扫码内容。
import { extractQrToken } from "../lib/qrPayload.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入业务编号、当前时间和紧凑日期生成工具。
import { nextId, nowDateTime, todayCompact } from "../lib/time.js";
// 引入车牌格式校验和标准化工具。
import { isValidPlateNo, normalizePlateNo } from "../lib/validators.js";

// 创建通行凭证模块路由实例。
const router = Router();
// 每位车主最多登记两辆车，避免超出业务规则范围。
const MAX_VEHICLES_PER_OWNER = 2;
// 定义两个人脸照片槽位的中文用途标签，便于前端提示不同采集环境。
const FACE_SLOTS = {
  primary: "照片一（白天/不戴口罩）",
  secondary: "照片二（夜间/戴口罩）"
};

// 统一人脸照片槽位名称，便于前后端一致处理主副照片。
function normalizeFaceSlot(value) {
  return String(value || "").toLowerCase() === "secondary" ? "secondary" : "primary";
}

// 将人脸照片信息标准化，补齐槽位和展示标签。
function normalizeFace(face, index = 0) {
  const slot = face.slot ? normalizeFaceSlot(face.slot) : index === 1 ? "secondary" : "primary";
  return {
    ...face,
    slot,
    label: face.label || FACE_SLOTS[slot]
  };
}

// 查询某个人员已上传的人脸照片集合，并按槽位排序。
function facesForPerson(data, personId) {
  // 依次完成所属人过滤、旧数据标准化和主照片优先排序。
  return data.faces
    .filter((item) => item.personId === personId)
    .map(normalizeFace)
    .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "primary" ? -1 : 1));
}

// 统计某个车主当前已登记的车辆数量，便于限制车辆数。
function vehicleCountForOwner(data, ownerId, exceptVehicleId = "") {
  return data.vehicles.filter((item) => item.ownerId === ownerId && item.id !== exceptVehicleId).length;
}

// 根据请求上下文解析当前操作对应的人员 ID，兼容管理员代办场景。
function personIdFromRequest(data, req) {
  // 普通用户始终使用登录上下文中的 personId，不能通过参数操作他人凭证。
  if (req.auth?.role !== "admin") return req.auth.personId;

  // 管理员依次可按用户、人员或角色定位目标人员，兼容不同管理页面的调用方式。
  const userId = req.query.userId || req.body?.userId;
  if (userId) return data.users.find((item) => item.id === userId)?.personId;
  if (req.query.personId || req.body?.personId) return req.query.personId || req.body.personId;
  const role = req.query.role || req.body?.role;
  return role ? data.roleProfiles[role]?.personId : null;
}

// 判断当前用户是否有权限查看或核验某个二维码。
function canUseQrCode(req, qrCode) {
  if (req.auth.role === "admin" || req.auth.role === "guard") return true;
  return qrCode.ownerId === req.auth.personId
    || qrCode.visitorId === req.auth.personId
    || qrCode.ownerName === req.auth.person?.name;
}

// 查询人员的人脸照片列表，支持管理员代查和普通用户本人查询。
router.get("/faces", (req, res) => {
  const data = getData();
  const personId = personIdFromRequest(data, req);
  const result = personId
    ? facesForPerson(data, personId)
    : data.faces.map(normalizeFace);
  ok(res, result, { total: result.length });
});

// 上传并保存人员的人脸照片，自动分配主副槽位并更新状态。
router.post("/faces/upload", asyncRoute(async (req, res) => {
  const result = await updateData((data) => {
    // 先解析目标人员并确认人员档案存在，否则不能建立人脸凭证。
    const personId = personIdFromRequest(data, req);
    const person = data.people.find((item) => item.id === personId);
    if (!person) return null;

    // 同一槽位再次上传视为替换；只有新增第三张不同照片时才触发数量限制。
    const slot = normalizeFaceSlot(req.body?.slot);
    const label = req.body?.label || FACE_SLOTS[slot];
    const personFaces = data.faces.filter((item) => item.personId === personId);
    const existing = personFaces.find((item) => normalizeFaceSlot(item.slot) === slot)
      || (slot === "primary" ? personFaces.find((item) => !item.slot) : null);
    if (!existing && personFaces.length >= 2) return { error: "faceLimit" };

    // 复用已有对象或创建新对象，然后统一刷新文件、图片、槽位和更新时间字段。
    const face = existing || {
      id: nextId("F"),
      personId,
      personName: person.name
    };

    face.status = "已上传";
    face.fileName = req.body?.fileName || "face-photo.jpg";
    face.imageUrl = req.body?.imageUrl || face.imageUrl || "";
    face.slot = slot;
    face.label = label;
    face.updatedAt = nowDateTime();

    // 新照片加入集合；无论新增或替换，都同步更新人员档案的人脸状态。
    if (!existing) data.faces.unshift(face);
    person.faceStatus = "已上传";
    return normalizeFace(face);
  });

  if (!result) return fail(res, 404, "人员不存在，无法上传人脸照片");
  if (result.error === "faceLimit") return fail(res, 400, "每人最多上传 2 张人脸照片");
  created(res, result);
}));

// 查询车辆档案，支持按本人或指定人员过滤。
router.get("/vehicles", (req, res) => {
  const data = getData();
  // 管理员未指定人员时查看全部车辆；其他情况只返回解析出的车主名下车辆。
  const personId = req.auth.role === "admin" && !req.query.personId && !req.query.userId && !req.query.role
    ? null
    : personIdFromRequest(data, req);
  const result = data.vehicles.filter((item) => !personId || item.ownerId === personId);
  ok(res, result, { total: result.length });
});

// 新增车辆信息，限制每位车主的车辆数量并校验车牌格式。
router.post("/vehicles", asyncRoute(async (req, res) => {
  // 管理员代录必须指定 ownerId，普通用户的车主身份直接取自登录上下文。
  const required = req.auth.role === "admin" ? ["ownerId", "plateNo"] : ["plateNo"];
  const missing = requireFields(req.body, required);
  if (missing.length) return fail(res, 400, "车辆信息不完整", { missing });
  if (!isValidPlateNo(req.body?.plateNo)) return fail(res, 400, "请输入有效车牌号");

  // 车牌在查重和存储前统一格式，避免大小写或空白造成重复记录。
  const plateNo = normalizePlateNo(req.body.plateNo);

  const vehicle = await updateData((data) => {
    // 新增前依次校验车主存在、车牌唯一以及车主名下车辆未超过上限。
    const ownerId = req.auth.role === "admin" ? req.body.ownerId : req.auth.personId;
    const owner = data.people.find((item) => item.id === ownerId);
    if (!owner) return null;
    if (data.vehicles.some((item) => item.plateNo === plateNo)) return { error: "duplicatedPlate" };
    if (vehicleCountForOwner(data, owner.id) >= MAX_VEHICLES_PER_OWNER) return { error: "vehicleLimit" };

    const next = {
      id: nextId("V"),
      ownerId: owner.id,
      ownerName: owner.name,
      plateNo,
      status: req.body.status || "正常",
      lastAccess: req.body.lastAccess || "暂无"
    };
    data.vehicles.unshift(next);
    return next;
  });

  if (vehicle?.error === "duplicatedPlate") return fail(res, 409, "车牌号已登记");
  if (vehicle?.error === "vehicleLimit") return fail(res, 400, `每位老师最多只能登记 ${MAX_VEHICLES_PER_OWNER} 辆车`);
  if (!vehicle) return fail(res, 404, "车主不存在");
  created(res, vehicle);
}));

// 修改车辆信息，如车牌、所属人和状态。
router.patch("/vehicles/:id", asyncRoute(async (req, res) => {
  if (req.body?.plateNo !== undefined && !isValidPlateNo(req.body.plateNo)) {
    return fail(res, 400, "请输入有效车牌号");
  }

  const result = await updateData((data) => {
    // 普通用户只能修改本人车辆，管理员可以维护任意车辆。
    const vehicle = data.vehicles.find((item) => item.id === req.params.id);
    if (!vehicle) return { error: "notFound" };
    if (req.auth.role !== "admin" && vehicle.ownerId !== req.auth.personId) return { error: "forbidden" };
    if (req.body?.plateNo !== undefined) {
      // 修改车牌时排除当前车辆后做唯一性检查。
      const plateNo = normalizePlateNo(req.body.plateNo);
      if (data.vehicles.some((item) => item.id !== vehicle.id && item.plateNo === plateNo)) return { error: "duplicatedPlate" };
      vehicle.plateNo = plateNo;
    }

    if (req.body?.ownerId !== undefined && req.auth.role === "admin") {
      // 转移车主前确认新车主存在，并检查新车主的车辆数量上限。
      const owner = data.people.find((item) => item.id === req.body.ownerId);
      if (!owner) return { error: "ownerNotFound" };
      if (owner.id !== vehicle.ownerId && vehicleCountForOwner(data, owner.id, vehicle.id) >= MAX_VEHICLES_PER_OWNER) {
        return { error: "vehicleLimit" };
      }
      vehicle.ownerId = owner.id;
      vehicle.ownerName = owner.name;
    }
    if (req.body?.status !== undefined) vehicle.status = req.body.status;
    if (req.body?.lastAccess !== undefined) vehicle.lastAccess = req.body.lastAccess;
    return vehicle;
  });

  if (result.error === "notFound") return fail(res, 404, "车辆不存在");
  if (result.error === "forbidden") return fail(res, 403, "无权修改其他人的车辆");
  if (result.error === "duplicatedPlate") return fail(res, 409, "车牌号已登记");
  if (result.error === "ownerNotFound") return fail(res, 404, "车主不存在");
  if (result.error === "vehicleLimit") return fail(res, 400, `每位老师最多只能登记 ${MAX_VEHICLES_PER_OWNER} 辆车`);
  ok(res, result);
}));

// 删除指定车辆档案。
router.delete("/vehicles/:id", asyncRoute(async (req, res) => {
  const result = await updateData((data) => {
    // 删除前同时检查车辆存在性和所属人权限。
    const vehicle = data.vehicles.find((item) => item.id === req.params.id);
    if (!vehicle) return { error: "notFound" };
    if (req.auth.role !== "admin" && vehicle.ownerId !== req.auth.personId) return { error: "forbidden" };

    data.vehicles = data.vehicles.filter((item) => item.id !== req.params.id);
    return vehicle;
  });

  if (result.error === "notFound") return fail(res, 404, "车辆不存在");
  if (result.error === "forbidden") return fail(res, 403, "无权删除其他人的车辆");
  ok(res, result);
}));

// 查询当前用户可见的二维码列表，支持按类型和状态过滤。
router.get("/qr-codes", (req, res) => {
  const data = getData();
  // 先执行可见性校验，再按类型、状态和所属人姓名做可选过滤。
  const result = data.qrCodes.filter((item) => {
    if (!canUseQrCode(req, item)) return false;
    if (req.query.type && item.type !== req.query.type) return false;
    if (req.query.status && item.status !== req.query.status) return false;
    if (req.query.ownerName && !item.ownerName.includes(req.query.ownerName)) return false;
    return true;
  });
  ok(res, result, { total: result.length });
});

// 生成新的二维码，访客和校友二维码会绑定相应的预约或身份信息。
router.post("/qr-codes", asyncRoute(async (req, res) => {
  const qrCode = await updateData((data) => {
    // 访客和校友的二维码类型由登录角色决定；管理员可在请求体中指定类型。
    const type = req.auth.role === "visitor"
      ? "visitor"
      : req.auth.role === "alumni"
        ? "alumni"
        : req.body?.type;
    if (!type) return { error: "missingType" };

    // 管理员通过姓名或 ID 选择所属人，普通用户只能为自己生成凭证。
    const owner = req.auth.role === "admin"
      ? data.people.find((item) => item.name === req.body.ownerName || item.id === req.body.ownerId)
      : req.auth.person;
    if (!owner) return { error: "ownerNotFound" };

    let appointment = null;
    if (type === "visitor") {
      // 访客二维码必须绑定属于本人且审核通过的指定预约。
      appointment = data.appointments.find((item) => {
        const belongsToOwner = item.visitorId === owner.id
          || item.visitorPhone === owner.phone
          || item.visitor === owner.name;
        return item.id === req.body?.appointmentId && belongsToOwner && item.status === "已通过";
      });
      if (!appointment) return { error: "appointmentRequired" };
    }

    if (req.auth.role !== "admin" && req.auth.role !== type) return { error: "forbidden" };

    // 有预约时采用预约时段；否则采用请求时段或当天 08:00 至 18:00 的默认时段。
    const validFrom = appointment?.visitStart
      || req.body?.validFrom
      || `${todayCompact().slice(0, 4)}-${todayCompact().slice(4, 6)}-${todayCompact().slice(6)} 08:00:00`;
    const validTo = appointment?.visitEnd
      || req.body?.validTo
      || `${todayCompact().slice(0, 4)}-${todayCompact().slice(4, 6)}-${todayCompact().slice(6)} 18:00:00`;
    // 令牌组合类型、人员、日期和随机数，降低同日重复生成时发生冲突的概率。
    const next = {
      id: nextId("Q"),
      token: `${String(type).toUpperCase()}-${owner.id}-${todayCompact()}-${Math.floor(1000 + Math.random() * 9000)}`,
      type,
      ownerName: owner.name,
      ownerId: owner.id,
      visitorId: type === "visitor" ? owner.id : null,
      appointmentId: appointment?.id || req.body?.appointmentId || null,
      validFrom,
      validTo,
      status: "有效"
    };

    data.qrCodes.unshift(next);
    return next;
  });

  if (qrCode.error === "missingType") return fail(res, 400, "二维码类型不能为空");
  if (qrCode.error === "ownerNotFound") return fail(res, 404, "二维码所属人员不存在");
  if (qrCode.error === "appointmentRequired") return fail(res, 400, "访客二维码必须绑定本人已通过的预约");
  if (qrCode.error === "forbidden") return fail(res, 403, "无权生成该类型二维码");
  created(res, qrCode);
}));

// 核验二维码的有效性和通行规则，返回是否允许通过。
router.post("/qr-codes/:id/verify", asyncRoute(async (req, res) => {
  // 路径参数既可传二维码记录 ID，也可传二维码令牌或包装后的扫码内容。
  const credential = extractQrToken(req.params.id);
  const result = await updateData((data) => {
    const qrCode = data.qrCodes.find((item) => item.id === credential || item.token === credential);
    if (!qrCode) return { error: "notFound" };
    if (!canUseQrCode(req, qrCode)) return { error: "forbidden" };

    // 将校门和识别方式交给统一通行策略，返回是否放行及具体原因。
    const decision = evaluateQrAccess(data, qrCode, {
      gate: req.body?.gate || "东门",
      method: req.body?.method || "二维码扫码"
    });

    return {
      qrCode,
      allowed: decision.allowed,
      gate: decision.gate?.name || req.body?.gate || "东门",
      reason: decision.reason
    };
  });

  if (result.error === "notFound") return fail(res, 404, "二维码不存在");
  if (result.error === "forbidden") return fail(res, 403, "无权核验该二维码");
  ok(res, result);
}));

// 导出通行凭证路由，供服务入口统一挂载。
export default router;
