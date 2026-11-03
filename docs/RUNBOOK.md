# 运行手册

需要 JDK 11、Maven、Node.js/npm、MySQL，以及四个隔离数据库和本机私密环境配置。不要提交 `.env`、数据库备份、真实人员数据或密码。

正式课程演示使用 Java 微服务入口，不启动旧 Express：

```bash
mvn -f backend/pom.xml clean package
./start-all.sh
```

也可以进入 `campus-access-web/` 执行 `npm run start-all`。`start-all` 会给两个 Eureka 节点设置不同的主机标识：19761 使用 `localhost`，19762 使用 `127.0.0.1`。两节点不能使用相同 `REGISTRY_HOST`，否则 peer 识别会退化为单向复制，远端租约最终过期。

启动成功标准：两个 Eureka 节点都能看到全部 UP 实例；Gateway、四业务服务和聚合服务健康；`/api/roles` 可通过 Gateway 访问；旧 Express 端口 3001 不监听。按 Ctrl-C 后确认 19761、19762、19800、19811、19821、19841、19851、19861 均已关闭。

常见故障：数据源错误时检查 `P2_DB_*`、`P3_DB_*`、`P4_DB_*`、`P4C_DB_*`；注册表不一致时检查两个注册中心是否使用了不同 `REGISTRY_HOST`；Feign 503 时检查实例、Ribbon server list 和 Hystrix 指标。必须使用 JDK 11，不升级 Spring Boot 2.3.12 或 Hoxton.SR12。

数据库迁移只对隔离库执行。目标 18 表使用 `backend/database/refactor/*/V100__target_schema.sql`，回滚使用 `backend/database/refactor/R100__drop_target_schema.sql`。
