// NavLink 根据当前路径提供激活状态；图标用于底部帮助/退出入口；iconRail 提供轨道菜单配置。
import { NavLink } from "react-router-dom";
import { HelpCircle, LogOut } from "lucide-react";
import { iconRail } from "../../config/roles.js";

/** 紧凑型图标导航轨道，适合中等及以上宽度下用纯图标节省横向空间。 */
export default function IconRail() {
  return (
    // 小屏隐藏，md 断点后显示为固定宽度的纵向半透明侧栏。
    <aside className="hidden w-[78px] flex-col items-center border-r border-white/70 bg-white/50 py-6 backdrop-blur-xl md:flex">
      {/* 顶部品牌标记使用渐变背景和“校”字表达校园系统入口。 */}
      <div className="mb-8 grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary2 text-white shadow-glow">
        <span className="text-xl font-black">校</span>
      </div>

      {/* 主菜单占据剩余高度；每项从配置中取得图标组件、辅助标题和目标路径。 */}
      <div className="flex flex-1 flex-col gap-4">
        {iconRail.map(({ icon: Icon, label, path }, index) => (
          <NavLink
            key={label}
            to={path}
            title={label}
            // NavLink 通过 isActive 提供当前地址匹配结果，并据此切换选中样式。
            className={({ isActive }) =>
              [
                "grid h-12 w-12 place-items-center rounded-2xl transition",
                isActive || index === 0
                  ? "bg-primarySoft text-primary shadow-card"
                  : "bg-white/70 text-slate-500 hover:bg-primarySoft hover:text-primary"
              ].join(" ")
            }
          >
            {/* 动态组件 Icon 来自当前配置项，统一使用 20 像素尺寸。 */}
            <Icon size={20} />
          </NavLink>
        ))}
      </div>

      {/* 辅助操作固定在底部；当前组件只呈现外观，具体行为可由后续调用方接入。 */}
      <div className="flex flex-col gap-3">
        <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-slate-500">
          <HelpCircle size={19} />
        </button>
        <button className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-slate-500">
          <LogOut size={19} />
        </button>
      </div>
    </aside>
  );
}
