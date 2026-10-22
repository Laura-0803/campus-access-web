// 本模块统一生成上海时区的业务时间文本、紧凑日期和低碰撞业务编号。
// 将任意 Date 格式化为上海时区的日期时间部件对象。
function partsInShanghai(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  // formatToParts 避免依赖本机时区和本地化字符串的分隔符格式。
  return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
}

// 进程内自增序号用于区分同一毫秒、同一前缀下生成的多个编号。
let idSequence = 0;

// 返回 YYYY-MM-DD HH:mm:ss 格式的上海当前时间。
export function nowDateTime() {
  const p = partsInShanghai();
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// 保留统一时间接口名称；当前实现与 nowDateTime 一样返回完整日期时间。
export function nowTime() {
  return nowDateTime();
}

// 返回 YYYYMMDD 紧凑日期，主要用于二维码令牌和业务编号。
export function todayCompact() {
  const p = partsInShanghai();
  return `${p.year}${p.month}${p.day}`;
}

// 组合业务前缀、日期、36 进制毫秒时间戳和四位进程序号生成编号。
export function nextId(prefix) {
  // 序号达到 9999 后循环，时间戳仍可帮助避免跨周期碰撞。
  idSequence = (idSequence + 1) % 10000;
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${todayCompact()}${timestamp}${String(idSequence).padStart(4, "0")}`;
}
