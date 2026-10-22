// 流程节点图标全部来自 lucide-react，不同图标帮助快速区分人员、凭证、规则、处置和数据沉淀。
import {
  AlertTriangle,
  BadgeCheck,
  CalendarCheck,
  Car,
  ClipboardCheck,
  Database,
  DoorOpen,
  IdCard,
  QrCode,
  ScanFace,
  ShieldCheck,
  UserCheck
} from "lucide-react";

// 三条泳道以纯配置描述业务流程；渲染组件不写死具体步骤，便于统一调整文案与顺序。
const lanes = [
  {
    // 校内人员从主数据身份出发，经多源识别和规则校验完成放行登记。
    title: "校内人员通行",
    tone: "blue",
    steps: [
      { title: "人员档案", desc: "学生/教职工主数据", icon: UserCheck },
      { title: "身份识别", desc: "校园卡/人脸/车牌", icon: IdCard },
      { title: "规则校验", desc: "状态、时段、校门、黑名单", icon: ShieldCheck },
      { title: "放行登记", desc: "闸机放行并写入记录", icon: DoorOpen }
    ]
  },
  {
    // 访客与校友依赖预约/认证和动态二维码，在有效时间内完成扫码通行。
    title: "访客与校友通行",
    tone: "purple",
    steps: [
      { title: "预约/认证", desc: "访客预约或校友认证", icon: CalendarCheck },
      { title: "审核通过", desc: "绑定人员与有效时间", icon: BadgeCheck },
      { title: "动态二维码", desc: "有效期、状态校验", icon: QrCode },
      { title: "扫码通行", desc: "扫码核验后登记记录", icon: DoorOpen }
    ]
  },
  {
    // 核验失败进入异常闭环，经风险分级和人工处置后沉淀到记录、日志与报表。
    title: "异常处置闭环",
    tone: "orange",
    steps: [
      { title: "核验失败", desc: "过期、未授权、未匹配", icon: AlertTriangle },
      { title: "风险分级", desc: "低/中/高风险自动判定", icon: ShieldCheck },
      { title: "门岗处置", desc: "拒绝、放行、上报复核", icon: ClipboardCheck },
      { title: "同步沉淀", desc: "异常记录、日志、报表", icon: Database }
    ]
  }
];

// 每种泳道色调同时定义容器、图标徽标、步骤卡片和连接线样式，确保整条流程视觉一致。
const toneClass = {
  blue: {
    lane: "border-blue-100 bg-blue-50/60",
    badge: "bg-blue-100 text-blue-700",
    step: "border-blue-100 bg-white",
    line: "bg-blue-200"
  },
  purple: {
    lane: "border-purple-100 bg-purple-50/60",
    badge: "bg-purple-100 text-primary",
    step: "border-purple-100 bg-white",
    line: "bg-purple-200"
  },
  orange: {
    lane: "border-orange-100 bg-orange-50/70",
    badge: "bg-orange-100 text-orange-700",
    step: "border-orange-100 bg-white",
    line: "bg-orange-200"
  }
};

/** 渲染一个流程步骤卡片，包括语义图标、步骤名称和简短说明。 */
function StepCard({ step, tone }) {
  // 配置中的 icon 是组件引用；tone 用于取得该泳道对应的 Tailwind 样式集合。
  const Icon = step.icon;
  const classes = toneClass[tone];

  return (
    // 固定最小高度让同一行的四个步骤对齐，内容过长时仍可自然增高。
    <div className={`flex min-h-[92px] items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${classes.step}`}>
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${classes.badge}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-700">{step.title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">{step.desc}</span>
      </span>
    </div>
  );
}

/** 渲染一条完整泳道，在大屏横排四步，在小屏按单列纵向排列。 */
function Lane({ lane }) {
  const classes = toneClass[lane.tone];

  return (
    <div className={`rounded-[22px] border p-4 ${classes.lane}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${classes.line}`} />
        <h3 className="text-sm font-semibold text-slate-700">{lane.title}</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {/* 步骤配置按原顺序映射为卡片，并在非末尾步骤后追加连接线。 */}
        {lane.steps.map((step, index) => (
          <div key={step.title} className="grid gap-2 lg:grid-cols-[1fr_auto]">
            <StepCard step={step} tone={lane.tone} />
            {/* 连接线仅在大屏横排时显示；最后一步之后无需连接线。 */}
            {index < lane.steps.length - 1 && (
              <div className="hidden items-center px-1 lg:flex">
                <span className={`h-0.5 w-7 rounded-full ${classes.line}`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 系统通行流程总览组件，依次展示三条业务泳道及底部三项关键解释。 */
export default function AccessFlow() {
  return (
    // select-none 防止用户拖动查看流程时误选大量说明文字。
    <div className="select-none rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
      <div className="grid gap-4">
        {/* 使用泳道标题作为稳定 key，当前配置中标题唯一。 */}
        {lanes.map((lane) => (
          <Lane key={lane.title} lane={lane} />
        ))}
      </div>
      {/* 底部总结强调“识别入口—规则决策—结果沉淀”三层职责边界。 */}
      <div className="mt-4 grid gap-3 rounded-2xl bg-white/80 px-4 py-3 text-xs text-slate-500 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <ScanFace size={16} className="text-primary" />
          多源身份只负责识别入口
        </div>
        <div className="flex items-center gap-2">
          <Car size={16} className="text-blue-600" />
          规则校验决定是否放行
        </div>
        <div className="flex items-center gap-2">
          <Database size={16} className="text-success" />
          全部结果沉淀为记录和报表
        </div>
      </div>
    </div>
  );
}
