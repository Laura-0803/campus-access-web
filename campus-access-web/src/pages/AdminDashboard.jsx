// 管理员驾驶舱组合实时状态、派生指标、趋势图、风险图、设备健康和待办导航。
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Panel from "../components/ui/Panel.jsx";
import AccessTrendChart from "../components/charts/AccessTrendChart.jsx";
import RiskDonutChart from "../components/charts/RiskDonutChart.jsx";
import { api } from "../api/client.js";
import { useApiData } from "../api/useApiData.js";
import {
  ArrowRight,
  CalendarCheck,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  Users,
  Zap
} from "lucide-react";

// 接口加载前的完整驾驶舱形状，确保所有 filter/map 和图表数据访问均安全。
const emptyDashboard = {
  summary: {},
  stats: [],
  accessTrend: [],
  riskData: [],
  realtimeRecords: [],
  exceptions: [],
  appointments: [],
  devices: []
};

// 统一语义色映射：每种 tone 同时给卡片、图标、进度条和徽标提供配套样式。
const toneMap = {
  primary: {
    card: "border-primary/10 bg-primarySoft/70 text-primary",
    icon: "bg-primary text-white",
    bar: "bg-primary",
    badge: "bg-primarySoft text-primary"
  },
  success: {
    card: "border-green-100 bg-green-50/80 text-success",
    icon: "bg-success text-white",
    bar: "bg-success",
    badge: "bg-green-50 text-success"
  },
  warning: {
    card: "border-orange-100 bg-orange-50/80 text-warning",
    icon: "bg-warning text-white",
    bar: "bg-warning",
    badge: "bg-orange-50 text-warning"
  },
  danger: {
    card: "border-red-100 bg-red-50/85 text-danger",
    icon: "bg-danger text-white",
    bar: "bg-danger",
    badge: "bg-red-50 text-danger"
  },
  neutral: {
    card: "border-slate-100 bg-slate-50/90 text-slate-600",
    icon: "bg-slate-700 text-white",
    bar: "bg-slate-500",
    badge: "bg-slate-100 text-slate-600"
  }
};

