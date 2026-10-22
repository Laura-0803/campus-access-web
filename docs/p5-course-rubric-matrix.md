# 课程评分要求与证据矩阵

## P6当前评分材料状态（2026-10-20）

P5 A/B/F已通过，P6独立aggregation-service已实现、编译、启动、实际验证；课程组件版本未变。现4业务域＋1只读聚合，五条剩余API与用户黑名单代理已移除Express运行依赖，见[p6验收](p6-acceptance.md)。下表P5旧记录仍是历史，不把旧“Express未移除/无扫码UI”当作当前结论。正式课程报告与五分钟计时彩排仍未验收。

|P6评分项复核|实际位置|本轮运行证据|
|---|---|---|
|Spring Boot/Eureka/Gateway|aggregation-service、Gateway P6精确路由；双19761/19762注册|p6-ready真实UP及五API；生产dist Edge|
|OpenFeign/Ribbon|aggregation/client五客户端、RoundRobinRule；user LegacyClient目标exception-service|20次真实聚合与双user/双exception服务器请求计数；无硬编码提供者|
|Hystrix|aggregation application.properties及@EnableHystrix|五核心故障503、open/errors/shortCircuits及恢复；无假零统计|
|分层及MyBatis|聚合Controller/Service/Impl/DTO/Client/异常与边界；不设DAO；SQL仍由四域Mapper执行|新旧对照、SQL计数、真实事务回滚、六表重启持久化|
|功能/架构/数据库材料|p6-aggregation-design、api-migration、contract-comparison及service-boundaries|67/68接口Java归属，不冒称全部分支或课程评分满分；不新增业务库|

以上证据索引统一见[p6-test-evidence.md](p6-test-evidence.md)。五分钟计划应使用新扫码/规则入口并展示Java报表，无需再说明正在运行Express聚合；仍如实说明禁用删除/无绑定/HOLD、真实硬件短信及全站移动端限制。

依据工作区父目录真实《合肥工业大学课程设计任务书(1).docx》《课程设计成绩评定标准说明(1).docx》逐段只读提取，原件SHA及路径见[p5-evidence/course-sources.json](p5-evidence/course-sources.json)，原文见course-task.txt/course-rubric.txt。原件未修改；下表不是教师评分或提交确认。

评分原文：软件开发文档20%、课程设计报告40%、软件代码40%；报告内部系统设计20%、开发报告80%；5分钟演示+3分钟答辩。不能把测试断言数换算成绩。

|评分/交付项|具体实现或材料|运行证据/当前结论|
|---|---|---|
|Spring Boot四业务微服务|backend/{user,appointment,access,exception}-service/pom.xml及Application|P4-C build-3 clean verify；P5健康与真实业务回归，已实现|
|Eureka高可用集群|backend/eureka-server；19761/19762双peer|P5双节点UP；P1有真实单节点故障恢复，P5未重新做网络/主机故障，单机不等同物理HA|
|Ribbon|各client无固定user地址，RoundRobinRule、RibbonLoadBalancerClient|P5 integration20次实际双user样本；不是浏览器轮流直连provider|
|OpenFeign|appointment UserDirectory/BlacklistClient/IssuanceClient；access Directory/Safety/Appointment；exception DirectoryClient|P5正常闭环与故障实际HTTP；Eureka发现|
|Hystrix|@EnableHystrix、feign.hystrix.enabled及fallbackFactory|P5 faults/architecture含open、错误计数、短路、恢复，非仅fallback|
|Gateway|GatewayApplication路由+身份头清除|P5所有域及Express聚合真实请求；不宣称Express已移除|
|Controller/Service/DAO/Entity/Mapper|四模块src/main/java分层及resources/mapper；user UserEntity/UserMapper强类型|实际SQL及事务；access/exception部分Map DTO需报告明确，不冒称全强类型|
|MyBatis单实体操作|user UserMapper/DomainMapper，预约AppointmentMapper、通行AccessMapper、异常IncidentMapper|真实增查改/软移出、并发/事务回滚；无原store快照写入|
|至少5张相关业务表|18张业务与配套表分9+1+6+2；users/people/sessions/appointments/qr_codes/access_records/exceptions/blacklist等|四隔离MySQL账号与真实数据；19原表含历史app_state不计新增业务表|
|系统功能结构图|p5-system-integration-audit.md四域功能文本图|当前架构描述已形成；正式报告图号/排版未验收|
|业务流程图|同审计中的预约/签发/通行/异常流程图；p3-state-machine及P4设计|正常及失败真实回归；未包含未授权删除/身份关联实现|
|数据库设计|database-dictionary、各阶段版本SQL、p4c-database-migration|表结构已有；需整理正式报告字段/索引/关系图|
|微服务架构图|同审计Mermaid，标明Express过渡和4schema|与实际调用/库归属核对；文本图未当作Word终稿图片|
|核心业务顺序图|同审计签发顺序图、P4-B持久恢复设计|实际200/QR/记录及已批准未知503；非全局原子事务|
|一对多/多对多说明|用户→会话、人员→车辆/预约；角色与校门/方法以规则JSON表达|任务书要求设计说明，当前材料分散；未实现独立多对多嵌套resultMap，不虚报；如教师要求代码示例需另批最小范围|
|软件开发文档/日志|P0–P5真实阶段记录与失败证据|尚无按两次上机周期签名/提交的本人课程日志证明，不能捏造签到/提交记录|
|系统设计报告|现有功能/流程/DB/边界材料|材料具备，正式统一课程报告尚未形成/未验收|
|系统开发报告|P1兼容实验与各阶段创建/分层/运行记录|需按任务书整编类方法/框架创建过程，不等同本批验收文档已正式提交|
|五分钟演示|统一启停、原Edge流程、测试证据、下述脚本|实际主要步骤已回归，未完成五分钟计时彩排或教师验收|

## 建议五分钟安排（计划，未计时运行）

启动预热放在计时前。0–40秒展示双Eureka/Gateway/四域/四库；40–75秒六角色与登录权限摘要；75–145秒访客预约、被访人审核、管理员最终200；145–190秒真实QR展示与Java模拟核验（当前原API客户端，必须说明无按钮）；190–225秒门岗拒绝及异常处置；225–250秒黑名单；250–275秒真实统计/报表并说明Express；275–300秒展示本轮真实Ribbon/Hystrix报告与实现位置。故障重启耗时不能承诺塞入末25秒，预录/证据回放必须标注，若老师要求现场停机恢复，需调整流程或在答辩时单独展示。

## 现场必要项与可保留限制

必须先具备：本机一次启动可靠、健康通过、合成凭据受控可取、授权范围脚本可运行、说明Express过渡及未完成分支、整理正式报告并计时彩排。若要求全程页面点击扫码，A为演示阻塞需单批批准；若要求Node后端完全停止，四聚合及health的Java收尾是阻塞，当前不能验收该条。

可经老师确认作为限制：真实短信/物理门禁/全站移动端、多主机HA、HOLD人工处理、无绑定关联、人员删除和独立账号状态UI；它们不妨碍已绑定正常闭环与课程组件演示，但不能自行代老师判定不影响最终成绩。A/B/F可优先小范围补齐，C/D/E不应为五分钟演示仓促开放。
