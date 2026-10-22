"""Consolidate completed real P1 runs; refuse to mark acceptance if any required test fails."""
from pathlib import Path
import csv,datetime,hashlib,json,re,xml.etree.ElementTree as ET,zipfile
ROOT=Path(__file__).resolve().parent.parent
DOC=ROOT/'docs';EV=DOC/'p1-evidence'
def load(p):return json.loads(p.read_text(encoding='utf8'))
def write(p,text):p.write_text(text.strip()+'\n',encoding='utf8')
def logtext(p):
 raw=p.read_bytes();return raw.decode('utf-16') if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else raw.decode('utf8',errors='replace')
runs=[(p,load(p)) for p in sorted(EV.glob('resume-*/live-results.json')) if 'mode' in load(p)]
baseline=next((p,d) for p,d in runs if d['mode']=='diagnosis' and d.get('overall')=='failed')
control=next((p,d) for p,d in runs if d['mode']=='diagnosis' and d.get('overall')=='pass')
final=next((p,d) for p,d in reversed(runs) if d['mode']=='full')
fp,data=final
required=['layeredDiscovery','feignRibbonGateway','hystrixOutage','hystrixRecovery','eurekaNodeFailureRecovery','mybatisHttpCrud','gatewayRoutes']
assert data.get('overall')=='pass' and data['allOwnedProcessesStopped']
assert all(data['tests'][k]['pass'] for k in required)
preserve=load(EV/'resume-preservation.json')
assert preserve['originalDatabaseUnchanged'] and preserve['labIsolation']['pass']
original=list(csv.DictReader((DOC/'original-file-hashes.csv').open(encoding='utf-8-sig')))
changed=[r['file'] for r in original if hashlib.sha256((ROOT/'campus-access-web'/r['file']).read_bytes()).hexdigest()!=r['sha256']]
assert not changed
oldtree=(EV/'dependency-tree.txt').read_text(encoding='utf8')
newtree=logtext(EV/'resume-dependencies/dependency-tree.log')
assert 'BUILD SUCCESS' in newtree
coordinates=lambda text:set(re.findall(r'[\w.-]+:[\w.-]+:jar:[\w.:-]+:(?:compile|runtime|test|provided)',text))
assert coordinates(oldtree)==coordinates(newtree),'Dependency versions changed'
write(EV/'resume-dependencies/dependency-tree.txt',newtree)
build=logtext(EV/'resume-build-peer-fix-verified/maven-verify.log');assert 'BUILD SUCCESS' in build
tests=[]
for p in (ROOT/'experiments/p1-legacy-lab').rglob('target/surefire-reports/TEST-*.xml'):
 node=ET.parse(p).getroot();tests.append(dict(node.attrib))
assert sum(int(t['tests']) for t in tests)==2 and all(int(t['errors'])==int(t['failures'])==int(t.get('skipped',0))==0 for t in tests)
compiled=[]
oldlibs=list(csv.DictReader((EV/'runtime-dependencies.csv').open(encoding='utf-8-sig')))
for module in ['eureka-server','provider-service','consumer-service','gateway-service']:
 jar=ROOT/f'experiments/p1-legacy-lab/{module}/target/{module}-0.1.0-SNAPSHOT.jar'
 with zipfile.ZipFile(jar) as z:names={n.split('/')[-1] for n in z.namelist() if n.startswith('BOOT-INF/lib/') and n.endswith('.jar')}
 assert names=={r['runtimeJar'] for r in oldlibs if r['module']==module}
 compiled.append({'module':module,'sha256':hashlib.sha256(jar.read_bytes()).hexdigest(),'runtimeLibraries':len(names)})
