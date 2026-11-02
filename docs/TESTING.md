# 测试方法与实际结果

以下均为 2026-11-02 在隔离数据库和本机回环端口实际执行的结果，未执行项不标记为通过。

## 构建与数据库

- `mvn -f backend/pom.xml clean verify`：8/8 reactor 模块成功；项目没有 Maven 测试源码，因此结果代表编译和打包通过。
- `npm run build`：Vite 构建成功，共转换 2476 个模块；项目没有前端 test 脚本。
- 目标 Schema：V100 创建 18 表，R100 回滚到 0 表，再次及重复执行 V100 均稳定为 18 表。
- 原始 `campus_p*` 数据库在本机不存在，真实 31 表数据回填与行级对账未执行。

## 业务回归

已通过注册、登录、Token 过期与注销、人员车辆、预约创建和重复审批、二维码签发恢复、幂等重放、单次消费、过期拒绝、通行记录、黑名单、异常生成去重及重复处置。全部写入 `campus_refactor_*` 隔离库；测试结束后临时库和受限测试账号已删除。

## Eureka 高可用

两个注册中心分别使用 `REGISTRY_HOST=localhost` 和 `REGISTRY_HOST=127.0.0.1`，互为 peer。持续运行超过 90 秒租约过期窗口后，19761 和 19762 均包含 `CAMPUS-REGISTRY` 双实例以及 UP 的 `USER-SERVICE`、`EXCEPTION-SERVICE`，未出现业务实例租约丢失。

随后停止 19761，19762 继续保留两个业务服务并可查询；重启 19761 后，它从存活节点重新同步完整注册表，两节点再次一致。

上次 19761 注册表不完整的根因是手工启动第二节点时遗漏独立 `REGISTRY_HOST`。正式入口 `npm run dev:java` 已固定双主机标识。

## Hystrix 熔断恢复

在 exception-service 的 `DirectoryClient#resolve` 上实际执行：

1. 停止 user-service，连续 6 次请求得到确定性 503 fallback。
2. 指标显示 `open=true, requests=6, errors=6`，确认进入 OPEN。
3. 重启 user-service，等待 3 秒 sleep window；此时仍为 `open=true`。
4. 首个有效请求作为 HALF_OPEN 单探针返回 200。
5. 随后指标变为 `open=false, requests=1, errors=0`，确认恢复为 CLOSED。

同时确认 Feign、Ribbon `ZoneAwareLoadBalancer`、`RoundRobinRule` 和 Gateway 路由仍在正式调用链中。
