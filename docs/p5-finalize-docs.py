from pathlib import Path
import json,re,datetime,csv,hashlib,socket
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p5-evidence';run=max(E.glob('verification-*'),key=lambda p:p.name);summary=json.loads((run/'summary.json').read_text());assert summary['complete']and summary['allPassed'];tests=[]
for x in summary['results']:
 content=(run/(x['script']+'.txt')).read_text(encoding='utf-8');m=re.findall(r'\{"evidence":.*\}',content)
 if m:
  info=json.loads(m[-1]);p=R/info['evidence'];p=p/'report.json'if p.is_dir()else p;j=json.loads(p.read_text(encoding='utf-8'));assert j['pass']and j.get('complete',True);tests.append((x['script'],info['assertions'],p,x.get('reusedPassedEvidenceFrom')))
total=sum(x[1]for x in tests);api=json.loads((E/'api-audit.json').read_text(encoding='utf-8'));hold=json.loads((E/'hold-after.json').read_text());assert hold['pass']
assert json.loads((E/'preservation-final.json').read_text())['originalDatabaseUnchanged']
baseline=json.loads((E/'source-baseline.json').read_text());changed=[x['file']for x in baseline if hashlib.sha256((R/x['file']).read_bytes()).hexdigest()!=x['sha256']];assert not changed
ports=[19761,19762,19800,19811,19813,19821,19841,19851,19853,19830,15173]
for port in ports:
 with socket.socket()as s:s.settimeout(.3);assert s.connect_ex(('127.0.0.1',port))!=0,port
