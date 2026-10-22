# 数据字典与数据归属

这是 schema.sql 的设计基线，实际库差异见 database-live-summary.json。NULL/默认值/键均保留原定义；无显式 NOT NULL 的列允许 NULL。所有表 InnoDB / utf8mb4_unicode_ci。

## roles → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|role_key|VARCHAR(32) NOT NULL PRIMARY KEY|role(字典键)|
|label|VARCHAR(64) NOT NULL|label|

## role_profiles → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|role_key|VARCHAR(32) NOT NULL PRIMARY KEY|role(字典键)|
|person_id|VARCHAR(64)|personId|
|name|VARCHAR(128)|name|
|title|VARCHAR(255)|title|
|role_value|VARCHAR(32)|role|
|type|VARCHAR(64)|type|
|avatar|VARCHAR(512)|avatar|
|status|VARCHAR(64)|status|

## users → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|username|VARCHAR(128) NOT NULL UNIQUE|username|
|account_type|VARCHAR(64)|accountType|
|password|VARCHAR(255) NOT NULL|password|
|role|VARCHAR(32) NOT NULL|role|
|person_id|VARCHAR(64)|personId|
|status|VARCHAR(64)|status|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## people → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|name|VARCHAR(128) NOT NULL|name|
|type|VARCHAR(64)|type|
|code|VARCHAR(128)|code|
|id_number|VARCHAR(64)|idNumber|
|role|VARCHAR(32)|role|
|college|VARCHAR(128)|college|
|class_name|VARCHAR(128)|className|
|phone|VARCHAR(32)|phone|
|face_status|VARCHAR(64)|faceStatus|
|status|VARCHAR(64)|status|
|department|VARCHAR(128)|department|
|position|VARCHAR(128)|position|
|host|VARCHAR(128)|host|
|company|VARCHAR(255)|company|
|graduation_year|VARCHAR(32)|graduationYear|
|major|VARCHAR(255)|major|
|gate|VARCHAR(128)|gate|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## access_records → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|time|VARCHAR(64)|time|
|name|VARCHAR(128)|name|
|person_id|VARCHAR(64)|personId|
|type|VARCHAR(64)|type|
|method|VARCHAR(128)|method|
|gate|VARCHAR(128)|gate|
|status|VARCHAR(64)|status|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## appointments → appointment-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|visitor|VARCHAR(128)|visitor|
|visitor_id|VARCHAR(64)|visitorId|
|visitor_phone|VARCHAR(32)|visitorPhone|
|id_number|VARCHAR(64)|idNumber|
|host|VARCHAR(128)|host|
|host_id|VARCHAR(64)|hostId|
|time|VARCHAR(64)|time|
|visit_start|VARCHAR(64)|visitStart|
|visit_end|VARCHAR(64)|visitEnd|
|reason|TEXT|reason|
|status|VARCHAR(64)|status|
|created_at|VARCHAR(64)|createdAt|
|reviewed_at|VARCHAR(64)|reviewedAt|
|reviewer|VARCHAR(128)|reviewer|
|review_comment|TEXT|reviewComment|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## exceptions → exception-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|time|VARCHAR(64)|time|
|person|VARCHAR(128)|person|
|person_type|VARCHAR(64)|personType|
|gate|VARCHAR(128)|gate|
|method|VARCHAR(128)|method|
|type|VARCHAR(128)|type|
|reason|TEXT|reason|
|risk|VARCHAR(64)|risk|
|status|VARCHAR(64)|status|
|suggestion|TEXT|suggestion|
|handler|VARCHAR(128)|handler|
|handled_at|VARCHAR(64)|handledAt|
|note|TEXT|note|
|actions|TEXT|actions|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## devices → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|name|VARCHAR(128)|name|
|type|VARCHAR(64)|type|
|gate|VARCHAR(128)|gate|
|status|VARCHAR(64)|status|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## vehicles → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|owner_id|VARCHAR(64)|ownerId|
|owner_name|VARCHAR(128)|ownerName|
|plate_no|VARCHAR(64)|plateNo|
|status|VARCHAR(64)|status|
|last_access|VARCHAR(64)|lastAccess|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## faces → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|person_id|VARCHAR(64)|personId|
|person_name|VARCHAR(128)|personName|
|status|VARCHAR(64)|status|
|file_name|VARCHAR(255)|fileName|
|image_url|LONGTEXT|imageUrl|
|slot_key|VARCHAR(32)|slot|
|label|VARCHAR(128)|label|
|updated_at|VARCHAR(64)|updatedAt|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## qr_codes → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|token|VARCHAR(191) NOT NULL UNIQUE|token|
|type|VARCHAR(32)|type|
|owner_name|VARCHAR(128)|ownerName|
|owner_id|VARCHAR(64)|ownerId|
|visitor_id|VARCHAR(64)|visitorId|
|appointment_id|VARCHAR(64)|appointmentId|
|valid_from|VARCHAR(64)|validFrom|
|valid_to|VARCHAR(64)|validTo|
|status|VARCHAR(64)|status|
|max_uses|INT NOT NULL DEFAULT 1|maxUses|
|used_count|INT NOT NULL DEFAULT 0|usedCount|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## settings → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(32) NOT NULL PRIMARY KEY|id|
|gate_open_time|VARCHAR(32)|gateOpenTime|
|gate_close_time|VARCHAR(32)|gateCloseTime|
|visitor_qr_minutes|INT|visitorQrMinutes|
|alumni_qr_minutes|INT|alumniQrMinutes|
|face_threshold|DECIMAL(5,2)|faceThreshold|
|high_risk_auto_block|TINYINT(1)|highRiskAutoBlock|

