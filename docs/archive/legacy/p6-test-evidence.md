# P6 实际测试证据

2026-10-20。A+B已批准实施。以下为本轮真实运行，初始前置核查已归档input/docs。主验收11组451项断言；重复运行不累计，断言数不是API/页面数。

|实际运行|结果|原始证据|
|---|---|---|
|Maven clean verify，8个Reactor项目|最终build-4通过；Surefire没有单元测试，不冒称单测通过|[build-4/maven.log](p6-evidence/build-4/maven.log)|
|实际依赖解析|原锁定组合，未升级|[dependencies/maven.log](p6-evidence/dependencies/maven.log)|
|旧Express/新Java HTTP字段、空值、排序、六角色范围、SQL计数及错误文案|最终53项通过，差异列表空；Health另按批准契约|[comparison](p6-evidence/comparison-1792508752056.json)|
|20次正常聚合、Ribbon双user/双exception、五组件故障/开路/恢复、黑名单安全拒绝及恢复|79项通过|[faults](p6-evidence/faults-1792507777204.json)|
|真实隔离MySQL表锁阻塞，超时及恢复|5项通过；1635ms后Health503|[read-timeout](p6-evidence/read-timeout-1792507936603.json)|
|通行权限、真实QR、SQL记录、幂等并发、隔离访问|75项通过|[access](p6-evidence/p6-regression-access-test-1792507940669.json)|
|异常事件inbox幂等、风险分析、黑名单等|58项通过|[incident](p6-evidence/p6-regression-incident-test-1792507947591.json)|
|六角色、处置终态/幂等/并发、实时撤权、真实事务回滚及时间策略|32项通过；临时触发器仅在隔离异常库，finally删除|[security](p6-evidence/p6-regression-security-test-1792507953489.json)|
|校门/规则配置回归|11项通过，finally恢复原合成规则|[configuration](p6-evidence/configuration-1792507956550.json)|
|Edge生产dist整体预约→签发→扫码→记录/异常→报表、六角色资料退出|最终build-4，56项通过|[flow](p6-evidence/browser-flow-1792508764780/report.json)|
|Edge生产dist A/B/F权限、拒绝、幂等/丢回执恢复、故障、安全错误展示|64项通过|[A/B/F](p6-evidence/browser-abf-1792508001105/report.json)|
|Edge真实注册、注册后登录、管理员账号状态与双Java入口旧会话拒绝|11项通过|[registration](p6-evidence/browser-registration-1792507330925/report.json)|
|四域实际停止及重启，6表ID/状态数量和哈希对比|7项通过|[persistence](p6-evidence/persistence-1792508048372.json)|

Health故障分别为exception双实例、user双实例、access、appointment、Gateway；聚合直查能在Gateway停止时返回503。下游熔断真实记录open/errors/shortCircuits，恢复重新请求成功；没有空统计或Mock后端。正常20请求前后实际Ribbon服务器计数证明两实例参与，不以逻辑URL代替实例证据。用户LegacyClient真实开路也在faults.userBlackListCircuit记录。

产物范围：深层故障、超时、SQL/事务与A/B/F等在build-3运行；build-4仅修正新聚合层鉴权错误文案，未改统计、故障配置或四域业务，最终重跑53项精确对照（新增未登录/无效Token/停用文案）及56项Edge闭环。未把早期运行标为最终JAR逐项重跑。首次完整冷启动加双方Ribbon列表就绪后，build-3的56项流程也已一次通过（browser-flow-1792508413933）；最终build-4冷启动与就绪同样通过。

## 保全及文件

233文件基线中230个不变，3个批准变化，新增聚合18文件；React与原Express不变，见[source-change-manifest](p6-evidence/source-change-manifest.json)。[最终JAR哈希](p6-evidence/built-jars.json)与[原19表/备份前置只读检查](p6-evidence/preservation-before.json)。[原14 HOLD](p6-evidence/hold-after.json)不变，无新增HOLD；[合成黑名单夹具收尾](p6-evidence/fixture-finalize.json)保留历史、仅解除本轮明确命名测试项。

额外基础记录及最终保全/关闭以本文件末尾收尾段为准，未产生的新证据不预标通过。

## 失败与排查保留

build-1通过；build-2因Windows运行JAR文件锁导致clean失败，停止自有进程后build-3全通过，未更换版本。早期comparison-1792506914050含一项未取数据的占位断言，已删除并重跑49项，早期文件不作为主验收。

