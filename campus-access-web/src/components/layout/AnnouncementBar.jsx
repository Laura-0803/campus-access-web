// Hook 管理公告列表、更新时间和轮询生命周期；Megaphone 用作公告标识；api 访问消息接口。
import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { api } from "../../api/client.js";

/**
 * 判断一条站内消息是否属于预约流程通知。
 * 顶部公告栏只展示校园公共公告，因此通过标题和正文模式排除自动生成的预约审核消息。
 */
function isAppointmentNotice(item) {
  // 空字段规范化为空字符串并去除首尾空白，保证正则匹配稳定。
  const title = String(item?.title || "").trim();
  const content = String(item?.content || "").trim();
  // 覆盖预约状态标题、待审核标题、提交预约正文以及审核结果正文四类系统模板。
  return /^预约(已通过|未通过|待保卫处审核|待被访人审核|待审核)/.test(title)
    || /^访客预约待(保卫处审核|被访人审核|审核)$/.test(title)
    || /^.+ 提交了新的来访预约/.test(content)
    || /^.+ 的预约已(通过|未通过|由保卫处|由.+通过|被.+驳回)/.test(content);
}

/** 登录后全局公告栏：定时获取与当前角色相关的消息，并展示最多两条公共公告。 */
export default function AnnouncementBar({ session }) {
  // announcements 保存过滤后的前三条公告，lastUpdated 显示最近一次成功同步时间。
  const [announcements, setAnnouncements] = useState([]);
  const [lastUpdated, setLastUpdated] = useState("");

  // 当前角色变化时重新建立查询、轮询和事件监听。
  useEffect(() => {
    // alive 防止组件卸载后异步请求回写状态。
    let alive = true;
    const role = session?.user?.role;
    // 管理员显式携带角色参数；其他角色沿用后端根据会话身份确定的默认可见范围。
    const query = role === "admin" ? `?role=${encodeURIComponent(role)}` : "";

    /** 执行一次公告同步；失败时保留现有公告，避免短暂网络波动让公告栏闪烁消失。 */
    async function loadAnnouncements() {
      try {
        const data = await api.messages(query);
        if (!alive) return;
        // 非数组响应按空列表处理，并移除预约类系统消息。
        const visibleAnnouncements = Array.isArray(data)
          ? data.filter((item) => !isAppointmentNotice(item))
          : [];
        // 状态最多保存三条，为未来不同布局预留一条；当前视图实际展示前两条。
        setAnnouncements(visibleAnnouncements.slice(0, 3));
        setLastUpdated(formatDateTime(new Date()));
      } catch {
        if (alive) setAnnouncements((current) => current);
      }
    }

    // 立即加载一次，之后每十秒刷新；业务页面发布公告后也可通过自定义事件触发即时刷新。
    loadAnnouncements();
    const timer = window.setInterval(loadAnnouncements, 10000);
    window.addEventListener("campus:announcements-updated", loadAnnouncements);

    // 角色切换或组件卸载时终止旧请求回写，并清理定时器及事件监听。
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("campus:announcements-updated", loadAnnouncements);
    };
  }, [session?.user?.role]);

  // 没有公共公告时完全不渲染，主内容区会自动上移。
  if (!announcements.length) return null;

  return (
    // 外层形成与顶栏相接的浅色横条，内部在超宽屏切换为横向布局。
    <div className="border-b border-slate-100/70 bg-white/45 px-4 py-2 md:px-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-primary/10 bg-white/75 px-3 py-2 shadow-sm xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-700">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-primarySoft text-primary">
            <Megaphone size={15} />
          </span>
          校园公告
        </div>
        <div className="grid min-w-0 flex-1 gap-2 xl:grid-cols-2">
          {/* 最多并列展示两条；长标题和正文使用 truncate 防止挤压布局。 */}
          {announcements.slice(0, 2).map((item) => (
            <article key={item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50/70 px-3 py-1.5">
              <span className="shrink-0 truncate text-xs font-semibold text-slate-700">{item.title}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{item.content}</span>
              {/* 创建时间仅在超宽屏显示，避免中等宽度下公告正文空间不足。 */}
              <span className="hidden shrink-0 text-xs text-slate-400 2xl:inline">{formatDateTime(item.createdAt)}</span>
            </article>
          ))}
        </div>
        <div className="shrink-0 text-xs text-slate-400">更新 {lastUpdated}</div>
      </div>
    </div>
  );
}

/**
 * 将 Date 或后端日期字符串格式化为上海时区的 YYYY-MM-DD HH:mm:ss。
 * 无法解析的字符串会尽量补齐秒数后原样显示，不会抛出异常破坏公告栏。
 */
function formatDateTime(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value).replace(" ", "T"));
  // Date 解析失败时执行轻量字符串格式兼容。
  if (Number.isNaN(date.getTime())) {
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) return `${text.replace("T", " ")}:00`;
    return text || "-";
  }
  // formatToParts 避免依赖不同浏览器的本地化连接符，再手动拼成项目统一格式。
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  // 将 year/month/day 等部件转换为便于按名称读取的对象。
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
}
