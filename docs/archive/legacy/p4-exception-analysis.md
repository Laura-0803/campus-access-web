# P4-C异常服务分析与设计（未获实施授权）

状态：已完成源码分析与拆分设计；未创建exception-service模块、Java Controller、迁移DDL或正式服务路由，未标记编译、启动或测试通过。异常业务继续由隔离Express原路由承接；不进入P4-C，不实施人员删除Saga。

## 实际业务与权限

依据原routes/exceptions.js、routes/settings.js黑名单段、lib/blacklist.js、lib/exceptionAgent.js及agents/exception-agent.model.json。

|原接口|权限/行为|未来归属|
|---|---|---|
|GET /api/exceptions|guard/admin；status/risk/person筛选|exception-service|
|GET /api/exceptions/analysis|guard/admin；集合分析|exception-service|
|GET /api/exceptions/:id|guard/admin；不存在404|exception-service|
|GET /api/exceptions/:id/analysis|guard/admin；单条分析|exception-service|
|POST /api/exceptions/chat|仅admin；空问题400；本地规则问答|exception-service|
|PATCH /api/exceptions/:id|仅guard；待处理/处理中/已处理；记录处理人时间|exception-service|
|POST /api/exceptions/:id/actions|仅guard；action必填；close=false处理中，否则已处理；动作前插|exception-service|
|GET /api/blacklist|仅admin；仅生效/启用，status/type/keyword过滤|exception-service|
|POST /api/blacklist|仅admin；完整证件或车牌，禁止星号，生效凭证重复409；原200|exception-service|
|PATCH /api/blacklist/:id|仅admin；已移出必须原因；保存removedAt/By/Reason|exception-service|

管理员负责查看、分析，不具备现场处置权限。门岗通过现场台先POST通行记录，再POST异常动作；原前端这两步并非跨域原子事务，未来必须单独设计失败恢复，不能本轮擅自改流程。

## 原风险算法

拒绝事件初始等级：reason含黑名单/强行/冒用→高；否则含未找到/不允许/过期/不可用→中；其他低。状态待处理，actions=[]；建议文本按风险分支生成。

分析Agent为本地JSON规则，不是外部LLM。基线高86、中62、低34，叠加类型/方式关键词、最多14复发分及待处理4分，限制1–99；评分>=80高、>=55中，否则低。返回model、score、predictedRisk、rootCause、conclusion、evidence、adminFocus、guardActions。集合返回summary/items及风险/状态/校门/类型分布。自然语言问答识别时间范围、风险、人员与意图；演示查询可能以最新数据日期为基准，不能迁移时悄悄改成服务器当天。

黑名单仅“生效/启用”参与，标准化trim/大写/去空白；历史连续星号匹配一个或多个数字。通行检查姓名及人员编号/证件/电话/QR所属人与Token/普通凭证；预约创建则按证件查。未来内部协议应保留这两种查询语义，不能用单一身份证精确查询替代全部通行拦截。

## 数据归属与替换方案

exceptions、blacklist独占未来异常库；logs仍经用户服务审计接口，access_records/QR归access，appointments归预约。异常动作作为actions JSON保持契约，后续若拆动作表需兼容序列化与前插顺序。黑名单历史移出字段保留，不物理删除历史。事件ID唯一、消费者inbox去重、处理/动作事务与审计outbox同提交。

将当前P3 `/internal/blacklist-check`（证件）与P4 `/internal/access-blacklist`（多标识）替换为exception-service的受保护Feign接口：原URL的公共契约不变，内部目标服务名及DTO版本化，失败一律拒绝。迁移先在独立合成库完成同规则对照、黑名单失效/掩码/重试/故障/角色矩阵测试，再申请切换。不得把无法读取解释为未命中。

P4-A仅新增隔离过渡层 `/internal/access-result` 接收必要通行拒绝事件，按稳定recordId去重写原合成异常表；保留本地access_outbox重试及原Express异常路由。这是通行事件衔接，不是正式异常服务迁移。原Express源文件、P2/P3适配器未改。

尚待批准的正式实施：异常库增量SQL、Java规则移植、inbox/outbox、黑名单替换、现场处置一致性、权限/分析/浏览器回归。当前上述计划均未运行，不以P4-A事件投递成功代替P4-C验收。
