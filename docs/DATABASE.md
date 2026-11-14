# 数据库设计

## 1. Schema 划分

系统在同一个 MySQL 实例内使用四个逻辑 Schema，每个服务只访问所属 Schema：

| 领域 | Schema 命名 | 本地开发名称 | 服务账号 | 表数 |
|---|---|---|---|---:|
| 身份 | `cam_identity_{env}` | `cam_identity_dev` | `cam_identity_dev_app` | 8 |
| 预约 | `cam_appointment_{env}` | `cam_appointment_dev` | `cam_appointment_dev_app` | 2 |
| 通行 | `cam_passage_{env}` | `cam_passage_dev` | `cam_passage_dev_app` | 6 |
| 安全事件 | `cam_incident_{env}` | `cam_incident_dev` | `cam_incident_dev_app` | 2 |

环境后缀使用 `dev`、`test`、`demo`。服务账号只授予所属 Schema 的 `SELECT`、`INSERT`、`UPDATE`、`DELETE` 权限。

## 2. 目标 18 表

### 身份域

| 表 | 职责 |
|---|---|
| `role_definition` | 角色定义 |
| `person_profile` | 人员主档 |
| `user_account` | 登录账号 |
| `authentication_token` | 会话和验证码令牌 |
| `biometric_credential` | 生物特征凭证 |
| `registered_vehicle` | 登记车辆 |
| `notification_message` | 角色级站内通知 |
| `audit_log` | 跨服务审计日志 |

### 预约域

| 表 | 职责 |
|---|---|
| `visit_appointment` | 来访预约、签发协调和恢复状态 |
| `appointment_review` | 预约状态变迁和审批历史 |

### 通行域

| 表 | 职责 |
|---|---|
| `campus_gate` | 校门主数据 |
| `access_device` | 门禁设备 |
| `passage_rule` | 原子化通行规则 |
| `passage_setting` | 通行业务全局配置 |
| `access_credential` | 二维码等通行凭证 |
| `passage_record` | 通行事实、幂等请求和事件投递状态 |

### 安全事件域

| 表 | 职责 |
|---|---|
| `security_incident` | 安全事件和处置状态 |
| `blacklist_entry` | 黑名单条目及生效唯一性 |

权威 DDL：

```text
backend/database/refactor/identity/V100__target_schema.sql
backend/database/refactor/appointment/V100__target_schema.sql
backend/database/refactor/passage/V100__target_schema.sql
backend/database/refactor/incident/V100__target_schema.sql
```

## 3. 命名规范

- Schema、表、字段统一使用小写 `snake_case`。
- 表名使用单数业务名词，不使用阶段编号或服务简称。
- 主键统一为 `id`，关联列使用 `*_id`。
- 编码使用 `*_code`，状态使用 `*_status` 或明确业务状态名。
- 时间点使用 `*_at`，计数使用 `*_count`，布尔列使用 `is_*`。
- 历史事实快照使用 `*_snapshot`，不得随主数据变更而回写。
- MySQL 主键索引名为 `PRIMARY`；唯一键、索引、外键、检查约束分别使用 `uk_`、`idx_`、`fk_`、`chk_`。

## 4. 第三范式边界

- `passage_rule` 一行只表示一个角色、认证方式、校门和时间窗口组合，不保存逗号文本或 JSON 多值集合。
- 同一 Schema 内使用外键；跨 Schema 只保存逻辑 ID，通过服务调用校验，不建立跨库外键。
- 人员名称、角色和证件信息仅在预约、审批、通行、安全事件等历史事实中以 `_snapshot` 保存。
- JSON 只用于幂等响应、事件载荷和审计载荷，不承载需要独立查询或约束的主数据集合。
- 签发租约、重试次数、投递状态和乐观锁版本属于聚合一致性状态，保留在对应聚合根。
- `registered_vehicle.last_access_at` 是可重建缓存；权威通行事实仍在 `passage_record`。

## 5. 初始化、迁移和回滚

数据库与账号准备模板：

```text
backend/database/prepare-local-databases.example.sql
```

已有旧 18 表结构时，按以下顺序操作：

1. 备份四个旧 Schema。
2. 创建四个规范 Schema，并执行对应 V100 DDL。
3. 复制 `backend/database/refactor/migrate/*_from_legacy_18.sql` 到临时目录，替换源 Schema 占位符后执行。
4. 执行 `backend/database/refactor/migrate/verify_row_counts.sql`，确认全部 18 张表源/目标行数一致。
5. 修改 `.env` 的 JDBC URL 指向新 Schema，再启动服务验证。
6. 出现问题时切回旧 JDBC URL；验证完成前不得删除旧 Schema。

`backend/*-service/src/main/resources/db/migration/V001...` 和 `backend/database/rollback/` 是旧结构历史资产，不是新安装入口，也不能与 V100 混合执行。

测试库清理脚本为 `backend/database/refactor/R100__drop_target_schema.sql`，禁止对生产库或包含真实数据的数据库执行。
