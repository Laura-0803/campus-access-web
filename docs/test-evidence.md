# P0 实际运行和测试证据

日期2026-10-19；工作区外层运行审计脚本，应用命令在内层campus-access-web执行。以下仅记录本次实际结果；旧dev日志没有当作本次运行证据。

|编号|实际命令/动作|结果与边界|
|---|---|---|
|P0-01|Get-Content -Raw -Encoding UTF8 Codex改造实施说明.md|完整读取规格；实际文件名已记录|
|P0-02|rg --files、rg --files --hidden -g AGENTS.md（排除依赖/构建目录）|源码清单完成；未找到AGENTS.md|
|P0-03|git rev-parse --show-toplevel；git status --short；git -C campus-access-web rev-parse --show-toplevel|均报not a git repository；外层.git为空。无法提供HEAD或Git差异|
|P0-04|node --version；npm --version|Node v24.18.0；npm.ps1受PowerShell执行策略拦截，未改策略|
|P0-05|npm.cmd --version|11.16.0，采用现有cmd入口成功|
|P0-06|java -version；mvn -version；python --version|Oracle JDK21.0.9；Maven3.9.11；Python3.10.8；不是Java业务启动证据|
|P0-07|python docs/p0-audit.py|62源文本、68路由、62封装、18表168字段、0未匹配封装；结果static-summary.json|
|P0-08|node docs/p0-runtime-check.mjs|57个JS/JSX语法解析通过；只读MySQL连接/全表读取成功，19表174列、6角色、10FK；结果database-live-summary.json|
|P0-09|npm.cmd run build -- --outDir "$env:TEMP/campus-p0-build-20261019"（沙箱）|失败spawn EPERM：esbuild子进程受限，不是业务测试失败|
|P0-10|同一build命令经审批在沙箱外重试|成功，Vite5.4.21，2476 modules，built in35.86s；产物仅临时目录，未覆盖项目dist|
|P0-11|python docs/p0-finalize.py|校验路由唯一性、封装覆盖、18表/6角色、源文件哈希；源ZIP完整性校验和数据库重复/孤儿计数；见p0-verification.json/database-quality-summary.json/backup-manifest.json|

成功构建摘要（来自本次输出）：

```text
vite v5.4.21 building for production...
✓ 2476 modules transformed.
index.html 0.55 kB
assets/index-BW6LbbYN.css 32.87 kB
assets/react-CdJNZNHW.js 164.10 kB
assets/index-BM8IfYJL.js 179.57 kB
assets/charts-B_zgwzcb.js 410.99 kB
✓ built in 35.86s
```

outDir不在项目内的提示为Vite正常警告；未使用emptyOutDir，不删除已有临时产物。没有安装或升级依赖。lockfile实际React18.3.1、React Router6.30.4、Express5.2.1、mysql2 3.22.5、qrcode1.5.4、Recharts2.15.4。

## 覆盖与未测试范围

- 静态：全部68路由和62封装、调用点、6角色有效权限、18张设计表与额外历史表/字段。57个JS/JSX全量语法解析，包括修复脚本，但未执行它们。
- 数据库：读取19表快照、字段/默认值/键/外键信息、角色账号数量、重复和孤儿引用计数，不输出用户名/手机号/密码/Token。源ZIP已testzip通过；数据库JSON备份未做恢复演练。
- 前端：生产构建通过。未打开浏览器、未执行六角色页面回归，不能据此承诺所有交互运行正常。
- 后端：未运行server/index.js、db:init、dev:full或修复脚本，防止启动自动改库；未请求登录/写接口，未执行68条API动态契约测试。
- 目标Java：未实现/未运行/未测试Eureka、Ribbon、Hystrix、OpenFeign、Gateway、MyBatis。P1才进行技术原型。

package.json无test脚本，未发现自有自动化测试目录/测试配置。规格T01–T16均为后续计划，尚未通过；T16中仅当前React构建子项通过，不把整个T16标绿。每个API的“P0静态核对”不能解释成HTTP响应测试通过。

