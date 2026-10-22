# P2实际工程与职责

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

Java Temurin 11.0.32.1+1；Maven 3.9.11；Spring Boot 2.3.12.RELEASE / Framework 5.2.15.RELEASE；Spring Cloud Hoxton.SR12；Eureka 1.10.14；Ribbon 2.3.0；Hystrix 1.5.18；Spring Cloud OpenFeign/Gateway 2.2.9.RELEASE；Feign 10.12；MyBatis Starter 2.1.4 / Core 3.5.6 / Spring 2.0.6；Connector/J 8.0.25；实际MySQL 8.0.40。

入口和运行命令见[backend/README.md](../backend/README.md)。真实版本证据见[versions.txt](p2-evidence/versions.txt)和[依赖树](p2-evidence/dependencies/dependency-tree.txt)，打包库及SHA见[p2-evidence/summary.json](p2-evidence/summary.json)。系统默认Java21未更改。

人员删除暂停，真实短信通道送达未测试，浏览器视觉及全部页面交互未运行。因此P2总体验收尚未通过；不能进入P3、切换原库或部署原运行环境。
