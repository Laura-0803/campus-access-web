# P1 Ribbon 实例发现诊断与验证

结果：已修复并通过；版本未变，未硬编码提供者列表。所有原始失败证据保留。

## 根因与因果链

根因在Eureka服务端peer身份判定，不是Ribbon算法或依赖版本。原注册中心都启用prefer-ip-address=true，实际hostName都变成127.0.0.1。Eureka1.10.14的PeerEurekaNodes.isThisMyUrl默认调用isInstanceURL；该实现比较URL主机名与实例hostName，**不比较端口**。18761因此把127.0.0.1:18762误认作自身，从peer列表移除；18762指向localhost:18761则没有被移除，形成单向复制。

注册中心启动同步曾短暂带入另一实例，所以“两端曾查到两个UP”不等于持续双向复制。18811只向18761续约，18762得不到其持续续约，短租约放大丢失；消费者从缺失视图取缓存后，Ribbon只能使用18812。旧失败运行未记录消费者实际选中的注册节点，不能声称已精确复原旧运行的每次拉取；本轮服务端缺失及peer误排除已由对照和本机字节码确定。

证据：p1-evidence/peer-nodes-bytecode.txt，isThisMyUrl/isInstanceURL；未修复对照的registry-1日志“The replica size seems to be empty”；分层轮询中18761仍有两实例、18762只剩18812。第一个丢失18811的环节是18762服务端注册视图，后续缓存和Ribbon反映其结果，ServerListFilter不是本例根因。

## 对照结果

|运行|peer配置|续约/租约|结果|
|---|---|---|---|
|历史首次运行|两个节点优先IP|3秒/9秒|采样20次均18812，失败|
|本轮未修复诊断|同上|3秒/9秒|108次分层记录，超时；未进入采样，失败证据p1-evidence/resume-20261019T054123425817Z-diagnosis/live-results.json|
|修复对照|仅注册中心prefer-ip-address=false，保留localhost与127.0.0.1两种身份|3秒/9秒|连续12秒所有发现层双实例；20次命中{'18811': 10, '18812': 10}，通过|
|完整验收|相同修复，所有版本不变|10秒/90秒（运行参数）|20次命中{'18811': 11, '18812': 9}，熔断与重启等全部通过|

原9秒租约不变时修正身份即可通过，因此不是靠加长sleep或单纯延长租约掩盖问题。完整测试采用90秒租约，是为故障/重启实验保留合理时间。

## 修改与诊断安全

- eureka-server/application.properties仅改变注册中心prefer-ip-address；不修改业务提供者身份、不修改hosts文件。
- 新RegistryDiagnostics输出实际peer URL、自节点误判结果及实时注册表。两端现在peerMisclassifiedAsSelf=false，分别有对端URL。
- 新DiscoveryDiagnostics输出Spring DiscoveryClient、本地Eureka Application/VIP、Ribbon源列表/可用列表、过滤器、规则和刷新时间；不强制refresh、不替换ServerList。
- 诊断只在lab-diagnostics profile及127.0.0.1绑定下启用，并检查请求源；不输出配置全集/凭证，不通过Gateway暴露。
- p1-run-lab.py按超时轮询所有层，必须连续12秒稳定后才采样；每次响应在断言前落盘，超时保留各层与日志并退出。

## 修复后注册信息

|注册中心|appName|instanceId|hostName|ipAddr|port|status|vipAddress|lastRenewalTimestamp（原值）|
|---|---|---|---|---|---|---|---|---|
|18761|LAB-PROVIDER|lab-provider:18812|127.0.0.1|127.0.0.1|18812|UP|lab-provider|1792388983784|
|18761|LAB-PROVIDER|lab-provider:18811|127.0.0.1|127.0.0.1|18811|UP|lab-provider|1792388983784|
|18762|LAB-PROVIDER|lab-provider:18812|127.0.0.1|127.0.0.1|18812|UP|lab-provider|1792388986032|
|18762|LAB-PROVIDER|lab-provider:18811|127.0.0.1|127.0.0.1|18811|UP|lab-provider|1792388986033|

原始续约时间戳按Eureka响应保留，不据缓存字段推断准确壁钟续约时刻；RegistryDiagnostics另提供实时注册表用于核对。

## 消费者和Ribbon

Spring Cloud层实际LoadBalancerClient是org.springframework.cloud.netflix.ribbon.RibbonLoadBalancerClient；其内部ILoadBalancer=com.netflix.loadbalancer.ZoneAwareLoadBalancer；策略=com.netflix.loadbalancer.ZoneAvoidanceRule；ServerList=org.springframework.cloud.netflix.ribbon.eureka.DomainExtractingServerList；Filter=org.springframework.cloud.netflix.ribbon.ZonePreferenceServerListFilter。源列表、Spring/Eureka缓存和Ribbon实际可用列表均含18811/18812。获取时间、缓存刷新事件、registryFetchAgeMs及Ribbon刷新时间均在逐轮JSON，不使用固定sleep判定成功。

20次逐项状态、真实instanceId/port见[p1-evidence/resume-ribbon-20.csv](p1-evidence/resume-ribbon-20.csv)。Gateway→消费者→按服务名OpenFeign→Eureka/Ribbon→提供者；没有绕过Ribbon轮询端口。所有20次HTTP200且fallback=false，两实例均真实处理请求，不以严格10:10作为判定条件。

完整证据：[p1-evidence/resume-20261019T054859528641Z-full/live-results.json](p1-evidence/resume-20261019T054859528641Z-full/live-results.json)。本轮最终对照信息见[p1-evidence/resume-summary.json](p1-evidence/resume-summary.json)。
