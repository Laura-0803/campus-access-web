"""Consolidate existing, real evidence. Never executes tests or marks unrun work passed."""
from pathlib import Path
import json,csv,re,hashlib,zipfile
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p2-evidence'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
run=sorted(E.glob('verification-*'))[-1];commands=read(run/'summary.json')
assert len(commands)==9 and all(x['exitCode']==0 for x in commands)
suites=[]
for command in commands:
 text=(run/(command['script']+'.txt')).read_text(encoding='utf-8')
 records=[]
 for line in text.splitlines():
  try:
   item=json.loads(line)
   if isinstance(item,dict) and 'evidence' in item:records.append(item)
  except ValueError:pass
 assert records,command
 file=R/records[-1]['evidence'];data=read(file);cases=data['results'];assert cases and all(x['pass'] for x in cases)
 suites.append({'script':command['script'],'evidence':file.relative_to(R).as_posix(),'cases':len(cases),'pass':True})
total=sum(x['cases'] for x in suites)
preservation=read(E/'preservation-after-safety.json');db=read(E/'database-final.json');closure=read(E/'process-closure.json');preflight=read(sorted(E.glob('preflight-*.json'))[-1])
assert preservation['originalDatabaseUnchanged'] and preflight['originalSourceUnchanged'] and closure['allOwnedListenersStopped']
assert all(x['originalUnchanged'] and x['longTermCopyMatches'] for x in preservation['backupChecks'])
assert 'BUILD SUCCESS' in (E/'safety-final-build/maven-verify.txt').read_text(encoding='utf-8',errors='replace')
assert 'BUILD SUCCESS' in (E/'dependencies/dependency-tree.txt').read_text(encoding='utf-8',errors='replace')
artifacts=[];libraries=set()
for module in ['eureka-server','gateway-service','user-service']:
 jar=R/'backend'/module/'target'/(module+'-0.2.0-SNAPSHOT.jar')
 with zipfile.ZipFile(jar) as z:libraries.update(n.split('/')[-1] for n in z.namelist() if n.startswith('BOOT-INF/lib/') and n.endswith('.jar'))
 artifacts.append({'module':module,'sha256':hashlib.sha256(jar.read_bytes()).hexdigest()})
