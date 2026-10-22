// 路由 Hook 提供当前路径和激活链接；React Hook 管理分组展开与派生菜单；API Hook 加载异常数量。
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client.js";
import { useApiData } from "../../api/useApiData.js";
import { roleLabels, roleMenuGroups, roleMenus, roleProfiles } from "../../config/roles.js";

/**
 * 角色化侧栏导航。
 * 桌面端常驻显示，移动端根据 open 以抽屉形式出现；菜单、档案和异常角标均随会话角色变化。
 */
export default function SideBar({ session, open = false, onClose }) {
  // 当前路径用于高亮菜单并自动展开其所属分组。
  const location = useLocation();
  // 会话未就绪时使用 student 作为安全默认键，确保后续配置读取有结果。
  const role = session?.user?.role || "student";
  // 默认角色档案提供完整字段，会话中的真实档案后展开，因此同名字段会覆盖默认值。
  const profile = {
    ...(roleProfiles[role] || {}),
    ...(session?.profile || {})
  };
  // 扁平菜单是所有角色的基础配置。
  const menus = roleMenus[role] || [];
  // 管理员/门岗使用显式分组；其他角色包装成单个“主导航”分组，渲染逻辑保持统一。
  const menuGroups = useMemo(
    () => roleMenuGroups[role] || [{ title: "主导航", items: menus }],
    [role, menus]
  );
  // 初始只展开包含当前路径的分组；无法匹配时默认展开第一个分组。
  const [openGroups, setOpenGroups] = useState(() => {
    const active = menuGroups.find((group) => group.items.some((item) => item.path === location.pathname));
    return { [active?.title || menuGroups[0]?.title || "主导航"]: true };
  });
  // 管理员和门岗可读取全部异常；个人角色通过角色驾驶舱接口取得与本人相关的异常。
  const exceptionLoader = role === "admin" || role === "guard"
    ? () => api.exceptions()
    : () => api.roleDashboard(role, session.user.id).then((data) => data.exceptions || []);
  // 用户或角色变化时重新加载；异常菜单角标只统计尚未处理的记录。
  const { data: exceptionRows } = useApiData(exceptionLoader, [], [role, session?.user?.id]);
  const exceptionCount = exceptionRows.filter((item) => item.status !== "已处理").length;

  // 路由变化后确保新页面所属分组已展开，但保留用户手动打开的其他分组状态。
  useEffect(() => {
    const active = menuGroups.find((group) => group.items.some((item) => item.path === location.pathname));
    if (!active) return;
    setOpenGroups((current) => ({ ...current, [active.title]: true }));
  }, [location.pathname, menuGroups]);

  /** 切换指定分组的展开状态，使用函数式更新避免连续点击读取旧状态。 */
  function toggleGroup(title) {
    setOpenGroups((current) => ({ ...current, [title]: !current[title] }));
  }

  /**
   * 单个菜单链接组件。
   * nested 表示它位于可折叠分组内，用于调整图标尺寸和文字颜色；异常入口会附加待处理数量。
   */
  function MenuLink({ item, nested = false }) {
    // icon 字段是组件引用，重命名为大写 Icon 后可直接作为 JSX 标签使用。
    const { label, path, icon: Icon } = item;

    return (
      <NavLink
        to={path}
        onClick={onClose}
        // 根据激活状态与嵌套层级组合类名，最后 join 成 Tailwind className 字符串。
        className={({ isActive }) =>
          [
            "flex items-center justify-between rounded-2xl text-sm transition",
            nested ? "px-3 py-2.5" : "px-3 py-2.5",
            isActive
              ? "bg-primarySoft text-primary shadow-card"
              : nested
                ? "text-slate-500 hover:bg-white/80 hover:text-slate-700"
                : "text-slate-600 hover:bg-white/80"
          ].join(" ")
        }
      >
        <span className="flex items-center gap-2.5 whitespace-nowrap">
          <Icon size={nested ? 16 : 17} />
          {label}
        </span>
        {/* 仅名称包含“异常”的入口显示红色角标，数量为零时不占空间。 */}
        {label.includes("异常") && exceptionCount > 0 && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs text-danger">{exceptionCount}</span>
        )}
      </NavLink>
    );
  }

  // content 同时复用于桌面侧栏和移动抽屉，避免两套导航结构产生行为差异。
  const content = (
    <>
      {/* 用户摘要区：头像、姓名、说明和在线状态；关闭按钮仅在移动端出现。 */}
      <div className="mb-4 flex items-center gap-2.5">
        <img src={profile.avatar} className="h-10 w-10 rounded-2xl bg-white shadow-card" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{profile.name}</div>
          <div className="text-xs text-slate-400">{profile.title}</div>
          <div className="mt-0.5 text-xs text-success">● {profile.status}</div>
        </div>
        <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-white/80 text-slate-400 lg:hidden">
          <X size={17} />
        </button>
      </div>

      {/* 当前身份卡片同时展示中文角色名称、账号类型和登录账号。 */}
      <div className="mb-4 rounded-2xl bg-white/80 px-3 py-3 text-sm shadow-innerSoft">
        <div className="text-xs text-slate-400">当前身份</div>
        <div className="mt-1 font-medium text-primary">{roleLabels[role]}</div>
        <div className="mt-1 text-xs text-slate-400">{session?.user?.accountType}：{session?.user?.username}</div>
      </div>

      {/* 菜单按分组渲染：单项组直接显示链接，多项组显示可折叠标题。 */}
      <div className="space-y-1.5">
        {menuGroups.map((group) => {
          // 只有一个入口的分组无需额外点击展开，减少一层交互。
          if (group.items.length === 1) {
            return <MenuLink key={group.title} item={group.items[0]} />;
          }

          return (
            <div key={group.title} className="rounded-2xl">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-white/80"
              >
                <span className="whitespace-nowrap">{group.title}</span>
                <ChevronDown
                  size={16}
                  className={[
                    "text-slate-400 transition-transform",
                    // 展开时旋转箭头，提供清晰的视觉状态反馈。
                    openGroups[group.title] ? "rotate-180" : ""
                  ].join(" ")}
                />
              </button>
              {/* 仅展开时挂载子菜单；左边框表现层级关系。 */}
              {openGroups[group.title] && (
                <div className="mt-1 space-y-1 border-l border-slate-100 pl-2">
                  {group.items.map((item) => (
                    <MenuLink key={item.label} item={item} nested />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </>
  );

  return (
    <>
      {/* 移动端抽屉打开时显示全屏半透明遮罩，点击遮罩即可关闭。 */}
      {open && <div onClick={onClose} className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" />}
      {/* 大屏常驻侧栏：自身可滚动，长菜单不会推高整体应用。 */}
      <aside className="hidden max-h-full w-[220px] shrink-0 self-start overflow-y-auto border-r border-white/70 bg-white/50 px-3 py-5 backdrop-blur-xl lg:block">
        {content}
      </aside>
      {/* 小屏抽屉通过 translate-x 在屏幕内外切换，并保留过渡动画。 */}
      <aside className={[
        "fixed left-4 top-4 z-40 h-[calc(100vh-32px)] w-[248px] overflow-y-auto rounded-[28px] border border-white/70 bg-white/90 px-3 py-5 shadow-soft backdrop-blur-xl transition-transform lg:hidden",
        // open 为真时归位，否则向左移出视口。
        open ? "translate-x-0" : "-translate-x-[284px]"
      ].join(" ")}>
        {content}
      </aside>
    </>
  );
}
