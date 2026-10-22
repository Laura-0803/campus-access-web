# P4隔离数据库迁移

不迁移真实数据，不切原库。P4在新campus_p4_access_时间戳schema执行access V001/V002；预约合成库执行V003。DDL从原schema.sql核对6张表字段，保留中文状态、字符串ID/业务时间、残留max_uses/used_count；后两列不进入原QR DTO。无跨库外键。

|表|归属及本轮变化|
|---|---|
|qr_codes|通行独占；原字段保留，Token唯一；appointment_id唯一，防同预约重复有效码；sort_order增为BIGINT以保存前插序|
|access_records|通行独占；原字段保留，personCode从用户接口补齐，不复制用户表|
|gates/devices/access_rules/settings|通行独占；维护联动同本地事务，规则数组以JSON文本兼容|
|access_requests|request_id主键、操作人+规范请求SHA256摘要、原响应；事务去重|
|access_outbox|event_id主键、kind/payload、PENDING/DELIVERED、attempts/next_retry_at/last_error_code|
|qr_issuance|operation_id主键，appointment_id/qr_id唯一，payload_digest、PREPARED/ACTIVE|
|appointment_issuance|预约域命令/恢复Outbox：operationId、appointmentId唯一、actorId、AES-GCM加密恢复凭证、payload、期望version、PREPARE/DECIDED/SUCCEEDED、hold_reason、租约及错误类别|
|p4_faults|仅隔离故障注入计数，默认不启用，不是生产业务表|

脚本顺序：p4-build-schema.py核对原6表DDL；p4-prepare.mjs拒绝覆盖既有私有配置，新建库/合成校门规则设备及受限账号，V001执行两次；p4-migrate-issuance.mjs在精确schema白名单内执行V002/V003两次。运行账号仅DML无DDL；生产及P0/P1备份不写入。已有P2/P3合成人员与预约库继续使用其独立账号，不复制真实账户。

access账号只授本通行schema；新p4l桥接账号仅原合成库exceptions、blacklist、user_domain_outbox表级DML，不能读用户、预约或通行库。Java启动校验回环JDBC、实际catalog及SHOW GRANTS；不接受原业务库名称。内部服务通过HTTP/Feign，不跨库SQL。

恢复Token只以AES-GCM密文存预约操作表，密钥在.private忽略的.p4-local受控配置，不写日志/报告。密钥丢失、原会话失效或角色撤销时不能自动换身份继续审批，应保持HOLD并人工复核；未来正式部署需密钥托管、轮换、备份及数据保留制度，本轮不宣称生产就绪。

真实SQL证据：核心设备CRUD/QR撤销/通行记录；真实触发器在access_outbox INSERT时失败验证记录+请求+事件回滚；预约UPDATE触发器失败验证预备码不可用及决议事务回滚、恢复后复用原码。进程重启前后行摘要一致。原19表数据DDL和备份保全结果见p4-test-evidence.md。
