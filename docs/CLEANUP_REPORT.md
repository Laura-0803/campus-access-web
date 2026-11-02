# 工程清理报告

基线为 `ff90075ae24bf6ec20a4860bca73be384b149b53`，实施分支为 `hanyuye/database-refactor-engineering`。

## 清理结果

- 正式文档入口收敛为 README、ARCHITECTURE、DATABASE、API、RUNBOOK、DEMO、TESTING 和数据库重构目录。
- 删除 196 个不被 Maven、npm 或正式演示引用的旧阶段生成器、一次性探针和重复测试脚本。
- 原 101 份阶段验收 Markdown/JSON/CSV 已提炼为一份 [课程研发历程总结](archive/COURSE_HISTORY.md)，逐份旧文件不再保留在当前工程树中；原文仍可从 Git 基线提交恢复。
- Express 后端仍被 `npm run api/start` 和旧兼容入口引用，因此保留；正式课程演示不启动它。
- `experiments/p1-legacy-lab` 是课程技术验证源码，移出正式 reactor 但不删除。

## 工程入口

- Java 全栈：`cd campus-access-web && npm run dev:java`
- Maven：`mvn -f backend/pom.xml clean verify`
- React：`cd campus-access-web && npm run build`
- 数据库：`backend/database/refactor/*/V100__target_schema.sql`

详细测试结果见 [TESTING](TESTING.md)。
