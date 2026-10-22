"""Refresh stale P3 descriptions; immutable P3 evidence remains under p3-evidence and archived input."""
from pathlib import Path
R=Path(__file__).resolve().parents[1]
def write(name,text):(R/'docs'/name).write_text(text,encoding='utf-8')
write('p3-current-state.md','''# P3当前状态（P4启动整理）

P3完成三条GET、创建、被访人通过/拒绝及保卫处拒绝，原中文状态及两阶段权限保留。真实证据为P3的322项分套断言和70项Edge回归；没有把Maven无JUnit当作业务通过。

P3结束时最终批准仍503、不提交、不签发。这是历史验收状态，不能把P4的后续实现倒记为P3通过。P4已获授权新增受保护人员/预约查询、幂等签发及恢复；本轮实现状态与实际验收见p4-acceptance.md和p4-test-evidence.md。

P3原始文档与相关源码的启动前副本、SHA256存于p4-evidence/input，原p3-evidence与审批原稿保留。整理只消除“写接口未实现”等过时描述，不覆写原日志、失败结果或测试计数。

P2人员删除继续禁用，删除Saga只保留设计。P4-C不实施。原React、Express及原库不切换。新增内部协议不代表已迁移全部聚合；4条dashboard/reports仍在隔离适配层。
''')
write('p3-appointment-service-design.md','''# P3预约微服务设计（当前整理）

P3实际结果见p3-current-state.md。原稿已归档p4-evidence/input/docs/p3-appointment-service-design.md。

模块backend/appointment-service使用锁定Java11/Boot2.3.12/Hoxton.SR12。Controller处理五条映射，AppointmentQueries/AppointmentCommands接口及impl处理业务，Mapper/XML参数化SQL，Appointment保留原16字段，version不序列化。DirectoryContext/WriteContext与Feign封装人员权威数据。

创建用INSERT；审核使用READ_COMMITTED事务、SELECT FOR UPDATE后重新验证实时账号角色，再按旧status+version条件更新；历史与审计outbox同事务。列表保留原过滤、排序及历史姓名/手机号回退。无全表覆盖写或JVM锁。

P3新增用户服务Directory/Audit内部接口默认关闭，受服务密钥保护，身份查询另验证真实Token；未修改P2公开32接口。Gateway仅隔离P3_MODE启用预约路由。隔离Express取消预约路由与旧预约表加载，通过Java只读投影补充聚合。

预约服务独占appointments、appointment_review_history、appointment_outbox。审计稳定eventId去重、持久PENDING/DELIVERED及重试；原创建/审核没有通知写入，未凭空新增消息。最终批准在P3保持503。P4新增签发命令表与恢复是后续授权扩展，不能视为P3已通过闭环。
''')
write('p3-service-calls.md','''# P3服务调用（当前整理）

P3已真实实现：GET /internal/appointment-context查询身份、hosts和本人范围；POST /internal/appointment-resolve在创建/审核时验证实时用户、被访人及权限。由OpenFeign按user-service服务名，经Eureka和真实Ribbon发现。P3双实例采样及故障证据保留。

创建非空证件与审核通过前调用隔离legacy-bridge的POST /internal/blacklist-check，真实读取其自有黑名单，异常503拒绝写入；不是永远通过的Mock。审计outbox发送POST /internal/appointment-audits，稳定事件ID幂等，失败保留待重试。

401/403等业务拒绝经HystrixBadRequestException不计为基础设施故障；网络故障fallback不可用，业务层503。真实测试区分失败、fallback、open、短路及恢复。内部接口密钥保护，身份接口另校验Token；Gateway剥离伪造身份头。

Express业务到Java预约投影是只读SQL，不反向请求用户；黑名单专用处理器不调用预约投影，避免递归。P3无QR签发、无跨库写。P4新增access协议另见p4-qr-issuance-design.md。历史原稿位于p4-evidence/input/docs/p3-service-calls.md。
''')
p=R/'docs/p3-state-machine.md';s=p.read_text(encoding='utf-8');s=s.replace('# P3原预约状态机与尚未实施的写入计划','# P3原预约状态机与实施结果（历史阶段）');marker='## 实施前设计背景';s=s.split(marker)[0]+'''## 后续签发扩展

P3没有提交最终批准。P4已获单独授权，保留原中文状态和非最终分支，最终成功仍200+appointment/qrCode；未知结果503及重复请求复用持久操作的差异已获审批，详见p4-qr-issuance-design.md。原先的实施前写入计划保存在p4-evidence/input/docs/p3-state-machine.md，不再作为当前未实现说明。
''';p.write_text(s,encoding='utf-8')
p=R/'docs/p3-database-migration.md';s=p.read_text(encoding='utf-8');s=s.replace('# P3隔离数据库迁移与未实施写入','# P3隔离数据库迁移（实施结果）');s=s.replace('当前Java Mapper只有真实SELECT list/one，没有INSERT/UPDATE/DELETE；数据库写入只由受控的合成fixture准备脚本完成，不能冒称MyBatis CRUD/事务写入通过。','P3 Java Mapper已包含真实SELECT、INSERT、条件UPDATE、历史及outbox写入；真实事务故障回滚证据见p3-test-evidence.md。没有预约删除业务，不新增DELETE。');idx=s.find('## P4签发设计（未执行）');s=s[:idx]+'''## P4增量扩展

P3已执行V001/V002，审批历史及审计outbox已实现。P4经新授权增加V003签发命令表，保留原表字段及ID，不动原业务库；设计和执行证据另见p4-database-migration.md。原实施前草案保存在p4-evidence/input/docs/p3-database-migration.md。
''' if idx>=0 else s;p.write_text(s,encoding='utf-8')
print('Refreshed P3 current-state documentation; original approval/test evidence retained')
