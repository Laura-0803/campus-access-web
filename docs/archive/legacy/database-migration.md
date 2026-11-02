# 数据库迁移初稿（P0，无数据库变更）

> P1补充：已在独立campus_p1_restore_20261019044813恢复P0备份，19表562行逐字段散列一致；这不是Java业务迁移。另建campus_p1_lab_20261019044813仅含合成lab_items表，Java受限账号无权读取原库，不访问恢复库。Maven内MyBatis CRUD测试通过，最终19原表数据/DDL散列未变。证据见p1-database-restore.json和p1-evidence/preservation-check.json。长期副本位于.private-backups/p0-preserved-20261019T041300Z，权限限制当前Windows用户，原备份未覆盖。以下P0未恢复描述为历史，当前以P1记录为准。

## 核查事实

schema.sql基线为18表168字段；2026-10-19只读连接实际MySQL成功，实际19表174字段、10个外键。18张设计表没有缺失字段；额外字段为 devices.sync VARCHAR(64)、devices.last_sync VARCHAR(64)、faces.sync_status VARCHAR(64)，以及历史app_state的id VARCHAR(64)、data JSON、updated_at TIMESTAMP。当前store不读写3个同步字段，不能因此删除；后续目标迁移必须保留值或留存原表完整归档。

完整设计字段/约束见database-dictionary.md与database-fields.csv；实际列类型、NULL、默认值、键、逐表行数与FK名称见database-live-summary.json。原库默认排序由sort_order维护；不要用新主键排序替换。roles/role_profiles以role_key为PK，sessions以token为PK，其他表以id为PK；users.username和qr_codes.token有唯一约束。appointments.appointment_id不存在，qr_codes.appointment_id并非唯一；车牌、人员code等目前主要应用层查重。

## 备份与保全

P0独立审计工具直接使用mysql2连接，仅执行information_schema SELECT、SHOW CREATE TABLE、START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY、全表SELECT及ROLLBACK，没有导入store/initStore，没有DDL/DML。包含全部19表的DDL与行数据快照已写入系统临时目录，位置/SHA256见database-live-summary.json；原始凭证、个人资料和Token未写入docs。快照是JSON封装的DDL+rows，不是mysqldump SQL，不能称为已经恢复验证的SQL备份。

原项目源文件另外打包到同一私有临时备份目录，包含历史db.json和原.env供恢复，排除node_modules/dist/IDE/logs；清单与SHA256见backup-manifest.json。备份有敏感信息，只在本机临时目录，禁止提交。临时目录可能被清理；正式数据迁移前必须转存用户控制的长期保管位置，并对隔离空库做恢复演练。P0未恢复、不覆盖原库，恢复性仍是待办。

## 逐域归属和字段转换

18表归属见service-boundaries.md。保留字符串ID、历史状态、空字符串/NULL；应用DTO用原camelCase，XML明确别名/resultMap。faces.slot_key→slot、messages.read_flag→布尔read；access_rules.methods/gates、exceptions.actions为TEXT内JSON，需解析容错但记录坏值，不能默默丢失；role_profiles.role_value→role；roles输出字典对象，不改成数组；settings.face_threshold为数值、high_risk_auto_block为布尔。

日期目前大多VARCHAR，含相对日期、“暂无”等旧值；store迁移对部分旧时间使用固定历史日补齐，不得直接按今天重写。初期保留原文列，后续如新增DATETIME/时区字段采用双列、显式解析失败清单与回填校验，未经验证不ALTER覆盖。会话ISO时间和业务上海文本分别处理。

PBKDF2必须兼容Node使用hex盐字符串作为字节输入，先做脱敏固定测试向量，不能让Java用hex解码盐破坏登录。明文旧密码仍可能存在于历史app_state/db.json/seed；不能把这些复制成Java公开种子；对在线用户迁移逐个检测hash前缀并规划安全渐进升级。Token若改摘要保存要保持客户端原Token可用，明确旧会话兼容窗口和撤销策略。

## 增量执行顺序（未来执行）

1. 完成长期备份、隔离恢复、表/字段/索引/约束和脱敏质量核查；停止旧进程写入，避免缓存写回覆盖。
2. 独立创建服务schema/最小权限用户；保留原库，版本化migration脚本与执行记录，先增列/新表/新索引，重复运行需安全判断。
3. 依稳定ID复制、映射并记录校验值；跨域FK改为API关联，域内保留/重建可验证外键；不能在运行原库直接解除全部约束。
4. 审批audit/version、签发幂等键、outbox、异常eventId等新增字段/表逐项设计；加唯一键前检测历史重复，不能先删行解决冲突。
5. 校验18表与app_state归档、逐表行数、主键集合、字段摘要、孤儿引用、状态分布、旧QR/通行关联；核对额外同步列。两阶段旧审计缺失标记未知，不能补造审核过程。
6. Java读写独立验收后再切Gateway，保留回退入口；发生失败先停新写入再按已审计步骤回退，避免双写漂移。禁止在P0/P1先删除Node或重建旧库。

备份质量/静态核查结果见database-quality-summary.json。当前快照是一次只读事务视图，执行期间若外部应用发生DDL或使用非事务引擎，需额外锁定备份窗口；本次表DDL显示InnoDB。未执行迁移、未验证JavaMyBatis落库，不标记这些通过。

本次快照质量结果：10类外键引用的孤儿计数均0；用户名、人员code、车牌和非空预约QR关联的重复分组均0；24个在线users密码均为PBKDF2格式（不代表历史app_state/种子已安全，也不证明口令强度）。预约状态分布：已通过16、未通过4、待被访人审核7；“待保卫处审核”等状态目前无行，后续必须构造隔离测试样例，不伪称现有数据覆盖全部状态。
