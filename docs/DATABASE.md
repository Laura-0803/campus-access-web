# 统一数据库设计与迁移

当前运行目标为一个 MySQL 数据库 `campus_access_dev`，18 张业务表；微服务、端口、HTTP API 和 Feign 调用关系保持原样。四个服务仍保留独立账号与连接池，四组 JDBC URL 指向同一数据库，账号仅有 DML 权限，禁止 DDL 和全局权限。

权威建表入口：`backend/database/unified/V001__unified_schema.sql`。仅对新空库执行；旧 `refactor/` 和阶段 migration 文件保留作历史资料，不能混合执行。

| 领域/服务 | 表 |
|---|---|
| 身份 user-service | role_definition、person_profile、user_account、authentication_token、biometric_credential、registered_vehicle、notification_message、audit_log |
| 预约 appointment-service | visit_appointment、appointment_review |
| 通行 access-service | campus_gate、access_device、passage_rule、passage_setting、access_credential、passage_record |
| 安全 exception-service | security_incident、blacklist_entry |

## 3NF 与函数依赖

- 每张表以 id 或稳定业务编码作为主键；角色和账号分离，人员与账号分离，车辆、人脸与人员分离。账号不复制人员姓名、院系等主数据。
- role_code → 角色定义；person_id → 人员主档；user_id → 账号；gate_id → 校门。设备、规则通过 gate_id 引用校门，不复制校门名称和位置。
- 通行规则一行只表达一个角色、方式、校门、时间窗口组合。原 methods/gates 数组和逗号字符串被拆为多行，没有非原子的主数据集合。
- 账号用户名、人员业务编号、车牌、凭证 token、签发 operation_id、审批版本使用候选键或唯一约束，防止同一事实重复。
- 历史预约/审批/通行/安全事件中的 *_snapshot 是事件发生时的事实，不代表当前人员或校门主档；因此不会产生“当前 person_id 决定历史姓名”的传递依赖。历史事实不会随主数据变更回写。
- 时间、状态、重试、租约和版本字段依赖其所属事实/操作主键。JSON 仅保存幂等响应、审计/投递载荷，不作为可独立维护的主数据集合。
- last_access_at 为已有车辆业务最近通行时间字段；它是车辆级的聚合缓存，明确以 passage_record 为权威来源，不以缓存宣称消除所有物理冗余。
- active_credential 是数据库生成列，用于有效黑名单唯一约束，不由应用重复维护；掩码证件不是完整证件号，不施加全号唯一约束。

合库本身不等于 3NF。以上分解及函数依赖是设计依据；业务状态和历史快照的语义必须保留，不为减少表数合并不同实体。

## 关联与边界

保留已有真实外键：账号→人员/角色、令牌→账号、人脸/车辆→人员、通知→角色、审批→预约、设备/规则/记录→校门。跨服务历史主体允许人员删除/缺失，仍通过原服务校验；不新增可能破坏原删除流程的强制外键。单数据库不意味着服务能绕过 HTTP API 直接修改其他领域数据。

## 本机迁移

`tools/migrate-unified-local.mjs` 从旧四阶段库复制至新统一库，自动备份所有旧表的 DDL、全部行及 .env 至 `.private-backups/unified-时间/`。备份含私密资料，已由 .gitignore 忽略，禁止上传。旧库不删除、不修改。

该脚本仅针对已核对的本机阶段库名称；换机器先调整 source 映射。需要现有 CAMPUS_DB_* 管理员凭据；不输出密码。已有非空目标库时拒绝再次迁移。数据插入在同一事务执行；失败回滚数据，空目标 DDL 保留用于诊断。DDL 本身不受事务回滚保护。

适配包括：旧 password → password_hash（原样保留哈希）、角色/人员字段重命名、sessions/verification_codes 合为 authentication_token、审批和签发状态合并、规则笛卡尔拆分、校门名称→ID、历史事件名快照。

旧无效时间会话不转成有效会话，完整原记录在备份中；用户需重新登录。历史“暂无”车辆时间转 NULL。缺失预约结束时间、黑名单建立时间保持 NULL，不虚构时间。不存在的校门保留在历史 gate_name_snapshot，gate_id=NULL，不伪造校门主数据。旧角色档案中的名称/人员信息改由人员和账号关联得到，完整旧档案保留在备份。

三个旧 outbox 当前均无 PENDING；不重放已交付的历史事件。旧测试 fault、锁表、完整处置动作历史和无法一一映射的历史幂等辅助信息保存在旧库与备份；新系统沿用 ed18861 已定义的最近处置/幂等模型。不得将其描述为所有历史辅助行无损转换。

## 回滚

停止新进程，恢复备份中的 environment.env 与 f5178a2 源码/对应构建产物，再按旧配置启动；不能让 ed18861 Mapper 直接访问旧阶段库。新旧库均保留。恢复前如新系统产生新业务数据，应先备份并制定增量回迁，不能直接覆盖。
