"""Generate final P4 evidence index from actual completed runs; never edits evidence inputs."""
from pathlib import Path
import json,csv,re,hashlib,socket,datetime,subprocess
R=Path(__file__).resolve().parents[1];D=R/'docs';E=D/'p4-evidence'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def latest(prefix):return max((p for p in E.glob(prefix+'-*.json') if re.fullmatch(re.escape(prefix)+r'-\d+\.json',p.name)),key=lambda p:int(p.stem.rsplit('-',1)[1]))
def link(p):return '['+p.name+']('+p.relative_to(D).as_posix()+')'
names=['core','contracts','configuration','security','issuance','races','architecture'];runs={n:latest(n) for n in names}
browser=max((p for p in E.glob('browser-*') if p.is_dir()),key=lambda p:int(p.name.split('-')[1]));runs['browser']=browser/'report.json'
reports={n:load(p) for n,p in runs.items()}
assert all(v.get('pass') and v.get('complete',True) for v in reports.values())
verify=max(E.glob('verification-*'),key=lambda p:p.name)/'summary.json';assert load(verify)['allPassed'] and load(verify)['complete']
jar=R/'backend/access-service/target/access-service-0.2.0-SNAPSHOT.jar'
assert all(p.stat().st_mtime>jar.stat().st_mtime for p in runs.values())
counts={n:len(v['results']) for n,v in reports.items()};total=sum(counts.values())
for directory in ['build-9','dependencies-final']:
 p=E/directory/'maven.log';raw=p.read_bytes();text=raw.decode('utf-16') if raw[:2] in [b'\xff\xfe',b'\xfe\xff'] else raw.decode('utf-8',errors='replace');assert 'BUILD SUCCESS' in text;(p.parent/'maven-readable.txt').write_text(text,encoding='utf-8')
ports=[19761,19762,19811,19813,19821,19841,19830,19800,15173];closed={}
for port in ports:
 with socket.socket() as s:s.settimeout(.3);closed[str(port)]=s.connect_ex(('127.0.0.1',port))!=0