/** 管理员驾驶舱主页面：每 45 秒刷新业务数据，每秒更新界面时钟。 */
export default function AdminDashboard() {
  // useApiData 负责初次加载、错误和手动刷新；now 单独维护实时显示时间。
  const { data, loading, error, reload } = useApiData(api.adminDashboard, emptyDashboard, []);
  const [now, setNow] = useState(() => new Date());

  // 建立两个不同频率的定时任务，并在离开页面时同时清理。
  useEffect(() => {
    // clock 只更新本地时钟，不访问服务器；refresh 周期性同步全部驾驶舱数据。
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const refresh = window.setInterval(() => reload(), 45000);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refresh);
    };
  }, []);

  // 从原始列表计算待处理异常、高风险异常、待保卫处审核预约和设备健康指标。
  const pendingExceptions = data.exceptions.filter((item) => item.status !== "已处理");
  const highRiskCount = pendingExceptions.filter((item) => item.risk === "高风险").length;
  const pendingAppointments = data.appointments.filter((item) => item.status === "待保卫处审核");
  const onlineDevices = data.devices.filter((item) => item.status === "在线").length;
  const problemDevices = data.devices.filter((item) => item.status !== "在线");
  const onlineRate = data.devices.length ? Math.round((onlineDevices / data.devices.length) * 100) : 0;
  // 最新通行记录由后端按新到旧排序后的第一项提供。
  const latestRecord = data.realtimeRecords[0];
  // 时钟只显示 24 小时制时分秒，用于标识驾驶舱最新刷新观察时间。
  const liveTime = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);

  // 将汇总数据和派生数量整理成四张可点击 KPI 卡配置，仅在依赖变化时重算。
  const kpis = useMemo(() => {
    // summary 可能缺少个别字段，因此统一转换为数字并用列表长度兜底。
    const summary = data.summary || {};
    const todayAccess = Number(summary.todayAccess ?? 0);
    const accessTotal = Number(summary.accessTotal ?? 0);
    const appointmentTotal = Number(summary.appointmentTotal ?? data.appointments.length);
    const exceptionTotal = Number(summary.exceptionTotal ?? data.exceptions.length);

    return [
      {
        // 今日通行卡链接到完整出入记录，并显示其占历史总记录的比例。
        label: "今日通行",
        value: todayAccess,
        desc: `${summary.today || "今日"} 数据库记录`,
        icon: Users,
        tone: "success",
        progress: percentOf(todayAccess, accessTotal),
        path: "/records"
      },
      {
        // 预约待审卡根据是否存在待办切换警告/成功色。
        label: "预约待审",
        value: pendingAppointments.length,
        desc: `${appointmentTotal} 条预约记录`,
        icon: CalendarCheck,
        tone: pendingAppointments.length ? "warning" : "success",
        progress: percentOf(pendingAppointments.length, appointmentTotal),
        path: "/appointments"
      },
      {
        // 异常卡突出总待处置量，并在说明中单独标出高风险数量。
        label: "待处置异常",
        value: pendingExceptions.length,
        desc: `高风险 ${highRiskCount} 条`,
        icon: ShieldAlert,
        tone: pendingExceptions.length ? "danger" : "success",
        progress: percentOf(pendingExceptions.length, exceptionTotal),
        path: "/exceptions"
      },
      {
        // 设备在线率达到 90% 使用主色，否则使用警告色提醒维护。
        label: "设备在线率",
        value: `${onlineRate}%`,
        desc: `${onlineDevices}/${data.devices.length || 0} 台在线`,
        icon: RadioTower,
        tone: onlineRate >= 90 ? "primary" : "warning",
        progress: onlineRate,
        path: "/devices"
      }
    ];
  }, [data, pendingAppointments.length, pendingExceptions.length, highRiskCount, onlineDevices, onlineRate]);

  // 把三类业务待办标准化为统一列表项结构，最多展示八条。
  const todoItems = useMemo(() => {
    // 异常优先取前四条，并按风险等级决定颜色。
    const exceptionItems = pendingExceptions.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.type,
      desc: `${item.person || "未知对象"} · ${item.gate || "未记录校门"}`,
      meta: item.risk || item.status,
      tone: item.risk === "高风险" ? "danger" : item.risk === "中风险" ? "warning" : "primary",
      path: "/exceptions"
    }));

    // 预约待办最多三条，统一跳转预约监管页面。
    const appointmentItems = pendingAppointments.slice(0, 3).map((item) => ({
      id: item.id,
      title: `${item.visitor} 来访`,
      desc: `${item.host || "未指定被访人"} · ${item.time || item.visitStart || "待定"}`,
      meta: "待保卫处审核",
      tone: "warning",
      path: "/appointments"
    }));

    // 非在线设备最多三条，维护中显示警告，其余故障状态显示危险色。
    const deviceItems = problemDevices.slice(0, 3).map((item) => ({
      id: item.id,
      title: item.name,
      desc: `${item.gate || "未记录校门"} · ${item.type || "未记录类型"}`,
      meta: item.status,
      tone: item.status === "维护中" ? "warning" : "danger",
      path: "/devices"
    }));

    return [...exceptionItems, ...appointmentItems, ...deviceItems].slice(0, 8);
  }, [pendingAppointments, pendingExceptions, problemDevices]);

  return (
    <div className="space-y-4">
      {/* 数据加载失败时保留已有内容，并在顶部展示可见错误。 */}
      {error && <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{error.message}</div>}

      {/* 顶部运行状态与四项核心 KPI。 */}
      <section className="rounded-card bg-white/90 p-4 shadow-card ring-1 ring-white/80">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* 双层圆点使用 animate-ping 表达系统实时运行。 */}
            <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-success">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              实时运行
            </div>
            <h1 className="text-xl font-semibold text-slate-800">管理员驾驶舱</h1>
          </div>
            {/* 请求刷新期间旋转图标，liveTime 持续显示当前观察时间。 */}
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
            <RefreshCw size={15} className={loading ? "animate-spin text-primary" : "text-slate-400"} />
            更新 {liveTime}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* KPI 卡片由上方 memo 配置驱动。 */}
          {kpis.map((item) => (
            <KpiCard key={item.label} {...item} />
          ))}
        </div>
      </section>

      {/* 主内容在超宽屏分为分析区和右侧实时/待办区。 */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="min-w-0 space-y-4">
          {/* 一周通行总量和异常量折线趋势。 */}
          <Panel
            title="通行趋势"
            subtitle="本周通行量与异常量"
            action={<Link to="/reports" className="text-xs font-medium text-primary">报表</Link>}
            className="min-w-0"
          >
            <AccessTrendChart data={data.accessTrend} className="h-[220px] lg:h-[250px]" />
          </Panel>

          {/* 风险分布与设备健康在大屏并排显示。 */}
          <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[.92fr_1.08fr]">
            <Panel title="风险分布" subtitle={`待处置 ${pendingExceptions.length} 条`}>
              <div className="grid grid-cols-[116px_minmax(0,1fr)] items-center gap-3">
                <RiskDonutChart data={data.riskData} className="h-[128px]" innerRadius={34} outerRadius={52} />
                <div className="space-y-2">
                  {/* 风险明细与环形图使用相同数据，并显示各等级占比。 */}
                  {data.riskData.map((item) => (
                    <RiskRow key={item.name} item={item} total={riskTotal(data.riskData)} compact />
                  ))}
                  {data.riskData.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">暂无风险数据</div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="设备健康" subtitle={`${problemDevices.length} 台需要关注`}>
              <DeviceHealth devices={data.devices} problemDevices={problemDevices} onlineDevices={onlineDevices} onlineRate={onlineRate} />
            </Panel>
          </section>

          {/* 更完整的设备状态计数和问题设备快照。 */}
          <DeviceSnapshot devices={data.devices} problemDevices={problemDevices} />
        </div>

        {/* 右栏强调最新事件和可点击待办，便于管理员快速进入处置页面。 */}
        <aside className="min-w-0 space-y-4">
          <LatestRecordCard latestRecord={latestRecord} />

          <Panel
            title="待处理事项"
            subtitle="异常、预约和设备故障"
            action={<Link to="/exceptions" className="text-xs font-medium text-primary">处理</Link>}
          >
            <TodoList items={todoItems} />
          </Panel>
        </aside>
      </div>

    </div>
  );
}

