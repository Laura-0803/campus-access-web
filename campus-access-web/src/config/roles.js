// 菜单图标统一来自 lucide-react；配置中保存组件引用，布局组件可按当前角色动态渲染。
import {
  LayoutDashboard,
  UserRound,
  ScanFace,
  Car,
  CalendarCheck,
  QrCode,
  ClipboardList,
  ShieldAlert,
  Activity,
  DoorOpen,
  FileBarChart,
  MonitorCog,
  BadgeCheck,
  Ban,
  KeyRound,
  Megaphone,
  ScanLine
} from "lucide-react";

// 后端使用英文角色键进行鉴权，界面通过该映射显示对应的中文角色名称。
export const roleLabels = {
  student: "学生",
  teacher: "教职工",
  visitor: "访客",
  alumni: "校友",
  guard: "门岗安保",
  admin: "保卫处管理员"
};

// 各角色的默认展示档案；真实会话档案缺失个别字段时可用于保持侧栏信息完整。
export const roleProfiles = {
  // 学生角色默认信息。
  student: {
    name: "李明",
    title: "信息管理 2301 班",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=student",
    status: "在线"
  },
  // 教职工角色默认信息。
  teacher: {
    name: "陈老师",
    title: "管理学院 教职工",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=teacher",
    status: "在线"
  },
  // 访客角色默认信息。
  visitor: {
    name: "张访客",
    title: "访客用户",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=visitor",
    status: "预约中"
  },
  // 校友角色默认信息。
  alumni: {
    name: "王校友",
    title: "2019 届校友",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alumni",
    status: "已认证"
  },
  // 门岗值守角色默认信息。
  guard: {
    name: "东门安保",
    title: "门岗值守人员",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=guard",
    status: "值守中"
  },
  // 保卫处管理员默认信息。
  admin: {
    name: "林璋一",
    title: "保卫处管理员",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
    status: "在线"
  }
};

// 每个角色可见的扁平菜单。每项同时声明中文名称、前端路由和图标组件。
// 普通角色可直接使用该结构；管理员和门岗还会在下方进一步整理成分组菜单。
export const roleMenus = {
  // 学生围绕个人资料、身份凭证、预约审核及本人记录开展操作。
  student: [
    { label: "学生首页", path: "/student", icon: LayoutDashboard },
    { label: "个人信息", path: "/profile", icon: UserRound },
    { label: "人脸照片上传", path: "/face", icon: ScanFace },
    { label: "访客预约审核", path: "/review", icon: CalendarCheck },
    { label: "我的出入记录", path: "/records", icon: ClipboardList },
    { label: "我的异常记录", path: "/exceptions", icon: ShieldAlert }
  ],
  // 教职工比学生多车辆管理；访客相关操作仅保留预约审核。
  teacher: [
    { label: "教职工首页", path: "/teacher", icon: LayoutDashboard },
    { label: "个人信息", path: "/profile", icon: UserRound },
    { label: "人脸照片上传", path: "/face", icon: ScanFace },
    { label: "车牌号管理", path: "/vehicle", icon: Car },
    { label: "访客预约审核", path: "/review", icon: CalendarCheck },
    { label: "我的出入记录", path: "/records", icon: ClipboardList },
    { label: "我的异常记录", path: "/exceptions", icon: ShieldAlert }
  ],
  // 访客只需要申请预约、查看审核状态、出示二维码和查询通行记录。
  visitor: [
    { label: "访客预约申请", path: "/visitor", icon: CalendarCheck },
    { label: "预约状态查询", path: "/appointment-status", icon: BadgeCheck },
    { label: "访客二维码", path: "/visitor-qr", icon: QrCode },
    { label: "访客通行记录", path: "/records", icon: ClipboardList }
  ],
  // 校友使用身份档案和校友二维码完成入校。
  alumni: [
    { label: "校友首页", path: "/alumni", icon: LayoutDashboard },
    { label: "校友身份信息", path: "/profile", icon: UserRound },
    { label: "校友二维码申请", path: "/alumni-qr", icon: QrCode },
    { label: "校友入校记录", path: "/records", icon: ClipboardList }
  ],
  // 门岗菜单聚焦实时监控、现场通行处理和设备状态。
  guard: [
    { label: "门岗工作台", path: "/guard", icon: LayoutDashboard },
    { label: "实时通行监控", path: "/monitor", icon: Activity },
    { label: "现场通行处理", path: "/identity-check", icon: DoorOpen },
    { label: "扫码模拟", path: "/scan-simulator", icon: ScanLine },
    { label: "设备状态", path: "/devices", icon: MonitorCog }
  ],
  // 管理员拥有基础资料、规则、安全、统计和运维等完整后台权限入口。
  admin: [
    { label: "管理员驾驶舱", path: "/admin", icon: LayoutDashboard },
    { label: "扫码模拟", path: "/scan-simulator", icon: ScanLine },
    { label: "账号状态管理", path: "/account-status", icon: UserRound },
    { label: "人员信息管理", path: "/people", icon: UserRound },
    { label: "预约监管", path: "/appointments", icon: CalendarCheck },
    { label: "通行规则设置", path: "/rules", icon: KeyRound },
    { label: "黑名单管理", path: "/blacklist", icon: Ban },
    { label: "出入记录查询", path: "/records", icon: ClipboardList },
    { label: "异常事件分析", path: "/exceptions", icon: ShieldAlert },
    { label: "设备管理", path: "/devices", icon: MonitorCog },
    { label: "统计报表", path: "/reports", icon: FileBarChart },
    { label: "公告管理", path: "/announcements", icon: Megaphone }
  ]
};

