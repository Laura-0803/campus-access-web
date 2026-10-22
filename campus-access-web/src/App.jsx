// 路由组件负责声明页面映射、执行重定向并读取当前位置；React Hook 保存会话并监听全局事件。
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
// AppShell 是登录后所有业务页面共享的外层布局，LoginPage 是未登录用户的独立入口。
import AppShell from "./components/layout/AppShell.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
// 普通角色驾驶舱集中定义于 RoleDashboard，并以具名组件形式导入。
import {
  AlumniDashboard,
  GuardDashboard,
  StudentDashboard,
  TeacherDashboard,
  VisitorDashboard
} from "./pages/RoleDashboard.jsx";
// 各业务功能页集中定义于 FeaturePages，路由层只负责按路径和角色选择对应组件。
import {
  AnnouncementPage,
  AppointmentReviewPage,
  AppointmentStatusPage,
  BlacklistPage,
  DevicesPage,
  ExceptionCenterPage,
  FaceUploadPage,
  IdentityCheckPage,
  LogsPage,
  MonitorPage,
  PeopleManagementPage,
  ProfilePage,
  QRPage,
  ReportsPage,
  RulesPage,
  ScanSimulatorPage,
  AccountStatusPage,
  VehiclePage
} from "./pages/FeaturePages.jsx";
// api 提供注销请求；homePathByRole 维护不同角色的默认首页。
import { api } from "./api/client.js";
import { homePathByRole } from "./config/roles.js";

/**
 * 从 localStorage 恢复上一次登录会话。
 * useState 会把本函数作为惰性初始化器，只在 App 首次挂载时执行一次，避免每次渲染重复解析。
 */
