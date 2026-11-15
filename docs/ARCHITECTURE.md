# 系统架构

浏览器 → Vite :5173 → campus-gateway :19800 → 业务服务。
注册中心：Eureka :19761、:19762 双节点。

- user-service :19811：身份、账号、人员、会话、车辆、人脸、通知和审计。
- appointment-service :19821：预约、审核、签发协调。
- access-service :19841：设备、校门、规则、凭证、通行。
- exception-service :19851：事件、黑名单、处置。
- aggregation-service :19861：通过 Feign 汇总以上服务，无数据库连接。

四个业务服务使用同一个 MySQL 数据库 campus_access_dev，保留独立账号和连接池。表按业务归属维护，服务间仍通过 Eureka/Feign 调用，保留 Ribbon、Hystrix、Gateway 和原事务/幂等边界。没有将服务合并，也没有改成跨服务直接写表。

统一库 18 张业务表及 3NF 分解见 DATABASE.md。启动配置见 ENVIRONMENT.md。历史 migration-bridges 和实验工程保留，不参与正式启动。
