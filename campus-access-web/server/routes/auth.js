// 本模块负责角色配置读取、登录会话、短信验证码、访客注册、退出和密码修改等认证流程。
// Node.js 加密模块用于生成不可预测的会话令牌。
import crypto from "node:crypto";
// Express Router 用于注册认证相关接口。
import { Router } from "express";
// 引入异步路由包装、统一响应和必填字段校验工具。
import { asyncRoute, created, fail, ok, requireFields } from "../lib/http.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入业务编号和当前时间生成工具。
import { nextId, nowDateTime } from "../lib/time.js";
// 引入密码哈希、哈希升级判断和密码验证能力，避免直接比较明文密码。
import { hashPassword, needsPasswordRehash, verifyPassword } from "../lib/passwords.js";
// 引入手机号格式校验和标准化工具。
import { isValidPhone, normalizePhone } from "../lib/validators.js";
// 引入黑名单凭证标准化与生效记录查询工具。
import { findActiveBlacklistByCredential, normalizeBlacklistCredential } from "../lib/blacklist.js";

// 创建认证模块路由实例。
const router = Router();
// 会话有效期设置为 8 小时，登录后需在该时间内保持有效。
const SESSION_HOURS = 8;
// 验证码的有效时长为 5 分钟，超过后需要重新获取。
const CODE_TTL_MS = 5 * 60 * 1000;
// 同一手机号发送验证码的最小间隔为 60 秒，减少重复提交。
const CODE_SEND_INTERVAL_MS = 60 * 1000;
// 内存中的验证码临时存储，便于访客注册流程验证。
const codeStore = new Map();

// 从用户对象中剥离敏感的密码字段，避免把明文密码通过接口返回给前端，保证登录信息的安全性。
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

// 根据人员角色和档案信息生成展示用的个人头衔。
function profileTitle(person, role) {
  if (role === "student") return `${person.className} / ${person.college}`;
  if (role === "teacher") return `${person.department} / ${person.position}`;
  if (role === "alumni") return `${person.graduationYear} 届 / ${person.college}`;
  if (role === "guard") return `${person.gate} / ${person.department}`;
  if (role === "admin") return person.department;
  return person.company || "访客用户";
}

// 根据用户账户和人员档案构造登录成功后的会话返回对象，包含 token、用户基础信息、角色 profile 和对应的人员资料，供前端直接使用。
function buildSession(data, user, token) {
  // 账号通过 personId 关联人员档案；历史数据缺失档案时允许回退到角色默认配置。
  const person = data.people.find((item) => item.id === user.personId) ?? null;
  const baseProfile = data.roleProfiles[user.role] ?? {};
  const profile = {
    ...baseProfile,
    personId: user.personId,
    name: person?.name ?? baseProfile.name,
    title: person ? profileTitle(person, user.role) : baseProfile.title,
    role: user.role,
    type: person?.type ?? baseProfile.type,
    status: person?.status ?? baseProfile.status
  };

  // 返回前先调用 sanitizeUser，确保密码哈希也不会泄露给客户端。
  return {
    token,
    user: sanitizeUser(user),
    profile,
    person
  };
}

// 按账号、学号、工号、校友编号或手机号查找用户，兼容前端多种登录输入方式，提升登录兼容性。
function findUserByAccount(data, account) {
  const normalized = String(account || "").trim();
  return data.users.find((item) => item.username === normalized)
    || data.users.find((item) => item.phone === normalized);
}

// 找回密码时要求账号与人员档案中的绑定手机号一致，避免仅凭账号直接重置密码。
function resetTargetFor(data, account, phone) {
  const user = findUserByAccount(data, account);
  if (!user) return { error: "notFound" };
  if (user.status !== "启用") return { error: "disabled" };

  const person = data.people.find((item) => item.id === user.personId);
  const boundPhone = normalizePhone(user.phone || person?.phone || "");
  if (!boundPhone || boundPhone !== phone) return { error: "phoneMismatch" };
  return { user, person, phone: boundPhone };
}

