# P4-C API迁移清单

原10条API全部建立Controller→IncidentService→Impl→MyBatis XML映射，均已编译、启动和真实测试。创建异常仍由原simulate拒绝事件触发，不擅增公共POST异常接口；黑名单没有原DELETE，不新增物理删除。

|原ID|方法与路径|Java方法|权限与SQL|
|---|---|---|---|
|API-042|GET /api/exceptions|ExceptionController.list|原角色guard;admin；IncidentMapper XML|
|API-043|GET /api/exceptions/analysis|ExceptionController.analysis|原角色guard;admin；IncidentMapper XML|
|API-044|POST /api/exceptions/chat|ExceptionController.chat|原角色admin；IncidentMapper XML|
|API-045|GET /api/exceptions/:id/analysis|ExceptionController.single|原角色guard;admin；IncidentMapper XML|
|API-046|GET /api/exceptions/:id|ExceptionController.detail|原角色guard;admin；IncidentMapper XML|
|API-047|PATCH /api/exceptions/:id|ExceptionController.update|原角色guard；IncidentMapper XML|
|API-048|POST /api/exceptions/:id/actions|ExceptionController.action|原角色guard；IncidentMapper XML|
|API-065|GET /api/blacklist|BlacklistController.list|原角色admin；IncidentMapper XML|
|API-066|POST /api/blacklist|BlacklistController.create|原角色admin；IncidentMapper XML|
|API-067|PATCH /api/blacklist/:id|BlacklistController.update|原角色admin；IncidentMapper XML|

保留URL/Method/字段/中文状态、顶层total、原黑名单POST 200、原success/error包装。异常按sort_order,id，列表status/risk/person过滤；黑名单仅生效/启用可见，status/type/keyword过滤；前端客户端分页，未添加Page DTO。分析与问答纯Java移植原JSON规则，风险不提供原不存在的人工编辑API。原管理员只能查看/分析，guard才能处置；普通角色本人异常仍经原dashboard聚合按归属返回。

批准的差异仅两条处置写API的受控状态/409及可选Idempotency-Key，另通行时间解析严格拒绝，详见[p4c-contract-differences.md](p4c-contract-differences.md)。同幂等键请求先实时鉴权再重放，状态/动作/去重响应/审计同事务；普通无Key请求视为独立操作，不宣称识别所有语义相似动作。

证据逐接口见core、security、integration、browser报告：查询/分析/问答与原纯函数深比较，真实写入/回滚/权限/并发验证。参数化SQL未使用原store全表重写。

本轮仅隔离合成环境。原React、Express、生产数据库和历史备份不变；不进入人员删除、无绑定预约改造或后续阶段。
