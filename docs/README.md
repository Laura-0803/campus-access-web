# 文档索引

正式工程文档只保留以下入口：

- [ARCHITECTURE](ARCHITECTURE.md)：微服务架构、Eureka、Ribbon、Feign、Hystrix 与 Gateway 调用链。
- [DATABASE](DATABASE.md)：18 表目标结构、ER 关系和 3NF 结论。
- [API](API.md)：核心业务接口。
- [RUNBOOK](RUNBOOK.md)：环境准备、启动、停止与故障排查。
- [DEMO](DEMO.md)：5 分钟课程演示步骤。
- [TESTING](TESTING.md)：实际执行的构建、迁移和业务回归。
- [database-refactor/](database-refactor/)：31 表审计、目标 Schema、范式证明、ER 图和迁移回滚说明。
- [archive/](archive/)：课程阶段验收记录和历史证据，不参与正式构建与启动。

旧阶段生成器、一次性探针和重复测试脚本已经移出正式工程；需要追溯时可通过 Git 历史恢复。
