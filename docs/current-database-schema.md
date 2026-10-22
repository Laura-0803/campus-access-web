# 智慧校园出入管理系统当前数据库表与字段清单

采集日期：2026/10/21 23:45:31（Asia/Shanghai）。

当前Java演示系统连接 127.0.0.1:3306 的4个独立隔离数据库，共31张表、239个字段。下表来自本次直接读取MySQL实际结构，包含业务表及验证码、幂等、签发、Outbox、Inbox、隔离故障测试等运行表。

本文仅列结构，不导出业务记录、密码值、Session或二维码Token。原Express业务数据库及旧实验/备份数据库不属于当前运行连接范围，未纳入本文。aggregation-service没有自己的数据库。

## 数据库与表总览

|所属服务|数据库|表数|字段数|
|---|---|---:|---:|
|用户服务|campus_p2_user_20261019080208|10|81|
|预约服务|campus_p3_appointment_20261019115655|4|49|
|通行服务|campus_p4_access_20261019131611|10|67|
|异常服务|campus_p4c_exception_20261020121706|7|42|

|所属服务|表名|字段数|
|---|---|---:|
|用户服务|faces|10|
|用户服务|logs|8|
|用户服务|messages|7|
|用户服务|people|19|
|用户服务|role_profiles|8|
|用户服务|roles|2|
|用户服务|sessions|5|
|用户服务|users|8|
|用户服务|vehicles|7|
|用户服务|verification_codes|7|
|预约服务|appointment_issuance|13|
|预约服务|appointment_outbox|7|
|预约服务|appointment_review_history|11|
|预约服务|appointments|18|
|通行服务|access_outbox|7|
|通行服务|access_records|9|
|通行服务|access_requests|3|
|通行服务|access_rules|8|
|通行服务|devices|6|
|通行服务|gates|7|
|通行服务|p4_faults|2|
|通行服务|qr_codes|13|
|通行服务|qr_issuance|5|
|通行服务|settings|7|
|异常服务|blacklist|11|
|异常服务|exceptions|16|
|异常服务|incident_faults|2|
|异常服务|incident_inbox|4|
|异常服务|incident_locks|1|
|异常服务|incident_outbox|5|
|异常服务|incident_requests|3|

## 字段说明口径

“允许空值”对应IS_NULLABLE；键标识PRI为主键、UNI为唯一索引、MUL为非唯一索引中的字段；完整组合及唯一性以每表索引清单为准。默认值NULL是MySQL元数据返回值，可能表示未声明默认值或显式DEFAULT NULL，精确区别见文末DDL。数据库没有字段注释时显示“—”，不根据字段名称虚构业务含义。

## 用户服务

数据库：`campus_p2_user_20261019080208`。

### faces

字段数：10；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|person_id|varchar(64)|YES|NULL|MUL|—|—|
|3|person_name|varchar(128)|YES|NULL|—|—|—|
|4|status|varchar(64)|YES|NULL|—|—|—|
|5|file_name|varchar(255)|YES|NULL|—|—|—|
|6|image_url|longtext|YES|NULL|—|—|—|
|7|slot_key|varchar(32)|YES|NULL|—|—|—|
|8|label|varchar(128)|YES|NULL|—|—|—|
|9|updated_at|varchar(64)|YES|NULL|—|—|—|
|10|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|ux_face_slot|BTREE|是|person_id, slot_key|

外键：fk_p2_face_person：person_id → people.id

### logs

字段数：8；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|time|varchar(64)|YES|NULL|—|—|—|
|3|actor|varchar(128)|YES|NULL|—|—|—|
|4|role|varchar(64)|YES|NULL|—|—|—|
|5|action|varchar(255)|YES|NULL|—|—|—|
|6|target|varchar(255)|YES|NULL|—|—|—|
|7|result|varchar(64)|YES|NULL|—|—|—|
|8|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### messages

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|title|varchar(255)|YES|NULL|—|—|—|
|3|content|text|YES|NULL|—|—|—|
|4|target_role|varchar(255)|YES|NULL|—|—|—|
|5|read_flag|tinyint(1)|YES|NULL|—|—|—|
|6|created_at|varchar(64)|YES|NULL|—|—|—|
|7|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### people