// 创建新的登录会话，生成随机 token，并清理已过期的旧会话记录，确保系统中不会残留失效登录状态。
function createSession(data, user) {
  // 同时记录创建时间和按固定小时数计算的过期时间。
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_HOURS * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  // 每次登录顺便清理已过期或没有有效过期时间的旧会话。
  data.sessions = (data.sessions || []).filter((session) => {
    return session.expiresAt && Date.parse(session.expiresAt) > createdAt.getTime();
  });
  data.sessions.unshift({
    token,
    userId: user.id,
    role: user.role,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  });

  return token;
}

// 返回系统中所有角色定义和角色展示配置，前端可据此初始化界面权限、角色说明和默认 profile 信息。
router.get("/roles", (req, res) => {
  const data = getData();
  ok(res, {
    roles: data.roles,
    roleProfiles: data.roleProfiles
  });
});

// 用户登录接口，先读取请求中的账户和密码，再校验账户是否存在、密码是否正确、账号状态是否启用，最后生成会话并记录登录日志。
router.post("/auth/login", asyncRoute(async (req, res) => {
  // 兼容 account 和 username 两种前端字段名，并为缺失字段提供空字符串默认值。
  const { account = "", username = "", password = "" } = req.body ?? {};
  const loginAccount = account || username;

  if (!String(loginAccount).trim()) {
    return fail(res, 400, "请输入学号、工号、校友编号或手机号");
  }

  const result = await updateData((data) => {
    // 依次校验账号存在、密码正确和账号启用；返回错误标记供事务外统一生成响应。
    const user = findUserByAccount(data, loginAccount);
    if (!user) return { error: "notFound" };
    if (!verifyPassword(password, user.password)) return { error: "wrongPassword" };
    // 旧格式密码在本次验证成功后自动升级为当前哈希格式，不影响用户登录体验。
    if (needsPasswordRehash(user.password)) user.password = hashPassword(password);
    if (user.status !== "启用") return { error: "disabled" };

    // 登录成功后创建会话，并记录一条可审计的系统日志。
    const token = createSession(data, user);
    data.logs.unshift({
      id: nextId("L"),
      time: nowDateTime(),
      actor: user.username,
      role: data.roles[user.role],
      action: "登录系统",
      target: user.id,
      result: "成功"
    });

    return buildSession(data, user, token);
  });

  if (result.error === "notFound") return fail(res, 401, "账号不存在");
  if (result.error === "wrongPassword") return fail(res, 401, "密码错误");
  if (result.error === "disabled") return fail(res, 403, "账号已被停用或锁定");

  ok(res, result);
}));

// 发送短信验证码接口，先校验手机号格式，再限制发送频率，随后生成 6 位验证码并临时存入内存，供访客注册流程核验使用。
router.post("/auth/send-code", (req, res) => {
  // 先校验再标准化，确保验证码以统一的 11 位手机号作为存储键。
  if (!isValidPhone(req.body?.phone)) {
    return fail(res, 400, "请输入 11 位有效手机号");
  }
  const phone = normalizePhone(req.body.phone);

  // 若距离上次发送不足最小间隔，则返回 429 限流响应。
  const existed = codeStore.get(phone);
  if (existed && Date.now() - existed.sentAt < CODE_SEND_INTERVAL_MS) {
    return fail(res, 429, "验证码发送过于频繁，请稍后再试");
  }

  // 生成 100000 至 999999 的六位数字验证码，并记录发送时间和过期时间。
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codeStore.set(phone, {
    code,
    sentAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS
  });

  ok(res, {
    phone,
    code,
    expireMinutes: 5
  });
});

