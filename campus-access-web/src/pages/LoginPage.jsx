// 登录页使用本地状态维护登录/注册表单，并通过路由 Hook 在认证成功后跳转到角色首页。
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  DoorOpen,
  KeyRound,
  QrCode,
  ScanFace,
  School,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { api } from "../api/client.js";
import { homePathByRole } from "../config/roles.js";
import hfutCampusImage from "../assets/hfut-campus.jpg";

// 左侧校园宣传区的三项系统能力摘要；icon 保存图标组件引用，渲染时再实例化。
const accessHighlights = [
  { label: "多源身份核验", value: "校园卡 / 人脸 / 二维码", icon: ScanFace },
  { label: "访客预约通行", value: "审核、二维码、入校记录", icon: QrCode },
  { label: "门岗实时处置", value: "异常复核与临时放行", icon: DoorOpen }
];

/** 手机号输入标准化：移除所有非数字字符，并限制为中国大陆手机号的 11 位长度。 */
function normalizePhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

/** 判断输入是否为 1 开头的 11 位手机号。 */
function isValidPhone(value) {
  return /^1\d{10}$/.test(String(value || "").trim());
}

/** 身份证输入标准化：转为大写，仅保留数字和校验位 X，最多保留 18 位。 */
function normalizeIdNumberInput(value) {
  return String(value || "").toUpperCase().replace(/[^\dX]/g, "").slice(0, 18);
}

/** 对身份证执行基础格式校验：前 17 位必须为数字，末位允许数字或 X。 */
function isValidIdNumber(value) {
  return /^\d{17}[\dX]$/.test(String(value || "").trim().toUpperCase());
}

/**
 * 登录与访客注册页面。
 * onLogin 由 App 传入，认证成功后把完整会话提升到根组件统一管理。
 */