function loadSession() {
  try {
    // 没有缓存时返回 null；存在时把 JSON 字符串还原成包含 token、user 等字段的会话对象。
    const raw = localStorage.getItem("campus_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    // 缓存损坏不应阻止应用启动，按未登录状态进入登录页即可。
    return null;
  }
}

/** 根据当前会话角色跳到对应首页；未知角色或空会话统一回到登录页。 */
function HomeRedirect({ session }) {
  // replace 替换当前历史记录，避免用户点击后退再次落入重定向页面。
  return <Navigate to={homePathByRole[session?.user?.role] || "/login"} replace />;
}

/**
 * 登录保护布局：未登录时记录原访问路径并跳转登录页，已登录时渲染统一应用外壳。
 * 子路由通过 AppShell 内部的 Outlet 显示在主内容区域。
 */
function ProtectedLayout({ session, onLogout, apiError }) {
  // 保存当前路径，使登录页未来可以知道用户原本试图访问的位置。
  const location = useLocation();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <AppShell session={session} onLogout={onLogout} apiError={apiError} />;
}

/**
 * 角色权限门：roles 是允许访问的角色键数组。
 * 无权限用户不展示错误页面，而是返回自己的角色首页，避免越权页面内容短暂闪现。
 */
function RoleGate({ session, roles, children }) {
  if (!roles.includes(session?.user?.role)) {
    return <HomeRedirect session={session} />;
  }

  return children;
}

/** 应用根组件：统一管理登录会话、全局接口错误、受保护布局和全部前端路由。 */
export default function App() {
  // session 使用惰性函数从本地恢复；apiError 保存全局限时错误提示文本。
  const [session, setSession] = useState(loadSession);
  const [apiError, setApiError] = useState("");

  // 首次挂载时订阅 API 层广播的认证过期和普通请求错误事件。
  useEffect(() => {
    // 令牌过期时只需清空 React 会话；后续持久化副作用会同步清理本地缓存。
    function handleAuthExpired() {
      setSession(null);
    }
    // 展示最近一次错误，并重置五秒自动关闭计时，连续错误不会互相叠加多个定时器。
    function handleApiError(event) {
      setApiError(event.detail?.message || "请求失败");
      window.clearTimeout(handleApiError.timer);
      handleApiError.timer = window.setTimeout(() => setApiError(""), 5000);
    }

    // 自定义事件让无 React 依赖的 API 客户端可以通知应用根组件。
    window.addEventListener("campus:auth-expired", handleAuthExpired);
    window.addEventListener("campus:api-error", handleApiError);
    // 卸载时注销监听并清理计时器，防止重复监听和卸载后的状态更新。
    return () => {
      window.removeEventListener("campus:auth-expired", handleAuthExpired);
      window.removeEventListener("campus:api-error", handleApiError);
      window.clearTimeout(handleApiError.timer);
    };
  }, []);

  // 每当会话变化时同步 localStorage，保证刷新页面后仍能恢复登录状态。
  useEffect(() => {
    if (session) {
      // 保存完整会话和角色键，供 API 客户端及其他兼容逻辑读取。
      localStorage.setItem("campus_session", JSON.stringify(session));
      localStorage.setItem("campus_role", session.user.role);
    } else {
      // 退出或过期时一次性清除所有历史版本使用过的认证缓存键。
      localStorage.removeItem("campus_session");
      localStorage.removeItem("campus_token");
      localStorage.removeItem("campus_user");
    }
  }, [session]);

  /** 调用后端销毁会话；即使服务器令牌已过期，本地退出仍必须完成。 */
  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Local logout should still succeed if the server session already expired.
    }
    // 清空根组件会话后，受保护布局会自动把用户送回登录页。
    setSession(null);
  }

  return (
    // Routes 从上到下匹配当前地址，并只渲染命中的路由分支。
    <Routes>
      {/* 登录页：已有会话时不允许重复登录，直接进入当前角色首页。 */}
      <Route
        path="/login"
        element={session ? <HomeRedirect session={session} /> : <LoginPage onLogin={setSession} />}
      />

      {/* 以下路由共享登录保护和 AppShell；未登录访问任何子路由都会先跳转登录页。 */}
      <Route element={<ProtectedLayout session={session} onLogout={handleLogout} apiError={apiError} />}>
        {/* 根路径不承载页面，按角色重定向到各自驾驶舱。 */}
        <Route path="/" element={<HomeRedirect session={session} />} />

        {/* 六类角色首页：每个驾驶舱仅允许完全匹配的角色访问。 */}
        <Route path="/student" element={<RoleGate session={session} roles={["student"]}><StudentDashboard session={session} /></RoleGate>} />
        <Route path="/teacher" element={<RoleGate session={session} roles={["teacher"]}><TeacherDashboard session={session} /></RoleGate>} />
        <Route path="/visitor" element={<RoleGate session={session} roles={["visitor"]}><VisitorDashboard session={session} /></RoleGate>} />
        <Route path="/alumni" element={<RoleGate session={session} roles={["alumni"]}><AlumniDashboard session={session} /></RoleGate>} />
        <Route path="/guard" element={<RoleGate session={session} roles={["guard"]}><GuardDashboard session={session} /></RoleGate>} />
        <Route path="/admin" element={<RoleGate session={session} roles={["admin"]}><AdminDashboard session={session} /></RoleGate>} />

        {/* 个人资料、身份凭证和访客预约相关页面。资料页对所有已登录角色开放，其余按业务角色限制。 */}
        <Route path="/profile" element={<ProfilePage session={session} onSessionChange={setSession} />} />
        <Route path="/face" element={<RoleGate session={session} roles={["student", "teacher"]}><FaceUploadPage session={session} /></RoleGate>} />
        <Route path="/vehicle" element={<RoleGate session={session} roles={["teacher"]}><VehiclePage session={session} /></RoleGate>} />
        <Route path="/review" element={<RoleGate session={session} roles={["student", "teacher"]}><AppointmentReviewPage session={session} mode="review" /></RoleGate>} />
        <Route path="/appointments" element={<RoleGate session={session} roles={["admin"]}><AppointmentReviewPage session={session} mode="manage" /></RoleGate>} />
        <Route path="/appointment-status" element={<RoleGate session={session} roles={["visitor"]}><AppointmentStatusPage session={session} /></RoleGate>} />
        <Route path="/visitor-qr" element={<RoleGate session={session} roles={["visitor"]}><QRPage session={session} type="visitor" /></RoleGate>} />
        <Route path="/alumni-qr" element={<RoleGate session={session} roles={["alumni"]}><QRPage session={session} type="alumni" /></RoleGate>} />

        {/* 门岗监控、现场处理和管理员后台功能。部分记录页由后端按当前用户身份过滤数据。 */}
        <Route path="/monitor" element={<RoleGate session={session} roles={["guard", "admin"]}><MonitorPage session={session} /></RoleGate>} />
        <Route path="/identity-check" element={<RoleGate session={session} roles={["guard"]}><IdentityCheckPage session={session} /></RoleGate>} />
        <Route path="/scan-simulator" element={<RoleGate session={session} roles={["guard", "admin"]}><ScanSimulatorPage session={session} /></RoleGate>} />
        <Route path="/account-status" element={<RoleGate session={session} roles={["admin"]}><AccountStatusPage session={session} /></RoleGate>} />
        <Route path="/records" element={<MonitorPage session={session} />} />
        <Route path="/exceptions" element={<RoleGate session={session} roles={["student", "teacher", "visitor", "alumni", "admin"]}><ExceptionCenterPage session={session} /></RoleGate>} />
        <Route path="/devices" element={<RoleGate session={session} roles={["guard", "admin"]}><DevicesPage session={session} /></RoleGate>} />
        <Route path="/reports" element={<RoleGate session={session} roles={["admin"]}><ReportsPage session={session} /></RoleGate>} />
        <Route path="/people" element={<RoleGate session={session} roles={["admin"]}><PeopleManagementPage session={session} /></RoleGate>} />
        <Route path="/vehicles" element={<RoleGate session={session} roles={["admin"]}><VehiclePage session={session} /></RoleGate>} />
        <Route path="/rules" element={<RoleGate session={session} roles={["admin"]}><RulesPage session={session} /></RoleGate>} />
        <Route path="/blacklist" element={<RoleGate session={session} roles={["admin"]}><BlacklistPage session={session} /></RoleGate>} />
        <Route path="/announcements" element={<RoleGate session={session} roles={["admin"]}><AnnouncementPage session={session} /></RoleGate>} />
        <Route path="/logs" element={<RoleGate session={session} roles={["admin"]}><LogsPage session={session} /></RoleGate>} />

        {/* 捕获所有未知地址并回到角色首页，避免显示空白或浏览器级 404。 */}
        <Route path="*" element={<HomeRedirect session={session} />} />
      </Route>
    </Routes>
  );
}
