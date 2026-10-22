// 优先读取 Vite 环境变量指定的后端地址；未配置时使用同源的 /api，由开发代理或生产服务器转发。
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

/** 从本地持久化状态中读取当前登录令牌，兼容独立 token 和完整 session 两种存储格式。 */
function storedToken() {
  // 新版登录流程会直接保存 campus_token，存在时无需解析会话对象。
  const token = localStorage.getItem("campus_token");
  if (token) return token;

  try {
    // 兼容只保存 campus_session 的情况；可选链确保旧数据缺少 token 时返回空字符串。
    return JSON.parse(localStorage.getItem("campus_session") || "{}")?.token || "";
  } catch {
    // 本地数据可能被手动修改或来自旧版本，JSON 无法解析时按未登录处理。
    return "";
  }
}

/** 清理所有登录缓存，并广播认证过期事件，由应用根组件统一跳转登录页。 */
function clearExpiredSession() {
  localStorage.removeItem("campus_session");
  localStorage.removeItem("campus_token");
  localStorage.removeItem("campus_user");
  window.dispatchEvent(new CustomEvent("campus:auth-expired"));
}

/** 将普通接口错误广播给全局界面，根组件会把消息显示为限时错误提示。 */
function emitApiError(message) {
  window.dispatchEvent(new CustomEvent("campus:api-error", { detail: { message } }));
}

/**
 * 所有 API 方法共用的底层请求函数。
 * 它集中处理请求体序列化、Bearer 认证、禁用缓存、统一响应解包和错误事件分发，
 * 业务页面因此只需要关心接口路径、HTTP 方法和业务参数。
 */
async function request(path, options = {}) {
  // Headers 会把普通对象转换为标准请求头对象，便于后续安全地查询和补充字段。
  const headers = new Headers(options.headers || {});
  let body = options.body;
  const token = storedToken();

  // FormData 必须由浏览器自动生成 multipart 边界；除此之外的对象统一编码为 JSON。
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }

  // 调用方未显式提供认证头时自动携带本地令牌，仍允许特殊请求自行覆盖 Authorization。
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // 请求头与 fetch 的 cache 选项双重禁止缓存，确保管理端列表尽快反映数据库最新状态。
  headers.set("Cache-Control", "no-cache");

  // options 先展开，再用规范化后的 headers/body 覆盖原值；所有接口都返回 Promise。
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body,
    cache: "no-store"
  });
  // 某些服务器错误可能没有 JSON 响应体，此时使用空对象继续进入统一错误分支。
  const payload = await response.json().catch(() => ({}));

  // HTTP 状态异常或业务 success=false 均视为失败，优先展示后端提供的具体消息。
  if (!response.ok || payload.success === false) {
    const message = payload.error?.message || `请求失败：${response.status}`;
    // 非登录接口返回 401 说明会话失效；登录接口自身失败则保留表单并显示原始错误。
    if (response.status === 401 && !path.startsWith("/auth/login")) {
      clearExpiredSession();
    } else {
      emitApiError(message);
    }
    // 抛出 Error 让页面级 catch/useApiData 同样可以感知本次失败。
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  // 上层只接收业务 data，隐藏 success 等传输层包装字段。
  return payload.data;
}

