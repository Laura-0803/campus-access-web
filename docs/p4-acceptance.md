# P4-A / P4-B提交审核

本轮隔离实现和最终复验已完成，**等待用户验收，未进入P4-C或后续阶段**。整体仍有明确未完成/待审批边界，不能标为全部需求验收通过。

补充审批：用户已批准未绑定人员预约本轮暂缓；该分支仍为未完成、不计入完整业务验收，保持503及原错误包装、不改状态、不生成二维码。后续须保留历史场景并设计正式兼容方案，不伪造人员绑定。本次只更新审批文档，399项既有测试结果不变。

|范围|已实现|已编译|已启动|已真实测试|未完成/待审批|
|---|---|---|---|---|---|
|P4-A 15条原API及撤码|是|build-9通过|独立access/Eureka/Gateway|真实SQL、六角色、规则、并发、故障恢复|原前端缺少扫码/规则验证按钮；硬件未测|
|P4-B 已绑定人员签发闭环|是|通过|隔离启用|真实200/QR/通行落库、未知503、重复/崩溃/权限变化恢复|未绑定人员审批503保护；HOLD人工恢复入口未实现|
|P4-C exception-service|仅分析设计|不适用|未启动正式服务|未迁移|待单独批准|
|P2人员删除Saga|未实施|不适用|禁用|保护保留|未批准|

最终Maven clean verify成功；399项实际断言全部通过（其中Edge52项），详见[p4-test-evidence.md](p4-test-evidence.md)。此数字不把编译/启动算作业务成功。

15原API映射、SQL、权限和差异见[p4-api-migration.md](p4-api-migration.md)；分层与服务调用见[p4-access-service-design.md](p4-access-service-design.md)；库归属见[p4-database-migration.md](p4-database-migration.md)；[签发设计](p4-qr-issuance-design.md)、[一致性故障测试](p4-qr-consistency-test.md)、[规则测试](p4-access-policy-tests.md)、[浏览器报告](p4-browser-regression.md)、[异常域设计](p4-exception-analysis.md)。

## 保全与风险

原68源码文件、19表数据及DDL、原始备份和长期副本校验一致。敏感文件不在Git跟踪范围，无批量提交；隔离账号跨库SQL真实拒绝。P1/P2/P3原测试证据保留，P3实施前文档已更正并留存原文归档。

Java11独立环境保留默认JDK21，框架版本未改；真实依赖树与实际JAR库均有证据。九个本轮服务端口已关闭，测试Edge由finally关闭。源码/变更哈希清单及证据manifest见p4-change-files.csv和p4-evidence/final-manifest.json。

两个数据库没有全局原子性。UNKNOWN可部分提交，HOLD需人工审查，不自动撤销可能有效码；实时认证与本地提交间的时间窗口、单主机环境、旧格式规则时间兼容、未绑定人员和缺失UI入口均明确保留。真实短信、移动适配、账号状态独立UI仍属P2遗留。本轮不宣称正式上线可用。

本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。
