# 跨电脑运行与环境配置

本项目不会把数据库密码、内部调用密钥或数据恢复密钥提交到 Git。每台电脑第一次运行时，都需要基于模板创建自己的 `campus-access-web/.env`。

## 1. 环境要求

- JDK 11
- Maven 3.6 或更高版本
- Node.js 18 或更高版本、npm
- MySQL 8
- OpenSSL（用于生成随机密钥，macOS 和多数 Linux 默认提供）

## 2. 创建本机配置

在仓库根目录执行：

```bash
cp campus-access-web/.env.example campus-access-web/.env
```

生成两条相互独立的随机密钥：

```bash
openssl rand -hex 32
openssl rand -hex 32
```

将第一条结果填入 `CAMPUS_INTERNAL_KEY`，第二条结果填入 `CREDENTIAL_RECOVERY_KEY`。不要复用数据库密码，也不要把生成结果提交到 Git、README、聊天记录或截图中。

然后编辑 `campus-access-web/.env`，填写本机四个数据库账号的真实密码。Schema 名应使用模板中的规范名称；本机 MySQL 端口如有调整，应同步修改 JDBC URL。

## 3. 配置项说明

| 配置前缀 | 用途 | 使用方 |
|---|---|---|
| `IDENTITY_DB_*` | 身份、人员、会话、生物凭证和车辆 Schema | `user-service` |
| `APPOINTMENT_DB_*` | 来访预约、审批和签发协调 Schema | `appointment-service` |
| `PASSAGE_DB_*` | 通行凭证、设备、规则和通行记录 Schema | `access-service` |
| `INCIDENT_DB_*` | 安全事件和黑名单 Schema | `exception-service` |
| `CAMPUS_INTERNAL_KEY` | 保护微服务 `/internal/**` 接口 | 所有 Java 微服务 |
| `CREDENTIAL_RECOVERY_KEY` | 加密可恢复的审批、签发状态 | 预约和通行业务链路 |
| `*_SERVICE_ENABLED` | 控制 Gateway 是否启用对应正式路由 | `gateway-service` |
| `*_INTERNAL_API_ENABLED` | 控制服务内部业务接口 | 对应业务服务 |

`.env.example` 可以提交，因为它只有占位值；`.env` 必须保持为本机私密文件。

## 4. 数据库准备

四个服务应使用相互独立的数据库和账号。新电脑请使用模板中的标准数据库名 `cam_identity_dev`、`cam_appointment_dev`、`cam_passage_dev`、`cam_incident_dev`；服务启动时会通过安全白名单拒绝其他数据库名称。

仓库提供了不含真实密码的准备模板：

```text
backend/database/prepare-local-databases.example.sql
```

先复制该文件到 Git 忽略的本机临时位置，替换其中所有 `CHANGE_ME_*` 密码，再使用 MySQL 管理员账号执行。不要直接在受控或生产 MySQL 上运行：

```bash
cp backend/database/prepare-local-databases.example.sql /tmp/prepare-campus-databases.sql
# 编辑 /tmp/prepare-campus-databases.sql 后执行
mysql -u root -p < /tmp/prepare-campus-databases.sql
```

然后仍使用管理员账号分别初始化四个数据库的目标表结构：

```bash
mysql -u root -p cam_identity_dev < backend/database/refactor/identity/V100__target_schema.sql
mysql -u root -p cam_appointment_dev < backend/database/refactor/appointment/V100__target_schema.sql
mysql -u root -p cam_passage_dev < backend/database/refactor/passage/V100__target_schema.sql
mysql -u root -p cam_incident_dev < backend/database/refactor/incident/V100__target_schema.sql
```

目标表结构位于：

```text
backend/database/refactor/identity/V100__target_schema.sql
backend/database/refactor/appointment/V100__target_schema.sql
backend/database/refactor/passage/V100__target_schema.sql
backend/database/refactor/incident/V100__target_schema.sql
```

`backend/*-service/src/main/resources/db/migration/V001...` 和 `backend/database/rollback/*` 是旧结构迁移资产，不是新安装入口。不要将它们与 V100 规范结构混合执行。

如果已有旧 18 表结构，请按以下顺序迁移：

1. 备份四个旧 Schema。
2. 创建四个规范 Schema 并执行上述 V100 脚本。
3. 复制 `backend/database/refactor/migrate/*_from_legacy_18.sql` 到临时目录，替换源 Schema 占位符后执行。
4. 执行 `verify_row_counts.sql`，确认每张表源/目标行数一致。
5. 修改 `.env` 指向新 Schema，构建并观察服务。
6. 回滚时切回旧 JDBC URL；验证完成前不得删除旧 Schema。

服务账号只拥有业务运行需要的 `SELECT/INSERT/UPDATE/DELETE` 权限，因此不能用服务账号执行建表脚本。Schema、18 表、命名和 3NF 边界见 [DATABASE](DATABASE.md)。执行 SQL 前确认当前连接的是本机隔离数据库，不要直接对生产库或包含真实数据的数据库执行初始化、重构或回滚脚本。

## 5. 安装、构建和启动

首次运行：

```bash
cd campus-access-web
npm install
cd ..
mvn -f backend/pom.xml clean package
./start-all.sh
```

后续已经安装依赖并完成构建时，可以直接执行：

```bash
./start-all.sh
```

启动后访问：

```text
http://localhost:5173
```

按 `Ctrl+C` 统一停止服务。

## 6. 常见问题

- 提示缺少环境变量：确认已经复制 `.env.example`，并且没有保留 `CHANGE_ME_*` 占位值。
- 提示 JDBC 地址不安全：正式启动器只允许连接 `127.0.0.1` 上的隔离 MySQL。
- 提示密钥长度不足：重新执行 `openssl rand -hex 32`，完整复制 64 位十六进制结果。
- 提示缺少 JAR：先执行 `mvn -f backend/pom.xml clean package`。
- 提示端口占用：停止上一次运行的服务，再重新执行 `./start-all.sh`。
