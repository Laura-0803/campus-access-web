// 本模块提供管理端的人员档案和用户账号维护接口，并集中处理输入标准化、格式校验和关联数据清理。
// 引入 Express 路由构造器。
import { Router } from "express";
// 引入异步路由包装、统一响应和必填字段校验工具。
import { asyncRoute, created, fail, ok, requireFields } from "../lib/http.js";
// 引入数据读取与持久化更新工具。
import { getData, updateData } from "../lib/store.js";
// 引入密码哈希函数，确保账号密码不会以明文形式存储。
import { hashPassword } from "../lib/passwords.js";
// 引入业务编号生成函数。
import { nextId } from "../lib/time.js";
// 引入手机号校验和标准化工具。
import { isValidPhone, normalizePhone } from "../lib/validators.js";
// 引入生效黑名单查询工具，用于阻止受限访客录入。
import { findActiveBlacklistByCredential } from "../lib/blacklist.js";

// 创建管理端路由实例。
const router = Router();

// 定义系统中允许的角色集合，便于统一校验角色字段。
const roleValues = new Set(["student", "teacher", "visitor", "alumni", "guard", "admin"]);
// 定义账号标识的业务类型，不同类型对应不同的格式校验和标准化规则。
const accountTypes = new Set(["账号", "学号", "工号", "手机号", "校友编号"]);
// 访客档案中的被访人只允许关联学生、教职工或管理员。
const visitorHostRoles = new Set(["student", "teacher", "admin"]);
// 将中文人员类型映射到系统角色、编号名称和该类型必填的扩展字段。
const personTypeRules = {
  学生: { role: "student", codeLabel: "学号/编号", required: ["college", "className"] },
  教职工: { role: "teacher", codeLabel: "工号/编号", required: ["college"] },
  访客: { role: "visitor", codeLabel: "访客编号", required: ["phone", "company", "host"], phoneRequired: true },
  校友: { role: "alumni", codeLabel: "校友编号", required: ["college"] },
  门岗安保: { role: "guard", codeLabel: "工号/编号", required: ["gate"] },
  管理员: { role: "admin", codeLabel: "工号/编号", required: ["department"] }
};
// 将内部字段名映射为中文名称，用于生成清晰的校验错误信息。
const fieldLabels = {
  phone: "电话",
  college: "学院",
  className: "班级",
  company: "来访单位",
  host: "被访人",
  gate: "值守校门",
  department: "所属部门"
};
// 各文本字段的最大长度限制，用于阻止异常超长内容进入数据文件。
const textLimits = {
  name: 30,
  college: 40,
  className: 30,
  department: 40,
  position: 30,
  host: 30,
  company: 60,
  graduationYear: 4,
  major: 40,
  gate: 10
};

// 清理输入文本中的空白，避免前后空格影响校验与存储。
function cleanText(value) {
  return String(value || "").trim();
}

// 统一身份证号格式为大写，便于后续比对和校验。
function normalizeIdNumber(value) {
  return cleanText(value).toUpperCase();
}

// 按人员类型规范化编号，例如学生编号只保留数字，其他类型保留大写字母和数字。
function normalizePersonCode(value, type) {
  const text = cleanText(value).toUpperCase();
  if (type === "学生") return text.replace(/\D/g, "");
  return text;
}

// 校验姓名格式，要求为中文或英文字母，并控制长度范围。
function isValidPersonName(value) {
  return /^[\u4e00-\u9fa5A-Za-z·.\s]{2,30}$/.test(cleanText(value));
}

