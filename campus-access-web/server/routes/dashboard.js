// 本模块按管理员、门岗、学生、教职工、访客和校友角色聚合首页所需的统计卡片与业务列表。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入统一成功、失败响应工具。
import { fail, ok } from "../lib/http.js";
// 看板只读取并聚合数据，因此仅引入只读数据访问函数。
import { getData } from "../lib/store.js";
// 引入当前时间生成函数，用于计算今日统计。
import { nowDateTime } from "../lib/time.js";
// 引入通行记录视图增强函数，用人员档案补齐展示信息。
import { enrichAccessRecords } from "../lib/accessRecordView.js";

// 创建看板模块路由实例。
const router = Router();

// 按时间字段从新到旧排序，便于展示最新记录和最新动态。
function sortByTimeDesc(items, key = "time") {
  return [...items].sort((a, b) => String(b?.[key] || "").localeCompare(String(a?.[key] || "")));
}

// 获取最新的若干条记录，常用于首页实时列表展示。
function latest(items, limit = 10) {
  return sortByTimeDesc(items).slice(0, limit);
}

// 根据角色和用户 ID 解析当前看板需要使用的用户、人员和角色档案上下文。
function resolveContext(data, role, userId) {
  // 管理员指定 userId 时精确查找账号；未指定时按角色选择默认账号或角色档案。
  const user = userId
    ? data.users.find((item) => item.id === userId)
    : data.users.find((item) => item.role === role);
  const effectiveRole = user?.role || role;
  const person = user ? data.people.find((item) => item.id === user.personId) : null;
  const baseProfile = user ? {} : data.roleProfiles[effectiveRole] ?? {};
  // 将账号、人员档案和角色默认配置合并为统一 profile，便于下游按同一结构取值。
  const profile = {
    ...baseProfile,
    personId: person?.id ?? user?.personId ?? baseProfile.personId ?? null,
    name: person?.name ?? baseProfile.name ?? "",
    role: effectiveRole,
    type: person?.type ?? baseProfile.type ?? "",
    status: person?.status ?? user?.status ?? baseProfile.status ?? "",
    code: person?.code ?? "",
    phone: person?.phone ?? "",
    gate: person?.gate ?? ""
  };

  return { user, role: effectiveRole, person, profile };
}

// 判断字段是否具有可用于关联匹配的实际值，排除 undefined、null 和空字符串。
function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

// 判断一条记录是否属于当前人员，兼容通行记录、异常、预约等多种实体。
function belongsToPerson(item, personId, person) {
  if (!person && !personId) return false;
  // 优先使用各种实体中的 ID 字段精确匹配；存在 ID 时不再退回姓名匹配。
  for (const key of ["personId", "ownerId", "visitorId", "hostId"]) {
    if (hasValue(item[key])) return item[key] === personId;
  }
  if (!person) return false;

  // 兼容旧数据缺少关联 ID 的情况，再通过姓名、手机号或人员编号判断归属。
  return [item.name, item.person, item.ownerName, item.visitor, item.host]
    .some((value) => hasValue(value) && value === person.name)
    || (hasValue(person.phone) && [item.phone, item.visitorPhone].some((value) => value === person.phone))
    || (hasValue(person.code) && [item.code, item.ownerCode, item.visitorCode].some((value) => value === person.code));
}

// 判断预约是否属于当前被访人；优先比较 hostId，旧数据再按姓名或编号兼容。
function appointmentForHost(item, personId, person) {
  if (hasValue(item.hostId)) return item.hostId === personId;
  if (!person) return false;
  return item.host === person.name || item.host === person.code;
}

// 判断预约是否属于当前访客；优先比较 visitorId，旧数据再按姓名、电话或身份证号兼容。
function appointmentForVisitor(item, personId, person) {
  if (hasValue(item.visitorId)) return item.visitorId === personId;
  if (!person) return false;
  return item.visitor === person.name || item.visitorPhone === person.phone || item.idNumber === person.idNumber;
}

