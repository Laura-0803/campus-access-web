/**
 * 页面通用内容面板。
 * title/subtitle 构成左侧标题区，action 放置右侧按钮或筛选器，children 承载主体内容，
 * className 允许业务页面在保留统一圆角、背景和阴影的基础上追加布局样式。
 */
export default function Panel({ title, subtitle, action, children, className = "" }) {
  return (
    // 默认使用半透明白底、卡片圆角和轻阴影，附加类名放在最后以支持业务侧扩展。
    <section className={`rounded-card bg-white/80 p-5 shadow-card ring-1 ring-white/80 ${className}`}>
      {/* 仅在标题、副标题或操作区至少存在一项时渲染头部，避免产生无意义空白。 */}
      {(title || subtitle || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {/* 每个文本节点都按需渲染，调用方可以只提供标题或只提供说明。 */}
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          {/* action 原样渲染，通常传入按钮、链接或一组筛选控件。 */}
          {action}
        </div>
      )}
      {/* 面板主体不做数据假设，完全由调用方传入。 */}
      {children}
    </section>
  );
}
