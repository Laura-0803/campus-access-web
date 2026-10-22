# P7-A 最终工程审计

2026-10-21。本轮仅进行工程核查、已有测试重跑和课程交付准备，不新增业务功能，不进入P7-B。P6已由用户验收；本轮最终运行结果见[p7-test-evidence.md](p7-test-evidence.md)。

## 工程与版本

|部分|实际工程/职责|固定版本/边界|
|---|---|---|
|父工程|[backend/pom.xml](../backend/pom.xml)，7子模块、8个Reactor项目|Java11，Boot2.3.12.RELEASE，Cloud Hoxton.SR12|
|注册中心|eureka-server，19761/19762互为peer|Eureka，单机双进程，不声称跨主机容灾|
|网关|gateway-service，19800|Spring Cloud Gateway2.2.9.RELEASE；P6_MODE=true|
|用户域|user-service，19811/19813|认证、六角色、档案、车辆、人脸、消息、审计；删除禁用|
|预约域|appointment-service，19821|两阶段审核、持久签发操作、自动恢复；无绑定最终批准503|
|通行域|access-service，19841|真实QR、校门/设备/规则、幂等核验/记录、可靠事件|
|异常域|exception-service，19851/19853|事件Inbox、风险、单向处置、黑名单|
|聚合域|aggregation-service，19861|首页/报表/五组件健康；无数据库|
|前端|campus-access-web/src，生产dist预览15173|现有React/Tailwind；本轮不改源码|

实际JAR内库版本与哈希见[built-jars.json](p7-evidence/built-jars.json)，包括Ribbon2.3.0、Hystrix1.5.18、Feign2.2.9.RELEASE、MyBatis Starter2.1.4。MySQL使用既有8版本隔离实例；不得将框架旧版本适合课程解释为生产安全维护承诺。独立Temurin11与全局JDK21并存；没有更改系统JAVA_HOME或依赖组合。

## 最终路由（整理说明，不修改Gateway）

[GatewayApplication.java](../backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java)由P6_MODE/P3_MODE/P4_MODE/P4C_MODE确定路由。P7启动器沿用全部已验证开关。

|Gateway路径|服务名|
|---|---|
|/api/health、/api/dashboard/**、/api/reports/**|aggregation-service|
|/api/appointments及子路径|appointment-service|
|/api/exceptions、/api/blacklist及子路径|exception-service|
|/api/qr-codes、access-records、devices、gates、access-rules及子路径|access-service|
|/api/auth/**、roles、profiles、users、faces、vehicles、messages、logs|user-service|
|/api/people（GET/POST/PATCH）|user-service|
|DELETE /api/people/:id|无路由，404；人员删除Saga未开放|

P6_MODE=true时不注册legacy兜底，未知API不回落Express。Gateway移除客户端伪造身份/内部密钥头；下游通过受保护接口向user-service实时确认身份。user LegacyClient虽保留历史类名，实际服务名已为exception-service。内部诊断中旧legacy标签不是运行依赖，不为美化命名修改已验收代码。

## 启动、关闭及环境前提

在本工作区根目录执行，每次选择一个子命令：

```powershell
python docs/p7-system.py start
python docs/p7-system.py status
python docs/p7-system.py health
python docs/p7-system.py stop
```

start只允许端口全空闲，读取既有受控.p5-local/runtime.json及.p1-local/jdk.json，沿用.p6-local进程归属记录，不复制私密配置，不建库/seed/清库。先有本机MySQL8及4个合成库、最小权限账号、独立JDK11、Maven依赖缓存、Node依赖和已构建JAR/dist。首次本机已准备环境的冷启动已验证；**不是新电脑零配置安装器**。新电脑需另行审批初始化/密钥生成/隔离账号授权与数据恢复方案。

status是端口/PID状态，不等于业务就绪。health检查真实五组件、双注册中心及Ribbon实际列表，失败退出非零；start轮询带超时，失败关闭本轮拥有进程。stop只处理PID与创建时间匹配的自有进程，等待端口关闭，不停止共享MySQL、不终止用户其他程序。新启动记录在p7-evidence，原P0–P6证据不覆盖。

重建前必须stop，避免Windows锁住运行JAR；构建命令及首次执行策略错误见测试报告。React构建仅更新dist。当前版本SQL是迁移交付文件，不因名称含IF NOT EXISTS就保证全部旧库可重跑；本轮只读取9个SQL文件及实际Schema，没有运行任何迁移、初始化或修复脚本。

## 数据与API审计

原68 API最终为67 Java（98.53%接口归属）+1禁用删除，0 Express；不是98.53%全部分支、移动端或课程成绩。逐项Controller、Service、依赖、页面、历史证据、未覆盖分支及批准差异见[完整68行矩阵](p7-evidence/final-api-matrix.md)和[机器清单](p7-evidence/final-api-matrix.json)。

4库实际31张物理表，包含18张迁移业务及配套表，另13张验证码、审批历史/签发、幂等/Outbox/Inbox及隔离故障夹具表；与原19表（含历史app_state）的计数口径不同。实际字段/类型/索引及4账号互相拒读证据见database-audit记录。跨域只有逻辑ID，没有跨库FK；本地事务不提供跨服务全局原子提交。聚合读取多时点，不宣称事务快照。

课程演示可直接使用原页面完成预约→真实签发→扫码→记录/异常→处置→报表；不是所有Java API都有挂载页面。/profiles/:role、消息read、部分QR/报表及管理操作必须按矩阵区分API工具访问与页面入口；旧UserManagementPage未挂载，不用其弱密码功能代替账号状态页面。

## 交付边界

253文件源码/配置基线、7个重建JAR、生产dist、SQL与文档哈希随证据交付。P7仅新增docs审计/测试材料，并更新进度与API清单；不更改Java、React、Express、SQL或.gitignore。原库19表/DDL及原始与长期备份均进行前后只读校验。最终结论和关闭记录见测试报告，历史P6启动后全停状态不冒称本轮关闭证明。

交付为Markdown审计、报告提纲/图稿、证据索引和演示计划；未伪造学生信息、签名、上机出勤、课程日志提交日期或教师评分。未生成或验收Word/PDF课程终稿。P7-A完成后停止等待审批。
