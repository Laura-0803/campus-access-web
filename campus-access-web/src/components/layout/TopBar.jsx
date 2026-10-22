// 图标提供退出、移动端菜单和安全认证视觉提示；roleLabels 把角色键转换成中文。
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { roleLabels } from "../../config/roles.js";

/** 顶部导航栏，展示系统名称、当前身份、当前人员，并承载移动端菜单和退出入口。 */
export default function TopBar({ session, onLogout, onMenu }) {
  // 会话尚未完整恢复时临时按学生角色渲染，避免读取空键导致界面出现 undefined。
  const role = session?.user?.role || "student";

  return (
    // 固定高度与半透明背景让顶栏在内容滚动时保持稳定的视觉层级。
    <header className="flex h-[72px] items-center justify-between border-b border-white/70 bg-white/55 px-5 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-4">
        {/* 仅小屏显示菜单按钮，桌面端由常驻 SideBar 提供导航。 */}
        <button onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-2xl bg-white/80 text-slate-500 lg:hidden">
          <Menu size={20} />
        </button>
        <div>
          {/* 主标题标识当前系统，副标题根据会话角色动态变化。 */}
          <div className="text-sm font-semibold md:text-base">智慧校园出入管理信息系统</div>
          <div className="text-xs text-slate-400">{roleLabels[role]} / 多源身份认证通行</div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-slate-500">
        {/* 窄屏隐藏身份胶囊和姓名以节省空间，但始终保留退出按钮。 */}
        <span className="hidden rounded-full bg-primarySoft px-3 py-1 text-xs text-primary sm:inline">
          {roleLabels[role]}
        </span>
        <div className="hidden items-center gap-2 text-sm sm:flex">
          <ShieldCheck size={17} className="text-success" />
          {session?.profile?.name}
        </div>
        {/* 退出逻辑由 App 根组件提供，顶栏只负责触发。 */}
        <button onClick={onLogout} className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2 text-sm shadow-card">
          <LogOut size={16} />
          退出
        </button>
      </div>
    </header>
  );
}
