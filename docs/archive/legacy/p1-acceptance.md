# P1 运行验收完成，等待用户审核

2026-10-19：本轮已通过所有要求的隔离实验，**未进入P2**。此前失败证据未覆盖；用户审核尚待完成。当前全部自建JVM已停止。

## 实现、编译、启动与测试分别记录

|项目|已实现|已编译|已启动/执行|已测试通过|未完成/边界|
|---|---|---|---|---|---|
|长期备份/源码恢复/数据库恢复|是|不适用|是|68源码文件、19表562行恢复；本轮备份散列再核对一致|同盘本机副本，不是异机灾备|
|Git/.gitignore|是|不适用|是|先前新初始提交2ad1ddb；不是历史恢复|本轮未修改Git或批量提交原代码|
|四模块Java原型|是|是|六个独立JVM|Maven verify成功，JUnit2项0失败|仅合成接口，不是正式业务迁移|
|双Eureka及服务发现|是|是|18761/18762|双向peer、两端双实例、缓存与Ribbon分层持续核查|本机进程级实验|
|Ribbon|是|是|18811/18812|20次{'18811': 11, '18812': 9}；ZoneAvoidanceRule；真实Ribbon Bean|未要求严格比例|
|OpenFeign/Gateway|是|是|18821/18800|按服务名调用、统一入口、provider/consumer/circuit路由、诊断不经网关|没有连接原68API|
|Hystrix|是|是|是|实际失败/fallback/开路/短路/半开探测/成功恢复|原生没有HALF_OPEN枚举，详见专门报告|
|Eureka单节点故障恢复|是|是|真正停止并恢复18761|故障期间6次调用正常、18811新进程仅注册18762、18761恢复后各层再次双实例|非物理机/网络分区HA|
|MyBatis|Entity/Dao/XML/Service/Controller|是|真实隔离MySQL|JUnit+HTTP增查改删、400/404、实例重启后持久化、另一实例读到更新|只使用lab_items合成表|
|数据库隔离|是|不适用|是|Java同账号仅实验库；读原库/恢复库均拒绝|无真实业务数据迁移|
|原系统保全|保持原样|不适用|只读核查|68文件未变、19原表数据/DDL未变、备份未覆盖|未修改React/Express/API/权限|

## 最终本机实验版本

Temurin11.0.32.1+1，Maven3.9.11；Boot2.3.12.RELEASE / Framework5.2.15.RELEASE；CloudHoxton.SR12；Cloud Netflix/OpenFeign/Gateway2.2.9.RELEASE；Eureka1.10.14；Ribbon2.3.0；Hystrix1.5.18；Feign10.12；MyBatis Starter2.1.4/Core3.5.6/Spring2.0.6；Connector/J8.0.25；MySQL8.0.40。与此前依赖树坐标集合及运行库文件名逐项相同，未升级降级。传递依赖中的LoadBalancer未替代Ribbon，未使用Resilience4j。

## 根因、变更和证据

根因是注册中心优先IP导致Eureka按主机名误排除peer，从而单向复制与远端租约过期，不是Ribbon版本冲突。仅注册中心改prefer-ip-address=false，并增加本地只读分层诊断、实际Hystrix指标和有超时的等待/稳定性门槛。原9秒租约对照亦通过，完整故障测试使用10秒续约/90秒租约。

- [Ribbon诊断、前后列表和20次采样](p1-ribbon-diagnosis.md)
- [Hystrix故障、半开探测与恢复](p1-hystrix-test.md)
- [本轮完整运行JSON](p1-evidence/resume-20261019T054859528641Z-full/live-results.json)
- [本轮依赖树](p1-evidence/resume-dependencies/dependency-tree.txt)
- [验收/编译/保全汇总](p1-evidence/resume-summary.json)
- [原库/备份/测试账号隔离](p1-evidence/resume-preservation.json)
- 本轮文件清单：p1-resume-file-manifest.csv；命令/包括失败构建的结果：test-evidence.md。

## 未完成及风险

P1技术运行项已通过，用户审核尚待完成；P2–P6均未开始。旧组件维护/安全风险仍在，只用于隔离课程实验；短窗口和租约为实验参数。HA是同机进程故障而非主机/网络故障，68个正式API的Java兼容性、六角色回归、密码迁移、正式数据迁移尚未实现。诊断profile不应带入正式业务部署。原生成脚本不能覆盖已修正工程。**本轮结束于P1，等待审核。**

最终Git只读检查另发现根目录现存.private-backups.zip未被忽略，可能包含敏感备份；索引仍只有.gitignore，该ZIP未提交、未读取或修改。本轮只授权docs/experiments变更，因此没有擅自改根目录忽略规则，后续应在获准范围内补充规则，禁止批量git add。
