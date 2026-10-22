from pathlib import Path
import json,csv,datetime,re,hashlib,socket,zipfile,subprocess
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p4c-evidence'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
run=max(E.glob('verification-*'),key=lambda p:p.name);summary=load(run/'summary.json');assert summary['complete'] and summary['allPassed'],'Full verification must pass before final docs'
rows=[]
for x in summary['results']:
 log=(run/(x['script']+'.txt')).read_text(encoding='utf-8');match=re.findall(r'\{"evidence":.*\}',log)
 if not match:continue
 info=json.loads(match[-1]);p=R/info['evidence'];p=p/'report.json' if p.is_dir() else p;report=load(p);assert report['pass'] and report.get('complete',True);rows.append((x['script'],info['assertions'],p))
policy=max((p for p in E.glob('policy-*.json') if not p.name.startswith('policy-probe')),key=lambda p:p.name);assert load(policy)['pass'];rows.append(('actual-java-policy',load(policy)['assertions'],policy));total=sum(x[1]for x in rows)
sort=max(E.glob('sort-overflow-*.json'),key=lambda p:p.name);assert load(sort)['pass'] and load(sort)['complete'];rows.append(('real-bigint-front-insert',len(load(sort)['results']),sort));total=sum(x[1]for x in rows)
table='|实际测试|通过断言|原始证据|\n|---|---:|---|\n'+''.join('|'+name+'|'+str(n)+'|['+p.name+']('+p.relative_to(D).as_posix()+')|\n'for name,n,p in rows)
data=max(E.glob('data-final-*.json'),key=lambda p:p.name);assert load(data)['pass'];assert load(E/'preservation-final.json')['originalDatabaseUnchanged']
for name in ['build-3','dependencies-1']:
 p=E/name/'maven.log';b=p.read_bytes();text=b.decode('utf-16') if b[:2] in [b'\xff\xfe',b'\xfe\xff'] else b.decode('utf-8',errors='replace');assert 'BUILD SUCCESS' in text;(p.parent/'maven-readable.txt').write_text(text,encoding='utf-8')
ports=[19761,19762,19811,19813,19821,19841,19851,19853,19830,19800,15173];closed={}
for port in ports:
 with socket.socket()as s:s.settimeout(.3);closed[str(port)]=s.connect_ex(('127.0.0.1',port))!=0
assert all(closed.values()) and not(R/'.p4c-local/processes.json').exists()
(E/'process-closure.json').write_text(json.dumps({'checkedAt':datetime.datetime.now().isoformat(),'portsClosed':closed,'ownedStateRemoved':True,'pass':True,'browserClosedByFinally':True},indent=2),encoding='utf-8')
def write(n,t):(D/n).write_text(t.strip()+'\n',encoding='utf-8')
scope='\n本轮仅隔离合成环境。原React、Express、生产数据库和历史备份不变；不进入人员删除、无绑定预约改造或后续阶段。\n'
write('p4c-test-evidence.md',f'''# P4-C真实测试证据

最终七项目Reactor Maven clean verify通过：[构建](p4c-evidence/build-3/maven-readable.txt)；[真实依赖树](p4c-evidence/dependencies-1/maven-readable.txt)。没有JUnit业务测试，不把Maven无测试报成功当作功能通过。

[整套执行摘要]({(run/'summary.json').relative_to(D).as_posix()})。以下全部为实际Java/SQL/HTTP或真实Edge执行，共{total}项断言；轮询次数不同可能改变统计，非接口数。

{table}
## 数据和失败证据

[最终数据证据]({data.relative_to(D).as_posix()})包含MySQL版本、账号授权、各表计数、跨库拒绝、既有合成记录完整性、BIGINT及投递清零。原19表DDL和数据、两份备份见[preservation-final](p4c-evidence/preservation-final.json)；原68源文件见preflight报告。P4-C代码/证据SHA256见p4c-change-files.csv和p4c-evidence/final-manifest.json。

首轮Bearer遗漏导致合法调用401、初期Hystrix累计计数断言不成立，以及Java源码探针默认编码导致中文全天断言失败，均留存失败报告；分别修复身份头、以真实open/health错误及恢复证明熔断、探针显式UTF-8后重跑。未改框架版本，未覆盖失败证据。旧时间策略探针明确安全未通过，不能把它当作新策略测试通过。

所有11个本轮端口已关闭，Edge由finally关闭。短信、物理门禁、多主机HA、长期压测及所有崩溃指令点穷举未测试。
'''+scope)
apirows=[x for x in csv.DictReader((D/'api-inventory.csv').open(encoding='utf-8-sig'))if x['target_service']=='exception-service'];assert len(apirows)==10
methods={'GET /api/exceptions':'ExceptionController.list','GET /api/exceptions/analysis':'ExceptionController.analysis','GET /api/exceptions/:id':'ExceptionController.detail','GET /api/exceptions/:id/analysis':'ExceptionController.single','POST /api/exceptions/chat':'ExceptionController.chat','PATCH /api/exceptions/:id':'ExceptionController.update','POST /api/exceptions/:id/actions':'ExceptionController.action','GET /api/blacklist':'BlacklistController.list','POST /api/blacklist':'BlacklistController.create','PATCH /api/blacklist/:id':'BlacklistController.update'}
at='|原ID|方法与路径|Java方法|权限与SQL|\n|---|---|---|---|\n'
for x in apirows:
 k=x['method']+' '+x['path'];at+=f"|{x['id']}|{k}|{methods[k]}|原角色{x['effective_roles']}；IncidentMapper XML|\n"
