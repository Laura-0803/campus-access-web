# 31 张表逐表审计

## 审计口径

本审计基于 `current-database-schema.md`、四域全部 DDL/MyBatis Mapper、161 个 Java 源文件、Feign 接口、Gateway 路由及 React `api/client.js` 和页面调用。判断依据是实际读写路径和业务语义，不仅依据字段名称。当前四库共 31 表、239 字段；aggregation-service 无数据库。

“3NF”列中的“有条件”表示字段可解释为不可变业务快照时成立，若把它解释为当前主数据副本则不成立。单列主键表天然不存在部分主键依赖；复合键仅 `verification_codes(purpose, phone)`。

## 用户服务：10 表

|表|用途与键|重要函数依赖及范式|实际引用|重构判断与风险|
|---|---|---|---|---|
|`roles`|角色字典；PK/候选键 `role_key`|`role_key → label`；1NF/2NF/3NF 均满足|`UserMapper.roles`、`RoleController GET /api/roles`、Profile/Auth 服务|保留；成为 `users.role_key` 外键。|
|`role_profiles`|六角色演示资料投影；PK `role_key`，无 FK|`role_key → person_id,name,title,role_value,type,avatar,status`；`role_value`重复决定项，姓名/状态若来自 person 则有传递依赖，严格 3NF 不成立|`UserMapper.profiles`、`ProfileController /api/profiles/{role}`、`ProfileServiceImpl`、React 资料页|删除并合并静态角色展示字段到 `roles`；个人资料从 `people` 读取。风险是六个演示角色资料契约需适配。|
|`people`|人员主数据；PK `id`，候选键 `code`|`id →` 全部人员属性；当前把学生、教工、访客、校友的可选字段放同表，存在大量 NULL，但没有已证明的非主键决定关系；1NF/2NF/3NF 基本满足|`UserMapper/DomainMapper`、`Person*Controller /api/people`、Auth/Admin/Profile、三个业务服务的 directory Feign、React 人员/预约页面|保留并收窄字段；`role`移到 users，`face_status`改查询派生，`host/gate`若仅展示则删除。类型专属字段暂留，避免为稀疏列过度拆表。|
|`users`|登录账号；PK `id`，候选键 `username`，FK `person_id→people.id`|`id ↔ username` 决定密码、角色、状态；`account_type`若恒由 role 决定则冗余，现有代码未证明强约束；基本 3NF|`UserMapper/DomainMapper`、Auth/Admin/Internal Controller、`/api/auth/**`,`/api/users/**`，Feign 身份上下文|保留；角色改 FK，`account_type`删除或定义为独立认证渠道。|
|`sessions`|服务端登录会话；PK `token`，FK `user_id→users.id`|`token → user_id,role,created_at,expires_at`；`role`可由 user 推导，若不是登录时权限快照则违反 3NF|`UserMapper.session/insert/delete`、Auth/SessionService、所有鉴权和跨服务 token 校验|与验证码合并为 `auth_tokens`；保存 token 摘要，不保存明文。风险高，需认证回归。|
|`verification_codes`|短信验证码及尝试次数；PK `(purpose,phone)`|完整复合键决定其他字段，无部分依赖；满足 2NF/3NF；但用同一手机号覆盖并发验证码是业务策略|`UserMapper.code/saveCode/deleteCode/codeAttempt`、`CredentialServiceImpl`、`/api/auth/send-code/reset-*`|并入 `auth_tokens`，用 `token_type+subject+purpose` 唯一键。需验证限流、过期、重放。|
|`faces`|人员人脸槽位；PK `id`，候选键 `(person_id,slot_key)`，FK `person_id`|`id→person_id,status,file_name,image_url,slot,label,updated_at`；`person_name`由 person_id 推导，违反严格 3NF|`UserMapper/DomainMapper`、`FaceController /api/faces`、Profile/Dashboard|保留，删除 `person_name`；显示时服务层关联 people。风险是列表响应需补装配。|
|`vehicles`|人员车辆；PK `id`，候选键 `plate_no`，FK `owner_id`|`id→owner_id,plate_no,status,last_access`；`owner_name`由 owner_id 推导，违反 3NF|`UserMapper/DomainMapper`、`VehicleController /api/vehicles`、通行事件更新、React 车辆页|保留，删除 `owner_name`，`last_access`可由记录推导但为高频缓存；若保留必须明确为缓存而非权威值。|
|`messages`|公告消息；PK `id`|`id→title,content,target_role,read_flag,created_at`；`read_flag`放在广播消息上无法表达逐用户已读；`target_role`若存多值违反 1NF|`DomainMapper/UserMapper`、`MessageController /api/messages`、React AnnouncementBar/消息管理|课程核心不要求，删除。若必须保留公告，应另设计 message 与 receipt 两表，会增加表数。风险是公告页面需移除或改静态配置。|
|`logs`|审计日志；PK `id`|`id→time,actor,role,action,target,result`；单条事件原子，形式 3NF，但 actor/role 为快照|`UserMapper/DomainMapper`、`AuditController /api/logs`、各域 audit Feign、React 日志页|删除数据库业务日志，改结构化应用日志并设置滚动保留；安全审计要求较高时应保留，此时目标变为 17 表。|