// 发送找回密码验证码：必须同时提供账号和绑定手机号，验证码与注册验证码分开存储。
router.post("/auth/reset-code", (req, res) => {
  const account = String(req.body?.account || "").trim();
  if (!account) return fail(res, 400, "请输入需要找回密码的账号");
  if (!isValidPhone(req.body?.phone)) return fail(res, 400, "请输入 11 位有效手机号");

  const phone = normalizePhone(req.body.phone);
  const target = resetTargetFor(getData(), account, phone);
  if (target.error === "notFound") return fail(res, 404, "账号不存在");
  if (target.error === "disabled") return fail(res, 403, "账号已被停用或锁定");
  if (target.error === "phoneMismatch") return fail(res, 400, "账号与绑定手机号不匹配");

  const resetKey = `reset:${phone}`;
  const existed = codeStore.get(resetKey);
  if (existed && Date.now() - existed.sentAt < CODE_SEND_INTERVAL_MS) {
    return fail(res, 429, "验证码发送过于频繁，请稍后再试");
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  codeStore.set(resetKey, {
    code,
    userId: target.user.id,
    sentAt: Date.now(),
    expiresAt: Date.now() + CODE_TTL_MS
  });

  ok(res, {
    phone,
    code,
    expireMinutes: 5
  });
});

// 通过绑定手机号验证码重置密码，适用于忘记旧密码、无法登录的场景。
router.post("/auth/reset-password", asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ["account", "phone", "code", "newPassword", "confirmPassword"]);
  if (missing.length) return fail(res, 400, "密码找回信息不完整", { missing });
  if (!isValidPhone(req.body.phone)) return fail(res, 400, "请输入 11 位有效手机号");

  const account = String(req.body.account || "").trim();
  const phone = normalizePhone(req.body.phone);
  const newPassword = String(req.body.newPassword || "");
  const confirmPassword = String(req.body.confirmPassword || "");
  if (!newPassword) return fail(res, 400, "请输入新密码");
  if (newPassword !== confirmPassword) return fail(res, 400, "两次输入的新密码不一致");

  const resetKey = `reset:${phone}`;
  const codeRecord = codeStore.get(resetKey);
  if (!codeRecord || codeRecord.expiresAt < Date.now()) {
    return fail(res, 400, "验证码已过期，请重新获取");
  }
  if (String(req.body.code || "").trim() !== codeRecord.code) {
    return fail(res, 400, "验证码错误");
  }

  const result = await updateData((data) => {
    const target = resetTargetFor(data, account, phone);
    if (target.error) return target;
    if (target.user.id !== codeRecord.userId) return { error: "phoneMismatch" };

    target.user.password = hashPassword(newPassword);
    data.sessions = (data.sessions || []).filter((session) => session.userId !== target.user.id);
    data.logs.unshift({
      id: nextId("L"),
      time: nowDateTime(),
      actor: target.user.username,
      role: data.roles[target.user.role],
      action: "找回并重置登录密码",
      target: target.user.id,
      result: "成功"
    });

    return { user: target.user };
  });

  if (result.error === "notFound") return fail(res, 404, "账号不存在");
  if (result.error === "disabled") return fail(res, 403, "账号已被停用或锁定");
  if (result.error === "phoneMismatch") return fail(res, 400, "账号与绑定手机号不匹配");

  codeStore.delete(resetKey);
  ok(res, sanitizeUser(result.user));
}));

// 访客注册接口，先校验注册字段完整性和验证码有效性，再检查是否在黑名单中，最后创建访客人员档案和对应登录账户。
router.post("/auth/register-visitor", asyncRoute(async (req, res) => {
  // 注册所需字段缺一不可，missing 会明确告知前端缺失项。
  const missing = requireFields(req.body, ["name", "phone", "idNumber", "code", "password", "confirmPassword"]);
  if (missing.length) return fail(res, 400, "访客注册信息不完整", { missing });

  if (!isValidPhone(req.body.phone)) {
    return fail(res, 400, "请输入 11 位有效手机号");
  }
  // 对手机号和身份证号进行标准化，保证重复检查与黑名单比对口径一致。
  const phone = normalizePhone(req.body.phone);
  const idNumber = normalizeBlacklistCredential(req.body.idNumber);
  const password = String(req.body.password || "");
  const confirmPassword = String(req.body.confirmPassword || "");

  if (!/^\d{17}[\dX]$/.test(idNumber)) {
    return fail(res, 400, "请输入完整的 18 位身份证号码");
  }

  if (password !== confirmPassword) {
    return fail(res, 400, "两次输入的密码不一致");
  }

  // 验证码必须存在、未过期且与用户提交值一致。
  const codeRecord = codeStore.get(phone);
  if (!codeRecord || codeRecord.expiresAt < Date.now()) {
    return fail(res, 400, "验证码已过期，请重新获取");
  }

  if (String(req.body.code || "").trim() !== codeRecord.code) {
    return fail(res, 400, "验证码错误");
  }

  const result = await updateData((data) => {
    // 手机号作为访客登录名，不能与已有账号重复；身份证号也不能命中生效黑名单。
    const existed = data.users.find((item) => item.username === phone);
    if (existed) return { error: "existed" };
    const blacklistItem = findActiveBlacklistByCredential(data, idNumber);
    if (blacklistItem) return { error: "blacklisted", blacklistId: blacklistItem.id };

    // 分别建立人员档案和登录账号，再通过 personId 形成关联。
    const person = {
      id: nextId("P-VIS-"),
      name: req.body.name,
      type: "访客",
      code: nextId("VIS"),
      idNumber,
      role: "visitor",
      phone,
      company: req.body.company || "",
      status: "正常"
    };

    // 新密码只保存哈希结果，不写入原始明文。
    const user = {
      id: nextId("U-VIS-"),
      username: phone,
      accountType: "手机号",
      password: hashPassword(password),
      role: "visitor",
      personId: person.id,
      status: "启用"
    };

    // 将新记录插入集合首部，并写入访客注册日志。
    data.people.unshift(person);
    data.users.unshift(user);
    data.logs.unshift({
      id: nextId("L"),
      time: nowDateTime(),
      actor: person.name,
      role: "访客",
      action: "注册访客账号",
      target: person.phone,
      result: "成功"
    });

    return {
      registered: true,
      phone,
      user: sanitizeUser(user),
      person
    };
  });

  if (result.error === "existed") {
    return fail(res, 409, "该手机号已注册，请直接登录");
  }
  if (result.error === "blacklisted") {
    return fail(res, 403, "该身份证号已在黑名单中，禁止注册访客账号");
  }

  // 注册完全成功后删除已使用验证码，防止同一验证码被重复使用。
  codeStore.delete(phone);
  created(res, result);
}));

