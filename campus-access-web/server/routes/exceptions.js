// 本模块负责异常事件查询、智能分析以及门岗处理流程，并维护每条异常的处理轨迹。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装、失败/成功响应以及必填字段校验工具。
import { asyncRoute, fail, ok, requireFields } from "../lib/http.js";
// 引入只读数据访问和持久化更新能力。
import { getData, updateData } from "../lib/store.js";
// nowDateTime 用于记录处理动作发生的统一格式时间。
import { nowDateTime } from "../lib/time.js";
// 引入异常智能分析模块，分别支持单条分析、集合分析和上下文问答。
import { analyzeException, analyzeExceptionSet, answerExceptionDialogue } from "../lib/exceptionAgent.js";

// 创建异常管理路由实例。
const router = Router();
// 异常事件允许的状态流转，确保处理过程状态合法。
const validStatus = new Set(["待处理", "处理中", "已处理"]);

// 该集合用于限定异常处理状态的合法值，避免写入无效状态。

// 查询异常事件列表接口，支持按状态、风险等级和人员姓名等条件过滤，便于门岗和管理员查看待处理或已处理的异常信息。
router.get("/exceptions", (req, res) => {
  const data = getData();
  const result = data.exceptions.filter((item) => {
    if (req.query.status && item.status !== req.query.status) return false;
    if (req.query.risk && item.risk !== req.query.risk) return false;
    if (req.query.person && !item.person.includes(req.query.person)) return false;
    return true;
  });
  ok(res, result, { total: result.length });
});

// 对异常事件集合进行整体分析接口，调用分析模块生成汇总结论和趋势性建议，供保卫处管理员快速掌握当前异常整体情况。
router.get("/exceptions/analysis", (req, res) => {
  const data = getData();
  ok(res, analyzeExceptionSet(data.exceptions));
});

// 与异常分析智能体进行对话接口，管理员可以根据当前异常内容和历史上下文提问，系统返回分析结论、处理建议和问题定位意见。
router.post("/exceptions/chat", (req, res) => {
  // 智能分析可能涉及全局异常信息，因此限制为保卫处管理员使用。
  if (req.auth.role !== "admin") return fail(res, 403, "只有保卫处管理员可以使用异常分析智能体");
  // 对问题去除首尾空白，避免把空问题传给分析模块。
  const question = String(req.body?.question || "").trim();
  if (!question) return fail(res, 400, "请输入要询问的异常分析问题");
  ok(res, answerExceptionDialogue(
    getData(),
    question,
    Array.isArray(req.body?.history) ? req.body.history : [],
    req.body?.context && typeof req.body.context === "object" ? req.body.context : {}
  ));
});

// 针对单个异常事件做详细分析接口，基于该条异常的上下文和历史记录生成针对性的解释与处理建议。
router.get("/exceptions/:id/analysis", (req, res) => {
  const data = getData();
  const result = data.exceptions.find((item) => item.id === req.params.id);
  if (!result) return fail(res, 404, "异常事件不存在");
  ok(res, analyzeException(result, data.exceptions));
});

// 获取某条异常事件的完整详情。
router.get("/exceptions/:id", (req, res) => {
  const data = getData();
  const result = data.exceptions.find((item) => item.id === req.params.id);
  if (!result) return fail(res, 404, "异常事件不存在");
  ok(res, result);
});

// 门岗更新异常事件状态和处理说明，表示异常已开始处理或已经完成处理，并将处理人和处理时间写入事件记录。
router.patch("/exceptions/:id", asyncRoute(async (req, res) => {
  // 实际处置动作必须由门岗安保执行，管理员只负责查看和分析。
  if (req.auth.role !== "guard") return fail(res, 403, "异常事件处理必须由门岗安保执行");
  const { status, note = "" } = req.body ?? {};
  if (status && !validStatus.has(status)) {
    return fail(res, 400, "异常状态不合法");
  }

  const result = await updateData((data) => {
    // 通过事件 ID 定位记录；不存在时返回 null 交由外层生成 404。
    const item = data.exceptions.find((exception) => exception.id === req.params.id);
    if (!item) return null;

    // 状态为可选字段；无论是否修改状态，都记录本次处理人和处理时间。
    if (status) item.status = status;
    item.handler = req.auth.person?.name || req.auth.user.username;
    item.handledAt = nowDateTime();
    if (note) item.note = note;
    return item;
  });

  if (!result) return fail(res, 404, "异常事件不存在");
  ok(res, result);
}));

// 为异常事件追加处理动作记录接口，记录每一步处理动作、处理人、处理说明和处理时间，便于后续回溯和审计。
router.post("/exceptions/:id/actions", asyncRoute(async (req, res) => {
  if (req.auth.role !== "guard") return fail(res, 403, "异常事件处理必须由门岗安保执行");
  const missing = requireFields(req.body, ["action"]);
  if (missing.length) return fail(res, 400, "处理动作不能为空", { missing });

  const result = await updateData((data) => {
    const item = data.exceptions.find((exception) => exception.id === req.params.id);
    if (!item) return null;

    // 生成结构化动作记录，保留动作内容、执行人、说明和时间，便于审计回溯。
    const action = {
      action: req.body.action,
      handler: req.auth.person?.name || req.auth.user.username,
      note: req.body.note || "",
      createdAt: nowDateTime()
    };

    // 兼容历史数据中没有 actions 数组的情况，并将最新动作放到最前面。
    item.actions = item.actions || [];
    item.actions.unshift(action);
    item.status = req.body.close === false ? "处理中" : "已处理";
    item.handler = action.handler;
    item.handledAt = action.createdAt;
    if (action.note) item.note = action.note;

    return item;
  });

  if (!result) return fail(res, 404, "异常事件不存在");
  ok(res, result);
}));

// 导出异常管理路由，供服务入口挂载。
export default router;