summary={'p1RuntimeAcceptance':'pass','userReviewPending':True,'p2Started':False,'runs':{'baseline':str(baseline[0].relative_to(ROOT)),'control':str(control[0].relative_to(ROOT)),'full':str(fp.relative_to(ROOT))},'allRequiredTestsPassed':required,'originalFilesChecked':len(original),'changedOriginalFiles':changed,'originalDatabaseUnchanged':True,'labIsolation':preserve['labIsolation'],'dependencyCoordinatesUnchanged':True,'coordinateCount':len(coordinates(newtree)),'runtimeLibraryFilenamesUnchanged':True,'compiledArtifacts':compiled,'junitSuites':tests,'allOwnedProcessesStopped':True}
write(EV/'resume-summary.json',json.dumps(summary,ensure_ascii=False,indent=2))
write(EV/'resume-build-summary.txt','\n'.join(line for line in build.splitlines() if any(k in line for k in ['Tests run:','SUCCESS [','BUILD SUCCESS','Total time:','Finished at:'])))
balance=data['tests']['feignRibbonGateway'];h=data['tests']['hystrixOutage'];recovery=data['tests']['hystrixRecovery'];crud=data['tests']['mybatisHttpCrud']
with (EV/'resume-ribbon-20.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=['index','status','instanceId','port','fallback']);w.writeheader();w.writerows({k:r.get(k) for k in w.fieldnames} for r in balance['responses'])
peer=data['tests']['layeredDiscovery']['converged']['registries']
table='|注册中心|appName|instanceId|hostName|ipAddr|port|status|vipAddress|lastRenewalTimestamp（原值）|\n|---|---|---|---|---|---|---|---|---|\n'
for port,view in peer.items():
 for row in view['normalized']:table+='|'+str(port)+'|'+'|'.join(str(row[k]) for k in ['appName','instanceId','hostName','ipAddr','port','status','vipAddress','lastRenewalTimestamp'])+'|\n'
write(DOC/'p1-ribbon-diagnosis.md',f'''# P1 Ribbon 实例发现诊断与验证

结果：已修复并通过；版本未变，未硬编码提供者列表。所有原始失败证据保留。

## 根因与因果链

根因在Eureka服务端peer身份判定，不是Ribbon算法或依赖版本。原注册中心都启用prefer-ip-address=true，实际hostName都变成127.0.0.1。Eureka1.10.14的PeerEurekaNodes.isThisMyUrl默认调用isInstanceURL；该实现比较URL主机名与实例hostName，**不比较端口**。18761因此把127.0.0.1:18762误认作自身，从peer列表移除；18762指向localhost:18761则没有被移除，形成单向复制。

注册中心启动同步曾短暂带入另一实例，所以“两端曾查到两个UP”不等于持续双向复制。18811只向18761续约，18762得不到其持续续约，短租约放大丢失；消费者从缺失视图取缓存后，Ribbon只能使用18812。旧失败运行未记录消费者实际选中的注册节点，不能声称已精确复原旧运行的每次拉取；本轮服务端缺失及peer误排除已由对照和本机字节码确定。

证据：p1-evidence/peer-nodes-bytecode.txt，isThisMyUrl/isInstanceURL；未修复对照的registry-1日志“The replica size seems to be empty”；分层轮询中18761仍有两实例、18762只剩18812。第一个丢失18811的环节是18762服务端注册视图，后续缓存和Ribbon反映其结果，ServerListFilter不是本例根因。

## 对照结果

|运行|peer配置|续约/租约|结果|
|---|---|---|---|
|历史首次运行|两个节点优先IP|3秒/9秒|采样20次均18812，失败|
|本轮未修复诊断|同上|3秒/9秒|{len(baseline[1]['polls'])}次分层记录，超时；未进入采样，失败证据{baseline[0].relative_to(DOC).as_posix()}|
|修复对照|仅注册中心prefer-ip-address=false，保留localhost与127.0.0.1两种身份|3秒/9秒|连续12秒所有发现层双实例；20次命中{control[1]['tests']['feignRibbonGateway']['instanceCounts']}，通过|
|完整验收|相同修复，所有版本不变|10秒/90秒（运行参数）|20次命中{balance['instanceCounts']}，熔断与重启等全部通过|

原9秒租约不变时修正身份即可通过，因此不是靠加长sleep或单纯延长租约掩盖问题。完整测试采用90秒租约，是为故障/重启实验保留合理时间。

## 修改与诊断安全

- eureka-server/application.properties仅改变注册中心prefer-ip-address；不修改业务提供者身份、不修改hosts文件。
- 新RegistryDiagnostics输出实际peer URL、自节点误判结果及实时注册表。两端现在peerMisclassifiedAsSelf=false，分别有对端URL。
- 新DiscoveryDiagnostics输出Spring DiscoveryClient、本地Eureka Application/VIP、Ribbon源列表/可用列表、过滤器、规则和刷新时间；不强制refresh、不替换ServerList。
- 诊断只在lab-diagnostics profile及127.0.0.1绑定下启用，并检查请求源；不输出配置全集/凭证，不通过Gateway暴露。
- p1-run-lab.py按超时轮询所有层，必须连续12秒稳定后才采样；每次响应在断言前落盘，超时保留各层与日志并退出。

## 修复后注册信息

{table}
原始续约时间戳按Eureka响应保留，不据缓存字段推断准确壁钟续约时刻；RegistryDiagnostics另提供实时注册表用于核对。

## 消费者和Ribbon

实际LoadBalancer={balance['ribbonAfterSamples']['loadBalancerClass']}；策略={balance['ruleClass']}；ServerList={balance['ribbonAfterSamples']['serverListClass']}；Filter={balance['ribbonAfterSamples']['serverListFilterClass']}。源列表、Spring/Eureka缓存和Ribbon实际可用列表均含18811/18812。获取时间、缓存刷新事件、registryFetchAgeMs及Ribbon刷新时间均在逐轮JSON，不使用固定sleep判定成功。

20次逐项状态、真实instanceId/port见[p1-evidence/resume-ribbon-20.csv](p1-evidence/resume-ribbon-20.csv)。Gateway→消费者→按服务名OpenFeign→Eureka/Ribbon→提供者；没有绕过Ribbon轮询端口。所有20次HTTP200且fallback=false，两实例均真实处理请求，不以严格10:10作为判定条件。

完整证据：[{fp.relative_to(DOC).as_posix()}]({fp.relative_to(DOC).as_posix()})。本轮最终对照信息见[p1-evidence/resume-summary.json](p1-evidence/resume-summary.json)。
''')
probe=next(s for s in recovery['observations'] if s['state']=='OPEN_PROBE_IN_FLIGHT')
write(DOC/'p1-hystrix-test.md',f'''# P1 Hystrix 真实故障、熔断与恢复

结果：通过。先通过Ribbon双实例分流，随后真正停止18811/18812两个自建提供者进程；没有forceOpen、模拟网络结果或手工调用markSuccess/allowRequest。

|阶段|真实证据|
|---|---|
|正常|20次Gateway→Feign调用均200、fallback=false，随后state=CLOSED|
|远程失败|累计FAILURE={h['opened']['totalFAILURE']}，TIMEOUT={h['opened']['totalTIMEOUT']}；逐次HTTP响应和断路器快照保留|
|fallback|响应明确fallback=true；FALLBACK_SUCCESS={h['opened']['totalFALLBACK_SUCCESS']}。HTTP200仅代表实验降级包装，不等于真实业务成功|
|真正开路|open=true/state=OPEN，健康窗口requests={h['opened']['requests']}、errors={h['opened']['errors']}|
|短路|SHORT_CIRCUITED增加到{h['shortCircuitState']['totalSHORT_CIRCUITED']}，没有远程执行也返回fallback；此项与普通远程失败分开|
|允许探测|sleepWindow={probe['sleepWindowMs']}ms；实际探测门从{h['opened']['openedOrLastProbeAtEpochMs']}推进到{probe['openedOrLastProbeAtEpochMs']}|
|单探测在执行|open=true、并发执行={probe['concurrentExecutions']}，真实提供者已恢复，identity仅在恢复实验配置600ms延迟以观察过程|
|成功关闭|探测响应200/fallback=false；随后open=false/state=CLOSED，errors={recovery['closed']['errors']}|
|持续恢复|其后4次请求均200且fallback=false|

## 半开状态的准确含义

实际Hystrix1.5.18实现只有AtomicBoolean circuitOpen和AtomicLong circuitOpenedOrLastTestedTime，没有独立HALF_OPEN枚举。此处“半开”指sleepWindow后由真实门控允许的单次探测。OPEN_PROBE_IN_FLIGHT是**诊断描述**，并非伪造的框架原生枚举：其证据同时要求真实open标志、推进的原子时间门、执行中计数和随后远程成功/断路器关闭。诊断只读私有时间门，不改变任何状态，代码和本机JAR已核对。

失败、降级、真正开路、短路和成功恢复分别有指标；不能只看fallback判断。计数以实际指标采集起点及滚动窗口为准，不当作全生命周期业务统计。探测门、各次响应、错误计数和恢复轮询见完整运行JSON tests.hystrixOutage/tests.hystrixRecovery，原始本轮文件：[{fp.relative_to(DOC).as_posix()}]({fp.relative_to(DOC).as_posix()})。

限制：阈值3次/50%、3秒休眠窗和600ms观测延迟是本机实验设置，不是生产参数；私有字段读取绑定已锁定1.5.18，只放在实验诊断中。
''')
write(DOC/'p1-acceptance.md',f'''# P1 运行验收完成，等待用户审核

2026-10-19：本轮已通过所有要求的隔离实验，**未进入P2**。此前失败证据未覆盖；用户审核尚待完成。当前全部自建JVM已停止。

## 实现、编译、启动与测试分别记录

|项目|已实现|已编译|已启动/执行|已测试通过|未完成/边界|
|---|---|---|---|---|---|
|长期备份/源码恢复/数据库恢复|是|不适用|是|68源码文件、19表562行恢复；本轮备份散列再核对一致|同盘本机副本，不是异机灾备|
|Git/.gitignore|是|不适用|是|先前新初始提交2ad1ddb；不是历史恢复|本轮未修改Git或批量提交原代码|
|四模块Java原型|是|是|六个独立JVM|Maven verify成功，JUnit2项0失败|仅合成接口，不是正式业务迁移|
|双Eureka及服务发现|是|是|18761/18762|双向peer、两端双实例、缓存与Ribbon分层持续核查|本机进程级实验|
|Ribbon|是|是|18811/18812|20次{balance['instanceCounts']}；ZoneAvoidanceRule；真实Ribbon Bean|未要求严格比例|
|OpenFeign/Gateway|是|是|18821/18800|按服务名调用、统一入口、provider/consumer/circuit路由、诊断不经网关|没有连接原68API|
|Hystrix|是|是|是|实际失败/fallback/开路/短路/半开探测/成功恢复|原生没有HALF_OPEN枚举，详见专门报告|
|Eureka单节点故障恢复|是|是|真正停止并恢复18761|故障期间6次调用正常、18811新进程仅注册18762、18761恢复后各层再次双实例|非物理机/网络分区HA|
|MyBatis|Entity/Dao/XML/Service/Controller|是|真实隔离MySQL|JUnit+HTTP增查改删、400/404、实例重启后持久化、另一实例读到更新|只使用lab_items合成表|
|数据库隔离|是|不适用|是|Java同账号仅实验库；读原库/恢复库均拒绝|无真实业务数据迁移|
|原系统保全|保持原样|不适用|只读核查|68文件未变、19原表数据/DDL未变、备份未覆盖|未修改React/Express/API/权限|

## 最终本机实验版本

Temurin11.0.32.1+1，Maven3.9.11；Boot2.3.12.RELEASE / Framework5.2.15.RELEASE；CloudHoxton.SR12；Cloud Netflix/OpenFeign/Gateway2.2.9.RELEASE；Eureka1.10.14；Ribbon2.3.0；Hystrix1.5.18；Feign10.12；MyBatis Starter2.1.4/Core3.5.6/Spring2.0.6；Connector/J8.0.25；MySQL8.0.40。与此前依赖树坐标集合及运行库文件名逐项相同，未升级降级。传递依赖中的LoadBalancer未替代Ribbon，未使用Resilience4j。

## 根因、变更和证据

根因是注册中心优先IP导致Eureka按主机名误排除peer，从而单向复制与远端租约过期，不是Ribbon版本冲突。仅注册中心改prefer-ip-address=false，并增加本地只读分层诊断、实际Hystrix指标和有超时的等待/稳定性门槛。原9秒租约对照亦通过，完整故障测试使用10秒续约/90秒租约。

- [Ribbon诊断、前后列表和20次采样](p1-ribbon-diagnosis.md)
- [Hystrix故障、半开探测与恢复](p1-hystrix-test.md)
- [本轮完整运行JSON]({fp.relative_to(DOC).as_posix()})
- [本轮依赖树](p1-evidence/resume-dependencies/dependency-tree.txt)
- [验收/编译/保全汇总](p1-evidence/resume-summary.json)
- [原库/备份/测试账号隔离](p1-evidence/resume-preservation.json)
- 本轮文件清单：p1-resume-file-manifest.csv；命令/包括失败构建的结果：test-evidence.md。

## 未完成及风险

P1技术运行项已通过，用户审核尚待完成；P2–P6均未开始。旧组件维护/安全风险仍在，只用于隔离课程实验；短窗口和租约为实验参数。HA是同机进程故障而非主机/网络故障，68个正式API的Java兼容性、六角色回归、密码迁移、正式数据迁移尚未实现。诊断profile不应带入正式业务部署。原生成脚本不能覆盖已修正工程。**本轮结束于P1，等待审核。**
''')
write(DOC/'compatibility-decision.md','''# P1版本兼容性决策：本机实验通过

用户要求的LEGACY_STRICT已完成真实Maven解析、编译、JUnit、六JVM启动和完整故障实验；未替换Ribbon/Hystrix。具体版本见p1-acceptance.md。此结论只覆盖本机隔离课程原型，不表示旧版本仍受官方维护或已经具备生产安全性。

Boot2.3.12.RELEASE + CloudHoxton.SR12的BOM及所有原定版本保持不变。本轮新依赖树与旧依赖树坐标集合完全一致，四个可执行JAR中的运行库文件名集合也相同；证据为p1-evidence/resume-summary.json和resume-dependencies/dependency-tree.txt。不能仅凭编译判兼容，本轮还实际通过双向Eureka、Ribbon双实例、Feign/Gateway、Hystrix开路/短路/探测/恢复以及MyBatis真实MySQL CRUD。

上轮Ribbon失败根因是Eureka peer身份配置，不是版本组合：prefer-ip-address=true使节点127.0.0.1误匹配对端；Eureka1.10.14按主机名排除自身，不看端口。修复只涉及实验注册中心prefer-ip-address=false；没有添加固定提供者列表。原9秒租约修复对照也通过。

本机JAR反汇编同时确认Hystrix1.5.18无独立HALF_OPEN枚举，采用真实单探测门控验证，见p1-hystrix-test.md。现代替代路线没有启用。旧研究/首次失败的完整文件保存在p1-evidence/resume-input；原始失败JSON与日志仍保留。

最终是否批准用于正式课程业务迁移，仍由用户审核P1后决定；当前不开始P2、不部署外网、不改原业务系统。
''')
write(DOC/'migration-progress.md',f'''# 迁移进度

2026-10-19：P0已审核，P1技术运行验收项全部通过，等待用户审核；**P2未开始**。

|项|已实现|已编译|已启动|已测试通过|未完成|
|---|---|---|---|---|---|
|独立四模块原型|是|是|六JVM|Maven verify + JUnit2项|正式业务服务未迁移|
|Eureka双节点/故障恢复|是|是|是|双向复制、单节点停止、新提供者注册、节点恢复|非物理机HA|
|Ribbon/Feign/Gateway|是|是|是|分层门槛、20次双实例、正常/故障路由|原68业务API未迁移|
|Hystrix|是|是|是|失败、fallback、真实开路/短路、单探测恢复|生产阈值未设计|
|MyBatis实验库|是|是|是|JUnit与HTTP CRUD、重启持久化、账号隔离|正式数据迁移未开始|
|备份恢复/原系统保全|是|不适用|是|68原文件/19原表/备份散列不变|异机备份不在本轮范围|
|P2–P6|否|否|否|否|等待逐阶段授权|

Ribbon历史失败已由注册中心peer身份配置修复，所有依赖版本保持不变。完整状态、证据和风险见[p1-acceptance.md](p1-acceptance.md)。所有实验JVM已停止，不自动进入P2。
''')
append=f'''

## P1续测完整结果（当前结论，前文为历史）

本轮用户授权续测；版本保持。未修复基线在100秒分层轮询后失败且没有采样；已保留{baseline[0].relative_to(DOC).as_posix()}及日志。注册中心prefer-ip-address=false修复后，同样9秒租约通过12秒稳定门槛与20次双实例采样。完整90秒租约测试全部通过，运行文件{fp.relative_to(DOC).as_posix()}。

实际命令：

|命令|结果|
|---|---|
|完整读取指定7文件、全实验Java/配置/POM和原依赖树|完成；未发现适用AGENTS.md|
|本机javap核对Ribbon/Eureka/Hystrix方法与字节码|完成；peer-nodes-bytecode.txt记录host-only自节点排除|
|p1-maven.ps1 -Task verify -EvidenceDirectory docs/p1-evidence/resume-build|成功，24.721秒，JUnit2项通过|
|同上输出resume-build-probe|成功，23.057秒，JUnit2项通过；按真实Hystrix实现修正探测指标|
|p1-run-lab.py --mode diagnosis --lease-seconds 9 --timeout 100（未修复）|100秒超时，保存每层；108轮记录；所有自建JVM停止|
|verify输出resume-build-peer-fix|失败6.203秒：新诊断误用getPeerEurekaNodeUrls，已保留失败日志；未更换依赖|
|verify输出resume-build-peer-fix-verified|getPeerNodesView修正后成功23.606秒，JUnit2项通过|
|p1-run-lab.py --mode diagnosis --lease-seconds 9 --timeout 100（修复）|通过；20次{control[1]['tests']['feignRibbonGateway']['instanceCounts']}|
|p1-maven.ps1 -Task dependencies -EvidenceDirectory docs/p1-evidence/resume-dependencies|成功5.356秒；坐标与原树相同|
|p1-run-lab.py --mode full --lease-seconds 90 --timeout 150|通过；20次{balance['instanceCounts']}；真实熔断/恢复、HA、HTTP CRUD/持久化|
|node docs/p1-check-preservation.mjs docs/p1-evidence/resume-preservation.json|通过；19原表数据/DDL未变；原备份及长期副本未变；实验账号不能读原库/恢复库|
|python docs/p1-resume-report.py|生成本轮总结并断言全部必要用例通过、依赖未变和68原文件未变|

当前用例证据：Hystrix真实失败{h['opened']['totalFAILURE']}次、TIMEOUT={h['opened']['totalTIMEOUT']}、open=true、SHORT_CIRCUITED计数上升，实际单探测后关闭，后4次正常；Eureka18761停止时6次请求正常，新18811进程仅注册存活18762且lastDirtyTimestamp晚于新进程启动，恢复18761后分层再次通过；MyBatis HTTP201/200/204/404/400及跨实例、重启持久化通过。

本轮未修改原React/Express/68API/六角色规则，未执行旧初始化或修复脚本，未迁移业务。所有自建JVM停止。原始失败、未修复对照及编译错误都保留；最终技术验证通过不抹去这些历史。最终限制和用户审核状态见p1-acceptance.md。
'''
existing=(DOC/'test-evidence.md').read_text(encoding='utf8').split('## P1续测完整结果（当前结论，前文为历史）')[0]
write(DOC/'test-evidence.md',existing+append)
print(json.dumps({'fullAcceptance':'pass','counts':balance['instanceCounts'],'remoteFailures':h['opened']['totalFAILURE'],'probeObserved':True,'sourceFilesUnchanged':len(original),'dependencyVersionsUnchanged':True}))