每条API在CSV分配CONTRACT-001至CONTRACT-068，均为未来契约测试编号，当前没有对应已通过的测试代码。后续每条至少验证响应形状、成功/业务错误状态、未认证、允许角色与拒绝角色、本人/他人资源边界和持久化副作用。

## P1实际命令与结果（本次部分通过，未整体验收）

|编号|实际命令/动作|结果|
|---|---|---|
|P1-01|完整读取README/acceptance/compatibility/risks/boundaries/database/test/progress八文件|完成；未找到新增AGENTS.md|
|P1-02|python docs/p1-prepare.py|P0两份原备份SHA256符合清单，未覆盖；长期副本校验成功；临时目录恢复68个原文件并逐一比较通过|
|P1-03|icacls .private-backups/.p1-local /inheritance:r /grant:r ...|首次SID缺少星号，No mapping失败；改用*SID成功。临时源码恢复目录亦已限制当前用户|
|P1-04|git init；git add -- .gitignore；git -c user.name=Codex -c user.email=codex@localhost commit ...|成功建立新仓库和初始提交2ad1ddb；git ls-files仅.gitignore，无历史恢复|
|P1-05|Python urllib读取Adoptium API|沙箱连接拒绝；批准后Python TLS报FileNotFoundError；改用Windows Invoke-RestMethod成功，没有关闭TLS校验|
|P1-06|powershell -NoProfile -ExecutionPolicy Bypass -File docs/p1-install-jdk.ps1|官方Temurin ZIP下载、SHA256匹配、隔离解压成功；实际11.0.32.1+1。仅子进程使用，未setx|
|P1-07|node docs/p1-restore-db.mjs|沙箱读取受控目录EPERM；批准后成功。19表562行全字段恢复一致；实验用户读原库被拒绝；原库前后未变|
|P1-08|python docs/p1-generate-prototype.py|独立四模块代码生成成功，未改原应用|
|P1-09|powershell ... -File docs/p1-maven.ps1 -Task verify|成功，10:36；四模块JAR打包；MyBatisCrudTest 2测试，0失败/错误/跳过，真实MySQL实验库|
|P1-10|powershell ... -File docs/p1-maven.ps1 -Task dependencies|dependency:tree成功，1:53；完整依赖树已转UTF8存txt|
|P1-11|python docs/p1-export-evidence.py；python docs/p1-resolve-versions.py|真实JAR SHA256/嵌套依赖/Surefire报告导出成功，解析依赖树补齐精确版本|
|P1-12|python docs/p1-run-lab.py|启动6JVM；双Eureka注册/复制、实际Ribbon Bean、Gateway/Feign正常响应成功；随后分流断言失败，exit1，所有自建进程自动停止|
|P1-13|只读Select-String检查consumer/provider日志|Ribbon初始列表只有18812；消费响应21次均18812（含1预热+20采样），两个provider均实际启动；未调整配置或重跑|
|P1-14|python docs/p1-collect-runtime.py|首次Git中文路径GBK解码失败；修正导出工具为UTF8后成功，生成失败摘要与Git/68文件未变证据；未重新运行组件|
|P1-15|node docs/p1-check-preservation.mjs|成功：19原表最终数据/DDL散列与P1开始一致；P0原备份及长期副本散列均一致|
|P1-16|java -version（默认shell）|仍为Oracle21.0.9，未改变系统JDK21环境|
|P1-17|python -m py_compile新增Python工具；node --check恢复脚本|语法通过；不是业务/分流测试|
|P1-18|python -m py_compile docs/p1-*.py|Windows未展开通配符，命令失败Invalid argument；随后改为Python glob枚举6个脚本，逐个编译语法检查通过。未运行组件|

### 实际失败信息和观察边界

```text
AssertionError: Ribbon did not use both providers
DynamicServerListLoadBalancer ... current list of Servers=[127.0.0.1:18812]
Observed Feign response instance counts including readiness probe: {"18812": 21}
```

