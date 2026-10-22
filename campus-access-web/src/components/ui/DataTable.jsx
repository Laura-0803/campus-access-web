// Badge 统一渲染状态色；React Hook 分别处理分页副作用、派生行缓存和当前页状态。
import Badge from "./Badge.jsx";
import { useEffect, useMemo, useState } from "react";

// 绿色语义集合：表示正常、完成、可用、开放或已认证等正向状态。
const successValues = new Set([
  "正常",
  "已通过",
  "在线",
  "已处理",
  "低风险",
  "有效",
  "启用",
  "开放",
  "生效",
  "已移出",
  "成功",
  "已上传",
  "已认证"
]);

// 橙色语义集合：表示等待、处理中、需要关注或中等风险等过渡状态。
const warningValues = new Set([
  "待审核",
  "待被访人审核",
  "待保卫处审核",
  "处理中",
  "中风险",
  "维护中",
  "待复核",
  "待处理",
  "预约中"
]);

// 红色语义集合：表示异常、失败、停用、过期或高风险等负向状态。
const dangerValues = new Set([
  "异常",
  "未通过",
  "离线",
  "故障",
  "高风险",
  "已过期",
  "停用",
  "锁定",
  "失败",
  "已失效"
]);

// 这些字段约定为日期时间，统一交给 formatDateTime 标准化显示格式。
const dateTimeKeys = new Set([
  "time",
  "createdAt",
  "updatedAt",
  "reviewedAt",
  "handledAt",
  "validFrom",
  "validTo",
  "lastAccess",
  "removedAt"
]);

/** 根据单元格的业务值选择 Badge 语义类型；未知状态保持中性样式。 */
function statusType(value) {
  if (successValues.has(value)) return "success";
  if (warningValues.has(value)) return "warning";
  if (dangerValues.has(value)) return "danger";
  return "default";
}

/**
 * 将后端常见的 YYYY-MM-DDTHH:mm[:ss] 统一显示为空格分隔的秒级时间。
 * 不符合已知格式的值原样返回，避免擅自改变日期、纯时间或自定义文本。
 */
function formatDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) return text.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) return `${text.replace("T", " ")}:00`;
  return text;
}

/** 按字段类型把原始值转换为适合表格展示的内容。 */
function renderValue(value, key) {
  // 数组值使用中文顿号连接，适合展示校门列表、权限列表等多值字段。
  if (Array.isArray(value)) return value.join("、");
  // 缺失值统一显示短横线，避免表格中出现 undefined/null 或完全空白。
  if (value === undefined || value === null || value === "") return "-";
  if (dateTimeKeys.has(key)) return formatDateTime(value);
  return value;
}

/**
 * 通用数据表格。
 * columns 描述列键、标题、可选 render 和 badge；rows 是业务记录；pageSize 控制前端分页大小。
 */
export default function DataTable({ columns, rows = [], pageSize = 10 }) {
  // page 从 1 开始，更符合界面页码习惯；总页数至少为 1，空表也不会出现第 0 页。
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  // start 是当前页在完整数组中的零基起始下标。
  const start = (page - 1) * pageSize;
  // 仅当行数据、起始位置或每页数量变化时重新截取当前页，减少无意义计算。
  const visibleRows = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize]);

  // 筛选或重新加载导致 rows 引用变化时回到第一页，避免停留在旧数据的深页码。
  useEffect(() => {
    setPage(1);
  }, [rows]);

  // 数据量减少时把当前页收敛到新总页数，确保 visibleRows 始终落在有效范围。
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    // 外层裁剪圆角；内层允许窄屏横向滚动，避免压缩列内容破坏可读性。
    <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white/60">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50/80 text-xs text-slate-400">
            <tr>
              {/* 表头完全由 columns 配置驱动，key 同时作为 React 稳定标识。 */}
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium">{column.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 空数据时渲染跨全部列的提示；有数据时只遍历当前页切片。 */}
            {rows.length === 0 ? (
              <tr className="border-t border-slate-100 text-slate-400">
                <td className="px-4 py-8 text-center" colSpan={columns.length}>暂无数据</td>
              </tr>
            ) : visibleRows.map((row, index) => (
              // 优先使用业务 id；没有 id 时组合页码与行号，保证当前页内 key 唯一。
              <tr key={row.id || `${page}-${index}`} className="border-t border-slate-100 text-slate-600">
                {columns.map((column) => {
                  // 自定义 render 可读取整行构造复杂内容，否则使用字段键读取并做通用格式化。
                  const value = column.render ? column.render(row) : renderValue(row[column.key], column.key);
                  return (
                    <td key={column.key} className="px-4 py-3">
                      {/* badge=true 的列使用状态徽标，否则原样显示文本或 React 节点。 */}
                      {column.badge ? <Badge type={statusType(value)}>{value}</Badge> : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 数据超过一页时才显示分页栏，单页和空表保持界面简洁。 */}
      {rows.length > pageSize && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white/70 px-4 py-3 text-xs text-slate-400">
          <span>共 {rows.length} 条，每页 {pageSize} 条，第 {page} / {totalPages} 页</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              // 使用函数式更新读取最新页码，并通过 Math.max 阻止页码小于 1。
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              // 下一页同样限制在 totalPages 以内，按钮在末页时也会禁用。
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
