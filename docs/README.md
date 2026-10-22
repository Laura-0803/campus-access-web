# 阶段分析与实验交付索引

## 当前P5前置分析与隔离集成准备

P4-C已获阶段验收。本轮P5分析与集成检查已结束，等待下一次审批；原68 API为Java62、Express过渡5、人员删除禁用1，不能写成后端100% Java或所有页面可操作。下方P0–P2文字保留为历史索引，不代表当前审批状态。

- [系统集成审计](p5-system-integration-audit.md)
- [68条API最终状态](p5-final-api-inventory.md)
- [前端真实入口与缺口](p5-frontend-feature-gaps.md)
- [六项遗留功能方案（仅分析）](p5-remaining-features-plan.md)
- [课程评分矩阵](p5-course-rubric-matrix.md)
- [本轮真实集成证据](p5-integration-test-evidence.md)
- [统一启停与健康检查](p5-startup-and-shutdown.md)

## P2当前交付

方案A及隔离共存已批准；32个候选接口已实现并隔离验证，人员删除暂停，真实短信/浏览器验收未完成，未进入P3。见[P2验收](p2-acceptance.md)、[API映射](p2-api-migration.md)、[真实证据](p2-test-evidence.md)、[删除待审方案](p2-delete-contract.md)。正式代码在../backend；原React/Express和P1实验保留。

## P0/P1历史索引

P0只读分析日期：2026-10-19。用户已批准P1隔离环境/恢复/技术实验；原业务迁移尚未开始。

P1入口：[阶段验收记录](p1-acceptance.md)。独立代码在experiments/p1-legacy-lab。**续测已完成：Ribbon根因修复、双实例分流、Hystrix实际熔断/探测恢复、Eureka故障恢复、MyBatis HTTP CRUD/持久化及保全检查均通过；等待用户审核，未进入P2**。

新增报告：[Ribbon诊断](p1-ribbon-diagnosis.md)、[Hystrix测试](p1-hystrix-test.md)、[续测汇总](p1-evidence/resume-summary.json)。本轮文件清单见p1-resume-file-manifest.csv；上轮失败及其文件清单p1-file-manifest.csv原样保留。所有实验JVM已停止，不自动重跑或迁移业务。

|文件|内容|
|---|---|
|current-system-audit.md|项目根目录、模块和核心业务现状|
|source-inventory.csv、original-file-hashes.csv|逐文件依赖/导出/API和完整源文件散列|
|api-inventory.csv、frontend-api-map.md|68条路由、62封装、前端调用点/页面入口|
|api-contract.md、api-response-fields.md|字段/包装/状态码/排序/分支契约|
|role-permission-matrix.md|六角色有效权限矩阵|
|database-dictionary.md、database-fields.csv|18表168设计字段及归属|
|database-migration.md|只读核查、实际差异、备份与增量迁移初稿|
|database-live-summary.json、database-quality-summary.json|19表174实际字段、行数、外键、角色/质量计数|
|service-boundaries.md|四业务服务和基础模块、跨服务协作与一致性|
|compatibility-decision.md、technical-risks.md|官方兼容性初查、双路线、风险待办|
|test-evidence.md、p0-verification.json、static-summary.json|实际命令结果和机器可读检查|
|backup-manifest.json|本机临时备份位置和SHA256，不包含原数据|
|acceptance-checklist.md、migration-progress.md|阶段验收与实现/运行/测试状态|
|p0-audit.py、p0-runtime-check.mjs、p0-finalize.py|本阶段文档目录内的可审查审计工具，未加入应用脚本|

P0历史说明：当时仅新增外层docs文件，备份在临时目录；P1已补做长期副本、隔离恢复、新Git和独立实验工程。现有应用文件仍未修改。敏感备份/本机配置始终未进入Git，docs只保留脱敏结构/计数/散列/运行证据。P0工具会重写其产物，当前不要重跑它们覆盖已审核阶段记录；P1实验也不代表正式业务架构已迁移。
