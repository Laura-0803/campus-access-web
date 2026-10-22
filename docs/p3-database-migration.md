# P3隔离数据库迁移（实施结果）

独立版本SQL位于[appointment V001](../backend/appointment-service/src/main/resources/db/migration/V001__appointment_schema.sql)，仅创建appointments。字段保留原id/visitor/visitor_id/visitor_phone/id_number/host/host_id/time/visit_start/visit_end/reason/status/created_at/reviewed_at/reviewer/review_comment，内部sort_order BIGINT保留排序。时间继续VARCHAR，中文状态继续VARCHAR；无跨库FK，无真实数据迁移。

`node docs/p3-prepare.mjs`严格拒绝覆盖配置，创建新的campus_p3_appointment_14位时间戳schema和受限账号；只在新库执行V001两次验证重复执行。7行都是显式生成的合成预约，其中SYN-APT保留P2合成ID作兼容关联；“已通过”只是历史状态fixture，没有生成真实/假QR，也不是审批验收证据。证据见[p3-evidence/database-setup.json](p3-evidence/database-setup.json)。

业务账号只授予该schema SELECT/INSERT/UPDATE/DELETE，无原库、用户库、legacy库权限，无DDL授权。P3 Java Mapper已包含真实SELECT、INSERT、条件UPDATE、历史及outbox写入；真实事务故障回滚证据见p3-test-evidence.md。没有预约删除业务，不新增DELETE。

P3过渡层另建独立p3l_*账号，只授予legacy隔离库中8张未迁移业务表及user_domain_outbox的表级DML；没有legacy旧appointments表、新Java预约库、用户库或原库权限。P2原账号及其授权未改。用真实SELECT权限拒绝证据确认预约数据归Java独占，而非只靠代码约定。

原appointments.host_id/visitor_id外键到people，QR.appointment_id外键到appointments；拆库后不跨库保留FK，标识仍使用原字符串ID。旧P2合成legacy表留作历史，不DROP，不让新适配层读写；原业务19表完全保留。任何未来人员关联清理仍受P2删除审批限制，不能本轮借迁移预约实施删除Saga。

## V002批准后实施

`node docs/p3-migrate-decisions.mjs`在严格校验的P3独立schema中检查version后ALTER，运行V002两次，证据decision-migration.json。新增version、appointment_review_history及appointment_outbox；事件ID主键，预约ID+decision_version唯一历史。MyBatis真实INSERT及条件UPDATE、历史和outbox同事务，SQL故障回滚已真实测试。此段取代上文“仅SELECT”的早期状态。

新建环境先p3-prepare.mjs，再p3-migrate-decisions.mjs，再启动服务；重复V002不覆盖数据。运行账号无DDL，不运行原初始化脚本。

## P4增量扩展

P3已执行V001/V002，审批历史及审计outbox已实现。P4经新授权增加V003签发命令表，保留原表字段及ID，不动原业务库；设计和执行证据另见p4-database-migration.md。原实施前草案保存在p4-evidence/input/docs/p3-database-migration.md。