// 校验身份证号是否为 18 位合法格式，并验证出生日期真实存在。
function isValidIdNumber(value) {
  // 先校验 18 位基本结构，再单独验证其中的出生日期是否为真实日期。
  const text = normalizeIdNumber(value);
  if (!/^\d{17}[\dX]$/.test(text)) return false;
  const birth = text.slice(6, 14);
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// 校验人员编号是否符合当前人员类型的编号规则。
function isValidPersonCode(value, type) {
  const text = cleanText(value).toUpperCase();
  if (type === "学生") return /^\d{6,20}$/.test(text);
  if (type === "访客") return /^VIS[A-Z0-9-]{4,21}$/.test(text);
  if (type === "校友") return /^[A-Z0-9-]{4,24}$/.test(text);
  return /^[A-Z0-9-]{4,20}$/.test(text);
}

// 根据人员类型生成对应的编号填写提示，便于前端提示用户。
function codeHint(type) {
  if (type === "学生") return "6-20 位数字学号";
  if (type === "访客") return "VIS 开头，7-24 位大写字母/数字/短横线";
  if (type === "校友") return "4-24 位大写字母/数字/短横线";
  return "4-20 位大写字母/数字/短横线";
}

// 校验毕业年份，确保其在合理的时间范围内。
function isValidGraduationYear(value) {
  const text = cleanText(value);
  if (!text) return true;
  const year = Number(text);
  return /^\d{4}$/.test(text) && year >= 1950 && year <= new Date().getFullYear();
}

// 校验账号字段内容是否符合当前账号类型的格式要求。
function isValidAccountValue(value, accountType = "账号") {
  const text = cleanText(value);
  if (accountType === "手机号") return isValidPhone(text);
  if (accountType === "学号") return /^\d{6,20}$/.test(text);
  if (accountType === "工号") return /^[A-Z0-9-]{4,20}$/.test(text);
  return /^[A-Z0-9-]{4,24}$/.test(text);
}

// 将账号值按账号类型做标准化处理，统一为系统内部可比较的形式。
function normalizeAccountValue(value, accountType = "账号") {
  if (accountType === "手机号") return normalizePhone(value);
  if (accountType === "学号") return cleanText(value).replace(/\D/g, "");
  return cleanText(value).toUpperCase();
}

// 查找访客对应的被访人，确保访客记录指向系统中存在、角色合法且未被排除的宿主对象，避免访客信息错误绑定。
function findVisitorHost(data, host, excludedPersonId = "") {
  const value = cleanText(host);
  if (!value) return null;

  return data.people.find((item) => {
    const matched = item.id === value || item.name === value || item.code === value;
    return matched && item.id !== excludedPersonId && visitorHostRoles.has(item.role);
  });
}

// 检查各字段长度是否超出系统限制，防止非法超长输入。
function validateTextLengths(body) {
  // 遍历集中定义的长度配置，只检查请求体中实际出现的字段。
  for (const [key, max] of Object.entries(textLimits)) {
    if (body?.[key] !== undefined && cleanText(body[key]).length > max) {
      return `${fieldLabels[key] || key}不能超过 ${max} 个字符`;
    }
  }
  return "";
}

// 校验人员信息字段是否符合当前人员类型的规则要求，包括姓名、编号、身份证号、电话、必要字段和长度限制，确保新增或修改的人员档案合法。
function validatePersonBody(body, type, { partial = false } = {}) {
  // partial=false 用于新增时的完整校验；partial=true 用于修改时只校验本次提供的字段。
  const rule = personTypeRules[type];
  if (!rule) return "人员类型不正确";
  if (body.role !== undefined && body.role !== rule.role) return "人员类型和角色不匹配";
  if ((!partial || body.name !== undefined) && !isValidPersonName(body.name)) return "姓名需为 2-30 位中文或英文字母";
  if ((!partial || body.code !== undefined || body.type !== undefined) && !isValidPersonCode(body.code, type)) {
    return `${rule.codeLabel}格式不正确：${codeHint(type)}`;
  }
  if (!partial || body.idNumber !== undefined) {
    if (!cleanText(body.idNumber)) return "请填写身份证号";
    if (!isValidIdNumber(body.idNumber)) return "身份证号需为 18 位有效身份证格式";
  }
  if (!partial || body.phone !== undefined) {
    if (!cleanText(body.phone)) return "请填写电话";
    if (!isValidPhone(body.phone)) return "联系电话必须为 11 位有效手机号";
  }
  if ((!partial || body.type !== undefined) && rule.required) {
    for (const key of rule.required) {
      if (!cleanText(body[key])) return `请填写${fieldLabels[key] || key}`;
    }
  }
  if (!isValidGraduationYear(body.graduationYear)) return `毕业年份需在 1950-${new Date().getFullYear()} 年之间`;
  return validateTextLengths(body);
}

// 对人员信息输入执行标准化处理，包括去除首尾空白、统一大小写、规范化编号和身份证号格式，保证后续数据校验和存储的一致性。
function normalizePersonBody(body = {}, type = body.type) {
  // 使用浅拷贝生成新对象，避免标准化过程直接改变原始 req.body。
  const next = { ...body };
  for (const key of Object.keys(textLimits)) {
    if (next[key] !== undefined) next[key] = cleanText(next[key]);
  }
  if (next.type !== undefined) next.type = cleanText(next.type);
  if (next.role !== undefined) next.role = cleanText(next.role);
  if (next.code !== undefined) next.code = normalizePersonCode(next.code, type);
  if (next.idNumber !== undefined) next.idNumber = normalizeIdNumber(next.idNumber);
  if (next.phone !== undefined) next.phone = next.phone ? normalizePhone(next.phone) : "";
  return next;
}

// 校验账号信息，确保用户名格式、密码长度、角色取值和账号类型都满足系统规则，避免创建无效用户账户。
function validateUserBody(body, accountType = body?.accountType || "账号", { partial = false } = {}) {
  if (body?.accountType !== undefined && !accountTypes.has(body.accountType)) return "账号类型不正确";
  if ((!partial || body?.username !== undefined) && !isValidAccountValue(body?.username, accountType)) return "登录账号格式不正确";
  if (body?.role !== undefined && !roleValues.has(body.role)) return "角色不正确";
  if ((!partial || body?.password !== undefined) && body?.password !== undefined) {
    const password = String(body.password || "");
    if (password.length < 6 || password.length > 32) return "密码长度需为 6-32 位";
  }
  return "";
}

// 查询人员列表接口，支持按人员类型和关键字过滤，便于管理端快速查找和筛选人员档案。
router.get("/people", (req, res) => {
  const data = getData();
  // type 精确匹配人员类型，keyword 在常用身份和组织字段中进行模糊搜索。
  const result = data.people.filter((item) => {
    if (req.query.type && item.type !== req.query.type) return false;
    if (req.query.keyword) {
      const keyword = String(req.query.keyword);
      return [item.name, item.code, item.phone, item.college, item.department]
        .filter(Boolean)
        .some((value) => String(value).includes(keyword));
    }
    return true;
  });
  ok(res, result, { total: result.length });
});

// 根据人员 ID 查询单个人员详情。
router.get("/people/:id", (req, res) => {
  const data = getData();
  const result = data.people.find((item) => item.id === req.params.id);
  if (!result) return fail(res, 404, "人员不存在");
  ok(res, result);
});

// 新增人员档案接口，先校验输入合法性，再检查访客是否在黑名单、是否有合法被访人、编号是否重复，最后创建人员档案并写入数据集合。
router.post("/people", asyncRoute(async (req, res) => {
  // 先标准化再执行必填与格式校验，使存储值和校验口径保持一致。
  const body = normalizePersonBody(req.body);
  const missing = requireFields(body, ["name", "type", "role", "code", "idNumber", "phone"]);
  if (missing.length) return fail(res, 400, "人员信息不完整", { missing });
  const validationError = validatePersonBody(body, body.type);
  if (validationError) return fail(res, 400, validationError);

  const result = await updateData((data) => {
    // 访客需要额外通过黑名单、人员编号唯一性和被访人关联三项业务校验。
    if (body.role === "visitor" && findActiveBlacklistByCredential(data, body.idNumber)) {
      return { error: "blacklisted" };
    }
    if (data.people.some((item) => item.code === body.code)) return { error: "duplicatedCode" };
    const hostPerson = body.type === "访客" ? findVisitorHost(data, body.host) : null;
    if (body.type === "访客" && !hostPerson) return { error: "hostNotFound" };
    // 仅挑选允许的字段构造人员对象，不把请求体中的未知字段直接写入数据。
    const person = {
      id: body.id || nextId("P-"),
      name: body.name,
      type: body.type,
      code: body.code,
      idNumber: body.idNumber || "",
      role: body.role,
      college: body.college || "",
      className: body.className || "",
      phone: body.phone || "",
      status: body.status || "正常",
      department: body.department || "",
      position: body.position || "",
      host: hostPerson?.name || body.host || "",
      company: body.company || "",
      graduationYear: body.graduationYear || "",
      major: body.major || "",
      gate: body.gate || ""
    };
    data.people.unshift(person);
    return person;
  });

  if (result.error === "blacklisted") return fail(res, 403, "该身份证号已在黑名单中，禁止录入访客");
  if (result.error === "duplicatedCode") return fail(res, 409, "人员编号已存在");
  if (result.error === "hostNotFound") return fail(res, 400, "访客被访人必须是系统中的学生、教职工或保卫处管理员");
  created(res, result);
}));

// 修改已有人员档案接口，支持局部字段更新，修改时会重新校验相关字段、黑名单状态、编号唯一性和访客被访人关系。
router.patch("/people/:id", asyncRoute(async (req, res) => {
  const body = normalizePersonBody(req.body);
  // 白名单限定可编辑字段，防止路径 ID 等内部字段被请求体覆盖。
  const editable = [
    "name",
    "type",
    "code",
    "idNumber",
    "role",
    "college",
    "className",
    "phone",
    "status",
    "department",
    "position",
    "host",
    "company",
    "graduationYear",
    "major",
    "gate"
  ];

  const result = await updateData((data) => {
    // 合并现有类型与本次修改内容，以正确选择该人员类型对应的校验规则。
    const person = data.people.find((item) => item.id === req.params.id);
    if (!person) return null;
    const personType = body.type || person.type;
    const nextBody = normalizePersonBody(body, personType);
    const validationInput = body.type !== undefined ? { ...person, ...nextBody } : nextBody;
    const validationError = validatePersonBody(validationInput, personType, { partial: body.type === undefined });
    if (validationError) return { error: "validation", message: validationError };
    const nextRole = nextBody.role || person.role;
    const nextIdNumber = nextBody.idNumber ?? person.idNumber;
    // 只有访客身份、身份证号或类型发生相关变化时才需要重新检查黑名单。
    const shouldCheckBlacklist = nextRole === "visitor"
      && (nextBody.idNumber !== undefined || nextBody.role !== undefined || nextBody.type !== undefined);
    if (shouldCheckBlacklist && findActiveBlacklistByCredential(data, nextIdNumber)) {
      return { error: "blacklisted" };
    }
    if (nextBody?.code && nextBody.code !== person.code && data.people.some((item) => item.code === nextBody.code)) {
      return { error: "duplicatedCode" };
    }
    const shouldValidateHost = personType === "访客" && (nextBody.host !== undefined || nextBody.type !== undefined);
    const hostPerson = shouldValidateHost ? findVisitorHost(data, nextBody.host ?? person.host, person.id) : null;
    if (shouldValidateHost && !hostPerson) return { error: "hostNotFound" };

    // 逐项复制请求中明确出现的白名单字段，未提交字段保持原值。
    for (const key of editable) {
      if (nextBody?.[key] !== undefined) person[key] = nextBody[key];
    }
    if (hostPerson) person.host = hostPerson.name;
    return person;
  });

  if (result?.error === "validation") return fail(res, 400, result.message);
  if (result?.error === "blacklisted") return fail(res, 403, "该身份证号已在黑名单中，禁止录入访客");
  if (result?.error === "duplicatedCode") return fail(res, 409, "人员编号已存在");
  if (result?.error === "hostNotFound") return fail(res, 400, "访客被访人必须是系统中的学生、教职工或保卫处管理员");
  if (!result) return fail(res, 404, "人员不存在");
  ok(res, result);
}));

// 删除人员档案接口，并同步清理与该人员关联的账户、会话、人脸照片、车辆信息和二维码，避免残留脏数据。
router.delete("/people/:id", asyncRoute(async (req, res) => {
  const result = await updateData((data) => {
    const person = data.people.find((item) => item.id === req.params.id);
    if (!person) return null;

    // 删除主体人员后同步清理账号、会话及各类凭证，避免产生无法关联的孤立记录。
    data.people = data.people.filter((item) => item.id !== req.params.id);
    data.users = data.users.filter((item) => item.personId !== req.params.id);
    data.sessions = (data.sessions || []).filter((item) => item.userId && data.users.some((user) => user.id === item.userId));
    data.faces = data.faces.filter((item) => item.personId !== req.params.id);
    data.vehicles = data.vehicles.filter((item) => item.ownerId !== req.params.id);
    data.qrCodes = data.qrCodes.filter((item) => item.ownerId !== req.params.id && item.visitorId !== req.params.id);
    return person;
  });

  if (!result) return fail(res, 404, "人员不存在");
  ok(res, result);
}));

// 查询系统中的用户账号列表，返回安全字段版本。
router.get("/users", (req, res) => {
  const data = getData();
  // 可选 role 参数用于筛选角色；解构时剔除 password，保证密码哈希不进入响应。
  const result = data.users
    .filter((item) => !req.query.role || item.role === req.query.role)
    .map(({ password, ...safe }) => safe);
  ok(res, result, { total: result.length });
});

// 新增用户账号接口，先校验账号信息，再检查账号是否重复及人员档案是否存在，最后创建用户账户并绑定到对应人员。
router.post("/users", asyncRoute(async (req, res) => {
  // 如果显式传入账号类型则必须属于允许集合；未传入时使用通用“账号”类型。
  if (req.body?.accountType !== undefined && !accountTypes.has(req.body.accountType)) return fail(res, 400, "账号类型不正确");
  const body = {
    ...req.body,
    accountType: accountTypes.has(req.body?.accountType) ? req.body.accountType : "账号"
  };
  // 根据账号类型统一手机号、学号或字母编号的存储形式。
  body.username = normalizeAccountValue(body.username, body.accountType);
  const missing = requireFields(body, ["username", "password", "role", "personId"]);
  if (missing.length) return fail(res, 400, "用户信息不完整", { missing });
  const validationError = validateUserBody(body, body.accountType);
  if (validationError) return fail(res, 400, validationError);

  const result = await updateData((data) => {
    // 账号名必须全局唯一，personId 也必须指向真实存在的人员档案。
    if (data.users.some((item) => item.username === body.username)) return { error: "duplicatedUsername" };
    if (!data.people.some((item) => item.id === body.personId)) return { error: "personNotFound" };
    // 密码经过哈希后写入，响应则仅返回排除 password 的安全字段。
    const user = {
      id: body.id || nextId("U-"),
      username: body.username,
      accountType: body.accountType,
      password: hashPassword(body.password),
      role: body.role,
      personId: body.personId,
      status: body.status || "启用"
    };
    data.users.unshift(user);
    const { password, ...safe } = user;
    return safe;
  });

  if (result.error === "duplicatedUsername") return fail(res, 409, "账号已存在");
  if (result.error === "personNotFound") return fail(res, 404, "绑定人员不存在");
  created(res, result);
}));

// 修改用户账号信息接口，可变更账号名、账号类型、角色、绑定人员、状态和密码，并在需要时重新校验唯一性和关联关系。
router.patch("/users/:id", asyncRoute(async (req, res) => {
  const result = await updateData((data) => {
    const user = data.users.find((item) => item.id === req.params.id);
    if (!user) return null;
    // 使用请求中的新账号类型或原账号类型来标准化用户名，并以局部模式校验修改内容。
    const accountType = req.body?.accountType || user.accountType || "账号";
    const body = {
      ...req.body,
      accountType,
      username: req.body?.username !== undefined ? normalizeAccountValue(req.body.username, accountType) : undefined
    };
    const validationError = validateUserBody(body, accountType, { partial: true });
    if (validationError) return { error: "validation", message: validationError };

    if (body.username !== undefined) {
      // 用户名若被修改，需同时校验非空和全局唯一性。
      const username = body.username;
      if (!username) return { error: "emptyUsername" };
      if (username !== user.username && data.users.some((item) => item.username === username)) {
        return { error: "duplicatedUsername" };
      }
      user.username = username;
    }
    if (body.accountType !== undefined) user.accountType = body.accountType || "账号";
    if (body.role !== undefined) user.role = body.role;
    if (body.personId !== undefined) {
      if (!data.people.some((item) => item.id === body.personId)) return { error: "personNotFound" };
      user.personId = body.personId;
    }
    // password 只有在明确提供非空值时才重新哈希写入，未提供则保留旧密码。
    if (body.status !== undefined) user.status = body.status;
    if (body.password !== undefined && String(body.password)) user.password = hashPassword(body.password);

    const { password, ...safe } = user;
    return safe;
  });

  if (result?.error === "validation") return fail(res, 400, result.message);
  if (result?.error === "emptyUsername") return fail(res, 400, "账号不能为空");
  if (result?.error === "duplicatedUsername") return fail(res, 409, "账号已存在");
  if (result?.error === "personNotFound") return fail(res, 404, "绑定人员不存在");
  if (!result) return fail(res, 404, "用户不存在");
  ok(res, result);
}));

// 导出管理端路由，供服务入口统一挂载。
export default router;