// 用户退出登录接口，删除当前会话对应的 token，确保该 token 后续不再被认为有效。
router.post("/auth/logout", asyncRoute(async (req, res) => {
  // 从会话集合中移除当前请求携带的 token，使其立即失效。
  await updateData((data) => {
    data.sessions = (data.sessions || []).filter((item) => item.token !== req.auth.token);
    return true;
  });
  ok(res, { loggedOut: true });
}));

// 查询当前登录用户的个人信息和当前会话上下文，管理员还可以通过 userId 或账号查询指定用户的资料。
router.get("/auth/me", (req, res) => {
  const data = getData();
  let user = req.auth?.user;

  if (req.auth?.role === "admin") {
    if (req.query.userId) user = data.users.find((item) => item.id === req.query.userId);
    if (req.query.account) user = findUserByAccount(data, req.query.account);
  }

  if (!user) return fail(res, 404, "当前账号不存在");
  ok(res, buildSession(data, user, req.auth.token));
});

// 修改用户密码接口，普通用户只能修改自己的密码，管理员则可以代替指定账户修改密码，并在修改后写入系统日志。
router.patch("/auth/password", asyncRoute(async (req, res) => {
  const missing = requireFields(req.body, ["oldPassword", "newPassword"]);
  if (missing.length) return fail(res, 400, "密码修改信息不完整", { missing });

  // 默认修改当前账号；只有管理员可以通过 userId 指定其他账号。
  const currentUserId = req.auth.user.id;
  const requestedUserId = req.body.userId || currentUserId;
  if (req.auth.role !== "admin" && requestedUserId !== currentUserId) {
    return fail(res, 403, "不能修改其他账号的密码");
  }

  const result = await updateData((data) => {
    // 修改前再次确认目标账号存在，并使用原密码完成身份验证。
    const user = data.users.find((item) => item.id === requestedUserId);
    if (!user) return { error: "notFound" };
    if (!verifyPassword(req.body.oldPassword, user.password)) return { error: "wrongPassword" };

    // 保存新密码哈希并记录密码修改日志，日志中不包含任何密码内容。
    user.password = hashPassword(req.body.newPassword);
    data.logs.unshift({
      id: nextId("L"),
      time: nowDateTime(),
      actor: user.username,
      role: data.roles[user.role],
      action: "修改登录密码",
      target: user.id,
      result: "成功"
    });

    return { user };
  });

  if (result.error === "notFound") return fail(res, 404, "账号不存在");
  if (result.error === "wrongPassword") return fail(res, 400, "原密码错误");
  ok(res, sanitizeUser(result.user));
}));

// 导出认证路由，供服务入口统一挂载。
export default router;
