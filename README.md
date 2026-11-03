# 智慧校园出入管理系统

React前端与Java微服务课程设计工程。当前隔离演示后端由Eureka双节点、Gateway、user-service、appointment-service、access-service、exception-service及aggregation-service组成，使用MyBatis与MySQL持久化。

技术组合固定为Java11、Spring Boot2.3.12.RELEASE、Spring Cloud Hoxton.SR12，保留Eureka、Ribbon、OpenFeign、Hystrix和Gateway。

## 工程目录

- `backend/`：正式Java Maven多模块工程及版本化SQL。
- `campus-access-web/src/`：React页面与API客户端。
- `campus-access-web/server/`：保留的原Express源码，当前Java演示模式不运行。
- `experiments/`：兼容性实验工程。
- `docs/`：阶段验收、API清单、数据库结构、设计和运行说明。

## 文档入口

- [ARCHITECTURE：微服务架构与调用链](docs/ARCHITECTURE.md)
- [DATABASE：31 表、ER 关系与第三范式审计](docs/DATABASE.md)
- [API：核心接口](docs/API.md)
- [RUNBOOK：启动、停止与排障](docs/RUNBOOK.md)
- [DEMO：5 分钟验收脚本](docs/DEMO.md)
- [TESTING：测试方法和实际结果](docs/TESTING.md)
- [历史阶段资料索引](docs/README.md)

## 构建与运行边界

Java构建需要独立JDK11及Maven，可在设置正确Java环境后执行`mvn -f backend/pom.xml clean verify`。前端在`campus-access-web/`中执行`npm ci`、`npm run build`。

本机统一启动入口是在仓库根目录执行 `./start-all.sh`；也可以进入 `campus-access-web/` 后执行 `npm run start-all`。该入口启动双 Eureka、Gateway、四个业务服务、聚合服务和 React，并确保两个 Eureka 节点使用不同主机标识。详细环境变量与停止方式见 [RUNBOOK](docs/RUNBOOK.md)。

仓库不包含密码、真实业务数据库备份、`.env`、`.p*-local`私密配置、原始测试证据目录、依赖目录或构建产物。原始运行日志和截图保留在受控本地，因此部分阶段报告中的原始证据链接只适用于完整本地工作区。不要将本地私密配置或真实人员数据补传到仓库。

人员删除、无绑定人员预约最终批准及HOLD人工恢复继续保持既有保护；不包含正式业务数据库切换。