字段数：19；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|name|varchar(128)|NO|NULL|—|—|—|
|3|type|varchar(64)|YES|NULL|—|—|—|
|4|code|varchar(128)|YES|NULL|UNI|—|—|
|5|id_number|varchar(64)|YES|NULL|—|—|—|
|6|role|varchar(32)|YES|NULL|—|—|—|
|7|college|varchar(128)|YES|NULL|—|—|—|
|8|class_name|varchar(128)|YES|NULL|—|—|—|
|9|phone|varchar(32)|YES|NULL|—|—|—|
|10|face_status|varchar(64)|YES|NULL|—|—|—|
|11|status|varchar(64)|YES|NULL|—|—|—|
|12|department|varchar(128)|YES|NULL|—|—|—|
|13|position|varchar(128)|YES|NULL|—|—|—|
|14|host|varchar(128)|YES|NULL|—|—|—|
|15|company|varchar(255)|YES|NULL|—|—|—|
|16|graduation_year|varchar(32)|YES|NULL|—|—|—|
|17|major|varchar(255)|YES|NULL|—|—|—|
|18|gate|varchar(128)|YES|NULL|—|—|—|
|19|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|ux_person_code|BTREE|是|code|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### role_profiles

字段数：8；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|role_key|varchar(32)|NO|NULL|PRI|—|—|
|2|person_id|varchar(64)|YES|NULL|—|—|—|
|3|name|varchar(128)|YES|NULL|—|—|—|
|4|title|varchar(255)|YES|NULL|—|—|—|
|5|role_value|varchar(32)|YES|NULL|—|—|—|
|6|type|varchar(64)|YES|NULL|—|—|—|
|7|avatar|varchar(512)|YES|NULL|—|—|—|
|8|status|varchar(64)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|role_key|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### roles

字段数：2；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|role_key|varchar(32)|NO|NULL|PRI|—|—|
|2|label|varchar(64)|NO|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|role_key|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### sessions

字段数：5；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|token|varchar(128)|NO|NULL|PRI|—|—|
|2|user_id|varchar(64)|NO|NULL|MUL|—|—|
|3|role|varchar(32)|YES|NULL|—|—|—|
|4|created_at|varchar(64)|YES|NULL|—|—|—|
|5|expires_at|varchar(64)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|token|
|ix_session_user|BTREE|否|user_id|

外键：fk_p2_session_user：user_id → users.id

### users

字段数：8；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|username|varchar(128)|NO|NULL|UNI|—|—|
|3|account_type|varchar(64)|YES|NULL|—|—|—|
|4|password|varchar(255)|NO|NULL|—|—|—|
|5|role|varchar(32)|NO|NULL|—|—|—|
|6|person_id|varchar(64)|YES|NULL|MUL|—|—|
|7|status|varchar(64)|YES|NULL|—|—|—|
|8|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|username|BTREE|是|username|
|fk_p2_user_person|BTREE|否|person_id|

外键：fk_p2_user_person：person_id → people.id

### vehicles

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|owner_id|varchar(64)|YES|NULL|MUL|—|—|
|3|owner_name|varchar(128)|YES|NULL|—|—|—|
|4|plate_no|varchar(64)|YES|NULL|UNI|—|—|
|5|status|varchar(64)|YES|NULL|—|—|—|
|6|last_access|varchar(64)|YES|NULL|—|—|—|
|7|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|ux_vehicle_plate|BTREE|是|plate_no|
|fk_p2_vehicle_person|BTREE|否|owner_id|

外键：fk_p2_vehicle_person：owner_id → people.id