异常发生在采样断言，不是Maven依赖解析/编译错误。没有证明是Spring版本不兼容；缓存/租约收敛仍是假设。脚本未在断言前逐项持久化采样响应，已从实际消费者DEBUG响应日志保存21次实例计数；未伪造原始HTTP响应数组。此次没有重试以掩盖失败。

双Eureka证据是两端/eureka/apps/LAB-REGISTRY及LAB-PROVIDER的完整JSON快照（每端均两UP实例），提供者1只配置18761、提供者2只配置18762；证明注册发现及复制，不包括节点停机恢复。实际LoadBalancer Bean为org.springframework.cloud.netflix.ribbon.RibbonLoadBalancerClient；Feign代理com.sun.proxy.$Proxy84。Gateway请求/api/lab/call有实际路由匹配和成功响应日志。

Hystrix只完成代码、依赖、编译和消费者启动；没有实际停提供者测试熔断/降级/恢复。HTTP CRUD、重启持久化、单Eureka停机/恢复、Gateway独立provider路由测试也因提前停止而未执行。MyBatis的JUnit已实际CRUD和事务回滚，不把未执行HTTP项混标通过。

证据入口：p1-acceptance.md、p1-evidence/maven-summary.txt、compiled-artifacts.json、dependency-tree.txt、runtime-dependencies.csv、live-results.json、ribbon-failure-analysis.json、startup-and-routing.txt、preservation-check.json、git-and-source-check.json。原始JVM日志保存在忽略的.p1-local，Maven原始log本机保留且Git忽略；导出的txt/JSON/CSV不含数据库口令或业务行。


## P1续测完整结果（当前结论，前文为历史）

本轮用户授权续测；版本保持。未修复基线在100秒分层轮询后失败且没有采样；已保留p1-evidence/resume-20261019T054123425817Z-diagnosis/live-results.json及日志。注册中心prefer-ip-address=false修复后，同样9秒租约通过12秒稳定门槛与20次双实例采样。完整90秒租约测试全部通过，运行文件p1-evidence/resume-20261019T054859528641Z-full/live-results.json。

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
|p1-run-lab.py --mode diagnosis --lease-seconds 9 --timeout 100（修复）|通过；20次{'18811': 10, '18812': 10}|
|p1-maven.ps1 -Task dependencies -EvidenceDirectory docs/p1-evidence/resume-dependencies|成功5.356秒；坐标与原树相同|
|p1-run-lab.py --mode full --lease-seconds 90 --timeout 150|通过；20次{'18811': 11, '18812': 9}；真实熔断/恢复、HA、HTTP CRUD/持久化|
|node docs/p1-check-preservation.mjs docs/p1-evidence/resume-preservation.json|通过；19原表数据/DDL未变；原备份及长期副本未变；实验账号不能读原库/恢复库|
|python docs/p1-resume-report.py|生成本轮总结并断言全部必要用例通过、依赖未变和68原文件未变|

当前用例证据：Hystrix真实失败10次、TIMEOUT=0、open=true、SHORT_CIRCUITED计数上升，实际单探测后关闭，后4次正常；Eureka18761停止时6次请求正常，新18811进程仅注册存活18762且lastDirtyTimestamp晚于新进程启动，恢复18761后分层再次通过；MyBatis HTTP201/200/204/404/400及跨实例、重启持久化通过。

本轮未修改原React/Express/68API/六角色规则，未执行旧初始化或修复脚本，未迁移业务。所有自建JVM停止。原始失败、未修复对照及编译错误都保留；最终技术验证通过不抹去这些历史。最终限制和用户审核状态见p1-acceptance.md。

补充工具结果：最终保全Node脚本成功，但同一PowerShell命令的java -version重定向被Shell标为NativeCommandError，导致组合命令exit1；改用Python subprocess单独捕获后，Java实际exit0且默认版本仍21.0.9，见resume-default-jdk.txt。总结工具首次把归档resume-input中的旧运行误认成本轮数据，出现KeyError: mode；增加格式过滤后生成成功。这两项是证据导出问题，不是组件测试通过的依据，也未触发重跑或替换组件。
