# P3原预约状态机与实施结果（历史阶段）

依据`campus-access-web/server/routes/appointments.js:15-29,207-306`及原`store.js`，外部真实状态集合只有：`待审核`、`待被访人审核`、`待保卫处审核`、`已通过`、`未通过`。待审核是兼容旧值；原initStore迁移会将其改成待被访人审核，本轮不运行该迁移、不改原历史状态，合成库保留待审核样本。

|当前状态|操作人/前置条件|请求status|新状态|原qrCode|
|---|---|---|---|---|
|创建|visitor/admin；被访人Person.role=student/teacher|无|待被访人审核|创建不签发|
|创建|visitor/admin；被访人Person.role=admin|无|待保卫处审核|原设计直接进入二审，不是漏洞绕过|
|待审核/待被访人审核|student/teacher且hostId等于本人personId|已通过|待保卫处审核|null|
|待审核/待被访人审核|同上|未通过|未通过|null|
|待保卫处审核|admin|已通过|已通过|同步复用/签发真实QR；visitorId为空可null|
|待保卫处审核|admin|未通过|未通过|null|
|已通过/未通过|任意后续审核|任意合法目标|不改变|400阶段错误，不重新批准|

权限前置由原middleware控制：GET允许student/teacher/visitor/admin；POST允许visitor/admin；PATCH仅student/teacher/admin。alumni/guard全部拒绝。审核目标只允许已通过/未通过，其他值400。不存在404；被访人审核他人hostId403；学生/教师不在一审状态400；admin不在二审状态400。审批的归属严格用hostId，不沿用详情查询的host姓名回退。

**错误优先顺序不能随意调整**：路由先校验请求status，再定位预约；目标已通过时先查黑名单，然后才检查归属/阶段。故已终态且新被拉黑的通过请求可能返回黑名单403，而不是重复审核400。拒绝时不检查黑名单。reviewer=当前Person.name或username，reviewedAt为上海文本，comment默认空串；二审覆盖一审同名字段，原系统没有独立审批历史行。

原并发：单Express进程writeQueue串行clone→mutator→检测变表→事务全表重写→发布cache，所以同进程重复审批通常后一请求看到已变状态而400；多个原进程各有缓存，不能推断跨进程安全。本轮不复制全表写回或JVM锁。没有预约DELETE路由，也没有自动删除历史预约动作；人员删除的预约FK为SET NULL，QR的appointment_id FK也为SET NULL且非唯一。

## 批准后Java实现

建议A已获批准。实际状态转换与上表一致，唯一暂停分支是admin最终“已通过”：返回503，原状态/版本/历史不变，不签发二维码。创建拒绝停用被访人403。AppointmentStatus保留五种中文状态。

实现SELECT FOR UPDATE后再次调用user-service检查实时权限，条件UPDATE校验旧status+version；历史及审计outbox同事务。并发审核测试8请求仅1成功，其余阶段错误400。真实触发器故障验证创建及更新回滚。下面保留早期方案背景，已不代表未实施状态。

## 后续签发扩展

P3没有提交最终批准。P4已获单独授权，保留原中文状态和非最终分支，最终成功仍200+appointment/qrCode；未知结果503及重复请求复用持久操作的差异已获审批，详见p4-qr-issuance-design.md。原先的实施前写入计划保存在p4-evidence/input/docs/p3-state-machine.md，不再作为当前未实现说明。
