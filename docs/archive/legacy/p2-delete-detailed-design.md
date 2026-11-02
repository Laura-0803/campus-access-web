# 跨服务人员删除详细设计（待单独审批，未实现、未运行）

本文件仅用于审查。Java没有开放`DELETE /api/people/:id`，没有新增202响应、删除中字段或数据库表。本方案不依赖尚未开发的正式access-service能够运行；文中的“凭证所有者”是未来必须提供的接口能力，当前隔离Express过渡层也**尚未实现**这些删除能力。既有审计outbox不能替代删除Saga。

## 原契约和数据归属

依据原`server/routes/admin.js:347`：管理员删除人员；不存在404，成功200，`{success:true,data:原Person}`；在store写入中移除people、关联users、无所属账号的sessions、faces、vehicles以及`ownerId`或`visitorId`匹配的二维码。原数据库FK对历史通行、预约关联为SET NULL。Java仅能修改用户域表，不能直接DELETE隔离Express/未来通行服务的QR、预约或通行表。

目标完成条件不仅是Java无人员记录：该人员全部账号/会话已失效，人脸和车辆已清理；凭证所有者确认关联QR不可再使用、签发与并发核验已被围栏阻止；历史预约/通行事实保留且关联引用按SET NULL等效规则处理完成。历史日志不得删除。没有这些回执，不返回成功。

## 操作标识、持久化和并发

服务端生成随机UUID operation_id。内部消息使用operation_id+person_id+generation，任何重试复用同一操作ID，禁止每次重试生成新操作。person_id必须与不可重用的generation绑定；本设计禁止复用已删除人员ID，避免迟到撤销影响新人。

用户库拟新增`person_delete_operations`：operation_id CHAR(36) PK；person_id VARCHAR(64)、generation BIGINT、request_digest CHAR(64)、actor_id VARCHAR(64)、state VARCHAR(32)、version BIGINT、safe_response JSON（原Person白名单快照）、qr_receipt_id VARCHAR(64)、receipt_digest CHAR(64)、attempts INT、next_retry_at/lease_until/created_at/updated_at DATETIME(6)、lease_owner VARCHAR(64)、last_error_code VARCHAR(64)。UNIQUE(person_id,generation)，INDEX(state,next_retry_at)。操作记录不FK到将被删除的people，不含密码、Token、验证码、完整QR值；快照属于个人资料，应加密、限制审计权限、设置保存期限。

拟新增`person_delete_fences`：person_id PK、generation、operation_id UNIQUE、state、created_at；有效围栏在完成后保留墓碑，不能因物理删除人员而消失。`person_delete_outbox`：event_id PK、operation_id、kind、payload（仅标识及版本）、state、attempts、next_retry_at；UNIQUE(operation_id,kind)。操作/围栏/撤销会话/outbox必须同一Java事务提交。

凭证所有者库拟新增`credential_revocation_operations`：operation_id PK、person_id、generation、request_digest、state、receipt_id UNIQUE、receipt_digest、revoked_count、references_detached_count、completed_at；UNIQUE(person_id,generation)。另有subject_fences(person_id,generation,operation_id,state)及自身outbox/inbox去重。具体DDL须在能力和契约获批后再形成独立迁移SQL，本轮没有可执行DDL、Mapper或worker。

请求管理员身份从权威会话解析；行锁锁定人员及删除操作。首次请求创建操作并递增内部版本，重复相同请求附着现有操作；相同ID不同主体/摘要拒绝，不能复用操作覆盖目标。多线程/多实例依赖唯一约束和数据库条件更新，不靠JVM锁。worker用有期限租约+version CAS领取；旧worker回执不能回退新状态。接纳删除后，资料、账号重新启用、人脸/车辆新增及所有凭证签发均需检查围栏；这要求修改多个写路径，尚未实施。

## 状态转换和执行顺序

|持久状态|事务/动作|成功后|失败和恢复|
|---|---|---|---|
|不存在|鉴权、参数检查、锁人员、冻结原响应快照|ACCEPTED|未提交前失败可以保持原无写入语义|
|ACCEPTED|同事务写围栏、停用关联账号、删该人员全部会话、写撤销outbox|QR_PENDING|事务失败整体回滚；提交后不再允许自动恢复会话|
|QR_PENDING|发送幂等撤销命令，网络在本地事务外|QR_CONFIRMED|超时仍QR_PENDING，先查远端状态，带退避和抖动重试|
|QR_CONFIRMED|持久回执及摘要，校验主体/版本/计数及权威不可用凭证断言|FINALIZING|回执缺失不能仅凭HTTP200前进|
|FINALIZING|单个Java事务删除sessions→faces→vehicles→users→people，写完成审计、保存结果、标记SUCCEEDED|SUCCEEDED|整笔失败回滚，围栏/QR撤销继续有效，前向重试|
|任意非终态|协议冲突、无法验证回执、预算耗尽|MANUAL_REVIEW|保持隔离并告警，人工查证后继续同一操作；不得解封冒充回滚|
|SUCCEEDED|响应/查询读取持久白名单快照|SUCCEEDED|重复内部命令返回相同回执，不重复删除/审计|

