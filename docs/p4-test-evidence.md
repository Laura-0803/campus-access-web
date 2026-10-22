# P4真实测试证据

最终源码使用build-9执行Maven clean verify，六个Reactor项目BUILD SUCCESS。Maven无JUnit业务测试；下表是构建后真实启动、HTTP、MySQL及浏览器测试，不能把编译计为功能通过。

[完整执行摘要](p4-evidence/verification-20261019T225910170625/summary.json)；[构建日志](p4-evidence/build-9/maven-readable.txt)；[实际依赖树](p4-evidence/dependencies-final/maven-readable.txt)。原始UTF-16日志一并保留。

|真实测试组|通过断言数|证据|
|---|---:|---|
|core|75|[core-1792421954136.json](p4-evidence/core-1792421954136.json)|
|contracts|102|[contracts-1792421959916.json](p4-evidence/contracts-1792421959916.json)|
|configuration|11|[configuration-1792421971801.json](p4-evidence/configuration-1792421971801.json)|
|security|28|[security-1792421972926.json](p4-evidence/security-1792421972926.json)|
|issuance|54|[issuance-1792421976176.json](p4-evidence/issuance-1792421976176.json)|
|races|15|[races-1792422012890.json](p4-evidence/races-1792422012890.json)|
|architecture|62|[architecture-1792422022427.json](p4-evidence/architecture-1792422022427.json)|
|browser|52|[report.json](p4-evidence/browser-1792422091501/report.json)|

合计 **399项断言通过**。所有测试均晚于最终access-service JAR构建。架构轮询次数会影响断言数，以本轮报告为准。

## 数据与保全

[data-final-1792422179265.json](p4-evidence/data-final-1792422179265.json)：跨库SELECT真实拒绝、MySQL版本与SHOW GRANTS、各表行数、唯一预约签发槽、未交付事件0、故障注入剩余0。HOLD操作保留，不伪装全部成功。

[原19表数据/DDL及两份备份检查](p4-evidence/preservation-final.json)；最近preflight报告证明原68文件哈希一致、敏感文件未被Git跟踪。[进程关闭](p4-evidence/process-closure.json)记录九端口均关闭。默认JDK21和独立JDK11并存，见environment报告。

## 失败记录与运行边界

先前冷启动、风险事件sort_order溢出、浏览器phone未就绪、二维码展示选择不同测试夹具等失败证据均保留；修复后重跑，不覆盖旧报告。最终通过仅引用上表同一最终构建的完整轮次。

真实硬件、短信送达、跨主机HA、长期压测、所有崩溃指令点穷举未测试。原页面没有已挂载扫码模拟和规则验证按钮，采用真实Edge执行原API客户端，不能写成对应UI按钮已通过。未绑定人员预约最终审批仍503保护。

本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。
