// 本模块统一处理黑名单凭证标准化、生效状态判断、掩码匹配和生效记录查询。
// 只有“生效”或“启用”状态的记录会参与通行拦截；Unicode 写法避免源文件编码差异。
const ACTIVE_BLACKLIST_STATUSES = new Set([
  "\u751f\u6548",
  "\u542f\u7528"
]);

// 将身份证号、车牌号等凭证统一转为无空白的大写形式，保证比较口径一致。
export function normalizeBlacklistCredential(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

// 判断黑名单记录当前是否处于需要执行拦截的有效状态。
export function isActiveBlacklistItem(item) {
  return ACTIVE_BLACKLIST_STATUSES.has(String(item?.status || "").trim());
}

// 比较已存凭证与候选凭证，同时兼容历史数据中使用星号隐藏数字的掩码形式。
export function blacklistCredentialMatches(storedValue, candidateValue) {
  // 双方先标准化；任一为空时都不能视为匹配。
  const stored = normalizeBlacklistCredential(storedValue);
  const candidate = normalizeBlacklistCredential(candidateValue);
  if (!stored || !candidate) return false;
  // 完全相同直接命中；没有星号的非相等凭证无需继续构造正则。
  if (stored === candidate) return true;
  if (!stored.includes("*")) return false;

  // 先转义正则特殊字符，再把被转义的连续星号替换为一个或多个数字。
  const pattern = stored
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*+/g, "\\d+");
  return new RegExp(`^${pattern}$`).test(candidate);
}

// 在数据集合中查找第一条与给定凭证匹配的生效黑名单；未命中时统一返回 null。
export function findActiveBlacklistByCredential(data, credentialValue) {
  return (data?.blacklist || []).find((item) => {
    return isActiveBlacklistItem(item)
      && blacklistCredentialMatches(item.credentialNo, credentialValue);
  }) || null;
}
