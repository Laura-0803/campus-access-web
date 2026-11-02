# P4 API迁移最终清单

补充审批：未绑定人员预约已批准本轮暂缓，仍标记未完成，不计入完整业务验收；保持503、不改变预约状态、不生成二维码，不返回200/null码、不自动关联他人。历史场景保留待后续正式兼容设计。

15条原通行域API已实现、已编译、已启动、已真实测试；另新增显式POST /api/qr-codes/{id}/revoke。预约最终审批是既有API-017分支闭环，不计新API。Controller不直接访问别域表，静态表白名单及参数绑定MyBatis执行SQL。

|原ID|Method/路径|Java方法|SQL/权限/证据|
|---|---|---|---|
|API-002|GET /api/access-records|RecordsController.list|AccessOperationsImpl→AccessMapper XML；原角色guard;admin；core/contracts/security|
|API-003|POST /api/access-records|RecordsController.create|AccessOperationsImpl→AccessMapper XML；原角色guard;admin；core/contracts/security|
|API-004|POST /api/access-records/simulate|RecordsController.simulate|AccessOperationsImpl→AccessMapper XML；原角色guard;admin；core/contracts/security|
|API-033|GET /api/qr-codes|QrController.list|AccessOperationsImpl→AccessMapper XML；原角色visitor;alumni;guard;admin；core/contracts/security|
|API-034|POST /api/qr-codes|QrController.create|AccessOperationsImpl→AccessMapper XML；原角色visitor;alumni;admin；core/contracts/security|
|API-035|POST /api/qr-codes/:id/verify|QrController.verify|AccessOperationsImpl→AccessMapper XML；原角色visitor;alumni;guard;admin；core/contracts/security|
|API-038|GET /api/devices|ConfigurationController.devices|AccessOperationsImpl→AccessMapper XML；原角色guard;admin；core/contracts/security|
|API-039|POST /api/devices|ConfigurationController.device|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-040|PATCH /api/devices/:id|ConfigurationController.deviceUpdate|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-041|DELETE /api/devices/:id|ConfigurationController.deviceDelete|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-060|GET /api/gates|ConfigurationController.gates|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-061|PATCH /api/gates/:id|ConfigurationController.gate|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-062|GET /api/access-rules|ConfigurationController.rules|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-063|POST /api/access-rules/validate|ConfigurationController.validate|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|
|API-064|PATCH /api/access-rules/:id|ConfigurationController.rule|AccessOperationsImpl→AccessMapper XML；原角色admin；core/contracts/security|

GET六角色共102次原Express只读参考实现与Java状态/JSON深比较：[contracts-1792421959916.json](p4-evidence/contracts-1792421959916.json)。参考服务器临时回环，只运行原GET逻辑，以真实SQL/权威投影供给数据，不替代Java测试、不修改原store。POST/PATCH/DELETE的成功、非法字段、权限、回滚与并发证据在core/configuration/security/issuance/races报告，不宣称102覆盖全部写入组合。

请求URL、原字段、中文状态、正常成功包装保留，详细原契约见[api-contract.md](api-contract.md)。QR POST/设备/记录create保持201；其他原200保持。六角色具体允许/禁止以报告逐项结果及原权限矩阵为准。查询只使用原端点支持的筛选，空时间条件忽略，原limit数值截断语义兼容。

批准差异：最终审批接纳后未知503、持久成功重放200；安全拒绝停用人员/未知依赖/未完成审批/绑定冲突。新增可选Idempotency-Key不要求React改变。完整差异见[p4-contract-differences.md](p4-contract-differences.md)。未绑定人员预约原可200/null码，本轮仍503且不改状态，**未完成**。未确认操作不200。

Gateway隔离模式将15路径路由lb://access-service，预约仍lb://appointment-service；异常/统计继续隔离Express。内部接口须服务密钥，外部客户端身份头清除，身份来自Java实时会话。未迁移异常没有正式Java实现。

本轮仅隔离环境。原生产流量与数据库未切换，原React和Express源码未修改；P2人员删除未开放，P4-C没有正式实现。全部通过数表示本轮实际断言数，不表示全部需求已验收。