expected=['spring-boot-2.3.12.RELEASE.jar','spring-core-5.2.15.RELEASE.jar','spring-cloud-openfeign-core-2.2.9.RELEASE.jar','spring-cloud-gateway-server-2.2.9.RELEASE.jar','ribbon-core-2.3.0.jar','hystrix-core-1.5.18.jar','eureka-client-1.10.14.jar','mybatis-spring-boot-starter-2.1.4.jar','mybatis-3.5.6.jar','mybatis-spring-2.0.6.jar','mysql-connector-java-8.0.25.jar']
assert set(expected)<=libraries,sorted(set(expected)-libraries)
summary={'scope':'P2 isolated development only','migratedCandidateApisImplemented':32,'candidateApis':33,'personDeleteMigrated':False,'p2OverallAcceptance':'incomplete; review required','p3Started':False,'verificationDirectory':run.relative_to(R).as_posix(),'suites':suites,'assertionsAndComparisons':total,'mavenCleanVerify':True,'mavenJUnitTests':0,'artifacts':artifacts,'verifiedRuntimeLibraries':expected,'originalFilesUnchanged':68,'originalDatabaseTablesUnchanged':19,'officialBackupsUnchanged':True,'allOwnedListenersStopped':True,'browserVisualTestsRun':False,'realSmsDeliveryTested':False}
(E/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
rel=lambda s:s.removeprefix('docs/')
rows='\n'.join(f"|{s['script']}|{s['cases']}|通过|[{Path(s['evidence']).name}]({rel(s['evidence'])})|" for s in suites)
versions='Java Temurin 11.0.32.1+1；Maven 3.9.11；Spring Boot 2.3.12.RELEASE / Framework 5.2.15.RELEASE；Spring Cloud Hoxton.SR12；Eureka 1.10.14；Ribbon 2.3.0；Hystrix 1.5.18；Spring Cloud OpenFeign/Gateway 2.2.9.RELEASE；Feign 10.12；MyBatis Starter 2.1.4 / Core 3.5.6 / Spring 2.0.6；Connector/J 8.0.25；实际MySQL '+db['mysqlVersion']+'。'
limits='人员删除暂停，真实短信通道送达未测试，浏览器视觉及全部页面交互未运行。因此P2总体验收尚未通过；不能进入P3、切换原库或部署原运行环境。'
def write(name,text): (D/name).write_text(text.strip()+'\n',encoding='utf-8')
write('p2-acceptance.md',f'''# P2验收记录：32个候选接口已实现并隔离验证，整体验收未完成

方案A和隔离共存适配已由用户批准。本轮按第一批→第二批→第三批推进，第一批真实会话共存通过后才生成第三批。候选33条中已实现32条，人员DELETE未实现/未切换；4个跨域聚合接口仍在Express。{limits}

|项目|已实现|已编译|已运行|测试结果|未完成/边界|
|---|---|---|---|---|---|
|第一批8条认证+角色字典|是|是|独立Java进程|合成登录、会话、密码、验证码、注册通过|真实短信端到端未验证|
|第二批4资料+2人员查询|是|是|是|六角色、白名单更新、越权、筛选及非法输入通过|浏览器资料页未验收|
|第三批17条管理/凭证/消息/日志|是|是|是|真实CRUD、权限、数量限制、幂等及持久化通过|浏览器对应页面未验收|
|人员删除1条|否|否|否|未运行、不通过|待跨域撤销/恢复契约审批|
|Eureka/Gateway/Feign/Ribbon/Hystrix|是|是|是|两注册中心UP、按服务名路由、真实Ribbon及开路/短路/恢复|仅本机隔离部署；不是生产HA|
|MyBatis、事务及数据库隔离|是|是|是|真实MySQL、审计故障回滚、并发限额、越权库访问拒绝|无真实用户迁移|
|原React登录页组件|原页面未改|Vite实际转换|组件渲染器调用真实HTTP|登录/退出/注册/找回/503提示通过|不是浏览器视觉或完整UI验收|
|正常短信发送|HTTPS通道调用代码|是|未配置通道分支已运行|503及不伪造成功通过|真实短信受理/送达未测试|
|源码/数据库/备份保全|只读核对|不适用|是|68源文件、19表数据及DDL、官方原备份与长期副本一致|未把本次复核称作新恢复演练|

实际外部验证合计 **{total}项断言/对照**，逐项结果见[p2-test-evidence.md](p2-test-evidence.md)。Maven clean verify成功，但项目本轮没有JUnit用例；上述数量来自真实HTTP/MySQL/React组件套件，不能写成Maven单元测试数量。

{versions}

源码结构见[设计](p2-user-service-design.md)，接口逐条映射见[API清单](p2-api-migration.md)，数据库见[迁移记录](p2-database-migration.md)，安全见[测试矩阵](p2-security-test.md)。实际文件清单是p2-implementation-files.csv；旧p2-file-manifest.csv是前置分析时的历史清单。原审核输入已保存在p2-evidence/approval-input；失败日志与失败JSON原样保留。

当前全部自建P2监听已停止，见[停止证据](p2-evidence/process-closure.json)。没有Git批量提交、没有旧历史恢复声明、没有修改原React/Express代码或原业务表。
''')
write('p2-test-evidence.md',f'''# P2真实测试证据与未运行项

最终构建：[Maven clean verify日志](p2-evidence/safety-final-build/maven-verify.txt)。实际执行成功；其中“No tests to run”表示没有JUnit用例，不代表下述外部集成测试没有运行。最终套件入口：`python docs/p2-run-verification.py`；执行清单：[{run.name}/summary.json](p2-evidence/{run.name}/summary.json)。测试前轮询Gateway、正常模式服务、两Eureka及Ribbon真实列表，超时即失败；没有以固定sleep认定就绪。

|真实执行脚本|断言/比较数量|结果|原始脱敏记录|
|---|---|---|---|
{rows}

合计{total}项。脚本输出只保存状态、断言、组件类型及错误计数，不保存完整Token、验证码、明文密码或请求响应原文中的敏感值。数据库验证见[最终结构与重启持久化](p2-evidence/database-final.json)，额外证明重启后两个人脸槽位、车辆及管理员创建账号仍可查询。所有账户及人员均带SYN标识，数据库质量检查未发现非合成人员/非哈希密码；未复制原账号、密码或预约数据。

兼容对照不是Mock：在短生命周期只读Express副本执行原路由，以原store中的真实SELECT读取隔离库，身份仍由Java内部接口校验。对照只记录比较结论，66组GET响应含成功/禁止分支逐字段一致。写接口由各批HTTP及SQL断言验证，未宣称所有畸形输入/所有写分支都已进行黄金快照比较。

故障实验真正停止进程：黑名单不可用→503且没有人员写入；观察Hystrix错误计数、open及shortCircuits，再恢复下游并经真实请求恢复闭路；停止认证权威→Express适配拒绝503；重启后原Java会话仍可用。没有把fallback或HTTP200单独当作成功。内部组件状态接口要求服务凭证，不经过外部Gateway。

真实事务故障：在合成库临时建立审计INSERT失败触发器，在人员和账号INSERT之后抛出数据库异常；HTTP500，人员/账号均为0，验证码消费回滚；移除触发器后同一正确请求成功。不是Mock DAO。触发器已删除，未对原库建触发器。

保全：[68文件及Git检查]({sorted(E.glob('preflight-*.json'))[-1].relative_to(D).as_posix()})、[19表数据/DDL及官方备份](p2-evidence/preservation-after-safety.json)。只读事务、SELECT/SHOW及ROLLBACK；原库写入0。保全脚本附带的P1账号检查仍仅属于P1账号；P2两个账号隔离另由本轮HTTP/SQL套件验证。

失败历史保留：初次Gateway缺RouteLocatorBuilder导入；适配副本初次缺异常模型文件；第一次过早执行HTTP套件未过就绪门槛；车辆并发原先3次201，修复MyBatis会话缓存复用和锁后计数后为2次201+1次400；测试清理SQL的中文经过旧Shell管道变成问号导致历史车牌未清理；Hystrix累计指标首次订阅/采样过早，已增加故障前订阅及有界指标轮询；幂等测试曾选中已删除车辆的历史事件，改为按本次审计ID关联。本轮未删除失败JSON/日志，也未把失败项改成通过。

未运行：真实短信送达、浏览器视觉/全页面交互、人员跨域删除与失败恢复、生产切换、多机HA及全面压力测试。浏览器工具实际返回apps/browsers空列表，见[browser-availability.json](p2-evidence/browser-availability.json)。组件测试虽执行原LoginPage.jsx和真实后端，不能替代这些未完成项。
''')
write('p2-user-service-design.md',f'''# P2实际工程与职责

`backend/pom.xml`是正式父工程，含eureka-server、gateway-service、user-service三个Maven子模块。legacy-adapter是独立Node过渡层。没有创建预约、通行、异常Java服务，也没有把P1实验接口改名充当业务接口；P1工程及证据保留。

- controller：Auth、Role、Profile、PersonQuery、PersonAdmin、UserAdmin、Face、Vehicle、Message、Audit分别处理对应HTTP契约；内部会话/投影、组件状态及过渡审计命令不经外部网关开放。
- service及impl：认证/密码/验证码、资料、管理、凭证、消息各自实现事务及服务端权限；过渡事件服务只接收有限的审计和车辆时间命令。
- dao及resources/mapper：UserMapper/DomainMapper和XML执行参数化查询、按行插入/更新/删除；没有全表DELETE后重新插入的store机制。
- entity：用户域9表及verification_codes均有对应实体；会话Token摘要及验证码digest标记不可序列化。
- dto：LoginRequest、SafeUser、PersonCreated、LegacyAccessEvent及统一响应构造器；SafeUser显式白名单6字段，没有password属性。
- security/exception/config：SessionAuthority从数据库实时取账号角色/状态；统一错误；启动强制回环、P2专用schema、最小权限账号，拒绝广权限账户及非隔离JDBC URL。

Eureka为19761/19762两个进程，沿用P1主机名区分及prefer-ip-address=false的peer修复；Gateway19800通过`lb://user-service`访问19811。19812仅验证正常短信模式、不注册；legacy-adapter19830真实注册Eureka，Java通过OpenFeign服务名legacy-bridge、Ribbon和Hystrix调用黑名单检查。实际Bean及ZoneAvoidanceRule证据在故障JSON。未使用现代替代组件。

过渡层仅复制原路由/纯函数代码，不复制.env、seed、db.json或真实数据；替换的store只在请求AsyncLocalStorage内持有新投影。每次请求在Java只读事务取得一致的身份和users/people等投影，绝不伪造旧Session。Gateway剥离客户端X-Role/X-User/内部服务头并添加自己的随机适配凭证。鉴权失败/超时即拒绝；本地请求队列维持旧路由的请求顺序，不共享原进程缓存。

原通行路由产生的审计与车辆时间通过本地事务outbox发送到Java受保护命令；Java以MyBatis更新，审计ID幂等，时间防倒退，车主关系变化则拒绝。确认丢失重试测试通过。这个机制不承诺跨服务原子性，也不能当作删除Saga。

{versions}

入口和运行命令见[backend/README.md](../backend/README.md)。真实版本证据见[versions.txt](p2-evidence/versions.txt)和[依赖树](p2-evidence/dependencies/dependency-tree.txt)，打包库及SHA见[p2-evidence/summary.json](p2-evidence/summary.json)。系统默认Java21未更改。

{limits}
''')
write('p2-database-migration.md',f'''# P2独立数据库与迁移验证

实际MySQL {db['mysqlVersion']}。user-service及过渡层分别使用新建schema及不同受限账号；原库、P1恢复库及P0/P1备份未覆盖。没有真实账号/人员/会话迁移。所有DDL只在严格匹配campus_p2_*命名的目标执行，原initStore/修复/种子脚本从未运行。

|表|实体/Mapper|用途|
|---|---|---|
|users|UserEntity / UserMapper、DomainMapper|账号、PBKDF2哈希、当前角色及状态|
|people|PersonEntity / UserMapper、DomainMapper|完整人员档案、查询和白名单资料更新|
|roles|RoleEntity / UserMapper|六角色字典|
|role_profiles|RoleProfileEntity / UserMapper|角色展示配置，保持字典返回|
|sessions|SessionEntity / UserMapper|随机客户端Token的SHA256摘要、用户及ISO有效期|
|faces|FaceEntity / DomainMapper|主副槽位、图片元数据及人员faceStatus事务|
|vehicles|VehicleEntity / DomainMapper|归属、唯一车牌、每人2辆及最近通行|
|messages|MessageEntity / DomainMapper|原受众及共享read_flag语义|
|logs|AuditEntity / DomainMapper|用户域及过渡审计|
|verification_codes|VerificationCodeEntity / UserMapper|用途+手机号主键、摘要、过期和尝试次数|

独立SQL：[V001__user_schema.sql](../backend/user-service/src/main/resources/db/migration/V001__user_schema.sql)。保留原字符串ID/业务字段、空串与NULL映射；新增OTP表、索引、域内4个FK。仅目标库内部sort_order扩为BIGINT，用微秒顺序值保持连续新增的倒序，原表类型不变；既有排序值不重写。独立增量见[V002](../backend/database/V002__widen_internal_order.sql)。过渡outbox独立SQL在[legacy-adapter/schema.sql](../backend/legacy-adapter/schema.sql)，没有QR表操作的Java Mapper。

`node docs/p2-schema-verify.mjs`在另一个全新迁移验证schema连续执行V001两次，保留结果migration-repeat-*.json；并仅对活动合成schema幂等核对索引/FK/内部排序列。最终字段、索引和各表行数见[database-final.json](p2-evidence/database-final.json)。不能把IF NOT EXISTS当成所有旧库自动升级方案；历史真库仍需专门差异迁移审批。

所有用户服务写入是MyBatis行操作。多表注册、登录会话/审计、密码重置/撤销、上传/faceStatus使用真实事务。验证码FOR UPDATE防重复消费，错误尝试按策略提交；数据库异常则整笔回滚。车辆锁定车主行并在锁后独立COUNT，使用READ COMMITTED、语句级缓存及唯一索引防并发突破。三次并发请求最终两次201、一次400；之前的失败证据保留。

P0原库实际额外sync_status、devices同步字段及app_state保留在原库，没有删除；它们未被伪称已迁移到新运行库。历史空槽位、角色/人员类型分歧、旧明文或未知密码格式、旧会话真实导入均未迁移。新库只接收合成PBKDF2数据；Node/Java含中文密码交叉验证通过。

重启后会话、两个人脸槽位、车辆和管理账号持久化查询通过。原库19表数据/DDL散列一致，68原文件一致，官方两份原始备份及长期副本均匹配。备份恢复沿用已验收P1证据，本次只是重新保全核验。
''')
write('p2-security-test.md',f'''# P2认证与六角色真实安全测试

身份权威是Java，非客户端角色字段。随机UUID访问Token有效8小时，数据库仅存摘要；每次请求读取用户当前角色/状态。退出删除本会话；密码重置撤销用户全部会话。普通改密按旧契约保留其他会话；管理员改密仍按原接口语义处理。

|角色|实际允许的合成场景|实际拒绝的场景|结果|
|---|---|---|---|
|学生|本人资料、改密、两个人脸槽位、原被访人审批|people/users管理、车辆、公告发布、他人资料/密码参数提权|通过|
|教职工|本人资料、人脸、本人车辆、原预约范围|people/users管理、他人车辆变更/删除、公告发布|通过|
|访客|本人资料/单位、注册登录、原本人预约|people/users管理、人脸/车辆、公告发布、跨受众标记|通过|
|校友|本人资料、登录、原本角色聚合|people/users管理、人脸/车辆、公告发布、预约列表|通过|
|门岗|本人资料、原通行/异常处置|people/users管理、人脸/车辆、公告发布、预约列表|通过|
|保卫处管理员|人员账号增改、状态/角色管理、代查、凭证及公告/日志|无效Token、非法角色/关联、原管理员异常处置|通过|

角色admin仍表示保卫处管理员；人员type按原代码保留“管理员”别名，未新增第七角色。原User.role与Person.role不强制联动，真实导入前须核查分歧。禁用/改角色后原Token立即失去相应权限；退出后Java及Express适配均401；身份权威故障则503拒绝，没有匿名/管理员fallback。Gateway剥离伪造头，适配层直接访问403；内部投影/组件接口无服务凭证403。

额外安全边界：普通账号未关联人员时，凭证查询404、隔离原业务入口403，避免旧代码空范围变为全量列表；反例暂置空合成账号关联后实际测试，随后恢复。真实历史账号如缺少关联，必须补关联或隔离，不能复制旧泄露行为。数据库验证有效期恰为8小时；合法ISO过期Token在Java和适配层均401，而非只测试格式错误。

方案A：SecureRandom六位码、5分钟、60秒发送间隔、5次错误上限、FOR UPDATE锁及一次消费；数据库只存摘要。只有显式synthetic-demo、回环、独立最小权限schema和合成白名单才返回演示码。正常模式无短信配置503且没有code响应；真实通道送达未测试。Node原LoginPage的演示预览、重置/注册及正常模式503提示组件流程已实际运行，不是浏览器验收。

SafeUser显式6字段白名单；User.password、Session.token摘要及验证码digest不可序列化。所有报告不保存验证码/完整Token/明文密码。通行审计target只存凭证摘要，原码不写入新日志/outbox。合成测试人脸为SVG数据，不使用真实照片或个人信息。

数据库权限真实验证：Java账号不能读原库、P1恢复库或legacy库；legacy账号不能读用户库。最终合成数据质量统计、失败回滚、SQL注入字符串按数据处理、并发数量及重启记录见[p2-test-evidence.md](p2-test-evidence.md)。

限制：没有真实短信供应商/送达回执测试；没有真实账号/旧Session迁移；没有浏览器/全量畸形及超限请求/压力测试。人员删除仍暂停，不能把Token停用当成所有QR凭证已撤销。旧通行策略未在本阶段重写。
''')
inventory=list(csv.DictReader((D/'api-inventory.csv').open(encoding='utf-8-sig')))
user=[r for r in inventory if r['target_service'].startswith('user-service') and not r['path'].startswith(('/api/dashboard/','/api/reports/'))]
def method(r):
 p=r['path'];verb=r['method'];category=p.split('/')[2]
 if category=='auth':return 'AuthController.'+{'login':'login','logout':'logout','me':'me','password':'password','send-code':'send','reset-code':'resetCode','reset-password':'reset','register-visitor':'register'}[p.split('/')[-1]]
 if category=='roles':return 'RoleController.roles'
 if category=='profiles':return 'ProfileController.'+('get' if verb=='GET' else 'update')
 if category=='people':return '未迁移（无Java方法）' if verb=='DELETE' else ('PersonQueryController.'+('one' if ':id' in p else 'list')) if verb=='GET' else 'PersonAdminController.'+{'POST':'create','PATCH':'update'}[verb]
 c={'users':'UserAdminController','faces':'FaceController','vehicles':'VehicleController','messages':'MessageController','logs':'AuditController'}[category]
 action='read' if p.endswith('/read') else 'upload' if p.endswith('/upload') else {'GET':'list','POST':'create','PATCH':'update','DELETE':'delete'}[verb]
 return c+'.'+action
lines=['# P2逐条API迁移与实际状态','', '候选33条：32条已实现、编译、启动并做隔离测试；人员删除1条暂停。不是正式流量切换。URL、方法、Bearer/x-campus-token、成功包装、created201/其他200、顶层total和中文业务状态沿用。', '', '|编号/原Express来源|原方法及URL|Java方法|实现/编译/运行|测试与差异/未完成|','|---|---|---|---|---|']
for r in user:
 paused=r['method']=='DELETE' and r['path'].startswith('/api/people/')
 sms=r['path'].endswith(('/send-code','/reset-code','/reset-password','/register-visitor'))
 status='否/否/否' if paused else '是/是/是'
 note='未运行；跨域删除契约待批准' if paused else '合成隔离用例通过；真实短信端到端未完成' if sms else '隔离用例通过；非生产切换'
 lines.append(f"|{r['id']} {r['backend_source']}|{r['method']} `{r['path']}`|{method(r)}|{status}|{note}|")
lines+=['','已批准差异：正常验证码成功响应不含code，仅保留phone/expireMinutes；未配置通道503；演示模式必须显式启用且满足隔离条件。Schema内Token改存摘要，客户端值/8小时语义保留；不接管原库旧Session。通行审计凭证值改摘要，满足不得记录完整Token的要求。','', '安全约束优先：普通账号缺少人员关联时，凭证接口404、原业务适配入口403，避免空范围导致全量数据泄露；正常账号请求契约不变。真实历史缺失关联账号暂不可直接切换，需要补关联或隔离。','', '响应对照：66组原GET路由+原SQL，与Java逐字段比较通过；写接口的成功/失败、字段和SQL结果由分批测试断言验证。没有宣称所有写接口所有异常分支完全等价。原people/users更新失败可能残留草稿变更的缺陷不复制到Java，Java验证失败不提交。','', '原P0车辆说明曾写lastAccess不在更新白名单；实际credentials.js明确处理该字段，本实现按实际代码保留，测试验证。资料与登录profile的标题分隔符差异保留；管理员profiles/me无目标仍404；公告read_flag仍共享。','', '保留在Express的4条聚合：GET /api/dashboard/admin、/api/dashboard/:role、/api/reports/summary、/api/reports/access，已实际调用通过。其余非用户域路由继续由隔离副本执行原逻辑。health保持原字段结构，值反映隔离库，非原库连接；没有修改原前端或原Express生产配置。','', '浏览器页面级联调未完成；原LoginPage组件+真实HTTP流程通过。删除按钮在隔离环境尚不可用，不能宣称全部原页面功能已验收。详见p2-delete-contract.md及p2-test-evidence.md。']
write('p2-api-migration.md','\n'.join(lines))
prior=(E/'approval-input/p2-auth-compatibility.md').read_text(encoding='utf-8')
write('p2-auth-compatibility.md',f'''# P2方案A已批准并实施；共存适配仅在隔离副本运行

本轮依据用户正式审批继续开发，不再等待方案A重复确认。正常模式不返回验证码，未配置通道503；演示仅显式开关+精确profile+合成白名单+回环+最小权限P2库。真实短信成功送达未验证。Java成为认证权威，Express副本每请求取一致投影，服务间凭证受保护，Gateway清理伪造身份头；退出、禁用、改角色及权威故障均实测。

32个候选接口已实现并隔离验证，Maven clean verify成功；{total}项实际断言/对照通过。当前所有隔离进程已停止。原React、Express、原库、原备份保持不变。{limits}

未迁移/条件未满足：原生产Token接管或真实用户迁移、真实短信通道、浏览器视觉和全页面操作、跨域人员同步删除。删除最小方案及失败契约见[p2-delete-contract.md](p2-delete-contract.md)，未自行添加202或“删除中”。

## 审核前问题说明（历史）

完整审批输入保存在[原问题及最小方案](p2-evidence/approval-input/p2-auth-compatibility.md)。方案B未采用；原文中的“等待方案A批准”是当时状态，现已由本次正式审批取代。

原Session为UUID明文存储及8小时；Java仍向客户端签发UUID，但只在新用户库存摘要。退出即撤销，密码重置撤销全部；普通改密和管理员管理改密保留原会话策略。PBKDF2使用Node原hex盐字符串字节，含中文交叉验证通过。未知/明文旧密码不导入新合成库，真实旧会话接管也未实施。

共存只在独立副本：用户、人员、角色及会话权威来自Java；每请求获得一致投影，未共享原缓存、伪造旧Token或复制真实数据。原Express生产进程仍未改，不能将本次隔离验证理解为它已经识别Java Token。
''')
# Update indexes without erasing reviewed P0/P1 history.
progress=(D/'migration-progress.md').read_text(encoding='utf-8')
if '## 本轮P2实施交付' not in progress:
 progress=progress.replace('# 迁移进度','# 迁移进度\n\n## 本轮P2实施交付\n\n用户已批准方案A及有条件的隔离共存。本轮32/33候选API已实现、编译和隔离运行验证；'+str(total)+'项真实断言/对照通过。人员删除、真实短信及浏览器验收未完成，P2总体验收未通过，未进入P3。全部隔离进程已停止；原68文件、19表数据/DDL、官方备份保全核对一致。详见[p2-acceptance.md](p2-acceptance.md)。\n\n下方是前置核查与P1历史记录，不表示仍需重复审批方案A。',1)
 (D/'migration-progress.md').write_text(progress,encoding='utf-8')
else:
 progress=re.sub(r'(## 本轮P2实施交付\n\n).*?(?=\n## )',lambda m:m[1]+'用户已批准方案A及有条件的隔离共存。本轮32/33候选API已实现、编译和隔离运行验证；'+str(total)+'项真实断言/对照通过。人员删除、真实短信及浏览器验收未完成，P2总体验收未通过，未进入P3。全部隔离进程已停止；原68文件、19表数据/DDL、官方备份保全核对一致。详见[p2-acceptance.md](p2-acceptance.md)。\n\n下方是前置核查与P1历史记录，不表示仍需重复审批方案A。\n',progress,flags=re.S)
 (D/'migration-progress.md').write_text(progress,encoding='utf-8')
index=(D/'README.md').read_text(encoding='utf-8')
if '## P2当前交付' not in index:
 index=index.replace('# 阶段分析与实验交付索引','# 阶段分析与实验交付索引\n\n## P2当前交付\n\n方案A及隔离共存已批准；32个候选接口已实现并隔离验证，人员删除暂停，真实短信/浏览器验收未完成，未进入P3。见[P2验收](p2-acceptance.md)、[API映射](p2-api-migration.md)、[真实证据](p2-test-evidence.md)、[删除待审方案](p2-delete-contract.md)。正式代码在../backend；原React/Express和P1实验保留。\n\n## P0/P1历史索引',1)
 (D/'README.md').write_text(index,encoding='utf-8')
print(json.dumps({'suites':len(suites),'assertionsAndComparisons':total,'implementedApis':32,'p2Overall':'incomplete','allOwnedStopped':True},ensure_ascii=False))
