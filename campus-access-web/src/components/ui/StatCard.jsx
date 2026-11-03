// 统计卡片语义色映射：同一 type 同时控制徽标文字色与浅色背景。
const colorMap = {
  primary: "text-primary border-blue-100 bg-primarySoft",
  success: "text-success border-green-100 bg-green-50",
  warning: "text-warning border-orange-100 bg-orange-50",
  danger: "text-danger border-red-100 bg-red-50"
};

/**
 * 首页统计指标卡片。
 * title 是指标名称，value 是醒目的主值，desc 提供口径或变化说明，
 * type 控制右上角徽标颜色，badge 传入空值时可隐藏徽标。
 */
export default function StatCard({ title, value, desc, type = "primary", badge = "实时" }) {
  return (
    // 外层保持与 Panel 相同的卡片视觉体系，使驾驶舱多种信息块风格统一。
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">{title}</span>
        {/* badge 为真时才显示；颜色由 type 在 colorMap 中查得。 */}
        {badge && <span className={`rounded-lg border px-2 py-1 text-xs font-medium ${colorMap[type]}`}>{badge}</span>}
      </div>
      {/* 主值使用大号粗体突出，描述文字使用弱化颜色补充上下文。 */}
      <div className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{value}</div>
      <div className="mt-2 text-sm leading-5 text-slate-500">{desc}</div>
    </div>
  );
}
