// 本文件集中实现学生、教职工、访客、校友和门岗五类角色首页，并复用统一 UI 与数据 Hook。
import { useEffect, useState } from "react";
import Panel from "../components/ui/Panel.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Badge from "../components/ui/Badge.jsx";
import QRCodeMock from "../components/ui/QRCodeMock.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import { api } from "../api/client.js";
import { useApiData } from "../api/useApiData.js";

// 角色驾驶舱的稳定默认结构：接口加载前各页面可以直接读取数组、对象和可空凭证字段。
const emptyDashboard = {
  cards: [],
  person: {},
  profile: {},
  appointments: [],
  records: [],
  exceptions: [],
  qrCode: null,
  vehicle: null,
  face: null
};

/** 按角色和当前用户编号加载驾驶舱；角色或账号变化时自动重新请求。 */
function useRoleDashboard(role, session) {
  return useApiData(
    () => api.roleDashboard(role, session?.user?.id),
    emptyDashboard,
    [role, session?.user?.id]
  );
}

/** 学生首页：展示个人通行统计和只读学籍主数据。 */
export function StudentDashboard({ session }) {
  const { data } = useRoleDashboard("student", session);
  // 优先使用接口返回的最新人员档案，加载前回退到登录会话中的人员信息。
  const person = data.person || session.person || {};

  return (
    // 超宽屏左右分栏，较窄屏幕自然堆叠。
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <Panel title="学生首页" subtitle="刷校园卡或刷脸即可直接进入校园，无需提交出入申请">
        <div className="grid gap-4 md:grid-cols-3">
          {/* 统计卡配置由后端返回，展开属性直接交给通用 StatCard。 */}
          {(data.cards || []).map((item) => <StatCard key={item.title} {...item} />)}
        </div>
      </Panel>
      <Panel title="个人信息" subtitle="学号、姓名、学院等主数据不可自行修改">
        {/* 空值字段会由 InfoRows 过滤，手机号在展示前执行隐私脱敏。 */}
        <InfoRows rows={[
          ["学号", person.code],
          ["姓名", person.name],
          ["学院", person.college],
          ["专业班级", person.className],
          ["联系电话", maskPhone(person.phone)]
        ]} />
      </Panel>
    </div>
  );
}

/** 教职工首页：展示通行统计、待本人审核的预约和本人相关异常。 */
export function TeacherDashboard({ session }) {
  const { data } = useRoleDashboard("teacher", session);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
        <Panel title="教职工首页" subtitle="支持刷卡、刷脸、车牌识别通行，并可审核访客预约">
          <div className="grid gap-4 md:grid-cols-3">
            {(data.cards || []).map((item) => <StatCard key={item.title} {...item} />)}
          </div>
        </Panel>
        <Panel title="待被访人审核访客预约">
          {/* 只保留尚处于被访人审核阶段的预约，不混入保卫处复审或已完成记录。 */}
          <DataTable
            columns={[
              { title: "预约编号", key: "id" },
              { title: "访客", key: "visitor" },
              { title: "来访时间", key: "time" },
              { title: "状态", key: "status", badge: true }
            ]}
            rows={(data.appointments || []).filter((item) => item.status === "待被访人审核" || item.status === "待审核")}
          />
        </Panel>
      </div>
      <Panel title="异常记录" subtitle="与本人相关的异常事件会在这里同步展示">
        {/* 风险和处理状态列使用 Badge 语义色突出。 */}
        <DataTable
          columns={[
            { title: "异常编号", key: "id" },
            { title: "时间", key: "time" },
            { title: "异常类型", key: "type" },
            { title: "原因", key: "reason" },
            { title: "风险", key: "risk", badge: true },
            { title: "状态", key: "status", badge: true }
          ]}
          rows={data.exceptions || []}
        />
      </Panel>
    </div>
  );
}

/** 门岗工作台首页：顶部展示值守指标，主体实时列出最近通行记录。 */
export function GuardDashboard({ session }) {
  const { data } = useRoleDashboard("guard", session);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 md:grid-cols-3">
        {/* 卡片数量及内容由门岗驾驶舱接口决定。 */}
        {(data.cards || []).map((item) => <StatCard key={item.title} {...item} />)}
      </section>
      <Panel title="实时通行监控" subtitle="正常记录来自闸机自动同步，门岗只处理异常干预">
        <DataTable
          columns={[
            { title: "时间", key: "time" },
            { title: "姓名", key: "name" },
            { title: "学号/工号/编号", key: "personCode" },
            { title: "类型", key: "type" },
            { title: "方式", key: "method" },
            { title: "校门", key: "gate" },
            { title: "状态", key: "status", badge: true }
          ]}
          rows={data.records || []}
        />
      </Panel>
    </div>
  );
}

