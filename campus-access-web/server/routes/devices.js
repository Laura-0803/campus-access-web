// 本模块负责门禁设备档案的查询、新增、修改和删除，并保证设备状态与所属校门状态保持一致。
// Express Router 用于集中注册设备管理相关的 HTTP 路由。
import { Router } from "express";
// HTTP 工具统一处理异步异常、成功响应、创建成功响应和失败响应。
import { asyncRoute, created, fail, ok } from "../lib/http.js";
// 数据存储工具分别用于只读查询和带持久化的数据更新。
import { getData, updateData } from "../lib/store.js";
// nextId 用于为新增设备生成系统内唯一的业务编号。
import { nextId } from "../lib/time.js";

// 创建本模块独立的路由实例，最后交由服务入口统一挂载。
const router = Router();

// 根据校门名称查询当前状态；当校门数据缺失时返回空字符串，表示没有额外状态约束。
function gateStatus(data, gateName) {
  return (data.gates || []).find((item) => item.name === gateName)?.status || "";
}

// 将校门的维护状态同步到设备：只要所属校门正在维护，设备也必须显示为“维护中”。
function applyGateStatusToDevice(data, device) {
  if (gateStatus(data, device.gate) === "维护中") {
    device.status = "维护中";
  }
}

// 查询设备列表；可通过 status 和 gate 查询参数按设备状态、所属校门进行组合筛选。
router.get("/devices", (req, res) => {
  // 获取当前数据快照，避免列表查询过程中修改持久化数据。
  const data = getData();
  // 没有提供某个筛选条件时跳过对应判断，保留该维度下的全部设备。
  const result = data.devices.filter((item) => {
    if (req.query.status && item.status !== req.query.status) return false;
    if (req.query.gate && item.gate !== req.query.gate) return false;
    return true;
  });
  // 返回筛选结果，并在响应元信息中附带结果总数。
  ok(res, result, { total: result.length });
});

// 新增设备；仅管理员可操作，并要求设备名称、类型和所属校门全部填写。
router.post("/devices", asyncRoute(async (req, res) => {
  // 先做角色权限校验，防止普通用户维护设备档案。
  if (req.auth.role !== "admin") return fail(res, 403, "只有管理员可以维护设备");
  // 将字段转换为字符串并去除首尾空白，任何必填字段为空都立即返回参数错误。
  if (!String(req.body?.name || "").trim() || !String(req.body?.type || "").trim() || !String(req.body?.gate || "").trim()) {
    return fail(res, 400, "请填写设备名称、设备类型和所属校门");
  }

  // 在统一的数据更新事务中构造设备对象并写入设备集合。
  const result = await updateData((data) => {
    const device = {
      // 调用方可传入指定编号；未传入时由系统自动生成 D 前缀编号。
      id: req.body?.id || nextId("D"),
      name: req.body.name,
      type: req.body.type,
      gate: req.body.gate,
      // 新设备未指定状态时默认在线。
      status: req.body?.status || "在线"
    };
    // 写入前检查所属校门；校门维护时强制同步设备状态。
    applyGateStatusToDevice(data, device);
    // 使用 unshift 将新设备放在列表首位，便于管理端优先展示最新记录。
    data.devices.unshift(device);
    return device;
  });

  // 以 201 创建成功响应返回刚写入的设备档案。
  created(res, result);
}));

// 按设备 ID 局部更新设备资料；请求体中未出现的字段保持原值不变。
router.patch("/devices/:id", asyncRoute(async (req, res) => {
  // 设备维护属于管理员权限，其他角色直接拒绝。
  if (req.auth.role !== "admin") return fail(res, 403, "只有管理员可以维护设备");

  const result = await updateData((data) => {
    // 通过路径参数定位目标设备；找不到时用 null 通知外层返回 404。
    const device = data.devices.find((item) => item.id === req.params.id);
    if (!device) return null;

    // 仅复制允许修改且在请求体中明确提供的字段，避免无关字段写入设备对象。
    for (const key of ["name", "type", "gate", "status"]) {
      if (req.body?.[key] !== undefined) device[key] = req.body[key];
    }
    // 修改所属校门或状态后，再次应用校门维护状态约束。
    applyGateStatusToDevice(data, device);
    return device;
  });

  // 区分设备不存在和更新成功两种结果。
  if (!result) return fail(res, 404, "设备不存在");
  ok(res, result);
}));

// 按设备 ID 删除设备档案；删除成功后返回被删除对象，便于前端确认操作结果。
router.delete("/devices/:id", asyncRoute(async (req, res) => {
  // 删除同样只允许管理员执行。
  if (req.auth.role !== "admin") return fail(res, 403, "只有管理员可以维护设备");

  const result = await updateData((data) => {
    // 删除前先确认设备存在，以便给出准确的 404 响应。
    const device = data.devices.find((item) => item.id === req.params.id);
    if (!device) return null;
    // 重新生成不包含目标设备的数组，实现从设备集合中移除记录。
    data.devices = data.devices.filter((item) => item.id !== req.params.id);
    return device;
  });

  if (!result) return fail(res, 404, "设备不存在");
  ok(res, result);
}));

// 导出路由实例，供 server/index.js 挂载到应用。
export default router;
