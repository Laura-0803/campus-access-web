# P4通行服务设计

正式独立模块backend/access-service，Controller（QR、记录、配置三个公共控制器）、AccessOperations接口与实现、AccessPolicy、DAO/MyBatis XML、Entity字段模型、DTO/身份边界、Feign客户端及统一异常处理分层。实际SQL映射使用字段白名单Map保持原null/数组/文本兼容；未把字段模型类冒称为全部Mapper的强类型返回。

只访问通行库6张业务表：qr_codes、access_records、devices、gates、access_rules、settings。新增access_requests记录同一次核验的请求摘要/原响应，access_outbox持久化通行事件，qr_issuance持久化签发幂等槽。p4_faults仅隔离故障注入，默认开关关闭，实验启动器显式开启；不作为业务规则。

原15接口迁移及新增撤销入口见p4-api-migration.md。保持/api、Bearer/x-campus-token、顶层total、中文状态、201/200及原错误包装。QR verify只核验；simulate成功/拒绝均写通行记录，拒绝输出异常事件；规则validate只读。无设备参数时保留原规则，显式deviceId增加在线及校门匹配检查。

MyBatis使用绑定参数及静态表白名单，无客户端SQL片段；INSERT/UPDATE/必要DELETE逐行执行，不复制store.js全表快照或重写。二维码行锁协调撤销/扫码；请求唯一键与摘要绑定真实操作人；同键响应重放前再次验证实时安全状态。状态变化不能借缓存旧成功放行。

身份由user-service受保护内部接口实时解析；普通身份头和body.role不可信。人员、车辆、人脸元数据由其自身MyBatis提供，车辆通行时间和审计通过既有受保护access-events接口回写；通行服务不读写用户表。访客二维码另查appointment纯查询；下游异常503拒绝，不伪造身份或名单。

二维码SecureRandom 32字节；签发槽按appointmentId唯一，命令按operationId/摘要校验；既有码复用必须核对类型、所属人与窗口，拒绝错误归属码冒充成功。实际人员角色为visitor时，其他码型不能绕过预约验证。撤销保留墓碑，不以重试重新启用。

事件Outbox与记录同事务，接收异常以E+recordId主键去重；审计以L+recordId去重，目标只记录recordId，不记录凭证。异常/用户服务均确认后标DELIVERED；否则保留尝试次数、重试时间及安全错误类别。不是全局原子提交或恰好一次承诺。

Gateway仅P4_MODE=true启用lb://access-service，P3预约路由保留；未迁移聚合和异常仍在P4隔离适配器。适配器不再挂载通行/设备/凭证写路由，不读取旧通行表；从Java读当前只读投影。角色/归属校验仍由原路由及Java认证权威执行。内部投影和授权查询不反向调用聚合，避免递归。

局限：同MySQL实例/单机多进程不等同物理高可用；框架旧版仅回环隔离；实时远端校验与本地提交仍有分布式时间窗，不能声称全局原子授权；原姓名/电话历史回退及非法旧时间配置兼容行为需正式切换前专项审查。