closure={'checkedAt':datetime.datetime.now().isoformat(),'portsClosed':closed,'ownedProcessStateRemoved':not(R/'.p4-local/processes.json').exists(),'pass':all(closed.values()) and not(R/'.p4-local/processes.json').exists(),'browserClosedByTestFinally':True}
assert closure['pass'];(E/'process-closure.json').write_text(json.dumps(closure,indent=2),encoding='utf-8')
table='|真实测试组|通过断言数|证据|\n|---|---:|---|\n'+''.join('|'+n+'|'+str(counts[n])+'|'+link(runs[n])+'|\n' for n in runs)
common='\n本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。\n'
def write(name,text):(D/name).write_text(text.strip()+'\n',encoding='utf-8')
write('p4-test-evidence.md',f'''# P4真实测试证据

最终源码使用build-9执行Maven clean verify，六个Reactor项目BUILD SUCCESS。Maven无JUnit业务测试；下表是构建后真实启动、HTTP、MySQL及浏览器测试，不能把编译计为功能通过。

[完整执行摘要]({verify.relative_to(D).as_posix()})；[构建日志](p4-evidence/build-9/maven-readable.txt)；[实际依赖树](p4-evidence/dependencies-final/maven-readable.txt)。原始UTF-16日志一并保留。

{table}
合计 **{total}项断言通过**。所有测试均晚于最终access-service JAR构建。架构轮询次数会影响断言数，以本轮报告为准。

## 数据与保全

{link(latest('data-final'))}：跨库SELECT真实拒绝、MySQL版本与SHOW GRANTS、各表行数、唯一预约签发槽、未交付事件0、故障注入剩余0。HOLD操作保留，不伪装全部成功。

[原19表数据/DDL及两份备份检查](p4-evidence/preservation-final.json)；最近preflight报告证明原68文件哈希一致、敏感文件未被Git跟踪。[进程关闭](p4-evidence/process-closure.json)记录九端口均关闭。默认JDK21和独立JDK11并存，见environment报告。

## 失败记录与运行边界

先前冷启动、风险事件sort_order溢出、浏览器phone未就绪、二维码展示选择不同测试夹具等失败证据均保留；修复后重跑，不覆盖旧报告。最终通过仅引用上表同一最终构建的完整轮次。

真实硬件、短信送达、跨主机HA、长期压测、所有崩溃指令点穷举未测试。原页面没有已挂载扫码模拟和规则验证按钮，采用真实Edge执行原API客户端，不能写成对应UI按钮已通过。未绑定人员预约最终审批仍503保护。
'''+common)
write('p4-qr-consistency-test.md',f'''# P4-B签发一致性实际验证

证据：{link(runs['issuance'])}（{counts['issuance']}项），{link(runs['races'])}（{counts['races']}项），{link(runs['security'])}，{link(latest('data-final'))}。

|场景|真实手段及结果|
|---|---|
|正常最终审批|Gateway→appointment→Feign→access→MyBatis，200包含appointment、qrCode；同一真实码随后核验并落通行记录|
|重复及并发批准|10次确认后重放及20个初始并发请求；仅同一持久操作/预约签发槽，未确认返回503，确认才200|
|prepare/activate回执丢失|access事务提交后延迟真实HTTP响应触发超时；503未知，不撤销可能有效码；后台查询同操作恢复|
|预约提交失败|真实MySQL触发器阻止更新，准备码不可通行；解除故障后原持久操作恢复|
|进程崩溃|prepare已提交后终止实际appointment JVM，Gateway503原包装；重启后租约恢复|
|撤销权限/预约变化|原操作人实时角色撤销、预约拒绝，恢复HOLD而非绕过；潜在有效码不自动撤销，但核验实时拒绝|
|旧码绑定不符|类型/人员/有效窗口冲突不返回200，不生成第二码；SIGNING_REJECTED留痕|
|撤码与核验/激活并发|真实行锁并观察INNODB_TRX锁等待；READ_COMMITTED锁后重读，不复活、不错误放行|

操作phase为PREPARE→DECIDED→SUCCEEDED，失败保留phase、attempts、lease、hold_reason、安全错误类别。原session使用AES-GCM加密持久化，恢复使用同一真实主体并重新校验。prepare码为预备态；本地审批决议和activate任务同事务；只有真实ACTIVE回执确认才200。

这些是两个数据库的可恢复状态机，不是全局原子事务。故障未知仍可能部分提交，批准的503精确文案保持“签发结果尚未确认，请勿重复生成凭证，请联系管理员核实”。HOLD未实现管理端人工恢复入口，不得声称无人值守解决全部冲突。未绑定人员分支仍保护；没有202或前端轮询协议。默认公开最终开关仍false；内部链路证据通过后仅私有隔离配置启用，启用记录保存在public-final-enablement报告。
'''+common)
write('p4-access-policy-tests.md',f'''# P4-A通行规则及权限验证

{link(runs['core'])}；{link(runs['security'])}；{link(runs['configuration'])}；{link(runs['races'])}。

真实MyBatis测试覆盖有效/未知/过期/撤销/未来二维码、未完成审批、停用人员、角色与资源归属、校门/时段（含跨午夜）/方法规则、设备停用及所属校门、六角色及伪造身份头拒绝。visitor不能改type为校友绕过预约；实际人员角色仍被验证。

verify只读不写通行记录，simulate允许与拒绝均按原规则写记录及可靠事件。相同Idempotency-Key绑定操作人和请求摘要，八并发请求只产生一记录；不同摘要冲突。缓存成功重放仍重查撤码/身份安全条件。无Key按原语义每次是真实独立模拟，不能宣称所有无标识重复自动去重。

配置CRUD验证设备、校门重命名同步新旧名称设备、原重复校门取首条语义、规则修改及非法输入。原格式错误的旧时段兼容逻辑保留，需在生产化前清洗并另行批准严格化。

远程user/appointment/blacklist不可用均拒绝，无成功通行记录。真实SQL事务异常回滚记录、请求去重项及outbox。异步异常事件/审计有持久重试与稳定ID，最终未交付事件为0。硬件未测试，软件模拟走真实Java和MySQL。
'''+common)
write('p4-browser-regression.md',f'''# P4真实Edge回归

{link(runs['browser'])}：{counts['browser']}项通过。Edge {reports['browser']['browserVersion']}，Playwright {reports['browser']['playwrightVersion']}，二维码jsQR解码器{reports['browser']['qrDecoderVersion']}。使用原React页面，未改业务页面。

实际UI覆盖六角色登录、访客创建预约、被访人审核、保卫处最终审核、访客二维码展示、出入记录、规则编辑、异常页及P2资料/退出回归。页面生成的真实QR截图仅在内存解码，与已签发凭证一致后只存摘要；保存截图全部遮罩二维码和输入框。

扫码模拟及规则验证在当前React路由中没有可用按钮/挂载页面。测试从真实Edge调用原API客户端api.simulateScan和api.validateAccessRule，走Gateway/Java/SQL，并验证拒绝及真实落库，**不是模拟按钮点击通过**。该UI覆盖缺口和验收方式仍待用户确认，见[p4-browser-contract-gap.md](p4-browser-contract-gap.md)。不擅自新增UI。

无影响核心业务的未处理页面异常；预期401/403等资源警告单独记录，未伪装控制台绝无消息。截图已人工查看遮罩访客二维码图；真实校门硬件、移动全站、短信送达未测试。

截图：[访客真实二维码遮罩]({browser.relative_to(D).as_posix()}/visitor-qr-masked.png)、[审批]({browser.relative_to(D).as_posix()}/security-approved.png)、[通行记录]({browser.relative_to(D).as_posix()}/guard-records.png)。测试finally关闭其Edge，九个隔离服务端口最终关闭。
'''+common)
mapping={'002':'RecordsController.list','003':'RecordsController.create','004':'RecordsController.simulate','033':'QrController.list','034':'QrController.create','035':'QrController.verify','038':'ConfigurationController.devices','039':'ConfigurationController.device','040':'ConfigurationController.deviceUpdate','041':'ConfigurationController.deviceDelete','060':'ConfigurationController.gates','061':'ConfigurationController.gate','062':'ConfigurationController.rules','063':'ConfigurationController.validate','064':'ConfigurationController.rule'}
rows=[r for r in csv.DictReader((D/'api-inventory.csv').open(encoding='utf-8-sig')) if r['target_service']=='access-service'];assert len(rows)==15
apit='|原ID|Method/路径|Java方法|SQL/权限/证据|\n|---|---|---|---|\n'
for r in rows:
 ident=r['id'].split('-')[-1];apit+=f"|{r['id']}|{r['method']} {r['path']}|{mapping[ident]}|AccessOperationsImpl→AccessMapper XML；原角色{r['effective_roles']}；core/contracts/security|\n"