### verification_codes

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|purpose|varchar(16)|NO|NULL|PRI|—|—|
|2|phone|varchar(32)|NO|NULL|PRI|—|—|
|3|user_id|varchar(64)|YES|NULL|—|—|—|
|4|digest|char(64)|NO|NULL|—|—|—|
|5|sent_at|bigint|NO|NULL|—|—|—|
|6|expires_at|bigint|NO|NULL|—|—|—|
|7|attempts|int|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|purpose, phone|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

## 预约服务

数据库：`campus_p3_appointment_20261019115655`。

### appointment_issuance

字段数：13；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|operation_id|char(36)|NO|NULL|PRI|—|—|
|2|appointment_id|varchar(64)|NO|NULL|UNI|—|—|
|3|actor_id|varchar(64)|NO|NULL|—|—|—|
|4|actor_token|text|NO|NULL|—|—|—|
|5|payload|text|NO|NULL|—|—|—|
|6|expected_version|bigint|NO|NULL|—|—|—|
|7|phase|varchar(24)|NO|NULL|MUL|—|—|
|8|qr_id|varchar(64)|YES|NULL|—|—|—|
|9|hold_reason|varchar(64)|YES|NULL|—|—|—|
|10|attempts|int|NO|0|—|—|—|
|11|lease_owner|char(36)|YES|NULL|—|—|—|
|12|lease_until|datetime(3)|YES|NULL|—|—|—|
|13|last_error_code|varchar(64)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|operation_id|
|appointment_id|BTREE|是|appointment_id|
|ix_recovery|BTREE|否|phase, hold_reason, lease_until|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### appointment_outbox

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|event_id|varchar(64)|NO|NULL|PRI|—|—|
|2|appointment_id|varchar(128)|NO|NULL|—|—|—|
|3|payload|text|NO|NULL|—|—|—|
|4|state|varchar(24)|NO|NULL|MUL|—|—|
|5|attempts|int|NO|0|—|—|—|
|6|next_retry_at|datetime(3)|YES|NULL|—|—|—|
|7|last_error_code|varchar(64)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|event_id|
|ix_pending|BTREE|否|state, next_retry_at|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### appointment_review_history

字段数：11；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|event_id|varchar(64)|NO|NULL|PRI|—|—|
|2|appointment_id|varchar(128)|NO|NULL|MUL|—|—|
|3|action|varchar(32)|NO|NULL|—|—|—|
|4|before_status|varchar(32)|YES|NULL|—|—|—|
|5|after_status|varchar(32)|NO|NULL|—|—|—|
|6|decision_version|bigint|NO|NULL|—|—|—|
|7|actor_id|varchar(128)|YES|NULL|—|—|—|
|8|actor_name|varchar(255)|YES|NULL|—|—|—|
|9|actor_role|varchar(32)|YES|NULL|—|—|—|
|10|comment|text|YES|NULL|—|—|—|
|11|occurred_at|varchar(32)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|event_id|
|uq_decision|BTREE|是|appointment_id, decision_version|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### appointments

字段数：18；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|visitor|varchar(128)|YES|NULL|—|—|—|
|3|visitor_id|varchar(64)|YES|NULL|MUL|—|—|
|4|visitor_phone|varchar(32)|YES|NULL|—|—|—|
|5|id_number|varchar(64)|YES|NULL|—|—|—|
|6|host|varchar(128)|YES|NULL|—|—|—|
|7|host_id|varchar(64)|YES|NULL|MUL|—|—|
|8|time|varchar(64)|YES|NULL|—|—|—|
|9|visit_start|varchar(64)|YES|NULL|—|—|—|
|10|visit_end|varchar(64)|YES|NULL|—|—|—|
|11|reason|text|YES|NULL|—|—|—|
|12|status|varchar(64)|YES|NULL|MUL|—|—|
|13|created_at|varchar(64)|YES|NULL|—|—|—|
|14|reviewed_at|varchar(64)|YES|NULL|—|—|—|
|15|reviewer|varchar(128)|YES|NULL|—|—|—|
|16|review_comment|text|YES|NULL|—|—|—|
|17|sort_order|bigint|NO|0|—|—|—|
|18|version|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|ix_appointment_host|BTREE|否|host_id|
|ix_appointment_visitor|BTREE|否|visitor_id|
|ix_appointment_status|BTREE|否|status|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

