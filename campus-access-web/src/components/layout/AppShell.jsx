// useState 控制移动端侧栏；Outlet 渲染当前命中的嵌套路由页面。
import { useState } from "react";
import { Outlet } from "react-router-dom";
import AnnouncementBar from "./AnnouncementBar.jsx";
import SideBar from "./SideBar.jsx";
import TopBar from "./TopBar.jsx";

/**
 * 登录后页面的统一应用外壳。
 * 负责组合侧栏、顶部栏、公告栏、全局接口错误和滚动内容区，具体业务页由 Outlet 注入。
 */
export default function AppShell({ session, onLogout, apiError }) {
  // 桌面侧栏始终可见；menuOpen 只控制小屏抽屉式侧栏的展开状态。
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // 最外层锁定视口高度并隐藏整体滚动，滚动行为交给内部主内容区管理。
    <div className="h-screen overflow-hidden bg-page bg-aurora p-4 text-textMain md:p-6">
      {/* 中央容器根据外边距计算精确高度，使用毛玻璃背景和最大宽度约束超宽屏布局。 */}
      <div className="mx-auto flex h-[calc(100vh-32px)] max-w-[1600px] overflow-hidden rounded-[34px] bg-white/60 shadow-soft ring-1 ring-white/70 backdrop-blur-2xl md:h-[calc(100vh-48px)]">
        {/* 关闭回调会在点击菜单项、遮罩或关闭按钮时收起移动端侧栏。 */}
        <SideBar session={session} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* 顶栏向上转发退出操作，并提供打开移动端菜单的回调。 */}
          <TopBar session={session} onLogout={onLogout} onMenu={() => setMenuOpen(true)} />
          {/* API 根层错误存在时插入醒目但不遮挡页面的提示条。 */}
          {apiError && (
            <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-700 md:px-8">
              {apiError}
            </div>
          )}
          {/* 公告栏自行加载并轮询公告；无公告时组件返回 null，不占据布局高度。 */}
          <AnnouncementBar session={session} />
          {/* 仅业务内容区纵向滚动，顶部导航和公告始终保持在可视区域。 */}
          <section className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </section>
        </main>
      </div>
    </div>
  );
}
