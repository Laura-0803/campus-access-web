// 本文件集中实现登录后各类业务功能页，并在底部提供跨页面复用的表单、格式化和校验工具。
// 代码按“公告与输入规范化 → 凭证规则 → 各业务页面 → 通用组件与工具 → 人员类型配置”的顺序组织。
import { useEffect, useRef, useState } from "react";
// Lucide 图标用于表单动作、设备控制、智能分析和状态提示，不承载业务逻辑。
import { Camera, Car, Megaphone, Pencil, Power, Save, ScanLine, Search, Send, ShieldAlert, ShieldCheck, Sparkles, Trash2, Upload, XCircle } from "lucide-react";
// 通用 UI、图表、API 客户端与数据 Hook 在所有功能页之间复用。
import Panel from "../components/ui/Panel.jsx";
import DataTable from "../components/ui/DataTable.jsx";
import Badge from "../components/ui/Badge.jsx";
import QRCodeMock from "../components/ui/QRCodeMock.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import AccessTrendChart from "../components/charts/AccessTrendChart.jsx";
import RiskDonutChart from "../components/charts/RiskDonutChart.jsx";
import { api } from "../api/client.js";
import { useApiData } from "../api/useApiData.js";
import { roleLabels } from "../config/roles.js";

// 公告可见范围选项：在“全部人员”后追加配置文件中的全部角色键与中文名称。
const announcementTargets = [
  { value: "all", label: "全部人员" },
  ...Object.entries(roleLabels).map(([value, label]) => ({ value, label }))
];

/**
 * 把公告目标统一转换为无重复字符串数组。
 * 兼容后端旧字段中的顿号/中英文逗号分隔文本；一旦包含 all，就只保留 all，避免语义冲突。
 */
function normalizeAnnouncementTargets(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[、,，/]/);
  const targets = [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];
  return targets.includes("all") ? ["all"] : targets;
}

/** 把公告目标角色键转换成用户可读的中文范围，多角色之间使用顿号连接。 */
function announcementTargetLabel(value) {
  const targets = normalizeAnnouncementTargets(value);
  if (!targets.length || targets.includes("all")) return "全部人员";
  return targets
    .map((target) => announcementTargets.find((item) => item.value === target)?.label || target)
    .join("、");
}

/** 兼容读取新字段 targetRoles 和旧字段 targetRole，并返回规范化目标数组。 */
function announcementTargetsFor(item) {
  return normalizeAnnouncementTargets(item?.targetRoles ?? item?.targetRole);
}

/** 创建公告表单的全新默认对象，避免多个重置操作共享同一个可变引用。 */
function announcementFormDefaults() {
  return { title: "", content: "", targetRoles: ["all"] };
}

/** 根据预约系统的固定标题/正文模板识别自动通知，使公告管理页只管理公共公告。 */
function isAppointmentNotice(item) {
  const title = String(item?.title || "").trim();
  const content = String(item?.content || "").trim();
  return /^预约(已通过|未通过|待保卫处审核|待被访人审核|待审核)/.test(title)
    || /^访客预约待(保卫处审核|被访人审核|审核)$/.test(title)
    || /^.+ 提交了新的来访预约/.test(content)
    || /^.+ 的预约已(通过|未通过|由保卫处|由.+通过|被.+驳回)/.test(content);
}

// ---------- 人员与账号输入规范化、格式校验 ----------

/** 手机号只保留数字并限制 11 位。 */
function normalizePhoneInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

/** 中国大陆手机号基础格式：1 开头且总计 11 位。 */
function isValidPhone(value) {
  return /^1\d{10}$/.test(String(value || "").trim());
}

/** 身份证转大写，只保留数字/X，并限制 18 位。 */
function normalizeIdNumberInput(value) {
  return String(value || "").toUpperCase().replace(/[^0-9X]/g, "").slice(0, 18);
}