## 通行服务

数据库：`campus_p4_access_20261019131611`。

### access_outbox

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|event_id|varchar(128)|NO|NULL|PRI|—|—|
|2|kind|varchar(32)|NO|NULL|—|—|—|
|3|payload|mediumtext|NO|NULL|—|—|—|
|4|state|varchar(24)|NO|NULL|MUL|—|—|
|5|attempts|int|NO|0|—|—|—|
|6|next_retry_at|datetime(3)|YES|NULL|—|—|—|
|7|last_error_code|varchar(64)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|event_id|
|ix_pending|BTREE|否|state, next_retry_at|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### access_records

字段数：9；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|time|varchar(64)|YES|NULL|—|—|—|
|3|name|varchar(128)|YES|NULL|—|—|—|
|4|person_id|varchar(64)|YES|NULL|—|—|—|
|5|type|varchar(64)|YES|NULL|—|—|—|
|6|method|varchar(128)|YES|NULL|—|—|—|
|7|gate|varchar(128)|YES|NULL|—|—|—|
|8|status|varchar(64)|YES|NULL|—|—|—|
|9|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### access_requests

字段数：3；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|request_id|varchar(128)|NO|NULL|PRI|—|—|
|2|request_digest|varchar(64)|NO|NULL|—|—|—|
|3|response_json|mediumtext|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|request_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### access_rules

字段数：8；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|role|varchar(32)|YES|NULL|—|—|—|
|3|methods|text|YES|NULL|—|—|—|
|4|allowed_time|varchar(128)|YES|NULL|—|—|—|
|5|gates|text|YES|NULL|—|—|—|
|6|max_uses|varchar(64)|YES|NULL|—|—|—|
|7|status|varchar(64)|YES|NULL|—|—|—|
|8|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### devices

字段数：6；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|name|varchar(128)|YES|NULL|—|—|—|
|3|type|varchar(64)|YES|NULL|—|—|—|
|4|gate|varchar(128)|YES|NULL|—|—|—|
|5|status|varchar(64)|YES|NULL|—|—|—|
|6|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### gates

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|name|varchar(128)|YES|NULL|—|—|—|
|3|campus|varchar(128)|YES|NULL|—|—|—|
|4|location|varchar(255)|YES|NULL|—|—|—|
|5|open_time|varchar(64)|YES|NULL|—|—|—|
|6|status|varchar(64)|YES|NULL|—|—|—|
|7|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### p4_faults

字段数：2；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|name|varchar(64)|NO|NULL|PRI|—|—|
|2|remaining|int|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|name|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### qr_codes

字段数：13；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|token|varchar(191)|NO|NULL|UNI|—|—|
|3|type|varchar(32)|YES|NULL|—|—|—|
|4|owner_name|varchar(128)|YES|NULL|—|—|—|
|5|owner_id|varchar(64)|YES|NULL|—|—|—|
|6|visitor_id|varchar(64)|YES|NULL|—|—|—|
|7|appointment_id|varchar(64)|YES|NULL|UNI|—|—|
|8|valid_from|varchar(64)|YES|NULL|—|—|—|
|9|valid_to|varchar(64)|YES|NULL|—|—|—|
|10|status|varchar(64)|YES|NULL|—|—|—|
|11|max_uses|int|NO|1|—|—|—|
|12|used_count|int|NO|0|—|—|—|
|13|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|
|token|BTREE|是|token|
|uq_appointment|BTREE|是|appointment_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### qr_issuance

字段数：5；引擎：InnoDB；表排序规则：utf8mb4_0900_ai_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|operation_id|char(36)|NO|NULL|PRI|—|—|
|2|appointment_id|varchar(64)|NO|NULL|UNI|—|—|
|3|payload_digest|varchar(64)|NO|NULL|—|—|—|
|4|qr_id|varchar(64)|NO|NULL|UNI|—|—|
|5|phase|varchar(24)|NO|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|operation_id|
|appointment_id|BTREE|是|appointment_id|
|qr_id|BTREE|是|qr_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### settings

