// Pie/PieChart 构建环形图，Cell 分别着色，ResponsiveContainer 负责响应式尺寸，Tooltip 展示精确值。
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// 颜色顺序与页面风险数据顺序约定一致：低风险绿色、中风险橙色、高风险红色。
const colors = ["#22C55E", "#F59E0B", "#EF4444"];

/** 风险分布环形图；父页面可调整高度和内外半径，以适配不同卡片尺寸。 */
export default function RiskDonutChart({ data = [], className = "h-[230px]", innerRadius = 56, outerRadius = 82 }) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* dataKey=value 指定扇区数值；内半径大于零形成圆环；paddingAngle 分隔相邻风险等级。 */}
          <Pie
            data={data}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={6}
            dataKey="value"
          >
            {/* 每个数据项生成一个 Cell，并按相同下标取得约定颜色。 */}
            {data.map((_, index) => (
              <Cell key={index} fill={colors[index]} />
            ))}
          </Pie>
          {/* 悬停扇区时显示 Recharts 默认名称和值提示。 */}
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
