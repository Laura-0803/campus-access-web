# 智慧校园出入管理系统

React前端与Java微服务课程设计工程。当前隔离演示后端由Eureka双节点、Gateway、user-service、appointment-service、access-service、exception-service及aggregation-service组成，使用MyBatis与MySQL持久化。

技术组合固定为Java11、Spring Boot2.3.12.RELEASE、Spring Cloud Hoxton.SR12，保留Eureka、Ribbon、OpenFeign、Hystrix和Gateway。

## 工程目录

- `backend/`：正式Java Maven多模块工程及版本化SQL。
- `campus-access-web/src/`：React页面与API客户端。
- `campus-access-web/server/`：保留的原Express源码，当前Java演示模式不运行。
- `experiments/`：兼容性实验工程。
- `docs/`：架构、数据库、API、环境和运行说明。

## 文档入口

- [ARCHITECTURE：微服务架构与调用链](docs/ARCHITECTURE.md)
- [DATABASE：Schema、18 表、命名、3NF 与迁移](docs/DATABASE.md)
- [API：接口分域、响应约定与角色权限](docs/API.md)
- [ENVIRONMENT：跨电脑配置、密钥生成与首次运行](docs/ENVIRONMENT.md)
- [RUNBOOK：启动、停止与排障](docs/RUNBOOK.md)

## 构建与运行边界

Java构建需要独立JDK11及Maven，可在设置正确Java环境后执行`mvn -f backend/pom.xml clean verify`。前端在`campus-access-web/`中执行`npm ci`、`npm run build`。

本机统一启动入口是在仓库根目录执行 `./start-all.sh`；也可以进入 `campus-access-web/` 后执行 `npm run start-all`。首次在新电脑运行时，先复制 `campus-access-web/.env.example` 为 `.env` 并填写本机数据库密码和随机密钥。完整步骤见 [ENVIRONMENT](docs/ENVIRONMENT.md)，运行排障见 [RUNBOOK](docs/RUNBOOK.md)。

仓库不包含密码、真实业务数据库备份、`.env`、`.migration-runtime` 私密配置、依赖目录或构建产物；仅提交不含秘密的 `.env.example`。不要将本地私密配置或真实人员数据补传到仓库。

数据库采用同一 MySQL 实例内的四个逻辑 Schema：`cam_identity_{env}`、`cam_appointment_{env}`、`cam_passage_{env}`、`cam_incident_{env}`。新建库、旧 18 表迁移和命名规范见 [DATABASE](docs/DATABASE.md) 与 [ENVIRONMENT](docs/ENVIRONMENT.md)。