/** 访客首页：展示预约相关统计并提供新的来访预约申请表。 */
export function VisitorDashboard({ session }) {
  // reload 会在新预约创建成功后刷新卡片和预约数据。
  const { data, reload } = useRoleDashboard("visitor", session);

  return (
    <div className="space-y-6">
      {/* 没有统计卡时不渲染空白 section。 */}
      {(data.cards || []).length > 0 && (
        <section className="grid gap-5 md:grid-cols-3">
          {data.cards.map((item) => <StatCard key={item.title} {...item} />)}
        </section>
      )}
      <Panel title="访客预约申请" subtitle="访客需要先预约，通过后使用动态二维码扫码入校">
        <AppointmentForm session={session} person={data.person} onCreated={reload} />
      </Panel>
    </div>
  );
}

/** 校友首页：展示统计，并在没有有效凭证时自动签发当日动态二维码。 */
export function AlumniDashboard({ session }) {
  const { data, reload, loading } = useRoleDashboard("alumni", session);
  // message 反馈自动签发结果；autoIssueAttempted 保证一次组件生命周期只自动尝试一次。
  const [message, setMessage] = useState("");
  const [autoIssueAttempted, setAutoIssueAttempted] = useState(false);
  // 只有二维码存在且后端状态明确为“有效”时才视为可使用。
  const hasUsableQr = Boolean(data.qrCode && data.qrCode.status === "有效");

  // 驾驶舱初次加载完成后，如无可用二维码则自动为当前校友创建。
  useEffect(() => {
    // 数据仍在加载、已有有效码或已经尝试过时均不再签发。
    if (loading || hasUsableQr || autoIssueAttempted) return;
    setAutoIssueAttempted(true);

    api.createQrCode({
      type: "alumni",
      ownerName: data.profile?.name || session.profile?.name,
      ownerId: data.profile?.personId || session.user.personId
    }).then(() => {
      // 签发成功后重新获取驾驶舱，取得后端生成的 token 和有效期。
      setMessage("二维码已自动生成");
      reload();
    }).catch((error) => {
      setMessage(error.message);
    });
  }, [loading, hasUsableQr, autoIssueAttempted, data.profile?.personId, session.user.personId]);

  // 每十五秒同步二维码状态，及时反映后端核验后的过期或失效变化。
  useEffect(() => {
    const timer = window.setInterval(() => {
      reload();
    }, 15000);

    // 组件卸载时清理轮询，避免后台持续发起请求。
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
      <Panel title="校友首页" subtitle="校友可申请当日有效二维码，扫码入校">
        <div className="grid gap-4 md:grid-cols-3">
          {(data.cards || []).map((item) => <StatCard key={item.title} {...item} />)}
        </div>
      </Panel>
      <Panel title="校友入校二维码">
        {/* QRCodeMock 根据 token 和时间片绘制动态 SVG；无 token 时显示未生成占位状态。 */}
        <QRCodeMock
          value={data.qrCode?.token || ""}
          title="校友动态二维码"
          subtitle={data.qrCode ? `${displayDateTime(data.qrCode.validFrom)}-${displayDateTime(data.qrCode.validTo)}` : "当日有效 / 限本人使用"}
          status={data.qrCode?.status}
        />
        {message && <p className="mt-3 text-center text-sm text-slate-400">{message}</p>}
      </Panel>
    </div>
  );
}

/** 以键值行展示只读个人信息，并在底部强调主数据不可自行修改。 */
function InfoRows({ rows }) {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50/60">
      {/* 过滤空值，避免渲染没有实际内容的标签行。 */}
      {rows.filter(([, value]) => value).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-400">{key}</span>
          <span className="font-medium text-slate-700">{value}</span>
        </div>
      ))}
      <div className="px-4 py-3">
        <Badge type="info">核心身份信息只读，不允许自行修改</Badge>
      </div>
    </div>
  );
}

/**
 * 访客预约申请表。
 * 访客身份从会话/人员档案预填，被访人必须填写唯一编号并匹配系统允许的候选人员，创建成功后通知父页面刷新。
 */
