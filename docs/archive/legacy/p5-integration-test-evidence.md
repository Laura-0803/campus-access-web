# P5隔离集成验证证据

当前四Java业务服务复用P4-C build-3已审核JAR；本轮未修改Java/POM/React，不声称进行了新的Maven构建。源文件逐项SHA不变、可执行JAR与P4-C环境记录哈希一致，见preservation-final/source-verification/environment报告。最新真实clean verify仍是[p4c构建日志](p4c-evidence/build-3/maven-readable.txt)。

本轮共436项实际断言通过：[执行摘要](p5-evidence/verification-20261020T211506994879/summary.json)。早先聚合脚本把/dashboard/admin误作普通角色数据结构，失败保留，修正后只续测受影响及后续套件；摘要中reusedPassedEvidenceFrom明确标识本轮已通过的先前证据，没有伪装重新执行。

|本轮真实测试|断言数|证据|
|---|---:|---|
|p5-core-test.mjs|58|[core-1792501909789.json](p5-evidence/core-1792501909789.json)（沿用本轮先前通过结果，未重跑）|
|p5-security-test.mjs|32|[security-1792501914297.json](p5-evidence/security-1792501914297.json)（沿用本轮先前通过结果，未重跑）|
|p5-integration-test.mjs|34|[integration-1792501918027.json](p5-evidence/integration-1792501918027.json)（沿用本轮先前通过结果，未重跑）|
|p5-regression-core-test.mjs|75|[core-1792501922375.json](p5-evidence/core-1792501922375.json)（沿用本轮先前通过结果，未重跑）|
|p5-regression-query-contract-test.mjs|102|[contracts-1792501927916.json](p5-evidence/contracts-1792501927916.json)（沿用本轮先前通过结果，未重跑）|
|p5-regression-config-test.mjs|11|[configuration-1792501940166.json](p5-evidence/configuration-1792501940166.json)（沿用本轮先前通过结果，未重跑）|
|p5-aggregate-test.mjs|34|[aggregates-1792502107503.json](p5-evidence/aggregates-1792502107503.json)|
|p5-fault-test.mjs|26|[faults-1792502110569.json](p5-evidence/faults-1792502110569.json)|
|p5-architecture-test.mjs|9|[architecture-1792502152435.json](p5-evidence/architecture-1792502152435.json)|
|p5-regression-browser-test.mjs|55|[report.json](p5-evidence/browser-1792502175222/report.json)|

健康报告记录双Eureka、双user/exception、appointment、access、Gateway、Express桥接、React、四隔离库SELECT1及真实Gateway请求。普通模式启动、重复start不重建进程、stop全端口关闭、再次启动均真实运行。本轮故障套件显式P5_FAULT_TEST=true，普通启动默认关闭注入。

收尾新增prepare权限复制最初触发Windows SeSecurityPrivilege错误，PowerShell却返回0；仅检查退出码/配置哈希的早期prepare-repeatability.json不能证明权限步骤成功。明确失败见[权限失败记录](p5-evidence/prepare-repeatability-20261020T212123.json)。已改为仅复制DACL、不复制SACL并遇错停止；[修复后的重复prepare](p5-evidence/prepare-repeatability-20261020T212150.json)实际exitCode=0、stderr空、私有配置哈希不变。本次修复仅准备脚本，不改业务代码或申请额外系统权限；业务回归结果保持原记录。

覆盖六角色登录/退出及越权、访客预约/两审/真实二维码/SQL通行记录、异常生成/处置、黑名单、管理员统计及报表与Java域真实计数一致、事务触发器回滚、发送方重启续投及幂等、实际Ribbon两user分流、Hystrix真实open/错误/短路/恢复、Edge原页面。Edge截图只存遮罩图，扫码/规则验证仍是浏览器原API客户端调用，不写成不存在的按钮。

没有运行P4-B的撤权/签发冲突HOLD生成套件，以免扩大本轮授权；该故障矩阵仍引用[p4一致性证据](p4-qr-consistency-test.md)。本轮只新建正常已绑定预约并走原200闭环，无绑定分支503保护在通行核心回归中保留。

原68源码、原19表数据DDL及原始/长期备份复核一致：[保全](p5-evidence/preservation-final.json)。既有HOLD摘要前后相同且未新增：[HOLD保全](p5-evidence/hold-after.json)。所有11测试端口关闭；普通停止不停止本机MySQL服务或其他非本轮进程。测试Edge由finally关闭。历史P0–P4-C证据不覆盖，敏感文件未跟踪，最终哈希见p5-change-files.csv。
