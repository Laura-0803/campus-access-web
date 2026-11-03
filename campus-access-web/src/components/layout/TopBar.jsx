// 图标提供退出、移动端菜单和安全认证视觉提示；roleLabels 把角色键转换成中文。
import { ChevronRight, LogOut, Menu, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import { roleLabels } from "../../config/roles.js";

const pageTitles = {
  student: "学生首页", teacher: "教职工首页", visitor: "访客预约", alumni: "校友首页",
  guard: "门岗工作台", admin: "管理驾驶舱", profile: "个人信息", face: "人脸照片",
  vehicle: "车牌管理", vehicles: "车辆信息管理", review: "预约审核", appointments: "预约监管",
  "appointment-status": "预约状态", "visitor-qr": "访客二维码", "alumni-qr": "校友二维码",
  monitor: "实时通行监控", "identity-check": "现场通行处理",
  "account-status": "账号状态管理", records: "出入记录", exceptions: "异常事件",
  devices: "设备管理", reports: "统计报表", people: "人员信息管理", rules: "通行规则",
  blacklist: "黑名单管理", announcements: "公告管理", logs: "操作日志"
};

/** 顶部导航栏，展示系统名称、当前身份、当前人员，并承载移动端菜单和退出入口。 */
export default function TopBar({ session, onLogout, onMenu }) {
  // 会话尚未完整恢复时临时按学生角色渲染，避免读取空键导致界面出现 undefined。
  const role = session?.user?.role || "student";
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname.split("/").filter(Boolean).at(-1)] || "工作台";

  return (
    // 固定高度与半透明背景让顶栏在内容滚动时保持稳定的视觉层级。
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {/* 仅小屏显示菜单按钮，桌面端由常驻 SideBar 提供导航。 */}
        <button aria-label="打开导航菜单" onClick={onMenu} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 lg:hidden">
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          {/* 主标题标识当前系统，副标题根据会话角色动态变化。 */}
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
            <span className="hidden truncate sm:inline">智慧校园出入管理</span>
            <ChevronRight size={13} className="hidden sm:block" />
            <span>{roleLabels[role]}</span>
          </div>
          <h1 className="truncate text-base font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 text-slate-500 sm:gap-3">
        {/* 窄屏隐藏身份胶囊和姓名以节省空间，但始终保留退出按钮。 */}
        <span className="hidden rounded-lg border border-blue-100 bg-primarySoft px-2.5 py-1 text-xs font-medium text-primary md:inline">
          {roleLabels[role]}
        </span>
        <div className="hidden items-center gap-2 text-sm lg:flex">
          <ShieldCheck size={17} className="text-success" />
          {session?.profile?.name}
        </div>
        {/* 退出逻辑由 App 根组件提供，顶栏只负责触发。 */}
        <button aria-label="退出登录" onClick={onLogout} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium hover:border-slate-300 hover:bg-slate-50">
          <LogOut size={16} />
          退出
        </button>
      </div>
    </header>
  );
}
