// Local Vite middleware only. Never bundled into the browser or enabled in normal mode.
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const choices = [
  ["学生", "student", "SYN-STUDENT"],
  ["教职工", "teacher", "SYN-TEACHER"],
  ["校友", "alumni", "SYN-ALUMNI"],
  ["门岗", "guard", "SYN-GUARD"],
  ["管理员", "admin", "SYN-ADMIN"]
];

export default function syntheticDemoLogin() {
  const configure = (server) => {
    let config;
    // The reviewed launcher supplies these flags only for the isolated synthetic environment.
    if (process.env.P2_DEMO !== "true" || process.env.SPRING_PROFILES_ACTIVE !== "synthetic-demo" || !process.env.P2_WORKSPACE) return;
    try {
      config = JSON.parse(fs.readFileSync(path.join(process.env.P2_WORKSPACE, ".p5-local/runtime.json"), "utf8"));
      if (config.host !== "127.0.0.1" || !/^campus_p2_user_\d{14}$/.test(config.database) || !config.demoPassword) return;
    } catch { return; }
    server.middlewares.use(async (request, response, next) => {
      const endpoint = request.url?.split("?")[0];
      if (!endpoint?.startsWith("/__synthetic-demo/")) return next();
      const send = (status, body) => {
        response.statusCode = status;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.end(JSON.stringify(body));
      };
      const fail = (status, message) => send(status, { success: false, error: { message } });
      const address = request.socket.localAddress;
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) || request.headers.host !== "127.0.0.1:15173") return fail(403, "演示快捷登录仅限本机隔离环境");
      if (request.headers.origin && request.headers.origin !== "http://127.0.0.1:15173") return fail(403, "不允许跨站演示登录");
      if (request.headers["sec-fetch-site"] && request.headers["sec-fetch-site"] !== "same-origin") return fail(403, "不允许跨站演示登录");
      let db;
      try {
        if (endpoint !== "/__synthetic-demo/accounts" && endpoint !== "/__synthetic-demo/login") return fail(404, "演示接口不存在");
        if ((endpoint.endsWith("/accounts") && request.method !== "GET") || (endpoint.endsWith("/login") && request.method !== "POST")) return fail(405, "请求方法不允许");
        db = await mysql.createConnection({ host: config.host, port: config.port, user: config.username, password: config.password, database: config.database, connectTimeout: 3000 });
        const [rows] = await db.execute("SELECT username, role, status FROM users WHERE username IN (?,?,?,?,?)", choices.map((x) => x[2]));
        const accounts = choices.flatMap(([label, role, account]) => {
          const row = rows.find((x) => x.username === account && x.role === role);
          return row ? [{ label, role, account, enabled: row.status === "启用" }] : [];
        });
        if (endpoint.endsWith("/accounts")) return send(200, { success: true, data: accounts });
        if (request.headers.origin !== "http://127.0.0.1:15173" || !request.headers["content-type"]?.startsWith("application/json")) return fail(403, "演示登录必须由本站页面发起");
        let text = "";
        for await (const chunk of request) { text += chunk; if (Buffer.byteLength(text) > 2048) return fail(413, "请求内容过大"); }
        let body; try { body = JSON.parse(text); } catch { return fail(400, "请求格式错误"); }
        const selected = accounts.find((x) => x.account === body.account);
        if (!selected) return fail(403, "不允许使用该演示账号");
        if (!selected.enabled) return fail(403, "账号已被停用");
        // Authenticate normally through Gateway/Java. No forged session, role or bypass.
        const result = await fetch("http://127.0.0.1:19800/api/auth/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: selected.account, password: config.demoPassword }),
          signal: AbortSignal.timeout(6000)
        });
        const session = await result.json();
        if (result.ok && session.data?.user?.role !== selected.role) return fail(403, "演示账号角色已变更，请重新确认");
        send(result.status, session);
      } catch {
        if (!response.writableEnded) fail(503, "演示登录暂不可用，请检查用户服务后重试");
      } finally { await db?.end().catch(() => {}); }
    });
  };
  return { name: "isolated-synthetic-demo-login", configureServer: configure, configurePreviewServer: configure };
}