## 预约服务：4 表

|表|用途与键|重要函数依赖及范式|实际引用|重构判断与风险|
|---|---|---|---|---|
|`appointments`|预约聚合根；PK `id`，逻辑引用 visitor/host|`id→`预约时段、原因、状态及快照；姓名/电话/证件号在“提交时快照”语义下 3NF，在“当前人员副本”语义下冗余|`AppointmentMapper`、`AppointmentCommandsImpl/FinalApprovalService`、`AppointmentController /api/appointments`、Aggregation、Access Feign、React 预约页|保留；明确快照列命名，时间改 DATETIME；加入签发恢复状态。|
|`appointment_review_history`|不可变审批事件；PK `event_id`，候选键 `(appointment_id,decision_version)`|事件键决定动作、前后状态、操作者快照和时间；满足 3NF|`AppointmentMapper.insertHistory`、审批命令、内部投影|保留并改名 `appointment_reviews`；操作者姓名/角色明确为审计快照。|
|`appointment_outbox`|审批审计事件投递；PK `event_id`，索引 state/retry|`event_id→appointment_id,payload,state,...`；本身 3NF|`AppointmentMapper.insertOutbox`、`AuditDelivery` 定时任务、user-service AuditClient|删除；审批历史已经是持久事实，定时任务按 `audit_synced_at` 扫描 reviews，或直接不再复制到已删除的 logs。风险是跨服务审计副本不再存在。|
|`appointment_issuance`|最终审批到二维码签发的 Saga 状态；PK `operation_id`，候选键 `appointment_id`|operation 与 appointment 一一对应，字段均依赖 operation；形式 3NF，但与 appointment 生命周期一对一且不可独立存在|`IssuanceMapper`、`FinalApprovalService` 恢复任务、`/internal/final-approvals/**`|合并进 appointments 的 issuance 状态列。风险高；必须保留乐观锁、租约恢复和唯一二维码约束。|

## 通行服务：10 表

|表|用途与键|重要函数依赖及范式|实际引用|重构判断与风险|
|---|---|---|---|---|
|`gates`|校门主数据；PK `id`|`id→name,campus,location,open_time,status`；若 name 非唯一仍满足 3NF|`AccessMapper`、Configuration/Internal Controller、AccessPolicy、`/api/gates`、React 规则页|保留；时间窗口拆为 TIME 字段。|
|`devices`|门禁设备；PK `id`，当前 gate 是名称/文本|`id→name,type,gate,status`；若 gate 表示 gate.name，则存在可推导冗余且无引用完整性|`AccessMapper`、ConfigurationController `/api/devices`、Aggregation、React 设备页|保留，改 `gate_id` FK 到 gates。|
|`access_rules`|通行策略；PK `id`|`id→role,methods,allowed_time,gates,max_uses,status`；methods/gates 为业务多值文本时违反 1NF，allowed_time 也可能是复合值|`AccessMapper`、AccessPolicy、ConfigurationController `/api/access-rules`、React 策略页|保留但改为“一行=角色×方式×校门×时段”的原子规则；避免额外两张关联表并满足 1NF。数据行会增多但表数不增。|
|`settings`|全局通行参数；PK 固定 `main`|`id→`开门时间、二维码期限、阈值；形式 3NF，但单行万能配置表耦合多个概念|`AccessMapper`、AccessPolicy、Internal/Aggregation；没有独立公开 Gateway 路由|保留为 `access_settings`，是第 16 表；若改应用配置可降到 15 表，但会失去运行时配置。|
|`qr_codes`|通行凭证；PK `id`，候选键 token、appointment_id|`id→`凭证状态/有效期/次数；owner_name 由 owner_id 推导，visitor_id 与 owner_id 语义重叠|`AccessMapper`、`QrController /api/qr-codes`、IssuanceService、扫码流程、Aggregation、React QR 页面|保留；仅保留 subject_id/subject_type 与 appointment_id，删除姓名副本，时间改 DATETIME。|
|`access_records`|不可变通行事实；PK `id`|`id→occurred_at,person_id,method,gate,status`；name/type/gate 名称若非历史快照会传递依赖|`AccessMapper`、RecordsController `/api/access-records`、AccessOperations、Aggregation、React 通行页|保留；用 `gate_id`，人员姓名/类型明确为事件快照或查询装配；增加异常同步状态供恢复。|
|`access_requests`|扫码幂等请求缓存；PK `request_id`|`request_id→digest,response_json`；满足 3NF|`AccessMapper.request/reserve/complete`、扫码服务|删除并把 `request_id/digest` 放入 access_records 唯一约束。风险是失败响应不再永久缓存，客户端需安全重试。|
|`access_outbox`|异常事件投递；PK `event_id`|`event_id→kind,payload,state,retry...`；满足 3NF|`AccessMapper.event`、`EventDelivery` 定时任务、ExceptionEventClient|删除；在 access_records 保存 `exception_sync_status/attempts`，定时扫描恢复。必须验证宕机窗口。|
|`qr_issuance`|二维码签发幂等阶段；PK `operation_id`，候选键 appointment_id、qr_id|三个候选标识一一对应，阶段依赖 operation；形式 3NF，但与 qr_codes 一对一|`IssuanceMapper`、`IssuanceService /internal/issuance/**`|合并 qr_codes，使用 unique appointment_id/operation_id。需验证 prepare/activate 重放。|
|`p4_faults`|课程故障注入计数；PK `name`|`name→remaining`；3NF，但不是业务数据|`IssuanceMapper.consumeFault`、故障测试配置|从正式库删除，改测试 profile 内存故障注入。生产风险低，课程 Hystrix 演示仍需保留测试实现。|

