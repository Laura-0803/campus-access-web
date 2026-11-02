# 课程评分项与真实工程证据

2026-10-21。原评分为开发文档20%、报告40%、代码40%；报告内部设计20%、开发80%；现场5分钟演示+3分钟问答。以下为可供审查证据，不代替教师评分。

|评分/交付项|真实源码/配置或设计材料|已保存运行证据及限制|
|---|---|---|
|Spring Boot微服务|[父pom](../backend/pom.xml)、四业务Application与aggregation Application|P7 clean verify，7可执行JAR；Surefire无单元测试，不虚报单测|
|Eureka双节点|[RegistryApplication](../backend/eureka-server/src/main/java/edu/hfut/campus/RegistryApplication.java)、该模块application.properties|P7冷启动双注册及UP；P1/p1-test-evidence已有单节点故障恢复，P7未做多主机容灾|
|Ribbon|[聚合Application](../backend/aggregation-service/src/main/java/edu/hfut/aggregate/Application.java)、各Client与RoundRobinRule|P7真实20次网关调用、双user/exception请求计数增量；P1实例发现诊断保留|
|OpenFeign|[聚合UserClient](../backend/aggregation-service/src/main/java/edu/hfut/aggregate/client/UserClient.java)、appointment/UserDirectory、access/SafetyClient|P7页面闭环与实际下游故障，按服务名发现，非轮流直连|
|Hystrix|[聚合配置](../backend/aggregation-service/src/main/resources/application.properties)、业务Fallback类|P7 components open/errors/shortCircuits/恢复；只看到fallback不算断路器打开|
|Gateway|[路由及身份过滤](../backend/gateway-service/src/main/java/edu/hfut/campus/GatewayApplication.java)|P7原生产dist、无Express端口、5组件Health；未知API/禁用删除不回落旧端|
|Controller/Service/DAO/Entity/Mapper|[UserMapper.java](../backend/user-service/src/main/java/edu/hfut/campus/dao/UserMapper.java)、[UserMapper.xml](../backend/user-service/src/main/resources/mapper/UserMapper.xml)、UserEntity与AuthServiceImpl|P7实际CRUD、SQL核对、鉴权；部分access/exception以Map封装，不能写全强类型对象模型|
|MyBatis单实体/事务|[IncidentServiceImpl](../backend/exception-service/src/main/java/edu/hfut/incidents/service/impl/IncidentServiceImpl.java)、IncidentMapper；预约/通行Mapper|P7真实并发与SQL触发异常回滚，仅隔离库；无全表快照重写|
|至少5相关表|四域resources/db/migration版本SQL，实际31物理表字段/索引审计|18业务及配套表+13运行表；原19表另作保全，不混算|
|概念/逻辑/物理数据库设计|[提纲及关系图](p7-course-report-outline.md)、database-dictionary、P7 database-audit JSON|字段/唯一索引/FK实际可核；跨库关系是逻辑ID，无跨库事务/FK|
|系统功能结构/流程图|[图1/图3](p7-course-report-outline.md)|源码与真实浏览器主流程对应，未实现分支单独列出|
|微服务架构/分层图|[图2及分层审计](p7-final-engineering-audit.md)、提纲图2|当前4业务+聚合+网关+双Eureka；不再画运行中的Express聚合|
|概念类图/顺序图|提纲图4/图5，P4签发设计|实际持久化/恢复证据；非全局原子事务，概念关系不冒充物理FK|
|一对多/多对多说明|people→vehicles、user→sessions；规则角色与校门/方法集合|已有单实体及组合查询；未实现嵌套多对多resultMap，不借P7修改业务|
|软件开发文档/日志|P0–P7报告与原始失败日志|真实事实可整编；本人实际两次上机周期、签名及提交需本人确认|
|系统设计报告|[课程报告提纲](p7-course-report-outline.md)|Markdown内容和图稿已准备；Word/PDF终稿、图表排版未交付|
|系统开发报告|提纲第2部分+框架源码+P1兼容与P2–P7证据|类方法/创建过程材料可整编；不冒称已经正式提交|
|5分钟程序演示|[演示脚本](p7-demo-script.md)、[就绪清单](p7-demo-readiness.md)|P7自动Edge回归计时不等于本人现场讲解计时彩排；技术故障演示单独进行|

P7证据统一索引：[p7-test-evidence.md](p7-test-evidence.md)。历史组件证据：[P1](test-evidence.md)、[P6](p6-test-evidence.md)。未经运行或原文未要求的事项不自行换算成绩。
