// 本模块负责当前用户及管理员指定用户的资料查询与有限字段更新。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装和统一成功、失败响应工具。
import { asyncRoute, fail, ok } from "../lib/http.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入手机号校验和标准化工具，确保资料中的联系电话格式一致。
import { isValidPhone, normalizePhone } from "../lib/validators.js";

// 创建个人资料模块路由实例。
const router = Router();

// 根据角色和人员档案生成个人简介标题，展示在个人资料页上。
function profileTitle(person, role) {
  if (role === "student") return `${person.className} · ${person.college}`;
  if (role === "teacher") return `${person.department} · ${person.position}`;
  if (role === "alumni") return `${person.graduationYear} 届 · ${person.college}`;
  if (role === "guard") return `${person.gate} · ${person.department}`;
  if (role === "admin") return person.department;
  return person.company || "访客用户";
}

// 根据当前请求上下文确定要读取或修改的用户资料对象。
function resolveUser(data, req) {
  // 非管理员无论提交什么查询参数，都只能解析到当前登录账号。
  if (req.auth?.role !== "admin") {
    return data.users.find((item) => item.id === req.auth.user.id);
  }

  // 管理员优先通过 userId 精确定位账号，可从查询参数或请求体传入。
  if (req.query.userId || req.body?.userId) {
    return data.users.find((item) => item.id === (req.query.userId || req.body.userId));
  }

  // 未指定 userId 时，管理员还可以通过路径中的角色查找该角色账号。
  if (req.params.role) {
    return data.users.find((item) => item.role === req.params.role);
  }

  return null;
}

// 按统一格式构造个人资料响应，包含用户、角色 profile 和人员档案信息。
function buildProfile(data, user) {
  // 账号通过 personId 关联人员档案；角色默认 profile 用于补充通用展示配置。
  const person = data.people.find((item) => item.id === user.personId);
  const base = data.roleProfiles[user.role] ?? {};

  return {
    user: {
      // 仅返回账号的公开管理字段，刻意排除 password 等敏感信息。
      id: user.id,
      username: user.username,
      accountType: user.accountType,
      role: user.role,
      personId: user.personId,
      status: user.status
    },
    profile: {
      ...base,
      personId: user.personId,
      name: person?.name ?? base.name,
      title: person ? profileTitle(person, user.role) : base.title,
      role: user.role,
      type: person?.type ?? base.type,
      status: person?.status ?? base.status
    },
    person
  };
}

// 获取当前登录用户自己的个人资料。
router.get("/profiles/me", asyncRoute(async (req, res) => {
  const data = getData();
  const user = resolveUser(data, req);

  if (!user) return fail(res, 404, "账号资料不存在");
  ok(res, buildProfile(data, user));
}));

// 更新当前登录用户自己的基本资料，如手机号和访客单位信息。
router.patch("/profiles/me", asyncRoute(async (req, res) => {
  // 仅当请求体明确提供 phone 时校验，未提供则允许只更新其他字段。
  if (req.body?.phone !== undefined && !isValidPhone(req.body.phone)) {
    return fail(res, 400, "联系电话必须为 11 位有效手机号");
  }

  const result = await updateData((data) => {
    // 同时确认账号和关联人员档案存在，缺少任一对象都不能更新资料。
    const user = resolveUser(data, req);
    if (!user) return null;
    const person = data.people.find((item) => item.id === user.personId);
    if (!person) return null;

    // 所有角色可修改手机号；company 仅对访客资料开放。
    if (req.body?.phone !== undefined) person.phone = normalizePhone(req.body.phone);
    if (req.body?.company !== undefined && user.role === "visitor") person.company = req.body.company;

    return buildProfile(data, user);
  });

  if (!result) return fail(res, 404, "账号资料不存在");
  ok(res, result);
}));

// 获取指定角色的个人资料，适用于管理员查看某角色用户信息。
router.get("/profiles/:role", asyncRoute(async (req, res) => {
  const data = getData();
  const user = resolveUser(data, req);

  if (!user) return fail(res, 404, "角色资料不存在");
  ok(res, buildProfile(data, user));
}));

// 更新指定角色用户对应的资料字段，包含手机号和状态等。
router.patch("/profiles/:role", asyncRoute(async (req, res) => {
  if (req.body?.phone !== undefined && !isValidPhone(req.body.phone)) {
    return fail(res, 400, "联系电话必须为 11 位有效手机号");
  }

  const result = await updateData((data) => {
    const user = resolveUser(data, req);
    if (!user) return null;
    const person = data.people.find((item) => item.id === user.personId);
    if (!person) return null;

    // 管理接口允许更新手机号和人员状态，但不会透传请求体中的其他未知字段。
    if (req.body?.phone !== undefined) person.phone = normalizePhone(req.body.phone);
    if (req.body?.status !== undefined) person.status = req.body.status;

    return buildProfile(data, user);
  });

  if (!result) return fail(res, 404, "角色资料不存在");
  ok(res, result);
}));

// 导出个人资料路由，供服务入口统一挂载。
export default router;
