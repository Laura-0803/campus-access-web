/**
 * 通用状态徽标。
 * children 是徽标正文，type 决定语义色；未指定类型时使用中性的灰色样式。
 */
export default function Badge({ children, type = "default" }) {
  // 将业务语义映射到 Tailwind 背景色与文字色，保证不同页面的状态表达一致。
  const map = {
    default: "bg-slate-100 text-slate-600",
    primary: "bg-primarySoft text-primary",
    success: "bg-green-50 text-success",
    warning: "bg-orange-50 text-warning",
    danger: "bg-red-50 text-danger",
    info: "bg-cyanSoft text-cyan-700"
  };
  // 模板字符串拼接公共胶囊外观与当前语义色，children 可为文字或其他内联节点。
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${map[type]}`}>
      {children}
    </span>
  );
}
