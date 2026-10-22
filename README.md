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

- [最终工程审计](docs/p7-final-engineering-audit.md)
- [演示启动与就绪说明](docs/p7-demo-readiness.md)
- [五分钟演示脚本](docs/p7-demo-script.md)
- [数据库表与全部字段](docs/current-database-schema.md)
- [API迁移状态](docs/p5-final-api-inventory.md)
- [演示账号快捷登录说明](docs/demo-shortcut-fix.md)

## 构建与运行边界

Java构建需要独立JDK11及Maven，可在设置正确Java环境后执行`mvn -f backend/pom.xml clean verify`。前端在`campus-access-web/`中执行`npm ci`、`npm run build`。

本机统一启动入口是`python docs/p7-system.py start`，健康检查为`health`，状态为`status`，关闭为`stop`。这些脚本依赖已准备的隔离MySQL数据库、账号权限、私密运行配置及本机JDK路径，不是新电脑零配置安装器。

仓库不包含密码、真实业务数据库备份、`.env`、`.p*-local`私密配置、原始测试证据目录、依赖目录或构建产物。原始运行日志和截图保留在受控本地，因此部分阶段报告中的原始证据链接只适用于完整本地工作区。不要将本地私密配置或真实人员数据补传到仓库。

人员删除、无绑定人员预约最终批准及HOLD人工恢复继续保持既有保护；不包含正式业务数据库切换。
