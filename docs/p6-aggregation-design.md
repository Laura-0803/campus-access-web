# P6 aggregation-service 实际设计

2026-10-20，独立无数据库聚合服务已实现并隔离验证；沿用Java11、Boot2.3.12.RELEASE、Cloud Hoxton.SR12、Ribbon2.3.0、Hystrix1.5.18。最终clean verify为build-4，真实依赖树在p6-evidence/dependencies。MyBatis仍在四个数据所有者中运行，聚合不增加数据库驱动或业务表。

## 内部数据接口核实

|提供者|现有受保护接口|返回内容与用途|
|---|---|---|
|user-service|GET /internal/context +当前Bearer|实时identity及projection；含users/people、configuration.roles/roleProfiles、faces、vehicles、messages、logs，sessions空数组；UserEntity.password被JsonIgnore|
|user-service|GET /internal/session +当前Bearer|实时账号、角色、personId、person；聚合先鉴权，不能信请求role|
|appointment-service|GET /internal/appointments|AppointmentMapper.list空条件，全部预约，来源顺序用于兼容|
|access-service|GET /internal/projection|accessRecords/qrCodes/devices/gates/accessRules/settings，通行Mapper真实本域SQL|
|exception-service|GET /internal/projection|exceptions/blacklist，经真实本域Mapper转视图|

以上均由现有拦截器校验X-Campus-Internal服务密钥，不能经Gateway公开。现有投影足够支持四条聚合，不需新增业务内部API。服务密钥由进程环境读取，不入源码、请求日志、文档；不得将客户端内部密钥头转发。聚合自身还需完成实时会话校验与结果范围收窄，不能把全域投影直接返回普通用户。

## 文件范围

新建backend/aggregation-service：Application；controller/{DashboardController,ReportController,HealthController,ComponentsController}；service/AggregationService；service/impl/AggregationServiceImpl；client/{UserClient,AppointmentClient,AccessClient,ExceptionClient,GatewayClient}；dto/Views只读兼容视图；exception/{ApiException,Errors}；config/Boundary服务密钥及响应边界；resources/application.properties与模块pom。无DAO/Entity/Mapper和数据源，因为聚合不拥有业务表，不能为了分层外观伪造持久化职责。身份由服务实现调用现有user/context，角色/归属在服务端收窄。部分响应使用Map以保留原空值和可选字段，不声称全强类型DTO。

backend/pom.xml仅添加模块；GatewayApplication新增精确聚合路由，置旧兜底之前，移除P6模式的Express兜底并保留明确404。四域原路由、人员删除禁用、最终审批及HOLD语义不变。React源码不改；隔离启动工具可用已构建dist提供静态前端。

唯一既有业务服务修改已按A+B批准实施：user-service/client/LegacyClient.java的Feign服务名从legacy-bridge改为exception-service，原方法、路径、请求/响应、超时与安全失败逻辑不动。现有exception /internal/blacklist-check兼容，不新增业务内部API。Gateway新增受服务密钥保护的只读/internal/p6-ready，供健康检查验证Reactive网关本身，避免循环调用/api/health。

## 故障、安全与性能

先Feign校验身份，401/403状态保留；角色范围在服务端确定，再获取投影并限制返回范围。按Eureka服务名调用，Ribbon RoundRobinRule，不硬编码实例URL。Feign Hystrix启用，无伪造数据fallback；失败/开路由统一错误边界返回503，这不是返回空统计的Hystrix fallback成功。内部诊断只回实例端口、负载均衡器类、规则和熔断计数，不输出身份/凭证。Ribbon计数来自每个实际ServerStats，已撤掉不能证明端口的Feign逻辑URL日志方案。

Health采用5线程有界并行探测及单并发许可，分别验证Gateway只读就绪接口、user真实投影SQL、appointment真实预约SQL、access真实通行SQL、exception真实异常SQL；总等待上限3秒，Feign连接500ms/读取1600ms、Hystrix2300ms。任何一项失败或超时返回503，拥塞也503，不报告部分健康为ok。实际停止五组件及真实MySQL读锁阻塞均验证通过；Gateway完全停止时外部连接本身不可达，直接请求聚合Health验证503。

最终隔离启动器从aggregation子进程环境剔除数据库凭据、其他域配置及恢复密钥，只传入所需内部服务密钥。进程不配置DataSource，SQL对照由测试进程使用各域账号完成。

复用全量投影是本轮最小兼容实现的性能限制：单次最坏O(U+P+A+R+E+D+Q)，排序O(n log n)，内存同响应规模；没有跨请求身份/统计缓存，避免停用或撤权后的旧授权继续生效。并行请求会增加下游连接压力；先使用有界并发/超时和请求级数据，不把高流量性能验收算在课程单机实测中。若实际数据体积超时则503，不能截断后当完整统计；后续按域增加范围聚合API必须另报方案。

各域独立读，响应是一次查询过程中的多时点组合，不是跨库事务快照。甚至同域多个SELECT在既有接口没有统一事务时也不能声称快照。静态对照期间暂停测试写入，分别记录采样时间；并发写入测试只检查可解释边界，不强求跨库绝对相等。不新增响应字段掩盖口径变化。

## 灰度及回滚

先旧Gateway/桥仍在运行，独立聚合服务直接HTTP与旧桥逐角色对照；SQL核对必须使用每域自己只读的隔离账号，聚合进程不持有数据库凭据。全部对照通过才切隔离Gateway精确路由，再停止本轮拥有的Express进程，运行dist前端真实Edge回归。不能仅清空registry或改测试断言模拟去Express。

回滚聚合路由和新增服务，恢复已存源码并用独立JDK11重建，或使用此前受控产物启动旧隔离桥；不回滚/重建业务数据库。旧模式Gateway仍保留原桥路由，P6模式完全不注册该兜底；不将根路由改指Express。运行/文件状态以p6-test-evidence最终记录为准。启动后端使用`python docs/p6-system.py start`，健康`health`，状态`status`，关闭`stop`；普通启动不运行seed或清库，已有合成库与生产dist为前提，不是新机器安装器。
