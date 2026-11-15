# 本地环境

使用 JDK 11、Maven、Node.js 与 MySQL 8。按 campus-access-web/.env.example 配置私有 .env。

四组 IDENTITY_DB_*、APPOINTMENT_DB_*、PASSAGE_DB_*、INCIDENT_DB_* 均指向同一个 campus_access_dev；USERNAME/PASSWORD 可分别使用四个独立 DML 账号。CAMPUS_INTERNAL_KEY 与 CREDENTIAL_RECOVERY_KEY 使用独立随机开发密钥，不复用数据库密码。不要上传 .env 或备份。

新安装：创建 campus_access_dev，执行 backend/database/unified/V001__unified_schema.sql，再创建独立账号并授予运行所需 SELECT/INSERT/UPDATE/DELETE。不需要创建 cam_identity_dev 等四库。历史阶段库迁移见 DATABASE.md，禁止直接覆盖旧库。

构建：mvn -f backend/pom.xml clean verify（JAVA_HOME/PATH 必须使用 JDK 11）。前端已有依赖时无需重装。启动：在 campus-access-web/ 执行 npm.cmd run start-all。需提前在启动进程环境指定 JAVA_BIN 或 JDK 11 PATH，启动器读取 .env 前已决定 java 命令。

本机恢复环境的逐服务启动脚本为 Git 忽略的 .migration-runtime/start-local.mjs；日志及 PID 也位于该目录。不要重复启动已有实例。

顺序：MySQL、双 Eureka、user、appointment、access、exception、aggregation、gateway、前端。验证双注册中心所有实例 UP、网关 /api/roles 与 /api/health 返回 200、前端 /api/roles 代理正常。前端 http://127.0.0.1:5173/。
