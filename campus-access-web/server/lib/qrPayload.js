// 本模块从纯令牌、JSON、URL 或查询字符串等多种二维码载荷中提取统一 token。
// 按由结构化到原始文本的顺序解析二维码内容，任一方式成功后立即返回。
export function extractQrToken(value) {
  // 先转为去除首尾空白的字符串；空输入直接返回空令牌。
  const raw = String(value || "").trim();
  if (!raw) return "";

  // 第一种格式：JSON 对象，兼容 token 和历史字段 qrToken。
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.token) return String(parsed.token);
    if (parsed?.qrToken) return String(parsed.qrToken);
  } catch {
    // Plain tokens are still supported.
  }

  // 第二种格式：完整 URL，从查询参数中读取 token。
  try {
    const url = new URL(raw);
    const token = url.searchParams.get("token");
    if (token) return token;
  } catch {
    // Not a URL, fall back to the raw value.
  }

  // 第三种格式：不是合法完整 URL，但文本中仍包含 ?token= 或 &token= 参数。
  const tokenMatch = raw.match(/[?&]token=([^&\s]+)/);
  if (tokenMatch) return decodeURIComponent(tokenMatch[1]);

  // 所有结构化解析都未命中时，将原文本视为纯令牌返回。
  return raw;
}
