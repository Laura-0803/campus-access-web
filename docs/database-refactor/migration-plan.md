# 数据迁移与实施计划

本轮已在四个 `campus_refactor_*` 隔离数据库执行 18 表 Schema、应用回归、回滚和重复应用验证；原始数据库未连接、未修改。由于本机不存在旧 `campus_p*` 数据库，真实 31 表数据回填与新旧数据校验仍须在取得脱敏备份后执行，不能伪造为已完成。

## 总体策略

采用 expand → backfill → dual-read/verify → switch → contract。每个微服务独立迁移，同库使用事务和外键，跨库只用逻辑 ID、Feign 校验、唯一幂等键及恢复任务。旧表至少保留一个验收周期并改为只读归档，确认回滚窗口结束后才允许删除。

## 实施顺序

### 0. 基线与数据画像

1. 冻结 Schema 版本，导出仅结构备份和脱敏统计。
2. 统计 NULL、重复候选键、孤儿 FK、非法时间、多值分隔格式、各状态枚举。
3. 对每张表记录行数、校验和、最小/最大时间和关键状态计数。
4. 建立 31→18 字段级映射；任何无法解释的数据进入隔离报告，不静默丢弃。

验收：四库备份可恢复；所有候选唯一键冲突有清单；不修改现有库。

### 1. 用户域 10→8

1. 新建 `_v2` 的 roles、people、users、auth_tokens、faces、vehicles、messages、audit_logs。
2. role_profiles 的静态角色字段迁入 roles；个人资料按 person_id 归 people，冲突人工确认。
3. sessions/verification_codes 分类型写入 auth_tokens；会话 token 只迁摘要。若无法从明文安全转换，应让旧会话自然过期后切换。
4. faces/vehicles 去除名称副本，用 person/owner ID 校验装配响应。
5. 先修改 Mapper 为双读比对，再切写 v2；最后改 Feign directory 输出。

风险与回滚：认证风险最高。保留旧 Session 校验器作为限时 fallback；验证码限流、错误五次锁定、过期、重用、退出失效必须全部通过后切换。

### 2. 预约域 4→2

1. 建 appointments_v2 和 appointment_reviews_v2。
2. appointments 字符串时间按明确格式转换为 DATETIME；非法值进入拒绝表。
3. appointment_issuance 按 appointment_id 一对一合并；若存在多 operation，按状态机和时间选权威行并人工审计其余行。
4. review_history 直接迁移，保留 decision_version 唯一性。
5. appointment_reviews 保存审批权威历史；audit_logs 仅保存跨服务演示所需的审计投影。

风险与回滚：签发恢复不能丢失。切换前对所有非终态 operation 做恢复演练；回滚时仍由旧 issuance 表继续 lease。

### 3. 通行域 10→6

1. gates/devices/settings 迁移，gate 文本解析成 gate_id；无法匹配不得自动造假关联。
2. 展开 access_rules：每个 methods×gates 组合生成一行原子规则；将 allowed_time 解析为 TIME 起止。展开前后按角色计算策略结果做等价测试。
3. qr_codes 与 qr_issuance 按 appointment/operation/qr 唯一关系合并；token 改摘要需要同时修改扫码验证流程。
4. access_requests 合入 access_records：保留 request_id、digest、response；验证相同请求重放返回一致结果。
5. access_outbox 的 PENDING 状态映射到 access_records.exception_sync_status；新恢复任务扫描 PENDING/RETRY。
6. p4_faults 不迁数据；故障注入改测试 profile。

风险与回滚：策略展开、二维码签发、扫码幂等均属高风险。需新旧策略对同一输入全量差分；签发 prepare/activate 重放；进程在事务提交后、Feign 前后强制终止并验证恢复。

### 4. 异常域 7→2

1. incident_inbox 与 exceptions 按 event_id 合并；source_event_id 加唯一约束。
2. incident_requests 中最后一次成功幂等键合入 exception；并发处置改 `WHERE id=? AND version=?`。
3. actions 多值解析：16 表方案只迁最终处置摘要。若课程或数据保留规则要求动作全历史，停止 16 表方案并新增 exception_actions。
4. blacklist 先清理同 credential 多条有效记录，再启用“仅一个有效版本”的唯一策略。
5. incident_outbox 合并为 exceptions 的审计投递状态并继续投递 audit_logs；incident_locks 用事务锁替代；incident_faults 不迁。

风险与回滚：动作历史可能丢失，必须由业务负责人确认裁剪；未确认时不得删除旧 exceptions.actions 或旧表。

### 5. API 与前端兼容

数据库字段变化不得直接泄露到 API。Service 层继续组装原有 `ownerName/personName/visitor/host` 返回字段，React 无需第一批同步修改。完成稳定切换后再决定是否清理兼容 DTO。

必须回归：六角色登录/退出、人员与账号、预约创建和两级审批、二维码签发与重放、扫码通行、异常生成和处置、黑名单拦截、Dashboard/Report、服务降级。

## 删除辅助表后的可验证一致性方案

|被删除能力|替代机制|故障注入验证|
|---|---|---|
|appointment_outbox|appointment_reviews 是事实源；不再复制中央 logs|审批准入提交后关闭 user-service，预约历史仍完整|
|appointment_issuance|appointments 中 phase/version/lease|在 prepare 前后、activate 前后杀进程，恢复任务最终得到唯一 QR|
|access_requests|access_records.request_id UNIQUE|并发发送相同 key；只产生一条记录且响应等价|
|access_outbox|access_records.exception_sync_status + retry|异常服务停机后产生拒绝记录；恢复后最终只有一个 exception|
|qr_issuance|qr_codes.operation_id/appointment_id UNIQUE|重复 prepare/activate 不新增凭证、不重复计数|
|incident_inbox|exceptions.source_event_id UNIQUE|同一事件并发投递 20 次，仅一条异常|
|incident_requests|exceptions.version + last_request_id UNIQUE|重复/并发处置不重复改变状态|
|incident_locks|黑名单有效凭证唯一约束|并发加入同证件，只成功一条，另一条返回确定性冲突|
|fault tables|test profile 内存故障注入|生产 profile 无注入端点；测试 profile 可重复演示 Hystrix|

## 验收门槛

- 新旧表逐表行数与映射后校验和一致；被合并表有一对一/一对多对账。
- 规则展开前后对全部角色、校门、方式和边界时间结果一致。
- 所有候选键和 FK 无冲突、无孤儿；跨库引用由批量 Feign/离线校验报告覆盖。
- Maven、React 构建和现有回归全部通过；新增崩溃恢复、并发幂等测试通过。
- 至少一次四库全量恢复演练；旧库只读保留至回滚窗口结束。

## 回滚方案

1. 切换使用独立 feature flag；旧 Mapper 和旧表保持可读。
2. 双写阶段记录 v1/v2 差异；出现不一致立即停止 v2 写入，流量切回 v1。
3. 切换后回滚时，把 v2 期间新写入按反向映射补回旧表；无法无损反向映射的功能在切换窗口暂时只读。
4. 不使用 `DROP TABLE` 作为上线步骤；旧表先重命名/权限只读，验收和备份到期后另行审批删除。

## 决策点

- 若必须保留数据库审计日志：增加 audit_logs，目标 17 表。
- 若必须保留异常多动作历史：增加 exception_actions，目标 17 表。
- 两者都需要：目标 18 表。这比把历史塞回 JSON/TEXT 更符合 3NF，也更安全。
