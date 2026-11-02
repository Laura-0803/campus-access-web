# P3真实测试证据

Java代码最终构建：`p3-evidence/build-6/maven.log`，真实Maven clean verify全5模块成功。Maven未包含JUnit业务用例，不能把“no tests to run”当作业务通过；下面均为构建后真实HTTP、SQL、浏览器测试。依赖实际解析日志在`p3-evidence/dependencies/maven.log`，原始UTF-16日志保留，另提供UTF-8副本。

最终版本：Temurin11.0.32.1、Boot2.3.12.RELEASE、CloudHoxton.SR12、Ribbon2.3.0、Hystrix1.5.18、Spring Cloud OpenFeign/Gateway2.2.9.RELEASE、MyBatis Starter2.1.4、MySQL8；没有替换组件。

|测试|真实断言|证据|结果|
|---|---:|---|---|
|GET契约及Ribbon|152|[queries-1792413724880.json](p3-evidence/queries-1792413724880.json)|通过|
|创建及状态机|44|[writes-1792413863785.json](p3-evidence/writes-1792413863785.json)|通过|
|事务/黑名单/停用|15|[write-safety-1792413740554.json](p3-evidence/write-safety-1792413740554.json)|通过|
|撤权/审计一致性|12|[consistency-1792413741957.json](p3-evidence/consistency-1792413741957.json)|通过|
|Hystrix/重启|25|[fault-1792413765677.json](p3-evidence/fault-1792413765677.json)|通过|
|Edge浏览器|70|[report.json](p3-evidence/browser-1792413807027/report.json)|通过|
|黑名单故障恢复|4|[blacklist-failure-1792413830688.json](p3-evidence/blacklist-failure-1792413830688.json)|通过|

最新分套结果共322项；完整串行运行记录见最近`p3-evidence/verification-*/summary.json`（7套均exitCode=0），之后扩展写测试由上表最新writes证据替代。测试数量不是接口数量：五条预约API中最终批准分支等待P4，绝不算完整签发通过。

GET包含96组原Express实际处理器与Java JSON/状态码逐字段比较、20次Gateway→Feign→真实Ribbon双user实例采样及六角色。写测试检查13字段创建形态、教师/学生审批、历史状态、非法顺序、重复、并发、最终503不变；安全测试以真实MySQL触发器故障验证事务回滚，以实际权限撤销造成黑名单503，finally恢复权限。

故障测试真正停止两个user-service JVM，分别记录FAILURE、fallback、open、SHORT_CIRCUITED及恢复探测；不是凭fallback推断熔断。停机时GET/POST均503且预约未变化。服务重启前后真实行摘要一致。撤权测试观察INNODB_TRX LOCK WAIT后改角色，锁释放后403；审计回执丢失重投仍一条远端日志。

Edge原页面实际创建、学生通过、管理员驳回、最终批准不可用提示，六角色和P2/遗留页面回归；没有正式QR/假QR/Mock通过。早期启动、fallback包装、浏览器定位等失败JSON及原日志保留，最新通过不抹去失败。正常短信真实送达未测，属于P2遗留。

原系统保全：[preservation-final.json](p3-evidence/preservation-final.json)，68原文件及P2受保护源文件校验见最近preflight-*.json。Git仅.gitignore被跟踪，本轮未提交；private配置均忽略。19原表数据DDL及原始/长期备份一致。未运行原初始化或修复脚本。

源码清单与SHA256：[p3-change-files.csv](p3-change-files.csv)。进程最终关闭状态见[process-closure.json](p3-evidence/process-closure.json)。完整API与差异见p3-api-migration.md及p3-contract-differences.md。P3结束等待审核，未进入P4。
