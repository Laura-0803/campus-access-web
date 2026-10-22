# P7-A 真实测试与最终保全证据

2026-10-21（Asia/Shanghai）。本阶段不新增业务功能；在P6版本源码不变的基础上重新clean构建、全停冷启动、重跑现有隔离业务及真实Edge，最后关闭。所有P7证据新存p7-evidence，原阶段记录保留。

## 本轮结果

|检查|实际结果|原始证据|
|---|---|---|
|Java clean verify|8个Reactor项目全部SUCCESS，64秒；7个可执行JAR|[Maven日志](p7-evidence/build-1/maven.log)、[JAR哈希/实际内嵌版本](p7-evidence/built-jars.json)|
|React生产构建|npm run build退出0，Vite5.4.21；JSX经实际构建转换，无React源码改动|[构建日志](p7-evidence/frontend-build/npm-build.log)、[结果](p7-evidence/frontend-build/result.json)|
|原React静态调用核查|现有Babel解析全部JS/JSX无语法错误；追踪挂载组件、共享表单、Hook及API函数引用，不新增依赖|[frontend-static](p7-evidence/frontend-static.json)|
|全停再冷启动|初始全停后启动成功，真实五组件Health、双Eureka及Ribbon列表就绪，Express关闭|[就绪](p7-evidence/ready-1792555482990.json)、[启动门槛日志](p7-evidence/runtime-20261021T120338954537/startup-gate.json)|
|通行SQL/权限/QR/幂等并发/数据库隔离|75项断言通过|[access](p7-evidence/p6-regression-access-test-1792555538720.json)|
|异常事件幂等/风险/黑名单|58项通过|[incident](p7-evidence/p6-regression-incident-test-1792555545898.json)|
|六角色处置/终态409/实时撤权/事务回滚/安全时间解析|32项通过；仅在隔离异常库临时建触发器并finally移除|[security](p7-evidence/p6-regression-security-test-1792555551710.json)|
|校门与规则配置|11项通过，原合成配置finally恢复|[configuration](p7-evidence/configuration-1792555554847.json)|
|真实Edge原页面主闭环及六角色资料/退出|56项通过；创建→本人一审→最终200真实QR→原SVG内存解码→真实扫码→SQL记录→拒绝事件/门岗处置→黑名单→真实报表|[flow](p7-evidence/browser-flow-1792555559036/report.json)|
|真实Edge扫码/规则/账号状态A-B-F|64项通过；200 allowed=false显示拒绝，同操作复用、丢回执/未知结果、停用会话拒绝/恢复、非法规则、故障页面安全错误|[A/B/F](p7-evidence/browser-abf-1792555581423/report.json)|
|实际Ribbon/Feign/Hystrix|35项通过；20次真实Gateway请求，两user和两exception端口计数增长；停两异常实例，503、open/errors/shortCircuits，重启恢复|[components](p7-evidence/components-1792555619997.json)|
|四业务域实际停机重启持久化|7项通过；users/people/appointments/access_records/qr_codes/exceptions的ID/状态数量及哈希一致|[persistence](p7-evidence/persistence-1792555654495.json)|
|重启后再次分层就绪|全部通过，Express未启动|[ready](p7-evidence/ready-1792555696690.json)|
|图表绘制与视觉检查|真实Edge等待折线圆点/环图扇区完成；截图人工查看，未改React|[visual](p7-evidence/report-visual.json)、[截图](p7-evidence/reports-rendered.png)|

8组功能断言合计338，覆盖有重叠，不是338接口、页面或测试用例。两次ready和额外视觉检查不叠加到338。脚本名称中的p6-regression保留原suite标识，文件实际位于本轮p7-evidence，并非引用旧日志冒充重跑。编译、启动、业务测试分别记录；Maven Surefire显示No tests to run，不声称单元测试通过。