// API 门面按业务域集中定义全部后端调用，页面无需重复拼接地址和认证请求头。
export const api = {
  // ---------- 身份认证与当前用户 ----------
  login: (body) => request("/auth/login", { method: "POST", body }),
  logout: () => request("/auth/logout", { method: "POST" }),
  sendVisitorCode: (body) => request("/auth/send-code", { method: "POST", body }),
  sendResetCode: (body) => request("/auth/reset-code", { method: "POST", body }),
  resetPassword: (body) => request("/auth/reset-password", { method: "POST", body }),
  registerVisitor: (body) => request("/auth/register-visitor", { method: "POST", body }),
  me: (userId) => request(`/auth/me?userId=${encodeURIComponent(userId)}`),
  changePassword: (body) => request("/auth/password", { method: "PATCH", body }),

  // ---------- 角色字典与各角色驾驶舱 ----------
  roles: () => request("/roles"),
  adminDashboard: () => request("/dashboard/admin"),
  roleDashboard: (role, userId) => request(`/dashboard/${role}${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),

  // ---------- 访客预约：查询、候选被访人、创建和审核 ----------
  appointments: (query = "") => request(`/appointments${query}`),
  appointmentHosts: () => request("/appointments/hosts"),
  createAppointment: (body) => request("/appointments", { method: "POST", body }),
  reviewAppointment: (id, body) => request(`/appointments/${id}/review`, { method: "PATCH", body }),

  // ---------- 出入记录与现场设备核验模拟 ----------
  accessRecords: (query = "") => request(`/access-records${query}`),
  createAccessRecord: (body) => request("/access-records", { method: "POST", body }),
  simulateScan: (body, { operationId, signal } = {}) => request("/access-records/simulate", { method: "POST", body, signal, headers: operationId ? { "Idempotency-Key": operationId } : undefined }),

  // ---------- 异常事件：查询、智能分析、对话、状态更新与处置动作 ----------
  exceptions: (query = "") => request(`/exceptions${query}`),
  exceptionAnalysis: () => request("/exceptions/analysis"),
  exceptionChat: (body) => request("/exceptions/chat", { method: "POST", body }),
  analyzeException: (id) => request(`/exceptions/${id}/analysis`),
  updateException: (id, body) => request(`/exceptions/${id}`, { method: "PATCH", body }),
  handleException: (id, body) => request(`/exceptions/${id}/actions`, { method: "POST", body }),

  // ---------- 核验设备的增删改查 ----------
  devices: (query = "") => request(`/devices${query}`),
  createDevice: (body) => request("/devices", { method: "POST", body }),
  updateDevice: (id, body) => request(`/devices/${id}`, { method: "PATCH", body }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: "DELETE" }),

  // ---------- 人员档案与人脸凭证 ----------
  profile: (role, userId) => request(`/profiles/${role}${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`),
  myProfile: (userId) => request(`/profiles/me?userId=${encodeURIComponent(userId)}`),
  updateMyProfile: (body) => request("/profiles/me", { method: "PATCH", body }),
  faces: (query = "") => request(`/faces${query}`),
  uploadFace: (body) => request("/faces/upload", { method: "POST", body }),

  // ---------- 车辆凭证 ----------
  vehicles: (query = "") => request(`/vehicles${query}`),
  createVehicle: (body) => request("/vehicles", { method: "POST", body }),
  updateVehicle: (id, body) => request(`/vehicles/${id}`, { method: "PATCH", body }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: "DELETE" }),

  // ---------- 动态二维码的生成、查询与核验 ----------
  qrCodes: (query = "") => request(`/qr-codes${query}`),
  createQrCode: (body) => request("/qr-codes", { method: "POST", body }),
  verifyQrCode: (id, body) => request(`/qr-codes/${id}/verify`, { method: "POST", body }),

  // ---------- 报表汇总、人员管理和登录账号管理 ----------
  reportSummary: () => request("/reports/summary"),
  people: (query = "") => request(`/people${query}`),
  createPerson: (body) => request("/people", { method: "POST", body }),
  updatePerson: (id, body) => request(`/people/${id}`, { method: "PATCH", body }),
  deletePerson: (id) => request(`/people/${id}`, { method: "DELETE" }),
  users: (query = "") => request(`/users${query}`),
  createUser: (body) => request("/users", { method: "POST", body }),
  updateUser: (id, body) => request(`/users/${id}`, { method: "PATCH", body }),

  // ---------- 系统公告与站内消息 ----------
  messages: (query = "") => request(`/messages${query}`),
  createMessage: (body) => request("/messages", { method: "POST", body }),
  updateMessage: (id, body) => request(`/messages/${id}`, { method: "PATCH", body }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: "DELETE" }),
  markMessageRead: (id, body) => request(`/messages/${id}/read`, { method: "PATCH", body }),

  // ---------- 校门基础信息和角色通行规则 ----------
  gates: () => request("/gates"),
  updateGate: (id, body) => request(`/gates/${id}`, { method: "PATCH", body }),
  accessRules: () => request("/access-rules"),
  validateAccessRule: (body) => request("/access-rules/validate", { method: "POST", body }),
  updateAccessRule: (id, body) => request(`/access-rules/${id}`, { method: "PATCH", body }),

  // ---------- 黑名单与系统审计日志 ----------
  blacklist: (query = "") => request(`/blacklist${query}`),
  createBlacklist: (body) => request("/blacklist", { method: "POST", body }),
  updateBlacklist: (id, body) => request(`/blacklist/${id}`, { method: "PATCH", body }),
  logs: (query = "") => request(`/logs${query}`)
};
