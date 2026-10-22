// 服务端入口文件：负责初始化 Express 应用、注册 API 路由、挂载静态资源并启动监听。
import "./lib/env.js";
import cors from "cors";
import express, { Router } from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 导入各模块对应的路由，便于按功能拆分管理接口。
import accessRecordsRoutes from "./routes/accessRecords.js";
import adminRoutes from "./routes/admin.js";
import appointmentsRoutes from "./routes/appointments.js";
import authRoutes from "./routes/auth.js";
import credentialsRoutes from "./routes/credentials.js";
import dashboardRoutes from "./routes/dashboard.js";
import devicesRoutes from "./routes/devices.js";
import exceptionsRoutes from "./routes/exceptions.js";
import profilesRoutes from "./routes/profiles.js";
import reportsRoutes from "./routes/reports.js";
import settingsRoutes from "./routes/settings.js";

// 导入统一的响应辅助函数与数据存储相关工具。
import { fail, ok } from "./lib/http.js";
import { getDataFilePath, getStoreInfo, initStore } from "./lib/store.js";
import { authenticate, authorize } from "./middleware/auth.js";

// 通过当前文件路径推导出项目根目录，便于定位静态资源目录。
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 创建 Express 应用实例和一个统一的 API 路由容器。
const app = express();
const api = Router();

// 读取环境变量中的端口号，若未配置则使用默认值 3001。
const port = Number(process.env.PORT || process.env.API_PORT || 3001);

// 配置跨域策略，允许前端访问接口；若未设置 CORS_ORIGIN，则默认允许所有来源。
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true
}));

// 解析 JSON 请求体，限制最大请求体大小为 10MB，避免大数据包影响服务。
app.use(express.json({ limit: "10mb" }));

// 为所有 API 请求统一添加缓存策略，避免浏览器缓存接口响应。
api.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// 定义健康检查接口，用于确认服务是否正常运行，并返回存储信息。
api.get("/health", (req, res) => {
  ok(res, {
    service: "campus-access-api",
    status: "ok",
    store: getStoreInfo(),
    dataFile: getDataFilePath()
  });
});

// 对所有受保护接口执行认证与授权检查，确保只有合法用户能访问。
api.use(authenticate);
api.use(authorize);

// 挂载各功能模块对应的路由，按业务职责拆分接口。
api.use(authRoutes);
api.use(dashboardRoutes);
api.use(appointmentsRoutes);
api.use(accessRecordsRoutes);
api.use(exceptionsRoutes);
api.use(devicesRoutes);
api.use(profilesRoutes);
api.use(credentialsRoutes);
api.use(reportsRoutes);
api.use(adminRoutes);
api.use(settingsRoutes);

// 当请求路径未命中以上任何接口时，返回 404 提示。
api.use((req, res) => {
  fail(res, 404, "API 路径不存在");
});

// 将所有 /api 开头的请求交给上面的 API 路由处理。
app.use("/api", api);

// 检查前端构建产物目录 dist 是否存在，若存在则提供静态文件服务。
const distPath = path.resolve(__dirname, "../dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // 对前端路由做兜底处理，确保刷新页面时仍能返回 index.html。
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// 全局错误处理中间件，统一捕获服务端异常并返回结构化错误信息。
app.use((error, req, res, next) => {
  console.error(error);
  fail(res, 500, "服务器内部错误", process.env.NODE_ENV === "production" ? undefined : error.message);
});

// 在服务启动前初始化数据存储，确保数据库或 JSON 文件已经准备好。
await initStore();

// 启动 HTTP 服务并监听指定端口，启动后打印访问地址。
app.listen(port, () => {
  console.log(`Campus Access API listening on http://localhost:${port}`);
});