字段数：7；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(32)|NO|NULL|PRI|—|—|
|2|gate_open_time|varchar(32)|YES|NULL|—|—|—|
|3|gate_close_time|varchar(32)|YES|NULL|—|—|—|
|4|visitor_qr_minutes|int|YES|NULL|—|—|—|
|5|alumni_qr_minutes|int|YES|NULL|—|—|—|
|6|face_threshold|decimal(5,2)|YES|NULL|—|—|—|
|7|high_risk_auto_block|tinyint(1)|YES|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

## 异常服务

数据库：`campus_p4c_exception_20261020121706`。

### blacklist

字段数：11；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|name|varchar(128)|YES|NULL|—|—|—|
|3|type|varchar(128)|YES|NULL|—|—|—|
|4|credential_no|varchar(128)|YES|NULL|—|—|—|
|5|reason|text|YES|NULL|—|—|—|
|6|status|varchar(64)|YES|NULL|—|—|—|
|7|created_at|varchar(64)|YES|NULL|—|—|—|
|8|removed_at|varchar(64)|YES|NULL|—|—|—|
|9|removed_reason|text|YES|NULL|—|—|—|
|10|removed_by|varchar(128)|YES|NULL|—|—|—|
|11|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### exceptions

字段数：16；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(64)|NO|NULL|PRI|—|—|
|2|time|varchar(64)|YES|NULL|—|—|—|
|3|person|varchar(128)|YES|NULL|—|—|—|
|4|person_type|varchar(64)|YES|NULL|—|—|—|
|5|gate|varchar(128)|YES|NULL|—|—|—|
|6|method|varchar(128)|YES|NULL|—|—|—|
|7|type|varchar(128)|YES|NULL|—|—|—|
|8|reason|text|YES|NULL|—|—|—|
|9|risk|varchar(64)|YES|NULL|—|—|—|
|10|status|varchar(64)|YES|NULL|—|—|—|
|11|suggestion|text|YES|NULL|—|—|—|
|12|handler|varchar(128)|YES|NULL|—|—|—|
|13|handled_at|varchar(64)|YES|NULL|—|—|—|
|14|note|text|YES|NULL|—|—|—|
|15|actions|text|YES|NULL|—|—|—|
|16|sort_order|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### incident_faults

字段数：2；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|name|varchar(32)|NO|NULL|PRI|—|—|
|2|remaining|int|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|name|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### incident_inbox

字段数：4；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|event_id|varchar(128)|NO|NULL|PRI|—|—|
|2|payload_digest|char(64)|NO|NULL|—|—|—|
|3|exception_id|varchar(128)|YES|NULL|—|—|—|
|4|received_at|varchar(64)|NO|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|event_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### incident_locks

字段数：1；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|id|varchar(32)|NO|NULL|PRI|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### incident_outbox

字段数：5；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|event_id|varchar(128)|NO|NULL|PRI|—|—|
|2|payload|longtext|NO|NULL|—|—|—|
|3|state|varchar(32)|NO|PENDING|—|—|—|
|4|attempts|int|NO|0|—|—|—|
|5|next_retry_at|bigint|NO|0|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|event_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

### incident_requests

字段数：3；引擎：InnoDB；表排序规则：utf8mb4_unicode_ci。

|序号|字段名|MySQL完整类型|允许空值|默认值|键标识|额外属性|数据库字段注释|
|---:|---|---|---|---|---|---|---|
|1|request_id|varchar(191)|NO|NULL|PRI|—|—|
|2|payload_digest|char(64)|NO|NULL|—|—|—|
|3|response|longtext|NO|NULL|—|—|—|

索引：

|索引名|类型|唯一|字段顺序|
|---|---|---|---|
|PRIMARY|BTREE|是|request_id|

