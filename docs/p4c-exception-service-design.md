# exception-service设计

独立backend/exception-service，Java11/Boot2.3.12.RELEASE/Hoxton.SR12/MyBatis2.1.4；Eureka、Ribbon2.3.0、Feign2.2.9、Hystrix1.5.18、Gateway2.2.9沿用，实际树见测试证据。

Controller分别处理异常、黑名单、受保护内部接口；IncidentService接口与Impl管理事务，RiskAnalysis实现原确定性本地JSON模型，IncidentMapper/ XML执行显式SQL；Entity描述原字段，Map DTO显式转换蛇形字段及actions JSON以保留null/数组契约，未声称全部Mapper均返回强类型实体。client/security/config/exception分离。无Node分析进程、外部LLM或Mock替代Java业务。

异常库独占exceptions、blacklist和inbox/outbox/幂等操作表。user-service经受保护Feign实时验证Token、角色和账号；没有复制users或sessions缓存。预约与通行通过Eureka按exception-service服务名检查黑名单，查询失败安全拒绝。access_outbox原机制保留，接收端稳定E+recordId、摘要比对、同事务inbox去重，确认accepted+recordId后发送端才确认。成功通行事件仅接收不生异常，拒绝事件按原风险正则生成。

异常处置只操作本域表；审计可靠outbox→user新受保护exception-audits接口，用户域MyBatis幂等写审计。异常分析原规则只需本域事件，不为满足形式直接跨库查询人员/通行；身份所需人员基础信息已经由user权威上下文提供。

隔离Express仅保留dashboard/reports聚合，异常/黑名单公共路由由Gateway直达Java，桥接账号仅旧合成库user_domain_outbox表DML。聚合当前异常投影来自Java，黑名单临时端点仅为未改P2注册契约代理Java，无本地名单缓存。不存在exception回调聚合递归依赖。实际部署单机多进程不等同物理HA；服务身份共享内部密钥仅限受限回环实验，生产需专门凭据治理。

本轮仅隔离合成环境。原React、Express、生产数据库和历史备份不变；不进入人员删除、无绑定预约改造或后续阶段。