ACCEPTED和隔离处理应在一次本地事务完成，不能出现已提交ACCEPTED但未隔离的可调用窗口。最终业务名称可合并，表中分行描述可观察步骤，不授权拆开原子边界。

凭证所有者处理命令时先持久化主体围栏，再在同一事务撤销全部owner_id/visitor_id关联QR、按历史FK等效规则处理预约/通行引用并存回执。所有扫描、核验、签发、二维码缓存刷新均必须检查围栏；并发核验需按同一subject锁/版本序列化，保证成功回执线性化点之后无新放行。离线门禁不能及时得知撤销时不得声称保证即时撤销；必须阻断离线放行或单独批准明确时延边界。原单库同步删除本身也不能抹去已发生通行事实。

## 部分成功、崩溃和回执丢失

- **QR已撤销但Java最终事务失败**：保留围栏及QR_CONFIRMED，Java域仍停用、会话已撤销。重试最终事务；不重启用二维码，不创建补偿Token。持久回执以同一operation_id可查，不能依赖内存中的HTTP结果。
- **远端提交后网络断开或回执丢失**：先GET内部操作状态；没有记录才重发同一撤销命令。摘要和主体版本不符进入人工处理。重试不会再次扩大目标或重复审计。
- **Java提交后响应丢失**：内部操作已SUCCEEDED；重复请求如何映射外部200/404须按下节批准的契约处理，不将新失败写入已完成操作。
- **进程在任何步骤崩溃**：重启扫描非终态和过期租约，CAS领取后查询远端状态；锁事务由MySQL回滚。outbox与本地状态同提交，避免状态已推进却没有待发送命令。
- **凭证服务长时间不可用**：保持停用，退避重试，达到预算转MANUAL_REVIEW；从不假定撤销成功。告警只带操作ID和错误类别。
- **管理员取消/补偿**：默认仅前向恢复；撤销是不可逆安全动作，自动恢复旧会话/QR不允许。若确需重建人员/重新签发，必须单独授权、重新鉴权/黑名单校验、使用新凭证并审计，不称为原事务回滚。

## 外部同步API的兼容条件及最小差异

只有在原同步请求预算内，各域持久完成并核验全部回执，才可保持200+原Person成功包装。不存在人员且没有历史操作时继续404；未开始操作的鉴权/校验失败可保留原403/400。内部分布式处理不能保证原“失败即完全未发生”的语义：接纳后任何超时都可能已经停用账号或撤销QR，不能返回普通失败却声称无改动。

**待审批的最小调整**：保留原URL、Method及成功200包装；接受后不确定结果使用已有503错误包装、明确“结果待核实，请勿重建凭证”，可通过响应头`X-Operation-Id`及仅管理员查询接口核对持久结果；同一人员/代次的重复请求附着操作，成功后限定保留期内返回原快照200。该方案改变失败含义和原重复删除404语义，查询端点/响应头同样需要审批，当前均未实施。若坚持所有失败都等价无写入，则此Saga不满足条件，接口必须继续暂停，不能用202或前端“删除中”绕过审批。

## 能力交付门槛和测试计划（全部尚未运行）

先以隔离Express凭证所有者的独立适配模块实现协议候选，仅处理合成二维码；不得修改原Express运行环境。正式access-service仍不存在，未来实现必须重跑同一协议测试；不能拿候选模拟器或纯Mock证明正式通行服务一致性。

|测试|真实注入点|验收断言|
|---|---|---|
|正常同步删除|合成Java库+隔离凭证库|原200字段不变，账号/会话/脸/车清理，QR不可用，历史事实保留|
|重复与并发|20次同人员、多worker、多进程|一个代次/一个回执、无重复审计、成功结果一致|
|非法角色/伪造头|Gateway及内部接口|403且操作/数据未变化|
|提交故障|QR成功后Java真实事务注入错误|Java无部分删除，所有凭证仍被隔离，重试终态一致|
|丢包/丢回执|远端真实提交后截断响应|同ID查询/重发返回同一持久回执|
|进程崩溃矩阵|每个事务提交前后强制停止自有进程|重启恢复无永久丢任务、无新Token/QR可用|
|超时/宕机|停止凭证所有者|不返回删除成功、会话拒绝、重试/人工路径可查|
|并发签发/核验|撤销同时签发与扫码|回执点之后不放行，无迟到有效QR|
|引用/权限隔离|原数据+独立账号只读校验|user-service无其他服务写权限、原19表及备份不变|
|过期租约/乱序消息|旧worker及旧generation回执|CAS拒绝状态回退，墓碑防ID复用|
|最终响应丢失|Java已提交，客户端重试|按批准后的重复请求语义返回可验证结果|

本方案的实施、DDL、协议端点、外部失败语义调整和部署切换均等待单独审批。P2本轮只提交设计，不运行人员删除，不进入P3。
