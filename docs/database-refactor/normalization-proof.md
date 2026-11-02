# 目标模型范式证明

## 判定方法

1NF 要求每个属性值对当前关系语义是原子的，不以逗号、JSON 数组或拼接文本承载需要独立查询和约束的多值集合。2NF 要求每个非主属性完全依赖全部候选键。3NF 要求对每个非平凡函数依赖 `X→A`，X 是超键，或 A 是主属性；业务快照以“事件发生时的值”作为独立事实，不等同当前主数据副本。

## 用户域

|表|候选键|主要函数依赖|3NF 论证|
|---|---|---|---|
|roles|role_key|role_key→label,title,avatar,enabled|决定项为候选键；满足。|
|people|id；非空 person_code|id→全部人员属性；person_code→id|没有已证明的 phone/id_number→其他属性约束；各非键直接描述人员；满足。|
|users|id；username；可选 person_id|id/username→password_hash,role,person,status|role label 不复制到 users；满足。若允许一人多账号则 person_id 不是候选键。|
|auth_tokens|id；type+digest；验证码 type+subject+purpose|每个候选键→token 状态与期限|purpose/subject 不决定用户其他资料；无部分和传递依赖；满足。|
|faces|id；person_id+slot_key|候选键→状态、资源、标签、时间|删除 person_name 后没有 person_id→name 的副本；满足。|
|vehicles|id；plate_no|候选键→owner,status,last_access_cache|删除 owner_name；last_access 明确是车辆聚合的缓存属性，可从事实重建但不作为人员属性；满足设计约束。|
|messages|id|id→标题、内容、目标角色、公告状态、时间|各属性直接描述公告行；不包含用户集合；满足。逐用户已读不在当前语义内。|
|audit_logs|id|id→发生时间、操作者快照、动作、目标、结果|操作者名称和角色是事件快照；满足。|

## 预约域

|表|候选键|主要函数依赖|3NF 论证|
|---|---|---|---|
|appointments|id；issuance_operation_id|候选键→预约事实、快照、当前状态、签发恢复状态|访客姓名/电话/证件号定义为“提交时快照”，由 appointment id 决定，不宣称由当前 visitor_id 决定；签发与预约严格一对一且无独立生命周期；满足。|
|appointment_reviews|id；appointment_id+decision_version|候选键→状态变迁、操作者快照、时间|操作者名称/角色是决策发生时审计事实；满足。|

## 通行域

|表|候选键|主要函数依赖|3NF 论证|
|---|---|---|---|
|gates|id；name|候选键→校区、位置、开放时间、状态|开放时间只存在于 gate，不再和 settings 重复；满足。|
|devices|id；gate_id+name|候选键→设备类型和状态|仅保存 gate_id，不复制 gate name/location；满足。|
|access_rules|id；role+method+gate+time-window|候选键→max_uses,status|一行一个方式和校门，不含多值字段；所有非键依赖完整规则组合；满足。|
|access_settings|id|id→二维码期限、阈值、自动阻断|固定 id 仍是键；各字段是全局策略，不复制 gate 开放时间；满足。|
|qr_codes|id；token_digest；appointment_id；operation_id|各候选键→主体、有效期、次数和签发状态|不保存主体姓名；签发状态与凭证一对一；满足。|
|access_records|id；request_id|候选键→通行事实、响应和异常同步状态|人员名称/类型是事件发生时快照；同步状态描述该通行事实的交付状态；满足。JSON response 只是幂等响应快照，不承载需要关系查询的多值业务集合。|

## 异常域

|表|候选键|主要函数依赖|3NF 论证|
|---|---|---|---|
|exceptions|id；source_event_id；last_request_id|候选键→异常事实、最终处置和幂等状态|人员/处理人名称是事件快照；不再用 actions 保存动作数组；满足。若要多动作历史必须拆表。|
|blacklist|id；业务上的当前有效 credential|id→证件、原因、生命周期|移出人姓名不复制，只存 ID；person_name 明确为加入时快照。数据库唯一性需通过“有效记录”生成列实现，不能误用 credential+status；满足。|

## 当前模型的主要范式问题如何消除

- `access_rules.methods/gates/allowed_time`：多值/复合文本改为原子 method、gate_id、TIME 起止，每个组合一行。
- `faces.person_name`、`vehicles.owner_name`、`qr_codes.owner_name`：删除可由关联标识得到的当前名称。
- `role_profiles`：角色静态展示归 roles，人员资料归 people，不再让 role_key 决定某个具体人员资料。
- `messages.read_flag`：不再用广播行表达用户已读状态；本方案删除非核心公告。
- `exceptions.actions`：16 表方案只保留最终处置；需要多动作事实时拆 `exception_actions`。
- 所有业务时间从 VARCHAR/BIGINT 统一到 DATETIME(3)/TIME，避免字符串格式参与时间语义。

## 受控反规范化边界

下列字段不视为当前主数据冗余，因为其业务语义包含时间维度：预约提交时访客/被访人快照、审批时操作者快照、通行时人员快照、异常发生和黑名单加入时名称快照。代码和字段命名必须带 `_snapshot`，且主数据修改不得回写历史快照。

`vehicles.last_access_at` 是明确标记的可重建缓存。若课程答辩要求“纯 3NF 无缓存”，可删除该字段并从 access_records 聚合；不会增加表数。

## 18 表实施结论

实际实施为 18 表：保留 `messages` 和 `audit_logs`，因为现有 React/API 与跨服务审计投递存在运行时依赖；异常表保存当前状态和最近一次处置摘要，旧表仍作为迁移回滚来源，不在本轮物理删除。18 张候选保留表均不存在已证实的部分依赖或非键决定非键问题，满足当前业务语义下的 3NF。二维码明文 token 和车辆最后通行时间分别属于安全加固与受控缓存问题，不改变范式结论。