[串行回归各脚本退出码及真实耗时](p7-evidence/verification-20261021T120538462943/results.json)：主流程Edge24.81秒、A/B/F39.14秒、独立组件故障33.5秒、持久化42.2秒。自动操作耗时不是本人五分钟讲解计时彩排。Edge实际版本155.0.4283.62；使用本机真实msedge.exe的headless浏览器，非Mock浏览器，也未声称本轮手工操作可见窗口。flow记录无未处理pageerror及核心console异常。

## API、源码与数据

- [68行最终矩阵](p7-evidence/final-api-matrix.md)、[JSON](p7-evidence/final-api-matrix.json)：67 Controller方法源码匹配，1禁用；React入口静态核查与浏览器实际HTTP观测分开。浏览器观测含页面发起及验证用fetch，不能一概当作按钮点击测试；主闭环/A-B-F具体操作见脚本及断言。
- [工程版本/配置/9个SQL文件审计](p7-evidence/static-engineering.json)：未执行迁移SQL。实际31物理表字段/索引及4域账号互相拒读见[前置数据库审计](p7-evidence/database-audit-1792555365122.json)、[最终数据库审计](p7-evidence/database-audit-1792555846140.json)。原14项HOLD哈希不变，无新增HOLD；未执行人工恢复/删除Saga。
- [实际运行环境](p7-evidence/environment.json)：MySQL8.0.40、Node24.18.0、独立JDK11.0.32.1；默认全局JDK仍21.0.9。
- [原19表/DDL前置校验](p7-evidence/preservation-before.json)、[最终校验](p7-evidence/preservation-final.json)：全部不变；原始源码ZIP/数据库快照与长期副本哈希一致。脚本只读原库，productionWritesByThisScript=0。四域合成库新增正常测试历史，不宣称合成数据库也一字未变。
- [253文件源码/配置保全](p7-evidence/source-preservation.json)：Java、React、原Express、SQL、配置及.gitignore与本轮开始一致，target/dist是重建产物不作为源码修改。P0原包曾有P5批准前端变化，不能将本轮保全解释为自P0起全部文件不变。
- [私有文件Git检查](p7-evidence/git-private-check.json)：受控备份与本地私密目录未被跟踪；未stage/commit任何文件，未虚构历史提交。[课程原件哈希](p7-evidence/course-source-check.json)核对本人任务书/评分原件不变。
- [文本敏感值核对](p7-evidence/secret-audit-final.json)：与受控密码/服务密钥及现有Session/QR精确值仅在内存比较，无匹配才通过；不是通用漏洞或所有历史文件扫描。截图使用输入/QR遮罩；人工检查QR遮罩和最终报表截图。外部头像图片在截图未加载，为非核心外部资源限制，没有为此修改页面或屏蔽核心错误。

## 最终关闭

[最终关闭](p7-evidence/closure-20261021T121116283926.json)、[关闭后状态](p7-evidence/status-20261021T121118923673.json)：12项端口全关闭、拥有状态移除，Edge测试上下文finally关闭。共享MySQL原服务仍保留；没有终止用户无关程序。用户先前“运行系统”创建的本轮拥有实例已按P7结束要求安全关闭。

## 失败、覆盖限制与状态

首次直接调用PS1被PSSecurityException拦截，Maven当时未执行；[失败记录](p7-evidence/build-launch-first-failure.json)保留。改为新PowerShell子进程ExecutionPolicy Bypass运行原构建脚本，未更改系统策略，随后构建成功。本轮业务/浏览器套件无失败项，不删除前期P0–P6失败证据。

原框架版本保持，生产数据库/流量未切换。人员删除、无绑定最终审批、HOLD人工恢复、最后管理员后端保护、真实短信硬件、全站移动端和未知预约页面故障分支不因本轮主流程通过而完成。正式课程报告Word/PDF及本人计时讲解未验收。

已实现的业务沿用P6；本轮重新编译、启动、真实测试通过及保全收尾各有证据。P7-A报告/图稿/演示方案已准备，等待审核；未进入P7-B。全部新增文档/脚本SHA256与链接校验见[交付清单](p7-evidence/delivery-manifest.json)。