write('p4c-api-migration.md','''# P4-C API迁移清单

原10条API全部建立Controller→IncidentService→Impl→MyBatis XML映射，均已编译、启动和真实测试。创建异常仍由原simulate拒绝事件触发，不擅增公共POST异常接口；黑名单没有原DELETE，不新增物理删除。

'''+at+'''
保留URL/Method/字段/中文状态、顶层total、原黑名单POST 200、原success/error包装。异常按sort_order,id，列表status/risk/person过滤；黑名单仅生效/启用可见，status/type/keyword过滤；前端客户端分页，未添加Page DTO。分析与问答纯Java移植原JSON规则，风险不提供原不存在的人工编辑API。原管理员只能查看/分析，guard才能处置；普通角色本人异常仍经原dashboard聚合按归属返回。

批准的差异仅两条处置写API的受控状态/409及可选Idempotency-Key，另通行时间解析严格拒绝，详见[p4c-contract-differences.md](p4c-contract-differences.md)。同幂等键请求先实时鉴权再重放，状态/动作/去重响应/审计同事务；普通无Key请求视为独立操作，不宣称识别所有语义相似动作。

证据逐接口见core、security、integration、browser报告：查询/分析/问答与原纯函数深比较，真实写入/回滚/权限/并发验证。参数化SQL未使用原store全表重写。
'''+scope)
write('p4c-exception-service-design.md','''# exception-service设计

独立backend/exception-service，Java11/Boot2.3.12.RELEASE/Hoxton.SR12/MyBatis2.1.4；Eureka、Ribbon2.3.0、Feign2.2.9、Hystrix1.5.18、Gateway2.2.9沿用，实际树见测试证据。

Controller分别处理异常、黑名单、受保护内部接口；IncidentService接口与Impl管理事务，RiskAnalysis实现原确定性本地JSON模型，IncidentMapper/ XML执行显式SQL；Entity描述原字段，Map DTO显式转换蛇形字段及actions JSON以保留null/数组契约，未声称全部Mapper均返回强类型实体。client/security/config/exception分离。无Node分析进程、外部LLM或Mock替代Java业务。

异常库独占exceptions、blacklist和inbox/outbox/幂等操作表。user-service经受保护Feign实时验证Token、角色和账号；没有复制users或sessions缓存。预约与通行通过Eureka按exception-service服务名检查黑名单，查询失败安全拒绝。access_outbox原机制保留，接收端稳定E+recordId、摘要比对、同事务inbox去重，确认accepted+recordId后发送端才确认。成功通行事件仅接收不生异常，拒绝事件按原风险正则生成。

异常处置只操作本域表；审计可靠outbox→user新受保护exception-audits接口，用户域MyBatis幂等写审计。异常分析原规则只需本域事件，不为满足形式直接跨库查询人员/通行；身份所需人员基础信息已经由user权威上下文提供。

隔离Express仅保留dashboard/reports聚合，异常/黑名单公共路由由Gateway直达Java，桥接账号仅旧合成库user_domain_outbox表DML。聚合当前异常投影来自Java，黑名单临时端点仅为未改P2注册契约代理Java，无本地名单缓存。不存在exception回调聚合递归依赖。实际部署单机多进程不等同物理HA；服务身份共享内部密钥仅限受限回环实验，生产需专门凭据治理。
'''+scope)
write('p4c-database-migration.md','''# P4-C数据库迁移与隔离

新建campus_p4c_exception_时间戳独立schema。V001__exception_schema.sql实际执行两次，CREATE IF NOT EXISTS/INSERT IGNORE可重复；运行账号只本库SELECT/INSERT/UPDATE/DELETE，无DDL。保留原exceptions及blacklist字段/中文状态/ID/actions/移出历史，sort_order为BIGINT。版本SQL位于模块resources/db/migration。

仅通过受控准备脚本从P2旧合成库复制已有94条异常、4条黑名单；没有读取真实人员/凭证或原生产数据。旧合成记录未删；最终逐ID核对均保留。业务服务不访问旧库或其他微服务表。运行过程中所有新增记录使用合成数据。

incident_inbox主键event_id与SHA256摘要、exception_id、received_at；incident_outbox主键event_id、payload、PENDING/DELIVERED、attempts/next_retry_at；incident_requests保存主体/路径/幂等键摘要及原成功响应；incident_locks稳定行锁串行化黑名单变更与事件插入，避免并发MIN前插覆盖；incident_faults仅隔离回执丢失注入，默认关闭、最终剩余0。

处置锁单事件，状态/动作JSON前插/去重/审计同事务，READ_COMMITTED避免旧快照授权状态。事件插入与inbox同事务；真实SQL触发器故障验证回滚。接收回执仅事务提交后返回；发送端/接收端各自事务，不是分布式原子提交或恰好一次网络传输。

SHA与跨库权限拒绝、DDL类型、行数、待投递清零见最终data报告。旧生产19表DDL和数据保持一致。旧黑名单任意状态字符串及移出后再启用的原行为保留，不擅自新增历史DELETE或状态枚举；生产化唯一活动凭证策略需要另行审查。
'''+scope)
write('p4c-event-delivery-test.md','''# 异常事件可靠投递验证

真实core/faults/安全测试证据索引见[p4c-test-evidence.md](p4c-test-evidence.md)。同事件12并发只产生一异常一inbox；同ID不同内容409；接收成功通行不生成异常；所有既有合成异常ID保留。

真实接收事务提交后延迟HTTP回执触发客户端超时，另一实例重试同ID只返回同accepted结果；不是Mock模拟成功。真实access模拟拒绝产生access_outbox，接收端提交但回执未知时发送端未标DELIVERED；停止接收双实例并重启发送端，待恢复后继续发送原事件，最终一个异常且发送端清零。

黑名单服务故障时依赖检查的通行/预约503，不生成虚假成功记录。审计outbox失败保留重试，不吞错标成功。真实触发器阻止outbox插入时黑名单及处置事务均回滚。sort_order列BIGINT，测试实际前插值低于INT下界仍成功，无原P4整数溢出复发。

受保护接口只对可信内部服务开放；事件ID由稳定recordId推导而非每次请求新生成。未实现物理机崩溃演练、跨主机复制或无限容量队列保证，不能据Outbox存在宣称所有一致性问题已解决。
'''+scope)
write('p4c-blacklist-test.md','''# 黑名单安全验证

真实HTTP/SQL覆盖六角色权限（仅admin管理）、18位证件/车牌输入、星号新建拒绝、标准化、重复活动凭证409、移出必填原因及历史字段。历史掩码连续星号匹配数字、不匹配字母；只有生效/启用参与检查，按原排序首条命中。

预约按证件受保护Feign查询；通行按人员姓名/编号/证件/电话/QR所属人与凭证多值查询，保持原两种语义，未合并成单一精确身份证检查。真实黑名单新增后立即拦截，移出后下一请求恢复，无允许结果缓存。预约真实403和二维码签发后真实拒绝及高风险异常均测试。

关闭异常双实例验证503拒绝、无错误放行记录；读取真实Hystrix open和health错误，不仅凭fallback；恢复允许探测后真实请求成功且断路器关闭。初期累计计数断言失败记录保留，最终健康计数/开闭状态及响应记录见faults报告。真实Ribbon user双实例分流另见integration。
'''+scope)
write('p4c-security-test.md','''# P4-C权限、状态及时间策略测试

六角色登录，异常查询仅guard/admin，聊天仅admin，实际处置仅guard，黑名单管理仅admin；普通学生/教职工/访客/校友及管理员处置403。无效Token、伪造身份头和无内部密钥拒绝。停用账号、撤销角色后旧Token及已成功幂等请求不能绕过实时权限。

已批准单向状态：待处理→处理中/已处理、处理中→已处理；逆向/终态新动作409原包装。同一Idempotency-Key12并发同200原结果、只一动作，换摘要409，五个独立并发动作无覆盖；十个终态并发仅一成功其余409；确认成功同键可重放200。未带Key独立请求不能声称总能识别相同意图。

真实MySQL触发器故障使状态、动作及审计整体回滚。时间策略严格完整HH:mm-HH:mm，非法/空/超界/垃圾前后缀安全拒绝，保留全天/预约时段受控值和上海时区。实际编译类22项确定性测试覆盖跨午夜和边界；HTTP再用隔离库非法规则/校门配置、缺失启用规则、未知身份验证拒绝。停用设备、无法读取预约状态及签发闭环在P4回归验证，不修改其其他契约。

原React/Express没有改；无绑定预约仍503、不改状态；签发未知仍批准503及持久恢复。日志报告不输出密码、完整Token、验证码或二维码可解码截图。准确值秘密扫描范围与限制见secret-audit报告，不能视作万能秘密检测器。
'''+scope)
browser=[p for n,_,p in rows if 'browser' in n][0]
write('p4c-browser-regression.md',f'''# P4-C真实Edge回归

[原始报告]({browser.relative_to(D).as_posix()})。真实已安装Edge，原React页面和真实Gateway/Java/MySQL，版本与逐项结果见report，不使用Mock响应。

原访客预约→被访人审核→保卫处最终200/真实二维码→页面SVG内存解码核验→通行记录，P2六角色资料与退出、通行规则编辑、普通角色记录范围均回归。新增真实门岗/identity-check现有“拒绝”按钮调用Java动作接口，已处理状态落库；管理员原黑名单表单新增及原prompt填写移出原因完成PATCH。管理员异常态势/列表由Java实时数据提供，普通角色仍通过原dashboard按本人范围。

没有原扫码模拟按钮/规则验证器渲染，因此相关软件核验继续明确为真实Edge调用原API客户端，不伪称按钮测试。未新增按钮、HOLD页面或人员删除。报告pageerror/core console检查与截图保留；保存截图遮罩二维码和输入框，真实凭证仅内存解码。

本轮Edge在finally关闭；全站移动适配、短信送达和硬件未测试。
'''+scope)
write('p4c-acceptance.md',f'''# P4-C提交验收

本轮正式exception-service隔离实现与复验完成，**停止等待审核，不自动进入下一阶段**。P4-A/B已按用户确认通过此前范围；本轮仅已批准异常处置及时间安全差异，不改变其他已通过契约。

|范围|已实现|已编译|已启动|已真实测试|未完成/限制|
|---|---|---|---|---|---|
|10条异常/黑名单原API|是|build-3通过|双实例/Eureka/Gateway|真实SQL/原分析对照/权限/浏览器|生产化与真实数据迁移未授权|
|稳定事件投递与审计|是|是|是|并发/丢回执/故障/重启续投/事务回滚|多主机灾难恢复未测|
|A+B安全调整|是，已批准|是|是|受控状态/成功重放/409/严格时间/时区|无普通接口重开已处理事件|
|P2/P3/P4-A/B回归|保留|是|是|预约真实QR、未知503、撤销/并发、六角色、Edge|原遗留UI/短信/HOLD人工恢复未扩大|
|无绑定预约/人员删除|不实施|不适用|保护保留|原503/禁用规则回归|未完成且不计本轮实现|

共{total}项真实断言通过，详见[p4c-test-evidence.md](p4c-test-evidence.md)，构建、启动和功能分别记录；早期失败均留存。源码分层、10API映射、数据库、事件、黑名单、安全与浏览器材料分别见同目录p4c文档。原68文件、19表数据/DDL及原始/长期备份校验一致；已有合成94异常/4黑名单ID完整保留。

已关闭11个隔离服务端口及测试Edge，敏感文件不被Git跟踪；没有正式切流。限制：单机多进程、旧版框架仅隔离使用、共享内部服务密钥、原前端现场放行先写记录再写处置是两个HTTP操作而非跨服务原子事务；失败仍显示原错误，不能宣称两步全局原子。未实施外部硬件/短信/全站移动界面/人员删除/无绑定预约/HOLD人工恢复。
'''+scope)
current=f'''<!-- P4C-CURRENT-BEGIN -->
## 当前P4-C状态（2026-10-20，等待验收）

用户已批准P4-A/B此前范围及P4-C实施、A+B安全差异。独立exception-service和10条原API已实现、编译、注册、Gateway及真实SQL/HTTP/Edge验证，共{total}项断言。异常/黑名单归独立库；预约/通行按Eureka+Feign/Ribbon查询正式异常服务；事件幂等inbox及原access_outbox续投，审计独立outbox。旧桥接仅聚合与P2注册黑名单代理，无名单缓存或异常写入。非法时间拒绝，处置单向且成功同键重放200。原68文件、19表及备份不变，测试进程已关闭，未进入后续阶段。见[p4c-acceptance.md](p4c-acceptance.md)。以下历史阶段状态不代表当前授权。

<!-- P4C-CURRENT-END -->

'''
for n in ['migration-progress.md','service-boundaries.md','compatibility-decision.md']:
 p=D/n;t=p.read_text(encoding='utf-8-sig');t=re.sub(r'<!-- P4C-CURRENT-BEGIN -->.*?<!-- P4C-CURRENT-END -->\s*','',t,flags=re.S);write(n,current+t)
print(json.dumps({'totalAssertions':total,'testGroups':len(rows),'documentsWritten':9,'portsClosed':True}))
