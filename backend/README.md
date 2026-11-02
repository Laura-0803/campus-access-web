# Java 微服务后端

正式 Maven reactor 包含：

- `eureka-server`：19761、19762 双节点注册中心。
- `gateway-service`：19800 API 网关。
- `user-service`：19811 用户、人员、凭证与审计。
- `appointment-service`：19821 预约、审批与二维码签发协调。
- `access-service`：19841 规则、设备、二维码和通行记录。
- `exception-service`：19851 异常与黑名单。
- `aggregation-service`：19861 Dashboard/Report 聚合。

构建：`mvn -f backend/pom.xml clean verify`。

目标 18 表 Schema 位于 `database/refactor/*/V100__target_schema.sql`，只允许在隔离数据库执行。完整启动、停止和双 Eureka 主机标识要求见 `docs/RUNBOOK.md`。正式 Java 演示不启动旧 Express。