外键：无数据库级外键。跨服务的人员、预约等ID属于逻辑引用，不能当作跨库外键。

## 附录 实际建表语句

以下为本次SHOW CREATE TABLE的原始结构输出，仅供核对；本次未执行任何建表或迁移语句。

### campus_p2_user_20261019080208.faces

```sql
CREATE TABLE `faces` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `person_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `image_url` longtext COLLATE utf8mb4_unicode_ci,
  `slot_key` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `label` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_face_slot` (`person_id`,`slot_key`),
  CONSTRAINT `fk_p2_face_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.logs

```sql
CREATE TABLE `logs` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `result` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.messages

```sql
CREATE TABLE `messages` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `target_role` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `read_flag` tinyint(1) DEFAULT NULL,
  `created_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.people

```sql
CREATE TABLE `people` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_number` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `college` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `face_status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `host` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `company` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `graduation_year` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `major` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_person_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.role_profiles

```sql
CREATE TABLE `role_profiles` (
  `role_key` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `person_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_value` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.roles

```sql
CREATE TABLE `roles` (
  `role_key` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.sessions

```sql
CREATE TABLE `sessions` (
  `token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`token`),
  KEY `ix_session_user` (`user_id`),
  CONSTRAINT `fk_p2_session_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.users

```sql
CREATE TABLE `users` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `person_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_p2_user_person` (`person_id`),
  CONSTRAINT `fk_p2_user_person` FOREIGN KEY (`person_id`) REFERENCES `people` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.vehicles

