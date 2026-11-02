# 已实施目标 Schema（18 表）

可执行且可重复应用的建表脚本位于 `backend/database/refactor/*/V100__target_schema.sql`。字段类型以 MySQL 8 为基准；现有字符串 ID 保留为 `VARCHAR(64)`，避免一次性更换主键。所有时间统一为 `DATETIME(3)`，仅持续时长使用整数秒/分钟，日内时刻使用 `TIME`。

## 表数对比

|微服务|当前|目标|变化|
|---|---:|---:|---:|
|user-service|10|8|-2|
|appointment-service|4|2|-2|
|access-service|10|6|-4|
|exception-service|7|2|-5|
|合计|31|18|-13|

## user-service：8 表

### roles

`role_key VARCHAR(32) PK`，`label VARCHAR(64) NOT NULL`，`title VARCHAR(128)`，`avatar_url VARCHAR(512)`，`enabled BOOLEAN NOT NULL`。候选键：role_key。角色级展示配置可放这里，但不得放某个具体人员的 person_id/name。

### people

`id VARCHAR(64) PK`，`person_code VARCHAR(128) UNIQUE`，`name VARCHAR(128) NOT NULL`，`person_type VARCHAR(32) NOT NULL`，`id_number VARCHAR(64)`，`phone VARCHAR(32)`，`college VARCHAR(128)`，`class_name VARCHAR(128)`，`department VARCHAR(128)`，`position VARCHAR(128)`，`company VARCHAR(255)`，`graduation_year SMALLINT`，`major VARCHAR(255)`，`status VARCHAR(32) NOT NULL`，`created_at/updated_at DATETIME(3)`。

候选键：id、非空 person_code；证件号是否唯一需先做数据质量验证，不能直接假设。删除 role、face_status、host、gate 等派生或含义不稳定字段。

### users

`id VARCHAR(64) PK`，`username VARCHAR(128) UNIQUE NOT NULL`，`password_hash VARCHAR(255) NOT NULL`，`role_key VARCHAR(32) NOT NULL FK→roles(role_key)`，`person_id VARCHAR(64) NULL FK→people(id) ON DELETE SET NULL`，`status VARCHAR(32) NOT NULL`，`created_at/updated_at DATETIME(3)`。若业务确认一人仅一个账号，加 `UNIQUE(person_id)`；当前数据未证明前不能添加。

### auth_tokens

`id VARCHAR(64) PK`，`token_type ENUM('SESSION','VERIFY_CODE')`，`token_digest CHAR(64) NOT NULL`，`user_id VARCHAR(64) NULL FK→users(id) ON DELETE CASCADE`，`subject VARCHAR(128) NOT NULL`，`purpose VARCHAR(32)`，`issued_at/expires_at DATETIME(3) NOT NULL`，`attempts INT NOT NULL DEFAULT 0`，`consumed_at DATETIME(3)`。

候选键：`UNIQUE(token_type,token_digest)`；验证码再加 `UNIQUE(token_type,subject,purpose)`。SESSION 的 subject 为 user id，验证码 subject 为手机号。应用只保存摘要。

### faces

`id VARCHAR(64) PK`，`person_id VARCHAR(64) NOT NULL FK→people(id) ON DELETE CASCADE`，`slot_key VARCHAR(32) NOT NULL`，`status VARCHAR(32)`，`file_name VARCHAR(255)`，`image_url LONGTEXT`，`label VARCHAR(128)`，`updated_at DATETIME(3)`，`UNIQUE(person_id,slot_key)`。删除 person_name。

### vehicles

`id VARCHAR(64) PK`，`owner_id VARCHAR(64) NOT NULL FK→people(id)`，`plate_no VARCHAR(32) UNIQUE NOT NULL`，`status VARCHAR(32) NOT NULL`，`last_access_at DATETIME(3)`。删除 owner_name；last_access_at 明确为可重建缓存，权威事实仍是 access_records。

### messages

保留现有 `/api/messages` 契约需要的课程公告：`id PK`，`title/content`，`target_role FK→roles`，`read_flag`，`created_at DATETIME(3)`。当前已读标志的语义是公告行状态，并非逐用户已读关系；若未来改成逐用户已读，必须另建关联表。

### audit_logs

保留现有 `/api/logs`、预约和异常审计投递：`id PK`，`occurred_at DATETIME(3)`，`actor_id`，操作者姓名/角色快照，`action/target/result`。快照是事件发生时事实，不回写主数据。

## appointment-service：2 表

### appointments

`id VARCHAR(64) PK`，跨库逻辑引用 `visitor_id/host_id VARCHAR(64)`；快照字段 `visitor_name_snapshot VARCHAR(128)`、`visitor_phone_snapshot VARCHAR(32)`、`visitor_id_no_snapshot VARCHAR(64)`、`host_name_snapshot VARCHAR(128)`；`visit_start/visit_end DATETIME(3)`，`reason TEXT`，`status VARCHAR(32)`，`created_at/reviewed_at DATETIME(3)`，`reviewer_id VARCHAR(64)`，`review_comment TEXT`，`version BIGINT NOT NULL`。

签发恢复字段：`issuance_operation_id CHAR(36) UNIQUE`，`issuance_phase VARCHAR(24)`，`qr_id VARCHAR(64)`，`issuance_attempts INT`，`lease_owner CHAR(36)`，`lease_until DATETIME(3)`，`last_error_code VARCHAR(64)`。候选键：id、非空 issuance_operation_id。索引 `(status,visit_start)`、host_id、visitor_id、`(issuance_phase,lease_until)`。

### appointment_reviews