早期faults失败依次为：固定次数未使滚动错误率到开路阈值（改为有明确超时的真实请求/状态轮询）；OTP发送频率/既有5次验证限制；移出黑名单请求错用removalReason导致400（修正为原removedReason，并断言移出200）。未改业务阈值、验证码或黑名单规则。最终79项报告全部通过，早期失败文件不删除、不算通过。

两次冷启动flow失败保留：browser-flow-1792507189156与browser-flow-1792508207385。最终审批首次返回已批准未知503，持久恢复结果与单有效码证明见[cold-start-recovery](p6-evidence/cold-start-recovery.json)。另补实际下游Ribbon列表就绪检查，不靠固定sleep判定启动完成。

## 初始只读核查沿革

已执行：

- 原Express与四个Java内部控制器、身份及服务密钥、投影实现的静态读取；[原始公开源码副本](p6-evidence/input/campus-access-web/server/routes/dashboard.js)及[reports](p6-evidence/input/campus-access-web/server/routes/reports.js)保留。
- [233个业务/配置文件SHA256基线](p6-evidence/source-baseline.json)，覆盖backend（排除target）及React/src、原server，未读取/归档私密运行配置。
- `git status --short`显示大量现有未跟踪工程，不能用Git历史证明原源码无变化；`git ls-files`列出的备份及私有目录无跟踪结果，未提交任何文件。既有backend.zip未跟踪，不在本轮提交。
- `python docs/p5-system.py status`：11个既有实验端口均未监听，未启动进程。
- `node docs/p1-check-preservation.mjs docs/p6-evidence/preservation-before.json`：[实际只读校验](p6-evidence/preservation-before.json)，19原表数据/DDL相同，原源码ZIP及数据库快照与长期副本哈希匹配。

初始核查时上述实施尚未执行，现已按用户A+B审批完成，运行证据见本文件首表；这段不代表当前未实施。

后续证据须每次使用新时间目录，保存：六角色请求的脱敏响应与旧桥/新Java结构化差异、四域隔离SQL实际计数、源顺序/空值检查、双实例端口命中、断路器错误/短路/恢复计数、dist前端Edge截图、Express端口/PID停止证据及最终全部进程关闭。所有Token/验证码/QR payload仅内存使用，截图遮罩。

## 最终收尾（真实完成）

- [最终五组件健康及双Eureka/路由就绪](p6-evidence/ready-1792509199283.json)，在完全未启动Express的完整冷启动中通过；启动前后的拥有进程状态和HTTP检查都有本轮新文件。
- [最终关闭](p6-evidence/closure-20261020T231352961147.json)及[关闭后状态](p6-evidence/status-20261020T231355621910.json)：12个相关端口全部关闭、拥有PID状态移除。MySQL为原先既有基础服务，不由本轮停止；未终止用户其他进程。
- [最终原19表数据/DDL及原始、长期备份校验](p6-evidence/preservation-final.json)通过；[原源码归档比较](p6-evidence/original-source-preservation.json)：ZIP实际69个文件中65个不变，仅P5已批准的4前端变化，P6未再改前端；原Express全部不变。P0文档的68应用文件口径及CSV62项口径分别保留，不伪称68个一字未改。
- [源码前后SHA256/精确变更范围](p6-evidence/source-change-manifest.json)、[最终build-4的7个JAR哈希](p6-evidence/built-jars.json)、[全部文档/脚本清单与链接检查](p6-evidence/delivery-manifest.json)。未恢复或发明Git历史，未批量提交文件；备份及.p6-local私有目录不被Git跟踪。
- [敏感值文本核对](p6-evidence/secret-audit-final.json)：184个文件与私密配置及现有会话/QR凭证精确值在内存比较，无命中；不是通用安全扫描或PNG像素泄密证明。截图输入/QR遮罩并人工检查。
- [图形完成后的真实报表截图](p6-evidence/reports-rendered.png)及[额外视觉检查](p6-evidence/report-visual.json)：等待原Recharts动画结束后的折线圆点和环图扇区再截图，未改React。首次视觉脚本错误寻找Area而原页面是Line，超时记录保留；早期DOM存在但仍处动画起始帧的图片不作为图形最终展示证明。
- 默认全局JDK仍21.0.9，编译/服务只使用既有独立JDK11；没有系统JDK切换或依赖版本替换。

已停止等待P6审核。未进行C/D/E、人员删除、HOLD人工恢复、无绑定人员解禁或正式数据库切换。
