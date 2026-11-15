# Java 微服务后端

正式 Maven reactor 包含：

- `eureka-server`：19761、19762 双节点注册中心。
- `gateway-service`：19800 API 网关。
- `user-service`：19811 用户、人员、凭证与审计。
- `appointment-service`：19821 预约、审批与二维码签发协调。
- `access-service`：19841 规则、设备、二维码和通行记录。
- `exception-service`：19851 异常与黑名单。
- `aggregation-service`：19861 Dashboard/Report 聚合。

迁移辅助代码统一放在 `migration-bridges/`：

- `user-domain-cutover`：用户域接管期间复用旧 Express 路由的基础桥接模板。
- `appointment-domain-cutover`：预约域接管后的旧接口兼容桥接。
- `access-domain-cutover`：通行域接管后的旧接口兼容桥接。
- `exception-domain-cutover`：异常域接管后的投影聚合桥接。

这些桥接器只用于隔离迁移和历史回归，不属于正式 Maven reactor，正式 Java 演示不会启动它们。

构建：`mvn -f backend/pom.xml clean verify`。

目标 18 表 Schema 位于 `database/unified/V001__unified_schema.sql`，只允许在隔离数据库执行。完整启动、停止和双 Eureka 主机标识要求见 `docs/RUNBOOK.md`。正式 Java 演示不启动旧 Express。


Current database: `campus_access_dev`; all four services share this database and retain their HTTP service boundaries. See DATABASE.md for migration and 3NF details.
