# P3预约微服务设计（当前整理）

P3实际结果见p3-current-state.md。原稿已归档p4-evidence/input/docs/p3-appointment-service-design.md。

模块backend/appointment-service使用锁定Java11/Boot2.3.12/Hoxton.SR12。Controller处理五条映射，AppointmentQueries/AppointmentCommands接口及impl处理业务，Mapper/XML参数化SQL，Appointment保留原16字段，version不序列化。DirectoryContext/WriteContext与Feign封装人员权威数据。

创建用INSERT；审核使用READ_COMMITTED事务、SELECT FOR UPDATE后重新验证实时账号角色，再按旧status+version条件更新；历史与审计outbox同事务。列表保留原过滤、排序及历史姓名/手机号回退。无全表覆盖写或JVM锁。

P3新增用户服务Directory/Audit内部接口默认关闭，受服务密钥保护，身份查询另验证真实Token；未修改P2公开32接口。Gateway仅隔离P3_MODE启用预约路由。隔离Express取消预约路由与旧预约表加载，通过Java只读投影补充聚合。

预约服务独占appointments、appointment_review_history、appointment_outbox。审计稳定eventId去重、持久PENDING/DELIVERED及重试；原创建/审核没有通知写入，未凭空新增消息。最终批准在P3保持503。P4新增签发命令表与恢复是后续授权扩展，不能视为P3已通过闭环。