/** 可点击 KPI 卡片，使用语义色展示图标和受限在 0~100% 的进度条。 */
function KpiCard({ label, value, desc, icon: Icon, tone, progress, path }) {
  // 未识别的 tone 回退中性色，避免样式字段为空。
  const styles = toneMap[tone] || toneMap.neutral;

  return (
    <Link to={path} className={`group rounded-[22px] border p-3.5 transition hover:-translate-y-0.5 hover:shadow-card ${styles.card}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium opacity-80">{label}</span>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${styles.icon}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="mt-1.5 truncate text-xs opacity-75">{desc}</div>
      {/* progress 已在 percentOf 中限制范围，可安全作为 CSS 百分比宽度。 */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full transition-all duration-700 ${styles.bar}`} style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

/** 展示最新一条通行记录；没有数据时提供明确空状态。 */
function LatestRecordCard({ latestRecord }) {
  return (
    <section className="rounded-card bg-white/90 p-4 shadow-card ring-1 ring-white/80">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Zap size={17} className="text-primary" />
          最新通行
        </div>
        <Link to="/records" className="text-xs font-medium text-primary">查看</Link>
      </div>
      {/* 条件渲染确保不会读取空记录的 name/time 等字段。 */}
      {latestRecord ? (
        <div className="mt-3 rounded-2xl bg-slate-50/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-800">{latestRecord.name}</div>
              <div className="mt-1 truncate text-xs text-slate-400">{latestRecord.time} · {latestRecord.gate} · {latestRecord.method}</div>
            </div>
            <StatusBadge value={latestRecord.status} />
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">暂无通行记录</div>
      )}
    </section>
  );
}

/** 三类待办的统一列表；每项链接到对应业务处理页面。 */
function TodoList({ items }) {
  // 无待办时用绿色状态告诉管理员当前任务已清空。
  if (items.length === 0) {
    return <div className="rounded-2xl bg-green-50 px-4 py-7 text-center text-sm text-success">当前无待处理事项</div>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.path}
          className="group flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3.5 py-2.5 transition hover:bg-white hover:shadow-card"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-700">{item.title}</div>
            <div className="mt-0.5 truncate text-xs text-slate-400">{item.desc}</div>
          </div>
          {/* 右侧同时显示语义徽标和悬停移动箭头，强化可点击性。 */}
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneMap[item.tone]?.badge || toneMap.neutral.badge}`}>{item.meta}</span>
            <ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}

/** 设备健康简表：优先列出问题设备，否则展示前三台普通设备。 */
function DeviceHealth({ devices, problemDevices, onlineDevices, onlineRate }) {
  const visibleDevices = (problemDevices.length ? problemDevices : devices.slice(0, 3)).slice(0, 3);

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>在线率</span>
          <span>{onlineDevices}/{devices.length || 0}</span>
        </div>
        {/* 在线率进度条宽度直接来自整数百分比。 */}
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${onlineRate}%` }} />
        </div>
      </div>
      <div className="space-y-2">
        {/* 单台设备展示名称、校门、类型和状态徽标。 */}
        {visibleDevices.map((device) => (
          <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-700">{device.name}</div>
              <div className="mt-0.5 truncate text-xs text-slate-400">{device.gate} · {device.type || "未记录类型"}</div>
            </div>
            <StatusBadge value={device.status} />
          </div>
        ))}
        {devices.length === 0 && (
          <div className="rounded-2xl bg-slate-50 px-4 py-7 text-center text-sm text-slate-400">暂无设备数据</div>
        )}
      </div>
    </div>
  );
}

