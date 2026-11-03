import { useRef, useState } from "react";
import { ImageUp, RotateCcw } from "lucide-react";
import {
  avatarUrlFromPreference,
  catAvatarPalettes,
  defaultCatPalette,
  readAvatarPreference,
  saveAvatarPreference
} from "../../utils/avatar.js";

export default function AvatarEditor({ session, onSessionChange }) {
  const inputRef = useRef(null);
  const [preference, setPreference] = useState(() => readAvatarPreference(session));
  const [message, setMessage] = useState("");

  function apply(next, text) {
    try {
      const nextSession = saveAvatarPreference(session, next);
      setPreference(next);
      onSessionChange?.(nextSession);
      setMessage(text);
    } catch {
      setMessage("头像保存失败，请选择更小的图片或清理浏览器存储空间");
    }
  }

  function choosePalette(palette) {
    apply({ type: "pixel", palette }, "像素小猫配色已更新");
  }

  function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("请选择 JPG、PNG、WebP 或 GIF 图片");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("头像文件不能超过 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => apply({ type: "upload", dataUrl: reader.result }, "自定义头像已保存");
    reader.onerror = () => setMessage("头像读取失败，请重新选择");
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <img
          src={avatarUrlFromPreference(preference)}
          alt="当前头像"
          className="h-24 w-24 rounded-2xl border border-slate-200 bg-white object-cover shadow-card"
        />
        <div>
          <div className="text-sm font-semibold text-slate-900">{session?.profile?.name || session?.user?.username}</div>
          <div className="mt-1 text-xs leading-5 text-slate-500">默认使用本地像素小猫，也可以上传 2MB 以内的图片。</div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">小猫配色</div>
        <div className="grid grid-cols-6 gap-2">
          {catAvatarPalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              title={palette.label}
              aria-label={`选择${palette.label}小猫头像`}
              onClick={() => choosePalette(palette.id)}
              className={`grid aspect-square place-items-center rounded-xl border bg-white p-1.5 ${preference.type === "pixel" && preference.palette === palette.id ? "border-primary ring-2 ring-primary/15" : "border-slate-200 hover:border-slate-300"}`}
            >
              <img src={avatarUrlFromPreference({ type: "pixel", palette: palette.id })} alt="" className="h-full w-full rounded-lg" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(event) => upload(event.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary2">
          <ImageUp size={16} /> 上传头像
        </button>
        <button type="button" onClick={() => choosePalette(defaultCatPalette(session?.user?.username))} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50">
          <RotateCcw size={16} /> 恢复默认
        </button>
      </div>
      {message && <p className="text-sm text-primary">{message}</p>}
    </div>
  );
}