assert not(R/'.p5-local/processes.json').exists()
def write(name,text):(D/name).write_text(text.strip()+'\n',encoding='utf-8')
testtable='|本轮真实测试|断言数|证据|\n|---|---:|---|\n'+''.join('|'+name+'|'+str(n)+'|['+p.name+']('+p.relative_to(D).as_posix()+')'+('（沿用本轮先前通过结果，未重跑）'if reused else'')+'|\n'for name,n,p,reused in tests)
write('p5-integration-test-evidence.md',f'''# P5隔离集成验证证据

当前四Java业务服务复用P4-C build-3已审核JAR；本轮未修改Java/POM/React，不声称进行了新的Maven构建。源文件逐项SHA不变、可执行JAR与P4-C环境记录哈希一致，见preservation-final/source-verification/environment报告。最新真实clean verify仍是[p4c构建日志](p4c-evidence/build-3/maven-readable.txt)。

本轮共{total}项实际断言通过：[执行摘要]({(run/'summary.json').relative_to(D).as_posix()})。早先聚合脚本把/dashboard/admin误作普通角色数据结构，失败保留，修正后只续测受影响及后续套件；摘要中reusedPassedEvidenceFrom明确标识本轮已通过的先前证据，没有伪装重新执行。

{testtable}
健康报告记录双Eureka、双user/exception、appointment、access、Gateway、Express桥接、React、四隔离库SELECT1及真实Gateway请求。普通模式启动、重复start不重建进程、stop全端口关闭、再次启动均真实运行。本轮故障套件显式P5_FAULT_TEST=true，普通启动默认关闭注入。

覆盖六角色登录/退出及越权、访客预约/两审/真实二维码/SQL通行记录、异常生成/处置、黑名单、管理员统计及报表与Java域真实计数一致、事务触发器回滚、发送方重启续投及幂等、实际Ribbon两user分流、Hystrix真实open/错误/短路/恢复、Edge原页面。Edge截图只存遮罩图，扫码/规则验证仍是浏览器原API客户端调用，不写成不存在的按钮。

没有运行P4-B的撤权/签发冲突HOLD生成套件，以免扩大本轮授权；该故障矩阵仍引用[p4一致性证据](p4-qr-consistency-test.md)。本轮只新建正常已绑定预约并走原200闭环，无绑定分支503保护在通行核心回归中保留。

原68源码、原19表数据DDL及原始/长期备份复核一致：[保全](p5-evidence/preservation-final.json)。既有HOLD摘要前后相同且未新增：[HOLD保全](p5-evidence/hold-after.json)。所有11测试端口关闭；普通停止不停止本机MySQL服务或其他非本轮进程。测试Edge由finally关闭。历史P0–P4-C证据不覆盖，敏感文件未跟踪，最终哈希见p5-change-files.csv。
''')
write('p5-startup-and-shutdown.md','''# 统一启动 健康检查与关闭

在外层仓库根目录运行。适用于当前受控Windows工作区的隔离课程系统，不是生产部署或已验证的全新电脑安装器。

```powershell
python docs/p5-system.py prepare
python docs/p5-system.py start
python docs/p5-system.py health
python docs/p5-system.py status
python docs/p5-system.py stop
```

prepare是幂等本机准备：首次从已有.private阶段配置复制到被忽略的.p5-local，记录只读源码基线并准备桥接/Vite启动配置；不会复制真实数据、覆盖旧私有配置、建库、清库或执行seed。start在已准备机器上是一条命令，启动双注册中心、双用户实例、预约、通行、双异常、隔离聚合桥及原Vite；地址http://127.0.0.1:15173，Gateway19800。每阶段有明确超时、按注册/实际请求/数据库分层检查，失败关闭本轮拥有的进程；不靠sleep认定成功。

重复start在已有自有状态时仅执行健康检查，不再创建第二套进程。端口被外部进程占用时拒绝；不会为腾端口杀死陌生进程。stop按PID和创建时间识别本轮进程并核对11端口；状态文件不存在时仍可重复stop。日志输出docs/p5-evidence/runtime-时间戳，健康/关闭报告各用新文件，不覆盖前次证据。

先决条件：已有独立Temurin11与默认JDK21并存、Maven缓存及已审核6个可执行JAR、本地MySQL8和四业务合成库、原前端node_modules、已安装Edge及私有测试依赖。当前SHA对应P4-C build-3。本轮Java未改，无需重构或重新编译；缺JAR会明确报错，不静默替换依赖。若获准重建，用docs/p2-maven.ps1和全新EvidenceDirectory执行clean verify，完成后重核版本和运行，不复用旧构建结论。

## 数据初始化边界

当前不是空库启动。P2/P3/P4/P4-C的prepare及版本SQL已经完成隔离库初始化，旧脚本有拒绝覆盖保护且分阶段依赖，不能一键重跑当作reset。p5-system.py不接收原业务库名称、不执行原npm db:init或修复脚本。新机器/新合成库完整bootstrap和导入全套演示夹具尚未交付，若要分发需单独设计四域幂等建库/最小权限账号/合成夹具/私有凭据生成和恢复校验，不能把复制本机runtime.json当作可分发安装。

合成账号格式SYN-STUDENT/TEACHER/VISITOR/ALUMNI/GUARD/ADMIN，密码及服务密钥只从受控.p5-local/runtime.json读取；不写报告、命令参数或日志。登录页演示验证码仅synthetic-demo白名单，正常短信未配置503。停机不清理合成事实/历史/HOLD，重启保持数据。

## 回归命令

普通演示启动故障注入关闭。执行已批准的故障回归时，先stop，再在当前子进程环境显式设P5_FAULT_TEST=true、start后执行python docs/p5-run-verification.py；测试会暂时停止并重启自有下游，务必最终stop。本轮不测试人工恢复HOLD，不运行人员删除、无绑定关联或任何原库脚本。start与health只在内存持有登录Token，finally退出，不记录凭证。
''')
write('p5-frontend-feature-gaps.md','''# React真实功能入口及缺口

原src/App.jsx及src/config/roles.js未改。静态调用和真实UI测试分开：API清单中47条Java路径有活动组件调用候选，15条Java路径没有活动页面直接调用；前者不等于全字段/全角色均已UI验收。P0行号不因后端迁移而变化。

|实际页面|后端与可操作范围|明确限制|
|---|---|---|
|/login、/profile|Java登录、找回/注册合成演示、个人资料、修改密码|真实短信送达未测试；默认正常无通道503|
|/visitor、/review、/appointments、/appointment-status|Java提交、被访人审核、管理员最终批准/拒绝、列表状态|只有已绑定人员最终200真实码；无绑定503|
|/visitor-qr、/alumni-qr|原SVG二维码展示/既有签发操作|dashboard读取仍Express聚合；新增撤码无活动按钮|
|/records、/monitor|guard/admin调用Java记录；普通角色读本人Express dashboard|不等同扫码模拟UI|
|/identity-check|guard现场异常选中、拒绝、人工核验登记与动作|不是扫码表单；人工登记与处置两请求非全局事务|
|/exceptions|admin Java列表/统计/问答；普通角色本人Express聚合|App未给guard此路由，guard走原现场台，不因隐藏组件推断全处置面板可达|
|/people|Java人员/关联账号创建编辑、人员状态|人员停用不等于users.status；删除按钮仍不可用|
|/face、/vehicle、/vehicles、/devices|Java既有业务操作|人脸仅照片/元数据，非硬件识别；每个细分UI动作未全部重测|
|/rules|Java规则编辑与校门管理|validateRule函数存在但JSX无验证器|
|/blacklist、/announcements、/logs|Java名单管理、公告及审计查询|公告read接口无页面调用；日志为现有安全白名单|
|/admin、其他角色首页、/reports|Express过渡聚合Java权威数据|不是Java聚合完成；停桥后页面会失败|

只通过脚本/原API客户端访问的原Java接口：API-004模拟扫码、006人员详情、015预约详情、018角色字典、025当前用户、027人脸列表、033二维码列表、035单码verify、045单异常分析、046单异常详情、047直接PATCH状态、051/052角色资料、059公告已读、063规则只读验证。详情可能在列表/聚合中展示，但不等于调用对应详情API。

另外新增POST qr-codes/:id/revoke无UI；受保护/internal/issuance-status/:id仅内部只读查询，无管理员公开HOLD查询/恢复；UserManagementPage未挂载，无独立账号停用入口。不能通过新增路由偷偷开放其弱默认重置密码功能。LegacyIdentityCheckPage未挂载；不能把其模拟代码位置当作页面存在。

本轮真实Edge回归覆盖六角色登录、资料/退出，预约两审与真实QR图形解码，原门岗拒绝、黑名单新增/移出、记录/异常/规则页面。扫码及validate在真实浏览器调用原API客户端并走真实SQL，报告明确不是按钮点击。A–F具体方案见[p5-remaining-features-plan.md](p5-remaining-features-plan.md)，本轮全部未实施。
''')
write('p5-course-rubric-matrix.md','''# 课程评分要求与证据矩阵

依据工作区父目录真实《合肥工业大学课程设计任务书(1).docx》《课程设计成绩评定标准说明(1).docx》逐段只读提取，原件SHA及路径见[p5-evidence/course-sources.json](p5-evidence/course-sources.json)，原文见course-task.txt/course-rubric.txt。原件未修改；下表不是教师评分或提交确认。

评分原文：软件开发文档20%、课程设计报告40%、软件代码40%；报告内部系统设计20%、开发报告80%；5分钟演示+3分钟答辩。不能把测试断言数换算成绩。

|评分/交付项|具体实现或材料|运行证据/当前结论|
|---|---|---|
|Spring Boot四业务微服务|backend/{user,appointment,access,exception}-service/pom.xml及Application|P4-C build-3 clean verify；P5健康与真实业务回归，已实现|
|Eureka高可用集群|backend/eureka-server；19761/19762双peer|P5双节点UP；P1有真实单节点故障恢复，P5未重新做网络/主机故障，单机不等同物理HA|
|Ribbon|各client无固定user地址，RoundRobinRule、RibbonLoadBalancerClient|P5 integration20次实际双user样本；不是浏览器轮流直连provider|
|OpenFeign|appointment UserDirectory/BlacklistClient/IssuanceClient；access Directory/Safety/Appointment；exception DirectoryClient|P5正常闭环与故障实际HTTP；Eureka发现|
|Hystrix|@EnableHystrix、feign.hystrix.enabled及fallbackFactory|P5 faults/architecture含open、错误计数、短路、恢复，非仅fallback|
|Gateway|GatewayApplication路由+身份头清除|P5所有域及Express聚合真实请求；不宣称Express已移除|
|Controller/Service/DAO/Entity/Mapper|四模块src/main/java分层及resources/mapper；user UserEntity/UserMapper强类型|实际SQL及事务；access/exception部分Map DTO需报告明确，不冒称全强类型|
|MyBatis单实体操作|user UserMapper/DomainMapper，预约AppointmentMapper、通行AccessMapper、异常IncidentMapper|真实增查改/软移出、并发/事务回滚；无原store快照写入|
|至少5张相关业务表|18张业务与配套表分9+1+6+2；users/people/sessions/appointments/qr_codes/access_records/exceptions/blacklist等|四隔离MySQL账号与真实数据；19原表含历史app_state不计新增业务表|
|系统功能结构图|p5-system-integration-audit.md四域功能文本图|当前架构描述已形成；正式报告图号/排版未验收|
|业务流程图|同审计中的预约/签发/通行/异常流程图；p3-state-machine及P4设计|正常及失败真实回归；未包含未授权删除/身份关联实现|
|数据库设计|database-dictionary、各阶段版本SQL、p4c-database-migration|表结构已有；需整理正式报告字段/索引/关系图|
|微服务架构图|同审计Mermaid，标明Express过渡和4schema|与实际调用/库归属核对；文本图未当作Word终稿图片|
|核心业务顺序图|同审计签发顺序图、P4-B持久恢复设计|实际200/QR/记录及已批准未知503；非全局原子事务|
|一对多/多对多说明|用户→会话、人员→车辆/预约；角色与校门/方法以规则JSON表达|任务书要求设计说明，当前材料分散；未实现独立多对多嵌套resultMap，不虚报；如教师要求代码示例需另批最小范围|
|软件开发文档/日志|P0–P5真实阶段记录与失败证据|尚无按两次上机周期签名/提交的本人课程日志证明，不能捏造签到/提交记录|
|系统设计报告|现有功能/流程/DB/边界材料|材料具备，正式统一课程报告尚未形成/未验收|
|系统开发报告|P1兼容实验与各阶段创建/分层/运行记录|需按任务书整编类方法/框架创建过程，不等同本批验收文档已正式提交|
|五分钟演示|统一启停、原Edge流程、测试证据、下述脚本|实际主要步骤已回归，未完成五分钟计时彩排或教师验收|

## 建议五分钟安排（计划，未计时运行）

启动预热放在计时前。0–40秒展示双Eureka/Gateway/四域/四库；40–75秒六角色与登录权限摘要；75–145秒访客预约、被访人审核、管理员最终200；145–190秒真实QR展示与Java模拟核验（当前原API客户端，必须说明无按钮）；190–225秒门岗拒绝及异常处置；225–250秒黑名单；250–275秒真实统计/报表并说明Express；275–300秒展示本轮真实Ribbon/Hystrix报告与实现位置。故障重启耗时不能承诺塞入末25秒，预录/证据回放必须标注，若老师要求现场停机恢复，需调整流程或在答辩时单独展示。

## 现场必要项与可保留限制

必须先具备：本机一次启动可靠、健康通过、合成凭据受控可取、授权范围脚本可运行、说明Express过渡及未完成分支、整理正式报告并计时彩排。若要求全程页面点击扫码，A为演示阻塞需单批批准；若要求Node后端完全停止，四聚合及health的Java收尾是阻塞，当前不能验收该条。

可经老师确认作为限制：真实短信/物理门禁/全站移动端、多主机HA、HOLD人工处理、无绑定关联、人员删除和独立账号状态UI；它们不妨碍已绑定正常闭环与课程组件演示，但不能自行代老师判定不影响最终成绩。A/B/F可优先小范围补齐，C/D/E不应为五分钟演示仓促开放。
''')
write('p5-system-integration-audit.md',f'''# P5系统集成审计

已完成本轮前置分析及隔离集成核查，停止等待下一次审批。P4-C此前范围按用户确认通过，历史阶段文档“待审核/未进入下一阶段”保留为历史，当前以P5授权和本文件为准。

## 真实完成口径

原68条API：Java62（91.18%），Express过渡5（7.35%，四聚合加health），未实现/禁用1（1.47%，人员删除）。排除health业务分母67则Java62/67=92.54%。不计算虚假的总体完成率：62包含仅批准范围内的实现，最终审核无绑定分支503、真实短信送达等仍未完成。新增撤码/内部接口不计原68分子。逐条清单见[p5-final-api-inventory.md](p5-final-api-inventory.md)。

静态页面调用候选Java47条，其余15条无当前活动页面直接调用；不能把47当作全UI测试通过数。真实Edge本轮55项；完整集成共{total}项实际断言，见[p5-integration-test-evidence.md](p5-integration-test-evidence.md)。本轮Java/React/后端源码哈希不变，无新Maven构建；沿用已审核P4-C build-3产物并核对JAR哈希。

## 四服务与数据库

|域|已实现|独占数据|
|---|---|---|
|user-service|认证/6角色/人员与账号增改查/资料/车辆/人脸元数据/消息/审计|roles、role_profiles、users、people、sessions、vehicles、faces、messages、logs；辅助验证码/审计表|
|appointment-service|5条原API、两阶段状态/归属/黑名单/跨服务身份、已绑定最终签发恢复|appointments及审批历史/outbox/issuance命令；不写QR表|
|access-service|15条原API+撤码、真实QR、规则/设备/校门、记录、幂等与事件|qr_codes、access_records、gates、devices、access_rules、settings及请求/outbox/签发槽|
|exception-service|10条原API、原本地风险/问答、单向处置、名单、事件inbox/审计|exceptions、blacklist及去重/请求/outbox；不跨库写用户/通行|

六角色名义不变，真实Session权威在Java，P2客户端Token库内摘要、不接管原生产会话。Gateway清理伪造身份头；Express每请求受保护获取当前身份和领域投影，退出/禁用/撤权不信旧内存缓存。库账号隔离，后台恢复忽略HOLD；本轮HOLD摘要前后相同，无人工状态修改。

## Express仍不可移除

backend/p4c-legacy-adapter仅在隔离副本承接GET dashboard/admin、dashboard/:role、reports/summary、reports/access及health，并为P2注册/创建访客提供黑名单代理。预约/通行已按Eureka直接调用正式exception；桥接自身不再写异常/黑名单，聚合读取Java投影。角色首页、QR展示和普通人记录/异常页仍依赖它；停掉Node桥后不能声称原React全功能可用。

未来“停Node后端”需另批Java应用聚合：拟user-service新增DashboardController、ReportController及聚合Service/Impl，三个受保护领域Feign客户端/DTO，Gateway移除相应legacy路由；health需单独确定兼容脱敏方案，不能随手替换旧字段。仍须保留本人/管理员范围、中文字段/排序和聚合故障明确失败，不能全库共享。未在本轮实现，也不把它混入A–F审批。

## 当前功能结构与流程（真实范围文本图）

```mermaid
flowchart TD
 System[校园出入系统] --> User[用户认证 资料 账号 权限]
 System --> Appointment[预约 查询 两阶段审批]
 System --> Access[二维码 校门 设备 规则 通行]
 System --> Incident[异常 风险分析 黑名单 处置]
 System --> Aggregate[Express过渡 角色首页 统计报表]
```

```mermaid
flowchart TD
 Login[Java会话登录] --> Create[访客创建已绑定预约]
 Create --> Host[被访人审核]
 Host -->|拒绝| Rejected[未通过]
 Host -->|通过| Security[保卫处审核]
 Security -->|拒绝| Rejected
 Security -->|通过| Issue[持久命令 幂等签发 真实回执]
 Issue -->|确认| QR[200 预约和真实二维码]
 Issue -->|未知| Unknown[503 原操作恢复 不伪造成功]
 QR --> Check[身份 预约 黑名单 时间 校门设备校验]
 Check -->|允许| Record[正常通行记录]
 Check -->|拒绝| Denied[异常通行记录和可靠事件]
 Denied --> Handle[异常服务去重 门岗处置 审计]
```

```mermaid
flowchart LR
 React[原React] --> Gateway[Gateway]
 Gateway --> User[user-service 双实例]
 Gateway --> Appointment[appointment-service]
 Gateway --> Access[access-service]
 Gateway --> Exception[exception-service 双实例]
 Gateway --> Bridge[隔离Express聚合]
 Appointment --> User
 Appointment --> Exception
 Access --> User
 Access --> Exception
 Exception --> User
 Appointment --> Access
 Access -->|纯授权查询 无递归| Appointment
 User --> UDB[用户隔离库]
 Appointment --> ADB[预约隔离库]
 Access --> XDB[通行隔离库]
 Exception --> EDB[异常隔离库]
 Eureka[双Eureka 注册发现] -.-> Gateway
 Eureka -.-> User
 Eureka -.-> Appointment
 Eureka -.-> Access
 Eureka -.-> Exception
```

```mermaid
sequenceDiagram
 participant Browser as 原React
 participant GW as Gateway
 participant AP as appointment-service
 participant US as user-service
 participant EX as exception-service
 participant AC as access-service
 Browser->>GW: 最终审核 原PATCH
 GW->>AP: 服务名路由
 AP->>US: 实时身份及权限
 AP->>EX: 黑名单校验
 AP->>AP: 锁预约 持久操作
 AP->>AC: 同operationId prepare
 AC-->>AP: 不可通行预备码回执
 AP->>AP: 决议与任务本地事务
 AP->>AC: activate
 AC->>AP: 纯授权决议查询
 AC-->>AP: ACTIVE真实回执
 AP->>AP: 确认SUCCEEDED
 AP-->>Browser: 200 appointment和qrCode
 Note over AP,AC: 未知503并按持久操作恢复 两库非全局原子
```

以上是文档文本图，尚未整理成带图号的正式Word报告，也不把绘图存在算作课程提交完成。数据库字段/关系基线见database-dictionary及各域SQL；一对多/多对多说明和课程报告缺口见[p5-course-rubric-matrix.md](p5-course-rubric-matrix.md)。

## 收尾结论及下一步精确范围

六项遗留只完成方案，无实现：[p5-remaining-features-plan.md](p5-remaining-features-plan.md)。建议下一批仅审批原前端App.jsx、config/roles.js、pages/FeaturePages.jsx、必要api/client.js的A/B/F局部入口；不改后端API/库。C只读查询需独立审批新增预约控制器/服务/DAO/DTO；C人工恢复、D身份关联、E人员删除分别审批，不能捆绑。Java聚合迁移另列一批，不借本轮分析直接实施。

当前演示可在已准备机器上一键启动正常闭环；主要阻塞是正式报告与五分钟彩排，以及如果老师要求纯UI扫码或完全停Node，需相应批准前端入口/Java聚合。真实短信、硬件、多机HA、全站移动端、HOLD人工恢复、未绑定场景和人员删除可如实列限制，但最终课程接受程度由老师决定。
''')
current=f'''<!-- P5-CURRENT-BEGIN -->
## 当前P5前置分析与集成准备（2026-10-20，待下一次审批）

P4-C已获用户阶段验收。P5仅分析和隔离集成核查：原68API中Java62、Express5（四聚合+health）、未实现1（人员删除）；Java覆盖91.18%，不是总体/页面完成率。统一启停/健康检查与本轮{total}项真实集成断言通过，React/Java业务源码不变，原68文件、19原表和备份不变，既有HOLD不变。A–F只出方案，未改UI/契约、未进入正式切换或下一阶段。见[p5-system-integration-audit.md](p5-system-integration-audit.md)。以下较早阶段状态作历史保留。

<!-- P5-CURRENT-END -->

'''
for name in ['migration-progress.md','service-boundaries.md']:
 p=D/name;t=p.read_text(encoding='utf-8-sig');t=re.sub(r'<!-- P5-CURRENT-BEGIN -->.*?<!-- P5-CURRENT-END -->\s*','',t,flags=re.S);write(name,current+t)
(E/'source-verification.json').write_text(json.dumps({'baselineFiles':len(baseline),'allBusinessAndFrontendSourcesUnchanged':True,'changed':[]},indent=2),encoding='utf-8')
print(json.dumps({'assertions':total,'apiCounts':api['counts'],'businessSourceFilesUnchanged':len(baseline),'portsClosed':True}))
