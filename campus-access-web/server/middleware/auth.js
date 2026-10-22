import { fail } from "../lib/http.js";
import { getData } from "../lib/store.js";

// 定义系统中无需登录即可访问的公开接口集合，避免对这些接口做认证和授权检查。
const PUBLIC_ROUTES = [
  { method: "GET", path: "/health" },
  { method: "GET", path: "/roles" },
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/auth/send-code" },
  { method: "POST", path: "/auth/reset-code" },
  { method: "POST", path: "/auth/reset-password" },
  { method: "POST", path: "/auth/register-visitor" }
];

// 定义需要管理员角色才能访问的接口前缀集合，统一用于权限判断。
const ADMIN_ONLY_PREFIXES = [
  "/people",
  "/users",
  "/reports",
  "/settings",
  "/gates",
  "/access-rules",
  "/blacklist",
  "/logs"
];

// 判断当前请求是否属于公开接口，公开接口不需要进行身份认证和角色授权。
function isPublicRoute(req) {
  return PUBLIC_ROUTES.some((route) => req.method === route.method && req.path === route.path);
}

// 从请求中提取访问令牌，优先读取 Authorization 头部的 Bearer Token，也兼容自定义的 x-campus-token 头。
function tokenFromRequest(req) {
  const header = req.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return req.get("x-campus-token") || "";
}

// 判断当前会话是否已经过期，若没有有效的 expiresAt 或者时间已经到达，认为登录状态失效。
function isExpired(session) {
  if (!session?.expiresAt) return true;
  return Number.isNaN(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now();
}

// 根据当前请求路径和 HTTP 方法，判断指定角色是否具备访问该接口的权限。
function roleAllowed(req, role) {
  const path = req.path;

  if (path === "/roles" || path.startsWith("/auth/")) return true;
  if (path === "/messages" || path.startsWith("/messages/")) {
    if (req.method === "POST" || req.method === "DELETE") return role === "admin";
    return true;
  }
  if (path === "/profiles/me" || path.startsWith("/profiles/me/")) return true;
  if (path.startsWith("/profiles/")) return role === "admin";

  if (path === "/dashboard/admin") return role === "admin";
  if (path.startsWith("/dashboard/")) return true;

  if (path.startsWith("/appointments")) {
    if (req.method === "POST") return role === "visitor" || role === "admin";
    if (req.method === "PATCH") return role === "student" || role === "teacher" || role === "admin";
    return role === "student" || role === "teacher" || role === "visitor" || role === "admin";
  }

  if (path.startsWith("/access-records")) return role === "guard" || role === "admin";
  if (path.startsWith("/exceptions")) return role === "guard" || role === "admin";
  if (path.startsWith("/devices")) return role === "guard" || role === "admin";

  if (path.startsWith("/faces")) return role === "student" || role === "teacher" || role === "admin";
  if (path.startsWith("/vehicles")) return role === "teacher" || role === "admin";
  if (path.startsWith("/qr-codes")) return role === "visitor" || role === "alumni" || role === "guard" || role === "admin";

  if (ADMIN_ONLY_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return role === "admin";
  }

  return role === "admin";
}

// 认证中间件：负责检查请求是否携带有效登录凭证，并把当前登录用户信息挂载到 req.auth 上，供后续接口使用。
export function authenticate(req, res, next) {
  // 公开接口直接放行，不做登录校验。
  if (isPublicRoute(req)) return next();

  // 从请求中提取 token，若没有则直接拒绝访问。
  const token = tokenFromRequest(req);
  if (!token) return fail(res, 401, "请先登录后再访问系统接口");

  // 从数据存储中查找对应的会话，确认 token 是否存在且未过期。
  const data = getData();
  const session = (data.sessions || []).find((item) => item.token === token);
  if (!session || isExpired(session)) return fail(res, 401, "登录状态已失效，请重新登录");

  // 根据会话中的 userId 找到对应的用户账户，确认该账号仍然存在。
  const user = data.users.find((item) => item.id === session.userId);
  if (!user) return fail(res, 401, "登录账号不存在，请重新登录");
  if (user.status && user.status !== "启用") return fail(res, 403, "账号已被停用");

  // 关联查询人员档案，便于后续接口获取用户的个人信息。
  const person = data.people.find((item) => item.id === user.personId) || null;
  // 将认证结果挂载到请求对象上，后续中间件和路由都能直接使用。
  req.auth = {
    token,
    session,
    user,
    role: user.role,
    person,
    personId: user.personId
  };

  return next();
}

// 授权中间件：在认证通过后进一步判断当前角色是否有权限调用该接口。
export function authorize(req, res, next) {
  // 公开接口直接放行，非公开接口需要经过角色权限判断。
  if (isPublicRoute(req)) return next();

  if (!req.auth?.role || !roleAllowed(req, req.auth.role)) {
    return fail(res, 403, "当前角色无权访问该接口");
  }

  return next();
}

// 角色封装工具函数：用于在某些路由或中间件中快速要求指定角色才能继续执行。
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return fail(res, 403, "当前角色无权执行该操作");
    }

    return next();
  };
}
