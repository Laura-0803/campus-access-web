# P4-C真实测试证据

最终七项目Reactor Maven clean verify通过：[构建](p4c-evidence/build-3/maven-readable.txt)；[真实依赖树](p4c-evidence/dependencies-1/maven-readable.txt)。没有JUnit业务测试，不把Maven无测试报成功当作功能通过。

[整套执行摘要](p4c-evidence/verification-20261020T203338417710/summary.json)。以下全部为实际Java/SQL/HTTP或真实Edge执行，共496项断言；轮询次数不同可能改变统计，非接口数。

|实际测试|通过断言|原始证据|
|---|---:|---|
|p4c-core-test.mjs|58|[core-1792499620350.json](p4c-evidence/core-1792499620350.json)|
|p4c-security-test.mjs|32|[security-1792499624903.json](p4c-evidence/security-1792499624903.json)|
|p4c-integration-test.mjs|34|[integration-1792499628211.json](p4c-evidence/integration-1792499628211.json)|
|p4c-regression-core-test.mjs|75|[core-1792499632416.json](p4c-evidence/core-1792499632416.json)|
|p4c-regression-query-contract-test.mjs|102|[contracts-1792499638044.json](p4c-evidence/contracts-1792499638044.json)|
|p4c-regression-config-test.mjs|11|[configuration-1792499650372.json](p4c-evidence/configuration-1792499650372.json)|
|p4c-regression-issuance-test.mjs|54|[issuance-1792499651670.json](p4c-evidence/issuance-1792499651670.json)|
|p4c-regression-race-test.mjs|15|[races-1792499689075.json](p4c-evidence/races-1792499689075.json)|
|p4c-fault-test.mjs|26|[faults-1792499698499.json](p4c-evidence/faults-1792499698499.json)|
|p4c-architecture-test.mjs|9|[architecture-1792499740941.json](p4c-evidence/architecture-1792499740941.json)|
|p4c-regression-browser-test.mjs|55|[report.json](p4c-evidence/browser-1792499766114/report.json)|
|actual-java-policy|22|[policy-20261020T203226.json](p4c-evidence/policy-20261020T203226.json)|
|real-bigint-front-insert|3|[sort-overflow-1792499890277.json](p4c-evidence/sort-overflow-1792499890277.json)|

## 数据和失败证据

[最终数据证据](p4c-evidence/data-final-1792499952828.json)包含MySQL版本、账号授权、各表计数、跨库拒绝、既有合成记录完整性、BIGINT及投递清零。原19表DDL和数据、两份备份见[preservation-final](p4c-evidence/preservation-final.json)；原68源文件见preflight报告。P4-C代码/证据SHA256见p4c-change-files.csv和p4c-evidence/final-manifest.json。

首轮Bearer遗漏导致合法调用401、初期Hystrix累计计数断言不成立，以及Java源码探针默认编码导致中文全天断言失败，均留存失败报告；分别修复身份头、以真实open/health错误及恢复证明熔断、探针显式UTF-8后重跑。未改框架版本，未覆盖失败证据。旧时间策略探针明确安全未通过，不能把它当作新策略测试通过。

所有11个本轮端口已关闭，Edge由finally关闭。短信、物理门禁、多主机HA、长期压测及所有崩溃指令点穷举未测试。

本轮仅隔离合成环境。原React、Express、生产数据库和历史备份不变；不进入人员删除、无绑定预约改造或后续阶段。
