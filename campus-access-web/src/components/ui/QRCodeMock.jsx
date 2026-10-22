// React 状态与副作用用于维护倒计时和二维码 SVG；qrcode 负责真正编码，图标用于空状态。
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode } from "lucide-react";

export default function QRCodeMock({
  value = "",
  title = "动态二维码",
  subtitle = "当日有效 08:00-18:00",
  status = "有效",
  refreshIntervalSeconds = 30
}) {
  // svg 保存 qrcode 库生成的完整 SVG 字符串；now 每秒更新，用于计算动态刷新窗口。
  const [svg, setSvg] = useState("");
  const [now, setNow] = useState(() => Date.now());
  // 没有二维码值时优先显示“未生成”，有值时默认视为有效。
  const displayStatus = value ? status || "有效" : status || "未生成";
  // 刷新周期至少为 5 秒，避免错误配置造成过于频繁的二维码重绘。
  const refreshSeconds = Math.max(Number(refreshIntervalSeconds) || 30, 5);
  // 使用当前 Unix 秒数对周期取模，得到本轮动态码剩余秒数以及稳定的时间片编号。
  const secondsLeft = value ? refreshSeconds - (Math.floor(now / 1000) % refreshSeconds) : 0;
  const refreshKey = value ? Math.floor(now / 1000 / refreshSeconds) : 0;
  // 只有令牌存在且业务状态为“有效”时才生成可扫描二维码。
  const canScan = Boolean(value && displayStatus === "有效");
  // 把服务端令牌与当前时间片写入自定义协议载荷，使图形按刷新周期动态变化。
  const qrValue = canScan
    ? `campus-access://qr?token=${encodeURIComponent(value)}&refresh=${refreshKey}`
    : "";

  // 令牌存在时启动一秒一次的时钟；令牌清空或组件卸载时立即清理定时器。
  useEffect(() => {
    if (!value) {
      return undefined;
    }

    setNow(Date.now());
    // 这里只更新当前时间，真正的二维码重算由 refreshKey 变化间接触发。
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [value]);

  // 二维码载荷变化时异步生成新的 SVG，包含首次生成、时间片刷新和失效清空三种情况。
  useEffect(() => {
    // alive 防止旧的异步生成任务在组件卸载后覆盖状态。
    let alive = true;

    if (!qrValue) {
      // 不可扫描时清空旧图形，避免页面继续展示已经失效的二维码。
      setSvg("");
      return () => {
        alive = false;
      };
    }

    // 生成期间先显示空状态图标，避免旧时间片二维码短暂残留。
    setSvg("");
    QRCode.toString(qrValue, {
      // SVG 便于在不同屏幕密度下保持清晰；M 级纠错兼顾容量与遮挡恢复能力。
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
      color: {
        dark: "#020617",
        light: "#ffffff"
      },
      width: 192
    }).then((nextSvg) => {
      // 仅当前副作用仍有效时写入生成结果。
      if (alive) setSvg(nextSvg);
    }).catch(() => {
      // 编码失败时回到占位图标，不把生成异常扩散为整页崩溃。
      if (alive) setSvg("");
    });

    return () => {
      alive = false;
    };
  }, [qrValue]);

  return (
    // 固定最大宽度确保二维码卡片在桌面和移动端均保持合适尺寸。
    <div className="mx-auto w-full max-w-[320px] rounded-card bg-white p-6 text-center shadow-card">
      <div className="mx-auto grid h-48 w-48 place-items-center overflow-hidden rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-100">
        {svg ? (
          // SVG 来自本地 qrcode 库生成结果，通过受控 HTML 注入保留完整矢量标签结构。
          <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          // 未生成、已失效或正在生成时显示中性二维码图标。
          <QrCode size={76} className="text-slate-300" />
        )}
      </div>
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
      <div className="mt-4 rounded-2xl bg-primarySoft px-4 py-3 text-sm text-primary">
        {/* 可扫描时同时显示倒计时，不可扫描时只呈现当前业务状态。 */}
        状态：{displayStatus}{canScan ? ` · ${secondsLeft} 秒后刷新` : ""}
      </div>
    </div>
  );
}