```sql
CREATE TABLE `vehicles` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `plate_no` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_access` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_vehicle_plate` (`plate_no`),
  KEY `fk_p2_vehicle_person` (`owner_id`),
  CONSTRAINT `fk_p2_vehicle_person` FOREIGN KEY (`owner_id`) REFERENCES `people` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p2_user_20261019080208.verification_codes

```sql
CREATE TABLE `verification_codes` (
  `purpose` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `digest` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sent_at` bigint NOT NULL,
  `expires_at` bigint NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`purpose`,`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p3_appointment_20261019115655.appointment_issuance

```sql
CREATE TABLE `appointment_issuance` (
  `operation_id` char(36) NOT NULL,
  `appointment_id` varchar(64) NOT NULL,
  `actor_id` varchar(64) NOT NULL,
  `actor_token` text NOT NULL,
  `payload` text NOT NULL,
  `expected_version` bigint NOT NULL,
  `phase` varchar(24) NOT NULL,
  `qr_id` varchar(64) DEFAULT NULL,
  `hold_reason` varchar(64) DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `lease_owner` char(36) DEFAULT NULL,
  `lease_until` datetime(3) DEFAULT NULL,
  `last_error_code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`operation_id`),
  UNIQUE KEY `appointment_id` (`appointment_id`),
  KEY `ix_recovery` (`phase`,`hold_reason`,`lease_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p3_appointment_20261019115655.appointment_outbox

```sql
CREATE TABLE `appointment_outbox` (
  `event_id` varchar(64) NOT NULL,
  `appointment_id` varchar(128) NOT NULL,
  `payload` text NOT NULL,
  `state` varchar(24) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `next_retry_at` datetime(3) DEFAULT NULL,
  `last_error_code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `ix_pending` (`state`,`next_retry_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p3_appointment_20261019115655.appointment_review_history

```sql
CREATE TABLE `appointment_review_history` (
  `event_id` varchar(64) NOT NULL,
  `appointment_id` varchar(128) NOT NULL,
  `action` varchar(32) NOT NULL,
  `before_status` varchar(32) DEFAULT NULL,
  `after_status` varchar(32) NOT NULL,
  `decision_version` bigint NOT NULL,
  `actor_id` varchar(128) DEFAULT NULL,
  `actor_name` varchar(255) DEFAULT NULL,
  `actor_role` varchar(32) DEFAULT NULL,
  `comment` text,
  `occurred_at` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  UNIQUE KEY `uq_decision` (`appointment_id`,`decision_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p3_appointment_20261019115655.appointments

```sql
CREATE TABLE `appointments` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `visitor` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_number` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `host` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `host_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `time` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visit_start` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visit_end` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewer` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_comment` text COLLATE utf8mb4_unicode_ci,
  `sort_order` bigint NOT NULL DEFAULT '0',
  `version` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `ix_appointment_host` (`host_id`),
  KEY `ix_appointment_visitor` (`visitor_id`),
  KEY `ix_appointment_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.access_outbox

```sql
CREATE TABLE `access_outbox` (
  `event_id` varchar(128) NOT NULL,
  `kind` varchar(32) NOT NULL,
  `payload` mediumtext NOT NULL,
  `state` varchar(24) NOT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `next_retry_at` datetime(3) DEFAULT NULL,
  `last_error_code` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `ix_pending` (`state`,`next_retry_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p4_access_20261019131611.access_records

```sql
CREATE TABLE `access_records` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.access_requests

```sql
CREATE TABLE `access_requests` (
  `request_id` varchar(128) NOT NULL,
  `request_digest` varchar(64) NOT NULL,
  `response_json` mediumtext,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p4_access_20261019131611.access_rules

```sql
CREATE TABLE `access_rules` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `methods` text COLLATE utf8mb4_unicode_ci,
  `allowed_time` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gates` text COLLATE utf8mb4_unicode_ci,
  `max_uses` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.devices

```sql
CREATE TABLE `devices` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.gates

```sql
CREATE TABLE `gates` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campus` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `open_time` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.p4_faults

```sql
CREATE TABLE `p4_faults` (
  `name` varchar(64) NOT NULL,
  `remaining` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p4_access_20261019131611.qr_codes

```sql
CREATE TABLE `qr_codes` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `owner_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appointment_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valid_from` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valid_to` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `max_uses` int NOT NULL DEFAULT '1',
  `used_count` int NOT NULL DEFAULT '0',
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `uq_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4_access_20261019131611.qr_issuance

```sql
CREATE TABLE `qr_issuance` (
  `operation_id` char(36) NOT NULL,
  `appointment_id` varchar(64) NOT NULL,
  `payload_digest` varchar(64) NOT NULL,
  `qr_id` varchar(64) NOT NULL,
  `phase` varchar(24) NOT NULL,
  PRIMARY KEY (`operation_id`),
  UNIQUE KEY `appointment_id` (`appointment_id`),
  UNIQUE KEY `qr_id` (`qr_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### campus_p4_access_20261019131611.settings

```sql
CREATE TABLE `settings` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gate_open_time` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate_close_time` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `visitor_qr_minutes` int DEFAULT NULL,
  `alumni_qr_minutes` int DEFAULT NULL,
  `face_threshold` decimal(5,2) DEFAULT NULL,
  `high_risk_auto_block` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.blacklist

```sql
CREATE TABLE `blacklist` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `credential_no` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `removed_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `removed_reason` text COLLATE utf8mb4_unicode_ci,
  `removed_by` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.exceptions

```sql
CREATE TABLE `exceptions` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `time` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `person_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gate` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `method` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  `risk` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `suggestion` text COLLATE utf8mb4_unicode_ci,
  `handler` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `handled_at` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `actions` text COLLATE utf8mb4_unicode_ci,
  `sort_order` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.incident_faults

```sql
CREATE TABLE `incident_faults` (
  `name` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remaining` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.incident_inbox

```sql
CREATE TABLE `incident_inbox` (
  `event_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_digest` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_at` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.incident_locks

```sql
CREATE TABLE `incident_locks` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.incident_outbox

```sql
CREATE TABLE `incident_outbox` (
  `event_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `state` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `attempts` int NOT NULL DEFAULT '0',
  `next_retry_at` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### campus_p4c_exception_20261020121706.incident_requests

```sql
CREATE TABLE `incident_requests` (
  `request_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload_digest` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
