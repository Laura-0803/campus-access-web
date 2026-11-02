# 课程研发历程总结

本文合并原 P0–P7 的验收记录、设计说明、测试证据、接口清单和风险报告。它只用于课程过程追溯；当前启动、数据库和演示方式以根目录 README 及 `docs/RUNBOOK.md`、`docs/TESTING.md` 为准。

## 阶段总览

|阶段|主要目标|实际结果|
|---|---|---|
|P0|盘点 React/Express、接口、数据库和敏感边界|完成源码、68 个 API、31 张业务表和运行风险基线；确立不连接生产库、不覆盖用户数据的原则。|
|P1|验证课程指定 Spring Cloud 技术栈|在独立实验工程验证 Eureka 双节点、Ribbon 分流、OpenFeign、Hystrix 熔断恢复、Gateway 和 MyBatis；实验工程不进入正式 reactor。|
|P2|迁移用户与认证域|完成 user-service、Gateway 认证入口、人员/账号/人脸/车辆/消息/审计；会话和验证码保存摘要，并保留短信演示与正式模式边界。|
|P3|迁移预约审批域|完成 appointment-service、预约状态机、审批历史、幂等处理、黑名单校验及跨服务调用；为二维码签发设计可恢复状态。|
|P4|迁移通行域|完成 access-service、校门设备、通行规则、二维码签发与核验、通行记录；验证签发重试、竞态和规则拒绝。|
|P4C|迁移异常域|完成 exception-service、异常事件、黑名单、事件去重、处置幂等和审计投递；跨库只使用逻辑关联。|
|P5|前端与业务整合|React 接入 Java API，覆盖六角色页面、扫码模拟、Dashboard/Report 和主要业务闭环；保留 API 返回兼容层。|
|P6|聚合与去 Express 主链路|增加 aggregation-service，Dashboard/Report 改走 Java 微服务；旧 Express 降级为兼容参考，不再进入正式演示链路。|
|P7|课程验收收口|完成架构、数据库、API、运行、测试和演示文档；验证 Maven/React 构建及核心业务链路。|

## 关键架构决策

- 保持 Spring Boot 2.3.12.RELEASE、Spring Cloud Hoxton.SR12、Eureka、Ribbon、OpenFeign、Hystrix、Gateway、MyBatis 和 MySQL，不做框架升级。
- 每个业务服务独立数据库；同库使用外键，跨服务使用逻辑 ID、Feign 校验、幂等键和恢复任务。
- 浏览器统一访问 Gateway `/api`，Controller 和前端协议保持兼容，数据库变化由 Mapper/Service 内部吸收。
- 两个 Eureka 节点必须使用不同主机标识：19761 为 `localhost`，19762 为 `127.0.0.1`，避免 peer 被误判为自身。
- Outbox、Inbox、请求幂等和签发状态不机械删除，而是合并进对应聚合根并保留唯一约束、重试次数和恢复状态。

## 数据库演进

初始四库共 31 表、239 字段。最终目标为 18 表：用户域 8、预约域 2、通行域 6、异常域 2。没有对原始数据库执行破坏性 DDL。

主要合并包括：sessions/verification_codes → auth_tokens，appointment_issuance → appointments，access_requests/access_outbox → access_records，qr_issuance → qr_codes，incident_inbox/requests/outbox → exceptions。`messages` 和 `audit_logs` 因现有 API 与审计链路仍被使用而保留。

目标表在当前业务语义下满足 3NF。人员姓名等重复值只有在预约、审批、通行和异常事件中作为历史快照保留；通行规则拆成原子角色—方式—校门组合。

## 核心验证结论

- Maven reactor 8/8 模块构建成功；项目没有 Java 单元测试源码。
- React/Vite 构建成功；项目没有前端 test 脚本。
- 隔离库完成 18 表创建、回滚到 0、重新应用和重复应用。
- 注册、登录、Token 过期/注销、人员车辆、预约审批、二维码签发/重试/过期/重复使用、通行规则、黑名单、异常生成/去重/处置均完成实际回归。
- Eureka 两节点运行超过租约窗口后注册表一致；关闭一个节点时另一节点继续服务，节点恢复后重新同步。
- Hystrix 实际验证 OPEN → sleep window 后 HALF_OPEN 单探针 → CLOSED；Ribbon、Feign 和 Gateway 同时处于真实调用链。

## 历史风险与最终处理

- 旧 Express 曾承担主链路：现已退出正式演示，但因 npm 兼容命令仍引用而保留源码。
- 旧文档和脚本数量过多：一次性生成器与探针已删除，阶段资料合并为本文。
- 二维码 token 为兼容现有扫码协议仍保存随机高熵明文，这是安全加固项，不影响 3NF 结论。
- 本机不存在旧 `campus_p*` 数据库，因此真实 31 表数据回填和行级校验和不能宣称完成；上线前仍需使用脱敏备份验证。

## 原始证据恢复

如课程复核必须查看某一阶段的逐项报告、清单或测试脚本，可从 Git 提交 `ff90075ae24bf6ec20a4860bca73be384b149b53` 的 `docs/` 目录恢复。当前工程不再要求逐个打开这些历史文件。
