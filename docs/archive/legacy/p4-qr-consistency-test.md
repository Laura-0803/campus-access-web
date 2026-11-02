# P4-B签发一致性实际验证

证据：[issuance-1792421976176.json](p4-evidence/issuance-1792421976176.json)（54项），[races-1792422012890.json](p4-evidence/races-1792422012890.json)（15项），[security-1792421972926.json](p4-evidence/security-1792421972926.json)，[data-final-1792422179265.json](p4-evidence/data-final-1792422179265.json)。

|场景|真实手段及结果|
|---|---|
|正常最终审批|Gateway→appointment→Feign→access→MyBatis，200包含appointment、qrCode；同一真实码随后核验并落通行记录|
|重复及并发批准|10次确认后重放及20个初始并发请求；仅同一持久操作/预约签发槽，未确认返回503，确认才200|
|prepare/activate回执丢失|access事务提交后延迟真实HTTP响应触发超时；503未知，不撤销可能有效码；后台查询同操作恢复|
|预约提交失败|真实MySQL触发器阻止更新，准备码不可通行；解除故障后原持久操作恢复|
|进程崩溃|prepare已提交后终止实际appointment JVM，Gateway503原包装；重启后租约恢复|
|撤销权限/预约变化|原操作人实时角色撤销、预约拒绝，恢复HOLD而非绕过；潜在有效码不自动撤销，但核验实时拒绝|
|旧码绑定不符|类型/人员/有效窗口冲突不返回200，不生成第二码；SIGNING_REJECTED留痕|
|撤码与核验/激活并发|真实行锁并观察INNODB_TRX锁等待；READ_COMMITTED锁后重读，不复活、不错误放行|

操作phase为PREPARE→DECIDED→SUCCEEDED，失败保留phase、attempts、lease、hold_reason、安全错误类别。原session使用AES-GCM加密持久化，恢复使用同一真实主体并重新校验。prepare码为预备态；本地审批决议和activate任务同事务；只有真实ACTIVE回执确认才200。

这些是两个数据库的可恢复状态机，不是全局原子事务。故障未知仍可能部分提交，批准的503精确文案保持“签发结果尚未确认，请勿重复生成凭证，请联系管理员核实”。HOLD未实现管理端人工恢复入口，不得声称无人值守解决全部冲突。未绑定人员分支仍保护；没有202或前端轮询协议。默认公开最终开关仍false；内部链路证据通过后仅私有隔离配置启用，启用记录保存在public-final-enablement报告。

本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。
