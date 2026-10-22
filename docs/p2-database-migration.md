# P2独立数据库与迁移验证

实际MySQL 8.0.40。user-service及过渡层分别使用新建schema及不同受限账号；原库、P1恢复库及P0/P1备份未覆盖。没有真实账号/人员/会话迁移。所有DDL只在严格匹配campus_p2_*命名的目标执行，原initStore/修复/种子脚本从未运行。

|表|实体/Mapper|用途|
|---|---|---|
|users|UserEntity / UserMapper、DomainMapper|账号、PBKDF2哈希、当前角色及状态|
|people|PersonEntity / UserMapper、DomainMapper|完整人员档案、查询和白名单资料更新|
|roles|RoleEntity / UserMapper|六角色字典|
|role_profiles|RoleProfileEntity / UserMapper|角色展示配置，保持字典返回|
|sessions|SessionEntity / UserMapper|随机客户端Token的SHA256摘要、用户及ISO有效期|
|faces|FaceEntity / DomainMapper|主副槽位、图片元数据及人员faceStatus事务|
|vehicles|VehicleEntity / DomainMapper|归属、唯一车牌、每人2辆及最近通行|
|messages|MessageEntity / DomainMapper|原受众及共享read_flag语义|
|logs|AuditEntity / DomainMapper|用户域及过渡审计|
|verification_codes|VerificationCodeEntity / UserMapper|用途+手机号主键、摘要、过期和尝试次数|

独立SQL：[V001__user_schema.sql](../backend/user-service/src/main/resources/db/migration/V001__user_schema.sql)。保留原字符串ID/业务字段、空串与NULL映射；新增OTP表、索引、域内4个FK。仅目标库内部sort_order扩为BIGINT，用微秒顺序值保持连续新增的倒序，原表类型不变；既有排序值不重写。独立增量见[V002](../backend/database/V002__widen_internal_order.sql)。过渡outbox独立SQL在[legacy-adapter/schema.sql](../backend/legacy-adapter/schema.sql)，没有QR表操作的Java Mapper。

`node docs/p2-schema-verify.mjs`在另一个全新迁移验证schema连续执行V001两次，保留结果migration-repeat-*.json；并仅对活动合成schema幂等核对索引/FK/内部排序列。最终字段、索引和各表行数见[database-final.json](p2-evidence/database-final.json)。不能把IF NOT EXISTS当成所有旧库自动升级方案；历史真库仍需专门差异迁移审批。

所有用户服务写入是MyBatis行操作。多表注册、登录会话/审计、密码重置/撤销、上传/faceStatus使用真实事务。验证码FOR UPDATE防重复消费，错误尝试按策略提交；数据库异常则整笔回滚。车辆锁定车主行并在锁后独立COUNT，使用READ COMMITTED、语句级缓存及唯一索引防并发突破。三次并发请求最终两次201、一次400；之前的失败证据保留。

P0原库实际额外sync_status、devices同步字段及app_state保留在原库，没有删除；它们未被伪称已迁移到新运行库。历史空槽位、角色/人员类型分歧、旧明文或未知密码格式、旧会话真实导入均未迁移。新库只接收合成PBKDF2数据；Node/Java含中文密码交叉验证通过。

重启后会话、两个人脸槽位、车辆和管理账号持久化查询通过。原库19表数据/DDL散列一致，68原文件一致，官方两份原始备份及长期副本均匹配。备份恢复沿用已验收P1证据，本次只是重新保全核验。
