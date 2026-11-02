# P6 隔离实施完成，提交阶段验收

2026-10-20。用户已批准A+B及补充的五组件Health要求。独立aggregation-service与五条原API已实现、编译、启动及真实验证；隔离Gateway按服务名路由，Express后端停止，原React生产dist实际Edge回归完成。不是正式流量切换。初始分析原文已归档input/docs，不以P5日志替代本轮测试。

|项目|已实现|已编译|已启动|已真实测试|
|---|---|---|---|---|
|5接口契约对照与数据归属设计|文档完成|不适用|不适用|源码静态核查|
|4条Java dashboard/reports|是|是|是|最终新旧53项对照及SQL核对|
|Java health|是，批准后的分布式描述|是|是|五组件故障503、恢复、真实SQL读取超时|
|移除用户域黑名单代理依赖|是，仅Feign目标一行|是|是|注册/创建、命中403、故障503、恢复真实写库|
|Express停止后端到端|是|沿用P5生产前端构建|是|Edge整体56、A/B/F64、注册管理11项|
|原库及备份只读校验|现有校验工具|沿用|已运行|19表及备份一致|

审批依据及具体最小变更见[p6-contract-comparison.md](p6-contract-comparison.md)。原68 API现为67 Java（98.53%）、0 Express、1删除禁用；排除health则66/67=98.51%。这只表示接口处理归属，不能当作所有历史业务分支或课程总完成率。已验证本隔离系统无需Express业务后端；仍使用Node运行测试工具和Vite静态预览，不宣称无Node软件。

交付索引：[接口表](p6-api-migration.md)、[聚合设计](p6-aggregation-design.md)、[证据与文件](p6-test-evidence.md)、[无Express回归](p6-no-express-regression.md)。新增聚合模块18个文件；既有233文件中仅parent pom、GatewayApplication、LegacyClient共3个变化，另.gitignore添加.p6-local/。React和原Express不变。前后SHA256见[source-change-manifest.json](p6-evidence/source-change-manifest.json)，JAR哈希见[built-jars.json](p6-evidence/built-jars.json)。

继续禁用人员删除、无绑定人员最终审批、HOLD人工恢复；账号自停用/最后管理员后端保护及未知预约页面故障仍为遗留。真实短信、硬件、全站移动端、正式切换不在范围。聚合多时点读取不是全局快照，全量投影规模/性能限制保留。冷初始化可能触发已批准的签发未知503，两个真实样本均自动恢复并只保留一个有效码，详见[cold-start-recovery.json](p6-evidence/cold-start-recovery.json)。没有修改P4状态机、HOLD或审批语义，也不把首次503算通过。

主验收11组共451项断言通过（存在覆盖重叠，不是451接口）。最终构建build-4补齐原鉴权错误文案，并重跑53项精确对照及56项生产Edge流程；此前build-3的深层故障/事务等证据保留并标明产物范围。最终结束状态见p6-test-evidence的关闭/保全记录。本阶段完成后停止等待用户审核，不进入C/D/E或后续阶段。

最终原19表/备份校验通过，14项HOLD不变，12个相关测试端口全部关闭，见[关闭证据](p6-evidence/closure-20261020T231352961147.json)。[最终图形报表截图](p6-evidence/reports-rendered.png)已等待原动画完成并人工检查。统一复现入口为`python docs/p6-system.py start|health|status|stop`（每次选择一个子命令），不会初始化或重建数据库。