/** 年份输入只保留最多四位数字。 */
function normalizeYearInput(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

/**
 * 按人员类型规范化人员编号。
 * 学生编号只允许数字；其他类型允许大写字母、数字和短横线；访客编号可稍长。
 */
function normalizeCodeInput(value, type) {
  const text = String(value || "").toUpperCase();
  if (type === "学生") return text.replace(/\D/g, "").slice(0, 20);
  return text.replace(/[^A-Z0-9-]/g, "").slice(0, type === "访客" ? 24 : 20);
}

/** 按账号类型限制账号字符：手机号/学号只留数字，其余转为大写编号格式。 */
function normalizeAccountInput(value, accountType) {
  if (accountType === "手机号") return normalizePhoneInput(value);
  if (accountType === "学号") return String(value || "").replace(/\D/g, "").slice(0, 20);
  return String(value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

/** 通用文本截断，保护表单状态不超过数据库与界面约定长度。 */
function normalizeLimitedText(value, maxLength) {
  return String(value || "").slice(0, maxLength);
}

/** 姓名允许 2~30 位中英文、间隔点、句点和空格。 */
function isValidPersonName(value) {
  return /^[\u4e00-\u9fa5A-Za-z·.\s]{2,30}$/.test(String(value || "").trim());
}

/**
 * 身份证基础有效性校验。
 * 空值由调用场景决定是否必填；非空时除格式外还检查第 7~14 位出生日期能否构成真实日历日期。
 */
function isValidIdNumber(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return true;
  if (!/^\d{17}[\dX]$/.test(text)) return false;
  // 从身份证中拆出出生年月日并构造本地 Date，随后逐项比对以排除 2 月 30 日等自动进位日期。
  const birth = text.slice(6, 14);
  const year = Number(birth.slice(0, 4));
  const month = Number(birth.slice(4, 6));
  const day = Number(birth.slice(6, 8));
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** 根据学生、访客、校友或其他人员类型校验其编号前缀、字符集和长度。 */
function isValidPersonCode(value, type) {
  const text = String(value || "").trim().toUpperCase();
  if (type === "学生") return /^\d{6,20}$/.test(text);
  if (type === "访客") return /^VIS[A-Z0-9-]{4,21}$/.test(text);
  if (type === "校友") return /^[A-Z0-9-]{4,24}$/.test(text);
  return /^[A-Z0-9-]{4,20}$/.test(text);
}

/** 返回当前人员类型对应的编号填写说明，用于校验错误和表单辅助文本。 */
function personCodeHint(type) {
  if (type === "学生") return "6-20 位数字学号";
  if (type === "访客") return "VIS 开头，7-24 位大写字母/数字/短横线";
  if (type === "校友") return "4-24 位大写字母/数字/短横线";
  return "4-20 位大写字母/数字/短横线";
}

/** 毕业年份可为空；填写时必须介于 1950 和当前年份之间。 */
function isValidGraduationYear(value) {
  if (!value) return true;
  const year = Number(value);
  return /^\d{4}$/.test(String(value)) && year >= 1950 && year <= new Date().getFullYear();
}

/** 返回登录账号类型对应的中文格式说明。 */
function accountHint(accountType) {
  if (accountType === "手机号") return "账号需为 11 位手机号";
  if (accountType === "学号") return "账号需为 6-20 位数字学号";
  if (accountType === "工号") return "账号需为 4-20 位大写字母/数字/短横线";
  if (accountType === "校友编号") return "账号需为 4-24 位大写字母/数字/短横线";
  return "账号需为 4-24 位大写字母/数字/短横线";
}

/** 账号允许为空；填写时按手机号、学号、工号或通用编号规则验证。 */
function isValidAccountValue(value, accountType) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (accountType === "手机号") return isValidPhone(text);
  if (accountType === "学号") return /^\d{6,20}$/.test(text);
  if (accountType === "工号") return /^[A-Z0-9-]{4,20}$/.test(text);
  return /^[A-Z0-9-]{4,24}$/.test(text);
}

/**
 * 人员管理表单的集中校验器。
 * 按固定顺序返回第一条错误文本，空字符串表示全部字段通过，提交函数可直接据此决定是否继续。
 */
function validatePersonFormFields(form, typeConfig) {
  if (!isValidPersonName(form.name)) return "姓名需为 2-30 位中文或英文字母";
  if (!isValidPersonCode(form.code, form.type)) return `${typeConfig.codeLabel}格式不正确：${personCodeHint(form.type)}`;
  if (!form.idNumber) return "请填写身份证号";
  if (!isValidIdNumber(form.idNumber)) return "身份证号需为 18 位有效身份证格式";
  if (!form.phone) return "请填写电话";
  if (!isValidPhone(form.phone)) return "联系电话必须为 11 位有效手机号";
  if (!isValidGraduationYear(form.graduationYear)) return `毕业年份需在 1950-${new Date().getFullYear()} 年之间`;
  if (form.password && (form.password.length < 6 || form.password.length > 32)) return "密码长度需为 6-32 位";
  if (form.username && !isValidAccountValue(form.username, form.accountType)) return accountHint(form.accountType);
  return "";
}

// ---------- 车辆号牌解析与选择器配置 ----------

// 中国大陆省级车牌简称列表，顺序用于下拉选择展示。
const plateProvinceOptions = ["京", "津", "沪", "渝", "冀", "豫", "云", "辽", "黑", "湘", "皖", "鲁", "新", "苏", "浙", "赣", "鄂", "桂", "甘", "晋", "蒙", "陕", "吉", "闽", "贵", "粤", "青", "藏", "川", "宁", "琼"];
// 各省份允许选择的发牌机关字母；排除 I/O 等容易与数字混淆的字符，并贴合各地常见范围。
const plateLetterOptionsByProvince = {
  京: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  津: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  沪: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  渝: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  冀: "ABCDEFGHJRT".split(""),
  豫: "ABCDEFGHJKLMNPQRUVW".split(""),
  云: "ABCDEFGHJKLMNPQRS".split(""),
  辽: "ABCDEFGHJKLMNPV".split(""),
  黑: "ABCDEFGHJKLMNPR".split(""),
  湘: "ABCDEFGHJKLMNPU".split(""),
  皖: "ABCDEFGHJKLMNPRS".split(""),
  鲁: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  新: "ABCDEFGHJKLMNPR".split(""),
  苏: "ABCDEFGHJKLMN".split(""),
  浙: "ABCDEFGHJKLM".split(""),
  赣: "ABCDEFGHJKLM".split(""),
  鄂: "ABCDEFGHJKLMNPQRS".split(""),
  桂: "ABCDEFGHJKLMNPQR".split(""),
  甘: "ABCDEFGHJKLMNP".split(""),
  晋: "ABCDEFGHJKLM".split(""),
  蒙: "ABCDEFGHJKLM".split(""),
  陕: "ABCDEFGHJKLMUV".split(""),
  吉: "ABCDEFGHJK".split(""),
  闽: "ABCDEFGHJKLM".split(""),
  贵: "ABCDEFGHJKLM".split(""),
  粤: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  青: "ABCDEFGH".split(""),
  藏: "ABCDEFGHJKLM".split(""),
  川: "ABCDEFGHJKLMNPQRSTUVWXYZ".split(""),
  宁: "ABCDE".split(""),
  琼: "ABCDEFGH".split("")
};

/** 获取省份对应的可选字母；未知省份安全回退为 A。 */
function plateLetterOptions(province) {
  return plateLetterOptionsByProvince[province] || ["A"];
}

/** 车牌尾号转大写，只保留字母数字，兼容 5 位普通号牌和 6 位新能源号牌。 */
function normalizePlateTail(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * 将任意车牌文本解析成 province、letter、tail 三段。
 * 输入中的间隔点、空格、句点和短横线先移除；无效省份默认使用项目所在地“皖”。
 */
function parsePlateNumber(value) {
  const compact = String(value || "").toUpperCase().replace(/[·\s.-]/g, "");
  const province = plateProvinceOptions.includes(compact[0]) ? compact[0] : "皖";
  const letters = plateLetterOptions(province);
  const letter = letters.includes(compact[1]) ? compact[1] : letters[0];
  return {
    province,
    letter,
    tail: normalizePlateTail(compact.slice(2))
  };
}

/** 把字符串或分段对象统一格式化为“省份+字母·尾号”的展示/提交格式。 */
function formatPlateNumber(value) {
  const plate = typeof value === "string" ? parsePlateNumber(value) : value;
  return `${plate.province}${plate.letter}·${normalizePlateTail(plate.tail)}`;
}

/** 校验发牌字母是否属于该省，以及尾号是否为 5~6 位字母数字。 */
function isValidPlateNumber(value) {
  const plate = parsePlateNumber(value);
  return plateLetterOptions(plate.province).includes(plate.letter) && /^[A-Z0-9]{5,6}$/.test(plate.tail);
}

// ---------- 通行规则编辑与验证器静态选项 ----------

// 系统支持的核验方式、允许时段模式、固定校门和规则适用角色。
const authMethodOptions = ["校园卡", "工号", "人脸识别", "车牌识别", "预约二维码", "校友二维码", "二维码扫码"];
const allowedTimeOptions = ["全天时间", "预约时段", "自定义"];
const gateNameOptions = ["东门", "南门", "西门", "北门"];
const defaultCustomAllowedTime = "08:00-18:00";
const accessRuleRoleLabels = ["学生", "教职工", "访客", "校友", "门岗安保", "保卫处管理员"];
// 规则验证器面向操作者显示的凭证类别。
const ruleValidatorCredentialOptions = [
  { label: "校园卡/学工号", value: "campusCard" },
  { label: "人脸识别", value: "face" },
  { label: "车牌识别", value: "plate" },
  { label: "二维码", value: "qr" }
];
// 切换凭证类别时自动填充的演示凭证与核验方式，二维码令牌留空供用户选择/输入。
const ruleValidatorSamples = {
  campusCard: { credentialValue: "2023210001", method: "校园卡" },
  face: { credentialValue: "2023210001", method: "人脸识别" },
  plate: { credentialValue: "皖A·8F526", method: "车牌识别" },
  qr: { credentialValue: "", method: "二维码扫码" }
};

/** 只接受系统四个标准校门；接口尚未返回或没有合法值时使用完整默认列表。 */
function normalizeGateOptions(options = []) {
  const optionNames = new Set(options);
  const allowedOptions = gateNameOptions.filter((name) => optionNames.has(name));
  return allowedOptions.length ? allowedOptions : gateNameOptions;
}

export function ProfilePage({ session, onSessionChange }) {
  // 个人档案以当前用户编号加载；会话本身作为首屏回退值，避免出现空白个人中心。
  const { data, reload } = useApiData(() => api.myProfile(session.user.id), session, [session.user.id]);
  // 接口人员档案优先于会话快照；电话/单位可编辑，密码表单独立保存原密码和新密码。
  const person = data.person || session.person || {};
  const [phone, setPhone] = useState(person.phone || "");
  const [company, setCompany] = useState(person.company || "");
  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");

  // 异步人员档案更新后同步表单，但只依赖具体字段，避免对象引用变化造成无意义重置。
  useEffect(() => {
    setPhone(person.phone || "");
    setCompany(person.company || "");
  }, [person.phone, person.company]);

  /** 校验手机号并保存可编辑资料，同时把后端返回的新资料同步到根会话。 */
  async function saveProfile() {
    if (!isValidPhone(phone)) {
      setMessage("联系电话必须为 11 位有效手机号");
      return;
    }

    try {
      const next = await api.updateMyProfile({ userId: session.user.id, phone, company });
      // 保留原 token，并使用后端返回字段覆盖旧会话，确保侧栏等全局区域立即更新。
      onSessionChange?.({ ...session, ...next, token: session.token });
      setMessage("个人资料已保存");
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 提交原密码和新密码；成功后清空两个敏感输入框。 */
  async function changePassword() {
    try {
      await api.changePassword({ userId: session.user.id, ...passwordForm });
      setPasswordForm({ oldPassword: "", newPassword: "" });
      setMessage("登录密码已修改");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    // 左侧只读身份主数据，右侧提供允许用户维护的账号字段。
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <Panel title="个人中心" subtitle="核心身份信息只读，可维护联系电话并修改登录密码">
        <InfoGrid person={person} user={data.user || session.user} />
      </Panel>
      <Panel title="账号维护">
        <div className="space-y-4">
          <Field
            label="联系电话"
            value={phone}
            onChange={(value) => setPhone(normalizePhoneInput(value))}
            helper="请输入 11 位手机号"
            inputMode="numeric"
            maxLength={11}
          />
          {/* 只有访客档案包含可自行维护的单位名称。 */}
          {session.user.role === "visitor" && <Field label="单位名称" value={company} onChange={setCompany} />}
          <button onClick={saveProfile} className="rounded-2xl bg-primary px-5 py-3 text-white shadow-glow">保存联系方式</button>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="原密码" type="password" value={passwordForm.oldPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, oldPassword: value }))} />
            <Field label="新密码" type="password" value={passwordForm.newPassword} onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))} />
          </div>
          <button onClick={changePassword} className="rounded-2xl bg-primarySoft px-5 py-3 text-primary">修改密码</button>
          {message && <p className="text-sm text-primary">{message}</p>}
        </div>
      </Panel>
    </div>
  );
}

// 两个人脸照片槽位分别建议覆盖不同光照/佩戴状态，提高识别样本多样性。
const faceUploadSlots = [
  { slot: "primary", label: "照片一", hint: "建议上传白天或不戴口罩照片" },
  { slot: "secondary", label: "照片二", hint: "建议上传夜间或戴口罩照片" }
];

/** 学生/教职工人脸照片页面：最多维护两个固定槽位，并即时显示本地预览和上传结果。 */
export function FaceUploadPage({ session }) {
  // 从角色驾驶舱取得人员信息和已有照片，兼容旧版单 face 字段与新版 faces 数组。
  const { data, reload } = useApiData(() => api.roleDashboard(session.user.role, session.user.id), { person: {}, face: null, faces: [] }, [session.user.id]);
  // 三个以 slot 为键的对象分别保存文件名、反馈消息和本地/服务端预览地址。
  const [fileNames, setFileNames] = useState({});
  const [messages, setMessages] = useState({});
  const [previewUrls, setPreviewUrls] = useState({});
  // uploadingSlot 非空时禁用所有文件输入，避免并发上传覆盖状态。
  const [uploadingSlot, setUploadingSlot] = useState("");
  const faces = Array.isArray(data.faces) && data.faces.length ? data.faces : data.face ? [data.face] : [];

  /** 使用 FileReader 把浏览器 File 转为 Data URL，供预览和 JSON 上传。 */
  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("照片读取失败，请重新选择"));
      reader.readAsDataURL(file);
    });
  }

  /** 查找指定槽位的已有照片；旧数据没有 slot 时默认归为 primary。 */
  function faceForSlot(slot) {
    return faces.find((item) => (item.slot || "primary") === slot);
  }

  /** 完整上传流程：读取文件、显示预览、调用接口、保存返回地址并刷新驾驶舱。 */
  async function uploadFace(file, slot, label) {
    try {
      setUploadingSlot(slot);
      setMessages((current) => ({ ...current, [slot]: "正在上传..." }));
      // 本地读取完成后先显示预览，降低网络上传期间的等待感。
      const imageUrl = await readPhoto(file);
      setPreviewUrls((current) => ({ ...current, [slot]: imageUrl }));
      // 服务端可能返回持久化后的地址，若没有则继续使用本地 Data URL。
      const result = await api.uploadFace({ userId: session.user.id, fileName: file.name || "face-photo.jpg", imageUrl, slot, label });
      setPreviewUrls((current) => ({ ...current, [slot]: result.imageUrl || imageUrl }));
      setMessages((current) => ({ ...current, [slot]: `已上传：${result.fileName}` }));
      reload();
    } catch (error) {
      setMessages((current) => ({ ...current, [slot]: error.message }));
    } finally {
      setUploadingSlot("");
    }
  }

  // 已上传数量用于右侧摘要；最近照片按更新时间字符串倒序取得第一条。
  const uploadedCount = faces.filter((item) => item.status === "已上传").length;
  const latestFace = faces
    .filter((item) => item.updatedAt)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];

  return (
    <Panel title="人脸照片上传" subtitle="最多上传两张照片，用于提升不同光线和佩戴状态下的人脸识别稳定性">
      <div className="grid gap-6 xl:grid-cols-[1fr_.75fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {/* 两个槽位使用相同卡片结构，各自维护照片、预览、上传态和反馈。 */}
          {faceUploadSlots.map((slotConfig) => {
            const face = faceForSlot(slotConfig.slot);
            // 预览优先显示刚选择的本地图片，否则显示服务器已有图片。
            const photoUrl = previewUrls[slotConfig.slot] || face?.imageUrl || "";
            const uploading = uploadingSlot === slotConfig.slot;
            return (
              <div key={slotConfig.slot} className="rounded-card bg-slate-50 p-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-slate-700">{slotConfig.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{slotConfig.hint}</p>
                </div>
                <div className="grid aspect-square overflow-hidden rounded-[28px] bg-white shadow-card">
                  {photoUrl ? (
                    <img src={photoUrl} alt={`${slotConfig.label}人脸照片`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <Camera size={56} className="text-primary" />
                    </div>
                  )}
                </div>
                <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm text-slate-500 shadow-card">
                  <Upload size={18} /> {uploading ? "上传中..." : face ? "替换照片" : "选择照片"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={Boolean(uploadingSlot)}
                    onChange={(event) => {
                      // 每次只处理文件选择器的第一张图片；取消选择时不做任何操作。
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setFileNames((current) => ({ ...current, [slotConfig.slot]: file.name || "" }));
                      uploadFace(file, slotConfig.slot, `${slotConfig.label}（${slotConfig.hint.replace("建议上传", "")}）`);
                      // 触发上传后清空 input，之后重新选择同名文件仍会触发 change。
                      event.target.value = "";
                    }}
                  />
                </label>
                {(messages[slotConfig.slot] || fileNames[slotConfig.slot] || face?.updatedAt) && (
                  <p className="mt-3 min-h-5 text-sm text-slate-400">
                    {messages[slotConfig.slot] || (fileNames[slotConfig.slot] ? `已选择：${fileNames[slotConfig.slot]}` : `最近更新：${face.updatedAt}`)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-4">
          <Info title="照片状态" value={uploadedCount ? `已上传 ${uploadedCount}/2 张` : data.person?.faceStatus || "未上传"} />
          <Info title="最近更新时间" value={latestFace?.updatedAt || "暂无"} />
          <Info title="识别用途" value="刷脸通行、异常身份复核" />
          <Info title="采集建议" value="可分别上传白天/夜间，或不戴口罩/戴口罩照片" />
          <Badge type="warning">学号/工号、姓名、学院/部门信息不可自行修改</Badge>
        </div>
      </div>
    </Panel>
  );
}

/**
 * 车辆页面路由组件。
 * 管理员进入全量车辆管理；教职工进入本人车辆页面，两者共享车牌解析和 API，但权限/表单不同。
 */
export function VehiclePage({ session }) {
  // 角色分流在任何 Hook 调用前完成，同一组件实例的 session 角色在生命周期内不会切换。
  if (session.user.role === "admin") {
    return <VehicleManagementPage />;
  }

  // 教职工接口由后端按会话过滤本人车辆，最多允许两辆。
  const { data: vehicles, reload } = useApiData(() => api.vehicles(), [], [session.user.id]);
  const [form, setForm] = useState({ plateNo: "", status: "正常" });
  const [editingVehicleId, setEditingVehicleId] = useState("");
  const [message, setMessage] = useState("");
  const editingVehicle = vehicles.find((item) => item.id === editingVehicleId);
  // 编辑时即使已有两辆也允许保存当前车辆；新增时严格限制数量小于二。
  const canCreateMore = vehicles.length < 2 || Boolean(editingVehicleId);

  /** 新增或更新本人车辆，提交前统一格式化和校验车牌。 */
  async function saveVehicle(event) {
    event.preventDefault();
    // 表单使用分段选择器，但状态中保存格式化字符串；提交前再次规范化。
    const nextPlateNo = formatPlateNumber(form.plateNo);
    if (!canCreateMore) {
      setMessage("每位老师最多只能登记 2 辆车");
      return;
    }
    if (!isValidPlateNumber(nextPlateNo)) {
      setMessage("请选择省份和字母，并填写 5-6 位车牌后缀");
      return;
    }

    try {
      // editingVehicleId 决定调用 PATCH 还是 POST；新增车辆强制初始状态为正常。
      if (editingVehicleId) {
        await api.updateVehicle(editingVehicleId, { plateNo: nextPlateNo, status: form.status });
        setMessage(`${nextPlateNo} 已更新`);
      } else {
        await api.createVehicle({ plateNo: nextPlateNo, status: "正常" });
        setMessage(`${nextPlateNo} 已登记`);
      }
      resetTeacherVehicleForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 把表格行回填到教职工车辆编辑表单。 */
  function editTeacherVehicle(row) {
    setEditingVehicleId(row.id);
    setForm({ plateNo: row.plateNo || "", status: row.status || "正常" });
  }

  /** 二次确认后删除车辆；若正在编辑同一车辆，同时退出编辑态。 */
  async function deleteTeacherVehicle(row) {
    if (!window.confirm(`确认删除车辆 ${row.plateNo} 吗？`)) return;
    try {
      await api.deleteVehicle(row.id);
      setMessage(`${row.plateNo} 已删除`);
      if (editingVehicleId === row.id) resetTeacherVehicleForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 恢复新增模式和空车牌默认表单。 */
  function resetTeacherVehicleForm() {
    setEditingVehicleId("");
    setForm({ plateNo: "", status: "正常" });
  }

  return (
    <div className="space-y-6">
      {/* 右上角显示已登记数量，达到上限时切换为警告色。 */}
      <Panel
        title={editingVehicleId ? "编辑车牌号" : "新增车牌号"}
        subtitle="每位教职工最多登记 2 辆车，车牌同步后可自动识别通行"
        action={<Badge type={vehicles.length >= 2 ? "warning" : "primary"}>{vehicles.length}/2 辆</Badge>}
      >
        <form onSubmit={saveVehicle} className="grid gap-4 xl:grid-cols-[1fr_.35fr_auto]">
          <PlateNumberPicker label="车牌号" required value={form.plateNo} onChange={(value) => setForm((current) => ({ ...current, plateNo: value }))} />
          <SelectField label="车辆状态" value={form.status} options={["正常", "停用"]} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
          <div className="flex items-end gap-2">
            <button disabled={!canCreateMore} className="h-11 rounded-2xl bg-primary px-5 text-sm text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-50">
              {editingVehicleId ? "保存车辆" : "新增车辆"}
            </button>
            <button type="button" onClick={resetTeacherVehicleForm} className="h-11 rounded-2xl bg-slate-50 px-4 text-sm text-slate-500">
              重置
            </button>
          </div>
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>

      <Panel title="我的车辆" subtitle="车辆状态会参与车牌核验判断">
        {/* 操作列通过 render 接收整行，从而绑定编辑和删除动作。 */}
        <DataTable
          columns={[
            { title: "车牌号", key: "plateNo" },
            { title: "状态", key: "status", badge: true },
            { title: "最近通行", key: "lastAccess" },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => editTeacherVehicle(row)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">编辑</button>
                <button onClick={() => deleteTeacherVehicle(row)} className="rounded-xl bg-red-50 px-3 py-1 text-xs text-danger">删除</button>
              </div>
            ) }
          ]}
          rows={vehicles}
        />
      </Panel>
    </div>
  );
}

/** 管理员车辆档案页：可为任意教职工绑定车辆、筛选、编辑、停用和删除。 */
function VehicleManagementPage() {
  // 车辆和人员分别加载；owners 只保留能够作为车主的教职工。
  const { data: vehicles, reload } = useApiData(() => api.vehicles(), [], []);
  const { data: people } = useApiData(() => api.people(), [], []);
  const owners = people.filter((item) => item.role === "teacher" || item.type === "教职工");
  const [form, setForm] = useState({ ownerId: "", plateNo: "", status: "正常" });
  const [filters, setFilters] = useState({ keyword: "", ownerId: "", status: "" });
  const [editingVehicleId, setEditingVehicleId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 编辑时从计数中排除自身，避免保存第二辆车时被误判为第三辆。
  const ownerVehicleCount = vehicles.filter((item) => item.ownerId === form.ownerId && item.id !== editingVehicleId).length;
  // 所有筛选条件在前端组合执行：车主、状态为精确匹配，关键词跨多个字段模糊匹配。
  const filteredVehicles = vehicles.filter((item) => {
    const keyword = filters.keyword.trim();
    if (filters.ownerId && item.ownerId !== filters.ownerId) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (keyword) {
      const values = [item.id, item.plateNo, item.ownerName, item.ownerId, item.status, item.lastAccess];
      if (!values.some((value) => String(value || "").includes(keyword))) return false;
    }
    return true;
  });

  // 候选车主异步加载完成后，为尚未选择车主的表单自动选中第一人。
  useEffect(() => {
    if (!form.ownerId && owners[0]?.id) {
      setForm((current) => ({ ...current, ownerId: owners[0].id }));
    }
  }, [owners, form.ownerId]);

  /** 管理员新增/编辑车辆；依次验证必填、车牌格式和每位老师两辆上限。 */
  async function createVehicle(event) {
    event.preventDefault();
    const nextPlateNo = formatPlateNumber(form.plateNo);
    if (!form.ownerId || !form.plateNo.trim()) {
      setMessage("请选择车主并填写车牌号");
      return;
    }
    if (!isValidPlateNumber(nextPlateNo)) {
      setMessage("请选择省份和字母，并填写 5-6 位车牌后缀");
      return;
    }
    if (ownerVehicleCount >= 2) {
      setMessage("每位老师最多只能登记 2 辆车");
      return;
    }
    // 提交期间禁用公共 FormActions，避免重复创建。
    setSubmitting(true);
    try {
      if (editingVehicleId) {
        await api.updateVehicle(editingVehicleId, { ...form, plateNo: nextPlateNo });
        setMessage(`${nextPlateNo} 已更新`);
      } else {
        await api.createVehicle({ ...form, plateNo: nextPlateNo });
        setMessage(`${nextPlateNo} 已登记`);
      }
      resetVehicleForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 在正常与停用之间切换车辆状态，并立即刷新列表。 */
  async function toggleVehicleStatus(row) {
    const status = row.status === "正常" ? "停用" : "正常";
    await api.updateVehicle(row.id, { status });
    setMessage(`${row.plateNo} 已${status === "正常" ? "恢复" : "停用"}`);
    reload();
  }

  /** 将车辆和车主信息完整回填编辑表单。 */
  function editVehicle(row) {
    setEditingVehicleId(row.id);
    setForm({
      ownerId: row.ownerId || owners[0]?.id || "",
      plateNo: row.plateNo || "",
      status: row.status || "正常"
    });
  }

  /** 管理员删除车辆；若删除的是当前编辑项则重置表单。 */
  async function deleteVehicle(row) {
    if (!window.confirm(`确认删除车辆 ${row.plateNo} 吗？`)) return;
    try {
      await api.deleteVehicle(row.id);
      setMessage(`${row.plateNo} 已删除`);
      if (editingVehicleId === row.id) resetVehicleForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 退出编辑态并默认选择第一位可用车主。 */
  function resetVehicleForm() {
    setEditingVehicleId("");
    setForm({ ownerId: owners[0]?.id || "", plateNo: "", status: "正常" });
  }

  return (
    <div className="space-y-6">
      <Panel title={editingVehicleId ? "编辑车辆档案" : "新增车辆档案"} subtitle="车辆单独维护，绑定到教职工车主后用于车牌识别通行">
        {/* 表单在桌面端使用五列网格，车牌选择器占两列，操作按钮单独占满下一行。 */}
        <form onSubmit={createVehicle} className="grid gap-4 md:grid-cols-5">
          <SelectField
            label="车主"
            required
            value={form.ownerId}
            options={owners.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id }))}
            onChange={(value) => setForm((current) => ({ ...current, ownerId: value }))}
          />
          <div className="rounded-2xl bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
            <div className="text-xs text-slate-400">该车主已登记</div>
            <div className="mt-1 font-semibold text-slate-700">{ownerVehicleCount}/2 辆</div>
          </div>
          <PlateNumberPicker
            label="车牌号"
            required
            value={form.plateNo}
            onChange={(value) => setForm((current) => ({ ...current, plateNo: value }))}
            className="md:col-span-2"
          />
          <SelectField label="车辆状态" value={form.status} options={["正常", "停用"]} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
          <FormActions
            className="md:col-span-5"
            submitText={editingVehicleId ? "保存车辆" : "新增车辆"}
            submitting={submitting}
            onReset={resetVehicleForm}
          />
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>

      <Panel title="车辆档案列表" subtitle="车辆与人员分开管理，车辆状态会参与车牌核验判断">
        {/* 列表上方提供关键词、车主、状态筛选和一键重置。 */}
        <div className="mb-4 grid gap-3 xl:grid-cols-[1.1fr_.7fr_.55fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">查找车辆</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 pl-10 pr-4 text-sm outline-none"
                placeholder="车牌号、车主、编号"
              />
            </span>
          </label>
          <SelectField
            label="车主"
            value={filters.ownerId}
            options={[{ label: "全部车主", value: "" }, ...owners.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id }))]}
            onChange={(value) => setFilters((current) => ({ ...current, ownerId: value }))}
          />
          <SelectField
            label="状态"
            value={filters.status}
            options={[{ label: "全部状态", value: "" }, "正常", "停用"]}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          />
          <button
            type="button"
            onClick={() => setFilters({ keyword: "", ownerId: "", status: "" })}
            className="mt-7 h-11 rounded-2xl bg-slate-50 px-4 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary"
          >
            清空筛选
          </button>
        </div>
        <DataTable
          columns={[
            { title: "车辆编号", key: "id" },
            { title: "车牌号", key: "plateNo" },
            { title: "车主", key: "ownerName" },
            { title: "车主编号", key: "ownerId" },
            { title: "状态", key: "status", badge: true },
            { title: "最近通行", key: "lastAccess" },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => editVehicle(row)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">编辑</button>
                <button onClick={() => toggleVehicleStatus(row)} className="rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-600">
                  {row.status === "正常" ? "停用" : "恢复"}
                </button>
                <button onClick={() => deleteVehicle(row)} className="rounded-xl bg-red-50 px-3 py-1 text-xs text-danger">删除</button>
              </div>
            ) }
          ]}
          rows={filteredVehicles}
        />
      </Panel>
    </div>
  );
}

export function AppointmentReviewPage({ session, mode = "manage" }) {
  // 同一组件服务被访人审核、管理员监管和访客状态查询，role/mode 共同决定标题与操作权限。
  const role = session.user.role;
  // filters 保存当前输入；query 只在提交查询后更新，避免每次敲字都请求后端。
  const [filters, setFilters] = useState({ keyword: "", status: "", timeFrom: "", timeTo: "" });
  const [query, setQuery] = useState("");
  const { data, reload } = useApiData(() => api.appointments(query), [], [role, session.user.id, query]);
  const [message, setMessage] = useState("");
  // 学生/教职工作为被访人完成一审，管理员作为保卫处完成二审；访客只能查看。
  const isHostReviewer = role === "student" || role === "teacher";
  const isSecurityReviewer = role === "admin";
  const canReview = isHostReviewer || isSecurityReviewer;
  const title = mode === "review" ? "访客预约审核" : mode === "status" ? "预约状态查询" : "预约监管";
  // 日期范围在前端进一步过滤，关键词和状态则编码进后端查询参数。
  const filteredAppointments = data.filter((item) => appointmentMatchesTime(item, filters.timeFrom, filters.timeTo));

  /** 更新单个筛选字段，同时保留其他条件。 */
  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  /** 将状态和角色相关关键词转换为 URL 查询参数，再触发 useApiData 重载。 */
  function submitFilters(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.keyword) {
      // 访客按被访人搜索；管理/审核角色按访客搜索。
      params.set(role === "visitor" ? "host" : "visitor", filters.keyword);
    }
    setQuery(params.toString() ? `?${params.toString()}` : "");
  }

  /** 清空界面条件和已提交查询，恢复完整列表。 */
  function resetFilters() {
    setFilters({ keyword: "", status: "", timeFrom: "", timeTo: "" });
    setQuery("");
  }

  /** 提交通过/驳回动作，并根据当前审核层级生成准确反馈文案。 */
  async function review(row, status) {
    try {
      await api.reviewAppointment(row.id, { status });
      const statusText = status === "已通过"
        ? isHostReviewer
          ? "通过，等待保卫处审核"
          : "由保卫处通过"
        : "驳回";
      setMessage(`${row.visitor} 的预约已${statusText}`);
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 判断当前角色能否处理该预约的当前状态，严格实现两级审核顺序。 */
  function canReviewAppointment(row) {
    if (isHostReviewer) return row.status === "待被访人审核" || row.status === "待审核";
    if (isSecurityReviewer) return row.status === "待保卫处审核";
    return false;
  }

  /** 对当前层级不可操作的预约说明其所在阶段，而不是显示无意义按钮。 */
  function reviewPlaceholder(row) {
    if (isHostReviewer && row.status === "待保卫处审核") return "已提交保卫处";
    if (isSecurityReviewer && (row.status === "待被访人审核" || row.status === "待审核")) return "等待被访人";
    return "已处理";
  }

  return (
    <Panel title={title} subtitle="查看预约申请、审核状态、审核结果和访客二维码生成情况">
      {message && <div className="mb-4 rounded-2xl bg-primarySoft px-4 py-3 text-sm text-primary">{message}</div>}
      {/* 查询区的开始/结束时间由前端 appointmentMatchesTime 处理。 */}
      <form onSubmit={submitFilters} className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
        <Field label={role === "visitor" ? "被访人" : "访客/编号"} value={filters.keyword} onChange={(value) => updateFilter("keyword", value)} />
        <SelectField label="状态" value={filters.status} options={[{ label: "全部状态", value: "" }, "待被访人审核", "待保卫处审核", "已通过", "未通过"]} onChange={(value) => updateFilter("status", value)} />
        <Field label="开始时间" value={filters.timeFrom} onChange={(value) => updateFilter("timeFrom", value)} />
        <Field label="结束时间" value={filters.timeTo} onChange={(value) => updateFilter("timeTo", value)} />
        <div className="flex items-end gap-2 md:col-span-4 xl:col-span-2">
          <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm text-white shadow-glow">
            <Search size={16} />
            查询
          </button>
          <button type="button" onClick={resetFilters} className="h-11 rounded-2xl bg-slate-50 px-5 text-sm text-slate-500">重置</button>
        </div>
      </form>
      <DataTable
        columns={[
          { title: "预约编号", key: "id" },
          { title: "访客", key: "visitor" },
          { title: "被访人", key: "host" },
          { title: "来访时间", key: "time" },
          { title: "事由", key: "reason" },
          { title: "状态", key: "status", badge: true },
          // 只有具备审核角色时才追加操作列，访客页面不会渲染任何审核控件。
          ...(canReview ? [{
            title: "操作",
            key: "action",
            render: (row) => canReviewAppointment(row) ? (
              <div className="flex gap-2">
                <button onClick={() => review(row, "已通过")} className="rounded-xl bg-success/10 px-3 py-1 text-xs text-success">
                  {isHostReviewer ? "通过并提交保卫处" : "保卫处通过"}
                </button>
                <button onClick={() => review(row, "未通过")} className="rounded-xl bg-danger/10 px-3 py-1 text-xs text-danger">驳回</button>
              </div>
            ) : reviewPlaceholder(row)
          }] : [])
        ]}
        rows={filteredAppointments}
      />
    </Panel>
  );
}

/** 访客预约状态页只是审核组件的只读模式包装，权限仍由 session 角色决定。 */
export function AppointmentStatusPage({ session }) {
  return <AppointmentReviewPage session={session} mode="status" />;
}

/** 出入记录页：管理员/门岗查询全量记录，其他角色查看后端过滤后的本人记录。 */
export function MonitorPage({ session }) {
  const role = session.user.role;
  const [filters, setFilters] = useState({ keyword: "", type: "", method: "", gate: "", status: "", timeFrom: "", timeTo: "" });
  const [query, setQuery] = useState("");
  // 管理角色直接使用记录接口及查询字符串；个人角色使用驾驶舱确保数据隔离。
  const loader = role === "admin" || role === "guard"
    ? () => api.accessRecords(query)
    : () => api.roleDashboard(role, session.user.id).then((data) => data.records || []);
  const { data } = useApiData(loader, [], [role, session.user.id, query]);
  const canSearch = role === "admin" || role === "guard";
  // 即使后端已按部分条件过滤，仍统一用 filterAccessRecords 处理全部界面条件和个人数据。
  const filteredRecords = filterAccessRecords(data, filters);

  /** 修改一个记录筛选条件。 */
  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  /** 把所有非空条件写入 URLSearchParams；特殊字符由浏览器自动编码。 */
  function submitFilters(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    setQuery(params.toString() ? `?${params.toString()}` : "");
  }

  /** 恢复全部记录和空筛选表单。 */
  function resetFilters() {
    setFilters({ keyword: "", type: "", method: "", gate: "", status: "", timeFrom: "", timeTo: "" });
    setQuery("");
  }

  return (
    <Panel title={canSearch ? "出入记录查询" : "我的出入记录"} subtitle="通行数据由闸机、刷卡、人脸、车牌和扫码设备自动同步">
      {/* 七个条件覆盖人员、方式、校门、状态和时间范围；个人角色仍可筛选自己的记录。 */}
      <form onSubmit={submitFilters} className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Field label="关键词" placeholder="姓名或人员编号" value={filters.keyword} onChange={(value) => updateFilter("keyword", value)} />
        <SelectField label="人员类型" value={filters.type} options={["", "学生", "教职工", "访客", "校友", "未知"]} onChange={(value) => updateFilter("type", value)} />
        <SelectField label="通行方式" value={filters.method} options={["", "校园卡", "人脸识别", "车牌识别", "预约二维码", "校友二维码", "二维码扫码", "人工核验后放行", "现场放行"]} onChange={(value) => updateFilter("method", value)} />
        <SelectField label="校门" value={filters.gate} options={["", ...gateNameOptions]} onChange={(value) => updateFilter("gate", value)} />
        <SelectField label="状态" value={filters.status} options={["", "正常", "异常"]} onChange={(value) => updateFilter("status", value)} />
        <Field label="开始时间" value={filters.timeFrom} onChange={(value) => updateFilter("timeFrom", value)} />
        <Field label="结束时间" value={filters.timeTo} onChange={(value) => updateFilter("timeTo", value)} />
        <div className="flex gap-2 md:col-span-4 xl:col-span-7">
          <button className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm text-white shadow-glow">
            <Search size={16} />
            查询记录
          </button>
          <button type="button" onClick={resetFilters} className="rounded-2xl bg-slate-50 px-5 py-3 text-sm text-slate-500">重置条件</button>
        </div>
      </form>
      <DataTable
        // 字段顺序与门岗查看通行事件时的关注顺序一致，状态列使用徽标。
        columns={[
          { title: "时间", key: "time" },
          { title: "姓名", key: "name" },
          { title: "学号/工号/编号", key: "personCode" },
          { title: "人员类型", key: "type" },
          { title: "通行方式", key: "method" },
          { title: "校门", key: "gate" },
          { title: "状态", key: "status", badge: true }
        ]}
        rows={filteredRecords}
      />
    </Panel>
  );
}

/**
 * 异常中心。
 * 管理员查看态势与智能体分析，门岗执行现场动作，普通角色只查看与本人相关的异常记录。
 */
export function ExceptionCenterPage({ session }) {
  const role = session.user.role;
  const [filters, setFilters] = useState({ keyword: "", risk: "", status: "", gate: "" });
  const [query, setQuery] = useState("");
  // 全量异常和个人异常沿用与出入记录相同的数据隔离策略。
  const loader = role === "admin" || role === "guard"
    ? () => api.exceptions(query)
    : () => api.roleDashboard(role, session.user.id).then((data) => data.exceptions || []);
  const { data, reload } = useApiData(loader, [], [role, session.user.id, query]);
  // 只有管理员请求聚合分析；其他角色用已完成 Promise 保持数据结构一致且不越权调用。
  const { data: analysisData, reload: reloadAnalysis } = useApiData(
    () => role === "admin" ? api.exceptionAnalysis() : Promise.resolve({ model: null, summary: {}, items: [] }),
    { model: null, summary: {}, items: [] },
    [role]
  );
  // selectedExceptionId 使表格选择、处置面板和智能体上下文指向同一事件。
  const [selectedExceptionId, setSelectedExceptionId] = useState("");
  const filteredExceptions = filterExceptions(data, filters);
  // 如果当前选择因筛选消失，则回退到筛选结果第一条。
  const selected = filteredExceptions.find((item) => item.id === selectedExceptionId) || filteredExceptions[0];
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [closeAfterAction, setCloseAfterAction] = useState(true);
  // 管理员只查看分析和门岗处理结果；门岗才负责现场处置并写入处理记录。
  const canAnalyze = role === "admin";
  const canHandle = role === "guard";

  // 初次出现筛选结果时自动选择第一条，便于门岗直接查看处置面板。
  useEffect(() => {
    if (!selectedExceptionId && filteredExceptions[0]?.id) setSelectedExceptionId(filteredExceptions[0].id);
  }, [filteredExceptions, selectedExceptionId]);

  /** 更新单个异常筛选条件。 */
  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  /** 提交人员、风险和状态到后端；校门继续由本地 filterExceptions 过滤。 */
  function submitFilters(event) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (filters.keyword) params.set("person", filters.keyword);
    if (filters.risk) params.set("risk", filters.risk);
    if (filters.status) params.set("status", filters.status);
    setQuery(params.toString() ? `?${params.toString()}` : "");
    // 查询结果集合可能改变，因此清空旧选择，等待 effect 选择新结果第一条。
    setSelectedExceptionId("");
  }

  /** 清空筛选和当前选择。 */
  function resetFilters() {
    setFilters({ keyword: "", risk: "", status: "", gate: "" });
    setQuery("");
    setSelectedExceptionId("");
  }

  /** 门岗对当前异常执行动作，可附带说明并选择动作后是否直接闭环。 */
  async function handleAction(action) {
    if (!selected) return;
    try {
      await api.handleException(selected.id, { action, note, close: closeAfterAction });
      setMessage(`已执行：${action}`);
      setNote("");
      // 处置后刷新异常列表；管理员视图还要同步刷新聚合分析指标。
      reload();
      if (canAnalyze) reloadAnalysis();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // 表格基础列对所有角色一致；仅门岗动态追加处理列，用于把下方现场处理面板绑定到当前异常。
  const tableColumns = [
    { title: "异常编号", key: "id" },
    { title: "时间", key: "time" },
    { title: "人员", key: "person" },
    { title: "异常类型", key: "type" },
    { title: "异常原因", key: "reason", render: (row) => <span className="block max-w-[360px] truncate">{row.reason || "-"}</span> },
    { title: "风险等级", key: "risk", badge: true },
    { title: "状态", key: "status", badge: true },
    ...(canHandle ? [{
      title: "处理",
      key: "select",
      render: (row) => (
        <button onClick={() => setSelectedExceptionId(row.id)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">
          {selected?.id === row.id ? "已选中" : "处理"}
        </button>
      )
    }] : [])
  ];

  // 管理员底部只读表：逐条展示门岗保安对每个异常事件留下的最新处理结果。
  const guardHandlingRows = filteredExceptions.map((item) => {
    const latestAction = Array.isArray(item.actions) && item.actions.length ? item.actions[0] : null;
    return {
      id: item.id,
      time: item.time,
      person: item.person || "未知人员",
      type: item.type || "-",
      gate: item.gate || "-",
      risk: item.risk || "-",
      status: item.status || "-",
      action: latestAction?.action || (item.status === "已处理" ? "已处理" : "暂无处理结果"),
      handler: latestAction?.handler || item.handler || "暂无",
      handledAt: latestAction?.createdAt || item.handledAt || "",
      note: latestAction?.note || item.note || ""
    };
  });

  return (
    <div className="space-y-6">
      {/* 第一块始终显示可筛选异常列表，标题与说明按角色能力变化。 */}
      <Panel
        title={canAnalyze ? "异常事件分析" : canHandle ? "异常事件处理" : "我的异常记录"}
        subtitle={canAnalyze ? "本地轻量智能体对异常事件进行归因、风险评分和处置边界分析，现场处理由门岗安保执行" : "系统自动识别异常事件，并按低/中/高风险进行分级"}
      >
        {/* 风险、状态和校门使用固定选项，避免拼写不一致导致查不到数据。 */}
        <form onSubmit={submitFilters} className="mb-5 grid gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Field label="关键词" value={filters.keyword} onChange={(value) => updateFilter("keyword", value)} />
          <SelectField label="风险等级" value={filters.risk} options={["", "低风险", "中风险", "高风险"]} onChange={(value) => updateFilter("risk", value)} />
          <SelectField label="状态" value={filters.status} options={["", "待处理", "处理中", "已处理"]} onChange={(value) => updateFilter("status", value)} />
          <SelectField label="校门" value={filters.gate} options={["", ...gateNameOptions]} onChange={(value) => updateFilter("gate", value)} />
          <div className="flex items-end gap-2 md:col-span-4 xl:col-span-2">
            <button className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm text-white shadow-glow">
              <Search size={16} />
              查询
            </button>
            <button type="button" onClick={resetFilters} className="h-11 rounded-2xl bg-slate-50 px-5 text-sm text-slate-500">重置</button>
          </div>
        </form>
        <DataTable
          columns={tableColumns}
          rows={filteredExceptions}
        />
      </Panel>
      {/* 管理员专属：左侧聚合态势，右侧智能体自然语言问答。 */}
      {canAnalyze && (
        <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
          <Panel title="异常态势摘要" subtitle={`${analysisData.model?.name || "TinyCampusExceptionAgent"} 本地轻量模型已接入`}>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
              <Info title="异常总数" value={analysisData.summary?.total ?? 0} />
              <Info title="待闭环异常" value={analysisData.summary?.pending ?? 0} />
              <Info title="高风险异常" value={analysisData.summary?.highRisk ?? 0} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* 高频校门/类型数组转换为“名称 数量”的简洁摘要。 */}
              <Info title="高发校门" value={(analysisData.summary?.hotGates || []).map((item) => `${item.name} ${item.count}`).join(" / ") || "-"} />
              <Info title="高发类型" value={(analysisData.summary?.hotTypes || []).map((item) => `${item.name} ${item.count}`).join(" / ") || "-"} />
            </div>
          </Panel>
          <ExceptionAgentChat compact selectedExceptionId={selected?.id} />
        </div>
      )}
      {/* 门岗专属：围绕当前选中事件展示原因、建议、说明输入和四种标准动作。 */}
      {canHandle && (
        <Panel title="异常事件处理" subtitle="门岗安保根据现场核验结果执行拒绝、放行或上报">
          {selected ? (
            <div className="grid gap-5 xl:grid-cols-[.7fr_1fr]">
              <div className="rounded-card bg-red-50 p-5 text-danger">
                <ShieldAlert size={42} />
                <div className="mt-4 text-xl font-semibold">{selected.type}</div>
                <p className="mt-2 text-sm leading-6">{selected.reason}</p>
              </div>
              <div className="rounded-card bg-primarySoft p-5 text-primary">
                <Sparkles size={42} />
                <div className="mt-4 text-xl font-semibold">现场处理建议</div>
                <p className="mt-2 text-sm leading-7">{selected.suggestion}</p>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm">处理说明</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-24 w-full rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm outline-none"
                    placeholder="例如：已联系被访人确认，核验证件后临时放行"
                  />
                </label>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={closeAfterAction}
                    onChange={(event) => setCloseAfterAction(event.target.checked)}
                  />
                  处理后标记为已处理
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  {/* 标准动作字符串直接传给后端记录，保证审计口径统一。 */}
                  {["重新核验", "拒绝通行", "人工核验后放行", "上报保卫处"].map((item) => (
                    <button onClick={() => handleAction(item)} key={item} className="rounded-2xl bg-white/80 px-4 py-2 text-sm shadow-card">{item}</button>
                  ))}
                </div>
                {message && <p className="mt-3 text-sm">{message}</p>}
              </div>
            </div>
          ) : (
            <div className="rounded-card bg-slate-50/70 p-8 text-center text-slate-400">暂无异常事件</div>
          )}
        </Panel>
      )}
      {/* 门岗本人处置时显示当前选中事件的详细动作轨迹；管理员使用下方全量结果表查看全部事件。 */}
      {canHandle && selected?.actions?.length > 0 && (
        <Panel title="门岗处理记录" subtitle="保存处理动作、处理人、处理时间和说明">
          <DataTable
            columns={[
              { title: "时间", key: "createdAt" },
              { title: "处理人", key: "handler" },
              { title: "处理动作", key: "action" },
              { title: "说明", key: "note" }
            ]}
            rows={selected.actions}
          />
        </Panel>
      )}
      {/* 管理员页底部只读展示门岗保安对每个异常事件的处理结果，不在管理员端执行处理动作。 */}
      {canAnalyze && (
        <Panel title="门岗处理结果" subtitle="展示门岗保安对每个异常事件的实际处理动作、处理人、处理时间和说明">
          <DataTable
            columns={[
              { title: "异常编号", key: "id" },
              { title: "时间", key: "time" },
              { title: "人员", key: "person" },
              { title: "校门", key: "gate" },
              { title: "异常类型", key: "type" },
              { title: "风险等级", key: "risk", badge: true },
              { title: "当前状态", key: "status", badge: true },
              { title: "处理结果", key: "action" },
              { title: "处理人", key: "handler" },
              { title: "处理时间", key: "handledAt" },
              { title: "处理说明", key: "note", render: (row) => <span className="block max-w-[320px] truncate">{row.note || "-"}</span> }
            ]}
            rows={guardHandlingRows}
          />
        </Panel>
      )}
    </div>
  );
}

export function IdentityCheckPage() {
  // 现场工作台只加载待处理异常，处置完成后通过 reloadExceptions 移出列表。
  const { data: exceptions, reload: reloadExceptions } = useApiData(() => api.exceptions("?status=待处理"), [], []);
  // gate 是当前值守校门；选择异常时优先同步为事件记录的校门。
  const [gate, setGate] = useState("东门");
  const [selectedExceptionId, setSelectedExceptionId] = useState("");
  const [temporaryForm, setTemporaryForm] = useState({ reason: "" });
  const [message, setMessage] = useState("");
  // processingId 标识正在请求的记录，只禁用相关行和表单按钮。
  const [processingId, setProcessingId] = useState("");

  // 再次排除已处理状态并限制前十条，保持现场工作台简洁。
  const pendingExceptions = exceptions.filter((item) => item.status !== "已处理").slice(0, 10);
  const selectedException = pendingExceptions.find((item) => item.id === selectedExceptionId) || null;

  /** 选中待处置异常，并根据事件原因预填一条可编辑的临时放行说明。 */
  function selectException(item) {
    setSelectedExceptionId(item.id);
    setGate(item.gate || gate);
    setTemporaryForm({
      reason: item.reason ? `现场核验确认无误：${item.reason}` : "现场核验确认无误，临时放行"
    });
    setMessage("");
  }

  /** 直接拒绝通行并闭环异常，处理说明记录原始风险原因。 */
  async function rejectException(item) {
    setProcessingId(item.id);
    try {
      await api.handleException(item.id, {
        action: "拒绝通行",
        note: `门岗现场处置：${item.reason || "风险未解除"}`,
        close: true
      });
      setMessage(`已拒绝通行：${item.person}`);
      // 如果拒绝的是当前选中项，清空右侧临时放行表单。
      if (selectedExceptionId === item.id) {
        setSelectedExceptionId("");
        setTemporaryForm({ reason: "" });
      }
      reloadExceptions();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProcessingId("");
    }
  }

  /**
   * 临时放行需要执行两个持久化动作：先新增正常通行记录，再把原异常以“临时放行”动作闭环。
   */
  async function submitTemporary(event) {
    event.preventDefault();
    // 必须从真实异常列表选中记录，不能脱离事件独立登记。
    if (!selectedException) {
      setMessage("请先在左侧异常现场处置中选择一条记录");
      return;
    }
    if (!temporaryForm.reason.trim()) {
      setMessage("请填写临时放行原因");
      return;
    }

    // 事件自带校门时优先使用，缺失时才采用当前门岗手动选择。
    const releaseGate = selectedException.gate || gate;
    setProcessingId(selectedException.id);
    try {
      await api.createAccessRecord({
        name: selectedException.person || "未知人员",
        type: selectedException.personType || "未知",
        method: "人工核验后放行",
        gate: releaseGate,
        status: "正常"
      });
      // 第二步保存门岗动作及人工说明，并将异常标记为已处理。
      await api.handleException(selectedException.id, {
        action: "临时放行",
        note: temporaryForm.reason.trim(),
        close: true
      });
      setMessage(`已登记临时放行：${selectedException.person}`);
      setSelectedExceptionId("");
      setTemporaryForm({ reason: "" });
      reloadExceptions();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setProcessingId("");
    }
  }

  return (
    <div className="space-y-5">
      {/* 左侧待办列表与右侧临时放行表单在超宽屏并排。 */}
      <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <Panel title="异常现场处置" subtitle="选择待处理异常进行临时放行登记，或现场拒绝通行">
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <Info title="待处置异常" value={pendingExceptions.length} />
            <SelectField label="当前校门" value={gate} options={["东门", "南门", "西门", "北门"]} onChange={setGate} />
          </div>
          {message && <p className="mb-4 rounded-2xl bg-primarySoft px-4 py-3 text-sm text-primary">{message}</p>}
          <DataTable
            columns={[
              { title: "人员", key: "person" },
              { title: "异常", key: "type" },
              { title: "原因", key: "reason", render: (row) => <span className="block max-w-[300px] truncate">{row.reason || "-"}</span> },
              { title: "风险", key: "risk", badge: true },
              {
                title: "操作",
                key: "action",
                render: (row) => (
                  // 每条异常提供“选中后填写放行”和“立即拒绝”两个现场动作。
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={processingId === row.id}
                      onClick={() => selectException(row)}
                      className={`rounded-xl px-3 py-1 text-xs disabled:opacity-60 ${selectedExceptionId === row.id ? "bg-primary text-white" : "bg-primarySoft text-primary"}`}
                    >
                      {selectedExceptionId === row.id ? "已选中" : "选中"}
                    </button>
                    <button
                      disabled={processingId === row.id}
                      onClick={() => rejectException(row)}
                      className="rounded-xl bg-red-50 px-3 py-1 text-xs text-danger disabled:opacity-60"
                    >
                      拒绝
                    </button>
                  </div>
                )
              }
            ]}
            rows={pendingExceptions}
          />
        </Panel>

        <Panel title="临时放行登记" subtitle="先在左侧选中异常记录，再登记临时放行">
          {/* 未选中记录时只显示操作引导，不允许创建脱离异常上下文的放行记录。 */}
          {selectedException ? (
            <form onSubmit={submitTemporary} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info title="人员姓名" value={selectedException.person || "未知人员"} />
                <Info title="人员类型" value={selectedException.personType || "未知"} />
                <Info title="异常类型" value={selectedException.type || "-"} />
                <Info title="放行校门" value={selectedException.gate || gate} />
              </div>
              <Field label="放行原因" required value={temporaryForm.reason} onChange={(value) => setTemporaryForm((current) => ({ ...current, reason: value }))} />
              <button disabled={processingId === selectedException.id} className="h-11 w-full rounded-2xl bg-primary px-5 text-sm text-white shadow-glow disabled:opacity-60">
                {processingId === selectedException.id ? "登记中..." : "登记临时放行"}
              </button>
            </form>
          ) : (
            <div className="rounded-2xl bg-slate-50/70 px-4 py-12 text-center text-sm text-slate-400">
              请先在左侧异常现场处置中选择一条待处理记录
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * 旧版设备核验模拟页。
 * 当前路由不再使用，代码保留用于对照早期“手动选择凭证并模拟扫码”的实现流程。
 */
function LegacyIdentityCheckPage() {
  // 同时加载最近记录和有效二维码，模拟成功/失败后可刷新记录列表。
  const { data: records, reload: reloadRecords } = useApiData(() => api.accessRecords("?limit=10"), [], []);
  const { data: qrCodes } = useApiData(() => api.qrCodes("?status=有效"), [], []);
  const [form, setForm] = useState({ credentialType: "campusCard", credentialValue: "2023210001", gate: "东门" });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // 四种凭证类型对应校园实际设备入口及界面说明。
  const credentialOptions = [
    { value: "campusCard", label: "校园卡/身份号", hint: "学生、教职工刷卡核验" },
    { value: "face", label: "人脸识别", hint: "已上传照片人员刷脸" },
    { value: "plate", label: "车牌识别", hint: "教职工车辆自动抬杆" },
    { value: "qr", label: "动态二维码", hint: "访客或校友二维码扫码" }
  ];
  // 有效二维码转换为下拉选项，并按校友码/访客码给出建议校门。
  const validQrOptions = qrCodes.map((qrCode) => ({
    label: `${qrCode.ownerName || "二维码"} · ${qrCode.type === "alumni" ? "校友码" : "访客码"} · ${displayDateTime(qrCode.validFrom)}-${displayDateTime(qrCode.validTo)}`,
    value: qrCode.token,
    gate: qrCode.type === "alumni" ? "西门" : "东门"
  }));
  // 凭证目录定义每种设备上报值的标签、帮助文本和演示样本。
  const credentialCatalog = {
    campusCard: {
      label: "刷卡识别结果",
      helper: "设备读取到的学号、工号或身份号",
      options: [
        { label: "李明 · 学生卡 · 2023210001", value: "2023210001", gate: "东门" },
        { label: "陈老师 · 教职工卡 · T20260101", value: "T20260101", gate: "南门" }
      ]
    },
    face: {
      label: "人脸匹配人员",
      helper: "人脸设备识别出的人员，不需要在这里上传照片",
      options: [
        { label: "李明 · 已上传人脸照片", value: "2023210001", gate: "东门" },
        { label: "陈老师 · 已上传人脸照片", value: "T20260101", gate: "南门" }
      ]
    },
    plate: {
      label: "识别车牌",
      helper: "车牌识别设备读取到的车牌号",
      options: [
        { label: "皖A·8F526 · 陈老师车辆", value: "皖A·8F526", gate: "南门" }
      ]
    },
    qr: {
      label: "扫码二维码",
      helper: validQrOptions.length ? "扫码设备读取到的有效二维码" : "暂无有效二维码，请先由访客或校友生成二维码",
      options: validQrOptions
    }
  };
  // 当前目录和具体凭证由表单状态派生；failureSamples 用于快速演示异常路径。
  const selectedCatalog = credentialCatalog[form.credentialType] || credentialCatalog.campusCard;
  const selectedCredential = selectedCatalog.options.find((item) => item.value === form.credentialValue);
  const failureSamples = [
    { label: "未知人脸", credentialType: "face", credentialValue: "UNKNOWN", gate: "东门" },
    { label: "未登记车牌", credentialType: "plate", credentialValue: "皖A·00000", gate: "东门" }
  ];

  // 切换到二维码且尚未选值时，在有效码加载后自动选择第一项。
  useEffect(() => {
    if (form.credentialType !== "qr" || form.credentialValue || !validQrOptions.length) return;
    setForm((current) => ({
      ...current,
      credentialValue: validQrOptions[0].value,
      gate: validQrOptions[0].gate
    }));
  }, [form.credentialType, form.credentialValue, qrCodes.length]);

  /** 把当前模拟设备数据发送给后端；后端负责规则校验及记录/异常生成。 */
  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        credentialType: form.credentialType,
        credentialValue: form.credentialValue.trim(),
        gate: form.gate
      };
      const next = await api.simulateScan(payload);
      setResult(next);
      reloadRecords();
      // 请求失败也转换为统一拒绝结果，直接显示在右侧结果卡。
    } catch (error) {
      setResult({ allowed: false, reason: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  /** 使用一个预设失败样本完整替换凭证类型、值和校门。 */
  function useSample(sample) {
    setForm({
      credentialType: sample.credentialType,
      credentialValue: sample.credentialValue,
      gate: sample.gate
    });
    setResult(null);
  }

  /** 切换凭证类型时选中该目录第一项，并清空上一次核验结果。 */
  function changeCredentialType(type) {
    const nextCatalog = credentialCatalog[type] || credentialCatalog.campusCard;
    const firstOption = nextCatalog.options[0];
    setForm((current) => ({
      ...current,
      credentialType: type,
      credentialValue: firstOption?.value || "",
      gate: firstOption?.gate || current.gate
    }));
    setResult(null);
  }

  /** 选择凭证时自动采用样本建议校门，同时清空旧结果。 */
  function changeCredentialValue(value) {
    const option = selectedCatalog.options.find((item) => item.value === value);
    setForm((current) => ({
      ...current,
      credentialValue: value,
      gate: option?.gate || current.gate
    }));
    setResult(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.95fr_1fr]">
      <Panel title="旧核验页面" subtitle="未在系统路由中使用">
        <form onSubmit={submit} className="space-y-5">
          {/* 四种凭证入口以按钮卡片呈现，当前类型使用主色高亮。 */}
          <div className="grid gap-3 md:grid-cols-2">
            {credentialOptions.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => changeCredentialType(item.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  form.credentialType === item.value
                    ? "border-primary bg-primarySoft text-primary"
                    : "border-slate-100 bg-white/80 text-slate-500 hover:border-primary/30"
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs opacity-70">{item.hint}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_.55fr]">
            <SelectField
              label={selectedCatalog.label}
              value={form.credentialValue}
              options={selectedCatalog.options.length ? selectedCatalog.options : [{ label: "暂无可用凭证", value: "" }]}
              onChange={changeCredentialValue}
              helper={selectedCatalog.helper}
              disabled={!selectedCatalog.options.length}
            />
            <SelectField
              label="校门"
              value={form.gate}
              options={["东门", "南门", "西门", "北门"]}
              onChange={(value) => {
                setForm((current) => ({ ...current, gate: value }));
                setResult(null);
              }}
            />
          </div>
          {selectedCredential && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              当前上报：{selectedCredential.label}
            </div>
          )}
          {/* 失败样本用于演示未知人脸和未登记车牌的异常分支。 */}
          <div className="flex flex-wrap gap-2">
            {failureSamples.map((sample) => (
              <button
                type="button"
                key={sample.label}
                onClick={() => useSample(sample)}
                className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 hover:bg-primarySoft hover:text-primary"
              >
                {sample.label}
              </button>
            ))}
          </div>
          <button disabled={submitting || !form.credentialValue} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-white shadow-glow disabled:opacity-60">
            <ScanLine size={18} /> {submitting ? "核验中..." : "开始核验并登记"}
          </button>
        </form>
      </Panel>

      <div className="space-y-6">
        <Panel title="核验结果" subtitle="通过时写入正常出入记录；失败时同步生成异常事件">
          {/* allowed 决定成功/拒绝配色和图标；未核验时显示等待状态。 */}
          {result ? (
            <div className={`rounded-card p-5 ${result.allowed ? "bg-emerald-50 text-success" : "bg-red-50 text-danger"}`}>
              <div className="flex items-center gap-3">
                {result.allowed ? <ShieldCheck size={34} /> : <ShieldAlert size={34} />}
                <div>
                  <div className="text-lg font-semibold">{result.allowed ? "允许通行" : "拒绝通行"}</div>
                  <div className="mt-1 text-sm opacity-80">{result.reason || "身份、校门、规则与状态均校验通过"}</div>
                </div>
              </div>
              {/* 后端返回 record 时补充展示最终落库的人员、编号、方式和校门。 */}
              {result.record && (
                <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                  <Info title="人员" value={result.record.name} />
                  <Info title="人员编号" value={result.record.personCode || "-"} />
                  <Info title="方式" value={result.record.method} />
                  <Info title="校门" value={result.record.gate} />
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-card bg-slate-50/70 p-8 text-center text-slate-400">等待设备识别数据</div>
          )}
        </Panel>
        <Panel title="最近核验记录">
          <DataTable
            columns={[
              { title: "时间", key: "time" },
              { title: "姓名", key: "name" },
              { title: "学号/工号/编号", key: "personCode" },
              { title: "类型", key: "type" },
              { title: "方式", key: "method" },
              { title: "状态", key: "status", badge: true }
            ]}
            rows={records}
          />
        </Panel>
      </div>
    </div>
  );
}

// 智能体侧栏和欢迎消息共用的示例问题，覆盖统计、筛选、归因、单事件分析和处置建议。
const exceptionAgentExamples = [
  "近期哪个门出现的异常事件最多？",
  "本月待处理异常有哪些？",
  "高风险异常有哪些？",
  "异常原因主要集中在哪些类型？",
  "分析当前选中的异常事件",
  "这些异常应该优先怎么处置？"
];

/** 生成前端会话消息 id；时间戳保证时间顺序，随机尾数降低同毫秒碰撞概率。 */
function agentMessageId(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** 按 CSV 规范转义单元格：数组先用顿号连接，双引号通过重复写入转义，整体再包裹引号。 */
function csvValue(value) {
  const text = Array.isArray(value) ? value.join("、") : String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * 把智能体返回的 columns/rows 导出为 UTF-8 CSV。
 * 文件开头写入 BOM 以改善 Excel 对中文编码的识别，下载后及时释放临时 Object URL。
 */
function downloadAgentCsv(result) {
  const columns = result?.columns || [];
  const rows = result?.rows || [];
  // 没有列定义时无法建立稳定表头，因此不执行导出。
  if (!columns.length) return;

  // 第一行来自中文列标题，后续每行按相同列顺序读取 row[column.key]。
  const lines = [
    columns.map((column) => csvValue(column.title)).join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column.key])).join(","))
  ];
  // 临时 a 标签触发浏览器下载，无需离开当前页面。
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.exportFileName || "异常分析智能体结果.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/** 渲染一条智能体回复，按响应内容可选展示答案、时间范围、表格、导出、追问建议和模型信息。 */
function AgentReply({ message, onSuggestionClick }) {
  const hasTable = Array.isArray(message.columns) && message.columns.length > 0;
  const rows = Array.isArray(message.rows) ? message.rows : [];

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-line text-sm leading-7">{message.answer || message.content}</p>
      {/* range 存在时明确告诉用户本次分析实际使用的时间边界。 */}
      {message.range && (
        <div className="grid gap-3 text-xs text-slate-500 md:grid-cols-3">
          <Info title="时间范围" value={message.range.label} />
          <Info title="开始时间" value={message.range.start} />
          <Info title="结束时间" value={message.range.end} />
        </div>
      )}
      {/* columns 非空表示智能体同时返回了结构化表格结果。 */}
      {hasTable && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">共 {rows.length} 条数据库结果</div>
            {/* 没有结果行时禁用导出，避免生成只有表头的误导文件。 */}
            <button
              type="button"
              disabled={!rows.length}
              onClick={() => downloadAgentCsv(message)}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={14} />
              导出 CSV
            </button>
          </div>
          <DataTable columns={message.columns} rows={rows} pageSize={6} />
        </div>
      )}
      {/* 建议问题可点击并直接作为下一轮用户输入提交。 */}
      {message.suggestions?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.suggestions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onSuggestionClick?.(item)}
              className="rounded-2xl bg-white/80 px-3 py-1 text-left text-xs text-slate-500 shadow-card transition hover:text-primary"
            >
              {item}
            </button>
          ))}
        </div>
      )}
      {/* 底部披露本地模型、数据源以及可选外接大模型的实际使用/错误情况。 */}
      {message.model && (
        <div className="text-xs text-slate-400">
          {message.model.name} · {message.model.mode} · 数据源：{message.dataSource || "数据库"}
          {message.llm?.used ? ` · 外接模型：${message.llm.provider}/${message.llm.model}` : ""}
          {message.llm?.error ? ` · ${message.llm.error}` : ""}
        </div>
      )}
    </div>
  );
}

/**
 * 异常分析对话组件。
 * compact 模式隐藏右侧能力说明，selectedExceptionId 作为上下文传给后端以支持“当前异常”类问题。
 */
function ExceptionAgentChat({
  title = "异常分析对话智能体",
  subtitle = "只分析异常事件，回答、表格和导出结果均来自实时异常事件数据",
  compact = false,
  selectedExceptionId = ""
}) {
  // 首条欢迎消息说明能力范围和数据真实性边界，并提供示例问题。
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      answer: "我是异常事件分析智能体。你可以问我异常高发校门、待处理异常、高风险异常、异常原因分布和处置建议；我只根据数据库里的异常事件回答，不编造数据。",
      suggestions: exceptionAgentExamples
    }
  ]);
  // question 是当前未发送输入；submitting 阻止并发提问和重复提交。
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** 统一处理手动问题、示例问题和回复建议的发送流程。 */
  async function askAgent(text) {
    const content = String(text || "").trim();
    // 空问题或已有请求处理中时忽略操作。
    if (!content || submitting) return;

    // 先把用户消息追加到对话，立即提供界面反馈，然后清空输入框。
    const userMessage = { id: agentMessageId("user"), role: "user", content };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setSubmitting(true);

    try {
      const reply = await api.exceptionChat({
        question: content,
        // 当前选中异常作为显式上下文；历史只发送最近八条，控制请求大小。
        context: { selectedExceptionId },
        history: messages.slice(-8).map((item) => ({
          role: item.role,
          content: item.content || item.answer || ""
        }))
      });
      // 后端没有提供 id 时由前端补齐，确保 React 列表 key 稳定。
      setMessages((current) => [...current, { ...reply, id: reply.id || agentMessageId("agent"), role: "assistant" }]);
    } catch (error) {
      // 网络/服务异常也作为助手消息进入对话，用户无需在其他区域寻找错误。
      setMessages((current) => [
        ...current,
        { id: agentMessageId("error"), role: "assistant", answer: error.message || "异常分析智能体暂时无法回答，请稍后重试。" }
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  /** 阻止表单刷新并发送当前输入。 */
  function submitQuestion(event) {
    event.preventDefault();
    askAgent(question);
  }

  return (
    <Panel title={title} subtitle={subtitle}>
      <div className={compact ? "grid gap-5" : "grid gap-5 xl:grid-cols-[1fr_300px]"}>
        <div className="space-y-4">
          {/* 对话记录区限制最大高度并内部滚动；用户消息靠右、助手消息靠左。 */}
          <div className={`${compact ? "max-h-[520px]" : "max-h-[560px]"} space-y-4 overflow-y-auto rounded-[24px] border border-slate-100 bg-slate-50/60 p-4`}>
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={[
                  "max-w-[920px] rounded-[22px] px-4 py-3 shadow-card",
                  message.role === "user" ? "bg-primary text-white" : "bg-white/90 text-slate-600"
                ].join(" ")}>
                  {message.role === "user" ? (
                    <p className="text-sm leading-7">{message.content}</p>
                  ) : (
                    <AgentReply message={message} onSuggestionClick={askAgent} />
                  )}
                </div>
              </div>
            ))}
            {/* 请求期间追加临时分析状态，不写入 messages 历史。 */}
            {submitting && (
              <div className="flex justify-start">
                <div className="rounded-[22px] bg-white/90 px-4 py-3 text-sm text-slate-400 shadow-card">正在分析异常事件...</div>
              </div>
            )}
          </div>

          {/* 输入区在移动端上下排列，桌面端文本框与发送按钮横排。 */}
          <form onSubmit={submitQuestion} className="flex flex-col gap-3 md:flex-row">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="输入问题，例如：近期哪个门出现的异常事件最多？"
              className="min-h-24 flex-1 rounded-[22px] border border-slate-100 bg-white/85 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
            />
            <button
              disabled={submitting || !question.trim()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
            >
              <Send size={16} />
              发送
            </button>
          </form>
        </div>

        {/* 非紧凑模式额外展示智能体能力边界和完整示例问题列表。 */}
        <div className={compact ? "hidden" : "space-y-4"}>
          <div className="rounded-[24px] bg-primarySoft p-5 text-primary">
            <Sparkles size={28} />
            <div className="mt-3 text-base font-semibold">异常分析对话智能体</div>
            <p className="mt-2 text-sm leading-7">专注异常事件分析，实时聚合 MySQL 异常事件表。不能确认的问题会说明能力边界，不使用编造数据。</p>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">示例问题</div>
            {exceptionAgentExamples.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => askAgent(item)}
                className="block w-full rounded-2xl bg-white/80 px-4 py-3 text-left text-sm text-slate-500 shadow-card transition hover:text-primary"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** 设备页面：管理员可增删改设备，门岗只读监控；所有角色每十五秒自动刷新状态。 */
export function DevicesPage({ session }) {
  const { data, reload } = useApiData(() => api.devices(), [], []);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(deviceFormDefaults());
  const [filters, setFilters] = useState({ keyword: "", type: "", gate: "", status: "" });
  const [editingDeviceId, setEditingDeviceId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // canManage 是唯一编辑权限开关，决定表单和操作列是否存在。
  const canManage = session?.user?.role === "admin";
  // 类型、校门、状态精确匹配，关键词跨编号/名称/类型/校门/状态模糊匹配。
  const filteredDevices = data.filter((item) => {
    const keyword = filters.keyword.trim();
    if (filters.type && item.type !== filters.type) return false;
    if (filters.gate && item.gate !== filters.gate) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (keyword) {
      const values = [item.id, item.name, item.type, item.gate, item.status];
      if (!values.some((value) => String(value || "").includes(keyword))) return false;
    }
    return true;
  });

  // 周期刷新设备运行状态，离开页面时清理定时器。
  useEffect(() => {
    const timer = window.setInterval(reload, 15000);
    return () => window.clearInterval(timer);
  }, [reload]);

  /** 管理员新增或编辑设备，提交前检查三项核心档案字段。 */
  async function submitDevice(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.type.trim() || !form.gate.trim()) {
      setMessage("请填写设备名称、设备类型和所属校门");
      return;
    }
    setSubmitting(true);
    try {
      // editingDeviceId 区分更新和新增接口。
      if (editingDeviceId) {
        await api.updateDevice(editingDeviceId, form);
        setMessage(`${form.name} 已更新`);
      } else {
        await api.createDevice(form);
        setMessage(`${form.name} 已新增`);
      }
      resetDeviceForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 把设备行回填编辑表单。 */
  function editDevice(row) {
    setEditingDeviceId(row.id);
    setForm({
      name: row.name || "",
      type: row.type || "闸机",
      gate: row.gate || "东门",
      status: row.status || "在线"
    });
  }

  /** 二次确认后删除设备，并在必要时退出当前编辑状态。 */
  async function deleteDevice(row) {
    if (!window.confirm(`确认删除设备 ${row.name} 吗？`)) return;
    try {
      await api.deleteDevice(row.id);
      setMessage(`${row.name} 已删除`);
      if (editingDeviceId === row.id) resetDeviceForm();
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 回到新增模式并创建全新的设备默认表单。 */
  function resetDeviceForm() {
    setEditingDeviceId("");
    setForm(deviceFormDefaults());
  }

  // 四个基础列对所有角色可见。
  const columns = [
    { title: "设备名称", key: "name" },
    { title: "设备类型", key: "type" },
    { title: "所属校门", key: "gate" },
    { title: "设备状态", key: "status", badge: true }
  ];

  // 只有管理员动态追加操作列，门岗无法从 DOM 中看到编辑/删除按钮。
  if (canManage) {
    columns.push({
      title: "操作",
      key: "action",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => editDevice(row)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">编辑</button>
          <button onClick={() => deleteDevice(row)} className="rounded-xl bg-red-50 px-3 py-1 text-xs text-danger">删除</button>
        </div>
      )
    });
  }

  return (
    <div className="space-y-6">
      {/* 管理员设备档案表单；门岗界面完全不渲染。 */}
      {canManage && (
        <Panel title={editingDeviceId ? "编辑设备档案" : "新增设备档案"} subtitle="维护设备名称、类型、所属校门和运行状态">
          <form onSubmit={submitDevice} className="grid gap-4 md:grid-cols-4">
            <Field label="设备名称" required value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <SelectField label="设备类型" value={form.type} options={["闸机", "校园卡读卡器", "人脸识别", "车牌识别", "二维码扫码"]} onChange={(value) => setForm((current) => ({ ...current, type: value }))} />
            <SelectField label="所属校门" value={form.gate} options={["东门", "南门", "西门", "北门"]} onChange={(value) => setForm((current) => ({ ...current, gate: value }))} />
            <SelectField label="设备状态" value={form.status} options={["在线", "离线", "故障", "维护中"]} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
            <FormActions
              className="md:col-span-4"
              submitText={editingDeviceId ? "保存设备" : "新增设备"}
              submitting={submitting}
              onReset={resetDeviceForm}
            />
          </form>
          <FormNotice message={message} className="mt-4" />
        </Panel>
      )}
      {/* 设备监控列表带四种组合筛选，数据源由轮询保持更新。 */}
      <Panel title="设备状态监控" subtitle="页面每 15 秒刷新一次设备运行状态">
        {!canManage && message && <div className="mb-4 rounded-2xl bg-primarySoft px-4 py-3 text-sm text-primary">{message}</div>}
        <div className="mb-4 grid gap-3 xl:grid-cols-[1.2fr_.65fr_.55fr_.55fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">查找设备</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 pl-10 pr-4 text-sm outline-none"
                placeholder="设备名称、编号、校门"
              />
            </span>
          </label>
          <SelectField
            label="设备类型"
            value={filters.type}
            options={[{ label: "全部类型", value: "" }, "闸机", "校园卡读卡器", "人脸识别", "车牌识别", "二维码扫码"]}
            onChange={(value) => setFilters((current) => ({ ...current, type: value }))}
          />
          <SelectField
            label="校门"
            value={filters.gate}
            options={[{ label: "全部校门", value: "" }, ...gateNameOptions]}
            onChange={(value) => setFilters((current) => ({ ...current, gate: value }))}
          />
          <SelectField
            label="状态"
            value={filters.status}
            options={[{ label: "全部状态", value: "" }, "在线", "离线", "故障", "维护中"]}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          />
          <button
            type="button"
            onClick={() => setFilters({ keyword: "", type: "", gate: "", status: "" })}
            className="mt-7 h-11 rounded-2xl bg-slate-50 px-4 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary"
          >
            清空筛选
          </button>
        </div>
        <DataTable columns={columns} rows={filteredDevices} />
      </Panel>
    </div>
  );
}

/** 访客/校友动态二维码页面：依据角色、预约状态和有效时间窗口自动签发并控制展示。 */
export function QRPage({ session, type }) {
  // 显式 type 优先，否则校友角色使用 alumni，其余默认 visitor。
  const role = session.user.role;
  const qrType = type || (role === "alumni" ? "alumni" : "visitor");
  const { data, reload, loading } = useApiData(() => api.roleDashboard(role, session.user.id), { qrCode: null, profile: session.profile, appointments: [] }, [role, session.user.id]);
  const [message, setMessage] = useState("");
  const [autoIssueAttempted, setAutoIssueAttempted] = useState(false);
  // now 每十五秒更新，用来重新判断访客二维码是否进入或离开可见时间窗。
  const [now, setNow] = useState(() => Date.now());
  const qrCode = data.qrCode;
  // 访客只从已通过预约中选择当前尚未结束的一条；没有时回退第一条已通过预约。
  const approvedAppointments = data.appointments?.filter((item) => item.status === "已通过") || [];
  const approvedAppointment = qrType === "visitor"
    ? approvedAppointments.find((item) => {
      const end = itemDateTime(item.visitEnd || item.visitStart);
      return !end || end >= now;
    }) || approvedAppointments[0]
    : null;
  // 校友码始终按后端状态展示；访客码额外受预约开始/结束时间控制。
  const qrWindow = qrType === "visitor" ? qrWindowState(qrCode, now) : "active";
  const visibleQrCode = qrWindow === "active" ? qrCode : null;
  const hasUsableQr = Boolean(visibleQrCode && visibleQrCode.status === "有效");
  // 访客自动签发还要求二维码确实绑定到当前选中的已通过预约。
  const hasQrForAppointment = qrType === "visitor"
    ? Boolean(qrCode && approvedAppointment && qrCode.appointmentId === approvedAppointment.id && qrCode.status === "有效")
    : hasUsableQr;
  const canIssueQr = qrType !== "visitor" || Boolean(approvedAppointment);
  // windowStatus 把时间窗口状态转换为用户可理解的提示，活动窗口内使用后端原状态。
  const windowStatus = qrWindow === "notStarted" ? "未到来访时间" : qrWindow === "expired" ? "已过离校时间" : qrCode?.status;

  /** 手动或自动签发二维码；访客必须存在已通过预约，校友无需预约。 */
  async function issueQrCode({ automatic = false } = {}) {
    try {
      if (qrType === "visitor" && !approvedAppointment) {
        setMessage("没有已通过的预约，暂不能生成访客二维码");
        return;
      }

      // owner/appointment 绑定信息全部提交给后端，由后端决定有效期和令牌。
      await api.createQrCode({
        type: qrType,
        ownerName: data.profile?.name || session.profile.name,
        ownerId: data.profile?.personId || session.user.personId,
        appointmentId: approvedAppointment?.id
      });
      setMessage(automatic ? "二维码已自动生成" : "二维码已生成");
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  // 初次加载完成后，如满足签发条件且当前预约没有有效码，只自动尝试一次。
  useEffect(() => {
    if (loading || hasQrForAppointment || !canIssueQr || autoIssueAttempted) return;
    setAutoIssueAttempted(true);
    issueQrCode({ automatic: true });
  }, [loading, hasQrForAppointment, canIssueQr, autoIssueAttempted, approvedAppointment?.id, qrType]);

  // 每十五秒同时更新时间和服务端状态；卸载时停止轮询。
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      reload();
    }, 15000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1fr]">
      <Panel title={qrType === "alumni" ? "校友二维码" : "访客二维码"} subtitle="动态二维码具有有效期和状态校验">
        <QRCodeMock
          // 时间窗外传空 token，确保组件不渲染仍可扫描的图形。
          value={visibleQrCode?.token || ""}
          title={qrType === "alumni" ? "校友动态二维码" : "访客二维码"}
          subtitle={qrCode ? qrTimeText(qrCode, qrType) : "审核通过或申请后生成"}
          status={windowStatus || "未生成"}
        />
        <div className="mt-4 text-center">
          {/* 根据无法展示的具体原因提供不同提示：未审核、未开始或已结束。 */}
          {!hasUsableQr && !canIssueQr && <p className="text-sm text-slate-400">审核通过后系统自动生成二维码</p>}
          {qrType === "visitor" && qrCode && qrWindow === "notStarted" && <p className="text-sm text-slate-400">未到来访时间，二维码暂不显示</p>}
          {qrType === "visitor" && qrCode && qrWindow === "expired" && <p className="text-sm text-slate-400">已超过预计离校时间，二维码不再显示</p>}
          {message && <p className="mt-3 text-sm text-slate-400">{message}</p>}
        </div>
      </Panel>
      <Panel title="二维码规则">
        <div className="space-y-4">
          <Info title="绑定信息" value={qrType === "alumni" ? "校友编号、有效日期、允许时间段" : "访客编号、预约编号、被访人、有效时间"} />
          {qrType === "visitor" && <Info title="显示窗口" value="仅在来访时间至预计离校时间内显示二维码" />}
          <Info title="状态控制" value="有效、已过期、已失效" />
          <Info title="异常识别" value="过期、预约不匹配、疑似冒用、黑名单命中" />
        </div>
      </Panel>
    </div>
  );
}

/** 统计报表页：加载汇总数据，展示指标/图表，并支持导出完整分类 CSV。 */
export function ReportsPage() {
  // fallback 与后端报表结构一致，接口加载期间图表和 Object.entries 均可安全运行。
  const fallback = {
    access: { total: 0, byStatus: {}, byType: {}, byGate: {} },
    appointments: { total: 0, byStatus: {} },
    exceptions: { total: 0, byRisk: {}, byStatus: {} },
    devices: { total: 0, byStatus: {} },
    accessTrend: [],
    riskData: []
  };
  const { data } = useApiData(() => api.reportSummary(), fallback, []);
  // 四张摘要卡分别对应通行、预约、异常和设备业务域。
  const cards = [
    { title: "日出入统计", value: data.access.total, desc: formatObject(data.access.byStatus) },
    { title: "访客预约统计", value: data.appointments.total, desc: formatObject(data.appointments.byStatus) },
    { title: "异常风险统计", value: data.exceptions.total, desc: formatObject(data.exceptions.byRisk) },
    { title: "设备状态统计", value: data.devices.total, desc: formatObject(data.devices.byStatus) }
  ];

  /** 将各类分组统计展开为三列 CSV 并触发浏览器下载。 */
  function exportReport() {
    // 每个 objectRows 调用把一个“分类 -> 数量”对象展开为多行。
    const rows = [
      ["报表项", "分类", "数量"],
      ...objectRows("出入状态", data.access.byStatus),
      ...objectRows("人员类型", data.access.byType),
      ...objectRows("校门流量", data.access.byGate),
      ...objectRows("预约状态", data.appointments.byStatus),
      ...objectRows("异常风险", data.exceptions.byRisk),
      ...objectRows("设备状态", data.devices.byStatus)
    ];
    // BOM 确保常见表格软件按 UTF-8 打开中文内容。
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "campus-access-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Panel
        title="查询统计与报表"
        subtitle="生成出入统计、访客统计、校友入校统计和异常风险分析报表"
        action={<button onClick={exportReport} className="rounded-2xl bg-primary px-4 py-2 text-sm text-white shadow-glow">导出报表</button>}
      >
        {/* 后端汇总结构映射为统一 StatCard，空分类显示兜底说明。 */}
        <div className="grid gap-4 md:grid-cols-4">
          {cards.map((item) => <StatCard key={item.title} title={item.title} value={item.value} desc={item.desc || "暂无细分数据"} type="primary" />)}
        </div>
      </Panel>
      {/* 折线图展示时间维度，环形图展示风险等级占比。 */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.8fr]">
        <Panel title="出入趋势" subtitle="本周通行量与异常量">
          <AccessTrendChart data={data.accessTrend} />
        </Panel>
        <Panel title="异常风险分布" subtitle="按低/中/高风险统计">
          <RiskDonutChart data={data.riskData} />
        </Panel>
      </div>
      {/* 两组横向进度条分别比较校门和人员类型分布。 */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="校门流量统计" subtitle="按校门汇总通行记录">
          <SummaryBars data={data.access.byGate} />
        </Panel>
        <Panel title="人员类型统计" subtitle="按学生、教职工、访客、校友等分类">
          <SummaryBars data={data.access.byType} />
        </Panel>
      </div>
    </div>
  );
}

/** 独立账号管理页：创建账号、启停账号并按人员身份证尾号重置密码。 */
export function UserManagementPage() {
  // 用户和人员分表加载；重置密码时通过 personId 关联人员身份证。
  const { data, reload } = useApiData(() => api.users(), [], []);
  const { data: people } = useApiData(() => api.people(), [], []);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ username: "", accountType: "账号", role: "student", personId: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  /** 校验账号/密码必填并创建新登录用户。 */
  async function createUser(event) {
    event.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setMessage("请填写账号和初始密码");
      return;
    }
    setSubmitting(true);
    try {
      await api.createUser(form);
      setMessage(`${form.username} 已创建`);
      setForm({ username: "", accountType: "账号", role: "student", personId: "", password: "" });
      reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 在启用和停用之间切换账号状态。 */
  async function toggleStatus(row) {
    const status = row.status === "启用" ? "停用" : "启用";
    await api.updateUser(row.id, { status });
    setMessage(`${row.username} 已${status}`);
    reload();
  }

  /** 默认重置为关联身份证后六位；无身份证时使用系统兜底密码。 */
  async function resetPassword(row) {
    const person = people.find((item) => item.id === row.personId);
    const password = person?.idNumber?.slice(-6) || "123456";
    await api.updateUser(row.id, { password });
    setMessage(`${row.username} 密码已重置`);
    reload();
  }

  return (
    <div className="space-y-6">
      <Panel title="新增账号" subtitle="账号创建后按角色分配对应菜单和页面权限">
        {/* 创建账号表单显式选择账号类型、系统角色和可选人员关联。 */}
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-5">
          <Field label="账号" required value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} />
          <SelectField label="账号类型" value={form.accountType} options={["账号", "学号", "工号", "手机号", "校友编号"]} onChange={(value) => setForm((current) => ({ ...current, accountType: value }))} />
          <SelectField label="角色" value={form.role} options={roleOptions()} onChange={(value) => setForm((current) => ({ ...current, role: value }))} />
          <Field label="人员ID" value={form.personId} onChange={(value) => setForm((current) => ({ ...current, personId: value }))} />
          <Field label="初始密码" required type="password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} />
          <FormActions
            className="md:col-span-5"
            submitText="新增用户"
            submitting={submitting}
            onReset={() => setForm({ username: "", accountType: "账号", role: "student", personId: "", password: "" })}
          />
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>
      {/* 账号表只展示密码以外的管理字段，敏感哈希不会进入页面。 */}
      <Panel title="账号权限列表" subtitle="管理账号状态、重置密码和角色归属">
        <DataTable
          columns={[
            { title: "账号", key: "username" },
            { title: "账号类型", key: "accountType" },
            { title: "角色", key: "role", render: (row) => roleName(row.role) },
            { title: "人员编号", key: "personId" },
            { title: "状态", key: "status", badge: true },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => toggleStatus(row)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">{row.status === "启用" ? "停用" : "启用"}</button>
                <button onClick={() => resetPassword(row)} className="rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-600">重置密码</button>
              </div>
            ) }
          ]}
          rows={data}
        />
      </Panel>
    </div>
  );
}

/**
 * 人员档案管理页。
 * 在一个事务式界面中联合维护 people 人员档案与 users 登录账号，并按人员类型动态显示不同字段。
 */
export function PeopleManagementPage() {
  // 人员与账号分别来自两张表；保存和删除后需要同时刷新两个数据源。
  const { data, reload } = useApiData(() => api.people(), [], []);
  const { data: users, reload: reloadUsers } = useApiData(() => api.users(), [], []);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(personFormDefaults());
  const [editingId, setEditingId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // activeType 是快捷分类标签；filters 提供关键词、人员状态和账号类型的组合筛选。
  const [activeType, setActiveType] = useState("全部");
  const [filters, setFilters] = useState({ keyword: "", status: "", accountType: "" });
  const typeOptions = personTypeOptions();
  const personTypes = ["全部", ...typeOptions];
  // 当前类型配置决定角色、账号类型、编号标签以及需要额外渲染的业务字段。
  const currentTypeConfig = personTypeConfig(form.type);
  // 访客的被访人只能从学生、教职工和管理员中选择，且编辑时排除自己。
  const hostCandidates = data.filter((person) => visitorHostRoles.has(person.role) && person.id !== editingId);
  const isValidVisitorHost = (value) => {
    const text = String(value || "").trim();
    return hostCandidates.some((person) => [person.name, person.code, person.id].includes(text));
  };
  // 列表先按人员类型缩小范围，再关联登录账号，最后执行状态/账号类型/关键词过滤。
  const filteredPeople = (activeType === "全部" ? data : data.filter((item) => item.type === activeType))
    .map((person) => {
      // personId 是人员表与账号表之间的关联键。
      const user = users.find((item) => item.personId === person.id);
      return {
        ...person,
        account: user?.username || "",
        accountType: user?.accountType || accountTypeByRole(person.role),
        userId: user?.id || ""
      };
    })
    .filter((person) => {
      const keyword = filters.keyword.trim();
      if (filters.status && person.status !== filters.status) return false;
      if (filters.accountType && person.accountType !== filters.accountType) return false;
      if (keyword) {
        // 关键词覆盖身份、联系方式、组织归属、门岗和登录账号等常用查找字段。
        const values = [
          person.name,
          person.code,
          person.type,
          person.idNumber,
          person.phone,
          person.college,
          person.department,
          person.company,
          person.gate,
          person.account
        ];
        if (!values.some((value) => String(value || "").includes(keyword))) return false;
      }
      return true;
    });

  /** 更新任意一个人员表单字段，同时保留其他字段。 */
  function updatePersonField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /** 切换人员类型时同步调整角色/账号类型，并移除新类型不允许保留的旧字段。 */
  function updatePersonType(type) {
    const config = personTypeConfig(type);
    setForm((current) => normalizePersonFieldsForType(type, {
      ...current,
      type,
      role: config.role,
      accountType: config.accountType
    }));
  }

  /** 按类型字段定义渲染下拉框或输入框，并应用字段自己的规范化函数。 */
  function renderTypedField(field) {
    const value = form[field.key] || "";
    // select 类型使用预定义选项；普通字段可携带帮助、长度、键盘模式和正则约束。
    if (field.kind === "select") {
      return (
        <SelectField
          key={field.key}
          label={field.label}
          required={field.required}
          value={value}
          options={field.options}
          onChange={(nextValue) => updatePersonField(field.key, nextValue)}
        />
      );
    }

    return (
      <Field
        key={field.key}
        label={field.label}
        required={field.required}
        value={value}
        helper={field.helper}
        inputMode={field.inputMode}
        maxLength={field.maxLength}
        pattern={field.pattern}
        onChange={(nextValue) => updatePersonField(field.key, field.normalize ? field.normalize(nextValue) : nextValue)}
      />
    );
  }

  /**
   * 新增或更新人员及其登录账号。
   * 依次执行类型规范化、必填校验、格式校验、访客被访人校验和账号校验，然后分别写入两张表。
   */
  async function createPerson(event) {
    event.preventDefault();
    // 根据当前人员类型只保留允许字段，并收集该类型缺失的必填扩展字段。
    const normalizedForm = normalizePersonFieldsForType(form.type, form);
    const typeConfig = personTypeConfig(normalizedForm.type);
    const missingTypeFields = typeConfig.fields
      .filter((field) => field.required && !String(normalizedForm[field.key] || "").trim())
      .map((field) => field.label);
    if (typeConfig.phoneRequired && !normalizedForm.phone.trim()) missingTypeFields.unshift("电话");

    // 基础姓名/编号和类型必填字段先校验，再执行详细格式验证。
    if (!normalizedForm.name.trim() || !normalizedForm.code.trim()) {
      setMessage("请填写姓名和编号");
      return;
    }
    if (missingTypeFields.length) {
      setMessage(`请填写${missingTypeFields.join("、")}`);
      return;
    }
    const validationMessage = validatePersonFormFields(normalizedForm, typeConfig);
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }
    // 访客 host 必须命中系统候选人员，不能只填写任意文本。
    if (normalizedForm.type === "访客" && !isValidVisitorHost(normalizedForm.host)) {
      setMessage("访客被访人必须填写系统中的学生、教职工或保卫处管理员");
      return;
    }
    // 编辑时查找已有账号；已有账号密码可留空，新人员或无账号人员必须给初始密码。
    const existingUser = editingId ? users.find((item) => item.personId === editingId) : null;
    const accountUsername = normalizedForm.username.trim();
    const password = normalizedForm.password.trim();
    if (!accountUsername) {
      setMessage("请填写登录账号");
      return;
    }
    if (!isValidAccountValue(accountUsername, normalizedForm.accountType)) {
      setMessage(accountHint(normalizedForm.accountType));
      return;
    }
    if (!existingUser && !password) {
      setMessage(editingId ? "该人员暂无账号，请填写初始密码创建账号" : "请填写初始密码");
      return;
    }

    // payload 只包含人员表字段，不把账号和明文密码混入人员接口。
    const payload = {
      name: normalizedForm.name.trim(),
      type: normalizedForm.type,
      role: typeConfig.role,
      code: normalizedForm.code.trim(),
      idNumber: normalizedForm.idNumber.trim(),
      phone: normalizedForm.phone,
      college: normalizedForm.college.trim(),
      className: normalizedForm.className.trim(),
      department: normalizedForm.department.trim(),
      position: normalizedForm.position.trim(),
      host: normalizedForm.host.trim(),
      company: normalizedForm.company.trim(),
      graduationYear: normalizedForm.graduationYear.trim(),
      major: normalizedForm.major.trim(),
      gate: normalizedForm.gate.trim(),
      status: normalizedForm.status
    };

    setSubmitting(true);
    try {
      let person;
      if (editingId) {
        // 编辑人员后，根据是否已有账号分别更新账号或补建账号。
        person = await api.updatePerson(editingId, payload);
        if (existingUser) {
          const userPayload = {
            username: accountUsername,
            accountType: normalizedForm.accountType || typeConfig.accountType,
            role: typeConfig.role,
            personId: editingId
          };
          // 密码为空时不把 password 放入更新对象，从而保留原密码哈希。
          if (password) userPayload.password = password;
          await api.updateUser(existingUser.id, userPayload);
        } else {
          await api.createUser({
            username: accountUsername,
            accountType: normalizedForm.accountType || typeConfig.accountType,
            role: typeConfig.role,
            personId: editingId,
            password,
            status: "启用"
          });
        }
        setMessage(`${person.name} 已更新`);
      } else {
        // 新增路径先创建人员取得 person.id，再创建引用该 id 的登录账号。
        person = await api.createPerson(payload);
        await api.createUser({
          username: accountUsername,
          accountType: normalizedForm.accountType || typeConfig.accountType,
          role: typeConfig.role,
          personId: person.id,
          password,
          status: "启用"
        });
        setMessage(`${normalizedForm.name} 已新增`);
      }
      // 两部分均成功后恢复默认表单并刷新人员/账号列表。
      resetPersonForm();
      reload();
      reloadUsers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 从列表进入编辑模式，并把人员数据与关联账号合并回填表单。 */
  function startEdit(row) {
    const user = users.find((item) => item.personId === row.id);
    // 数据中的类型未知时根据角色推断，再通过配置补齐账号类型等默认值。
    const type = personTypeDefinitions[row.type] ? row.type : personTypeByRole(row.role);
    const config = personTypeConfig(type);
    setEditingId(row.id);
    setForm(normalizePersonFieldsForType(type, {
      ...personFormDefaults(type),
      ...row,
      type,
      role: config.role,
      phone: row.phone || "",
      username: user?.username || "",
      accountType: user?.accountType || config.accountType,
      // 编辑时密码始终留空，避免任何密码表示进入前端。
      password: ""
    }));
    setMessage(`正在编辑 ${row.name}`);
  }

  /** 在正常/停用之间切换人员状态，不直接改动关联账号状态。 */
  async function toggleStatus(row) {
    const status = row.status === "正常" ? "停用" : "正常";
    try {
      await api.updatePerson(row.id, { status });
      setMessage(`${row.name} 状态已更新为 ${status}`);
      reload();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 二次确认后删除人员档案及后端负责的关联账号。 */
  async function deletePerson(row) {
    if (!window.confirm(`确认删除 ${row.name} 的人员档案及关联账号吗？`)) return;
    try {
      await api.deletePerson(row.id);
      setMessage(`${row.name} 已删除`);
      if (editingId === row.id) resetPersonForm();
      reload();
      reloadUsers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  /** 退出编辑模式并按默认学生类型重建空表单。 */
  function resetPersonForm() {
    setEditingId("");
    setForm(personFormDefaults());
  }

  return (
    <div className="space-y-6">
      {/* 上半区把通用身份字段、类型专属字段和账号字段放在同一表单内。 */}
      <Panel title={editingId ? "编辑人员档案" : "新增人员档案"} subtitle="人员档案和登录账号在同一处维护，避免重复模块">
        <form onSubmit={createPerson} className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Field
            label="姓名"
            required
            value={form.name}
            helper="2-30 位中文或英文字母"
            maxLength={30}
            onChange={(value) => setForm((current) => ({ ...current, name: normalizeLimitedText(value, 30) }))}
          />
          <SelectField label="类型" required value={form.type} options={typeOptions} onChange={updatePersonType} />
          <Field
            label={currentTypeConfig.codeLabel}
            required
            value={form.code}
            helper={personCodeHint(form.type)}
            maxLength={form.type === "访客" ? 24 : 20}
            onChange={(value) => setForm((current) => ({ ...current, code: normalizeCodeInput(value, current.type) }))}
          />
          <Field
            label="身份证号"
            required
            value={form.idNumber}
            helper="18 位身份证号，末位可为 X"
            inputMode="text"
            maxLength={18}
            pattern="[0-9Xx]{18}"
            onChange={(value) => setForm((current) => ({ ...current, idNumber: normalizeIdNumberInput(value) }))}
          />
          <Field
            label="电话"
            required
            value={form.phone}
            onChange={(value) => setForm((current) => ({ ...current, phone: normalizePhoneInput(value) }))}
            helper="11 位手机号"
            inputMode="numeric"
            maxLength={11}
          />
          {/* 类型专属字段完全由 personTypeDefinitions 配置生成。 */}
          {currentTypeConfig.fields.map(renderTypedField)}
          <SelectField label="人员状态" value={form.status} options={["正常", "停用"]} onChange={(value) => setForm((current) => ({ ...current, status: value }))} />
          <Field
            label="登录账号"
            required
            value={form.username}
            helper={accountHint(form.accountType)}
            maxLength={form.accountType === "手机号" ? 11 : 24}
            onChange={(value) => setForm((current) => ({ ...current, username: normalizeAccountInput(value, current.accountType) }))}
          />
          <SelectField
            label="账号类型"
            required
            value={form.accountType}
            options={["账号", "学号", "工号", "手机号", "校友编号"]}
            onChange={(value) => setForm((current) => ({ ...current, accountType: value, username: normalizeAccountInput(current.username, value) }))}
          />
          <Field
            label={editingId ? "重置密码" : "初始密码"}
            type="password"
            required={!editingId}
            value={form.password}
            helper={editingId ? "不填写则保持原密码；6-32 位" : "必填，6-32 位"}
            maxLength={32}
            onChange={(value) => setForm((current) => ({ ...current, password: value.slice(0, 32) }))}
          />
          <FormActions
            className="md:col-span-4 xl:col-span-6"
            submitText={editingId ? "保存人员" : "新增人员"}
            submitting={submitting}
            onReset={resetPersonForm}
          />
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>
      {/* 下半区提供三类条件筛选、人员类型快捷标签和管理操作。 */}
      <Panel title="人员档案列表" subtitle="核心身份信息统一由管理员维护，普通用户只能维护联系方式">
        <div className="mb-4 grid gap-3 xl:grid-cols-[1.15fr_.55fr_.55fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">查找人员</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 pl-10 pr-4 text-sm outline-none"
                placeholder="姓名、编号、身份证、电话、账号"
              />
            </span>
          </label>
          <SelectField
            label="人员状态"
            value={filters.status}
            options={[{ label: "全部状态", value: "" }, "正常", "停用"]}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
          />
          <SelectField
            label="账号类型"
            value={filters.accountType}
            options={[{ label: "全部账号", value: "" }, "账号", "学号", "工号", "手机号", "校友编号"]}
            onChange={(value) => setFilters((current) => ({ ...current, accountType: value }))}
          />
          <button
            type="button"
            onClick={() => setFilters({ keyword: "", status: "", accountType: "" })}
            className="mt-7 h-11 rounded-2xl bg-slate-50 px-4 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary"
          >
            清空筛选
          </button>
        </div>
        {/* 类型标签在“全部”和配置中的六类人员之间快速切换。 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {personTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={[
                "rounded-2xl px-4 py-2 text-sm transition",
                activeType === type ? "bg-primary text-white shadow-glow" : "bg-slate-50 text-slate-500 hover:bg-primarySoft hover:text-primary"
              ].join(" ")}
            >
              {type}
            </button>
          ))}
        </div>
        <DataTable
          columns={[
            { title: "编号", key: "code" },
            { title: "姓名", key: "name" },
            { title: "类型", key: "type" },
            { title: "学院/部门", key: "org", render: (row) => row.college || row.department || row.company || row.gate || "-" },
            { title: "联系电话", key: "phone" },
            { title: "登录账号", key: "account", render: (row) => row.account || "-" },
            { title: "状态", key: "status", badge: true },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </button>
                <button onClick={() => toggleStatus(row)} className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-600">
                  <Power className="h-3.5 w-3.5" />
                  {row.status === "正常" ? "停用" : "恢复"}
                </button>
                <button onClick={() => deletePerson(row)} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1 text-xs text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            ) }
          ]}
          rows={filteredPeople}
        />
      </Panel>
    </div>
  );
}

/** 通行规则与校门管理页：编辑各角色的认证方式/时段/校门权限，并维护校门开放状态。 */
export function RulesPage() {
  // 规则和校门分别加载、分别刷新，避免修改一类数据时请求无关接口。
  const { data: rules, reload } = useApiData(() => api.accessRules(), [], []);
  const { data: gates, reload: reloadGates } = useApiData(() => api.gates(), [], []);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  // ruleForm 编辑当前角色规则；validatorForm 保留规则验证器的凭证上下文与结果状态。
  const [ruleForm, setRuleForm] = useState(ruleFormDefaults());
  const [validatorForm, setValidatorForm] = useState({
    credentialType: "campusCard",
    credentialValue: "",
    method: ruleValidatorSamples.campusCard.method,
    gate: gateNameOptions[0]
  });
  const [validatorResult, setValidatorResult] = useState(null);
  const [validatingRule, setValidatingRule] = useState(false);
  // 只展示系统正式角色规则，过滤可能存在的历史/测试规则。
  const visibleRules = rules.filter((item) => accessRuleRoleLabels.includes(item.role));
  const availableGateOptions = normalizeGateOptions(gates.map((item) => item.name));

  // 当前编辑规则、规则列表或校门列表变化时，把后端结构解析回表单模式。
  useEffect(() => {
    const selected = visibleRules.find((item) => item.id === editingId) || visibleRules[0];
    if (!selected) return;
    // allowedTime 从字符串拆为模式/自定义值；方法和校门只保留当前允许选项。
    const allowedTime = allowedTimeToForm(selected.allowedTime);
    const selectedMethods = splitList(selected.methods).filter((item) => authMethodOptions.includes(item));
    const selectedGates = normalizeRuleGateSelection(selected.gates, availableGateOptions);
    setEditingId(selected.id);
    setRuleForm({
      methods: selectedMethods.length ? selectedMethods : [authMethodOptions[0]],
      allowedTimeMode: allowedTime.mode,
      customAllowedTime: allowedTime.custom,
      gates: selectedGates.length ? selectedGates : [availableGateOptions[0] || gateNameOptions[0]],
      status: selected.status || "启用"
    });
  }, [rules, gates, editingId]);

  /** 更新规则表单单个字段。 */
  function updateRuleForm(key, value) {
    setRuleForm((current) => ({ ...current, [key]: value }));
  }

  /** 切换验证器凭证类型时载入对应样本并清空旧验证结果。 */
  function updateValidatorCredentialType(credentialType) {
    const sample = ruleValidatorSamples[credentialType] || ruleValidatorSamples.campusCard;
    setValidatorForm((current) => ({
      ...current,
      credentialType,
      credentialValue: "",
      method: sample.method
    }));
    setValidatorResult(null);
  }

  /** 更新验证器字段并让旧结果失效。 */
  function updateValidatorForm(key, value) {
    setValidatorForm((current) => ({ ...current, [key]: value }));
    setValidatorResult(null);
  }

  /** 调用后端规则引擎验证一组“凭证 + 方式 + 校门”，错误同样转换为拒绝结果。 */
  async function validateRule(event) {
    event.preventDefault();
    if (!validatorForm.credentialValue.trim()) {
      setValidatorResult({ allowed: false, reason: "请填写需要验证的通行凭证" });
      return;
    }

    setValidatingRule(true);
    setValidatorResult(null);
    try {
      const result = await api.validateAccessRule({
        ...validatorForm,
        gate: validatorForm.gate || availableGateOptions[0] || gateNameOptions[0],
        method: validatorForm.method || undefined
      });
      setValidatorResult(result && typeof result.allowed === "boolean" ? result : { allowed: false, requestFailed: true, reason: "后端未返回可确认的规则判断" });
    } catch (error) {
      setValidatorResult({ allowed: false, requestFailed: true, reason: error.message });
    } finally {
      setValidatingRule(false);
    }
  }

  /** 保存当前角色的通行规则，提交前检查时间格式以及方法/校门至少选择一项。 */
  async function saveRule(event) {
    event.preventDefault();
    const selected = rules.find((item) => item.id === editingId);
    if (!selected) return;
    if (ruleForm.allowedTimeMode === "自定义" && !isValidTimeRange(ruleForm.customAllowedTime)) {
      setMessage("自定义允许时间请填写为 HH:mm-HH:mm，例如 08:00-18:00");
      return;
    }
    if (!ruleForm.methods.length) {
      setMessage("请至少选择一种认证方式");
      return;
    }
    if (!ruleForm.gates.length) {
      setMessage("请至少选择一个允许校门");
      return;
    }
    // 将表单时段模式序列化为后端使用的允许时间字符串。
    await api.updateAccessRule(selected.id, {
      methods: ruleForm.methods,
      allowedTime: serializeAllowedTime(ruleForm),
      gates: ruleForm.gates,
      status: ruleForm.status
    });
    setMessage(`${selected.role} 通行规则已保存`);
    reload();
  }

  /** 快速启停一条角色规则。 */
  async function toggleRule(row) {
    await api.updateAccessRule(row.id, { status: row.status === "启用" ? "停用" : "启用" });
    setMessage(`${row.role} 通行规则状态已更新`);
    reload();
  }

  /** 在开放和维护中之间切换校门状态。 */
  async function toggleGateStatus(row) {
    const status = row.status === "开放" ? "维护中" : "开放";
    await api.updateGate(row.id, { status });
    setMessage(`${row.name} 状态已更新为 ${status}`);
    reloadGates();
  }

  return (
    <div className="space-y-6">
      <Panel title="通行规则设置" subtitle="选择人员类型后，在表单中维护认证方式、有效时间和校门权限">
        {message && <div className="mb-4 rounded-2xl bg-primarySoft px-4 py-3 text-sm text-primary">{message}</div>}
        {/* 编辑表单选择角色、时段模式、状态、认证方式和允许校门。 */}
        <form onSubmit={saveRule} className="mb-5 grid gap-4 md:grid-cols-4">
          <SelectField label="适用对象" value={editingId} options={visibleRules.map((item) => ({ label: item.role, value: item.id }))} onChange={setEditingId} />
          <SelectField label="允许时间" value={ruleForm.allowedTimeMode} options={allowedTimeOptions} onChange={(value) => updateRuleForm("allowedTimeMode", value)} />
          {/* 只有自定义时段模式才显示 HH:mm-HH:mm 输入框。 */}
          {ruleForm.allowedTimeMode === "自定义" && (
            <Field
              label="自定义时间"
              value={ruleForm.customAllowedTime}
              helper="格式：08:00-18:00"
              maxLength={11}
              pattern="\\d{2}:\\d{2}-\\d{2}:\\d{2}"
              onChange={(value) => updateRuleForm("customAllowedTime", normalizeTimeRangeInput(value))}
            />
          )}
          <SelectField label="状态" value={ruleForm.status} options={["启用", "停用"]} onChange={(value) => updateRuleForm("status", value)} />
          {/* 认证方式和允许校门都支持多选。 */}
          <CheckboxGroupField label="认证方式" value={ruleForm.methods} options={authMethodOptions} onChange={(value) => updateRuleForm("methods", value)} className="md:col-span-2" />
          <CheckboxGroupField label="允许校门" value={ruleForm.gates} options={availableGateOptions} onChange={(value) => updateRuleForm("gates", value)} className="md:col-span-2" />
          <button className="h-11 rounded-2xl bg-primary text-white shadow-glow md:col-span-4">保存通行规则</button>
        </form>
        {/* 规则表提供再次进入编辑和快速启停操作。 */}
        <DataTable
          columns={[
            { title: "适用对象", key: "role" },
            { title: "认证方式", key: "methods" },
            { title: "允许时间", key: "allowedTime" },
            { title: "允许校门", key: "gates" },
            { title: "状态", key: "status", badge: true },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setEditingId(row.id)} className="rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">编辑</button>
                <button onClick={() => toggleRule(row)} className="rounded-xl bg-amber-50 px-3 py-1 text-xs text-amber-600">{row.status === "启用" ? "停用" : "启用"}</button>
              </div>
            ) }
          ]}
          rows={visibleRules}
        />
      </Panel>

      

      <Panel title="通行规则验证" subtitle="规则验证不会登记真实通行记录">
        <form onSubmit={validateRule} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="验证凭证类型" value={validatorForm.credentialType} options={ruleValidatorCredentialOptions} onChange={updateValidatorCredentialType} disabled={validatingRule} />
          <Field label="验证凭证值" type="password" value={validatorForm.credentialValue} onChange={(v) => updateValidatorForm("credentialValue", v)} required disabled={validatingRule} helper="输入人员编号、车牌或凭证；完整内容不展示" />
          <SelectField label="验证校门" value={validatorForm.gate} options={availableGateOptions} onChange={(v) => updateValidatorForm("gate", v)} disabled={validatingRule} />
          <SelectField label="验证方式" value={validatorForm.method} options={authMethodOptions} onChange={(v) => updateValidatorForm("method", v)} disabled={validatingRule} />
          <button disabled={validatingRule} className="h-11 rounded-2xl bg-primary px-5 text-white disabled:opacity-50 md:col-span-2 xl:col-span-4">{validatingRule ? "验证中..." : "验证通行规则"}</button>
        </form>
        {validatorResult && <div role="status" className={`mt-4 rounded-2xl p-4 ${validatorResult.allowed === true ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
          <p className="font-semibold">{validatorResult.requestFailed ? "验证请求失败，未确认允许" : validatorResult.allowed === true ? "规则判断：允许通行" : "规则判断：拒绝通行"}</p>
          <p>{validatorResult.reason || (validatorResult.allowed === true ? "后端规则校验通过" : "后端未确认允许")}</p>
          <p className="mt-2 text-sm">人员：{validatorResult.person?.name || "未确认"}；校门：{validatorResult.gate?.name || "未确认"}；规则：{validatorResult.rule?.role || "未确认"}；时段：{validatorResult.rule?.allowedTime || "未确认"}</p>
        </div>}
      </Panel>
      {/* 校门信息独立展示；当前界面只允许切换运行状态，不修改基础位置字段。 */}
      <Panel title="校门信息管理" subtitle="维护校门编号、校区位置、开放时间和校门状态">
        <DataTable
          columns={[
            { title: "校门编号", key: "id" },
            { title: "校门名称", key: "name" },
            { title: "校区", key: "campus" },
            { title: "位置", key: "location" },
            { title: "开放时间", key: "openTime" },
            { title: "状态", key: "status", badge: true },
            { title: "操作", key: "action", render: (row) => (
              <button onClick={() => toggleGateStatus(row)} className="inline-flex items-center gap-1 rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">
                <Power className="h-3.5 w-3.5" />
                {row.status === "开放" ? "设为维护" : "设为开放"}
              </button>
            ) }
          ]}
          rows={gates}
        />
      </Panel>
    </div>
  );
}

/** 黑名单管理页：新增限制对象，并要求填写原因后才能将现有对象移出黑名单。 */
export function BlacklistPage() {
  const { data, reload } = useApiData(() => api.blacklist(), [], []);
  const [form, setForm] = useState({ name: "", type: "限制通行人员", credentialNo: "", reason: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /** 校验对象、凭证和原因后创建黑名单记录；人员必须使用完整身份证号。 */
  async function submit(event) {
    event.preventDefault();
    // 统一转大写，兼容身份证末位 X 和英文车牌字母。
    const credentialNo = form.credentialNo.trim().toUpperCase();
    if (!form.name.trim() || !credentialNo || !form.reason.trim()) {
      setMessage("请填写限制对象、完整证件/车牌号和限制原因");
      return;
    }
    // 人员类记录不接受脱敏星号，也不能使用非 18 位身份证；异常车辆不走该规则。
    if (credentialNo.includes("*")) {
      setMessage("黑名单身份证号不能使用星号打码");
      return;
    }
    if (form.type !== "异常车辆" && !/^\d{17}[\dX]$/.test(credentialNo)) {
      setMessage("黑名单人员身份证号需为完整的 18 位身份证号码");
      return;
    }
    setSubmitting(true);
    try {
      await api.createBlacklist({ ...form, credentialNo });
      setMessage("黑名单记录已新增");
      setForm({ name: "", type: "限制通行人员", credentialNo: "", reason: "" });
      reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 通过 prompt 强制收集移出原因，再把状态更新为“已移出”。 */
  async function removeFromBlacklist(row) {
    const removedReason = window.prompt(`请输入将 ${row.name} 拉出黑名单的原因`);
    // 取消对话框时不操作；确认但未填写原因时显示校验提示。
    if (removedReason === null) return;
    const reason = removedReason.trim();
    if (!reason) {
      setMessage("拉出黑名单原因不能为空");
      return;
    }
    setSubmitting(true);
    try {
      await api.updateBlacklist(row.id, { status: "已移出", removedReason: reason });
      setMessage(`${row.name} 已拉出黑名单`);
      reload();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="新增限制对象" subtitle="用于黑名单人员、异常车辆和限制通行对象的统一登记">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <Field label="限制对象" required value={form.name} helper="填写人员姓名或车辆车牌号" onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <SelectField label="类型" value={form.type} options={["限制通行人员", "异常车辆", "疑似冒用身份", "重点关注对象"]} onChange={(value) => setForm((current) => ({ ...current, type: value }))} />
          <Field label="证件/车牌号" helper="人员填证件号，车辆填车牌号" value={form.credentialNo} onChange={(value) => setForm((current) => ({ ...current, credentialNo: value }))} />
          <Field label="限制原因" required value={form.reason} onChange={(value) => setForm((current) => ({ ...current, reason: value }))} />
          <FormActions
            className="md:col-span-4"
            submitText="新增黑名单"
            submitting={submitting}
            onReset={() => setForm({ name: "", type: "限制通行人员", credentialNo: "", reason: "" })}
          />
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>
      {/* 列表用于通行核验命中检查；操作按钮不物理删除，保留历史审计。 */}
      <Panel title="黑名单列表" subtitle="核验通行时系统会自动检查黑名单并生成高风险异常">
        <DataTable
          columns={[
            { title: "编号", key: "id" },
            { title: "限制对象", key: "name" },
            { title: "类型", key: "type" },
            { title: "证件/车牌", key: "credentialNo" },
            { title: "原因", key: "reason" },
            { title: "状态", key: "status", badge: true },
            { title: "操作", key: "action", render: (row) => (
              <button
                type="button"
                disabled={submitting}
                onClick={() => removeFromBlacklist(row)}
                className="rounded-xl bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50"
              >
                拉出黑名单
              </button>
            ) }
          ]}
          rows={data}
        />
      </Panel>
    </div>
  );
}

/** 系统审计日志只读页，展示登录、业务操作、异常处置和设备同步结果。 */
export function LogsPage() {
  const { data } = useApiData(() => api.logs(), [], []);
  return (
    <Panel title="系统日志管理" subtitle="查看用户登录日志、操作日志、异常处理日志和设备同步日志">
      <DataTable
        columns={[
          { title: "时间", key: "time" },
          { title: "操作人", key: "actor" },
          { title: "角色", key: "role" },
          { title: "操作", key: "action" },
          { title: "对象", key: "target" },
          { title: "结果", key: "result", badge: true }
        ]}
        rows={data}
      />
    </Panel>
  );
}

/** 公告管理页：排除预约系统通知后，对公共公告执行统计、发布、编辑、筛选和删除。 */
export function AnnouncementPage() {
  const { data, reload } = useApiData(() => api.messages(), [], []);
  const [form, setForm] = useState(announcementFormDefaults());
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ keyword: "", targetRole: "", read: "" });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 公告列表移除预约自动通知，再按发布时间倒序排列。
  const announcementData = data.filter((item) => !isAppointmentNotice(item));
  const sortedData = [...announcementData].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  // 接收对象筛选兼容 all：全员公告对任意角色筛选都视为可见。
  const filteredRows = sortedData.filter((item) => {
    const keyword = filters.keyword.trim();
    if (filters.targetRole && !announcementTargetsFor(item).includes("all") && !announcementTargetsFor(item).includes(filters.targetRole)) return false;
    if (filters.read && String(Boolean(item.read)) !== filters.read) return false;
    if (keyword) {
      const values = [item.id, item.title, item.content, announcementTargetLabel(announcementTargetsFor(item)), item.createdAt];
      if (!values.some((value) => String(value || "").includes(keyword))) return false;
    }
    return true;
  });
  // 表格行增加中文接收范围和已读/未读展示字段，不修改原始接口对象。
  const rows = filteredRows.map((item) => ({
    ...item,
    target: announcementTargetLabel(announcementTargetsFor(item)),
    readState: item.read ? "已读" : "未读"
  }));
  // 四项摘要指标分别描述总量、全员范围、未读数量和最后发布时间。
  const allCount = announcementData.length;
  const allRoleCount = announcementData.filter((item) => announcementTargetsFor(item).includes("all")).length;
  const unreadCount = announcementData.filter((item) => !item.read).length;
  const latestTime = sortedData[0]?.createdAt || "-";

  /** 重建空公告表单并退出编辑模式。 */
  function resetForm() {
    setForm(announcementFormDefaults());
    setEditingId("");
  }

  /** 将列表公告回填编辑表单，同时把旧/新目标字段统一成数组。 */
  function startEdit(row) {
    setEditingId(row.id);
    setMessage("");
    setForm({
      title: row.title || "",
      content: row.content || "",
      targetRoles: announcementTargetsFor(row).length ? announcementTargetsFor(row) : ["all"]
    });
  }

  /** 更新一个公告筛选条件。 */
  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  /** 校验标题/内容并根据 editingId 创建或更新公告，成功后通知全局公告栏立即刷新。 */
  async function submit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setMessage("请填写公告标题和公告内容");
      return;
    }

    setSubmitting(true);
    try {
      // payload 不携带界面状态，只提交后端需要的标题、正文和目标数组。
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        targetRoles: form.targetRoles
      };
      if (editingId) {
        await api.updateMessage(editingId, payload);
      } else {
        await api.createMessage(payload);
      }
      setMessage(editingId ? "公告已保存" : "公告已发布");
      resetForm();
      reload();
      // 自定义事件避免等待 AnnouncementBar 的十秒轮询。
      window.dispatchEvent(new CustomEvent("campus:announcements-updated"));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  /** 二次确认后删除公告；如果正在编辑该公告则同步退出编辑态。 */
  async function remove(row) {
    if (!window.confirm(`确认删除公告「${row.title}」？`)) return;

    try {
      await api.deleteMessage(row.id);
      setMessage("公告已删除");
      if (editingId === row.id) resetForm();
      reload();
      window.dispatchEvent(new CustomEvent("campus:announcements-updated"));
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* 顶部四张统计卡快速概览公告库。 */}
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="公告总数" value={allCount} desc="当前系统公告" type="primary" />
        <StatCard title="全员公告" value={allRoleCount} desc="面向全部人员" type="success" />
        <StatCard title="未读公告" value={unreadCount} desc="顶部公告栏优先展示" type="warning" />
        <StatCard title="最近发布" value={latestTime} desc="按发布时间排序" type="primary" />
      </section>

      {/* 发布/编辑共用同一表单，editingId 决定标题、按钮图标和提交接口。 */}
      <Panel
        title={editingId ? "编辑公告" : "发布公告"}
        subtitle={editingId ? "调整标题、内容和接收对象" : "保卫处管理员发布面向全体或指定群体的校园公告"}
        action={<span className="flex items-center gap-2 rounded-2xl bg-primarySoft px-3 py-2 text-xs text-primary"><Megaphone size={16} />{editingId ? "编辑中" : "新增"}</span>}
      >
        <form onSubmit={submit} className="grid gap-4">
          <Field
            label="公告标题"
            required
            value={form.title}
            onChange={(value) => setForm((current) => ({ ...current, title: value }))}
          />
          {/* 接收对象使用多选组件，支持全员或多个指定角色。 */}
          <AnnouncementTargetPicker
            value={form.targetRoles}
            onChange={(value) => setForm((current) => ({ ...current, targetRoles: value }))}
          />
          <TextAreaField
            label="公告内容"
            required
            rows={7}
            value={form.content}
            onChange={(value) => setForm((current) => ({ ...current, content: value }))}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button disabled={submitting} className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm text-white shadow-glow disabled:opacity-60">
              {editingId ? <Save size={17} /> : <Send size={17} />}
              {submitting ? "保存中..." : editingId ? "保存修改" : "发布公告"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="h-11 rounded-2xl bg-slate-50 px-5 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary"
            >
              {editingId ? "取消编辑" : "重置"}
            </button>
          </div>
        </form>
        <FormNotice message={message} className="mt-4" />
      </Panel>

      {/* 公告记录支持关键词、接收对象和阅读状态组合过滤。 */}
      <Panel title="公告记录" subtitle="筛选、编辑和删除保卫处已发布公告">
        <div className="mb-4 grid gap-3 md:grid-cols-[1.2fr_.8fr_.8fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm text-slate-500">关键词</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
              <input
                value={filters.keyword}
                onChange={(event) => updateFilter("keyword", event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 pl-10 pr-4 text-sm outline-none"
                placeholder="搜索标题、内容、对象或时间"
              />
            </span>
          </label>
          <SelectField
            label="接收对象"
            value={filters.targetRole}
            options={[{ label: "全部对象", value: "" }, ...announcementTargets]}
            onChange={(value) => updateFilter("targetRole", value)}
          />
          <SelectField
            label="阅读状态"
            value={filters.read}
            options={[
              { label: "全部状态", value: "" },
              { label: "未读", value: "false" },
              { label: "已读", value: "true" }
            ]}
            onChange={(value) => updateFilter("read", value)}
          />
          <button
            type="button"
            onClick={() => setFilters({ keyword: "", targetRole: "", read: "" })}
            className="mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary md:mt-7"
          >
            <XCircle size={16} />
            清空
          </button>
        </div>
        <DataTable
          columns={[
            { title: "时间", key: "createdAt" },
            { title: "标题", key: "title" },
            { title: "内容", key: "content", render: (row) => <span className="block max-w-[420px] truncate">{row.content}</span> },
            { title: "接收对象", key: "target" },
            { title: "状态", key: "readState", render: (row) => <Badge type={row.read ? "success" : "warning"}>{row.readState}</Badge> },
            { title: "操作", key: "action", render: (row) => (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => startEdit(row)} className="inline-flex items-center gap-1 rounded-xl bg-primarySoft px-3 py-1 text-xs text-primary">
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </button>
                <button type="button" onClick={() => remove(row)} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-1 text-xs text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            ) }
          ]}
          rows={rows}
        />
      </Panel>
    </div>
  );
}

// ==================== 跨页面通用展示与表单组件 ====================

/** 将人员档案和登录账号合并为只读信息网格，自动过滤不存在的字段。 */
function InfoGrid({ person, user }) {
  // 字段顺序按“账号 → 身份 → 组织/经历 → 联系方式 → 状态”排列。
  const rows = [
    ["账号", user.username],
    ["账号类型", user.accountType],
    ["姓名", person.name],
    ["人员类型", person.type],
    ["编号", person.code],
    ["学院", person.college],
    ["部门", person.department],
    ["职务", person.position],
    ["专业班级", person.className],
    ["毕业年份", person.graduationYear],
    ["原专业", person.major],
    ["联系电话", person.phone],
    ["账号状态", user.status]
  ].filter(([, value]) => value);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => <Info key={label} title={label} value={value} />)}
    </div>
  );
}

/**
 * 通用单行输入字段。
 * 支持必填标识、帮助文本、输入类型、移动键盘、长度/正则约束和禁用状态；只向父级回传字符串值。
 */
function Field({ label, value, onChange, type = "text", required = false, helper = "", inputMode, maxLength, pattern, disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        disabled={disabled}
        className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 px-4 outline-none disabled:text-slate-400 disabled:opacity-70"
        placeholder={`请输入${label}`}
      />
      {helper && <span className="mt-1 block text-xs text-slate-400">{helper}</span>}
    </label>
  );
}

/** 分段车牌选择器：省份、发牌字母和尾号分别编辑，统一回传格式化后的完整车牌。 */
function PlateNumberPicker({ label, value, onChange, required = false, className = "" }) {
  // 每次渲染把外部字符串解析为三段，并根据省份计算可选字母与实时预览。
  const plate = parsePlateNumber(value);
  const availableLetters = plateLetterOptions(plate.province);
  const preview = formatPlateNumber(plate);

  /** 合并局部修改；省份变化导致旧字母无效时自动选择新省份第一项。 */
  function updatePlate(partial) {
    const next = { ...plate, ...partial };
    const letters = plateLetterOptions(next.province);
    if (!letters.includes(next.letter)) next.letter = letters[0];
    onChange(formatPlateNumber(next));
  }

  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
        {/* 三列分别对应省级简称、地市字母和 5~6 位尾号。 */}
        <div className="grid grid-cols-[88px_78px_1fr] gap-2">
          <select
            value={plate.province}
            onChange={(event) => updatePlate({ province: event.target.value })}
            className="h-11 rounded-xl border border-slate-100 bg-white px-3 text-center text-sm outline-none"
          >
            {plateProvinceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select
            value={plate.letter}
            onChange={(event) => updatePlate({ letter: event.target.value })}
            className="h-11 rounded-xl border border-slate-100 bg-white px-3 text-center text-sm outline-none"
          >
            {availableLetters.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input
            value={plate.tail}
            onChange={(event) => updatePlate({ tail: normalizePlateTail(event.target.value) })}
            maxLength={6}
            inputMode="text"
            className="h-11 min-w-0 rounded-xl border border-slate-100 bg-white px-3 text-center text-sm uppercase tracking-widest outline-none"
            placeholder="8F526"
          />
        </div>
        {/* 预览仅在完整合法时使用主色，否则弱化提示尚未填完。 */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs">
          <span className="text-slate-400">车牌预览</span>
          <span className={`font-semibold tracking-widest ${isValidPlateNumber(preview) ? "text-primary" : "text-slate-400"}`}>
            {plate.tail ? preview : `${plate.province}${plate.letter}·_____`}
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-400">第二位字母按所选省份常见地市代码提供；普通车填写 5 位后缀，新能源可填写 6 位后缀。</div>
      </div>
    </label>
  );
}

/** 通用多选按钮组；value 兼容数组和旧分隔字符串，点击时生成新的选中数组。 */
function CheckboxGroupField({ label, value = [], options = [], onChange, className = "" }) {
  const selected = Array.isArray(value) ? value : splitList(value);

  /** 已选项点击后移除，未选项点击后追加，不修改原数组。 */
  function toggle(option) {
    const next = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    onChange(next);
  }

  return (
    <div className={className}>
      <div className="mb-2 text-sm text-slate-500">{label}</div>
      <div className="flex min-h-11 flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white/80 p-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-xl px-3 py-2 text-xs transition ${selected.includes(option) ? "bg-primary text-white shadow-glow" : "bg-slate-50 text-slate-500 hover:bg-primarySoft hover:text-primary"}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

/** 通用多行文本字段，固定不可拖拽改变尺寸，避免破坏网格布局。 */
function TextAreaField({ label, value, onChange, required = false, helper = "", rows = 5, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        rows={rows}
        className="w-full resize-none rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 outline-none"
        placeholder={`请输入${label}`}
      />
      {helper && <span className="mt-1 block text-xs text-slate-400">{helper}</span>}
    </label>
  );
}

/**
 * 通用下拉字段。
 * options 可混用纯字符串和 {label,value} 对象；空字符串选项自动显示为“全部”。
 */
function SelectField({ label, value, options, onChange, required = false, helper = "", disabled = false }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-1 text-sm text-slate-500">
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-2xl border border-slate-100 bg-white/80 px-4 outline-none disabled:text-slate-400 disabled:opacity-70"
      >
        {options.map((item) => {
          // 标准化两种选项写法，业务页面无需重复转换简单字符串数组。
          const option = typeof item === "object" ? item : { label: item || "全部", value: item };
          return <option key={option.value || "all"} value={option.value}>{option.label}</option>;
        })}
      </select>
      {helper && <span className="mt-1 block text-xs text-slate-400">{helper}</span>}
    </label>
  );
}

/** 公告接收群体多选器，实现“全部人员”与具体角色互斥、具体角色之间可多选。 */
function AnnouncementTargetPicker({ value, onChange }) {
  const selected = normalizeAnnouncementTargets(value);
  // 空选择按全员处理，保证公告始终至少有一个有效目标。
  const effectiveSelected = selected.length ? selected : ["all"];

  /** all 会清空其他角色；具体角色从 all 切出后执行普通增删。 */
  function toggle(target) {
    if (target === "all") {
      onChange(["all"]);
      return;
    }

    const current = effectiveSelected.includes("all") ? [] : effectiveSelected;
    const next = current.includes(target)
      ? current.filter((item) => item !== target)
      : [...current, target];
    // 不允许取消最后一个具体角色而形成空数组，保持上一次有效选择。
    if (next.length) onChange(next);
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm text-slate-500">接收对象 <span className="text-danger">*</span></legend>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-white/80 p-3">
        {announcementTargets.map((target) => {
          const checked = effectiveSelected.includes(target.value);
          return (
            <button
              key={target.value}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(target.value)}
              className={`rounded-xl px-4 py-2 text-sm transition ${checked ? "bg-primary text-white shadow-glow" : "bg-slate-50 text-slate-500 hover:bg-primarySoft hover:text-primary"}`}
            >
              {target.label}
            </button>
          );
        })}
      </div>
      <span className="mt-2 block text-xs text-slate-400">可选择多个群体；选择“全部人员”时将替代其他选项。</span>
    </fieldset>
  );
}

/** 表单标准操作栏：提交按钮显示进行中状态，可选提供不会触发表单提交的重置按钮。 */
function FormActions({ submitText, submitting = false, onReset, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 ${className}`}>
      <button disabled={submitting} className="h-11 rounded-2xl bg-primary px-5 text-sm text-white shadow-glow disabled:opacity-60">
        {submitting ? "提交中..." : submitText}
      </button>
      {onReset && (
        <button type="button" onClick={onReset} className="h-11 rounded-2xl bg-slate-50 px-5 text-sm text-slate-500 hover:bg-primarySoft hover:text-primary">
          重置表单
        </button>
      )}
    </div>
  );
}

/** 表单反馈条，根据常见错误关键词自动选择危险色或主色。 */
function FormNotice({ message, className = "" }) {
  if (!message) return null;
  const isError = /失败|错误|不能为空|请填写|不存在|无权/.test(message);
  return (
    <div className={`rounded-2xl px-4 py-3 text-sm ${isError ? "bg-red-50 text-danger" : "bg-primarySoft text-primary"} ${className}`}>
      {message}
    </div>
  );
}

/** 小型只读信息块，用于展示标签和值。 */
function Info({ title, value }) {
  return (
    <div className="rounded-2xl bg-slate-50/70 px-4 py-3">
      <div className="text-xs text-slate-400">{title}</div>
      <div className="mt-1 text-sm font-medium text-slate-700">{value}</div>
    </div>
  );
}

/** 把“分类 -> 数量”对象渲染为相对最大值的横向条形比较。 */
function SummaryBars({ data = {} }) {
  const rows = Object.entries(data);
  // 最大值至少为 1，避免空值或全零数据造成除零。
  const max = Math.max(...rows.map(([, count]) => Number(count)), 1);

  if (!rows.length) {
    return <div className="rounded-card bg-slate-50/70 p-8 text-center text-slate-400">暂无统计数据</div>;
  }

  return (
    <div className="space-y-3">
      {rows.map(([label, count]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="font-semibold text-slate-700">{count}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary"
              // 非零/小值至少显示 8% 宽度，保证视觉上仍可发现该分类。
              style={{ width: `${Math.max((Number(count) / max) * 100, 8)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 通用格式化、筛选和规则转换工具 ====================

/** 把统计对象压缩为“分类 数量 / 分类 数量”摘要字符串。 */
function formatObject(value = {}) {
  return Object.entries(value).map(([key, count]) => `${key} ${count}`).join(" / ");
}

/** 把统计对象展开为 CSV 使用的 [报表项, 分类, 数量] 行数组。 */
function objectRows(title, value = {}) {
  return Object.entries(value).map(([key, count]) => [title, key, count]);
}

/** CSV 单元格按需加引号，并通过双写引号转义内部引号。 */
function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 将数组或顿号/逗号分隔文本统一拆为去空白、去空项的字符串数组。 */
function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 数组使用中文顿号连接，其他值安全转换为字符串。 */
function arrayText(value) {
  return Array.isArray(value) ? value.join("、") : String(value || "");
}

/** 日期时间统一显示为 YYYY-MM-DD HH:mm:ss；未知格式保留原值。 */
function displayDateTime(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(text)) return text.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(text)) return `${text.replace("T", " ")}:00`;
  return text;
}

/** 根据访客码/校友码生成不同语义的有效期说明。 */
function qrTimeText(qrCode, type) {
  const from = displayDateTime(qrCode?.validFrom);
  const to = displayDateTime(qrCode?.validTo);
  return type === "visitor"
    ? `来访时间至预计离校时间：${from} 至 ${to}`
    : `有效时间：${from} 至 ${to}`;
}

/** 比较当前时间与二维码有效起止时间，返回未开始、已过期或活动中。 */
function qrWindowState(qrCode, now = Date.now()) {
  const start = itemDateTime(qrCode?.validFrom);
  const end = itemDateTime(qrCode?.validTo);
  if (start && now < start) return "notStarted";
  if (end && now > end) return "expired";
  return "active";
}

/** 空值安全的包含判断，关键词先去除首尾空白。 */
function textIncludes(value, keyword) {
  return String(value || "").includes(String(keyword || "").trim());
}

/** 把后端空格分隔日期转换为可解析时间戳，解析失败返回 null。 */
function itemDateTime(value) {
  const parsed = Date.parse(String(value || "").replace(" ", "T"));
  return Number.isNaN(parsed) ? null : parsed;
}

/** 从任意包含 HH:mm 的文本提取当天分钟数。 */
function minutesFromText(value) {
  const match = String(value || "").match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * 判断值是否位于可选起止范围。
 * 优先按完整日期时间比较；若只有 HH:mm，则退化为当天分钟数比较；无法解析时不主动排除。
 */
function inDateRange(value, from, to) {
  const time = itemDateTime(value);
  // 完整时间分支：只对实际提供的边界执行比较。
  if (time) {
    const start = from ? itemDateTime(from) : null;
    const end = to ? itemDateTime(to) : null;
    if (start && time < start) return false;
    if (end && time > end) return false;
    return true;
  }

  // 纯时间分支用于部分旧数据或规则文本。
  const minute = minutesFromText(value);
  if (minute === null) return true;
  const startMinute = minutesFromText(from);
  const endMinute = minutesFromText(to);
  if (startMinute !== null && minute < startMinute) return false;
  if (endMinute !== null && minute > endMinute) return false;
  return true;
}

/** 预约时间过滤优先使用 visitStart，再兼容 time/createdAt 旧字段。 */
function appointmentMatchesTime(item, from, to) {
  return inDateRange(item.visitStart || item.time || item.createdAt, from, to);
}

/** 对出入记录执行关键词、类型、方式、校门、状态和时间范围的组合筛选。 */
function filterAccessRecords(rows, filters) {
  const keyword = filters.keyword.trim();
  return rows.filter((item) => {
    if (keyword && ![item.id, item.name, item.personCode, item.type, item.method, item.gate, item.status].some((value) => textIncludes(value, keyword))) return false;
    if (filters.type && item.type !== filters.type) return false;
    if (filters.method && item.method !== filters.method) return false;
    if (filters.gate && item.gate !== filters.gate) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (!inDateRange(item.time, filters.timeFrom, filters.timeTo)) return false;
    return true;
  });
}

/** 对异常事件执行跨字段关键词、风险、状态和校门组合筛选。 */
function filterExceptions(rows, filters) {
  const keyword = filters.keyword.trim();
  return rows.filter((item) => {
    if (keyword && ![item.id, item.person, item.personType, item.type, item.reason, item.gate].some((value) => textIncludes(value, keyword))) return false;
    if (filters.risk && item.risk !== filters.risk) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.gate && item.gate !== filters.gate) return false;
    return true;
  });
}

/** 从可能的多值内容中选出第一个合法选项，否则返回指定兜底值。 */
function firstAllowedValue(value, options, fallback) {
  const list = splitList(arrayText(value));
  return list.find((item) => options.includes(item)) || fallback;
}

/** 规范化规则校门；历史“全部校门/值守校门”语义展开为当前全部可用校门。 */
function normalizeRuleGateSelection(value, options) {
  const list = splitList(arrayText(value));
  if (list.includes("全部校门") || list.includes("值守校门")) return options;
  return list.filter((item) => options.includes(item));
}

/** 创建规则编辑表单默认值，避免页面直接修改静态选项数组。 */
function ruleFormDefaults() {
  return {
    methods: [authMethodOptions[0]],
    allowedTimeMode: "全天时间",
    customAllowedTime: defaultCustomAllowedTime,
    gates: [gateNameOptions[0]],
    status: "启用"
  };
}

/** 将后端允许时间文本解析为“模式 + 自定义时间”表单结构。 */
function allowedTimeToForm(value) {
  const text = arrayText(value);
  if (!text || text === "全天" || text === "全天时间") {
    return { mode: "全天时间", custom: defaultCustomAllowedTime };
  }
  if (text.includes("预约")) {
    return { mode: "预约时段", custom: defaultCustomAllowedTime };
  }
  return { mode: "自定义", custom: normalizeTimeRangeInput(text) || defaultCustomAllowedTime };
}

/** 将规则表单的允许时间模式序列化回后端字符串。 */
function serializeAllowedTime(form) {
  if (form.allowedTimeMode === "全天时间") return "全天时间";
  if (form.allowedTimeMode === "预约时段") return "预约时段";
  return normalizeTimeRangeInput(form.customAllowedTime) || defaultCustomAllowedTime;
}

/** 时间范围输入只保留数字、冒号和短横线，并限制标准格式最大长度 11。 */
function normalizeTimeRangeInput(value) {
  return String(value || "").replace(/[^\d:-]/g, "").slice(0, 11);
}

/** 校验 24 小时制 HH:mm-HH:mm 形式；这里只验证格式，未限制跨日语义。 */
function isValidTimeRange(value) {
  const match = String(value || "").match(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/);
  return Boolean(match);
}

/** 登录账号角色下拉选项，label 面向用户，value 与后端鉴权角色键一致。 */
function roleOptions() {
  return [
    { label: "学生", value: "student" },
    { label: "教职工", value: "teacher" },
    { label: "访客", value: "visitor" },
    { label: "校友", value: "alumni" },
    { label: "门岗安保", value: "guard" },
    { label: "保卫处管理员", value: "admin" }
  ];
}

/** 根据系统角色推导默认账号类型。 */
function accountTypeByRole(role) {
  const map = {
    student: "学号",
    teacher: "工号",
    visitor: "手机号",
    alumni: "校友编号",
    guard: "工号",
    admin: "工号"
  };
  return map[role] || "账号";
}

// ==================== 人员类型元数据与表单构造 ====================

/**
 * 六类人员的元数据定义。
 * 每类声明后端角色、默认账号类型、编号标签和专属字段；字段可配置必填、长度、选项及规范化函数。
 */
const personTypeDefinitions = {
  学生: {
    role: "student",
    accountType: "学号",
    codeLabel: "学号/编号",
    fields: [
      { key: "college", label: "学院", required: true, maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "className", label: "班级", required: true, maxLength: 30, normalize: (value) => normalizeLimitedText(value, 30) }
    ]
  },
  教职工: {
    role: "teacher",
    accountType: "工号",
    codeLabel: "工号/编号",
    fields: [
      { key: "college", label: "学院", required: true, maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "department", label: "部门/系部", maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "position", label: "职务", maxLength: 30, normalize: (value) => normalizeLimitedText(value, 30) }
    ]
  },
  访客: {
    role: "visitor",
    accountType: "手机号",
    codeLabel: "访客编号",
    phoneRequired: true,
    fields: [
      { key: "company", label: "来访单位", required: true, maxLength: 60, normalize: (value) => normalizeLimitedText(value, 60) },
      {
        key: "host",
        label: "被访人",
        required: true,
        maxLength: 30,
        helper: "填写系统内学生、教职工或保卫处管理员的姓名/编号",
        normalize: (value) => normalizeLimitedText(value, 30)
      }
    ]
  },
  校友: {
    role: "alumni",
    accountType: "校友编号",
    codeLabel: "校友编号",
    fields: [
      { key: "college", label: "原学院", required: true, maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "major", label: "原专业", maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "graduationYear", label: "毕业年份", inputMode: "numeric", maxLength: 4, pattern: "\\d{4}", normalize: normalizeYearInput }
    ]
  },
  门岗安保: {
    role: "guard",
    accountType: "工号",
    codeLabel: "工号/编号",
    fields: [
      { key: "gate", label: "值守校门", kind: "select", options: ["", "东门", "南门", "西门", "北门"], required: true },
      { key: "department", label: "所属部门", maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "position", label: "岗位", maxLength: 30, normalize: (value) => normalizeLimitedText(value, 30) }
    ]
  },
  管理员: {
    role: "admin",
    accountType: "工号",
    codeLabel: "工号/编号",
    fields: [
      { key: "department", label: "所属部门", required: true, maxLength: 40, normalize: (value) => normalizeLimitedText(value, 40) },
      { key: "position", label: "职务", maxLength: 30, normalize: (value) => normalizeLimitedText(value, 30) }
    ]
  }
};

// 切换人员类型时需要检查并清空的全部可选业务字段键。
const personOptionalKeys = [
  "college",
  "className",
  "department",
  "position",
  "company",
  "host",
  "graduationYear",
  "major",
  "gate"
];

// 可作为访客被访人的后端角色集合。
const visitorHostRoles = new Set(["student", "teacher", "admin"]);

/** 返回全部人员类型中文键，顺序与 definitions 声明顺序一致。 */
function personTypeOptions() {
  return Object.keys(personTypeDefinitions);
}

/** 获取人员类型配置；未知类型回退学生配置。 */
function personTypeConfig(type) {
  return personTypeDefinitions[type] || personTypeDefinitions["学生"];
}

/** 从后端角色反向查找中文人员类型；无法识别时回退学生。 */
function personTypeByRole(role) {
  return Object.entries(personTypeDefinitions).find(([, config]) => config.role === role)?.[0] || "学生";
}

/**
 * 按目标人员类型清理并规范化表单。
 * 不属于该类型的专属字段会被置空，同时统一编号、身份证、手机号、年份和账号格式。
 */
function normalizePersonFieldsForType(type, values = {}) {
  const normalizedType = personTypeDefinitions[type] ? type : "学生";
  const config = personTypeConfig(normalizedType);
  // allowedKeys 只包含目标类型实际声明的扩展字段。
  const allowedKeys = new Set(config.fields.map((field) => field.key));
  const next = {
    ...values,
    type: normalizedType,
    role: config.role,
    accountType: values.accountType || config.accountType
  };

  // 遍历所有可选键，消除从上一人员类型残留但不应提交的值。
  for (const key of personOptionalKeys) {
    if (!allowedKeys.has(key)) next[key] = "";
  }

  // 基础字段使用与独立输入控件相同的规范化函数，形成提交前最后一道一致性保障。
  next.code = normalizeCodeInput(next.code, normalizedType);
  next.idNumber = normalizeIdNumberInput(next.idNumber);
  next.phone = normalizePhoneInput(next.phone);
  next.graduationYear = normalizeYearInput(next.graduationYear);
  next.username = normalizeAccountInput(next.username, next.accountType);

  return next;
}

/** 为指定人员类型生成完整空表单，再交给 normalizePersonFieldsForType 做一致性处理。 */
function personFormDefaults(type = "学生") {
  const normalizedType = personTypeDefinitions[type] ? type : "学生";
  const config = personTypeConfig(normalizedType);
  return normalizePersonFieldsForType(normalizedType, {
    name: "",
    type: normalizedType,
    role: config.role,
    code: "",
    idNumber: "",
    phone: "",
    college: "",
    className: "",
    department: "",
    position: "",
    company: "",
    host: "",
    graduationYear: "",
    major: "",
    gate: "",
    status: "正常",
    username: "",
    accountType: config.accountType,
    password: ""
  });
}

/** 创建新增设备的默认表单对象。 */
function deviceFormDefaults() {
  return {
    name: "",
    type: "闸机",
    gate: "东门",
    status: "在线"
  };
}

/** 把后端英文角色键转为中文名称；未知键原样返回便于排查数据。 */
function roleName(role) {
  const names = {
    student: "学生",
    teacher: "教职工",
    visitor: "访客",
    alumni: "校友",
    guard: "门岗安保",
    admin: "保卫处管理员"
  };
  return names[role] || role;
}

/** 独立软件模拟入口。只展示后端确认结果，持久元数据不含原始凭证。 */
export function ScanSimulatorPage({ session }) {
  const storageKey = `campus_scan_pending_v1:${session.user.id}`;
  const [initial] = useState(() => {
    try { const value = JSON.parse(sessionStorage.getItem(storageKey)); return value?.id && value?.credentialHash && value?.fields ? value : null; } catch { return null; }
  });
  const [form, setForm] = useState({ credentialType: "qr", credentialValue: "", gate: "东门", method: "二维码扫码", deviceId: "", ...(initial?.fields || {}) });
  const [operation, setOperation] = useState(initial);
  const [phase, setPhase] = useState(initial ? "unknown" : "idle");
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState(initial ? "上次核验结果尚未确认。请重新输入相同凭证，复用原操作标识重试。" : "");
  const running = useRef(false), controller = useRef(null);
  const { data: devices } = useApiData(() => api.devices(), [], []);
  useEffect(() => () => controller.current?.abort(), []);
  const busy = phase === "pending";
  const redact = (value) => {
    const message = String(value || "");
    return form.credentialValue.length >= 8 ? message.split(form.credentialValue).join("[凭证已隐藏]") : message;
  };
  async function submit(event) {
    event.preventDefault();
    if (running.current) return;
    if (!form.credentialValue.trim()) { setNotice("请输入本次核验凭证，完整内容将隐藏显示。"); return; }
    running.current = true;
    let timer, dispatched = false;
    try {
      const value = form.credentialValue.trim();
      const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
      const credentialHash = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
      if (operation && operation.credentialHash !== credentialHash) { setNotice("凭证与原操作不一致。结果未确认时不能替换凭证或生成新操作。"); return; }
      const fields = { credentialType: form.credentialType, gate: form.gate, method: form.method, ...(form.deviceId ? { deviceId: form.deviceId } : {}) };
      const current = operation || { id: crypto.randomUUID(), credentialHash, fields };
      // 必须先保存幂等元数据再发送；存储失败时不产生远程写操作。
      sessionStorage.setItem(storageKey, JSON.stringify(current));
      setOperation(current);setPhase("pending");setResult(null);setNotice("正在核验，请勿重复提交；此操作将登记真实通行结果。");
      controller.current = new AbortController();
      timer = setTimeout(() => controller.current?.abort(), 12000);
      dispatched = true;
      const response = await api.simulateScan({ ...current.fields, credentialValue: value }, { operationId: current.id, signal: controller.current.signal });
      if (!response || typeof response.allowed !== "boolean" || !response.record?.id) throw new Error("后端未返回可确认的通行结果");
      setResult({ allowed: response.allowed, reason: redact(response.reason), recordId: response.record.id, time: response.record.time, gate: response.record.gate });
      setPhase(response.allowed ? "allowed" : "denied");setNotice("");sessionStorage.removeItem(storageKey);
    } catch (error) {
      // 首次请求的明确4xx拒绝与超时/5xx未知分开；重试已有操作仍保留未知保护。
      const rejected = dispatched && !operation && error.status >= 400 && error.status < 500;
      if (rejected) sessionStorage.removeItem(storageKey);
      setPhase(rejected ? "failed" : dispatched || operation ? "unknown" : "failed");
      setNotice(rejected ? `请求失败（HTTP ${error.status}）：${redact(error.message)}` : dispatched ? `核验结果未知：${redact(error.name === "AbortError" ? "等待超时或连接中断" : error.message)}。请复用本次操作重试，不要重新登记。` : redact(error.message || "请求准备失败，本次未发送"));
    } finally { clearTimeout(timer);running.current = false;controller.current = null; }
  }
  function nextOperation() {
    if (busy || phase === "unknown") return;
    sessionStorage.removeItem(storageKey);setOperation(null);setForm((v) => ({ ...v, credentialValue: "" }));setResult(null);setNotice("");setPhase("idle");
  }
  return <div className="space-y-6">
    <Panel title="扫码模拟" subtitle="软件模拟调用真实Java核验及数据库，不连接真实门禁硬件">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField label="模拟凭证类型" value={form.credentialType} options={ruleValidatorCredentialOptions} disabled={busy || !!operation} onChange={(v) => setForm((f) => ({ ...f, credentialType: v, method: ruleValidatorSamples[v].method }))} />
        <Field label="模拟凭证值" type="password" value={form.credentialValue} required disabled={busy} helper="完整凭证不展示、不写日志；未知结果重试须输入相同凭证" onChange={(v) => setForm((f) => ({ ...f, credentialValue: v }))} />
        <SelectField label="模拟校门" value={form.gate} options={gateNameOptions} disabled={busy || !!operation} onChange={(v) => setForm((f) => ({ ...f, gate: v }))} />
        <SelectField label="模拟核验方式" value={form.method} options={authMethodOptions} disabled={busy || !!operation} onChange={(v) => setForm((f) => ({ ...f, method: v }))} />
        <SelectField label="模拟设备" value={form.deviceId} options={[{ label: "不指定设备（按原规则）", value: "" }, ...devices.map((d) => ({ label: `${d.name} / ${d.gate} / ${d.status}`, value: d.id }))]} disabled={busy || !!operation} onChange={(v) => setForm((f) => ({ ...f, deviceId: v }))} />
        <div className="flex items-end gap-2"><button disabled={busy} className="h-11 rounded-2xl bg-primary px-5 text-white disabled:opacity-50">{busy ? "核验中..." : operation ? "重试本次核验" : "执行核验"}</button><button type="button" onClick={nextOperation} disabled={busy || phase === "unknown"} className="h-11 rounded-2xl bg-slate-100 px-4 disabled:opacity-50">开始新的核验</button></div>
      </form>
      <div role="status" className={`mt-5 rounded-2xl p-4 ${phase === "allowed" ? "bg-emerald-50 text-emerald-800" : phase === "denied" ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}>
        <p className="font-semibold">{({ idle: "等待核验", pending: "核验处理中", allowed: "允许通行", denied: "拒绝通行", unknown: "结果未知，尚未确认", failed: "请求失败，未获得通行结果" })[phase]}</p>
        {notice && <p className="mt-1">{notice}</p>}
        {result && <><p>{result.reason || (result.allowed ? "后端核验通过" : "后端拒绝通行")}</p><p className="mt-2">记录编号：{result.recordId}；校门：{result.gate}；时间：{result.time}</p></>}
        {operation && <p className="mt-2 break-all text-xs">本次操作标识：{operation.id}</p>}
      </div>
    </Panel>
  </div>;
}

/** 仅账号状态，不挂载旧账号管理页，也不提供任何密码功能。 */
export function AccountStatusPage({ session }) {
  const [users, setUsers] = useState([]), [loading, setLoading] = useState(true), [processing, setProcessing] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(""), [error, setError] = useState("");
  const locked = useRef(false);
  async function load() {
    setLoading(true);setError("");
    try { const rows = await api.users();if (!Array.isArray(rows)) throw new Error("账号列表响应不正确");setUsers(rows); }
    catch (e) { setUsers([]);setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function held(row) {
    if (row.status !== "启用") return "";
    if (row.id === session.user.id) return "本人停用待单独确认，本入口暂不开放";
    if (row.role === "admin" && users.filter((u) => u.role === "admin" && u.status === "启用").length <= 1) return "最后一名启用管理员停用待单独确认";
    return "";
  }
  async function toggle(row) {
    if (locked.current || held(row)) return;
    const status = row.status === "启用" ? "停用" : "启用";
    if (!window.confirm(`确认将账号 ${row.username}（${row.id}）设为${status}？这只修改账号状态，不修改人员档案状态。`)) return;
    locked.current = true;setProcessing(row.id);setMessage("");setError("");
    try {
      const result = await api.updateUser(row.id, { status });
      if (result?.id !== row.id || result.status !== status) throw new Error("后端未确认账号状态，请刷新核实");
      setMessage(`账号 ${row.username} 已${status}（后端确认）`);await load();
    } catch (e) { setError(e.message); }
    finally { locked.current = false;setProcessing(""); }
  }
  return <Panel title="账号状态管理" subtitle="管理users.status登录账号状态；与people.status人员档案状态分别维护">
    <p className="mb-4 text-sm text-slate-500">停用账号后，其会话请求由Java权威拒绝。本页不提供密码重置或人员删除；本人及最后管理员停用分支待单独确认。</p>
    <div className="mb-4 max-w-xl"><Field label="查找账号" value={query} onChange={setQuery} helper="按账号标识、登录账号、关联人员编号或角色筛选" /></div>
    <button onClick={load} disabled={loading || !!processing} className="mb-4 rounded-xl bg-primarySoft px-4 py-2 text-primary disabled:opacity-50">{loading ? "加载中..." : "刷新账号列表"}</button>
    {message && <p role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-emerald-800">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    <DataTable columns={[
      { title: "账号标识", key: "id" }, { title: "登录账号", key: "username" }, { title: "关联人员编号", key: "personId" },
      { title: "角色", key: "role", render: (r) => roleLabels[r.role] || r.role }, { title: "账号状态", key: "status", badge: true },
      { title: "操作", key: "action", render: (r) => <div><button onClick={() => toggle(r)} disabled={loading || !!processing || !!held(r)} className="rounded-xl bg-primarySoft px-3 py-1 text-primary disabled:opacity-50">{processing === r.id ? "处理中..." : r.status === "启用" ? "停用账号" : "启用账号"}</button>{held(r) && <p className="mt-1 max-w-48 text-xs text-slate-500">{held(r)}</p>}</div> }
    ]} rows={users.filter((u) => [u.id, u.username, u.personId, roleLabels[u.role]].some((v) => String(v || "").includes(query.trim())))} />
  </Panel>;
}