`id VARCHAR(64) PK`，`appointment_id VARCHAR(64) NOT NULL FK→appointments(id) ON DELETE CASCADE`，`decision_version BIGINT NOT NULL`，`action VARCHAR(32)`，`before_status/after_status VARCHAR(32)`，`actor_id VARCHAR(64)`，`actor_name_snapshot VARCHAR(128)`，`actor_role_snapshot VARCHAR(32)`，`comment TEXT`，`occurred_at DATETIME(3)`，`UNIQUE(appointment_id,decision_version)`。

## access-service：6 表

### gates

`id VARCHAR(64) PK`，`name VARCHAR(128) UNIQUE NOT NULL`，`campus VARCHAR(128)`，`location VARCHAR(255)`，`open_from/open_to TIME`，`status VARCHAR(32)`。

### devices

`id VARCHAR(64) PK`，`gate_id VARCHAR(64) NOT NULL FK→gates(id)`，`name VARCHAR(128) NOT NULL`，`device_type VARCHAR(32)`，`status VARCHAR(32)`，`UNIQUE(gate_id,name)`。

### access_rules

一行表示一个原子规则组合，不再存多值文本：`id VARCHAR(64) PK`，`role_key VARCHAR(32) NOT NULL`（跨库逻辑引用），`method VARCHAR(32) NOT NULL`，`gate_id VARCHAR(64) NOT NULL FK→gates(id)`，`allowed_from/allowed_to TIME`，`max_uses INT`，`status VARCHAR(32)`，`UNIQUE(role_key,method,gate_id,allowed_from,allowed_to)`。

### access_settings

`id VARCHAR(32) PK`（固定 main），`visitor_qr_minutes/alumni_qr_minutes INT`，`face_threshold DECIMAL(5,2)`，`high_risk_auto_block BOOLEAN`，`updated_at DATETIME(3)`。校门开放时间归 gates，不在此重复。

### qr_codes

`id VARCHAR(64) PK`，`token VARCHAR(191) UNIQUE NOT NULL`，`credential_type VARCHAR(32)`，`subject_id VARCHAR(64)`（跨库逻辑引用），`subject_name_snapshot VARCHAR(128)`，`appointment_id VARCHAR(64) UNIQUE`（跨库逻辑引用），`operation_id CHAR(36) UNIQUE`，`valid_from/valid_to DATETIME(3)`，`status VARCHAR(32)`，`max_uses/used_count INT`，`issuance_phase VARCHAR(24)`。为保持现有扫码协议，本轮仍保存随机高熵 token 明文；这是安全加固待办，不是函数依赖问题。

### access_records

`id VARCHAR(64) PK`，`request_id VARCHAR(128) UNIQUE`，`request_digest CHAR(64)`，`occurred_at DATETIME(3)`，`person_id VARCHAR(64)`（跨库逻辑引用），`person_name_snapshot VARCHAR(128)`，`person_type_snapshot VARCHAR(32)`，`method VARCHAR(32)`，`gate_id VARCHAR(64) FK→gates(id)`，`result VARCHAR(32)`，`exception_sync_status VARCHAR(24)`，`sync_attempts INT`，`next_retry_at DATETIME(3)`，`source_response JSON`。

request 唯一约束替代 access_requests；同步状态替代 access_outbox。只有需要异常投递的记录进入 PENDING。

## exception-service：2 表

### exceptions

`id VARCHAR(64) PK`，`source_event_id VARCHAR(128) UNIQUE`，`source_digest CHAR(64)`，`occurred_at DATETIME(3)`，跨库逻辑引用 `person_id VARCHAR(64)`，快照 `person_name_snapshot/person_type_snapshot`，`gate_id VARCHAR(64)`，`method/type VARCHAR(64)`，`reason TEXT`，`risk VARCHAR(32)`，`status VARCHAR(32)`，`suggestion TEXT`，`handler_id VARCHAR(64)`，`handler_name_snapshot VARCHAR(128)`，`handled_at DATETIME(3)`，`note TEXT`，`version BIGINT`，`last_request_id VARCHAR(191) UNIQUE`，`last_request_digest CHAR(64)`。

source_event_id 唯一约束替代 inbox；version 与 last_request 字段替代 incident_requests。16 表方案仅保存最终处置；若要求一条异常多次动作的完整历史，必须增加 `exception_actions` 成为 17 表。

### blacklist

`id VARCHAR(64) PK`，`credential_type VARCHAR(32)`，`credential_no VARCHAR(128) NOT NULL`，`person_name_snapshot VARCHAR(128)`，`reason TEXT`，`status VARCHAR(32)`，`created_at/removed_at DATETIME(3)`，`removed_reason TEXT`，`removed_by_id VARCHAR(64)`。推荐使用生成列或业务状态方案保证同一 credential 只有一条有效记录；普通 `UNIQUE(credential_no,status)` 会错误限制多次历史移出记录。

## 删除或合并映射

|当前表|目标位置|
|---|---|
|role_profiles|roles + people 查询装配|
|sessions、verification_codes|auth_tokens|
|messages|保留为 messages，维持现有公告 API|
|logs|规范化为 audit_logs，维持审计 API 与跨服务投递|
|appointment_issuance|appointments 状态列|
|appointment_outbox|appointment_reviews 作为事实源，不再复制日志|
|access_requests|access_records request 唯一键|
|access_outbox|access_records 同步状态|
|qr_issuance|qr_codes operation/phase|
|p4_faults、incident_faults|测试 profile 内存设施|
|incident_inbox|exceptions.source_event_id 唯一键|
|incident_outbox|删除中央日志投递|
|incident_requests|exceptions version/last_request|
|incident_locks|blacklist 唯一约束与事务冲突处理|