// 分组菜单为信息量较大的管理员和门岗侧栏增加二级标题，items 仍复用统一菜单项结构。
export const roleMenuGroups = {
  // 管理员功能按总览、基础信息、预约、核验、安全、统计和运维七个业务域组织。
  admin: [
    {
      title: "工作总览",
      items: [
        { label: "管理员驾驶舱", path: "/admin", icon: LayoutDashboard }
      ]
    },
    {
      title: "基础信息管理",
      items: [
        { label: "人员信息管理", path: "/people", icon: UserRound },
        { label: "账号状态管理", path: "/account-status", icon: UserRound },
        { label: "车辆信息管理", path: "/vehicles", icon: Car },
        { label: "设备管理", path: "/devices", icon: MonitorCog }
      ]
    },
    {
      title: "预约与二维码管理",
      items: [
        { label: "预约监管", path: "/appointments", icon: CalendarCheck }
      ]
    },
    {
      title: "核验与登记管理",
      items: [
        { label: "通行规则设置", path: "/rules", icon: KeyRound },
        { label: "扫码模拟", path: "/scan-simulator", icon: ScanLine },
        { label: "出入记录查询", path: "/records", icon: ClipboardList }
      ]
    },
    {
      title: "异常安全管理",
      items: [
        { label: "异常事件分析", path: "/exceptions", icon: ShieldAlert },
        { label: "黑名单管理", path: "/blacklist", icon: Ban }
      ]
    },
    {
      title: "查询统计管理",
      items: [
        { label: "统计报表", path: "/reports", icon: FileBarChart }
      ]
    },
    {
      title: "系统运维",
      items: [
        { label: "公告管理", path: "/announcements", icon: Megaphone }
      ]
    }
  ],
  // 门岗功能按现场值守和设备状态组织。
  guard: [
    {
      title: "门岗值守",
      items: [
        { label: "门岗工作台", path: "/guard", icon: LayoutDashboard },
        { label: "实时通行监控", path: "/monitor", icon: Activity },
        { label: "现场通行处理", path: "/identity-check", icon: DoorOpen },
        { label: "扫码模拟", path: "/scan-simulator", icon: ScanLine }
      ]
    },
    {
      title: "设备状态",
      items: [
        { label: "设备状态", path: "/devices", icon: MonitorCog }
      ]
    }
  ]
};

// 登录成功或访问无权限路径时，根据角色键跳转到该角色的默认首页。
export const homePathByRole = {
  student: "/student",
  teacher: "/teacher",
  visitor: "/visitor",
  alumni: "/alumni",
  guard: "/guard",
  admin: "/admin"
};
