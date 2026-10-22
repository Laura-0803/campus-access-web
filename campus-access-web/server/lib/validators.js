// 本模块集中处理手机号与中国大陆机动车号牌的标准化和格式校验。
// 手机号标准化仅保留数字，并限制为前 11 位。
export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

// 校验手机号是否为 1 开头的 11 位数字。
export function isValidPhone(value) {
  return /^1\d{10}$/.test(String(value || "").trim());
}

// 中国大陆省级行政区车牌首字符集合，用于构造号牌基础正则。
const plateProvincePattern = "京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼";
// 各省允许使用的发牌机关字母集合，用于比通用车牌正则更严格地校验第二位。
const plateLettersByProvince = {
  京: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  津: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  沪: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  渝: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  冀: "ABCDEFGHJRT",
  豫: "ABCDEFGHJKLMNPQRUVW",
  云: "ABCDEFGHJKLMNPQRS",
  辽: "ABCDEFGHJKLMNPV",
  黑: "ABCDEFGHJKLMNPR",
  湘: "ABCDEFGHJKLMNPU",
  皖: "ABCDEFGHJKLMNPRS",
  鲁: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  新: "ABCDEFGHJKLMNPR",
  苏: "ABCDEFGHJKLMN",
  浙: "ABCDEFGHJKLM",
  赣: "ABCDEFGHJKLM",
  鄂: "ABCDEFGHJKLMNPQRS",
  桂: "ABCDEFGHJKLMNPQR",
  甘: "ABCDEFGHJKLMNP",
  晋: "ABCDEFGHJKLM",
  蒙: "ABCDEFGHJKLM",
  陕: "ABCDEFGHJKLMUV",
  吉: "ABCDEFGHJK",
  闽: "ABCDEFGHJKLM",
  贵: "ABCDEFGHJKLM",
  粤: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  青: "ABCDEFGH",
  藏: "ABCDEFGHJKLM",
  川: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  宁: "ABCDE",
  琼: "ABCDEFGH"
};

// 统一车牌中的大小写、空白和分隔符；合法基础格式会补成“省份字母·号码”的展示形式。
export function normalizePlateNo(value) {
  // 去除常见点号、空白、句点和短横线后进行结构判断。
  const compact = String(value || "").trim().toUpperCase().replace(/[·\s.-]/g, "");
  if (new RegExp(`^[${plateProvincePattern}][A-Z][A-Z0-9]{5,6}$`).test(compact)) {
    return `${compact.slice(0, 2)}·${compact.slice(2)}`;
  }
  // 无法识别为标准车牌时不擅自改写内容，仅执行去空白和转大写。
  return String(value || "").trim().toUpperCase();
}

// 同时验证车牌整体结构和省份对应的发牌机关字母是否合法。
export function isValidPlateNo(value) {
  const compact = String(value || "").trim().toUpperCase().replace(/[·\s.-]/g, "");
  const province = compact[0];
  const letter = compact[1];
  return new RegExp(`^[${plateProvincePattern}][A-Z][A-Z0-9]{5,6}$`).test(compact)
    && (plateLettersByProvince[province] || "").includes(letter);
}