## 异常服务：7 表

|表|用途与键|重要函数依赖及范式|实际引用|重构判断与风险|
|---|---|---|---|---|
|`exceptions`|异常事件与处置；PK `id`|`id→`事件、风险、处置字段；`actions`若为动作数组违反 1NF，person/gate 可作为事件快照|`IncidentMapper`、`IncidentServiceImpl`、`ExceptionController /api/exceptions`、Aggregation/React|保留；去掉 actions 多值字段，将最近/最终处置作为原子列；如需完整多次动作历史则必须新增 actions 表，目标变 17。|
|`blacklist`|黑名单生命周期；PK `id`，当前 credential_no 无唯一约束|`id→credential,reason,status,...`；name/type若由 credential 决定是快照；基本 3NF|`IncidentMapper`、BlacklistController `/api/blacklist`、Appointment/Access/User Feign、React 黑名单页|保留；增加有效记录唯一策略和时间类型。|
|`incident_inbox`|接收通行异常事件去重；PK `event_id`|`event_id→digest,exception_id,received_at`；3NF|`IncidentMapper.inbox/insertInbox`、`IncidentServiceImpl.ingest`|删除；把 source_event_id/digest 置于 exceptions 并加唯一约束。|
|`incident_outbox`|向 user-service 投递审计；PK `event_id`|`event_id→payload,state,retry`；3NF|`IncidentMapper.outbox/due/claim/...`、定时投递|删除，因为目标删除 logs；若保留中央审计则需统一事件表。|
|`incident_requests`|异常处置幂等响应；PK `request_id`|`request_id→digest,response`；3NF|`IncidentMapper.request/insertRequest`、处置命令|删除；把 last_request_id/digest 放到 exceptions，或要求处置命令带版本号。需并发重放测试。|
|`incident_locks`|固定行 `blacklist` 的数据库互斥锁；PK `id`|`id`本身，无非键字段；3NF但不是业务实体|`IncidentMapper.lockBlacklist`、黑名单创建事务|删除；用 credential 唯一索引和捕获 duplicate key 解决并发。|
|`incident_faults`|异常服务故障注入计数；PK `name`|`name→remaining`；3NF但非业务数据|`IncidentMapper.fault`、故障测试|从正式库删除，改 test profile 内存注入。|

## 审计结论

- 直接保留并重构：16 表。
- 合并：`sessions+verification_codes→auth_tokens`，`appointment_issuance→appointments`，`qr_issuance→qr_codes`，三个幂等表分别并入聚合根。
- 删除业务非核心：messages、数据库 logs。
- 删除正式库测试设施：p4_faults、incident_faults。
- 删除可由唯一约束/状态列替代的辅助表：三个 outbox、incident_inbox、incident_locks。
- 16 表是可行下限，不是无代价删除；若课程要求完整多次异常动作历史或数据库审计日志，应分别增加表，目标应为 17–18 表。
