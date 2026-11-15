# 运行手册

JDK 11、Maven、Node.js、MySQL 8。先配置私有 campus-access-web/.env，四个业务数据源统一指向 campus_access_dev。初始建库、迁移与回滚见 DATABASE.md，环境设置见 ENVIRONMENT.md。

构建：mvn -f backend/pom.xml clean verify。
启动：campus-access-web 目录执行 npm.cmd run start-all，或支持 Bash 的环境执行仓库根目录 ./start-all.sh。必须先停旧进程，避免端口占用和 Windows JAR 文件锁。

启动顺序：MySQL → 双 Eureka → user → appointment → access → exception → aggregation → gateway → 前端。业务运行时存在相互调用依赖，最后应验证聚合健康。

访问：http://127.0.0.1:5173/。
验证：19761、19762 的 /eureka/apps 全部 UP；19800/api/roles 和 /api/health 为 200；5173/api/roles 正常；旧 Express 3001 不监听。

启动失败应查看各进程完整日志，重点检查统一库名称、DML 账号权限、CAMPUS_INTERNAL_KEY、恢复密钥、MySQL 连接和注册中心互联。禁止为绕过检查使用 root 作为业务数据源。

Ctrl+C 停止标准启动器；后台逐服务启动时按 .migration-runtime/pids.json 精确停止本项目进程。不要终止其他 Java 项目。