/** 设备状态概况：统计四种状态数量，并列出最多三台值得关注的设备。 */
function DeviceSnapshot({ devices, problemDevices }) {
  // 每种状态独立计数，未命中的其他状态不会被错误归类。
  const online = devices.filter((item) => item.status === "在线").length;
  const offline = devices.filter((item) => item.status === "离线").length;
  const fault = devices.filter((item) => item.status === "故障").length;
  const maintenance = devices.filter((item) => item.status === "维护中").length;
  // 有问题设备时优先展示问题列表，否则展示普通设备快照。
  const visibleDevices = (problemDevices.length ? problemDevices : devices).slice(0, 3);

  return (
    <section className="rounded-card bg-white/90 p-4 shadow-card ring-1 ring-white/80">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">设备状态概况</h2>
          <p className="mt-1 text-sm text-slate-400">设备在线、离线、故障与维护状态</p>
        </div>
        <Link to="/devices" className="text-xs font-medium text-primary">设备管理</Link>
      </div>

        {/* 左侧四项状态计数，右侧为具体设备。 */}
      <div className="grid gap-3 lg:grid-cols-[.82fr_1fr]">
        <div className="grid grid-cols-2 gap-2">
          <DeviceMetric label="在线" value={online} tone="success" />
          <DeviceMetric label="离线" value={offline} tone="warning" />
          <DeviceMetric label="故障" value={fault} tone="danger" />
          <DeviceMetric label="维护中" value={maintenance} tone="primary" />
        </div>

        <div className="grid gap-2">
          {visibleDevices.map((device) => (
            <div key={device.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3.5 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-700">{device.name}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{device.gate} · {device.type || "未记录类型"}</div>
              </div>
              <StatusBadge value={device.status} />
            </div>
          ))}
          {devices.length === 0 && (
            <div className="rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">暂无设备数据</div>
          )}
        </div>
      </div>
    </section>
  );
}

/** 单项设备状态数字卡，根据 tone 选择数字文字色。 */
function DeviceMetric({ label, value, tone }) {
  const textClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    neutral: "text-slate-700"
  }[tone] || "text-slate-700";

  return (
    <div className="rounded-2xl bg-slate-50/80 px-3 py-2.5">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${textClass}`}>{value}</div>
    </div>
  );
}

/** 单行风险等级详情，计算本等级占全部风险数据的百分比。 */
function RiskRow({ item, total, compact = false }) {
  // 风险名称决定语义色；总数为零时百分比固定为零，避免除零。
  const tone = item.name.includes("高") ? "danger" : item.name.includes("中") ? "warning" : "success";
  const percent = total ? Math.round((item.value / total) * 100) : 0;
  const styles = toneMap[tone] || toneMap.neutral;

  return (
    <div className={`rounded-2xl bg-slate-50/80 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{item.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles.badge}`}>{item.value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

/** 通用状态徽标，把原始中文状态先转换为 tone，再套用统一徽标样式。 */
function StatusBadge({ value }) {
  const type = statusTone(value);
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${toneMap[type].badge}`}>
      {value || "-"}
    </span>
  );
}

/** 将常见业务状态归入成功、警告、危险或中性四类。 */
function statusTone(value) {
  if (["正常", "在线", "已处理", "已通过", "开放", "有效"].includes(value)) return "success";
  if (["待审核", "待被访人审核", "待保卫处审核", "处理中", "维护中"].includes(value)) return "warning";
  if (["异常", "离线", "故障", "未通过", "高风险", "已过期", "停用"].includes(value)) return "danger";
  return "neutral";
}

/** 把数值限制在给定闭区间；空值按零处理。 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value || 0));
}

/** 计算 value 占 total 的整数百分比，并限制在合法的 0~100 范围。 */
function percentOf(value, total) {
  if (!total) return 0;
  return clamp(Math.round((Number(value || 0) / Number(total)) * 100), 0, 100);
}

/** 汇总所有风险项的 value，显式转为数字以兼容后端数字字符串。 */
function riskTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.value || 0), 0);
}