// 使用断言函数统计数组中满足指定条件的记录数量。
function countBy(items, predicate) {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

// 按中文区域格式添加千位分隔符，使首页的大数字更易读。
function formatCount(value) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

// 从日期时间字符串中提取 YYYY-MM-DD；无法识别时返回空字符串。
function dateKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

// 从日期时间值中提取 YYYY-MM，用于按月聚合或比较。
function monthKey(value) {
  const day = dateKey(value);
  return day ? day.slice(0, 7) : "";
}

// 从日期时间值中提取 YYYY，用于按年聚合或比较。
function yearKey(value) {
  const day = dateKey(value);
  return day ? day.slice(0, 4) : "";
}

// 将中文业务状态映射为前端卡片颜色类型，统一成功、警告、危险和普通状态的视觉表达。
function statusType(status) {
  if (status === "开放" || status === "在线" || status === "正常" || status === "值守中") return "success";
  if (status === "已上传" || status === "已认证" || status === "已通过" || status === "有效") return "success";
  if (status === "维护中" || status === "待审核" || status === "待被访人审核" || status === "待保卫处审核") return "warning";
  if (status === "未上传" || status === "未生成" || status === "未记录") return "warning";
  if (status === "关闭" || status === "离线" || status === "故障" || status === "异常" || status === "未通过" || status === "已过期" || status === "停用") return "danger";
  return "primary";
}

// 生成管理员首页的汇总统计数据，包括今日通行、待审预约和异常数量等。
function adminSummary(data) {
  // 各项统计均由当前数据快照实时计算，不缓存过期汇总值。
  const today = nowDateTime().slice(0, 10);
  const todayRecords = data.accessRecords.filter((item) => dateKey(item.time) === today);
  const pendingAppointments = data.appointments.filter((item) => item.status === "待保卫处审核");
  const alumniRecords = data.accessRecords.filter((item) => item.type === "校友");
  const pendingExceptions = data.exceptions.filter((item) => item.status !== "已处理");
  const highRiskCount = countBy(pendingExceptions, (item) => item.risk === "高风险");
  const onlineDevices = countBy(data.devices, (item) => item.status === "在线");
  const onlineRate = data.devices.length ? Math.round((onlineDevices / data.devices.length) * 100) : 0;

  return {
    today,
    todayAccess: todayRecords.length,
    accessTotal: data.accessRecords.length,
    appointmentTotal: data.appointments.length,
    pendingAppointments: pendingAppointments.length,
    alumniAccess: alumniRecords.length,
    exceptionTotal: data.exceptions.length,
    pendingExceptions: pendingExceptions.length,
    highRiskCount,
    deviceTotal: data.devices.length,
    onlineDevices,
    onlineRate
  };
}

// 将汇总信息转换为首页卡片展示所需的统计项格式。
function adminStats(data) {
  const summary = adminSummary(data);

  return [
    {
      title: "今日通行人数",
      value: formatCount(summary.todayAccess),
      desc: `${summary.today} 数据库通行记录`,
      type: "success"
    },
    {
      title: "访客预约",
      value: formatCount(summary.appointmentTotal),
      desc: `待保卫处审核 ${summary.pendingAppointments} 条`,
      type: summary.pendingAppointments ? "warning" : "primary"
    },
    {
      title: "校友入校",
      value: formatCount(summary.alumniAccess),
      desc: "数据库校友通行记录",
      type: "primary"
    },
    {
      title: "待处理异常",
      value: formatCount(summary.pendingExceptions),
      desc: `高风险 ${summary.highRiskCount} 条`,
      type: summary.pendingExceptions ? "danger" : "success"
    },
    {
      title: "设备在线率",
      value: `${summary.onlineRate}%`,
      desc: `${summary.onlineDevices}/${summary.deviceTotal} 台在线`,
      type: summary.onlineRate >= 90 ? "success" : "warning"
    }
  ];
}

// 汇总最近 7 天的通行趋势和异常趋势，便于图表展示。
function accessTrend(data) {
  // 合并通行和异常中出现过的日期，确保仅有异常、没有通行的日期也能进入趋势图。
  const dateSet = new Set([
    ...data.accessRecords.map((item) => dateKey(item.time)).filter(Boolean),
    ...data.exceptions.map((item) => dateKey(item.time)).filter(Boolean)
  ]);

  return [...dateSet].sort().slice(-7).map((day) => ({
    day: day.slice(5),
    count: countBy(data.accessRecords, (item) => dateKey(item.time) === day),
    exceptions: countBy(data.exceptions, (item) => dateKey(item.time) === day)
  }));
}

// 按风险等级统计异常分布，用于风险饼图展示。
function riskData(data) {
  return ["低风险", "中风险", "高风险"]
    .map((name) => ({
      name,
      value: countBy(data.exceptions, (item) => item.risk === name)
    }))
    .filter((item) => item.value > 0);
}

// 从指定时间字段中选出最新一条记录；没有有效时间的记录不会参与比较。
function latestByTime(items, key = "time") {
  return [...items]
    .filter((item) => item?.[key])
    .sort((a, b) => String(b[key]).localeCompare(String(a[key])))[0] || null;
}

// 统计通行方式中包含指定关键词的记录数，例如校园卡、人脸或车牌识别次数。
function recordMethodCount(records, keyword) {
  return countBy(records, (item) => String(item.method || "").includes(keyword));
}

// 构造门岗角色首页的卡片信息，包括校门状态、今日通行和设备在线情况。
function guardDashboardCards(data, person) {
  // 门岗数据按其值守校门收窄；未绑定校门时保留全部校门数据作为兼容展示。
  const today = nowDateTime().slice(0, 10);
  const gateName = person?.gate || "";
  const gate = data.gates.find((item) => item.name === gateName);
  const gateRecords = data.accessRecords.filter((item) => !gateName || item.gate === gateName);
  const todayGateRecords = gateRecords.filter((item) => dateKey(item.time) === today);
  const gateDevices = data.devices.filter((item) => !gateName || item.gate === gateName);
  const onlineDevices = countBy(gateDevices, (item) => item.status === "在线");
  const offlineDevices = gateDevices.filter((item) => item.status !== "在线");

  return [
    {
      title: "当前校门",
      value: gateName || "未绑定",
      desc: gate
        ? `${gate.status}${gate.openTime ? ` · ${gate.openTime}` : ""}`
        : gateName ? "未配置校门档案" : "未绑定值守校门",
      type: statusType(gate?.status || person?.status),
      badge: "当前"
    },
    {
      title: "今日通行",
      value: formatCount(todayGateRecords.length),
      desc: `${gateName || "全部校门"} ${today} 数据库记录 ${todayGateRecords.length} 条，累计 ${gateRecords.length} 条`,
      type: "success",
      badge: "今日"
    },
    {
      title: "设备在线",
      value: `${onlineDevices}/${gateDevices.length}`,
      desc: gateDevices.length
        ? offlineDevices.length
          ? offlineDevices.map((item) => `${item.name}${item.status ? ` ${item.status}` : ""}`).join("、")
          : "全部设备在线"
        : gateName ? "当前校门暂无设备" : "暂无设备数据",
      type: onlineDevices === gateDevices.length && gateDevices.length > 0 ? "success" : "warning",
      badge: "当前"
    }
  ];
}

// 构造学生角色首页的卡片信息，展示人脸状态、通行次数和异常记录。
function studentDashboardCards({ person, records, exceptions, faces }) {
  // 优先使用人脸照片记录中的状态，缺少照片时再回退人员档案状态。
  const pendingExceptions = exceptions.filter((item) => item.status !== "已处理");
  const face = faces[0] || null;
  const faceStatus = face?.status || person?.faceStatus || "未上传";

  return [
    {
      title: "人脸照片状态",
      value: faceStatus,
      desc: face?.updatedAt ? `最近更新：${face.updatedAt}` : "暂无人脸照片记录",
      type: statusType(faceStatus),
      badge: "当前"
    },
    {
      title: "总出入次数",
      value: formatCount(records.length),
      desc: `校园卡 ${recordMethodCount(records, "校园卡")} 次，人脸 ${recordMethodCount(records, "人脸")} 次`,
      type: "primary",
      badge: "累计"
    },
    {
      title: "异常记录",
      value: formatCount(pendingExceptions.length),
      desc: pendingExceptions.length ? "存在待处理异常" : "暂无待处理异常",
      type: pendingExceptions.length ? "warning" : "success",
      badge: "当前"
    }
  ];
}

// 构造教职工角色首页的卡片信息，展示车辆、预约和通行次数。
function teacherDashboardCards({ data, person, records, appointments, vehicle }) {
  // 待被访人审核和旧版待审核状态都计入教职工的待审数量。
  const pendingAppointments = appointments.filter((item) => item.status === "待被访人审核" || item.status === "待审核");
  const vehicles = data.vehicles.filter((item) => item.ownerId === person?.id);

  return [
    {
      title: "绑定车牌",
      value: vehicle?.plateNo || "未绑定",
      desc: vehicle ? `车辆状态：${vehicle.status || "未记录"}${vehicles.length > 1 ? ` · 共 ${vehicles.length} 辆` : ""}` : "暂无车辆档案",
      type: vehicle ? statusType(vehicle.status) : "warning",
      badge: "当前"
    },
    {
      title: "待审预约",
      value: formatCount(pendingAppointments.length),
      desc: `被访人预约 ${appointments.length} 条`,
      type: pendingAppointments.length ? "warning" : "success",
      badge: "当前"
    },
    {
      title: "总通行次数",
      value: formatCount(records.length),
      desc: `含车辆通行 ${recordMethodCount(records, "车牌")} 次`,
      type: "success",
      badge: "累计"
    }
  ];
}

// 构造访客角色首页的卡片信息，展示预约和通行记录。
function visitorDashboardCards({ records, appointments }) {
  // 将预约按待审核和已通过分别统计，并查找最近一次通行用于摘要说明。
  const pendingCount = countBy(appointments, (item) => ["待审核", "待被访人审核", "待保卫处审核"].includes(item.status));
  const approvedCount = countBy(appointments, (item) => item.status === "已通过");
  const latestRecord = latestByTime(records);

  return [
    {
      title: "我的预约",
      value: formatCount(appointments.length),
      desc: `已通过 ${approvedCount} 条，待审核 ${pendingCount} 条`,
      type: pendingCount ? "warning" : "primary",
      badge: "累计"
    },
    {
      title: "通行记录",
      value: formatCount(records.length),
      desc: latestRecord ? `最近一次：${latestRecord.time}` : "暂无通行记录",
      type: "success",
      badge: "累计"
    }
  ];
}

// 构造校友角色首页的卡片信息，展示校友状态和入校记录。
function alumniDashboardCards({ person, records }) {
  // 校友卡片以人员档案状态为主，同时展示毕业年份、专业和最近入校时间。
  const latestRecord = latestByTime(records);
  const status = person?.status || "未记录";

  return [
    {
      title: "校友状态",
      value: status,
      desc: [person?.graduationYear && `${person.graduationYear} 届`, person?.major].filter(Boolean).join(" · ") || person?.code || "暂无校友档案补充信息",
      type: statusType(status),
      badge: "当前"
    },
    {
      title: "入校记录",
      value: formatCount(records.length),
      desc: latestRecord ? `最近一次：${latestRecord.time}` : "暂无入校记录",
      type: "primary",
      badge: "累计"
    }
  ];
}

// 根据角色分派到对应的卡片构造函数；没有专用卡片的角色返回空数组。
function roleDashboardCards(payload) {
  if (payload.role === "student") return studentDashboardCards(payload);
  if (payload.role === "teacher") return teacherDashboardCards(payload);
  if (payload.role === "visitor") return visitorDashboardCards(payload);
  if (payload.role === "alumni") return alumniDashboardCards(payload);
  if (payload.role === "guard") return guardDashboardCards(payload.data, payload.person);
  return [];
}

// 人脸照片槽位的标准中文标签，与凭证管理页面保持一致。
const faceSlotLabels = {
  primary: "照片一（白天/不戴口罩）",
  secondary: "照片二（夜间/戴口罩）"
};

// 兼容旧人脸记录：补齐缺失的槽位与展示标签。
function normalizeFace(face, index = 0) {
  const slot = face.slot || (index === 1 ? "secondary" : "primary");
  return {
    ...face,
    slot,
    label: face.label || faceSlotLabels[slot] || faceSlotLabels.primary
  };
}

// 管理员首页接口，返回汇总统计、趋势图和最新事件列表。
router.get("/dashboard/admin", (req, res) => {
  // 基于同一份数据快照生成汇总、图表、实时记录和设备列表。
  const data = getData();
  const summary = adminSummary(data);

  ok(res, {
    summary,
    stats: adminStats(data),
    accessTrend: accessTrend(data),
    riskData: riskData(data),
    realtimeRecords: latest(data.accessRecords),
    exceptions: latest(data.exceptions),
    appointments: latest(data.appointments),
    devices: data.devices
  });
});

// 各角色首页接口，根据当前角色生成对应的仪表盘内容和卡片信息。
router.get("/dashboard/:role", (req, res) => {
  const data = getData();
  // 普通用户只能访问自己角色的首页，不能伪造路径角色跨角色查看数据。
  if (req.auth.role !== "admin" && req.params.role !== req.auth.role) {
    return fail(res, 403, "无权访问其他角色首页");
  }

  // 普通用户即使传入 userId，也只能使用自己的账号 ID；管理员可代查指定账号。
  if (req.auth.role !== "admin" && req.query.userId && req.query.userId !== req.auth.user.id) {
    return fail(res, 403, "无权访问其他用户首页");
  }

  // 解析本次看板的统一账号、角色、人员和 profile 上下文。
  const userId = req.auth.role === "admin" ? req.query.userId : req.auth.user.id;
  const context = resolveContext(data, req.params.role, userId);
  const { role, profile, person } = context;

  if (!data.roles[role]) {
    return fail(res, 404, "角色不存在");
  }

  // 人脸数据限定当前人员，并标准化旧记录后按主、副照片顺序排列。
  const personId = profile?.personId;
  const faces = data.faces
    .filter((item) => item.personId === personId)
    .map(normalizeFace)
    .sort((a, b) => (a.slot === b.slot ? 0 : a.slot === "primary" ? -1 : 1));
  const isHostReviewer = role === "student" || role === "teacher";
  const isVisitor = role === "visitor";

  // 预约按角色选择归属规则：被访人看相关预约，访客看本人预约，管理员可看全部。
  const appointments = sortByTimeDesc(data.appointments.filter((item) => {
    if (isHostReviewer) return appointmentForHost(item, personId, person);
    if (isVisitor) return appointmentForVisitor(item, personId, person);
    return role === "admin";
  }), "time");

  // 门岗按值守校门筛选通行记录，其他角色按人员归属筛选，再补齐展示字段。
  const rawRecords = role === "guard"
    ? sortByTimeDesc(data.accessRecords.filter((item) => !person?.gate || item.gate === person.gate))
    : sortByTimeDesc(data.accessRecords.filter((item) => belongsToPerson(item, personId, person)));
  const records = enrichAccessRecords(rawRecords, data.people);
  // 教职工车辆优先选择最近通行的一辆；没有通行时间时回退到第一辆。
  const vehicles = data.vehicles.filter((item) => item.ownerId === personId);
  const vehicle = latestByTime(vehicles, "lastAccess") || vehicles[0] || null;
  // 二维码仅对校友和访客首页有意义，并兼容旧记录通过 ownerName 关联。
  const qrCodes = data.qrCodes.filter((item) => {
    if (role === "alumni") return item.type === "alumni" && (item.ownerId === personId || (!item.ownerId && item.ownerName === profile.name));
    if (role === "visitor") return item.type === "visitor" && (item.ownerId === personId || item.visitorId === personId || (!item.ownerId && item.ownerName === profile.name));
    return false;
  });
  const qrCode = latestByTime(qrCodes, "validTo") || null;
  // 汇总当前人员的异常记录，并将所有角色数据交给卡片分派函数生成首页卡片。
  const exceptions = sortByTimeDesc(data.exceptions.filter((item) => belongsToPerson(item, personId, person)));
  const cards = roleDashboardCards({
    data,
    role,
    person,
    profile,
    records,
    appointments,
    vehicle,
    qrCode,
    exceptions,
    faces
  });

  ok(res, {
    role,
    user: context.user ? {
      id: context.user.id,
      username: context.user.username,
      accountType: context.user.accountType,
      role: context.user.role,
      personId: context.user.personId,
      status: context.user.status
    } : null,
    profile,
    person,
    cards,
    appointments,
    records,
    vehicle,
    face: faces[0] ?? null,
    faces,
    qrCode,
    exceptions
  });
});

// 导出看板路由，供服务入口统一挂载。
export default router;
