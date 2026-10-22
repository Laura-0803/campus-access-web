// 本模块实现本地轻量异常分析智能体：读取规则模型，对异常评分，并将自然语言问题路由到结构化分析能力。
// fs 用于同步读取随服务部署的 JSON 规则模型。
import fs from "node:fs";
// path 用于构造与运行目录无关的模型绝对路径。
import path from "node:path";
// fileURLToPath 将 ES Module 地址转换为本地文件路径。
import { fileURLToPath } from "node:url";

// 根据当前模块目录定位并加载异常智能体模型；模型包含风险基线、关键词权重、根因和处置动作。
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(__dirname, "../agents/exception-agent.model.json");
const model = JSON.parse(fs.readFileSync(modelPath, "utf8"));

// 将数值限制在给定闭区间，防止风险分数超出系统定义的 1～99 范围。
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// 以空字符串兼容空值后执行关键词包含判断。
function includesText(source, keyword) {
  return String(source || "").includes(keyword);
}

// 按指定字段统计记录数量；字段为空时统一归入“未分类”。
function countBy(rows, key) {
  return rows.reduce((result, row) => {
    const value = row[key] || "未分类";
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

// 取得指定维度中数量最多的前若干项，并转换为 name/count 对象数组。
function topEntries(rows, key, limit = 3) {
  return Object.entries(countBy(rows, key))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

// 遍历模型关键词权重表，累加当前文本命中的全部权重。
function weightFor(map, text) {
  return Object.entries(map || {}).reduce((score, [keyword, weight]) => {
    return includesText(text, keyword) ? score + Number(weight || 0) : score;
  }, 0);
}

// 将 1～99 的综合分数映射为高、中、低三档预测风险。
function riskBand(score) {
  if (score >= 80) return "高风险";
  if (score >= 55) return "中风险";
  return "低风险";
}

// 根据异常类型和原因匹配模型中的第一条根因知识；未命中时返回审慎的综合核验说明。
function rootCauseFor(item) {
  const text = `${item.type || ""} ${item.reason || ""}`;
  const matched = Object.entries(model.rootCauses || {}).find(([keyword]) => includesText(text, keyword));
  return matched?.[1] || "异常原因需要结合人员档案、通行凭证、设备日志和现场核验结果综合判断。";
}

// 按预测风险获取门岗处置动作；未知风险时回退到中风险动作集。
function guardActionsFor(risk) {
  return model.guardActions?.[risk] || model.guardActions?.["中风险"] || [];
}

// 统计同人员、同校门未闭环和同类型未闭环的重复情况，并计算最高 14 分的复发权重。
function recurrenceScore(item, rows) {
  // 同人员统计包含全部状态，用于识别人员长期重复触发异常的情况。
  const samePerson = rows.filter((row) => item.person && row.person === item.person).length;
  // 同校门和同类型仅统计未处理记录，突出当前仍在积压的风险。
  const sameGate = rows.filter((row) => item.gate && row.gate === item.gate && row.status !== "已处理").length;
  const sameType = rows.filter((row) => item.type && row.type === item.type && row.status !== "已处理").length;
  return {
    samePerson,
    sameGate,
    sameType,
    score: clamp((samePerson - 1) * 4 + (sameGate - 1) * 2 + (sameType - 1) * 2, 0, 14)
  };
}

// 对单条异常进行可解释风险分析，输出评分、预测等级、根因、证据和分角色处置建议。
export function analyzeException(item, rows = []) {
  // 评分文本合并异常类型、原因和认证方式，使不同权重表都可从统一上下文匹配。
  const text = `${item.type || ""} ${item.reason || ""} ${item.method || ""}`;
  const recurrence = recurrenceScore(item, rows);
  // 综合原始风险基线、类型权重、方式权重、复发权重和待处理加分，并限制到 1～99。
  const score = clamp(
    Number(model.riskBase?.[item.risk] || 45)
      + weightFor(model.typeWeights, text)
      + weightFor(model.methodWeights, text)
      + recurrence.score
      + (item.status === "待处理" ? 4 : 0),
    1,
    99
  );
  const predictedRisk = riskBand(score);
  const rootCause = rootCauseFor(item);
  const guardActions = guardActionsFor(predictedRisk);

  // 返回内容同时面向前端展示和管理决策；evidence 明确列出评分所依据的事实。
  return {
    id: item.id,
    model: {
      name: model.name,
      version: model.version,
      mode: "local-lightweight-agent",
      size: "tiny-json"
    },
    score,
    predictedRisk,
    rootCause,
    conclusion: `${item.person || "未知人员"} 在 ${item.gate || "未知校门"} 发生${item.type || "异常事件"}，综合风险评分 ${score}，建议由门岗按现场核验流程处置。`,
    evidence: [
      `系统风险等级：${item.risk || "未标注"}`,
      `异常原因：${item.reason || "暂无"}`,
      `通行方式：${item.method || "未知"} / 校门：${item.gate || "未知"}`,
      `同人员异常次数：${recurrence.samePerson}，同校门未闭环异常：${recurrence.sameGate}`
    ],
    adminFocus: [
      "复核异常趋势、规则配置、设备同步和黑名单策略是否需要调整",
      "不直接执行放行、拒绝通行等现场处置动作",
      "需要处理时由门岗安保在现场通行处理或异常事件处理页面完成"
    ],
    guardActions
  };
}

// 对异常集合逐条评分并生成全局摘要，包括风险/状态分布及高发校门和类型。
export function analyzeExceptionSet(rows = []) {
  const items = rows.map((item) => analyzeException(item, rows));
  const pending = rows.filter((item) => item.status !== "已处理");
  // items 保存每条异常的详细分析，summary 用于管理驾驶舱快速总览。
  return {
    model: {
      name: model.name,
      version: model.version,
      mode: "local-lightweight-agent",
      modelPath: "server/agents/exception-agent.model.json"
    },
    summary: {
      total: rows.length,
      pending: pending.length,
      highRisk: rows.filter((item) => item.risk === "高风险").length,
      byRisk: countBy(rows, "risk"),
      byStatus: countBy(rows, "status"),
      hotGates: topEntries(rows, "gate"),
      hotTypes: topEntries(rows, "type")
    },
    items
  };
}

// 一天的毫秒数，用于构造最近 N 天和昨日等时间范围。
const dayMs = 24 * 60 * 60 * 1000;
// 每次回答附带的推荐问题，帮助用户了解智能体可支持的分析范围。
const defaultSuggestions = [
  "近期哪个门出现的异常事件最多？",
  "本月待处理异常有哪些？",
  "高风险异常有哪些？",
  "异常原因主要集中在哪些类型？"
];

// 严格解析 YYYY-MM-DD[ HH:mm:ss] 形式的业务时间，并以 UTC 数值承载墙上时间以避免本机时区偏移。
function parseDateTime(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return Number.NaN;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

// 从毫秒时间值提取年、月、日三个 UTC 部件。
function dateParts(ms) {
  const date = new Date(ms);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate()
  };
}

// 取得给定日期当天 00:00:00.000 的时间值。
function startOfDay(ms) {
  const parts = dateParts(ms);
  return Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
}

// 取得给定日期当天 23:59:59.999 的时间值。
function endOfDay(ms) {
  return startOfDay(ms) + dayMs - 1;
}

// 将时间值格式化为 YYYY-MM-DD 日期文本。
function formatDate(ms) {
  const parts = dateParts(ms);
  return [
    parts.year,
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0")
  ].join("-");
}

// 将时间值格式化为 YYYY-MM-DD HH:mm:ss 日期时间文本。
function formatDateTime(ms) {
  const date = new Date(ms);
  return `${formatDate(ms)} ${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
}

// 获取上海时区当前墙上时间，并转为供本模块统一计算的 UTC 数值表示。
function currentShanghaiMs() {
  // Intl 显式指定上海时区，避免服务器部署地区影响“今天”和“本月”的判断。
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
}

// 以异常数据中的最新时间作为演示查询基准；没有有效数据时回退上海当前时间。
function latestDataMs(rows = []) {
  const timestamps = rows
    .map((item) => parseDateTime(item?.time))
    .filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : currentShanghaiMs();
}

// 构造包含基准日的最近 N 天范围，并将天数限制在 1～366 之间。
function recentDaysRange(days, nowMs) {
  const normalizedDays = Math.max(1, Math.min(Number(days) || 7, 366));
  return {
    label: `近${normalizedDays}天`,
    startMs: startOfDay(nowMs) - (normalizedDays - 1) * dayMs,
    endMs: nowMs
  };
}

// 构造从基准时间所在月份第一天零点到基准时间的“本月”范围。
function thisMonthRange(nowMs) {
  const parts = dateParts(nowMs);
  return {
    label: "本月",
    startMs: Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0),
    endMs: nowMs
  };
}

// 从自然语言问题识别今天、昨天、本月、最近 N 天、一周、两周或一个月等时间范围。
function rangeFromQuestion(question, baseMs = currentShanghaiMs()) {
  const text = String(question || "");
  const nowMs = baseMs;

  if (/今天|今日|当天/.test(text)) return { label: "今天", startMs: startOfDay(nowMs), endMs: nowMs };
  if (/昨天|昨日/.test(text)) {
    const yesterday = startOfDay(nowMs) - dayMs;
    return { label: "昨天", startMs: yesterday, endMs: endOfDay(yesterday) };
  }
  if (/本月|这个月|当月/.test(text)) return thisMonthRange(nowMs);

  const dayMatch = text.match(/(?:近|最近|过去)?\s*(\d{1,3})\s*天/);
  if (dayMatch) return recentDaysRange(Number(dayMatch[1]), nowMs);
  if (/一周|1周|七天|7天|一个星期/.test(text)) return recentDaysRange(7, nowMs);
  if (/两周|2周|十四天|14天|两个星期/.test(text)) return recentDaysRange(14, nowMs);
  if (/一个月|一月|30天|三十天/.test(text)) return recentDaysRange(30, nowMs);

  // 未出现明确时间表达时默认分析最近 30 天。
  return recentDaysRange(30, nowMs);
}

// 将内部时间范围转换为前端可展示的标签、开始时间和结束时间。
function rangeMeta(range) {
  return {
    label: range.label,
    start: formatDateTime(range.startMs),
    end: formatDateTime(range.endMs)
  };
}

// 判断一条异常的时间是否可解析且位于指定闭区间内。
function inRange(value, range) {
  const timestamp = parseDateTime(value);
  return Number.isFinite(timestamp) && timestamp >= range.startMs && timestamp <= range.endMs;
}

// 去除问题中的全部空白字符，降低用户输入格式对关键词识别的影响。
function normalizeQuestion(question) {
  return String(question || "").replace(/\s+/g, "");
}

// 从问题中识别系统支持的四个校门名称；未识别时返回空字符串。
function selectedGate(question) {
  return ["东门", "南门", "西门", "北门"].find((gate) => String(question || "").includes(gate)) || "";
}

// 从问题中识别高、中、低风险筛选条件。
function selectedRisk(question) {
  return ["高风险", "中风险", "低风险"].find((risk) => String(question || "").includes(risk)) || "";
}

// 将“未处理、待闭环、已闭环”等自然语言表达归一为系统异常状态。
function selectedStatus(question) {
  if (/待处理|未处理|待闭环|没处理/.test(question)) return "待处理";
  if (/处理中/.test(question)) return "处理中";
  if (/已处理|已闭环|处理完/.test(question)) return "已处理";
  return "";
}

// 复制数组并按异常时间字符串从新到旧排序，避免改变原始数据顺序。
function sortByTimeDesc(rows) {
  return [...rows].sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
}

// 以最新异常时间为基准解析问题范围，并返回范围元数据及范围内记录。
function rowsInQuestionRange(rows, question) {
  const range = rangeFromQuestion(question, latestDataMs(rows));
  return {
    range,
    rows: rows.filter((item) => inRange(item.time, range))
  };
}

// 按字段分组计数，并按数量降序、名称升序生成稳定的统计列表。
function groupRows(rows, key) {
  return Object.entries(countBy(rows, key))
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name)));
}

// 定义异常结果表的公共列，并允许调用方追加评分、根因等专用列。
function exceptionColumns(extra = []) {
  return [
    { title: "异常编号", key: "id" },
    { title: "时间", key: "time" },
    { title: "人员", key: "person" },
    { title: "校门", key: "gate" },
    { title: "异常类型", key: "type" },
    { title: "异常原因", key: "reason" },
    { title: "风险等级", key: "risk" },
    { title: "状态", key: "status" },
    ...extra
  ];
}

// 将完整异常对象压缩为对话表格需要的安全展示字段，并用短横线补齐空值。
function compactException(item) {
  return {
    id: item.id,
    time: item.time,
    person: item.person || "-",
    gate: item.gate || "-",
    type: item.type || "-",
    reason: item.reason || "-",
    risk: item.risk || "-",
    status: item.status || "-"
  };
}

// 构造所有对话回答的统一协议，附带模型信息、数据源、推荐问题和默认空表格。
function buildResult(payload) {
  return {
    id: `exception-agent-${Date.now()}`,
    role: "assistant",
    model: {
      name: "TinyCampusExceptionDialogueAgent",
      version: "1.0.0",
      mode: "database-rule-dialogue"
    },
    dataSource: "MySQL 实时异常事件表",
    suggestions: defaultSuggestions,
    rows: [],
    columns: [],
    ...payload
  };
}

// 生成嵌入自然语言回答的“标签（开始日期 至 结束日期）”时间说明。
function rangeText(range) {
  return `${range.label}（${formatDate(range.startMs)} 至 ${formatDate(range.endMs)}）`;
}

// 返回智能体能力说明、当前异常总数和可提问方向。
function answerHelp(total) {
  return buildResult({
    intent: "help",
    answer: `我在异常事件分析里，只回答异常事件相关问题。当前数据库共有 ${total} 条异常事件。我可以查高发校门、高风险异常、待处理异常、异常原因分布、某个校门的异常明细，也可以给出处置建议。`
  });
}

// 回答异常高发校门问题，并统计各校门异常数、高风险数、未闭环数和最近发生时间。
function answerHotGate(rows, question) {
  // 先按问题时间范围过滤，再按 gate 分组生成校门排行。
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const grouped = groupRows(scopedRows, "gate").map((item) => {
    const gateRows = scopedRows.filter((row) => (row.gate || "未记录") === item.name);
    return {
      gate: item.name,
      count: item.count,
      highRisk: gateRows.filter((row) => row.risk === "高风险").length,
      pending: gateRows.filter((row) => row.status !== "已处理").length,
      latestTime: sortByTimeDesc(gateRows)[0]?.time || "-"
    };
  });
  // 排序后第一项即当前范围内异常数量最多的校门。
  const top = grouped[0];

  return buildResult({
    intent: "hotGate",
    answer: top
      ? `${rangeText(range)}异常最多的是${top.gate}，共 ${top.count} 起；其中高风险 ${top.highRisk} 起，未闭环 ${top.pending} 起。`
      : `${rangeText(range)}数据库中没有异常事件记录。`,
    range: rangeMeta(range),
    columns: [
      { title: "校门", key: "gate" },
      { title: "异常数", key: "count" },
      { title: "高风险", key: "highRisk" },
      { title: "未闭环", key: "pending" },
      { title: "最近异常时间", key: "latestTime" }
    ],
    rows: grouped,
    exportFileName: `${range.label}异常校门排行.csv`
  });
}

// 回答风险、状态或明细类问题，支持时间、校门、风险和状态组合筛选。
function answerRiskOrStatus(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const risk = selectedRisk(question);
  const status = selectedStatus(question);
  const gate = selectedGate(question);
  // 仅应用问题中实际识别出的条件，结果按时间倒序并压缩为表格字段。
  const filtered = sortByTimeDesc(scopedRows.filter((item) => {
    if (risk && item.risk !== risk) return false;
    if (status && item.status !== status) return false;
    if (gate && item.gate !== gate) return false;
    return true;
  })).map(compactException);
  const label = [gate, risk, status].filter(Boolean).join("、") || "异常";
  const byGate = groupRows(filtered, "gate").map((item) => `${item.name} ${item.count} 起`).join("，") || "无";

  return buildResult({
    intent: "exceptionList",
    answer: `${rangeText(range)}${label}共 ${filtered.length} 起。按校门分布：${byGate}。`,
    range: rangeMeta(range),
    columns: exceptionColumns(),
    rows: filtered,
    exportFileName: `${range.label}${label}明细.csv`
  });
}

// 分析异常类型和具体原因分布，并指出最高发类型及最常见原因。
function answerReason(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const gate = selectedGate(question);
  const filtered = gate ? scopedRows.filter((item) => item.gate === gate) : scopedRows;
  const byType = groupRows(filtered, "type");
  // 原因表最多返回前八项，避免长尾原因使回答过于冗长。
  const byReason = groupRows(filtered, "reason").slice(0, 8);
  const topType = byType[0];
  const topReason = byReason[0];

  return buildResult({
    intent: "reason",
    answer: filtered.length
      ? `${rangeText(range)}${gate || "全校"}共有 ${filtered.length} 起异常。最高发类型是${topType?.name || "-"}（${topType?.count || 0} 起），最常见原因是${topReason?.name || "-"}（${topReason?.count || 0} 起）。建议优先复核对应校门设备状态、二维码/证件有效性和规则配置。`
      : `${rangeText(range)}${gate || "全校"}没有异常记录，暂时无法分析原因分布。`,
    range: rangeMeta(range),
    columns: [
      { title: "原因", key: "reason" },
      { title: "次数", key: "count" }
    ],
    rows: byReason.map((item) => ({ reason: item.name, count: item.count })),
    exportFileName: `${range.label}异常原因分布.csv`
  });
}

// 生成异常处置建议，优先选择高风险未闭环事件，其次选择其他待处理事件。
function answerSuggestion(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const target = selectedGate(question);
  const filtered = target ? scopedRows.filter((item) => item.gate === target) : scopedRows;
  const pending = filtered.filter((item) => item.status !== "已处理");
  const highRisk = pending.filter((item) => item.risk === "高风险");
  // focus 是建议文本中重点说明的第一优先事件；无未处理事件时回退到范围内任一事件。
  const focus = highRisk[0] || pending[0] || filtered[0];

  return buildResult({
    intent: "suggestion",
    answer: focus
      ? `${rangeText(range)}建议先处理 ${focus.id}：${focus.person || "未知人员"}在${focus.gate || "未知校门"}发生“${focus.type || "异常"}”，原因为“${focus.reason || "未记录"}”。处置上先核验证件/二维码和人员身份；高风险或无法确认时拒绝通行并上报保卫处；确认无误后由门岗按现场流程登记处理。`
      : `${rangeText(range)}没有可处置的异常记录。`,
    range: rangeMeta(range),
    columns: exceptionColumns(),
    rows: sortByTimeDesc(pending.length ? pending : filtered).slice(0, 10).map(compactException),
    exportFileName: `${range.label}异常处置建议.csv`
  });
}

// 从问题中的完整异常编号或前端当前选中上下文解析目标异常。
function findExceptionByReference(rows, question, context = {}) {
  // 显式编号优先；只有出现“当前、选中、这条”等指代词时才读取 selectedExceptionId。
  const explicitId = String(question || "").match(/[A-Za-z]\d{8,}/)?.[0]?.toUpperCase();
  const selectedId = /当前|选中|这条|这个|该异常|单个/.test(String(question || ""))
    ? String(context.selectedExceptionId || "").toUpperCase()
    : "";
  const id = explicitId || selectedId;
  if (!id) return null;
  return rows.find((item) => String(item.id || "").toUpperCase() === id) || null;
}

// 回答单条异常分析问题，组合风险评分、根因、处置建议和已有处理动作。
function answerSingleException(rows, item) {
  // 未能定位目标时明确提示编号或选中操作，不对未知异常进行猜测。
  if (!item) {
    return buildResult({
      intent: "singleExceptionMissing",
      answer: "我没有找到对应的异常事件。请提供完整异常编号，或先在异常事件表中选中一条记录后再问“分析当前选中的异常”。"
    });
  }

  // 调用单条风险分析器，并读取事件已有动作形成处置进展说明。
  const analysis = analyzeException(item, rows);
  const actions = Array.isArray(item.actions) ? item.actions : [];
  const actionText = actions.length
    ? `已有 ${actions.length} 条处置记录，最近一次为“${actions[0].action || "-"}”，处理人：${actions[0].handler || "-"}。`
    : "暂未记录门岗处置动作。";

  return buildResult({
    intent: "singleException",
    answer: [
      `${item.id} 的单条异常分析：${item.person || "未知人员"}在${item.gate || "未知校门"}发生“${item.type || "异常事件"}”。`,
      `系统记录风险为${item.risk || "未标注"}，当前状态为${item.status || "未标注"}；智能体综合评分 ${analysis.score}/99，预测风险为${analysis.predictedRisk}。`,
      `疑似原因：${analysis.rootCause}`,
      `处置建议：${(analysis.guardActions || []).join("；") || item.suggestion || "请门岗按现场核验流程处理。"}`,
      actionText
    ].join("\n"),
    columns: exceptionColumns([
      { title: "智能评分", key: "score" },
      { title: "预测风险", key: "predictedRisk" },
      { title: "疑似原因", key: "rootCause" }
    ]),
    rows: [{
      ...compactException(item),
      score: analysis.score,
      predictedRisk: analysis.predictedRisk,
      rootCause: analysis.rootCause
    }],
    exportFileName: `${item.id}异常分析.csv`
  });
}

// 根据问题关键词选择状态、风险、原因、校门或类型维度，计算数量与占比。
function answerDistribution(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const text = normalizeQuestion(question);
  // 维度按明确优先级选择；都未命中时默认统计异常类型。
  const dimension = /状态|处理|闭环/.test(text)
    ? { key: "status", label: "状态" }
    : /风险/.test(text)
      ? { key: "risk", label: "风险等级" }
      : /原因|归因/.test(text)
        ? { key: "reason", label: "异常原因" }
        : /门|校门/.test(text)
          ? { key: "gate", label: "校门" }
          : { key: "type", label: "异常类型" };
  // 占比保留一位小数，并在空数据时安全返回 0%。
  const grouped = groupRows(scopedRows, dimension.key).map((item) => ({
    name: item.name,
    count: item.count,
    ratio: scopedRows.length ? `${Math.round((item.count / scopedRows.length) * 1000) / 10}%` : "0%"
  }));

  return buildResult({
    intent: "distribution",
    answer: `${rangeText(range)}按${dimension.label}统计共 ${scopedRows.length} 起。${grouped[0] ? `占比最高的是${grouped[0].name}，${grouped[0].count} 起，占 ${grouped[0].ratio}。` : "暂无可统计数据。"}`,
    range: rangeMeta(range),
    columns: [
      { title: dimension.label, key: "name" },
      { title: "异常数", key: "count" },
      { title: "占比", key: "ratio" }
    ],
    rows: grouped,
    exportFileName: `${range.label}异常${dimension.label}分布.csv`
  });
}

// 按天统计异常总数、高风险数和未闭环数，并识别异常数量峰值日期。
function answerTrend(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  // reduce 将每条异常累计到日期桶中，再转换为按日期升序的图表数据。
  const byDay = Object.entries(scopedRows.reduce((result, item) => {
    const day = String(item.time || "").slice(0, 10) || "未记录";
    result[day] ||= { day, count: 0, highRisk: 0, pending: 0 };
    result[day].count += 1;
    if (item.risk === "高风险") result[day].highRisk += 1;
    if (item.status !== "已处理") result[day].pending += 1;
    return result;
  }, {}))
    .map(([, value]) => value)
    .sort((a, b) => String(a.day).localeCompare(String(b.day)));
  // 复制后按数量排序寻找峰值，不破坏前面用于趋势展示的日期顺序。
  const peak = [...byDay].sort((a, b) => b.count - a.count)[0];

  return buildResult({
    intent: "trend",
    answer: `${rangeText(range)}异常趋势按天统计共 ${scopedRows.length} 起。${peak ? `峰值出现在 ${peak.day}，共 ${peak.count} 起，其中高风险 ${peak.highRisk} 起。` : "暂无异常趋势数据。"}`,
    range: rangeMeta(range),
    columns: [
      { title: "日期", key: "day" },
      { title: "异常数", key: "count" },
      { title: "高风险", key: "highRisk" },
      { title: "未闭环", key: "pending" }
    ],
    rows: byDay,
    exportFileName: `${range.label}异常趋势.csv`
  });
}

// 对无法归入固定统计意图但包含业务关键词的问题执行多字段模糊检索。
function answerSearch(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const gate = selectedGate(question);
  const risk = selectedRisk(question);
  const status = selectedStatus(question);
  // 移除时间词、通用请求词和“异常”等停用词，尽量保留真正用于检索的业务关键词。
  const keyword = String(question || "")
    .replace(/今天|今日|昨天|昨日|本月|这个月|最近|近|过去|\d+\s*天|一周|两周|一个月|异常|事件|有哪些|列表|明细|导出|查询|帮我|请|的/g, "")
    .trim();
  const filtered = sortByTimeDesc(scopedRows.filter((item) => {
    if (gate && item.gate !== gate) return false;
    if (risk && item.risk !== risk) return false;
    if (status && item.status !== status) return false;
    if (!keyword) return true;
    // 将异常常用展示字段连接后执行包含匹配。
    const text = [item.id, item.person, item.personType, item.gate, item.method, item.type, item.reason, item.risk, item.status].join(" ");
    return text.includes(keyword);
  })).map(compactException);

  return buildResult({
    intent: "search",
    answer: `${rangeText(range)}按当前问题检索到 ${filtered.length} 起异常事件。`,
    range: rangeMeta(range),
    columns: exceptionColumns(),
    rows: filtered,
    exportFileName: `${range.label}异常检索结果.csv`
  });
}

// 生成指定时间范围的异常概览，包括总数、待闭环、高风险、高发校门和高发类型。
function answerOverview(rows, question) {
  const { range, rows: scopedRows } = rowsInQuestionRange(rows, question);
  const pending = scopedRows.filter((item) => item.status !== "已处理").length;
  const highRisk = scopedRows.filter((item) => item.risk === "高风险").length;
  const hotGate = groupRows(scopedRows, "gate")[0];
  const hotType = groupRows(scopedRows, "type")[0];

  return buildResult({
    intent: "overview",
    answer: `${rangeText(range)}异常总数 ${scopedRows.length} 起，待闭环 ${pending} 起，高风险 ${highRisk} 起。高发校门：${hotGate ? `${hotGate.name} ${hotGate.count} 起` : "无"}；高发类型：${hotType ? `${hotType.name} ${hotType.count} 起` : "无"}。`,
    range: rangeMeta(range),
    columns: exceptionColumns(),
    rows: sortByTimeDesc(scopedRows).slice(0, 12).map(compactException),
    exportFileName: `${range.label}异常概览.csv`
  });
}

// 对话智能体总入口：结合数据库异常、当前问题、有限历史和选中上下文进行意图路由。
export function answerExceptionDialogue(data, question, history = [], context = {}) {
  // 数据结构异常时使用空数组，保证帮助和兜底回答仍可正常返回。
  const rows = Array.isArray(data?.exceptions) ? data.exceptions : [];
  const text = normalizeQuestion(question);
  // 只取最近一条有内容的用户消息，用于解析“这些、上面、刚才”等指代。
  const previous = [...history].reverse().find((item) => item.role === "user" && item.content);
  const interpreted = /(这些|它们|上面|刚才)/.test(text) && previous
    ? `${previous.content} ${question}`
    : question;
  const queryText = normalizeQuestion(interpreted);

  // 空问题、问候语或能力询问统一进入帮助意图。
  if (!queryText || /^(你好|您好|hi|hello|在吗)$/.test(queryText) || /帮助|能问什么|可以回答什么|回答什么|支持什么|怎么问|示例/.test(queryText)) {
    return answerHelp(rows.length);
  }

  // 显式编号或当前选中对象优先进入单条异常分析，避免被后续通用关键词截获。
  const referencedException = findExceptionByReference(rows, interpreted, context);
  if (referencedException || /单个|当前|选中|这条|这个|该异常|编号|详情|详细|分析一下/.test(queryText) && /异常|事件|E\d{8,}/i.test(queryText)) {
    return answerSingleException(rows, referencedException);
  }

  // 以下分支按优先级进行确定性意图匹配：趋势、分布、概览、建议、原因、排行和明细。
  if (/趋势|走势|变化|按天|每天|每日|峰值|高峰|时段|小时/.test(queryText)) {
    return answerTrend(rows, interpreted);
  }
  if (/分布|占比|比例|构成|统计/.test(queryText)) {
    return answerDistribution(rows, interpreted);
  }
  if (/总体|整体|总览|概览|总结|分析报告|闭环率|处理率/.test(queryText)) {
    return answerOverview(rows, interpreted);
  }
  if (/建议|怎么处理|如何处理|处置|措施|优先处理|先处理哪/.test(queryText)) {
    return answerSuggestion(rows, interpreted);
  }
  if (/原因|归因|为什么|集中在哪|类型|类别|高发类型/.test(queryText)) {
    return answerReason(rows, interpreted);
  }
  if (/哪个门|哪.*门|校门.*最多|最多.*校门|高发校门|排行|排名/.test(queryText)) {
    return answerHotGate(rows, interpreted);
  }
  if (/高风险|中风险|低风险|待处理|未处理|待闭环|已处理|明细|有哪些|列表|导出/.test(queryText)) {
    return answerRiskOrStatus(rows, interpreted);
  }
  if (/异常|事件|风险|趋势|概览|总数|多少/.test(queryText)) {
    return answerOverview(rows, interpreted);
  }
  // 出现具体校门或凭证、人员、失败原因关键词时，使用多字段检索回答。
  if (selectedGate(interpreted) || /二维码|人脸|校园卡|车牌|人员|老师|学生|访客|校友|失败|过期|未找到|无法识别/.test(queryText)) {
    return answerSearch(rows, interpreted);
  }

  // 问题没有明确指向异常领域时说明能力边界，坚决不使用数据库外信息猜测。
  return buildResult({
    intent: "fallback",
    answer: "我现在专门负责异常事件分析。这个问题没有明确指向异常事件，我不能乱猜。你可以问：近期哪个门异常最多、本月待处理异常有哪些、高风险异常有哪些、异常原因主要集中在哪里、这些异常该怎么处置。"
  });
}