## gates → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|name|VARCHAR(128)|name|
|campus|VARCHAR(128)|campus|
|location|VARCHAR(255)|location|
|open_time|VARCHAR(64)|openTime|
|status|VARCHAR(64)|status|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## access_rules → access-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|role|VARCHAR(32)|role|
|methods|TEXT|methods|
|allowed_time|VARCHAR(128)|allowedTime|
|gates|TEXT|gates|
|max_uses|VARCHAR(64)|maxUses|
|status|VARCHAR(64)|status|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## blacklist → exception-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|name|VARCHAR(128)|name|
|type|VARCHAR(128)|type|
|credential_no|VARCHAR(128)|credentialNo|
|reason|TEXT|reason|
|status|VARCHAR(64)|status|
|created_at|VARCHAR(64)|createdAt|
|removed_at|VARCHAR(64)|removedAt|
|removed_reason|TEXT|removedReason|
|removed_by|VARCHAR(128)|removedBy|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## logs → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|time|VARCHAR(64)|time|
|actor|VARCHAR(128)|actor|
|role|VARCHAR(64)|role|
|action|VARCHAR(255)|action|
|target|VARCHAR(255)|target|
|result|VARCHAR(64)|result|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## messages → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|id|VARCHAR(64) NOT NULL PRIMARY KEY|id|
|title|VARCHAR(255)|title|
|content|TEXT|content|
|target_role|VARCHAR(255)|targetRole|
|read_flag|TINYINT(1)|read|
|created_at|VARCHAR(64)|createdAt|
|sort_order|INT NOT NULL DEFAULT 0|sortOrder|

## sessions → user-service

|字段|类型与约束|JSON 建议映射|
|---|---|---|
|token|VARCHAR(128) NOT NULL PRIMARY KEY|token|
|user_id|VARCHAR(64) NOT NULL|userId|
|role|VARCHAR(32)|role|
|created_at|VARCHAR(64)|createdAt|
|expires_at|VARCHAR(64)|expiresAt|

## 外键原定义

```sql
ALTER TABLE users
  ADD CONSTRAINT fk_users_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE faces
  ADD CONSTRAINT fk_faces_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

ALTER TABLE vehicles
  ADD CONSTRAINT fk_vehicles_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE access_records
  ADD CONSTRAINT fk_records_person FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_appointments_host FOREIGN KEY (host_id) REFERENCES people(id) ON DELETE SET NULL;

ALTER TABLE qr_codes
  ADD CONSTRAINT fk_qr_owner FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_qr_visitor FOREIGN KEY (visitor_id) REFERENCES people(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_qr_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;

```

逻辑关系：roles→users/people 为一对多但未建 FK；people→users/faces/vehicles 为一对多，people→appointments 通过 visitor_id/host_id 两种关系关联；appointments→qr_codes 一对多（数据库没有 appointment_id 唯一约束）。角色与校门/通行方式为多对多，目前以 access_rules 的 TEXT 列表达，若以后正规化须增量建立关联表并保持数组/文本接口兼容。
