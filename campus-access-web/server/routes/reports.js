// 本模块负责生成通行、预约、异常和设备数据的统计报表，只读取数据而不修改业务记录。
// 引入 Express 路由构造器。
import { Router } from "express";
// ok 用于按项目统一格式返回成功响应。
import { ok } from "../lib/http.js";
// getData 用于取得报表计算所需的当前数据快照。
import { getData } from "../lib/store.js";

// 创建报表模块路由实例。
const router = Router();

// 按指定字段统计数据分布，结果以字段值为键的对象返回。
function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "未分类";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

// 按断言条件统计满足条件的项目数量。
function countMatching(items, predicate) {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

// 从日期时间值中提取 YYYY-MM-DD；格式不符合预期时返回空字符串，避免错误日期进入趋势统计。
function dateKey(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : "";
}

// 汇总通行和异常的近 7 天趋势，用于报表图表展示。
function accessTrend(data) {
  const dateSet = new Set([
    ...data.accessRecords.map((item) => dateKey(item.time)).filter(Boolean),
    ...data.exceptions.map((item) => dateKey(item.time)).filter(Boolean)
  ]);

  return [...dateSet].sort().slice(-7).map((day) => ({
    day: day.slice(5),
    count: countMatching(data.accessRecords, (item) => dateKey(item.time) === day),
    exceptions: countMatching(data.exceptions, (item) => dateKey(item.time) === day)
  }));
}

// 按风险等级汇总异常分布，用于风险报表统计。
function riskData(data) {
  return ["低风险", "中风险", "高风险"]
    .map((name) => ({
      name,
      value: countMatching(data.exceptions, (item) => item.risk === name)
    }))
    .filter((item) => item.value > 0);
}

// 返回综合报表摘要，包含通行、预约、异常、设备和趋势数据。
router.get("/reports/summary", (req, res) => {
  // 所有指标基于同一份数据快照计算，保证本次响应内部的统计口径一致。
  const data = getData();
  // 按业务领域组织统计结果，前端可直接将各分组绑定到卡片和图表。
  const result = {
    access: {
      total: data.accessRecords.length,
      byStatus: countBy(data.accessRecords, "status"),
      byType: countBy(data.accessRecords, "type"),
      byGate: countBy(data.accessRecords, "gate")
    },
    appointments: {
      total: data.appointments.length,
      byStatus: countBy(data.appointments, "status")
    },
    exceptions: {
      total: data.exceptions.length,
      byRisk: countBy(data.exceptions, "risk"),
      byStatus: countBy(data.exceptions, "status")
    },
    devices: {
      total: data.devices.length,
      byStatus: countBy(data.devices, "status")
    },
    accessTrend: accessTrend(data),
    riskData: riskData(data)
  };

  ok(res, result);
});

// 返回通行记录报表数据，支持按状态和校门过滤。
router.get("/reports/access", (req, res) => {
  const data = getData();
  // 仅在查询参数存在时启用对应筛选条件，因此两个条件可以独立使用或组合使用。
  const result = data.accessRecords.filter((item) => {
    if (req.query.status && item.status !== req.query.status) return false;
    if (req.query.gate && item.gate !== req.query.gate) return false;
    return true;
  });
  ok(res, result, { total: result.length });
});

// 导出报表路由，供服务入口统一注册。
export default router;
