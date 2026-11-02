# P2真实测试证据与未运行项

最终构建：[Maven clean verify日志](p2-evidence/safety-final-build/maven-verify.txt)。实际执行成功；其中“No tests to run”表示没有JUnit用例，不代表下述外部集成测试没有运行。最终套件入口：`python docs/p2-run-verification.py`；执行清单：[verification-20261019T174456/summary.json](p2-evidence/verification-20261019T174456/summary.json)。测试前轮询Gateway、正常模式服务、两Eureka及Ribbon真实列表，超时即失败；没有以固定sleep认定就绪。

|真实执行脚本|断言/比较数量|结果|原始脱敏记录|
|---|---|---|---|
|p2-batch1-test.mjs|60|通过|[batch1-1792403129907.json](p2-evidence/batch1-1792403129907.json)|
|p2-batch2-test.mjs|38|通过|[batch2-1792403133519.json](p2-evidence/batch2-1792403133519.json)|
|p2-batch3-test.mjs|92|通过|[batch3-1792403135217.json](p2-evidence/batch3-1792403135217.json)|
|p2-transaction-test.mjs|12|通过|[transactions-1792403138260.json](p2-evidence/transactions-1792403138260.json)|
|p2-contract-test.mjs|66|通过|[contracts-1792403139903.json](p2-evidence/contracts-1792403139903.json)|
|p2-react-component-test.mjs|11|通过|[react-components-1792403145639.json](p2-evidence/react-components-1792403145639.json)|
|p2-coexist-test.mjs|24|通过|[coexist-1792403148184.json](p2-evidence/coexist-1792403148184.json)|
|p2-safety-edge-test.mjs|12|通过|[safety-edges-1792403150903.json](p2-evidence/safety-edges-1792403150903.json)|
|p2-batch1-failure-test.mjs|15|通过|[batch1-failure-1792403152109.json](p2-evidence/batch1-failure-1792403152109.json)|

合计330项。脚本输出只保存状态、断言、组件类型及错误计数，不保存完整Token、验证码、明文密码或请求响应原文中的敏感值。数据库验证见[最终结构与重启持久化](p2-evidence/database-final.json)，额外证明重启后两个人脸槽位、车辆及管理员创建账号仍可查询。所有账户及人员均带SYN标识，数据库质量检查未发现非合成人员/非哈希密码；未复制原账号、密码或预约数据。

兼容对照不是Mock：在短生命周期只读Express副本执行原路由，以原store中的真实SELECT读取隔离库，身份仍由Java内部接口校验。对照只记录比较结论，66组GET响应含成功/禁止分支逐字段一致。写接口由各批HTTP及SQL断言验证，未宣称所有畸形输入/所有写分支都已进行黄金快照比较。

故障实验真正停止进程：黑名单不可用→503且没有人员写入；观察Hystrix错误计数、open及shortCircuits，再恢复下游并经真实请求恢复闭路；停止认证权威→Express适配拒绝503；重启后原Java会话仍可用。没有把fallback或HTTP200单独当作成功。内部组件状态接口要求服务凭证，不经过外部Gateway。

真实事务故障：在合成库临时建立审计INSERT失败触发器，在人员和账号INSERT之后抛出数据库异常；HTTP500，人员/账号均为0，验证码消费回滚；移除触发器后同一正确请求成功。不是Mock DAO。触发器已删除，未对原库建触发器。

保全：[68文件及Git检查](p2-evidence/preflight-20261019T095157098814Z.json)、[19表数据/DDL及官方备份](p2-evidence/preservation-after-safety.json)。只读事务、SELECT/SHOW及ROLLBACK；原库写入0。保全脚本附带的P1账号检查仍仅属于P1账号；P2两个账号隔离另由本轮HTTP/SQL套件验证。

失败历史保留：初次Gateway缺RouteLocatorBuilder导入；适配副本初次缺异常模型文件；第一次过早执行HTTP套件未过就绪门槛；车辆并发原先3次201，修复MyBatis会话缓存复用和锁后计数后为2次201+1次400；测试清理SQL的中文经过旧Shell管道变成问号导致历史车牌未清理；Hystrix累计指标首次订阅/采样过早，已增加故障前订阅及有界指标轮询；幂等测试曾选中已删除车辆的历史事件，改为按本次审计ID关联。本轮未删除失败JSON/日志，也未把失败项改成通过。

前次交付未运行浏览器，工具空列表证据仍保留。现已找到本机Edge并完成本轮关键页面回归，见下方补充；全页面交互、真实短信送达、人员跨域删除与失败恢复、生产切换、多机HA及全面压力测试仍未完成。

## P2收尾真实证据（不覆盖前次基线）

|项目|本轮实际执行|证据|
|---|---|---|
|真实Edge浏览器|91项断言通过、0未处理pageerror、截图复核样式|[报告](p2-evidence/browser-1792408928412/report.json)、[解释/截图](p2-browser-regression.md)|
|认证/短信边界|原套件60项重跑通过|[原始断言](p2-evidence/batch1-1792408510168.json)|
|33条最终核对|32 Controller方法及Mapper语句ID静态核验；DELETE无实现|[静态审计](p2-evidence/closeout-api-audit.json)、[逐项表](p2-api-migration.md)|
|两个账号权限|各自仅所属schema DML，无DDL，原库/另一域SELECT被拒绝|[权限复核](p2-evidence/closeout-isolation.json)|
|原19表及备份|只读一致性事务核对数据/DDL及原备份、长期副本|[本轮保全](p2-evidence/closeout-preservation.json)|
|源文件/Git/进程|68文件相同、无敏感跟踪、全部自有监听关闭|[最终状态](p2-evidence/closeout-summary.json)|

Maven未重跑，业务Java及backend文件与前次清单散列相同；前次clean verify和330项真实证据继续保留，不伪造新编译记录。新增91和重跑60分开计数。新增脚本、报告和文档见更新后的[p2-implementation-files.csv](p2-implementation-files.csv)。收尾前文档及旧文件清单已归档p2-evidence/closeout-input，不改写P1/P2历史证据。

人员删除设计只文档，未执行SQL/HTTP，详见[p2-delete-detailed-design.md](p2-delete-detailed-design.md)。正常模式503符合本轮验收边界，真实短信送达仍未测试；原页面体验和全覆盖风险不隐藏。
