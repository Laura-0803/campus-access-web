# 数据库结构与第三范式

## 前后对比

旧四库共 31 表：用户域 10、预约域 4、通行域 10、异常域 7。目标为 18 表：用户域 8、预约域 2、通行域 6、异常域 2。没有对原始数据库执行删除或破坏性 DDL。

18 表选择保留 `messages` 和 `audit_logs`，因为 React/API 与跨服务审计仍有运行时依赖；强压到 16 表会破坏现有功能。完整结构见 [database-refactor/target-schema.md](database-refactor/target-schema.md)，旧 31 表审计见 [database-refactor/table-audit.md](database-refactor/table-audit.md)。

## 3NF 结论

- 规则表一行只表达一个角色、认证方式、校门和时间窗组合，不保存多值列表。
- faces、vehicles 不再保存可由人员关系推导的当前姓名。
- 预约、审批、通行、异常中的姓名字段明确为事件发生时快照。
- 同库关系使用主外键；跨服务数据库只保存逻辑 ID，并由 Feign/Service 校验。
- 请求幂等、签发恢复、异常投递状态合并进对应聚合根，没有直接删除恢复能力。

详细函数依赖和受控缓存边界见 [database-refactor/normalization-proof.md](database-refactor/normalization-proof.md)，ER 图见 [database-refactor/er-diagram.md](database-refactor/er-diagram.md)。

## 迁移与回滚

目标脚本位于 `backend/database/refactor/*/V100__target_schema.sql`，可在空隔离库重复应用。测试库回滚使用 `backend/database/refactor/R100__drop_target_schema.sql`。该回滚脚本禁止对原始或生产数据库执行。