function AppointmentForm({ session, person, onCreated }) {
  // 候选被访人由后端提供，避免访客向系统外人员提交无效预约。
  const { data: hosts } = useApiData(() => api.appointmentHosts(), [], []);
  // 身份字段优先用人员档案预填，预约事由和时间由访客本次填写。
  const [form, setForm] = useState({
    visitor: person?.name || session?.profile?.name || "",
    idNumber: person?.idNumber || "",
    visitorPhone: person?.phone || "",
    host: "",
    reason: "",
    visitStart: "",
    visitEnd: ""
  });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 人员档案异步返回时，只补齐仍为空的身份字段，不覆盖用户已经手动输入的内容。
  useEffect(() => {
    if (!person) return;
    setForm((current) => ({
      ...current,
      visitor: current.visitor || person.name || "",
      idNumber: current.idNumber || person.idNumber || "",
      visitorPhone: current.visitorPhone || person.phone || ""
    }));
  }, [person]);

  // 动态字段配置依次声明状态键、中文标签和 HTML 输入类型。
  const fields = [
    ["visitor", "访客姓名", "text"],
    ["idNumber", "证件号码", "text"],
    ["visitorPhone", "联系电话", "tel"],
    ["reason", "来访事由", "text"],
    ["visitStart", "来访时间", "datetime-local"],
    ["visitEnd", "预计离校时间", "datetime-local"]
  ];

  /** 被访人输入只允许匹配人员编号或系统 ID，避免使用姓名造成重名歧义。 */
  function isValidHost(value) {
    const text = String(value || "").trim();
    return hosts.some((host) => [host.code, host.id].includes(text));
  }

  /** 执行必填校验、被访人校验和预约创建。 */
  async function handleSubmit(event) {
    event.preventDefault();
    // 必填项缺失时一次性提示完整要求，不向后端发送半成品数据。
    if (!form.visitor.trim() || !form.visitorPhone.trim() || !form.host.trim() || !form.reason.trim() || !form.visitStart || !form.visitEnd) {
      setMessage("请完整填写访客姓名、联系电话、被访人、来访事由和来访时间");
      return;
    }
    // 本地候选列表未命中时停止提交，防止随意填写被访人。
    if (!isValidHost(form.host)) {
      setMessage("被访人必须填写系统内学生、教职工或保卫处管理员的学号/工号/编号，不能填写姓名");
      return;
    }
    setSubmitting(true);
    setMessage("");

    try {
      await api.createAppointment({
        ...form,
        // datetime-local 使用 T 分隔，提交前转换为后端统一的空格分隔格式。
        visitStart: form.visitStart.replace("T", " "),
        visitEnd: form.visitEnd.replace("T", " "),
        userId: session?.user?.id
      });
      // 保留访客身份与被访人，仅清空适合连续预约时重新填写的事由和时间。
      setMessage("预约已提交，等待被访人审核");
      setForm((current) => ({ ...current, reason: "", visitStart: "", visitEnd: "" }));
      onCreated?.();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
      {/* 被访人单独渲染；只能填写唯一编号，不能填写姓名这类非唯一文本。 */}
      <label className="block">
        <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
          被访人编号
          <span className="text-danger">*</span>
        </span>
        <input
          value={form.host}
          onChange={(event) => setForm((current) => ({ ...current, host: event.target.value }))}
          required
          maxLength={30}
          className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 px-4 outline-none"
          placeholder="请输入学号 / 工号 / 管理员编号"
        />
        <span className="mt-1 block text-xs text-slate-400">只能填写唯一编号，不能填写被访人姓名</span>
      </label>
      {/* 其余字段按配置生成；来访事由跨两列，其余字段在桌面端两列排列。 */}
      {fields.map(([key, label, type]) => (
        <label key={key} className={key === "reason" ? "md:col-span-2" : ""}>
          <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
            {label}
            {/* 身份证号允许为空，其余预约核心字段均为必填。 */}
            {key !== "idNumber" && <span className="text-danger">*</span>}
          </span>
          <input
            value={form[key]}
            onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
            type={type}
            required={key !== "idNumber"}
            className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 px-4 outline-none"
            placeholder={`请输入${label}`}
          />
        </label>
      ))}
      {/* 反馈条根据常见失败关键词切换红色或主色样式。 */}
      {message && <div className={`rounded-2xl px-4 py-3 text-sm md:col-span-2 ${message.includes("请完整") || message.includes("失败") ? "bg-red-50 text-danger" : "bg-primarySoft text-primary"}`}>{message}</div>}
      {/* 表单操作区跨满整行：主按钮提交，次按钮只清空本次预约内容。 */}
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 md:col-span-2">
        <button disabled={submitting} className="h-11 rounded-2xl bg-primary px-5 text-white shadow-glow disabled:opacity-60">
          {submitting ? "提交中..." : "提交预约申请"}
        </button>
        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, reason: "", visitStart: "", visitEnd: "" }))}
          className="h-11 rounded-2xl bg-slate-50 px-5 text-sm text-slate-500"
        >
          重置表单
        </button>
      </div>
    </form>
  );
}

/** 把后端日期时间统一显示为秒级格式；未知格式保持原文本。 */
function displayDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) return text.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) return `${text.replace("T", " ")}:00`;
  return text;
}

/** 手机号脱敏：保留前三位和后四位；已经脱敏或长度不足的值不重复处理。 */
function maskPhone(phone = "") {
  if (phone.includes("*")) return phone;
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