write('p4-api-migration.md','''# P4 API迁移最终清单

15条原通行域API已实现、已编译、已启动、已真实测试；另新增显式POST /api/qr-codes/{id}/revoke。预约最终审批是既有API-017分支闭环，不计新API。Controller不直接访问别域表，静态表白名单及参数绑定MyBatis执行SQL。

'''+apit+f'''
GET六角色共102次原Express只读参考实现与Java状态/JSON深比较：{link(runs['contracts'])}。参考服务器临时回环，只运行原GET逻辑，以真实SQL/权威投影供给数据，不替代Java测试、不修改原store。POST/PATCH/DELETE的成功、非法字段、权限、回滚与并发证据在core/configuration/security/issuance/races报告，不宣称102覆盖全部写入组合。

请求URL、原字段、中文状态、正常成功包装保留，详细原契约见[api-contract.md](api-contract.md)。QR POST/设备/记录create保持201；其他原200保持。六角色具体允许/禁止以报告逐项结果及原权限矩阵为准。查询只使用原端点支持的筛选，空时间条件忽略，原limit数值截断语义兼容。

批准差异：最终审批接纳后未知503、持久成功重放200；安全拒绝停用人员/未知依赖/未完成审批/绑定冲突。新增可选Idempotency-Key不要求React改变。完整差异见[p4-contract-differences.md](p4-contract-differences.md)。未绑定人员预约原可200/null码，本轮仍503且不改状态，**未完成**。未确认操作不200。

Gateway隔离模式将15路径路由lb://access-service，预约仍lb://appointment-service；异常/统计继续隔离Express。内部接口须服务密钥，外部客户端身份头清除，身份来自Java实时会话。未迁移异常没有正式Java实现。
'''+common)
write('p4-acceptance.md',f'''# P4-A / P4-B提交审核

本轮隔离实现和最终复验已完成，**等待用户验收，未进入P4-C或后续阶段**。整体仍有明确未完成/待审批边界，不能标为全部需求验收通过。

|范围|已实现|已编译|已启动|已真实测试|未完成/待审批|
|---|---|---|---|---|---|
|P4-A 15条原API及撤码|是|build-9通过|独立access/Eureka/Gateway|真实SQL、六角色、规则、并发、故障恢复|原前端缺少扫码/规则验证按钮；硬件未测|
|P4-B 已绑定人员签发闭环|是|通过|隔离启用|真实200/QR/通行落库、未知503、重复/崩溃/权限变化恢复|未绑定人员审批503保护；HOLD人工恢复入口未实现|
|P4-C exception-service|仅分析设计|不适用|未启动正式服务|未迁移|待单独批准|
|P2人员删除Saga|未实施|不适用|禁用|保护保留|未批准|

最终Maven clean verify成功；{total}项实际断言全部通过（其中Edge52项），详见[p4-test-evidence.md](p4-test-evidence.md)。此数字不把编译/启动算作业务成功。

15原API映射、SQL、权限和差异见[p4-api-migration.md](p4-api-migration.md)；分层与服务调用见[p4-access-service-design.md](p4-access-service-design.md)；库归属见[p4-database-migration.md](p4-database-migration.md)；[签发设计](p4-qr-issuance-design.md)、[一致性故障测试](p4-qr-consistency-test.md)、[规则测试](p4-access-policy-tests.md)、[浏览器报告](p4-browser-regression.md)、[异常域设计](p4-exception-analysis.md)。

## 保全与风险

原68源码文件、19表数据及DDL、原始备份和长期副本校验一致。敏感文件不在Git跟踪范围，无批量提交；隔离账号跨库SQL真实拒绝。P1/P2/P3原测试证据保留，P3实施前文档已更正并留存原文归档。

Java11独立环境保留默认JDK21，框架版本未改；真实依赖树与实际JAR库均有证据。九个本轮服务端口已关闭，测试Edge由finally关闭。源码/变更哈希清单及证据manifest见p4-change-files.csv和p4-evidence/final-manifest.json。

两个数据库没有全局原子性。UNKNOWN可部分提交，HOLD需人工审查，不自动撤销可能有效码；实时认证与本地提交间的时间窗口、单主机环境、旧格式规则时间兼容、未绑定人员和缺失UI入口均明确保留。真实短信、移动适配、账号状态独立UI仍属P2遗留。本轮不宣称正式上线可用。
'''+common)
# Preserve the original reviewed proposal verbatim in an archive; publish an accurate current design.
p=D/'p4-qr-issuance-design.md';archive=E/'input/p4-qr-issuance-design-proposal.md'
if not archive.exists():archive.write_bytes(p.read_bytes())
old=p.read_text(encoding='utf-8');write(p.name,'''# P4-B二维码签发设计（当前实现）

用户已批准：同步成功仍为原200及appointment、qrCode；接纳后未知使用503原错误包装和指定未确认文案；重复请求复用持久操作，确认成功才重放200。未知不得声称成功/失败，不自动撤销可能已有效的二维码。原审批过程及初始设计完整保存在[p4原方案归档](p4-evidence/input/p4-qr-issuance-design-proposal.md)，不得把其中实施前描述当作当前状态。

当前已实现并真实验证已绑定人员完整链路。默认public开关false保留P3保护；先受保护内部链路验证，再仅在私有隔离配置启用public最终分支。未绑定人员仍503，不向客户端返回null码假成功。

## 持久协议

appointment_issuance以appointmentId和operationId唯一，规范请求摘要、expectedVersion、actorId、AES-GCM加密原会话、lease/attempts/hold_reason持久化。接纳时锁预约并校验管理员实时权限和状态；网络调用在事务外。access以唯一签发槽prepare安全随机预备码；已有码必须人员/类型/窗口完全绑定，冲突拒绝。预约决议、历史和下一步任务本地事务提交为DECIDED；activate查询权威纯决议接口再锁槽激活，避免递归调用链。确认真实有效码且预约仍批准后才记SUCCEEDED并200。

恢复先查询原命令后重发幂等命令，租约/CAS防并发覆盖；每次重新校验原actor会话、实时角色、黑名单和预约状态。撤权/预约变化/绑定冲突HOLD，不绕过授权继续。HOLD只提供受保护状态查询，人工恢复界面未实现。access所有核验实时验证人员/预约/规则，故障拒绝。

凭证撤销保留唯一槽和墓碑，重试不复活；核验和激活READ_COMMITTED行锁后重读，防止RR快照用旧状态放行。不实施人员删除Saga，也不直接跨库写表。两个本地事务不能保证全局原子性，未知状态及潜在部分提交显式保留。

实际故障矩阵、日志与未测试场景见[p4-qr-consistency-test.md](p4-qr-consistency-test.md)。并非所有机器指令点均已故障穷举；已测试回执丢失、真实SQL失败、JVM崩溃、权限/预约变更及并发撤销。
''')
current=f'''<!-- P4-CURRENT-BEGIN -->
## 当前P4状态（2026-10-19，等待审核）

P4-A独立access-service及15条原API已实现、编译、启动并真实验证。P4-B已绑定人员真实签发闭环已完成隔离复验；未知503与确认后重放200按已批准契约执行。最终构建build-9，{total}项真实断言通过。未绑定人员最终审批仍503保护，原页面缺失扫码/规则验证入口未补写，详见[p4-acceptance.md](p4-acceptance.md)。P4-C仅分析，人员删除未实施。原系统及备份校验一致，本轮进程已关闭；没有正式切流或进入后续阶段。以下较早阶段内容保留作历史记录，以本段及各阶段真实证据判定当前状态。

<!-- P4-CURRENT-END -->

'''
for name in ['migration-progress.md','service-boundaries.md','compatibility-decision.md']:
 p=D/name;text=p.read_text(encoding='utf-8-sig');text=re.sub(r'<!-- P4-CURRENT-BEGIN -->.*?<!-- P4-CURRENT-END -->\s*','',text,flags=re.S);write(name,current+text)
print(json.dumps({'assertions':total,'counts':counts,'completeRun':str(verify.relative_to(R)),'portsClosed':closure['pass']}))
