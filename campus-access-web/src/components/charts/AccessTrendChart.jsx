// Recharts 提供自适应容器、折线图坐标系、提示框和两条业务折线。
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

/**
 * 通行趋势折线图。
 * data 每项应包含 day、count 和 exceptions；className 允许父页面控制图表高度。
 */
export default function AccessTrendChart({ data = [], className = "h-[260px]" }) {
  return (
    <div className={className}>
      {/* 自适应容器读取父级实际宽高，使图表随卡片和窗口尺寸变化。 */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {/* 浅色虚线网格帮助比较不同日期数值，同时降低视觉干扰。 */}
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          {/* 横轴读取日期 day，纵轴由 Recharts 根据数值范围自动计算。 */}
          <XAxis dataKey="day" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          {/* 鼠标悬停时显示当前日期两项指标的精确值。 */}
          <Tooltip />
          {/* 紫色主线表示总通行量，红色辅线表示异常数量。monotone 使折线平滑连接。 */}
          <Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="exceptions" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