export default function LoginPage({ onLogin }) {
  // navigate 用于成功登录后的编程式跳转；mode 在账号登录、访客注册和找回密码三个面板之间切换。
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  // 登录表单只包含账号和密码；账号可对应学号、工号、校友编号或访客手机号。
  const [loginForm, setLoginForm] = useState({ account: "", password: "" });
  // 注册表单收集访客身份、联系方式、验证码和登录凭据。
  const [registerForm, setRegisterForm] = useState({
    name: "",
    phone: "",
    code: "",
    password: "",
    confirmPassword: "",
    idNumber: "",
    company: ""
  });
  // 找回密码表单通过账号和绑定手机号获取验证码，再设置新密码。
  const [resetForm, setResetForm] = useState({
    account: "",
    phone: "",
    code: "",
    newPassword: "",
    confirmPassword: ""
  });
  // 开发演示环境会把验证码返回并显示；message 统一展示成功/错误提示；submitting 防止重复提交。
  const [visitorCodePreview, setVisitorCodePreview] = useState("");
  const [resetCodePreview, setResetCodePreview] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** 清空注册表单和验证码预览，注册成功后避免敏感字段残留在页面状态中。 */
  function resetRegisterForm() {
    setRegisterForm({
      name: "",
      phone: "",
      code: "",
      password: "",
      confirmPassword: "",
      idNumber: "",
      company: ""
    });
    setVisitorCodePreview("");
  }

  /** 清空找回密码表单和验证码预览，避免验证码和新密码在模式切换后残留。 */
  function resetResetForm() {
    setResetForm({
      account: "",
      phone: "",
      code: "",
      newPassword: "",
      confirmPassword: ""
    });
    setResetCodePreview("");
  }

  /** 手机号改变后同步清除旧验证码，防止把为旧号码签发的验证码用于新号码。 */
  function updateRegisterPhone(value) {
    const phone = normalizePhoneInput(value);
    setRegisterForm((current) => ({ ...current, phone, code: "" }));
    setVisitorCodePreview("");
  }

  /** 找回密码手机号变化时清除旧验证码，确保验证码始终属于当前账号和手机号组合。 */
  function updateResetPhone(value) {
    const phone = normalizePhoneInput(value);
    setResetForm((current) => ({ ...current, phone, code: "" }));
    setResetCodePreview("");
  }

  /**
   * 登录流程的唯一实现，普通表单提交和演示账号快捷登录都复用此函数。
   * 成功后持久化令牌/用户、通知根组件更新会话，并按角色跳转默认首页。
   */
  async function performLogin(credentials, authenticate = api.login) {
    // 上一次请求未结束时忽略再次触发，避免创建重复会话。
    if (submitting) return;
    setSubmitting(true);
    setMessage("");

    try {
      const session = await authenticate(credentials);
      // 独立保存 token 供 API 客户端快速读取，同时保留用户对象供兼容逻辑使用。
      localStorage.setItem("campus_token", session.token);
      localStorage.setItem("campus_user", JSON.stringify(session.user));
      onLogin(session);
      // replace 避免登录页留在历史栈中，登录后点击后退不会重新看到登录表单。
      navigate(homePathByRole[session.user.role] || "/", { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 阻止浏览器默认表单刷新，并把当前登录表单交给公共登录流程。 */
  async function submitLogin(event) {
    event.preventDefault();
    await performLogin(loginForm);
  }

  /** 本机合成演示由受控预览层代填密码，浏览器不接收或显示密码。 */
  async function loginWithDemoAccount(account) {
    setLoginForm({ account, password: "" });
    await performLogin({ account }, async (credentials) => {
      const response = await fetch("/__synthetic-demo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        signal: AbortSignal.timeout(8000)
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error?.message || "演示登录暂不可用");
      return result.data;
    });
  }

  /** 请求访客短信验证码；演示环境可能在响应中附带验证码供页面彩色展示。 */
  async function sendCode() {
    setMessage("");
    // 前端先做格式校验，减少明显无效请求。
    if (!isValidPhone(registerForm.phone)) {
      setMessage("请输入 11 位有效手机号");
      return;
    }

    try {
      const result = await api.sendVisitorCode({ phone: registerForm.phone });
      // 新验证码签发后清空输入框，要求用户重新填写本次验证码。
      setRegisterForm((current) => ({ ...current, code: "" }));
      setVisitorCodePreview(result.code || "");
      setMessage(result.code ? `验证码已生成，有效期 ${result.expireMinutes} 分钟` : "验证码已发送，请输入收到的验证码");
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 请求找回密码验证码，后端会校验账号与绑定手机号是否匹配。 */
  async function sendResetCode() {
    setMessage("");
    if (!resetForm.account.trim()) {
      setMessage("请输入需要找回密码的账号");
      return;
    }
    if (!isValidPhone(resetForm.phone)) {
      setMessage("请输入 11 位有效手机号");
      return;
    }

    try {
      const result = await api.sendResetCode({
        account: resetForm.account.trim(),
        phone: resetForm.phone
      });
      setResetForm((current) => ({ ...current, code: "" }));
      setResetCodePreview(result.code || "");
      setMessage(result.code ? `重置验证码已生成，有效期 ${result.expireMinutes} 分钟` : "验证码已发送，请输入收到的验证码");
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 校验验证码和两次新密码，然后调用后端完成真正的密码重置。 */
  async function submitResetPassword(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    if (!resetForm.account.trim()) {
      setMessage("请输入需要找回密码的账号");
      setSubmitting(false);
      return;
    }
    if (!isValidPhone(resetForm.phone)) {
      setMessage("请输入 11 位有效手机号");
      setSubmitting(false);
      return;
    }
    if (!resetForm.code.trim()) {
      setMessage("请输入验证码");
      setSubmitting(false);
      return;
    }
    if (!resetForm.newPassword) {
      setMessage("请输入新密码");
      setSubmitting(false);
      return;
    }
    if (resetForm.newPassword !== resetForm.confirmPassword) {
      setMessage("两次输入的新密码不一致");
      setSubmitting(false);
      return;
    }
    if (resetCodePreview && resetForm.code.trim() !== resetCodePreview) {
      setMessage("验证码错误，请按彩色验证码重新输入");
      setSubmitting(false);
      return;
    }

    try {
      await api.resetPassword({
        ...resetForm,
        account: resetForm.account.trim(),
        code: resetForm.code.trim()
      });
      const account = resetForm.account.trim();
      resetResetForm();
      setLoginForm({ account, password: "" });
      setMode("login");
      setMessage("密码已重置，请使用新密码登录");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 校验并提交访客注册；所有本地校验通过后才调用后端创建人员和登录账号。 */
  async function submitRegister(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    // 手机号、身份证、验证码和密码依次校验；任一步失败都恢复按钮并立即结束。
    if (!isValidPhone(registerForm.phone)) {
      setMessage("请输入 11 位有效手机号");
      setSubmitting(false);
      return;
    }

    if (!isValidIdNumber(registerForm.idNumber)) {
      setMessage("请输入完整的 18 位身份证号码");
      setSubmitting(false);
      return;
    }

    if (!registerForm.code.trim()) {
      setMessage("请输入验证码");
      setSubmitting(false);
      return;
    }

    if (!registerForm.password) {
      setMessage("请输入登录密码");
      setSubmitting(false);
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setMessage("两次输入的密码不一致");
      setSubmitting(false);
      return;
    }

    if (visitorCodePreview && registerForm.code.trim() !== visitorCodePreview) {
      // 仅演示验证码可见时执行前端比对，正式短信模式由后端独立校验。
      setMessage("验证码错误，请按彩色验证码重新输入");
      setSubmitting(false);
      return;
    }

    try {
      // 展开完整表单，并确保验证码去除首尾空白后提交。
      const result = await api.registerVisitor({
        ...registerForm,
        code: registerForm.code.trim()
      });
      // 注册成功后把手机号回填为登录账号，清空密码并切回登录模式。
      const phone = result.phone || registerForm.phone;
      resetRegisterForm();
      setLoginForm({ account: phone, password: "" });
      setMode("login");
      setMessage("注册成功，请使用手机号和密码登录");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    // 页面以浅灰背景承托居中的双栏认证卡片；小屏自动改为上下布局。
    <div className="min-h-screen bg-[#e8eef4] p-3 text-textMain md:p-6">
      <main className="mx-auto grid min-h-[calc(100vh-24px)] max-w-[1360px] overflow-hidden rounded-[32px] bg-white shadow-soft ring-1 ring-white/80 lg:min-h-[calc(100vh-48px)] lg:grid-cols-[1.08fr_.92fr]">
        {/* 左侧品牌展示区：校园实景图、遮罩、系统标题和三项能力说明。 */}
        <section className="relative min-h-[430px] overflow-hidden bg-slate-950 p-5 text-white md:p-8 lg:min-h-full">
          <img
            src={hfutCampusImage}
            alt="合肥工业大学校园入口"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* 渐变遮罩增强白色文字对不同照片区域的可读性。 */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/30 to-slate-950/82" />
          <div className="relative flex h-full min-h-[390px] flex-col justify-between gap-8">
            {/* 顶部学校品牌和统一身份认证标识。 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/18 ring-1 ring-white/30 backdrop-blur">
                  <School size={25} />
                </div>
                <div>
                  <div className="text-sm text-white/70">合肥工业大学</div>
                  <div className="text-base font-semibold">校园出入管理平台</div>
                </div>
              </div>
              <div className="hidden items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs text-white/80 ring-1 ring-white/20 backdrop-blur md:flex">
                <ShieldCheck size={15} />
                统一身份认证
              </div>
            </div>

            {/* 中部系统名称和目标用户/核心能力说明。 */}
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/14 px-4 py-2 text-xs font-medium text-white/85 ring-1 ring-white/20 backdrop-blur">
                <BadgeCheck size={15} />
                HFUT Campus Access
              </div>
              <h1 className="max-w-full text-3xl font-bold leading-tight md:text-5xl">
                <span className="block">智慧校园出入管理</span>
                <span className="block">信息系统</span>
              </h1>
              <p className="mt-5 max-w-[300px] break-all text-sm leading-7 text-white/82 md:max-w-xl md:break-words md:text-base">
                面向学生、教职工、访客、校友和门岗安保，统一完成身份识别、预约通行、设备核验和异常处置。
              </p>
            </div>

            {/* 底部能力卡片由 accessHighlights 配置驱动。 */}
            <div className="grid gap-3 md:grid-cols-3">
              {accessHighlights.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-[22px] bg-white/14 p-4 ring-1 ring-white/20 backdrop-blur">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-2xl bg-white/18">
                    <Icon size={18} />
                  </div>
                  <div className="text-sm font-semibold">{label}</div>
                  <div className="mt-1 text-xs leading-5 text-white/68">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 右侧认证交互区在可用空间中水平、垂直居中。 */}
        <section className="flex items-center justify-center bg-[#f8fafc] px-4 py-6 md:px-8">
          <div className="w-full max-w-[500px]">
            {/* 标题和图标根据当前 mode 在“系统登录/访客注册/找回密码”之间切换。 */}
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-400">Campus Access</div>
                <h2 className="mt-1 text-2xl font-bold">{mode === "register" ? "访客注册" : mode === "forgot" ? "找回密码" : "系统登录"}</h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-primary shadow-card">
                {mode === "register" ? <UserRound size={20} /> : <KeyRound size={20} />}
              </div>
            </div>

            {/* 白色认证卡片包含模式切换、对应表单和反馈信息。 */}
            <div className="rounded-[28px] bg-white p-5 shadow-card ring-1 ring-slate-100 md:p-6">
              {mode === "forgot" ? (
                <div className="mb-6 rounded-2xl bg-slate-100/70 p-1 text-sm">
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setMessage(""); setResetCodePreview(""); }}
                    className="h-11 w-full rounded-xl bg-white font-medium text-primary shadow-card transition hover:text-primary2"
                  >
                    返回账号登录
                  </button>
                </div>
              ) : (
                <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100/70 p-1 text-sm">
                  <button
                    type="button"
                    // 切换模式时清空旧提示，避免登录错误出现在注册表单中。
                    onClick={() => { setMode("login"); setMessage(""); }}
                    className={`h-11 rounded-xl font-medium transition ${mode === "login" ? "bg-white text-primary shadow-card" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    账号登录
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setMessage(""); }}
                    className={`h-11 rounded-xl font-medium transition ${mode === "register" ? "bg-white text-primary shadow-card" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    访客注册
                  </button>
                </div>
              )}

              {/* 根据 mode 渲染账号登录、访客注册或找回密码表单。 */}
              {mode === "login" ? (
                <form onSubmit={submitLogin} className="space-y-4">
                  {/* 登录输入框使用带图标的 AuthInput，状态更新保留另一个字段。 */}
                  <AuthInput
                    label="账号"
                    value={loginForm.account}
                    onChange={(value) => setLoginForm((current) => ({ ...current, account: value }))}
                    placeholder="学号 / 工号 / 校友编号 / 手机号"
                    icon={UserRound}
                  />
                  <AuthInput
                    label="密码"
                    value={loginForm.password}
                    onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                    type="password"
                    placeholder="请输入密码"
                    icon={KeyRound}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setResetForm((current) => ({ ...current, account: loginForm.account }));
                        setMode("forgot");
                        setMessage("");
                      }}
                      className="text-sm font-medium text-primary transition hover:text-primary2"
                    >
                      忘记密码？
                    </button>
                  </div>
                  <Notice message={message} />
                  {/* 提交期间禁用按钮并替换文案，防止重复登录。 */}
                  <button
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white shadow-glow transition hover:bg-primary2 disabled:opacity-60"
                  >
                    {submitting ? "正在登录..." : "进入系统"}
                    {!submitting && <ArrowRight size={18} />}
                  </button>
                  {/* 五类预置演示账号可点击直接登录。 */}
                  <DemoAccounts onLogin={loginWithDemoAccount} disabled={submitting} />
                </form>
              ) : mode === "register" ? (
                <form onSubmit={submitRegister} className="space-y-4">
                  {/* 第一组两列字段收集访客真实身份和单位信息。 */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="姓名" value={registerForm.name} onChange={(value) => setRegisterForm((current) => ({ ...current, name: value }))} />
                    <Field
                      label="手机号"
                      value={registerForm.phone}
                      onChange={updateRegisterPhone}
                      inputMode="numeric"
                      maxLength={11}
                    />
                    <Field
                      label="身份证号"
                      required
                      value={registerForm.idNumber}
                      maxLength={18}
                      onChange={(value) => setRegisterForm((current) => ({
                        ...current,
                        idNumber: normalizeIdNumberInput(value)
                      }))}
                    />
                    <Field label="单位名称" value={registerForm.company} onChange={(value) => setRegisterForm((current) => ({ ...current, company: value }))} />
                  </div>
                  {/* 验证码输入和发送按钮并排，按钮不提交整个表单。 */}
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Field
                      label="验证码"
                      value={registerForm.code}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, code: normalizePhoneInput(value).slice(0, 6) }))}
                      inputMode="numeric"
                      maxLength={6}
                    />
                    <button type="button" onClick={sendCode} className="mt-7 h-12 rounded-2xl bg-primarySoft px-4 text-sm font-medium text-primary">
                      获取验证码
                    </button>
                  </div>
                  {/* 仅后端返回演示验证码时显示彩色验证码预览。 */}
                  {visitorCodePreview && <CaptchaPreview code={visitorCodePreview} />}
                  {/* 密码与确认密码并排，提交前要求两者完全一致。 */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="登录密码" type="password" value={registerForm.password} onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))} />
                    <Field label="确认密码" type="password" value={registerForm.confirmPassword} onChange={(value) => setRegisterForm((current) => ({ ...current, confirmPassword: value }))} />
                  </div>
                  <Notice message={message} />
                  <button
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white shadow-glow transition hover:bg-primary2 disabled:opacity-60"
                  >
                    {submitting ? "正在注册..." : "注册并返回登录"}
                    {!submitting && <ArrowRight size={18} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitResetPassword} className="space-y-4">
                  <Field
                    label="账号"
                    value={resetForm.account}
                    onChange={(value) => setResetForm((current) => ({ ...current, account: value }))}
                  />
                  <Field
                    label="绑定手机号"
                    value={resetForm.phone}
                    onChange={updateResetPhone}
                    inputMode="numeric"
                    maxLength={11}
                  />
                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <Field
                      label="验证码"
                      value={resetForm.code}
                      onChange={(value) => setResetForm((current) => ({ ...current, code: normalizePhoneInput(value).slice(0, 6) }))}
                      inputMode="numeric"
                      maxLength={6}
                    />
                    <button type="button" onClick={sendResetCode} className="mt-7 h-12 rounded-2xl bg-primarySoft px-4 text-sm font-medium text-primary">
                      获取验证码
                    </button>
                  </div>
                  {resetCodePreview && <CaptchaPreview code={resetCodePreview} />}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="新密码" type="password" value={resetForm.newPassword} onChange={(value) => setResetForm((current) => ({ ...current, newPassword: value }))} />
                    <Field label="确认新密码" type="password" value={resetForm.confirmPassword} onChange={(value) => setResetForm((current) => ({ ...current, confirmPassword: value }))} />
                  </div>
                  <Notice message={message} />
                  <button
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white shadow-glow transition hover:bg-primary2 disabled:opacity-60"
                  >
                    {submitting ? "正在重置..." : "重置密码"}
                    {!submitting && <ArrowRight size={18} />}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// 验证码每个字符轮流使用的背景色与旋转角度，增强视觉区分度。
const captchaStyles = [
  { background: "#2563eb", transform: "rotate(-8deg)" },
  { background: "#dc2626", transform: "rotate(7deg)" },
  { background: "#059669", transform: "rotate(-4deg)" },
  { background: "#d97706", transform: "rotate(9deg)" },
  { background: "#7c3aed", transform: "rotate(-6deg)" },
  { background: "#0891b2", transform: "rotate(5deg)" }
];

/** 把演示验证码拆成单字符彩色块；样式数量不足时通过取模循环使用。 */
function CaptchaPreview({ code }) {
  return (
    <div className="rounded-2xl border border-dashed border-primary/30 bg-slate-50 p-3">
      <div className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white shadow-sm">
        {String(code).split("").map((char, index) => (
          <span
            // 字符可能重复，因此 key 同时包含位置索引。
            key={`${char}-${index}`}
            className="inline-flex h-9 w-8 items-center justify-center rounded-lg text-lg font-black text-white shadow-sm"
            style={captchaStyles[index % captchaStyles.length]}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 登录专用输入框，在普通输入控件左侧增加语义图标和 focus-within 整体高亮。 */
function AuthInput({ label, value, onChange, icon: Icon, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-500">{label}</span>
      <span className="flex h-12 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 transition focus-within:border-primary/40 focus-within:bg-white focus-within:shadow-card">
        <Icon size={18} className="shrink-0 text-slate-400" />
        <input
          // 组件只回传纯字符串，不把浏览器事件对象泄漏到页面状态层。
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          className="h-full min-w-0 flex-1 bg-transparent outline-none"
          placeholder={placeholder}
        />
      </span>
    </label>
  );
}

/** 注册表单通用字段，支持输入类型、移动键盘模式和最大长度约束。 */
function Field({ label, value, onChange, type = "text", inputMode, maxLength }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 outline-none transition focus:border-primary/40 focus:bg-white focus:shadow-card"
        placeholder={`请输入${label}`}
      />
    </label>
  );
}

/** 根据提示文案中的错误关键词自动选择红色错误样式或紫色成功/信息样式。 */
function Notice({ message }) {
  // 空消息不占据表单垂直空间。
  if (!message) return null;
  const isError = /失败|错误|请输入|请先|不一致|不存在|停用|失效|无权|过期/.test(message);
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${isError ? "bg-red-50 text-danger" : "bg-primarySoft text-primary"}`}>
      {message}
    </div>
  );
}

/** 演示按钮只显示当前隔离数据库中白名单账号，不显示密码。 */
function DemoAccounts({ onLogin, disabled = false }) {
  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/__synthetic-demo/accounts", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setAccounts(result?.success && Array.isArray(result.data) ? result.data : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  if (!accounts.length) return null;

  return (
    <div className="rounded-[22px] bg-slate-50 p-4 text-xs text-slate-500">
      <div className="mb-3 flex items-center gap-2 font-semibold text-slate-600">
        <ShieldCheck size={15} />
        演示账号
        <span className="ml-auto font-normal text-slate-400">点击直接登录</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {/* 使用角色名称作为稳定 key；提交期间所有按钮统一禁用。 */}
        {accounts.map(({ label: role, account, enabled }) => (
          <button
            key={role}
            type="button"
            disabled={disabled || !enabled}
            onClick={() => onLogin(account)}
            className="rounded-2xl bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:text-primary hover:shadow-card focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`使用${role}演示账号登录`}
          >
            <div className="font-medium text-slate-700">{role}</div>
            <div className="mt-1 text-slate-400">{account} · {enabled ? "点击登录" : "账号已停用"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
